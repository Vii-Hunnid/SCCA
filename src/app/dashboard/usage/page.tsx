'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  ArrowLeft,
  Activity,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  Rocket,
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import Image from 'next/image';

interface UsageData {
  period: string;
  since: string;
  summary: {
    totalRequests: number;
    totalTokens: number;
    totalBytesIn: number;
    totalBytesOut: number;
    totalCostMicro: number;
    avgLatencyMs: number;
    successRate: number;
    errorCount: number;
  };
  timeline: Array<{
    timestamp: string;
    requests: number;
    tokens: number;
    costMicro: number;
    errors: number;
  }>;
  byEndpoint: Array<{
    endpoint: string;
    requests: number;
    tokens: number;
    costMicro: number;
    avgLatencyMs: number;
  }>;
  byApiKey: Array<{
    keyId: string;
    keyName: string;
    keyPrefix: string;
    requests: number;
    tokens: number;
    costMicro: number;
  }>;
  rateLimits: {
    tier: string;
    tierDisplay: string;
    current: { rpm: number; rpd: number; tpm: number; tpd: number };
    limits: { rpm: number; rpd: number; tpm: number; tpd: number };
    remaining: { rpm: number; rpd: number; tpm: number; tpd: number };
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return String(tokens);
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1_000_000).toFixed(2)}M`;
}

function formatCost(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(4)}`;
}

const PERIOD_OPTIONS = [
  { value: '1h', label: '1 Hour' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('24h');
  const [error, setError] = useState('');

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/scca/usage?period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const chartData =
    data?.timeline.map((t) => ({
      time:
        period === '1h'
          ? new Date(t.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : period === '24h'
          ? new Date(t.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : new Date(t.timestamp).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            }),
      requests: t.requests,
      tokens: t.tokens,
      errors: t.errors,
    })) || [];

  return (
    <div className="min-h-screen bg-cyber-black">
      {/* Header */}
      <header className="border-b border-cyber-light/10 bg-cyber-darker/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex justify-center items-center gap-4">
            <Link
              href="/dashboard/platform"
              className="text-terminal-dim hover:text-neon-cyan transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
           </Link>
           <Image
              src="/logo.jpg"
              alt="SCCA logo"
              width={100}
              height={100}
              priority
              className="object-contain"
            /> 
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-neon-green" />
              <span className="text-sm text-terminal-text font-semibold tracking-wide">
                Usage
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex gap-1 bg-cyber-darker rounded p-0.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-2.5 py-1 text-[10px] rounded transition-colors ${
                    period === opt.value
                      ? 'bg-neon-cyan/10 text-neon-cyan'
                      : 'text-terminal-dim hover:text-terminal-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchUsage}
              className="p-1.5 text-terminal-dim hover:text-neon-cyan transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 cyber-card p-3 border-neon-red/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-neon-red" />
            <span className="text-xs text-neon-red">{error}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: 'Total Requests',
              value: data?.summary.totalRequests ?? '—',
              icon: Activity,
              color: 'text-neon-cyan',
            },
            {
              label: 'Total Tokens',
              value: data ? formatTokens(data.summary.totalTokens) : '—',
              icon: Zap,
              color: 'text-neon-green',
            },
            {
              label: 'Avg Latency',
              value: data ? `${data.summary.avgLatencyMs}ms` : '—',
              icon: Clock,
              color: 'text-neon-yellow',
            },
            {
              label: 'Total Cost',
              value: data ? formatCost(data.summary.totalCostMicro) : '—',
              icon: TrendingUp,
              color: 'text-neon-purple',
            },
          ].map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="cyber-card p-4"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <card.icon className={`w-3 h-3 ${card.color}`} />
                <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
                  {card.label}
                </span>
              </div>
              <span className="text-lg font-display text-terminal-text">
                {card.value}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Rate Limit Status */}
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 cyber-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
                Current Rate Limits — {data.rateLimits.tierDisplay}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(
                [
                  ['RPM', 'rpm'],
                  ['RPD', 'rpd'],
                  ['TPM', 'tpm'],
                  ['TPD', 'tpd'],
                ] as const
              ).map(([label, key]) => {
                const used = data.rateLimits.current[key];
                const limit = data.rateLimits.limits[key];
                const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] text-terminal-dim mb-1">
                      <span>{label}</span>
                      <span>
                        {key.startsWith('t') ? formatTokens(used) : used}/
                        {key.startsWith('t') ? formatTokens(limit) : limit}
                      </span>
                    </div>
                    <div className="h-2 bg-cyber-darker rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct > 80
                            ? 'bg-neon-red'
                            : pct > 50
                            ? 'bg-neon-yellow'
                            : 'bg-neon-cyan'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Upgrade Banner — shown when any rate limit is >80% or tier is free */}
        {data && (() => {
          const { current, limits } = data.rateLimits;
          const anyNearLimit =
            (limits.rpm > 0 && current.rpm / limits.rpm > 0.8) ||
            (limits.rpd > 0 && current.rpd / limits.rpd > 0.8) ||
            (limits.tpm > 0 && current.tpm / limits.tpm > 0.8) ||
            (limits.tpd > 0 && current.tpd / limits.tpd > 0.8);
          const isFree = data.rateLimits.tier === 'free';

          if (!anyNearLimit && !isFree) return null;

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 cyber-card p-4 ${
                anyNearLimit
                  ? 'border-neon-red/30 bg-neon-red/5'
                  : 'border-neon-purple/20 bg-neon-purple/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Rocket className={`w-4 h-4 ${anyNearLimit ? 'text-neon-red' : 'text-neon-purple'}`} />
                  <div>
                    <p className="text-xs text-terminal-text font-semibold">
                      {anyNearLimit
                        ? 'Rate limits nearly exceeded'
                        : 'Free tier — limited to 10 RPM, 200 RPD'}
                    </p>
                    <p className="text-[10px] text-terminal-dim mt-0.5">
                      {anyNearLimit
                        ? 'Upgrade your plan to get higher rate limits and avoid interruptions.'
                        : 'Upgrade for 6x more requests per minute and 25x more per day.'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-cyber-black text-[10px] font-semibold rounded hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  Upgrade Plan
                </Link>
              </div>
            </motion.div>
          );
        })()}

        {/* Request Timeline Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6 cyber-card p-4"
          >
            <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
              Request Timeline
            </span>
            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242440" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: '#3d4455' }}
                    axisLine={{ stroke: '#242440' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#3d4455' }}
                    axisLine={{ stroke: '#242440' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0d0d14',
                      border: '1px solid #242440',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#b3b1ad',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#00f0ff"
                    fillOpacity={1}
                    fill="url(#colorReqs)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke="#ff3333"
                    fillOpacity={0.1}
                    fill="#ff3333"
                    strokeWidth={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Token Usage Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6 cyber-card p-4"
          >
            <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
              Token Consumption
            </span>
            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242440" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: '#3d4455' }}
                    axisLine={{ stroke: '#242440' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#3d4455' }}
                    axisLine={{ stroke: '#242440' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0d0d14',
                      border: '1px solid #242440',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#b3b1ad',
                    }}
                    formatter={(value: number) => [formatTokens(value), 'Tokens']}
                  />
                  <Bar dataKey="tokens" radius={[2, 2, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={index} fill="#00ff9d" fillOpacity={0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Breakdown Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Endpoint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="cyber-card p-4"
          >
            <span className="text-[10px] text-terminal-dim tracking-wider uppercase mb-3 block">
              By Endpoint
            </span>
            {data?.byEndpoint.length ? (
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-terminal-dim border-b border-cyber-light/10">
                    <th className="text-left py-1.5">Endpoint</th>
                    <th className="text-right py-1.5">Requests</th>
                    <th className="text-right py-1.5">Tokens</th>
                    <th className="text-right py-1.5">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byEndpoint.map((e) => (
                    <tr
                      key={e.endpoint}
                      className="border-b border-cyber-light/5 text-terminal-text"
                    >
                      <td className="py-1.5 text-neon-cyan">{e.endpoint}</td>
                      <td className="text-right py-1.5">{e.requests}</td>
                      <td className="text-right py-1.5">{formatTokens(e.tokens)}</td>
                      <td className="text-right py-1.5">{e.avgLatencyMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-terminal-dim">No data for this period</p>
            )}
          </motion.div>

          {/* By API Key */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="cyber-card p-4"
          >
            <span className="text-[10px] text-terminal-dim tracking-wider uppercase mb-3 block">
              By API Key
            </span>
            {data?.byApiKey.length ? (
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-terminal-dim border-b border-cyber-light/10">
                    <th className="text-left py-1.5">Key</th>
                    <th className="text-right py-1.5">Requests</th>
                    <th className="text-right py-1.5">Tokens</th>
                    <th className="text-right py-1.5">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byApiKey.map((k) => (
                    <tr
                      key={k.keyId}
                      className="border-b border-cyber-light/5 text-terminal-text"
                    >
                      <td className="py-1.5">
                        <div className="text-neon-cyan">{k.keyName}</div>
                        <div className="text-terminal-dim">{k.keyPrefix}</div>
                      </td>
                      <td className="text-right py-1.5">{k.requests}</td>
                      <td className="text-right py-1.5">{formatTokens(k.tokens)}</td>
                      <td className="text-right py-1.5">{formatCost(k.costMicro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-terminal-dim">No data for this period</p>
            )}
          </motion.div>
        </div>

        {/* Additional stats */}
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 cyber-card p-4"
          >
            <span className="text-[10px] text-terminal-dim tracking-wider uppercase mb-3 block">
              Transfer Summary
            </span>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-display text-terminal-text">
                  {formatBytes(data.summary.totalBytesIn)}
                </div>
                <div className="text-[10px] text-terminal-dim">Data In</div>
              </div>
              <div>
                <div className="text-lg font-display text-terminal-text">
                  {formatBytes(data.summary.totalBytesOut)}
                </div>
                <div className="text-[10px] text-terminal-dim">Data Out</div>
              </div>
              <div>
                <div className="text-lg font-display text-terminal-text">
                  {data.summary.successRate}%
                </div>
                <div className="text-[10px] text-terminal-dim">Success Rate</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
