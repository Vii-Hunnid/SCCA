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
      ? 'text-neon-green'
      : metrics.integrityStatus === 'pending'
        ? 'text-neon-yellow'
        : 'text-neon-red';

  const statusDot =
    metrics.integrityStatus === 'verified'
      ? 'status-dot-active'
      : metrics.integrityStatus === 'pending'
        ? 'status-dot-warning'
        : 'status-dot-error';

  return (
    <motion.div
      layout
      className="cyber-card border-l-2 border-l-neon-cyan/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-light/10">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-xs font-semibold text-neon-cyan tracking-wider uppercase">
            Security
          </span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-terminal-dim hover:text-neon-cyan transition-colors"
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
            <span className="text-xs text-terminal-dim">Integrity</span>
            <div className="flex items-center gap-2">
              <div className={statusDot} />
              <span className={`text-xs ${statusColor}`}>
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
            <div className="pt-2 border-t border-cyber-light/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-terminal-dim">Compression</span>
                <span className="text-xs text-neon-green">
                  {Math.round(metrics.compressionRatio * 100)}%
                </span>
              </div>
              <div className="h-1 bg-cyber-mid rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-neon-green/60 rounded-full"
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
                <span className="text-xs text-terminal-dim">Storage Saved</span>
                <span className="text-xs text-neon-cyan">
                  {Math.round(metrics.storageEfficiency * 100)}%
                </span>
              </div>
              <div className="h-1 bg-cyber-mid rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-neon-cyan/60 rounded-full"
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
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-3 h-3 text-terminal-dim" />
        <span className="text-xs text-terminal-dim">{label}</span>
      </div>
      <span className="text-xs text-terminal-text font-medium">{value}</span>
    </div>
  );
}
