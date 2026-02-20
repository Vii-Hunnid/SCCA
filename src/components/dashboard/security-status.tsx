'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Key,
  Database,
  GitBranch,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { useState } from 'react';

interface SecurityMetrics {
  encryptionAlgorithm: string;
  keyDerivation: string;
  messageCount: number;
  compressionRatio?: number;
  integrityStatus: 'verified' | 'pending' | 'error';
  storageEfficiency?: number;
}

interface SecurityStatusProps {
  metrics?: SecurityMetrics;
}

const defaultMetrics: SecurityMetrics = {
  encryptionAlgorithm: 'AES-256-GCM',
  keyDerivation: 'HKDF-SHA256',
  messageCount: 0,
  integrityStatus: 'verified',
};

export function SecurityStatus({ metrics = defaultMetrics }: SecurityStatusProps) {
  const [collapsed, setCollapsed] = useState(false);

  const statusColor =
    metrics.integrityStatus === 'verified'
      ? 'var(--neon-green)'
      : metrics.integrityStatus === 'pending'
        ? 'var(--neon-yellow)'
        : 'var(--neon-red)';

  const statusBgColor =
    metrics.integrityStatus === 'verified'
      ? 'var(--neon-green)'
      : metrics.integrityStatus === 'pending'
        ? 'var(--neon-yellow)'
        : 'var(--neon-red)';

  return (
    <motion.div
      layout
      className="cyber-card"
      style={{ borderLeft: '2px solid color-mix(in srgb, var(--neon-cyan) 30%, transparent)' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" style={{ color: 'var(--neon-cyan)' }} />
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--neon-cyan)' }}>
            Security
          </span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          {collapsed ? (
            <Maximize2 className="w-3.5 h-3.5" />
          ) : (
            <Minimize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 py-3 space-y-3"
        >
          {/* Integrity Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Integrity</span>
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ 
                  backgroundColor: statusBgColor,
                  boxShadow: `0 0 6px ${statusBgColor}`
                }} 
              />
              <span className="text-xs" style={{ color: statusColor }}>
                {metrics.integrityStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-2">
            <MetricRow
              icon={Lock}
              label="Cipher"
              value={metrics.encryptionAlgorithm}
            />
            <MetricRow
              icon={Key}
              label="KDF"
              value={metrics.keyDerivation}
            />
            <MetricRow
              icon={GitBranch}
              label="Chain"
              value="Merkle-HMAC"
            />
            <MetricRow
              icon={Database}
              label="Messages"
              value={String(metrics.messageCount)}
            />
          </div>

          {/* Compression */}
          {metrics.compressionRatio !== undefined && (
            <div 
              className="pt-2 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Compression</span>
                <span className="text-xs" style={{ color: 'var(--neon-green)' }}>
                  {Math.round(metrics.compressionRatio * 100)}%
                </span>
              </div>
              <div 
                className="h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: 'var(--neon-green)', opacity: 0.6 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.compressionRatio * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Storage Efficiency */}
          {metrics.storageEfficiency !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Storage Saved</span>
                <span className="text-xs" style={{ color: 'var(--neon-cyan)' }}>
                  {Math.round(metrics.storageEfficiency * 100)}%
                </span>
              </div>
              <div 
                className="h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: 'var(--neon-cyan)', opacity: 0.6 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.storageEfficiency * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <span className="text-xs font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
