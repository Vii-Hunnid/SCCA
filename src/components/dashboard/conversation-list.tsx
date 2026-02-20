'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Lock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <Lock className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No conversations yet</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
          Start a new encrypted session
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 py-1 space-y-0.5">
      {conversations.map((conv, i) => {
        const isActive = conv.id === activeId;

        return (
          <motion.button
            key={conv.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelect?.(conv.id)}
            className="w-full text-left px-3 py-2.5 rounded group transition-all duration-200"
            style={{
              backgroundColor: isActive 
                ? 'color-mix(in srgb, var(--neon-cyan) 10%, transparent)' 
                : 'transparent',
              border: isActive 
                ? '1px solid color-mix(in srgb, var(--neon-cyan) 20%, transparent)' 
                : '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div className="flex items-start gap-2">
              <MessageSquare
                className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                style={{ color: isActive ? 'var(--neon-cyan)' : 'var(--text-secondary)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs truncate"
                    style={{ color: isActive ? 'var(--neon-cyan)' : 'var(--text-primary)' }}
                  >
                    {conv.title || 'Untitled'}
                  </span>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-all p-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--neon-red)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                    {formatDistanceToNow(new Date(conv.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
