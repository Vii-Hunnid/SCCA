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
        <Lock className="w-5 h-5 text-terminal-dim mx-auto mb-2" />
        <p className="text-xs text-terminal-dim">No conversations yet</p>
        <p className="text-xs text-terminal-dim/60 mt-1">
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
            className={`w-full text-left px-3 py-2.5 rounded group transition-all duration-200 ${
              isActive
                ? 'bg-neon-cyan/10 border border-neon-cyan/20'
                : 'hover:bg-cyber-mid/50 border border-transparent'
            }`}
          >
            <div className="flex items-start gap-2">
              <MessageSquare
                className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                  isActive ? 'text-neon-cyan' : 'text-terminal-dim'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs truncate ${
                      isActive ? 'text-neon-cyan' : 'text-terminal-text'
                    }`}
                  >
                    {conv.title || 'Untitled'}
                  </span>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-terminal-dim hover:text-neon-red transition-all p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-terminal-dim">
                    {conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] text-terminal-dim/50">
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
