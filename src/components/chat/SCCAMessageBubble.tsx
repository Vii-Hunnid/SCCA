'use client';

import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  RefreshCw,
  User,
  Bot,
  AlertTriangle,
  Clock,
  Code,
  Quote,
} from 'lucide-react';
import { format } from 'date-fns';
import type { SCCAMessage } from '@/types/chat';

interface SCCAMessageBubbleProps {
  message: SCCAMessage;
  isLast: boolean;
  isLastAssistant: boolean;
  onEdit?: (sequence: number, content: string) => void;
  onDelete?: (sequence: number) => void;
  onRegenerate?: () => void;
  showTimestamp?: boolean;
}

// Simple markdown-like parser for code blocks and inline code
function formatContent(content: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = content;
  let key = 0;

  // Handle code blocks (```language\ncode```)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{processInlineFormatting(content.slice(lastIndex, match.index))}</span>
      );
    }

    const language = match[1] || 'text';
    const code = match[2];

    parts.push(
      <CodeBlock key={key++} language={language} code={code} />
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={key++}>{processInlineFormatting(content.slice(lastIndex))}</span>
    );
  }

  return parts.length > 0 ? parts : processInlineFormatting(content);
}

// Process inline formatting (bold, italic, code, quotes)
function processInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Split by newlines and process each line
  const lines = remaining.split('\n');

  return lines.map((line, idx) => {
    // Handle blockquotes (> text)
    if (line.startsWith('> ')) {
      return (
        <div
          key={idx}
          className="flex gap-2 my-2 px-3 py-2 rounded border-l-2"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)',
            borderLeftColor: 'var(--neon-cyan)',
          }}
        >
          <Quote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--neon-cyan)', opacity: 0.6 }} />
          <span className="italic text-[var(--text-secondary)]">{line.slice(2)}</span>
        </div>
      );
    }

    // Handle inline code (`code`)
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    const inlineCodeRegex = /`([^`]+)`/g;
    let match;

    while ((match = inlineCodeRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        elements.push(<span key={`text-${lastIndex}`}>{processBoldItalic(line.slice(lastIndex, match.index))}</span>);
      }
      elements.push(
        <code
          key={`code-${match.index}`}
          className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--neon-cyan) 15%, transparent)',
            color: 'var(--neon-cyan)',
          }}
        >
          {match[1]}
        </code>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      elements.push(<span key={`text-${lastIndex}`}>{processBoldItalic(line.slice(lastIndex))}</span>);
    }

    return <div key={idx}>{elements.length > 0 ? elements : line}</div>;
  });
}

// Process bold and italic
function processBoldItalic(text: string): React.ReactNode {
  // Bold (**text** or __text__)
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic (*text* or _text_)
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');

  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

// Code block component
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div 
      className="my-3 rounded-lg overflow-hidden"
      style={{ 
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
        border: '1px solid var(--border-color)'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2"
        style={{ 
          backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)',
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5" style={{ color: 'var(--neon-cyan)' }} />
          <span 
            className="text-[10px] font-mono uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all hover:opacity-80"
          style={{ 
            color: copied ? 'var(--neon-green)' : 'var(--text-secondary)',
            backgroundColor: copied ? 'color-mix(in srgb, var(--neon-green) 10%, transparent)' : 'transparent'
          }}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code */}
      <pre className="p-3 overflow-x-auto">
        <code 
          className="text-xs font-mono leading-relaxed block"
          style={{ color: 'var(--text-primary)' }}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}

export const SCCAMessageBubble = memo(function SCCAMessageBubble({
  message,
  isLast,
  isLastAssistant,
  onEdit,
  onDelete,
  onRegenerate,
  showTimestamp,
}: SCCAMessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleEdit = useCallback(() => {
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
  }, [isEditing, editContent, message.content]);

  const confirmEdit = useCallback(() => {
    onEdit?.(message.sequence, editContent.trim());
    setIsEditing(false);
    setShowConfirm(false);
  }, [onEdit, message.sequence, editContent]);

  const cancelEdit = useCallback(() => {
    setShowConfirm(false);
    setIsEditing(false);
    setEditContent(message.content);
  }, [message.content]);

  const formattedTime = format(new Date(message.timestamp), 'h:mm a');
  const formattedDate = format(new Date(message.timestamp), 'MMM d, yyyy');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`group flex gap-3 px-4 py-3 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: isUser
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
            border: `1px solid ${isUser 
              ? 'color-mix(in srgb, var(--neon-cyan) 25%, transparent)' 
              : 'color-mix(in srgb, var(--neon-green) 25%, transparent)'}`,
          }}
        >
          {isUser ? (
            <User className="w-4 h-4" style={{ color: 'var(--neon-cyan)' }} />
          ) : (
            <Bot className="w-4 h-4" style={{ color: 'var(--neon-green)' }} />
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className={`flex flex-col min-w-0 max-w-[85%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Header with name and timestamp */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span
            className="text-[11px] font-medium tracking-wider uppercase"
            style={{ 
              color: isUser 
                ? 'var(--neon-cyan)' 
                : 'var(--neon-green)'
            }}
          >
            {isUser ? 'You' : 'SCCA'}
          </span>
          {(showTimestamp || isLast) && (
            <span 
              className="text-[10px] flex items-center gap-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Clock className="w-3 h-3" />
              {formattedTime}
            </span>
          )}
        </div>

        {/* Destructive edit confirmation */}
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, height: 0 }}
              animate={{ opacity: 1, scale: 1, height: 'auto' }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              className="mb-3 p-4 rounded-lg border overflow-hidden"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--neon-red) 5%, transparent)', 
                borderColor: 'color-mix(in srgb, var(--neon-red) 30%, transparent)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--neon-red)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--neon-red)' }}>
                  Destructive Edit
                </span>
              </div>
              <p className="mb-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                All messages after this point will be permanently deleted and the
                response will be regenerated with new encryption keys.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmEdit}
                  className="px-4 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--neon-red) 15%, transparent)', 
                    border: '1px solid color-mix(in srgb, var(--neon-red) 40%, transparent)', 
                    color: 'var(--neon-red)' 
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)', 
                    color: 'var(--text-secondary)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message bubble */}
        <div
          className="rounded-lg px-4 py-3 text-sm leading-relaxed"
          style={{
            background: isUser 
              ? 'linear-gradient(135deg, color-mix(in srgb, var(--neon-cyan) 8%, transparent) 0%, color-mix(in srgb, var(--neon-cyan) 4%, transparent) 100%)'
              : 'linear-gradient(135deg, color-mix(in srgb, var(--bg-tertiary) 50%, transparent) 0%, color-mix(in srgb, var(--bg-tertiary) 30%, transparent) 100%)',
            border: `1px solid ${isUser 
              ? 'color-mix(in srgb, var(--neon-cyan) 20%, transparent)' 
              : 'var(--border-color)'}`,
            color: 'var(--text-primary)'
          }}
        >
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[80px] bg-transparent border-none outline-none resize-none text-sm font-mono"
              style={{ color: 'var(--text-primary)' }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelEdit();
                if (e.key === 'Enter' && e.metaKey) handleEdit();
              }}
            />
          ) : (
            <div className="break-words">
              {formatContent(message.content)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButton
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy message'}
            icon={copied ? Check : Copy}
            active={copied}
          />

          {isUser && onEdit && (
            <ActionButton
              onClick={handleEdit}
              title={isEditing ? 'Save changes (Cmd+Enter)' : 'Edit message'}
              icon={isEditing ? Check : Pencil}
            />
          )}

          {isLastAssistant && isAssistant && onRegenerate && (
            <ActionButton
              onClick={onRegenerate}
              title="Regenerate response"
              icon={RefreshCw}
            />
          )}

          {onDelete && (
            <ActionButton
              onClick={() => onDelete(message.sequence)}
              title="Delete message"
              icon={Trash2}
              danger
            />
          )}
        </div>
      </div>
    </motion.div>
  );
});

interface ActionButtonProps {
  onClick: () => void;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  danger?: boolean;
}

function ActionButton({ onClick, title, icon: Icon, active, danger }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-1.5 rounded-md transition-all duration-200
        ${danger 
          ? 'hover:text-[var(--neon-red)] hover:bg-[var(--neon-red)]/10' 
          : active
            ? 'text-[var(--neon-green)] bg-[var(--neon-green)]/10'
            : 'hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10'
        }
      `}
      style={{ 
        color: active 
          ? 'var(--neon-green)' 
          : danger 
            ? 'var(--text-secondary)' 
            : 'var(--text-secondary)'
      }}
      title={title}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
