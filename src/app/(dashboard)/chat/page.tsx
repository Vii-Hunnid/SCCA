"use client";

import { useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useScca } from "@/hooks/useScca";
import { useChatStore } from "@/store";
import { SCCAChatArea } from "@/components/chat/SCCAChatArea";
import { ChatInput } from "@/components/chat/ChatInput";
import { SCCAPreviewPanel } from "@/components/chat/SCCAPreviewPanel";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Lock,
} from "lucide-react";

export default function ChatPage() {
  const { data: session } = useSession();
  const {
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
    sendMessage,
    stopStreaming,
    editMessage,
    deleteMessage,
    regenerateLastResponse,
  } = useScca();

  const {
    sidebarOpen,
    toggleSidebar,
    activeConversationId,
    setActiveConversationId,
    useSCCA,
    systemPrompt,
    temperature,
  } = useChatStore();

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewChat = useCallback(async () => {
    const id = await createConversation();
    if (id) {
      setActiveConversationId(id);
      await loadConversation(id);
    }
  }, [createConversation, setActiveConversationId, loadConversation]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      await loadConversation(id);
    },
    [setActiveConversationId, loadConversation]
  );

  const handleDeleteConversation = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await deleteConversation(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [deleteConversation, activeConversationId, setActiveConversationId]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeConversationId) {
        // Auto-create conversation
        const id = await createConversation();
        if (id) {
          setActiveConversationId(id);
          await sendMessage(id, content, { systemPrompt, temperature });
        }
      } else {
        await sendMessage(activeConversationId, content, {
          systemPrompt,
          temperature,
        });
      }
    },
    [
      activeConversationId,
      createConversation,
      setActiveConversationId,
      sendMessage,
      systemPrompt,
      temperature,
    ]
  );

  const handleEdit = useCallback(
    async (sequence: number, content: string) => {
      if (!activeConversationId) return;
      await editMessage(activeConversationId, sequence, content, true, {
        temperature,
        systemPrompt,
      });
    },
    [activeConversationId, editMessage, temperature, systemPrompt]
  );

  const handleDelete = useCallback(
    async (sequence: number) => {
      if (!activeConversationId) return;
      await deleteMessage(activeConversationId, sequence);
    },
    [activeConversationId, deleteMessage]
  );

  const handleRegenerate = useCallback(async () => {
    if (!activeConversationId) return;
    await regenerateLastResponse(activeConversationId, {
      temperature,
      systemPrompt,
    });
  }, [activeConversationId, regenerateLastResponse, temperature, systemPrompt]);

  // Display messages for preview panel
  const displayMessages = messages.map((m) => ({
    id: m.id,
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
  }));

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-card border-r transition-all duration-200",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold">SCCA</span>
          </div>
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors",
                activeConversationId === conv.id
                  ? "bg-muted"
                  : "hover:bg-muted/50"
              )}
            >
              <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{conv.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {conv.messageCount} msgs · {formatRelativeTime(conv.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}

          {conversations.length === 0 && !isLoading && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No conversations yet
            </p>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate">
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </button>

          <h2 className="text-sm font-medium truncate">
            {currentConversation?.title || "New Chat"}
          </h2>

          {error && (
            <span className="ml-auto text-xs text-destructive">{error}</span>
          )}
        </div>

        {/* Chat + Preview layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            <SCCAChatArea
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRegenerate={handleRegenerate}
            />

            <ChatInput
              onSend={handleSendMessage}
              onStop={stopStreaming}
              isStreaming={isStreaming}
              disabled={isLoading}
            />
          </div>

          {/* SCCA Preview Panel */}
          <SCCAPreviewPanel
            messages={displayMessages}
            isStreaming={isStreaming}
            useSCCA={useSCCA}
          />
        </div>
      </div>
    </div>
  );
}
