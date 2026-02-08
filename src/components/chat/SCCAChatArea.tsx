"use client";

import { useRef, useEffect } from "react";
import { SCCAMessageBubble } from "./SCCAMessageBubble";
import type { SCCAMessage } from "@/types/chat";

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

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const lastAssistantIdx = [...messages]
    .reverse()
    .findIndex((m) => m.role === "assistant");
  const lastAssistantSequence =
    lastAssistantIdx >= 0
      ? messages[messages.length - 1 - lastAssistantIdx].sequence
      : -1;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {messages.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-1">Start a conversation</h3>
            <p className="text-sm">
              Messages are encrypted with AES-256-GCM and stored as compact
              binary tokens.
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

        {/* Streaming indicator */}
        {isStreaming && streamingContent && (
          <div className="group flex gap-3 px-4 py-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-emerald-500 to-emerald-600">
              G
            </div>
            <div className="max-w-[75%]">
              <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {streamingContent}
                <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Streaming without content yet */}
        {isStreaming && !streamingContent && (
          <div className="group flex gap-3 px-4 py-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-emerald-500 to-emerald-600">
              G
            </div>
            <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
