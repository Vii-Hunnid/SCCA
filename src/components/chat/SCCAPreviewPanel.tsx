'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Server,
  Key,
  TrendingDown,
  BarChart3,
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

// Estimate token size with SCCA compression
function estimateTokenSize(content: string) {
  const rawBytes = new TextEncoder().encode(content).length;
  // Compression is better for longer content
  const compressionRatio = rawBytes < 50 ? 0.9 : rawBytes < 200 ? 0.55 : 0.45;
  const compressedBytes = Math.max(10, Math.round(rawBytes * compressionRatio));
  // Header (10) + Compressed + Nonce (12) + AuthTag (16)
  const encryptedBytes = 10 + compressedBytes + 12 + 16;

  return { rawBytes, compressedBytes, encryptedBytes, compressionRatio: rawBytes / compressedBytes };
}

const MEDIA_CATEGORY_ICONS: Record<string, React.ElementType> = {
  image: Image,
  video: Film,
  audio: Music,
  document: FileText,
};

const MEDIA_CATEGORY_COLORS: Record<string, string> = {
  image: 'var(--neon-cyan)',
  video: 'var(--neon-purple)',
  audio: 'var(--neon-yellow)',
  document: 'var(--neon-green)',
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

    // Baseline: JSON representation
    const jsonBaseline = chatMessages.reduce((acc, msg) => {
      return (
        acc +
        JSON.stringify({
          role: msg.role,
          content: msg.content,
          id: msg.id,
          timestamp: new Date().toISOString(),
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
      savingsPercent: jsonBaseline > 0
        ? Math.round((1 - totalEncrypted / jsonBaseline) * 100)
        : 0,
      avgCompressionRatio: totalRaw > 0 ? (totalRaw / totalCompressed).toFixed(1) : '0',
    };
  }, [chatMessages]);

  // Calculate animated values
  const savingsWidth = Math.min(100, Math.max(5, 100 - Math.abs(stats.savingsPercent)));

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
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--neon-cyan) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--neon-cyan) 30%, transparent)'
            }}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: 'var(--neon-cyan)' }} />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase block" style={{ color: 'var(--neon-cyan)' }}>
              SCCA Metrics
            </span>
            <span className="text-[9px] block" style={{ color: 'var(--text-secondary)' }}>
              Real-time encryption stats
            </span>
          </div>
        </div>
        {useSCCA && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--neon-green) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--neon-green) 30%, transparent)'
            }}
          >
            <motion.div 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--neon-green)' }}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] font-medium" style={{ color: 'var(--neon-green)' }}>Active</span>
          </div>
        )}
      </div>

      {!useSCCA ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--neon-yellow) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--neon-yellow) 30%, transparent)'
              }}
            >
              <Lock className="w-7 h-7" style={{ color: 'var(--neon-yellow)', opacity: 0.7 }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>SCCA Disabled</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Enable encryption to see metrics
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Message Metrics Grid */}
          <div className="p-3 grid grid-cols-2 gap-2">
            <MetricCard
              icon={MessageSquare}
              label="Messages"
              value={String(stats.messageCount)}
              sub={`${stats.userCount} user / ${stats.assistantCount} AI`}
              color="var(--neon-cyan)"
              delay={0}
            />
            <MetricCard
              icon={Database}
              label="Raw Data"
              value={formatBytes(stats.totalRaw)}
              sub="uncompressed text"
              color="var(--neon-yellow)"
              delay={0.1}
            />
            <MetricCard
              icon={Lock}
              label="Encrypted"
              value={formatBytes(stats.totalEncrypted)}
              sub="AES-256-GCM"
              color="var(--neon-green)"
              delay={0.2}
            />
            <MetricCard
              icon={Zap}
              label="Compression"
              value={`${stats.avgCompressionRatio}x`}
              sub="zlib deflate"
              color="var(--neon-purple)"
              delay={0.3}
            />
          </div>

          {/* Storage Savings Card */}
          <div className="px-3 pb-3">
            <motion.div 
              className="p-3 rounded-lg"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, transparent)',
                border: '1px solid var(--border-color)'
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" style={{ color: 'var(--neon-green)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    Storage Savings
                  </span>
                </div>
                <span
                  className="text-sm font-mono font-bold"
                  style={{
                    color: stats.savingsPercent > 0 ? 'var(--neon-green)' : 'var(--neon-yellow)'
                  }}
                >
                  {stats.savingsPercent > 0 ? '' : '+'}
                  {Math.abs(stats.savingsPercent)}%
                </span>
              </div>

              {/* Comparison bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span style={{ color: 'var(--text-secondary)' }}>vs Traditional JSON</span>
                </div>
                <div 
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)' }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, var(--neon-green) 0%, ${stats.savingsPercent > 50 ? 'var(--neon-cyan)' : 'var(--neon-yellow)'} 100%)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${savingsWidth}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                </div>
              </div>

              {/* Size comparison */}
              <div 
                className="flex justify-between mt-3 pt-3 text-[10px]"
                style={{ borderTop: '1px solid var(--border-color)' }}
              >
                <div className="text-center">
                  <span className="block" style={{ color: 'var(--neon-yellow)' }}>{formatBytes(stats.jsonBaseline)}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>JSON</span>
                </div>
                <div className="flex items-center">
                  <BarChart3 className="w-4 h-4" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                </div>
                <div className="text-center">
                  <span className="block font-medium" style={{ color: 'var(--neon-green)' }}>{formatBytes(stats.totalEncrypted)}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>SCCA</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Media Metrics */}
          <AnimatePresence>
            {mediaStats && mediaStats.count > 0 && (
              <motion.div 
                className="px-3 pb-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div 
                  className="p-3 rounded-lg"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, transparent)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ 
                          backgroundColor: 'color-mix(in srgb, var(--neon-purple) 15%, transparent)',
                        }}
                      >
                        <Paperclip className="w-3 h-3" style={{ color: 'var(--neon-purple)' }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--neon-purple)' }}>
                        Media Attachments
                      </span>
                    </div>
                    <span 
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ 
                        backgroundColor: 'color-mix(in srgb, var(--neon-purple) 15%, transparent)',
                        color: 'var(--neon-purple)'
                      }}
                    >
                      {mediaStats.count}
                    </span>
                  </div>

                  {/* Category breakdown */}
                  <div className="space-y-2 mb-3">
                    {Object.entries(mediaStats.byCategory).map(([cat, count]) => {
                      const CatIcon = MEDIA_CATEGORY_ICONS[cat] || FileText;
                      const color = MEDIA_CATEGORY_COLORS[cat] || 'var(--text-secondary)';
                      return (
                        <div 
                          key={cat} 
                          className="flex items-center justify-between text-xs p-2 rounded"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 30%, transparent)' }}
                        >
                          <div className="flex items-center gap-2">
                            <CatIcon className="w-3.5 h-3.5" style={{ color }} />
                            <span className="capitalize" style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                          </div>
                          <span className="font-mono font-medium" style={{ color }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Size stats */}
                  <div 
                    className="space-y-2 pt-3"
                    style={{ borderTop: '1px solid var(--border-color)' }}
                  >
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-secondary)' }}>Original Size</span>
                      <span className="font-mono" style={{ color: 'var(--neon-yellow)' }}>
                        {formatBytes(mediaStats.originalBytes)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-secondary)' }}>Encrypted</span>
                      <span className="font-mono" style={{ color: 'var(--neon-green)' }}>
                        {formatBytes(mediaStats.encryptedBytes)}
                      </span>
                    </div>
                    {mediaStats.avgCompressionRatio < 1 && (
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-secondary)' }}>Space Saved</span>
                        <span className="font-mono font-medium" style={{ color: 'var(--neon-green)' }}>
                          {Math.round((1 - mediaStats.avgCompressionRatio) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Compression bar */}
                  <div className="mt-3">
                    <div 
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)' }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ 
                          background: `linear-gradient(90deg, var(--neon-purple), var(--neon-cyan))`,
                          opacity: 0.8
                        }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, Math.max(5, mediaStats.avgCompressionRatio * 100))}%`,
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Encryption Protocol Details */}
          <div className="px-3 pb-3">
            <motion.div 
              className="p-3 rounded-lg"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, transparent)',
                border: '1px solid var(--border-color)'
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--neon-cyan) 15%, transparent)' }}
                >
                  <Key className="w-3 h-3" style={{ color: 'var(--neon-cyan)' }} />
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  Protocol Details
                </span>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'Cipher', value: 'AES-256-GCM', icon: Lock },
                  { key: 'KDF', value: 'HKDF-SHA256', icon: Key },
                  { key: 'Integrity', value: 'Merkle-HMAC', icon: Hash },
                  { key: 'Header', value: '10 bytes', icon: Server },
                  { key: 'Compression', value: 'zlib deflate', icon: Zap },
                  { key: 'Media Format', value: 'SCCA v2', icon: Database },
                ].map(({ key, value, icon: Icon }, idx) => (
                  <motion.div
                    key={key}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 30%, transparent)' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + idx * 0.05 }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{key}</span>
                    </div>
                    <span className="font-mono font-medium" style={{ color: 'var(--neon-cyan)' }}>
                      {value}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 mt-auto">
            <div 
              className="flex items-center justify-center gap-2 text-[10px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div 
                className="w-4 h-4 rounded flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--neon-green) 20%, transparent)' }}
              >
                <Lock className="w-2 h-2" style={{ color: 'var(--neon-green)' }} />
              </div>
              <span>All data encrypted at rest</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  sub: string;
  color: string;
  delay: number;
}

function MetricCard({ icon: Icon, label, value, sub, color, delay }: MetricCardProps) {
  return (
    <motion.div 
      className="p-2.5 rounded-lg"
      style={{ 
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, transparent)',
        border: '1px solid var(--border-color)'
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
      <p 
        className="text-base font-mono font-bold tracking-tight"
        style={{ color }}
      >
        {value}
      </p>
      <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
        {sub}
      </p>
    </motion.div>
  );
}
