'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
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
import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface UsageData {
  period: string;
  since: string | null;
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
  { value: '1h', label: '1H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'all', label: 'All' },
];

const CHART_TICK = { fontSize: 10, fill: 'var(--text-tertiary)' } as const;
const CHART_AXIS_LINE = { stroke: 'var(--border-light)' } as const;
const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-control)',
  boxShadow: 'var(--shadow-elevated)',
  fontSize: '11px',
  color: 'var(--text-primary)',
} as const;

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

  const summaryCards = [
    {
      label: 'Total Requests',
      value: data ? data.summary.totalRequests.toLocaleString() : '—',
      icon: Activity,
      color: 'var(--neon-cyan)',
    },
    {
      label: 'Total Tokens',
      value: data ? formatTokens(data.summary.totalTokens) : '—',
      icon: Zap,
      color: 'var(--neon-green)',
    },
    {
      label: 'Avg Latency',
      value: data ? `${data.summary.avgLatencyMs}ms` : '—',
      icon: Clock,
      color: 'var(--neon-yellow)',
    },
    {
      label: 'Total Cost',
      value: data ? formatCost(data.summary.totalCostMicro) : '—',
      icon: TrendingUp,
      color: 'var(--neon-purple)',
    },
  ];

  return (
    <DashboardPageShell>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--neon-green)' }} />
            <span className="text-sm text-[var(--text-primary)] font-semibold tracking-wide">
              Usage
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector — segmented pill control */}
            <div
              className="flex items-center gap-0.5 rounded-full p-1 border border-[var(--border-color)]"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
              role="group"
              aria-label="Usage period"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  aria-pressed={period === opt.value}
                  className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
                    period === opt.value
                      ? ''
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={
                    period === opt.value
                      ? {
                          backgroundColor:
                            'color-mix(in srgb, var(--neon-cyan) 14%, transparent)',
                          color: 'var(--neon-cyan)',
                        }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchUsage}
              aria-label="Refresh usage data"
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 cyber-card p-3 flex items-center gap-2" style={{ borderColor: 'var(--neon-red)', borderWidth: '1px' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--neon-red)' }} />
            <span className="text-xs" style={{ color: 'var(--neon-red)' }}>{error}</span>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[92px]" />
              ))}
            </div>
            <Skeleton className="h-32 mb-6" />
            <Skeleton className="h-60 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </>
        )}

        {/* Summary Cards */}
        {(!loading || data) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {summaryCards.map((card) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-4 h-full">
                  <div className="flex items-center gap-1.5 mb-2">
                    <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-widest uppercase">
                      {card.label}
                    </span>
                  </div>
                  <span className="text-2xl font-semibold font-mono tabular-nums text-[var(--text-primary)]">
                    {card.value}
                  </span>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Rate Limit Status */}
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-widest uppercase flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" style={{ color: 'var(--neon-cyan)' }} />
                  Current Rate Limits — {data.rateLimits.tierDisplay}
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                        <div className="flex justify-between text-[10px] mb-1.5">
                          <span className="text-[var(--text-secondary)] tracking-wider uppercase">{label}</span>
                          <span className="font-mono tabular-nums text-[var(--text-primary)]">
                            {key.startsWith('t') ? formatTokens(used) : used}/
                            {key.startsWith('t') ? formatTokens(limit) : limit}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              backgroundColor: pct > 80 ? 'var(--neon-red)' : pct > 50 ? 'var(--neon-yellow)' : 'var(--neon-cyan)'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
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
              className="mb-6 cyber-card p-4"
              style={{
                borderColor: anyNearLimit ? 'var(--neon-red)' : 'var(--neon-purple)',
                borderWidth: '1px',
                backgroundColor: anyNearLimit ? 'color-mix(in srgb, var(--neon-red) 5%, transparent)' : 'color-mix(in srgb, var(--neon-purple) 5%, transparent)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Rocket className="w-4 h-4" style={{ color: anyNearLimit ? 'var(--neon-red)' : 'var(--neon-purple)' }} />
                  <div>
                    <p className="text-xs text-[var(--text-primary)] font-semibold">
                      {anyNearLimit
                        ? 'Rate limits nearly exceeded'
                        : 'Free tier — limited to 10 RPM, 200 RPD'}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      {anyNearLimit
                        ? 'Upgrade your plan to get higher rate limits and avoid interruptions.'
                        : 'Upgrade for 6x more requests per minute and 25x more per day.'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="flex items-center gap-1.5 px-4 py-2 text-cyber-black text-[10px] font-semibold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                  style={{ background: 'linear-gradient(to right, var(--neon-purple), var(--neon-cyan))' }}
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
            className="mb-6"
          >
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-widest uppercase">
                  Request Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="var(--neon-cyan)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis
                        dataKey="time"
                        tick={CHART_TICK}
                        axisLine={CHART_AXIS_LINE}
                        tickLine={false}
                      />
                      <YAxis
                        tick={CHART_TICK}
                        axisLine={CHART_AXIS_LINE}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Area
                        type="monotone"
                        dataKey="requests"
                        stroke="var(--neon-cyan)"
                        fillOpacity={1}
                        fill="url(#colorReqs)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="errors"
                        stroke="var(--neon-red)"
                        fillOpacity={0.08}
                        fill="var(--neon-red)"
                        strokeWidth={1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Token Usage Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-widest uppercase">
                  Token Consumption
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis
                        dataKey="time"
                        tick={CHART_TICK}
                        axisLine={CHART_AXIS_LINE}
                        tickLine={false}
                      />
                      <YAxis
                        tick={CHART_TICK}
                        axisLine={CHART_AXIS_LINE}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value: number) => [formatTokens(value), 'Tokens']}
                      />
                      <Bar dataKey="tokens" radius={[3, 3, 0, 0]}>
                        {chartData.map((_, index) => (
                          <Cell key={index} fill="var(--neon-green)" fillOpacity={0.55} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Breakdown Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Endpoint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader className="py-3">
                <CardTitle className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-widest uppercase">
                  By Endpoint
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.byEndpoint.length ? (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-[var(--text-tertiary)] uppercase tracking-wider text-[9px] border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <th className="text-left py-2 font-medium">Endpoint</th>
                        <th className="text-right py-2 font-medium">Requests</th>
                        <th className="text-right py-2 font-medium">Tokens</th>
                        <th className="text-right py-2 font-medium">Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byEndpoint.map((e) => (
                        <tr
                          key={e.endpoint}
                          className="border-b last:border-0"
                          style={{ borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                        >
                          <td className="py-2 font-mono" style={{ color: 'var(--neon-cyan)' }}>{e.endpoint}</td>
                          <td className="text-right py-2 font-mono tabular-nums">{e.requests}</td>
                          <td className="text-right py-2 font-mono tabular-nums">{formatTokens(e.tokens)}</td>
                          <td className="text-right py-2 font-mono tabular-nums">{e.avgLatencyMs}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)] py-4 text-center">No data for this period</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* By API Key */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="h-full">
              <CardHeader className="py-3">
                <CardTitle className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-widest uppercase">
                  By API Key
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.byApiKey.length ? (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-[var(--text-tertiary)] uppercase tracking-wider text-[9px] border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <th className="text-left py-2 font-medium">Key</th>
                        <th className="text-right py-2 font-medium">Requests</th>
                        <th className="text-right py-2 font-medium">Tokens</th>
                        <th className="text-right py-2 font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byApiKey.map((k) => (
                        <tr
                          key={k.keyId}
                          className="border-b last:border-0"
                          style={{ borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
                        >
                          <td className="py-2">
                            <div className="font-medium">{k.keyName}</div>
                            <div className="font-mono text-[10px] text-[var(--text-tertiary)]">{k.keyPrefix}</div>
                          </td>
                          <td className="text-right py-2 font-mono tabular-nums">{k.requests}</td>
                          <td className="text-right py-2 font-mono tabular-nums">{formatTokens(k.tokens)}</td>
                          <td className="text-right py-2 font-mono tabular-nums">{formatCost(k.costMicro)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)] py-4 text-center">No data for this period</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Additional stats */}
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-widest uppercase">
                  Transfer Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-semibold font-mono tabular-nums text-[var(--text-primary)]">
                      {formatBytes(data.summary.totalBytesIn)}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] tracking-wider uppercase mt-1">Data In</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold font-mono tabular-nums text-[var(--text-primary)]">
                      {formatBytes(data.summary.totalBytesOut)}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] tracking-wider uppercase mt-1">Data Out</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold font-mono tabular-nums" style={{ color: 'var(--neon-green)' }}>
                      {data.summary.successRate}%
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] tracking-wider uppercase mt-1">Success Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardPageShell>
  );
}
