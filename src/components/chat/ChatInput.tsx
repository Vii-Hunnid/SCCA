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
    <div className="border-t border-cyber-light/10 bg-cyber-darker/80 p-4">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-3 max-w-3xl mx-auto overflow-x-auto pb-1">
          {attachments.map((att, idx) => {
            const Icon = CATEGORY_ICON[att.category] || FileText;
            return (
              <div key={idx} className="relative flex-shrink-0 group">
                {att.preview ? (
                  <div className="w-16 h-16 rounded border border-cyber-light/20 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.preview}
                      alt={att.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded border border-cyber-light/20 flex flex-col items-center justify-center bg-cyber-mid/30">
                    <Icon className="w-4 h-4 text-neon-cyan mb-1" />
                    <span className="text-[8px] text-terminal-dim truncate max-w-[56px] px-1">
                      {att.file.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 left-0 right-0 text-center">
                  <span className="text-[8px] text-terminal-dim bg-cyber-darker/80 px-1 rounded">
                    {formatSize(att.file.size)}
                  </span>
                </div>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-neon-red/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
          className="flex-shrink-0 p-2.5 rounded border border-cyber-light/20 text-terminal-dim
                     hover:text-neon-cyan hover:border-neon-cyan/30 transition-all disabled:opacity-50"
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
          <Lock className="absolute right-3 top-3 w-3.5 h-3.5 text-terminal-dim/40" />
        </div>
        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 p-2.5 rounded border border-neon-red/50 text-neon-red
                       hover:bg-neon-red/10 transition-all"
            title="Stop generating"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={(!content.trim() && attachments.length === 0) || disabled}
            className={`flex-shrink-0 p-2.5 rounded border transition-all ${
              (content.trim() || attachments.length > 0) && !disabled
                ? 'border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan'
                : 'border-cyber-light/20 text-terminal-dim cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
