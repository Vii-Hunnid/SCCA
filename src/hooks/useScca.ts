/**
 * useScca - React hook for SCCA conversation management
 *
 * Provides:
 * - Conversation CRUD (list, create, load, delete)
 * - Message send with SSE streaming
 * - Destructive edit/delete with regeneration
 * - Real-time streaming state
 *
 * All SSE reads go through readSSEStream (src/lib/sse-client.ts), which
 * buffers partial lines so tokens are never lost at chunk boundaries.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { Conversation, SCCAMessage } from "@/types/chat";
import { readSSEStream } from "@/lib/sse-client";

interface UseSccaReturn {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: SCCAMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  streamingContent: string;
  /** Set when the last send failed — server kept the message; user can retry */
  sendFailure: {
    conversationId: string;
    content: string;
    options?: {
      temperature?: number;
      systemPrompt?: string;
      model?: string;
      attachmentIds?: string[];
    };
  } | null;
  /** Remaining requests this minute (from X-RateLimit-* headers), when known */
  rateLimitRemaining: { rpm: number; limit: number } | null;

  // Conversation operations
  fetchConversations: () => Promise<boolean>;
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
      attachmentIds?: string[];
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
  /** Retry the failed send, if any */
  retrySend: () => Promise<void>;
  dismissSendFailure: () => void;
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
  const [sendFailure, setSendFailure] = useState<UseSccaReturn["sendFailure"]>(
    null
  );
  const [rateLimitRemaining, setRateLimitRemaining] =
    useState<UseSccaReturn["rateLimitRemaining"]>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const captureRateLimitHeaders = (res: Response) => {
    const rpm = res.headers.get("X-RateLimit-Remaining-RPM");
    const limit = res.headers.get("X-RateLimit-Limit-RPM");
    if (rpm !== null && limit !== null) {
      setRateLimitRemaining({ rpm: Number(rpm), limit: Number(limit) });
    }
  };

  // ── Fetch all conversations ──
  const fetchConversations = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scca/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      setConversations(data);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
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
        captureRateLimitHeaders(res);
        if (!res.ok) {
          const errData = await res
            .json()
            .catch(() => ({ error: "Failed to create conversation" }));
          throw new Error(errData.error);
        }
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
        attachmentIds?: string[];
      }
    ) => {
      setError(null);
      setIsStreaming(true);
      setStreamingContent("");
      setSendFailure(null);

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
              attachmentIds: options?.attachmentIds,
            }),
            signal: abortController.signal,
          }
        );

        if (!res.ok) {
          const errData = await res
            .json()
            .catch(() => ({ error: "Request failed" }));
          throw new Error(errData.error || "Request failed");
        }
        captureRateLimitHeaders(res);

        let accumulated = "";

        await readSSEStream(res, {
          onToken: (token) => {
            accumulated += token;
            setStreamingContent(accumulated);
          },
          onDone: (data) => {
            const assistantMsg: SCCAMessage = {
              id: `msg-${(data.messageCount as number) - 1}`,
              role: "assistant",
              content: accumulated,
              sequence: (data.messageCount as number) - 1,
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);

            if (data.title) {
              setCurrentConversation((prev) =>
                prev
                  ? {
                      ...prev,
                      title: data.title as string,
                      messageCount: data.messageCount as number,
                    }
                  : null
              );
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === conversationId
                    ? {
                        ...c,
                        title: data.title as string,
                        messageCount: data.messageCount as number,
                      }
                    : c
                )
              );
            }
          },
          onError: (message) => {
            throw new Error(message);
          },
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message);
          setSendFailure({ conversationId, content, options });
          // The server persists the user message before streaming, so on
          // failure our local state may be behind — resync with the DB.
          await loadConversation(conversationId);
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
    },
    [messages.length, loadConversation]
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
          const errData = await res
            .json()
            .catch(() => ({ error: "Edit failed" }));
          throw new Error(errData.error || "Edit failed");
        }

        if (
          regenerate &&
          res.headers.get("content-type")?.includes("text/event-stream")
        ) {
          let accumulated = "";

          await readSSEStream(res, {
            onToken: (token) => {
              accumulated += token;
              setStreamingContent(accumulated);
            },
            onDone: (data) => {
              const assistantMsg: SCCAMessage = {
                id: `msg-${(data.messageCount as number) - 1}`,
                role: "assistant",
                content: accumulated,
                sequence: (data.messageCount as number) - 1,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setCurrentConversation((prev) =>
                prev
                  ? { ...prev, messageCount: data.messageCount as number }
                  : null
              );
            },
            onError: (message) => {
              throw new Error(message);
            },
          });
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
  // Single server round-trip: the edit endpoint truncates everything after
  // the last user message and streams a fresh response.
  const regenerateLastResponse = useCallback(
    async (
      conversationId: string,
      options?: { temperature?: number; systemPrompt?: string }
    ) => {
      const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m.role === "user");

      if (!lastUserMsg) {
        setError("No user message to regenerate from");
        return;
      }

      await editMessage(
        conversationId,
        lastUserMsg.sequence,
        lastUserMsg.content,
        true,
        options
      );
    },
    [messages, editMessage]
  );

  // ── Retry a failed send ──
  const retrySend = useCallback(async () => {
    if (!sendFailure) return;
    const failure = sendFailure;
    setSendFailure(null);
    setError(null);
    await sendMessage(failure.conversationId, failure.content, failure.options);
  }, [sendFailure, sendMessage]);

  const dismissSendFailure = useCallback(() => {
    setSendFailure(null);
    setError(null);
  }, []);

  return {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isStreaming,
    error,
    streamingContent,
    sendFailure,
    rateLimitRemaining,
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
    retrySend,
    dismissSendFailure,
  };
}
