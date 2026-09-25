'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Key,
  BarChart3,
  CreditCard,
  Zap,
  ArrowRight,
  Activity,
  TrendingUp,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickStats {
  tier: string;
  tierDisplay: string;
  rpm: { used: number; limit: number; percent: number };
  rpd: { used: number; limit: number; percent: number };
  activeKeys: number;
  maxKeys: number;
  monthlySpend: string;
}

export default function PlatformPage() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [rlRes, billingRes, keysRes] = await Promise.all([
          fetch('/api/scca/rate-limits'),
          fetch('/api/scca/billing'),
          fetch('/api/scca/keys'),
        ]);
        const [rl, billing, keys] = await Promise.all([
          rlRes.json(),
          billingRes.json(),
          keysRes.json(),
        ]);
        setStats({
          tier: rl.tier || 'free',
          tierDisplay: rl.tierDisplay || 'Free',
          rpm: rl.usage?.rpm || { used: 0, limit: 10, percent: 0 },
          rpd: rl.usage?.rpd || { used: 0, limit: 200, percent: 0 },
          activeKeys: keys.keys?.length || 0,
          maxKeys: rl.limits?.maxApiKeys || 3,
          monthlySpend: billing.account?.monthlySpendDisplay || '$0.00',
        });
      } catch {
        // Defaults on error
        setStats({
          tier: 'free',
          tierDisplay: 'Free',
          rpm: { used: 0, limit: 10, percent: 0 },
          rpd: { used: 0, limit: 200, percent: 0 },
          activeKeys: 0,
          maxKeys: 3,
          monthlySpend: '$0.00',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const cards = [
    {
      title: 'API Keys',
      description: 'Create, manage, and revoke API keys for Vault API access',
      icon: Key,
      href: '/dashboard/api-keys',
      color: 'neon-cyan',
      stat: stats ? `${stats.activeKeys}/${stats.maxKeys} active` : '...',
    },
    {
      title: 'Usage',
      description: 'Monitor requests, tokens, and consumption analytics',
      icon: BarChart3,
      href: '/dashboard/usage',
      color: 'neon-green',
      stat: stats ? `${stats.rpd.used} requests today` : '...',
    },
    {
      title: 'Billing',
      description: 'View billing tiers, invoices, and spending controls',
      icon: CreditCard,
      href: '/dashboard/billing',
      color: 'neon-purple',
      stat: stats ? `${stats.monthlySpend} this month` : '...',
    },
  ];

  return (
    <DashboardPageShell>
      <div className="max-w-5xl mx-auto px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-primary)] font-semibold tracking-wide">
              Platform
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-dot-active" />
            {stats ? (
              <Badge tone="cyan">{stats.tierDisplay}</Badge>
            ) : (
              <span className="text-xs text-[var(--text-secondary)]">...</span>
            )}
          </div>
        </div>
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-xl font-display text-[var(--text-primary)] tracking-wide mb-2">
            <span style={{ color: 'var(--neon-cyan)' }}>&gt;</span> API Platform Console
          </h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            Monitor rate limits, manage API keys, track consumption, and control
            billing for your SCCA Vault API usage.
          </p>
        </div>

        {/* Content wrapper with text colors */}
        <div className="text-[var(--text-primary)]">

        {/* Live Rate Limits Bar */}
        {loading && (
          <Skeleton className="h-28 mb-8" />
        )}
        {!loading && stats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3.5 h-3.5" style={{ color: 'var(--neon-cyan)' }} />
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-widest uppercase">
                Live Rate Limits
              </span>
              <span className="ml-auto text-[10px] text-[var(--text-secondary)]">
                Tier: <span style={{ color: 'var(--neon-cyan)' }}>{stats.tierDisplay}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1.5">
                  <span className="tracking-wider uppercase">RPM (Requests/min)</span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    {stats.rpm.used}/{stats.rpm.limit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.rpm.percent}%` }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor:
                        stats.rpm.percent > 80
                          ? 'var(--neon-red)'
                          : stats.rpm.percent > 50
                          ? 'var(--neon-yellow)'
                          : 'var(--neon-cyan)',
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1.5">
                  <span className="tracking-wider uppercase">RPD (Requests/day)</span>
                  <span className="font-mono tabular-nums text-[var(--text-primary)]">
                    {stats.rpd.used}/{stats.rpd.limit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.rpd.percent}%` }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor:
                        stats.rpd.percent > 80
                          ? 'var(--neon-red)'
                          : stats.rpd.percent > 50
                          ? 'var(--neon-yellow)'
                          : 'var(--neon-green)',
                    }}
                  />
                </div>
              </div>
            </div>
            </Card>
          </motion.div>
        )}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={card.href}>
                <div className="cyber-card-hover p-5 h-full group cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `color-mix(in srgb, var(--${card.color}) 10%, transparent)` }}
                    >
                      <card.icon className="w-[18px] h-[18px]" style={{ color: `var(--${card.color})` }} />
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--neon-cyan)] transition-colors" />
                  </div>
                  <h3 className="text-sm text-[var(--text-primary)] font-semibold mb-1">
                    {card.title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">
                    {card.description}
                  </p>
                  <div className="text-xs font-mono tabular-nums" style={{ color: `var(--${card.color})` }}>{card.stat}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Tier Overview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="cyber-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--neon-purple)' }} />
            <span className="text-sm text-[var(--text-primary)] font-semibold">
              Rate Limit Tiers
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mb-4 leading-relaxed">
            Higher tiers unlock increased rate limits. Tiers upgrade automatically
            based on cumulative spend, similar to OpenAI and Anthropic usage tiers.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[var(--text-tertiary)] uppercase tracking-wider text-[9px] border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="text-left py-2 pr-4 font-medium">Tier</th>
                  <th className="text-right py-2 px-3 font-medium">RPM</th>
                  <th className="text-right py-2 px-3 font-medium">RPD</th>
                  <th className="text-right py-2 px-3 font-medium">TPM</th>
                  <th className="text-right py-2 px-3 font-medium">TPD</th>
                  <th className="text-right py-2 pl-3 font-medium">Unlock At</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Free', rpm: '10', rpd: '200', tpm: '10K', tpd: '200K', unlock: '$0', tier: 'free' },
                  { name: 'Tier 1', rpm: '60', rpd: '5K', tpm: '100K', tpd: '5M', unlock: '$5', tier: 'tier_1' },
                  { name: 'Tier 2', rpm: '300', rpd: '20K', tpm: '500K', tpd: '20M', unlock: '$50', tier: 'tier_2' },
                  { name: 'Tier 3', rpm: '1,000', rpd: '100K', tpm: '2M', tpd: '100M', unlock: '$200', tier: 'tier_3' },
                  { name: 'Tier 4', rpm: '5,000', rpd: '500K', tpm: '10M', tpd: '500M', unlock: '$1,000', tier: 'tier_4' },
                  { name: 'Enterprise', rpm: '10,000', rpd: '1M', tpm: '50M', tpd: '1B', unlock: 'Contact', tier: 'enterprise' },
                ].map((row) => (
                  <tr
                    key={row.tier}
                    className="border-b last:border-0"
                    style={{
                      borderColor: 'var(--border-light)',
                      color: stats?.tier === row.tier ? 'var(--neon-cyan)' : 'var(--text-primary)',
                      backgroundColor: stats?.tier === row.tier ? 'color-mix(in srgb, var(--neon-cyan) 5%, transparent)' : 'transparent'
                    }}
                  >
                    <td className="py-2.5 pr-4 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        {stats?.tier === row.tier && (
                          <Zap className="w-3 h-3" style={{ color: 'var(--neon-cyan)' }} />
                        )}
                        {row.name}
                        {stats?.tier === row.tier && (
                          <Badge tone="cyan">Current</Badge>
                        )}
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums">{row.rpm}</td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums">{row.rpd}</td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums">{row.tpm}</td>
                    <td className="text-right py-2.5 px-3 font-mono tabular-nums">{row.tpd}</td>
                    <td className="text-right py-2.5 pl-3 font-mono tabular-nums">{row.unlock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
            <Lock className="w-3 h-3" style={{ color: 'var(--neon-green)' }} />
            <span>
              RPM = Requests/min | RPD = Requests/day | TPM = Tokens/min | TPD = Tokens/day
            </span>
          </div>
        </motion.div>
        </div>
      </div>
    </DashboardPageShell>
  );
}
