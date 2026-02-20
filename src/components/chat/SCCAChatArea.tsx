'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Shield } from 'lucide-react';
import { SCCAMessageBubble } from './SCCAMessageBubble';
import type { SCCAMessage } from '@/types/chat';

interface SCCAChatAreaProps {
  messages: SCCAMessage[];
  isStreaming: boolean;
  streamingContent: string;
  onEdit?: (sequence: number, content: string) => void;
  onDelete?: (sequence: number) => void;
  onRegenerate?: () => void;
}

export function SCCAChatArea({
  messages,
  isStreaming,
  streamingContent,
  onEdit,
  onDelete,
  onRegenerate,
}: SCCAChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const lastAssistantIdx = [...messages]
    .reverse()
    .findIndex((m) => m.role === 'assistant');
  const lastAssistantSequence =
    lastAssistantIdx >= 0
      ? messages[messages.length - 1 - lastAssistantIdx].sequence
      : -1;

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Shield className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--neon-cyan)', opacity: 0.3 }} />
            <h3 className="text-sm font-display mb-1 text-[var(--text-primary)]">
              Secure Channel Ready
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs">
              Messages are encrypted with AES-256-GCM and stored as compact
              binary tokens in a single database row.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto py-4">
        {messages.map((message, idx) => (
          <SCCAMessageBubble
            key={message.id}
            message={message}
            isLast={idx === messages.length - 1}
            isLastAssistant={message.sequence === lastAssistantSequence}
            onEdit={onEdit}
            onDelete={onDelete}
            onRegenerate={
              message.sequence === lastAssistantSequence
                ? onRegenerate
                : undefined
            }
          />
        ))}

        {/* Streaming with content */}
        {isStreaming && streamingContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 px-4 py-3"
          >
            <div 
              className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--neon-green) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--neon-green) 30%, transparent)' }}
            >
              <Bot className="w-3.5 h-3.5" style={{ color: 'var(--neon-green)' }} />
            </div>
            <div className="max-w-[75%]">
              <span className="text-[10px] tracking-wider uppercase" style={{ color: 'color-mix(in srgb, var(--neon-green) 60%, transparent)' }}>
                SCCA
              </span>
              <div 
                className="mt-1 rounded px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
                style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 30%, transparent)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                {streamingContent}
                <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ backgroundColor: 'var(--neon-cyan)', opacity: 0.5 }} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Streaming without content */}
        {isStreaming && !streamingContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 px-4 py-3"
          >
            <div 
              className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--neon-green) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--neon-green) 30%, transparent)' }}
            >
              <Bot className="w-3.5 h-3.5" style={{ color: 'var(--neon-green)' }} />
            </div>
            <div 
              className="rounded px-4 py-3"
              style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 30%, transparent)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: 'var(--neon-cyan)', opacity: 0.4, animationDelay: '0ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: 'var(--neon-cyan)', opacity: 0.4, animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: 'var(--neon-cyan)', opacity: 0.4, animationDelay: '300ms' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
