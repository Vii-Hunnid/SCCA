'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  ArrowLeft,
  Zap,
  Check,
  AlertTriangle,
  TrendingUp,
  FileText,
  Settings,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface BillingData {
  account: {
    id: string;
    tier: string;
    tierDisplay: string;
    totalSpendMicro: number;
    monthlySpendMicro: number;
    monthlyBudgetMicro: number;
    totalSpendDisplay: string;
    monthlySpendDisplay: string;
    monthlyBudgetDisplay: string;
    billingCycleStart: string;
    autoUpgrade: boolean;
    hasPaymentMethod: boolean;
  };
  upgrade: {
    nextTier: string;
    nextTierDisplay: string;
    spendRequired: string;
    spendRequiredMicro: number;
    currentSpendMicro: number;
    progressPercent: number;
  } | null;
  tiers: Array<{
    name: string;
    displayName: string;
    rpm: number;
    rpd: number;
    tpm: number;
    tpd: number;
    maxApiKeys: number;
    maxBytesPerRequest: number;
    costPerMillionTokens: number;
    costPerRequest: number;
    upgradeThresholdDisplay: string;
    isCurrent: boolean;
  }>;
  invoices: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    totalDisplay: string;
    totalMicro: number;
    requestCount: number;
    totalTokens: number;
    totalBytes: number;
    status: string;
  }>;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatCostPer(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(4)}`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-terminal-dim',
  pending: 'text-neon-yellow',
  paid: 'text-neon-green',
  overdue: 'text-neon-red',
  void: 'text-terminal-dim',
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [autoUpgrade, setAutoUpgrade] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch('/api/scca/billing');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      setAutoUpgrade(json.account.autoUpgrade);
      if (json.account.monthlyBudgetMicro > 0) {
        setBudgetInput(String(json.account.monthlyBudgetMicro / 1_000_000));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/scca/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyBudgetMicro: budgetInput ? parseFloat(budgetInput) * 1_000_000 : 0,
          autoUpgrade,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      await fetchBilling();
      setShowSettings(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <CreditCard className="w-6 h-6 text-neon-purple/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black">
      {/* Header */}
      <header className="border-b border-cyber-light/10 bg-cyber-darker/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/platform"
              className="text-terminal-dim hover:text-neon-cyan transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-neon-purple" />
              <span className="text-sm text-terminal-text font-semibold tracking-wide">
                Billing
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-xs text-terminal-dim hover:text-neon-cyan transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 cyber-card p-3 border-neon-red/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-neon-red" />
            <span className="text-xs text-neon-red">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-xs text-terminal-dim hover:text-terminal-text"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Current Tier + Spend */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="cyber-card p-5 border-neon-purple/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-neon-purple" />
                <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
                  Current Tier
                </span>
              </div>
              <div className="text-xl font-display text-neon-purple">
                {data.account.tierDisplay}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="cyber-card p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-neon-green" />
                <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
                  Monthly Spend
                </span>
              </div>
              <div className="text-xl font-display text-terminal-text">
                {data.account.monthlySpendDisplay}
              </div>
              <div className="text-[10px] text-terminal-dim mt-1">
                Budget: {data.account.monthlyBudgetDisplay}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="cyber-card p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-neon-cyan" />
                <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
                  Lifetime Spend
                </span>
              </div>
              <div className="text-xl font-display text-terminal-text">
                {data.account.totalSpendDisplay}
              </div>
              <div className="text-[10px] text-terminal-dim mt-1">
                Since{' '}
                {new Date(data.account.billingCycleStart).toLocaleDateString()}
              </div>
            </motion.div>
          </div>
        )}

        {/* Upgrade Progress */}
        {data?.upgrade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6 cyber-card p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-terminal-text font-semibold">
                Progress to {data.upgrade.nextTierDisplay}
              </span>
              <span className="text-[10px] text-terminal-dim">
                {data.account.totalSpendDisplay} / {data.upgrade.spendRequired}
              </span>
            </div>
            <div className="h-3 bg-cyber-darker rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.upgrade.progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan"
              />
            </div>
            <p className="text-[10px] text-terminal-dim mt-2">
              Spend {data.upgrade.spendRequired} total to auto-upgrade. Higher
              tiers unlock increased rate limits (RPM, RPD, TPM, TPD).
            </p>
          </motion.div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 cyber-card p-5"
          >
            <h3 className="text-sm text-terminal-text font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-neon-cyan" />
              Billing Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-terminal-dim block mb-1.5">
                  Monthly Budget Cap ($) — 0 or empty = no limit
                </label>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="e.g. 50"
                  className="cyber-input"
                  min={0}
                  step={1}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAutoUpgrade(!autoUpgrade)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    autoUpgrade ? 'bg-neon-cyan/30' : 'bg-cyber-mid'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform absolute top-0.5 ${
                      autoUpgrade
                        ? 'translate-x-5 bg-neon-cyan'
                        : 'translate-x-0.5 bg-terminal-dim'
                    }`}
                  />
                </button>
                <span className="text-xs text-terminal-dim">
                  Auto-upgrade tier when spend threshold is met
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="cyber-btn-solid text-xs py-2 px-4"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-terminal-dim hover:text-terminal-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tier Comparison */}
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 cyber-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-neon-purple" />
              <span className="text-sm text-terminal-text font-semibold">
                Tier Comparison
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-terminal-dim border-b border-cyber-light/10">
                    <th className="text-left py-2 pr-3">Tier</th>
                    <th className="text-right py-2 px-2">RPM</th>
                    <th className="text-right py-2 px-2">RPD</th>
                    <th className="text-right py-2 px-2">TPM</th>
                    <th className="text-right py-2 px-2">TPD</th>
                    <th className="text-right py-2 px-2">$/1M Tokens</th>
                    <th className="text-right py-2 px-2">$/Request</th>
                    <th className="text-right py-2 pl-2">Unlock</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tiers.map((tier) => (
                    <tr
                      key={tier.name}
                      className={`border-b border-cyber-light/5 ${
                        tier.isCurrent
                          ? 'text-neon-cyan bg-neon-cyan/5'
                          : 'text-terminal-text'
                      }`}
                    >
                      <td className="py-2 pr-3 font-semibold flex items-center gap-1">
                        {tier.isCurrent && (
                          <Check className="w-2.5 h-2.5 text-neon-green" />
                        )}
                        {tier.displayName}
                      </td>
                      <td className="text-right py-2 px-2">
                        {formatNumber(tier.rpm)}
                      </td>
                      <td className="text-right py-2 px-2">
                        {formatNumber(tier.rpd)}
                      </td>
                      <td className="text-right py-2 px-2">
                        {formatNumber(tier.tpm)}
                      </td>
                      <td className="text-right py-2 px-2">
                        {formatNumber(tier.tpd)}
                      </td>
                      <td className="text-right py-2 px-2">
                        {tier.costPerMillionTokens === 0
                          ? 'Free'
                          : formatCostPer(tier.costPerMillionTokens)}
                      </td>
                      <td className="text-right py-2 px-2">
                        {tier.costPerRequest === 0
                          ? 'Free'
                          : formatCostPer(tier.costPerRequest)}
                      </td>
                      <td className="text-right py-2 pl-2">
                        {tier.upgradeThresholdDisplay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Invoices */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="cyber-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-terminal-dim" />
            <span className="text-sm text-terminal-text font-semibold">
              Invoice History
            </span>
          </div>
          {data?.invoices.length ? (
            <div className="space-y-2">
              {data.invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded bg-cyber-darker/50 border border-cyber-light/5"
                >
                  <div>
                    <div className="text-xs text-terminal-text">
                      {new Date(inv.periodStart).toLocaleDateString()} —{' '}
                      {new Date(inv.periodEnd).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-terminal-dim mt-0.5">
                      {inv.requestCount.toLocaleString()} requests |{' '}
                      {formatNumber(Number(inv.totalTokens))} tokens
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-terminal-text">
                      {inv.totalDisplay}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider ${
                        STATUS_COLORS[inv.status] || 'text-terminal-dim'
                      }`}
                    >
                      {inv.status}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-terminal-dim" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="w-6 h-6 text-terminal-dim/30 mx-auto mb-2" />
              <p className="text-xs text-terminal-dim">
                No invoices yet. Invoices are generated at the end of each billing
                cycle.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
