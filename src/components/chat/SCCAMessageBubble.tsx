"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import type { SCCAMessage } from "@/types/chat";

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

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

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
    <div
      className={cn(
        "group flex gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white",
          isUser
            ? "bg-gradient-to-br from-blue-500 to-blue-600"
            : "bg-gradient-to-br from-emerald-500 to-emerald-600"
        )}
      >
        {isUser ? "U" : "G"}
      </div>

      {/* Message content */}
      <div className={cn("flex flex-col max-w-[75%]", isUser ? "items-end" : "items-start")}>
        {/* Edit confirmation dialog */}
        {showConfirm && (
          <div className="mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
            <p className="font-medium text-destructive">
              This will delete all messages after this point and regenerate the
              response. This action cannot be undone.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={confirmEdit}
                className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-xs font-medium"
              >
                Confirm Edit
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setIsEditing(false);
                }}
                className="px-3 py-1 bg-muted rounded text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[60px] bg-transparent border-none outline-none resize-none text-sm"
              autoFocus
            />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>

          {isUser && onEdit && (
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Edit (destructive)"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

          {isLastAssistant && isAssistant && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(message.sequence)}
              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
              title="Delete (destructive)"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
