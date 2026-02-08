'use client';

import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useScca } from '@/hooks/useScca';
import { useChatStore } from '@/store';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { SecurityStatus } from '@/components/dashboard/security-status';
import { SCCAChatArea } from '@/components/chat/SCCAChatArea';
import { ChatInput } from '@/components/chat/ChatInput';
import { SCCAPreviewPanel } from '@/components/chat/SCCAPreviewPanel';
import { Shield, Plus } from 'lucide-react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
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
    activeConversationId,
    setActiveConversationId,
    useSCCA,
    systemPrompt,
    temperature,
  } = useChatStore();

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

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeConversationId) {
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

  const conversationList = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
    messageCount: c.messageCount,
  }));

  const displayMessages = messages.map((m) => ({
    id: m.id,
    role: m.role as 'system' | 'user' | 'assistant',
    content: m.content,
  }));

  return (
    <DashboardShell
      conversations={conversationList}
      activeConversationId={activeConversationId || undefined}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
    >
      {activeConversationId ? (
        <div className="flex h-full overflow-hidden">
          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {error && (
              <div className="px-4 py-2 bg-neon-red/5 border-b border-neon-red/20">
                <span className="text-xs text-neon-red">{error}</span>
              </div>
            )}

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
      ) : (
        /* Empty state - no conversation selected */
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <Shield className="w-12 h-12 text-neon-cyan/20 mx-auto mb-4" />
            <h2 className="text-lg font-display text-terminal-text mb-2">
              Secure Compact Chat Architecture
            </h2>
            <p className="text-sm text-terminal-dim mb-6 leading-relaxed">
              Every message is encrypted with AES-256-GCM, compressed with zlib,
              and stored as a compact binary token. Select or create a conversation
              to begin.
            </p>
            <button onClick={handleNewChat} className="cyber-btn-solid">
              <Plus className="w-4 h-4 mr-2 inline" />
              New Conversation
            </button>

            <div className="mt-8">
              <SecurityStatus
                metrics={{
                  encryptionAlgorithm: 'AES-256-GCM',
                  keyDerivation: 'HKDF-SHA256',
                  messageCount: conversations.reduce(
                    (sum, c) => sum + c.messageCount,
                    0
                  ),
                  integrityStatus: 'verified',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
