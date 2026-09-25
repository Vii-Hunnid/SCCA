'use client';

import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, Shield, Lock } from 'lucide-react';
import { SCCAMessageBubble } from './SCCAMessageBubble';
import { BlockStreamingIndicator, InlineStreamingCursor } from './BlockStreamingIndicator';
import type { SCCAMessage } from '@/types/chat';

// How close to the bottom (px) counts as "following" the conversation
const PIN_THRESHOLD = 80;

interface SCCAChatAreaProps {
  messages: SCCAMessage[];
  isStreaming: boolean;
  streamingContent: string;
  onEdit?: (sequence: number, content: string) => void;
  onDelete?: (sequence: number) => void;
  onRegenerate?: () => void;
  conversationId?: string;
}

export function SCCAChatArea({
  messages,
  isStreaming,
  streamingContent,
  onEdit,
  onDelete,
  onRegenerate,
  conversationId,
}: SCCAChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // True while the user is near the bottom — when false we never yank them
  // back down (e.g. they scrolled up to read during generation).
  const pinnedRef = useRef(true);
  const prevCountRef = useRef(0);
  const reduceMotion = useReducedMotion();

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distanceFromBottom < PIN_THRESHOLD;
  }, []);

  // Auto-scroll: follow while pinned; also follow our own new user message.
  // Streaming updates scroll instantly (smooth-per-token is janky); new
  // messages animate.
  useEffect(() => {
    const last = messages[messages.length - 1];
    const newMessageAdded = messages.length !== prevCountRef.current;
    prevCountRef.current = messages.length;

    const follow =
      pinnedRef.current || (newMessageAdded && last?.role === 'user');
    if (!follow) return;

    bottomRef.current?.scrollIntoView({
      behavior: reduceMotion || !newMessageAdded ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages, streamingContent, reduceMotion]);

  // Find the last assistant message for regenerate functionality
  const lastAssistantIdx = [...messages]
    .reverse()
    .findIndex((m) => m.role === 'assistant');
  const lastAssistantSequence =
    lastAssistantIdx >= 0
      ? messages[messages.length - 1 - lastAssistantIdx].sequence
      : -1;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scroll-smooth"
      onScroll={handleScroll}
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-color) transparent' }}
    >
      {/* Screen-reader status for streaming */}
      <div aria-live="polite" className="sr-only">
        {isStreaming
          ? streamingContent
            ? 'Assistant is responding'
            : 'Assistant is thinking'
          : ''}
      </div>

      <AnimatePresence mode="wait">
        {messages.length === 0 && !isStreaming && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center h-full min-h-[400px]"
          >
            <div className="text-center max-w-md px-6">
              {/* Animated Shield Icon */}
              <motion.div
                className="relative w-20 h-20 mx-auto mb-6"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(16, 185, 129, 0.1)',
                    '0 0 40px rgba(16, 185, 129, 0.2)',
                    '0 0 20px rgba(16, 185, 129, 0.1)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ borderRadius: '50%' }}
              >
                <div
                  className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}
                >
                  <Shield className="w-10 h-10" style={{ color: 'var(--neon-green)', opacity: 0.8 }} />
                </div>
                <motion.div
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--neon-green)' }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Lock className="w-3 h-3 text-black" />
                </motion.div>
              </motion.div>

              <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)] tracking-wide">
                Secure Channel Established
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                All messages are encrypted at rest with AES-256-GCM using
                per-conversation keys derived via HKDF-SHA256. Data is stored
                as compact binary tokens.
              </p>

              {/* Security Features */}
              <div className="flex flex-wrap justify-center gap-2">
                {['AES-256-GCM', 'HKDF-SHA256', 'Merkle-HMAC', 'zlib'].map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-1 rounded text-[10px] font-mono tracking-wider"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--neon-cyan) 10%, transparent)',
                      color: 'var(--neon-cyan)',
                      border: '1px solid color-mix(in srgb, var(--neon-cyan) 20%, transparent)'
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="max-w-3xl mx-auto py-6 space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((message, idx) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: reduceMotion ? 0 : 0.3,
                // Cap the stagger so long histories don't animate for seconds
                delay: reduceMotion ? 0 : Math.min(idx * 0.03, 0.3),
              }}
            >
              <SCCAMessageBubble
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
                showTimestamp={idx === 0 ||
                  new Date(messages[idx - 1].timestamp).getTime() -
                  new Date(message.timestamp).getTime() > 5 * 60 * 1000}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming Message */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 px-4 py-3"
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                  border: '1px solid color-mix(in srgb, var(--neon-green) 25%, transparent)'
                }}
              >
                <Bot className="w-4 h-4" style={{ color: 'var(--neon-green)' }} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[11px] font-medium tracking-wider uppercase"
                  style={{ color: 'var(--neon-green)' }}
                >
                  SCCA
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  generating...
                </span>
              </div>

              <div
                className="rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-card)',
                  color: 'var(--text-primary)'
                }}
              >
                {streamingContent ? (
                  <div className="whitespace-pre-wrap break-words">
                    {streamingContent}
                    <InlineStreamingCursor />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-1">
                    <BlockStreamingIndicator />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
