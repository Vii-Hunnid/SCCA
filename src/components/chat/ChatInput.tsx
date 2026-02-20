'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Square, Lock, Paperclip, X, Image, Film, Music, FileText } from 'lucide-react';

interface PendingAttachment {
  file: File;
  preview?: string;
  category: string;
}

interface ChatInputProps {
  onSend: (content: string, attachments?: File[]) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const ACCEPT =
  '.png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a,.flac,.pdf,.txt,.md,.json';

const CATEGORY_ICON: Record<string, React.ElementType> = {
  image: Image,
  video: Film,
  audio: Music,
  document: FileText,
};

function getCategory(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

function formatSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  placeholder = 'Enter message... (encrypted with AES-256-GCM)',
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if ((!trimmed && attachments.length === 0) || isStreaming || disabled) return;
    onSend(trimmed, attachments.length > 0 ? attachments.map((a) => a.file) : undefined);
    setContent('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, attachments, isStreaming, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: PendingAttachment[] = [];
    for (const file of Array.from(files)) {
      const cat = getCategory(file.type);
      const attachment: PendingAttachment = { file, category: cat };
      if (cat === 'image' && file.size < 5 * 1024 * 1024) {
        attachment.preview = URL.createObjectURL(file);
      }
      newAttachments.push(attachment);
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div 
      className="border-t p-4"
      style={{ 
        borderColor: 'var(--border-color)', 
        backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)' 
      }}
    >
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-3 max-w-3xl mx-auto overflow-x-auto pb-1">
          {attachments.map((att, idx) => {
            const Icon = CATEGORY_ICON[att.category] || FileText;
            return (
              <div key={idx} className="relative flex-shrink-0 group">
                {att.preview ? (
                  <div 
                    className="w-16 h-16 rounded overflow-hidden"
                    style={{ border: '1px solid var(--border-color)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.preview}
                      alt={att.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-16 h-16 rounded flex flex-col items-center justify-center"
                    style={{ border: '1px solid var(--border-color)', backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 30%, transparent)' }}
                  >
                    <Icon className="w-4 h-4 mb-1" style={{ color: 'var(--neon-cyan)' }} />
                    <span className="text-[8px] truncate max-w-[56px] px-1" style={{ color: 'var(--text-secondary)' }}>
                      {att.file.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 left-0 right-0 text-center">
                  <span 
                    className="text-[8px] px-1 rounded"
                    style={{ color: 'var(--text-secondary)', backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)' }}
                  >
                    {formatSize(att.file.size)}
                  </span>
                </div>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'var(--neon-red)', opacity: 0.8 }}
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-3 max-w-3xl mx-auto">
        {/* File attach button */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isStreaming}
          className="flex-shrink-0 p-2.5 rounded transition-all disabled:opacity-50"
          style={{ 
            border: '1px solid var(--border-color)', 
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (!disabled && !isStreaming) {
              e.currentTarget.style.borderColor = 'var(--neon-cyan)';
              e.currentTarget.style.color = 'var(--neon-cyan)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          title="Attach media (encrypted with SCCA)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="cyber-input pr-10 resize-none max-h-[200px]"
          />
          <Lock 
            className="absolute right-3 top-3 w-3.5 h-3.5" 
            style={{ color: 'color-mix(in srgb, var(--text-secondary) 40%, transparent)' }} 
          />
        </div>
        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 p-2.5 rounded transition-all hover:opacity-80"
            style={{ border: '1px solid color-mix(in srgb, var(--neon-red) 50%, transparent)', color: 'var(--neon-red)' }}
            title="Stop generating"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={(!content.trim() && attachments.length === 0) || disabled}
            className="flex-shrink-0 p-2.5 rounded border transition-all disabled:cursor-not-allowed"
            style={{
              borderColor: (content.trim() || attachments.length > 0) && !disabled
                ? 'color-mix(in srgb, var(--neon-cyan) 50%, transparent)'
                : 'var(--border-color)',
              color: (content.trim() || attachments.length > 0) && !disabled
                ? 'var(--neon-cyan)'
                : 'var(--text-secondary)',
              backgroundColor: (content.trim() || attachments.length > 0) && !disabled
                ? 'color-mix(in srgb, var(--neon-cyan) 10%, transparent)'
                : 'transparent'
            }}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
