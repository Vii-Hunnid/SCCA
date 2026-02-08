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
            <Shield className="w-8 h-8 text-neon-cyan/30 mx-auto mb-3" />
            <h3 className="text-sm font-display text-terminal-text mb-1">
              Secure Channel Ready
            </h3>
            <p className="text-xs text-terminal-dim max-w-xs">
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
            <div className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center bg-neon-green/10 border border-neon-green/30">
              <Bot className="w-3.5 h-3.5 text-neon-green" />
            </div>
            <div className="max-w-[75%]">
              <span className="text-[10px] text-neon-green/60 tracking-wider uppercase">
                SCCA
              </span>
              <div className="mt-1 rounded bg-cyber-mid/30 border border-cyber-light/10 px-4 py-2.5 text-sm leading-relaxed text-terminal-text whitespace-pre-wrap break-words">
                {streamingContent}
                <span className="inline-block w-1.5 h-4 bg-neon-cyan/50 animate-pulse ml-0.5" />
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
            <div className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center bg-neon-green/10 border border-neon-green/30">
              <Bot className="w-3.5 h-3.5 text-neon-green" />
            </div>
            <div className="rounded bg-cyber-mid/30 border border-cyber-light/10 px-4 py-3">
              <div className="flex gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40 animate-bounce"
                  style={{ animationDelay: '300ms' }}
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
