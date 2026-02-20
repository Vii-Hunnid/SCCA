'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  RefreshCw,
  User,
  Bot,
  AlertTriangle,
} from 'lucide-react';
import type { SCCAMessage } from '@/types/chat';

interface SCCAMessageBubbleProps {
  message: SCCAMessage;
  isLast: boolean;
  isLastAssistant: boolean;
  onEdit?: (sequence: number, content: string) => void;
  onDelete?: (sequence: number) => void;
  onRegenerate?: () => void;
}

export function SCCAMessageBubble({
  message,
  isLast,
  isLastAssistant,
  onEdit,
  onDelete,
  onRegenerate,
}: SCCAMessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    if (!isEditing) {
      setIsEditing(true);
      setEditContent(message.content);
      return;
    }
    if (editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }
    setShowConfirm(true);
  };

  const confirmEdit = () => {
    onEdit?.(message.sequence, editContent.trim());
    setIsEditing(false);
    setShowConfirm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group flex gap-3 px-4 py-3 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center"
        style={{
          backgroundColor: isUser 
            ? 'color-mix(in srgb, var(--neon-cyan) 10%, transparent)' 
            : 'color-mix(in srgb, var(--neon-green) 10%, transparent)',
          border: `1px solid ${isUser 
            ? 'color-mix(in srgb, var(--neon-cyan) 30%, transparent)' 
            : 'color-mix(in srgb, var(--neon-green) 30%, transparent)'}`,
        }}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" style={{ color: 'var(--neon-cyan)' }} />
        ) : (
          <Bot className="w-3.5 h-3.5" style={{ color: 'var(--neon-green)' }} />
        )}
      </div>

      {/* Content */}
      <div
        className={`flex flex-col max-w-[75%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Label */}
        <span
          className="text-[10px] mb-1 tracking-wider uppercase"
          style={{ 
            color: isUser 
              ? 'color-mix(in srgb, var(--neon-cyan) 60%, transparent)' 
              : 'color-mix(in srgb, var(--neon-green) 60%, transparent)' 
          }}
        >
          {isUser ? 'You' : 'SCCA'}
        </span>

        {/* Destructive edit confirmation */}
        {showConfirm && (
          <div 
            className="mb-2 p-3 rounded text-xs border"
            style={{ backgroundColor: 'color-mix(in srgb, var(--neon-red) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--neon-red) 20%, transparent)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--neon-red)' }} />
              <span className="font-medium" style={{ color: 'var(--neon-red)' }}>Destructive Edit</span>
            </div>
            <p className="mb-2 text-[var(--text-secondary)]">
              All messages after this point will be permanently deleted and the
              response will be regenerated.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmEdit}
                className="px-3 py-1 rounded text-xs transition-colors hover:opacity-80"
                style={{ backgroundColor: 'color-mix(in srgb, var(--neon-red) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--neon-red) 30%, transparent)', color: 'var(--neon-red)' }}
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setIsEditing(false);
                }}
                className="px-3 py-1 rounded text-xs transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div
          className="rounded px-4 py-2.5 text-sm leading-relaxed"
          style={{
            backgroundColor: isUser 
              ? 'color-mix(in srgb, var(--neon-cyan) 5%, transparent)' 
              : 'color-mix(in srgb, var(--bg-tertiary) 30%, transparent)',
            border: `1px solid ${isUser 
              ? 'color-mix(in srgb, var(--neon-cyan) 15%, transparent)' 
              : 'var(--border-color)'}`,
            color: 'var(--text-primary)'
          }}
        >
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[60px] bg-transparent border-none outline-none resize-none text-sm font-mono"
              style={{ color: 'var(--text-primary)' }}
              autoFocus
            />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButton
            onClick={handleCopy}
            title="Copy"
            icon={copied ? Check : Copy}
            activeColor={copied ? 'var(--neon-green)' : undefined}
          />

          {isUser && onEdit && (
            <ActionButton
              onClick={handleEdit}
              title="Edit (destructive)"
              icon={Pencil}
            />
          )}

          {isLastAssistant && isAssistant && onRegenerate && (
            <ActionButton
              onClick={onRegenerate}
              title="Regenerate"
              icon={RefreshCw}
            />
          )}

          {onDelete && (
            <ActionButton
              onClick={() => onDelete(message.sequence)}
              title="Delete (destructive)"
              icon={Trash2}
              hoverColor="hover:text-[var(--neon-red)]"
              hoverBg="hover:bg-[var(--neon-red)]/10"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({
  onClick,
  title,
  icon: Icon,
  activeColor,
  hoverColor = 'hover:text-[var(--neon-cyan)]',
  hoverBg = 'hover:bg-[var(--neon-cyan)]/10',
}: {
  onClick: () => void;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  activeColor?: string;
  hoverColor?: string;
  hoverBg?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${hoverColor} ${hoverBg}`}
      style={{ color: activeColor || 'var(--text-secondary)' }}
      title={title}
    >
      <Icon className="w-3 h-3" />
    </button>
  );
}
