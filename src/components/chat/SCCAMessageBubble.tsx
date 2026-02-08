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
        className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center ${
          isUser
            ? 'bg-neon-cyan/10 border border-neon-cyan/30'
            : 'bg-neon-green/10 border border-neon-green/30'
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-neon-cyan" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-neon-green" />
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
          className={`text-[10px] mb-1 tracking-wider uppercase ${
            isUser ? 'text-neon-cyan/60' : 'text-neon-green/60'
          }`}
        >
          {isUser ? 'You' : 'SCCA'}
        </span>

        {/* Destructive edit confirmation */}
        {showConfirm && (
          <div className="mb-2 p-3 bg-neon-red/5 border border-neon-red/20 rounded text-xs">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-neon-red" />
              <span className="text-neon-red font-medium">Destructive Edit</span>
            </div>
            <p className="text-terminal-dim mb-2">
              All messages after this point will be permanently deleted and the
              response will be regenerated.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmEdit}
                className="px-3 py-1 bg-neon-red/10 border border-neon-red/30 text-neon-red rounded text-xs hover:bg-neon-red/20 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setIsEditing(false);
                }}
                className="px-3 py-1 bg-cyber-mid/50 text-terminal-dim rounded text-xs hover:bg-cyber-mid transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-neon-cyan/5 border border-neon-cyan/15 text-terminal-text'
              : 'bg-cyber-mid/30 border border-cyber-light/10 text-terminal-text'
          }`}
        >
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[60px] bg-transparent border-none outline-none resize-none text-sm text-terminal-text font-mono"
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
            activeColor={copied ? 'text-neon-green' : undefined}
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
              hoverColor="hover:text-neon-red hover:bg-neon-red/10"
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
  hoverColor = 'hover:text-neon-cyan hover:bg-neon-cyan/10',
}: {
  onClick: () => void;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  activeColor?: string;
  hoverColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        activeColor || `text-terminal-dim ${hoverColor}`
      }`}
      title={title}
    >
      <Icon className="w-3 h-3" />
    </button>
  );
}
