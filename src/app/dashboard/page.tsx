'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useScca } from '@/hooks/useScca';
import { useChatStore } from '@/store';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { SecurityStatus } from '@/components/dashboard/security-status';
import { SCCAChatArea } from '@/components/chat/SCCAChatArea';
import { ChatInput } from '@/components/chat/ChatInput';
import { SCCAPreviewPanel } from '@/components/chat/SCCAPreviewPanel';
import {
  Shield,
  Plus,
  Pencil,
  Check,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface MediaStatsData {
  count: number;
  originalBytes: number;
  encryptedBytes: number;
  avgCompressionRatio: number;
  byCategory: Record<string, number>;
}

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
    updateConversationTitle,
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

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Media stats
  const [mediaStats, setMediaStats] = useState<MediaStatsData | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch media stats when conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMediaStats(null);
      return;
    }
    const fetchMedia = async () => {
      try {
        const res = await fetch(
          `/api/scca/media?conversationId=${activeConversationId}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const byCategory: Record<string, number> = {};
        for (const att of data.attachments || []) {
          byCategory[att.category] = (byCategory[att.category] || 0) + 1;
        }
        setMediaStats({
          count: data.totals?.count || 0,
          originalBytes: data.totals?.originalBytes || 0,
          encryptedBytes: data.totals?.encryptedBytes || 0,
          avgCompressionRatio: data.totals?.avgCompressionRatio || 1,
          byCategory,
        });
      } catch {
        // Non-critical
      }
    };
    fetchMedia();
  }, [activeConversationId, messages.length]);

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
      setIsEditingTitle(false);
      setShowDeleteConfirm(false);
      await loadConversation(id);
    },
    [setActiveConversationId, loadConversation]
  );

  const handleSendMessage = useCallback(
    async (content: string, attachments?: File[]) => {
      let convId = activeConversationId;

      if (!convId) {
        const id = await createConversation();
        if (!id) return;
        convId = id;
        setActiveConversationId(id);
      }

      // Upload attachments first if any
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('conversationId', convId);
            formData.append('messageSequence', String(messages.length));
            await fetch('/api/scca/media', { method: 'POST', body: formData });
          } catch (err) {
            console.error('Media upload failed:', err);
          }
        }

        // Prepend attachment info to message content
        const names = attachments.map((f) => f.name).join(', ');
        const prefix = `[Attached: ${names}]\n\n`;
        content = content ? prefix + content : prefix.trim();
      }

      if (content) {
        await sendMessage(convId, content, { systemPrompt, temperature });
      }
    },
    [
      activeConversationId,
      createConversation,
      setActiveConversationId,
      sendMessage,
      systemPrompt,
      temperature,
      messages.length,
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

  const handleDeleteMsg = useCallback(
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

  // Title editing
  const startEditTitle = () => {
    setTitleDraft(currentConversation?.title || '');
    setIsEditingTitle(true);
  };

  const saveTitle = async () => {
    if (!activeConversationId || !titleDraft.trim()) return;
    await updateConversationTitle(activeConversationId, titleDraft.trim());
    setIsEditingTitle(false);
  };

  const cancelEditTitle = () => {
    setIsEditingTitle(false);
    setTitleDraft('');
  };

  // Delete conversation
  const handleDeleteConversation = async () => {
    if (!activeConversationId) return;
    await deleteConversation(activeConversationId);
    setActiveConversationId(null);
    setShowDeleteConfirm(false);
  };

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
            {/* Chat header with title editing + delete */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-cyber-light/10 bg-cyber-darker/30">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveTitle();
                        if (e.key === 'Escape') cancelEditTitle();
                      }}
                      className="flex-1 bg-cyber-mid/50 border border-neon-cyan/30 rounded px-2 py-1 text-xs text-terminal-text outline-none focus:border-neon-cyan"
                      autoFocus
                    />
                    <button
                      onClick={saveTitle}
                      className="p-1 text-neon-green hover:bg-neon-green/10 rounded transition-colors"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={cancelEditTitle}
                      className="p-1 text-terminal-dim hover:bg-cyber-mid rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs text-terminal-text font-semibold truncate">
                      {currentConversation?.title || 'Untitled'}
                    </span>
                    <button
                      onClick={startEditTitle}
                      className="p-1 text-terminal-dim hover:text-neon-cyan hover:bg-neon-cyan/5 rounded transition-colors flex-shrink-0"
                      title="Edit title"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 ml-2">
                <span className="text-[10px] text-terminal-dim mr-2">
                  {messages.length} msg{messages.length !== 1 ? 's' : ''}
                </span>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2 bg-neon-red/5 border border-neon-red/20 rounded px-2 py-1">
                    <AlertTriangle className="w-3 h-3 text-neon-red" />
                    <span className="text-[10px] text-neon-red">Delete chat?</span>
                    <button
                      onClick={handleDeleteConversation}
                      className="text-[10px] text-neon-red font-semibold hover:underline"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-[10px] text-terminal-dim hover:underline"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1 text-terminal-dim hover:text-neon-red hover:bg-neon-red/5 rounded transition-colors"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

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
              onDelete={handleDeleteMsg}
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
            mediaStats={mediaStats || undefined}
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
