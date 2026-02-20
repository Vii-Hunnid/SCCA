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
  Download,
  Eye,
  ExternalLink,
  Loader2,
  ArrowUpRight,
  Rocket,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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
    subscriptionStatus: string | null;
    polarCustomerId: string | null;
    polarSubscriptionId: string | null;
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
    polarOrderId: string | null;
    polarInvoiceUrl: string | null;
    billingReason: string | null;
    currency: string;
    hasInvoice: boolean;
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
  draft: 'var(--text-secondary)',
  pending: 'var(--neon-yellow)',
  paid: 'var(--neon-green)',
  overdue: 'var(--neon-red)',
  void: 'var(--text-secondary)',
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [autoUpgrade, setAutoUpgrade] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Detect ?checkout=success in URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') === 'success') {
        setCheckoutSuccess(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleUpgrade = async (tierName?: string) => {
    setCheckingOut(true);
    setError('');
    try {
      const res = await fetch('/api/scca/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tierName ? { tier: tierName } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout');
    } finally {
      setCheckingOut(false);
    }
  };

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

  const handleViewInvoice = async (invoiceId: string, cachedUrl: string | null) => {
    if (cachedUrl) {
      window.open(cachedUrl, '_blank');
      return;
    }

    setLoadingInvoice(invoiceId);
    try {
      const res = await fetch(`/api/scca/billing/invoices/${invoiceId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.url) {
        window.open(json.url, '_blank');
        if (data) {
          setData({
            ...data,
            invoices: data.invoices.map((inv) =>
              inv.id === invoiceId ? { ...inv, polarInvoiceUrl: json.url } : inv
            ),
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoadingInvoice(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <CreditCard className="w-6 h-6 animate-pulse" style={{ color: 'var(--neon-purple)', opacity: 0.3 }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
                href="/dashboard/platform"
                className="text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors"
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
              <CreditCard className="w-4 h-4" style={{ color: 'var(--neon-purple)' }} />
              <span className="text-sm text-[var(--text-primary)] font-semibold tracking-wide">
                Billing
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 cyber-card p-3 flex items-center gap-2" style={{ borderColor: 'var(--neon-red)', borderWidth: '1px' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--neon-red)' }} />
            <span className="text-xs" style={{ color: 'var(--neon-red)' }}>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Checkout Success Banner */}
        {checkoutSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 cyber-card p-4"
            style={{ borderColor: 'var(--neon-green)', borderWidth: '1px', backgroundColor: 'color-mix(in srgb, var(--neon-green) 5%, transparent)' }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--neon-green)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--neon-green)' }}>
                Payment successful! Your tier will be upgraded shortly once the payment is confirmed.
              </span>
              <button
                onClick={() => setCheckoutSuccess(false)}
                className="ml-auto text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                dismiss
              </button>
            </div>
          </motion.div>
        )}

        {/* Upgrade CTA — shown when on free tier */}
        {data && data.account.tier === 'free' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 cyber-card p-6"
            style={{ borderColor: 'var(--neon-purple)', borderWidth: '1px', background: 'linear-gradient(to right, color-mix(in srgb, var(--neon-purple) 5%, transparent), color-mix(in srgb, var(--neon-cyan) 5%, transparent))' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="w-5 h-5" style={{ color: 'var(--neon-purple)' }} />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Upgrade Your Plan
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] max-w-md">
                  You&apos;re on the free tier (10 RPM, 200 RPD). Upgrade to unlock higher
                  rate limits, faster throughput, and priority support.
                </p>
                <div className="flex gap-2 mt-3 text-[10px] text-[var(--text-secondary)]">
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>60+ RPM</span>
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>5,000+ RPD</span>
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>100K+ TPM</span>
                </div>
              </div>
              <button
                onClick={() => handleUpgrade('tier_1')}
                disabled={checkingOut}
                className="flex items-center gap-2 px-5 py-2.5 text-cyber-black text-xs font-semibold rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, var(--neon-purple), var(--neon-cyan))' }}
              >
                {checkingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                )}
                {checkingOut ? 'Redirecting...' : 'Upgrade Now'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Current Tier + Spend */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="cyber-card p-5"
              style={{ borderColor: 'var(--neon-purple)', borderWidth: '1px' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4" style={{ color: 'var(--neon-purple)' }} />
                <span className="text-[10px] text-[var(--text-secondary)] tracking-wider uppercase">
                  Current Tier
                </span>
              </div>
              <div className="text-xl font-display" style={{ color: 'var(--neon-purple)' }}>
                {data.account.tierDisplay}
              </div>
              {data.account.subscriptionStatus && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: data.account.subscriptionStatus === 'active'
                        ? 'var(--neon-green)'
                        : data.account.subscriptionStatus === 'canceled'
                        ? 'var(--neon-yellow)'
                        : 'var(--text-secondary)'
                    }}
                  />
                  <span className="text-[10px] text-[var(--text-secondary)] capitalize">
                    {data.account.subscriptionStatus === 'active'
                      ? 'Subscription Active'
                      : data.account.subscriptionStatus === 'canceled'
                      ? 'Cancels at Period End'
                      : data.account.subscriptionStatus}
                  </span>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="cyber-card p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--neon-green)' }} />
                <span className="text-[10px] text-[var(--text-secondary)] tracking-wider uppercase">
                  Monthly Spend
                </span>
              </div>
              <div className="text-xl font-display text-[var(--text-primary)]">
                {data.account.monthlySpendDisplay}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-1">
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
                <CreditCard className="w-4 h-4" style={{ color: 'var(--neon-cyan)' }} />
                <span className="text-[10px] text-[var(--text-secondary)] tracking-wider uppercase">
                  Lifetime Spend
                </span>
              </div>
              <div className="text-xl font-display text-[var(--text-primary)]">
                {data.account.totalSpendDisplay}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-1">
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
              <span className="text-xs text-[var(--text-primary)] font-semibold">
                Progress to {data.upgrade.nextTierDisplay}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                {data.account.totalSpendDisplay} / {data.upgrade.spendRequired}
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.upgrade.progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(to right, var(--neon-purple), var(--neon-cyan))' }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-2">
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
            <h3 className="text-sm text-[var(--text-primary)] font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" style={{ color: 'var(--neon-cyan)' }} />
              Billing Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1.5">
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
                  className="w-10 h-5 rounded-full transition-colors relative"
                  style={{ backgroundColor: autoUpgrade ? 'color-mix(in srgb, var(--neon-cyan) 30%, var(--bg-tertiary))' : 'var(--bg-tertiary)' }}
                >
                  <div
                    className="w-4 h-4 rounded-full transition-transform absolute top-0.5"
                    style={{
                      transform: autoUpgrade ? 'translateX(20px)' : 'translateX(2px)',
                      backgroundColor: autoUpgrade ? 'var(--neon-cyan)' : 'var(--text-secondary)'
                    }}
                  />
                </button>
                <span className="text-xs text-[var(--text-secondary)]">
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
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
              <Zap className="w-4 h-4" style={{ color: 'var(--neon-purple)' }} />
              <span className="text-sm text-[var(--text-primary)] font-semibold">
                Tier Comparison
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-[var(--text-secondary)] border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="text-left py-2 pr-3">Tier</th>
                    <th className="text-right py-2 px-2">RPM</th>
                    <th className="text-right py-2 px-2">RPD</th>
                    <th className="text-right py-2 px-2">TPM</th>
                    <th className="text-right py-2 px-2">TPD</th>
                    <th className="text-right py-2 px-2">$/1M Tokens</th>
                    <th className="text-right py-2 px-2">$/Request</th>
                    <th className="text-right py-2 px-2">Unlock</th>
                    <th className="text-right py-2 pl-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.tiers.map((tier, idx) => {
                    const currentIdx = data.tiers.findIndex((t) => t.isCurrent);
                    const isUpgradeable = !tier.isCurrent && idx > currentIdx;
                    return (
                      <tr
                        key={tier.name}
                        className="border-b"
                        style={{
                          borderColor: 'var(--border-color)',
                          color: tier.isCurrent ? 'var(--neon-cyan)' : 'var(--text-primary)',
                          backgroundColor: tier.isCurrent ? 'color-mix(in srgb, var(--neon-cyan) 5%, transparent)' : 'transparent'
                        }}
                      >
                        <td className="py-2 pr-3 font-semibold flex items-center gap-1">
                          {tier.isCurrent && (
                            <Check className="w-2.5 h-2.5" style={{ color: 'var(--neon-green)' }} />
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
                        <td className="text-right py-2 px-2">
                          {tier.upgradeThresholdDisplay}
                        </td>
                        <td className="text-right py-2 pl-2">
                          {tier.isCurrent ? (
                            <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: 'var(--neon-green)', backgroundColor: 'color-mix(in srgb, var(--neon-green) 10%, transparent)' }}>
                              Current
                            </span>
                          ) : isUpgradeable ? (
                            <button
                              onClick={() => handleUpgrade(tier.name)}
                              disabled={checkingOut}
                              className="text-[9px] px-2 py-0.5 rounded transition-colors hover:opacity-80"
                              style={{ color: 'var(--neon-purple)', backgroundColor: 'color-mix(in srgb, var(--neon-purple) 10%, transparent)' }}
                            >
                              Upgrade
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-sm text-[var(--text-primary)] font-semibold">
                Invoice History
              </span>
            </div>
            <Link
              href="/dashboard/invoices"
              className="text-[10px] hover:opacity-80 transition-colors flex items-center gap-1"
              style={{ color: 'var(--neon-cyan)' }}
            >
              View All
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {data?.invoices.length ? (
            <div className="space-y-2">
              {data.invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded border"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-primary)] font-semibold">
                          {new Date(inv.periodStart).toLocaleDateString()} —{' '}
                          {new Date(inv.periodEnd).toLocaleDateString()}
                        </span>
                        {inv.billingReason && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
                            {inv.billingReason === 'subscription_cycle'
                              ? 'Renewal'
                              : inv.billingReason === 'subscription_create'
                              ? 'New Subscription'
                              : inv.billingReason === 'subscription_update'
                              ? 'Plan Change'
                              : inv.billingReason === 'purchase'
                              ? 'One-time'
                              : inv.billingReason}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                        {inv.requestCount.toLocaleString()} requests |{' '}
                        {formatNumber(Number(inv.totalTokens))} tokens |{' '}
                        {inv.currency.toUpperCase()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {inv.totalDisplay}
                      </span>
                      <span
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: STATUS_COLORS[inv.status] || 'var(--text-secondary)' }}
                      >
                        {inv.status}
                      </span>

                      {/* Invoice Actions */}
                      {inv.hasInvoice && (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() =>
                              handleViewInvoice(inv.id, inv.polarInvoiceUrl)
                            }
                            disabled={loadingInvoice === inv.id}
                            className="p-1.5 rounded transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                            title="Preview invoice"
                          >
                            {loadingInvoice === inv.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {inv.polarInvoiceUrl && (
                            <a
                              href={inv.polarInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-green)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                              title="Download invoice"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
              <p className="text-xs text-[var(--text-secondary)]">
                No invoices yet. Invoices are created when payments are processed
                through Polar.
              </p>
            </div>
          )}
        </motion.div>

        {/* Polar Integration Info */}
        {data?.account.hasPaymentMethod && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 cyber-card p-4"
            style={{ borderColor: 'var(--neon-cyan)', borderWidth: '1px' }}
          >
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
              <ExternalLink className="w-3 h-3" />
              <span>
                Payments processed by{' '}
                <a
                  href="https://polar.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--neon-cyan)' }}
                  className="hover:underline"
                >
                  Polar.sh
                </a>
                . Manage your subscription and payment methods on your Polar
                customer portal.
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
