'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  MessageSquare,
  Database,
  Zap,
  Hash,
  Image,
  Film,
  Music,
  FileText,
  Paperclip,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MediaStats {
  count: number;
  originalBytes: number;
  encryptedBytes: number;
  avgCompressionRatio: number;
  byCategory: Record<string, number>;
}

interface SCCAPreviewPanelProps {
  messages: Message[];
  isStreaming: boolean;
  useSCCA: boolean;
  mediaStats?: MediaStats;
}

function estimateTokenSize(content: string) {
  const rawBytes = new TextEncoder().encode(content).length;
  const compressedBytes = Math.max(
    10,
    Math.round(
      rawBytes * (rawBytes < 50 ? 0.9 : rawBytes < 200 ? 0.55 : 0.45)
    )
  );
  const encryptedBytes = 10 + compressedBytes + 12 + 16;
  const compressionRatio = rawBytes > 0 ? rawBytes / compressedBytes : 1;

  return { rawBytes, compressedBytes, encryptedBytes, compressionRatio };
}

const MEDIA_CATEGORY_ICONS: Record<string, React.ElementType> = {
  image: Image,
  video: Film,
  audio: Music,
  document: FileText,
};

export function SCCAPreviewPanel({
  messages,
  isStreaming,
  useSCCA,
  mediaStats,
}: SCCAPreviewPanelProps) {
  const chatMessages = messages.filter((m) => m.role !== 'system');

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
      userCount: chatMessages.filter((m) => m.role === 'user').length,
      assistantCount: chatMessages.filter((m) => m.role === 'assistant').length,
      savingsPercent:
        jsonBaseline > 0
          ? Math.round((1 - totalEncrypted / jsonBaseline) * 100)
          : 0,
      avgCompressionRatio:
        totalRaw > 0 ? (totalRaw / totalCompressed).toFixed(1) : '0',
    };
  }, [chatMessages]);

  return (
    <div 
      className="w-72 border-l flex flex-col h-full overflow-hidden"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" style={{ color: 'var(--neon-cyan)' }} />
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--neon-cyan)' }}>
            Metrics
          </span>
        </div>
        {useSCCA && (
          <div className="flex items-center gap-1.5">
            <div className="status-dot-active" />
            <span className="text-[10px]" style={{ color: 'var(--neon-green)' }}>Active</span>
          </div>
        )}
      </div>

      {!useSCCA ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Lock className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--neon-yellow)', opacity: 0.5 }} />
            <p className="text-xs text-[var(--text-secondary)]">SCCA Disabled</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Message Metrics Grid */}
          <div className="p-3 grid grid-cols-2 gap-2">
            <MetricCard
              icon={MessageSquare}
              label="Messages"
              value={String(stats.messageCount)}
              sub={`${stats.userCount}u / ${stats.assistantCount}a`}
              color="var(--neon-cyan)"
            />
            <MetricCard
              icon={Database}
              label="Raw Size"
              value={formatBytes(stats.totalRaw)}
              sub="uncompressed"
              color="var(--neon-yellow)"
            />
            <MetricCard
              icon={Lock}
              label="SCCA Size"
              value={formatBytes(stats.totalEncrypted)}
              sub="encrypted"
              color="var(--neon-green)"
            />
            <MetricCard
              icon={Zap}
              label="Compress"
              value={`${stats.avgCompressionRatio}x`}
              sub="avg ratio"
              color="var(--neon-purple)"
            />
          </div>

          {/* Savings Bar */}
          <div className="px-3 pb-3">
            <div className="cyber-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[var(--text-secondary)]">
                  vs JSON storage
                </span>
                <span
                  className="text-xs font-mono font-medium"
                  style={{
                    color: stats.savingsPercent > 0 ? 'var(--neon-green)' : 'var(--neon-yellow)'
                  }}
                >
                  {stats.savingsPercent > 0 ? '-' : '+'}
                  {Math.abs(stats.savingsPercent)}%
                </span>
              </div>

              <div 
                className="h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: stats.savingsPercent > 0 ? 'var(--neon-green)' : 'var(--neon-yellow)',
                    opacity: 0.6
                  }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, Math.max(5, 100 - Math.abs(stats.savingsPercent)))}%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="flex justify-between mt-1.5 text-[10px] text-[var(--text-secondary)]">
                <span>JSON: {formatBytes(stats.jsonBaseline)}</span>
                <span>SCCA: {formatBytes(stats.totalEncrypted)}</span>
              </div>
            </div>
          </div>

          {/* Media Metrics */}
          {mediaStats && mediaStats.count > 0 && (
            <div className="px-3 pb-3">
              <div className="cyber-card p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Paperclip className="w-3 h-3" style={{ color: 'var(--neon-purple)' }} />
                  <span className="text-[10px] tracking-wider uppercase" style={{ color: 'var(--neon-purple)' }}>
                    Media ({mediaStats.count})
                  </span>
                </div>

                {/* Category breakdown */}
                <div className="space-y-1.5 mb-3">
                  {Object.entries(mediaStats.byCategory).map(([cat, count]) => {
                    const CatIcon = MEDIA_CATEGORY_ICONS[cat] || FileText;
                    return (
                      <div key={cat} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <CatIcon className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
                          <span className="text-[var(--text-secondary)] capitalize">{cat}</span>
                        </div>
                        <span className="text-[var(--text-primary)] font-mono">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Size stats */}
                <div 
                  className="space-y-1.5 pt-2 border-t"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[var(--text-secondary)]">Original</span>
                    <span style={{ color: 'var(--neon-yellow)' }}>{formatBytes(mediaStats.originalBytes)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[var(--text-secondary)]">Encrypted</span>
                    <span style={{ color: 'var(--neon-green)' }}>{formatBytes(mediaStats.encryptedBytes)}</span>
                  </div>
                  {mediaStats.avgCompressionRatio < 1 && (
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[var(--text-secondary)]">Saved</span>
                      <span style={{ color: 'var(--neon-green)' }}>
                        {Math.round((1 - mediaStats.avgCompressionRatio) * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Compression bar */}
                <div className="mt-2">
                  <div 
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: 'var(--neon-purple)', opacity: 0.6 }}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.max(5, mediaStats.avgCompressionRatio * 100))}%`,
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Encryption Details */}
          <div className="px-3 pb-3">
            <div className="cyber-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Hash className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-[10px] text-[var(--text-secondary)] tracking-wider uppercase">
                  Protocol
                </span>
              </div>
              <div className="space-y-1.5">
                {[
                  ['Cipher', 'AES-256-GCM'],
                  ['KDF', 'HKDF-SHA256'],
                  ['Integrity', 'Merkle-HMAC'],
                  ['Header', '10 bytes'],
                  ['Compress', 'zlib deflate'],
                  ['Media', 'SCCA v2 packet'],
                ].map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between text-[10px] font-mono"
                  >
                    <span className="text-[var(--text-secondary)]">{key}</span>
                    <span style={{ color: 'var(--neon-cyan)' }}>{value}</span>
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

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="cyber-card p-2.5">
      <div className="flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-[10px] text-[var(--text-secondary)]">{label}</span>
      </div>
      <p className="text-sm font-mono font-medium text-[var(--text-primary)]">
        {value}
      </p>
      <p className="text-[10px] text-[var(--text-secondary)]">{sub}</p>
    </div>
  );
}
