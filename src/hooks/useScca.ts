/**
 * useScca - React hook for SCCA conversation management
 *
 * Provides:
 * - Conversation CRUD (list, create, load, delete)
 * - Message send with SSE streaming
 * - Destructive edit/delete with regeneration
 * - Real-time streaming state
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { Conversation, SCCAMessage } from "@/types/chat";

interface UseSccaReturn {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: SCCAMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  streamingContent: string;

  // Conversation operations
  fetchConversations: () => Promise<void>;
  createConversation: (title?: string, model?: string) => Promise<string | null>;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;

  // Message operations
  sendMessage: (
    conversationId: string,
    content: string,
    options?: {
      temperature?: number;
      systemPrompt?: string;
      model?: string;
    }
  ) => Promise<void>;
  stopStreaming: () => void;
  editMessage: (
    conversationId: string,
    sequence: number,
    content: string,
    regenerate?: boolean,
    options?: { temperature?: number; systemPrompt?: string }
  ) => Promise<void>;
  deleteMessage: (conversationId: string, sequence: number) => Promise<void>;
  regenerateLastResponse: (
    conversationId: string,
    options?: { temperature?: number; systemPrompt?: string }
  ) => Promise<void>;
}

export function useScca(): UseSccaReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<SCCAMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Fetch all conversations ──
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scca/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      setConversations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Create a new conversation ──
  const createConversation = useCallback(
    async (title?: string, model?: string): Promise<string | null> => {
      setError(null);
      try {
        const res = await fetch("/api/scca/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, model }),
        });
        if (!res.ok) throw new Error("Failed to create conversation");
        const data = await res.json();
        setConversations((prev) => [data, ...prev]);
        return data.id;
      } catch (err: any) {
        setError(err.message);
        return null;
      }
    },
    []
  );

  // ── Load a conversation with decrypted messages ──
  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scca/conversations/${id}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      const data = await res.json();

      setCurrentConversation({
        id: data.id,
        title: data.title,
        model: data.model,
        messageCount: data.messageCount,
        createdAt: data.createdAt || "",
        updatedAt: data.updatedAt || "",
      });

      setMessages(
        data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sequence: m.sequence,
          timestamp: m.timestamp,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Delete a conversation ──
  const deleteConversation = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/scca/conversations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete conversation");
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [currentConversation]);

  // ── Update conversation title ──
  const updateConversationTitle = useCallback(
    async (id: string, title: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/scca/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error("Failed to update title");
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c))
        );
        if (currentConversation?.id === id) {
          setCurrentConversation((prev) => (prev ? { ...prev, title } : null));
        }
      } catch (err: any) {
        setError(err.message);
      }
    },
    [currentConversation]
  );

  // ── Send message with SSE streaming ──
  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      options?: {
        temperature?: number;
        systemPrompt?: string;
        model?: string;
      }
    ) => {
      setError(null);
      setIsStreaming(true);
      setStreamingContent("");

      // Optimistic: add user message to UI immediately
      const userMsg: SCCAMessage = {
        id: `pending-user-${Date.now()}`,
        role: "user",
        content,
        sequence: messages.length,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const res = await fetch(
          `/api/scca/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content,
              temperature: options?.temperature,
              systemPrompt: options?.systemPrompt,
              model: options?.model,
            }),
            signal: abortController.signal,
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(errData.error);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.token) {
                  accumulated += data.token;
                  setStreamingContent(accumulated);
                }

                if (data.done) {
                  // Add final assistant message
                  const assistantMsg: SCCAMessage = {
                    id: `msg-${data.messageCount - 1}`,
                    role: "assistant",
                    content: accumulated,
                    sequence: data.messageCount - 1,
                    timestamp: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, assistantMsg]);

                  // Update conversation title if changed
                  if (data.title) {
                    setCurrentConversation((prev) =>
                      prev
                        ? { ...prev, title: data.title, messageCount: data.messageCount }
                        : null
                    );
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === conversationId
                          ? { ...c, title: data.title, messageCount: data.messageCount }
                          : c
                      )
                    );
                  }
                }

                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e: any) {
                if (e.message && !e.message.includes("JSON")) {
                  setError(e.message);
                }
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message);
          // Remove optimistic user message on error
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
    },
    [messages.length]
  );

  // ── Stop streaming ──
  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent("");
  }, []);

  // ── Destructive edit ──
  const editMessage = useCallback(
    async (
      conversationId: string,
      sequence: number,
      content: string,
      regenerate: boolean = true,
      options?: { temperature?: number; systemPrompt?: string }
    ) => {
      setError(null);
      setIsStreaming(regenerate);
      setStreamingContent("");

      // Optimistic truncation
      setMessages((prev) =>
        prev
          .filter((m) => m.sequence < sequence)
          .concat({
            id: `msg-${sequence}`,
            role: "user",
            content,
            sequence,
            timestamp: new Date().toISOString(),
          })
      );

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const res = await fetch(
          `/api/scca/conversations/${conversationId}/edit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sequence,
              content,
              regenerate,
              temperature: options?.temperature,
              systemPrompt: options?.systemPrompt,
            }),
            signal: abortController.signal,
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Edit failed" }));
          throw new Error(errData.error);
        }

        if (regenerate && res.headers.get("content-type")?.includes("text/event-stream")) {
          const reader = res.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.token) {
                    accumulated += data.token;
                    setStreamingContent(accumulated);
                  }
                  if (data.done) {
                    const assistantMsg: SCCAMessage = {
                      id: `msg-${sequence + 1}`,
                      role: "assistant",
                      content: accumulated,
                      sequence: sequence + 1,
                      timestamp: new Date().toISOString(),
                    };
                    setMessages((prev) => [...prev, assistantMsg]);
                  }
                  if (data.error) throw new Error(data.error);
                } catch (e: any) {
                  if (e.message && !e.message.includes("JSON")) {
                    setError(e.message);
                  }
                }
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message);
          // Reload conversation on error to get consistent state
          await loadConversation(conversationId);
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
    },
    [loadConversation]
  );

  // ── Delete message ──
  const deleteMessage = useCallback(
    async (conversationId: string, sequence: number) => {
      setError(null);

      // Optimistic truncation
      setMessages((prev) => prev.filter((m) => m.sequence < sequence));

      try {
        const res = await fetch(
          `/api/scca/conversations/${conversationId}/edit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", sequence }),
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Delete failed" }));
          throw new Error(errData.error);
        }
      } catch (err: any) {
        setError(err.message);
        await loadConversation(conversationId);
      }
    },
    [loadConversation]
  );

  // ── Regenerate last assistant response ──
  const regenerateLastResponse = useCallback(
    async (
      conversationId: string,
      options?: { temperature?: number; systemPrompt?: string }
    ) => {
      // Find the last user message
      const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m.role === "user");

      if (!lastUserMsg) {
        setError("No user message to regenerate from");
        return;
      }

      // Remove last assistant message and re-send
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");

      if (lastAssistant) {
        await deleteMessage(conversationId, lastAssistant.sequence);
      }

      // Re-send the last user message
      await sendMessage(conversationId, lastUserMsg.content, options);
    },
    [messages, deleteMessage, sendMessage]
  );

  return {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isStreaming,
    error,
    streamingContent,
    fetchConversations,
    createConversation,
    loadConversation,
    deleteConversation,
    updateConversationTitle,
    sendMessage,
    stopStreaming,
    editMessage,
    deleteMessage,
    regenerateLastResponse,
  };
}
