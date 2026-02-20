'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Square, 
  Lock, 
  Paperclip, 
  X, 
  Image, 
  Film, 
  Music, 
  FileText,
  Upload,
  AlertCircle,
  Check,
  Trash2
} from 'lucide-react';

interface PendingAttachment {
  file: File;
  preview?: string;
  category: 'image' | 'video' | 'audio' | 'document';
  id: string;
}

interface ChatInputProps {
  onSend: (content: string, attachments?: File[]) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a,.flac,.pdf,.txt,.md,.json';

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  image: { icon: Image, color: 'var(--neon-cyan)', label: 'Image' },
  video: { icon: Film, color: 'var(--neon-purple)', label: 'Video' },
  audio: { icon: Music, color: 'var(--neon-yellow)', label: 'Audio' },
  document: { icon: FileText, color: 'var(--neon-green)', label: 'Document' },
};

function getCategory(mime: string): 'image' | 'video' | 'audio' | 'document' {
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

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Handle sending message
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

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  // Add files to attachments
  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newAttachments: PendingAttachment[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        errors.push(`${file.name} exceeds 100MB limit`);
        continue;
      }

      const category = getCategory(file.type);
      const id = generateId();
      const attachment: PendingAttachment = { file, category, id };

      // Create preview for images
      if (category === 'image' && file.size < 5 * 1024 * 1024) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    if (errors.length > 0) {
      setDragError(errors.join(', '));
      setTimeout(() => setDragError(null), 5000);
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  // Handle file input change
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Clear all attachments
  const clearAttachments = useCallback(() => {
    attachments.forEach(a => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setAttachments([]);
  }, [attachments]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isStreaming) {
      setIsDragging(true);
    }
  }, [disabled, isStreaming]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if leaving the container, not entering a child
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (!disabled && !isStreaming) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles, disabled, isStreaming]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
    };
  }, []);

  const canSend = (content.trim() || attachments.length > 0) && !disabled && !isStreaming;
  const totalSize = attachments.reduce((sum, a) => sum + a.file.size, 0);

  return (
    <div 
      ref={dropZoneRef}
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
              borderColor: 'var(--neon-cyan)',
            }}
          >
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--neon-cyan)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Drop files here to upload
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Images, videos, audio, and documents will be encrypted
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {dragError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-full left-0 right-0 mb-2 mx-4 p-3 rounded-lg flex items-center gap-2"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--neon-red) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--neon-red) 30%, transparent)'
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--neon-red)' }} />
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{dragError}</span>
            <button 
              onClick={() => setDragError(null)}
              className="ml-auto p-1 rounded hover:bg-white/10"
            >
              <X className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className="border-t p-4"
        style={{ 
          borderColor: 'var(--border-color)', 
          backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)' 
        }}
      >
        {/* Attachment Previews */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {attachments.length} file{attachments.length > 1 ? 's' : ''} • {formatSize(totalSize)}
                </span>
                <button
                  onClick={clearAttachments}
                  className="text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-colors hover:opacity-80"
                  style={{ color: 'var(--neon-red)' }}
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {attachments.map((att) => {
                  const config = CATEGORY_CONFIG[att.category];
                  const Icon = config.icon;
                  
                  return (
                    <motion.div 
                      key={att.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative flex-shrink-0 group"
                    >
                      {att.preview ? (
                        <div 
                          className="w-20 h-20 rounded-lg overflow-hidden"
                          style={{ border: `1px solid ${config.color}` }}
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
                          className="w-20 h-20 rounded-lg flex flex-col items-center justify-center p-2"
                          style={{ 
                            border: `1px solid ${config.color}`,
                            backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)'
                          }}
                        >
                          <Icon className="w-6 h-6 mb-1" style={{ color: config.color }} />
                          <span 
                            className="text-[9px] uppercase font-bold"
                            style={{ color: config.color }}
                          >
                            {att.file.name.split('.').pop()}
                          </span>
                        </div>
                      )}
                      
                      {/* File name tooltip */}
                      <div 
                        className="absolute -bottom-1 left-0 right-0 text-center truncate px-1"
                      >
                        <span 
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ 
                            color: 'var(--text-secondary)', 
                            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 90%, transparent)'
                          }}
                        >
                          {formatSize(att.file.size)}
                        </span>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        style={{ backgroundColor: 'var(--neon-red)' }}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>

                      {/* Category indicator */}
                      <div 
                        className="absolute top-1 left-1 w-4 h-4 rounded flex items-center justify-center"
                        style={{ backgroundColor: config.color }}
                      >
                        <Icon className="w-2.5 h-2.5 text-black" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isStreaming}
            className="flex-shrink-0 p-2.5 rounded-lg transition-all disabled:opacity-50"
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
          </motion.button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full py-3 px-4 pr-10 rounded-lg resize-none max-h-[200px] text-sm leading-relaxed"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, transparent)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--neon-cyan)';
                e.currentTarget.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--neon-cyan) 20%, transparent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <Lock 
              className="absolute right-3 top-3.5 w-3.5 h-3.5 pointer-events-none" 
              style={{ color: 'color-mix(in srgb, var(--text-secondary) 40%, transparent)' }} 
            />
          </div>

          {/* Send/Stop button */}
          {isStreaming ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStop}
              className="flex-shrink-0 p-2.5 rounded-lg transition-all hover:opacity-80 flex items-center gap-2"
              style={{ 
                border: '1px solid color-mix(in srgb, var(--neon-red) 50%, transparent)', 
                color: 'var(--neon-red)',
                backgroundColor: 'color-mix(in srgb, var(--neon-red) 10%, transparent)'
              }}
              title="Stop generating"
            >
              <Square className="w-4 h-4 fill-current" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: canSend ? 1.05 : 1 }}
              whileTap={{ scale: canSend ? 0.95 : 1 }}
              onClick={handleSend}
              disabled={!canSend}
              className="flex-shrink-0 p-2.5 rounded-lg border transition-all disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                borderColor: canSend
                  ? 'color-mix(in srgb, var(--neon-cyan) 50%, transparent)'
                  : 'var(--border-color)',
                color: canSend ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                backgroundColor: canSend
                  ? 'color-mix(in srgb, var(--neon-cyan) 15%, transparent)'
                  : 'transparent'
              }}
              title={canSend ? 'Send message (Enter)' : 'Type a message to send'}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between max-w-3xl mx-auto mt-2 px-1">
          <div className="flex items-center gap-3">
            <span 
              className="text-[10px] flex items-center gap-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Lock className="w-3 h-3" />
              End-to-end encrypted
            </span>
            {attachments.length > 0 && (
              <span 
                className="text-[10px] flex items-center gap-1"
                style={{ color: 'var(--neon-cyan)' }}
              >
                <Check className="w-3 h-3" />
                {attachments.length} file{attachments.length > 1 ? 's' : ''} ready
              </span>
            )}
          </div>
          <span 
            className="text-[10px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Shift + Enter for new line
          </span>
        </div>
      </div>
    </div>
  );
}
