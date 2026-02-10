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
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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
    <div className="min-h-screen bg-cyber-black">
      {/* Header */}
      <header className="border-b border-cyber-light/10 bg-cyber-darker/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-terminal-dim hover:text-neon-cyan transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <Image
                src="/logo.jpg"
                alt="SCCA logo"
                width={100}
                height={100}
                priority
                className="object-contain"
              />            
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-sm text-terminal-text font-semibold tracking-wide">
                Platform
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-dot-active" />
            <span className="text-xs text-terminal-dim">
              {stats?.tierDisplay || '...'}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-xl font-display text-terminal-text tracking-wide mb-2">
            <span className="text-neon-cyan">&gt;</span> API Platform Console
          </h1>
          <p className="text-xs text-terminal-dim leading-relaxed max-w-2xl">
            Monitor rate limits, manage API keys, track consumption, and control
            billing for your SCCA Vault API usage.
          </p>
        </div>

        {/* Live Rate Limits Bar */}
        {!loading && stats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 cyber-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
                Live Rate Limits
              </span>
              <span className="ml-auto text-[10px] text-terminal-dim">
                Tier: <span className="text-neon-cyan">{stats.tierDisplay}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[10px] text-terminal-dim mb-1">
                  <span>RPM (Requests/min)</span>
                  <span>
                    {stats.rpm.used}/{stats.rpm.limit}
                  </span>
                </div>
                <div className="h-2 bg-cyber-darker rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.rpm.percent}%` }}
                    className={`h-full rounded-full ${
                      stats.rpm.percent > 80
                        ? 'bg-neon-red'
                        : stats.rpm.percent > 50
                        ? 'bg-neon-yellow'
                        : 'bg-neon-cyan'
                    }`}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-terminal-dim mb-1">
                  <span>RPD (Requests/day)</span>
                  <span>
                    {stats.rpd.used}/{stats.rpd.limit}
                  </span>
                </div>
                <div className="h-2 bg-cyber-darker rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.rpd.percent}%` }}
                    className={`h-full rounded-full ${
                      stats.rpd.percent > 80
                        ? 'bg-neon-red'
                        : stats.rpd.percent > 50
                        ? 'bg-neon-yellow'
                        : 'bg-neon-green'
                    }`}
                  />
                </div>
              </div>
            </div>
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
                <div className="cyber-card p-5 h-full hover:border-neon-cyan/30 transition-colors group cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <card.icon className={`w-5 h-5 text-${card.color}`} />
                    <ArrowRight className="w-3.5 h-3.5 text-terminal-dim group-hover:text-neon-cyan transition-colors" />
                  </div>
                  <h3 className="text-sm text-terminal-text font-semibold mb-1">
                    {card.title}
                  </h3>
                  <p className="text-[10px] text-terminal-dim leading-relaxed mb-3">
                    {card.description}
                  </p>
                  <div className="text-xs text-neon-cyan">{card.stat}</div>
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
            <TrendingUp className="w-4 h-4 text-neon-purple" />
            <span className="text-sm text-terminal-text font-semibold">
              Rate Limit Tiers
            </span>
          </div>
          <p className="text-[10px] text-terminal-dim mb-4 leading-relaxed">
            Higher tiers unlock increased rate limits. Tiers upgrade automatically
            based on cumulative spend, similar to OpenAI and Anthropic usage tiers.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-terminal-dim border-b border-cyber-light/10">
                  <th className="text-left py-2 pr-4">Tier</th>
                  <th className="text-right py-2 px-3">RPM</th>
                  <th className="text-right py-2 px-3">RPD</th>
                  <th className="text-right py-2 px-3">TPM</th>
                  <th className="text-right py-2 px-3">TPD</th>
                  <th className="text-right py-2 pl-3">Unlock At</th>
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
                    className={`border-b border-cyber-light/5 ${
                      stats?.tier === row.tier
                        ? 'text-neon-cyan bg-neon-cyan/5'
                        : 'text-terminal-text'
                    }`}
                  >
                    <td className="py-2 pr-4 font-semibold flex items-center gap-1.5">
                      {stats?.tier === row.tier && (
                        <Zap className="w-2.5 h-2.5 text-neon-cyan" />
                      )}
                      {row.name}
                    </td>
                    <td className="text-right py-2 px-3">{row.rpm}</td>
                    <td className="text-right py-2 px-3">{row.rpd}</td>
                    <td className="text-right py-2 px-3">{row.tpm}</td>
                    <td className="text-right py-2 px-3">{row.tpd}</td>
                    <td className="text-right py-2 pl-3">{row.unlock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-terminal-dim">
            <Lock className="w-3 h-3 text-neon-green" />
            <span>
              RPM = Requests/min | RPD = Requests/day | TPM = Tokens/min | TPD = Tokens/day
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
