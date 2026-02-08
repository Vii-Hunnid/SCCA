"use client";

import { useMemo } from "react";
import {
  Eye,
  Lock,
  MessageSquare,
  Database,
  BarChart3,
  Shield,
  Zap,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";

interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
}

interface SCCAPreviewPanelProps {
  messages: Message[];
  isStreaming: boolean;
  useSCCA: boolean;
}

function estimateTokenSize(content: string) {
  const rawBytes = new TextEncoder().encode(content).length;
  const compressedBytes = Math.max(
    10,
    Math.round(
      rawBytes * (rawBytes < 50 ? 0.9 : rawBytes < 200 ? 0.55 : 0.45)
    )
  );
  // 10-byte header + 12-byte nonce + 16-byte auth tag
  const encryptedBytes = 10 + compressedBytes + 12 + 16;
  const compressionRatio = rawBytes > 0 ? rawBytes / compressedBytes : 1;

  return { rawBytes, compressedBytes, encryptedBytes, compressionRatio };
}

export function SCCAPreviewPanel({
  messages,
  isStreaming,
  useSCCA,
}: SCCAPreviewPanelProps) {
  const chatMessages = messages.filter((m) => m.role !== "system");

  const stats = useMemo(() => {
    let totalRaw = 0;
    let totalEncrypted = 0;
    let totalCompressed = 0;

    chatMessages.forEach((msg) => {
      const est = estimateTokenSize(msg.content);
      totalRaw += est.rawBytes;
      totalEncrypted += est.encryptedBytes;
      totalCompressed += est.compressedBytes;
    });

    const jsonBaseline = chatMessages.reduce((acc, msg) => {
      return (
        acc +
        JSON.stringify({
          role: msg.role,
          content: msg.content,
          id: msg.id,
        }).length
      );
    }, 0);

    return {
      totalRaw,
      totalEncrypted,
      totalCompressed,
      jsonBaseline,
      messageCount: chatMessages.length,
      userCount: chatMessages.filter((m) => m.role === "user").length,
      assistantCount: chatMessages.filter((m) => m.role === "assistant").length,
      savingsPercent:
        jsonBaseline > 0
          ? Math.round((1 - totalEncrypted / jsonBaseline) * 100)
          : 0,
      avgCompressionRatio:
        totalRaw > 0 ? (totalRaw / totalCompressed).toFixed(1) : "0",
    };
  }, [chatMessages]);

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Preview</span>
        </div>
        {useSCCA && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full">
            <Lock className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-medium text-emerald-500">
              SCCA
            </span>
          </div>
        )}
      </div>

      {!useSCCA ? (
        /* SCCA Disabled Notice */
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Lock className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-sm font-medium">SCCA Disabled</p>
            <p className="text-xs text-muted-foreground mt-1">
              Messages are not encrypted
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Chat bubble preview */}
          <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto border-b">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No messages yet
              </p>
            ) : (
              chatMessages.map((msg) => {
                const est = estimateTokenSize(msg.content);
                const isUser = msg.role === "user";

                return (
                  <div key={msg.id}>
                    <div
                      className={cn(
                        "flex gap-1.5 items-start",
                        isUser ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white",
                          isUser
                            ? "bg-gradient-to-br from-blue-500 to-blue-600"
                            : "bg-gradient-to-br from-emerald-500 to-emerald-600"
                        )}
                      >
                        {isUser ? "U" : "G"}
                      </div>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-2 py-1 text-xs line-clamp-3",
                          isUser
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                    {/* Per-message metrics */}
                    <p
                      className={cn(
                        "text-[10px] text-muted-foreground mt-0.5",
                        isUser ? "text-right" : "text-left pl-6"
                      )}
                    >
                      {est.rawBytes} B raw → {est.encryptedBytes} B enc (
                      {est.compressionRatio.toFixed(1)}x)
                    </p>
                  </div>
                );
              })
            )}

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex gap-1.5 items-start">
                <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white bg-gradient-to-br from-emerald-500 to-emerald-600">
                  G
                </div>
                <div className="flex gap-1 bg-muted rounded-lg px-2 py-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SCCA Metrics Grid */}
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <MessageSquare className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] text-muted-foreground">
                    Messages
                  </span>
                </div>
                <p className="text-sm font-mono font-medium">
                  {stats.messageCount}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.userCount}u / {stats.assistantCount}a
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Database className="w-3 h-3 text-orange-500" />
                  <span className="text-[10px] text-muted-foreground">
                    Raw Size
                  </span>
                </div>
                <p className="text-sm font-mono font-medium">
                  {formatBytes(stats.totalRaw)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  uncompressed
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">
                    SCCA Size
                  </span>
                </div>
                <p className="text-sm font-mono font-medium">
                  {formatBytes(stats.totalEncrypted)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  enc + packed
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span className="text-[10px] text-muted-foreground">
                    Compress
                  </span>
                </div>
                <p className="text-sm font-mono font-medium">
                  {stats.avgCompressionRatio}x
                </p>
                <p className="text-[10px] text-muted-foreground">avg ratio</p>
              </div>
            </div>
          </div>

          {/* Savings Bar */}
          <div className="px-3 pb-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">
                    vs JSON storage
                  </span>
                </div>
                <span
                  className={cn(
                    "text-xs font-mono font-medium",
                    stats.savingsPercent > 0
                      ? "text-emerald-500"
                      : "text-orange-500"
                  )}
                >
                  {stats.savingsPercent > 0 ? "-" : "+"}
                  {Math.abs(stats.savingsPercent)}%
                </span>
              </div>

              {/* Bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    stats.savingsPercent > 0 ? "bg-emerald-500" : "bg-orange-500"
                  )}
                  style={{
                    width: `${Math.min(100, Math.max(5, 100 - Math.abs(stats.savingsPercent)))}%`,
                  }}
                />
              </div>

              <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                <span>JSON: {formatBytes(stats.jsonBaseline)}</span>
                <span>SCCA: {formatBytes(stats.totalEncrypted)}</span>
              </div>
            </div>
          </div>

          {/* Encryption Details */}
          <div className="px-3 pb-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-2">
                <Hash className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-medium">
                  Encryption Details
                </span>
              </div>
              <div className="space-y-1">
                {[
                  ["Cipher", "AES-256-GCM"],
                  ["Key Derivation", "HKDF-SHA256"],
                  ["Integrity", "SHA-256 Merkle"],
                  ["Binary Header", "10 bytes"],
                  ["Compression", "zlib deflate"],
                ].map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between text-[10px] font-mono"
                  >
                    <span className="text-muted-foreground">{key}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
