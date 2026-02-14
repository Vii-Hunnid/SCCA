'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  ExternalLink,
  Calendar,
  Eye,
  X,
  Printer,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

interface Invoice {
  id: string;
  invoiceNumber: string;
  description: string;
  totalCents: number;
  totalDollars: number;
  totalDisplay: string;
  status: 'PAID' | 'PENDING' | 'DRAFT' | 'OVERDUE' | 'VOID';
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  dueDate: string;
  createdAt: string;
  currency: string;
  billingReason: string | null;
  requestCount: number;
  totalTokens: number;
  totalBytes: number;
  polarOrderId: string | null;
  polarInvoiceUrl: string | null;
  hasInvoice: boolean;
}

interface InvoiceSummary {
  totalPaid: number;
  totalPending: number;
  invoiceCount: number;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PAID':
      return <CheckCircle2 size={14} className="text-neon-green" />;
    case 'PENDING':
    case 'DRAFT':
      return <Clock size={14} className="text-neon-yellow" />;
    case 'OVERDUE':
      return <AlertCircle size={14} className="text-neon-red" />;
    case 'VOID':
      return <RefreshCw size={14} className="text-terminal-dim" />;
    default:
      return <Clock size={14} className="text-terminal-dim" />;
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'PAID':
      return 'text-neon-green bg-neon-green/10';
    case 'PENDING':
    case 'DRAFT':
      return 'text-neon-yellow bg-neon-yellow/10';
    case 'OVERDUE':
      return 'text-neon-red bg-neon-red/10';
    case 'VOID':
      return 'text-terminal-dim bg-cyber-mid';
    default:
      return 'text-terminal-dim bg-cyber-mid';
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatPeriod = (start: string | null, end: string | null) => {
  if (!start || !end) return 'One-time';
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} — ${endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

// ═══════════════════════════════════════════════════════════════════════════
// Invoice Preview Modal
// ═══════════════════════════════════════════════════════════════════════════

function InvoicePreviewModal({
  invoice,
  onClose,
  onDownloadPolar,
  loadingPolar,
}: {
  invoice: Invoice;
  onClose: () => void;
  onDownloadPolar: (id: string, cachedUrl: string | null) => void;
  loadingPolar: boolean;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #333; }
            .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; letter-spacing: 0.2em; color: #00e5ff; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { margin: 0; font-size: 28px; color: #00e5ff; }
            .invoice-title p { margin: 5px 0 0; color: #666; }
            .company-info, .bill-to { margin-bottom: 30px; }
            .company-info h3, .bill-to h3 { margin: 0 0 10px; color: #666; font-size: 12px; text-transform: uppercase; }
            .company-info p, .bill-to p { margin: 5px 0; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; }
            .detail-item { text-align: center; }
            .detail-item .label { font-size: 12px; color: #666; margin-bottom: 5px; }
            .detail-item .value { font-weight: 600; }
            .line-items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .line-items th, .line-items td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .line-items th { background: #f9fafb; font-size: 12px; text-transform: uppercase; color: #666; }
            .line-items td.amount { text-align: right; }
            .totals { margin-left: auto; width: 300px; }
            .totals .row { display: flex; justify-content: space-between; padding: 8px 0; }
            .totals .row.total { border-top: 2px solid #333; font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 15px; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .status.paid { background: #d1fae5; color: #059669; }
            .status.pending { background: #fef3c7; color: #d97706; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div>
              <div class="logo">SCCA</div>
              <p style="color: #666; font-size: 14px;">Secure Cloud Cryptographic Architecture</p>
            </div>
            <div class="invoice-title">
              <h1>INVOICE</h1>
              <p>${invoice.invoiceNumber}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between;">
            <div class="company-info">
              <h3>From</h3>
              <p><strong>SCCA Connect</strong></p>
              <p>Secure Cloud Cryptographic Architecture</p>
              <p>Powered by Polar.sh</p>
            </div>
            <div class="bill-to">
              <h3>Bill To</h3>
              <p><strong>Customer</strong></p>
            </div>
          </div>

          <div class="invoice-details">
            <div class="detail-item">
              <div class="label">Invoice Date</div>
              <div class="value">${formatDate(invoice.createdAt)}</div>
            </div>
            <div class="detail-item">
              <div class="label">Due Date</div>
              <div class="value">${formatDate(invoice.dueDate)}</div>
            </div>
            <div class="detail-item">
              <div class="label">Period</div>
              <div class="value">${formatPeriod(invoice.periodStart, invoice.periodEnd)}</div>
            </div>
            <div class="detail-item">
              <div class="label">Status</div>
              <div class="value"><span class="status ${invoice.status.toLowerCase()}">${invoice.status}</span></div>
            </div>
          </div>

          <table class="line-items">
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${invoice.description}</td>
                <td class="amount">$${invoice.totalDollars.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div class="row total">
              <span>Total</span>
              <span>$${invoice.totalDollars.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for using SCCA Connect!</p>
            <p>Payments processed securely by Polar.sh</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-cyber-darker rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-cyber-light/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-light/10">
          <h2 className="text-sm font-semibold text-terminal-text">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            {invoice.hasInvoice && (
              <button
                onClick={() => onDownloadPolar(invoice.id, invoice.polarInvoiceUrl)}
                disabled={loadingPolar}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-colors border border-neon-cyan/30"
              >
                {loadingPolar ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Polar Invoice
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-neon-purple text-cyber-black rounded-lg hover:bg-neon-purple/90 transition-colors font-semibold"
            >
              <Printer size={14} />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-cyber-mid rounded-lg transition-colors text-terminal-dim hover:text-terminal-text"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Invoice Content (white background for print fidelity) */}
        <div ref={printRef} className="flex-1 overflow-auto p-8 bg-white text-gray-900">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-wider">SCCA</h1>
                <p className="text-sm text-gray-500">Secure Cloud Crypto</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-cyan-600">INVOICE</h2>
              <p className="text-gray-500 font-mono">{invoice.invoiceNumber}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">From</h3>
              <p className="font-semibold">SCCA Connect</p>
              <p className="text-gray-600 text-sm">Secure Cloud Cryptographic Architecture</p>
              <p className="text-gray-600 text-sm">Powered by Polar.sh</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Invoice Details</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">Date:</span> {formatDate(invoice.createdAt)}</p>
                <p><span className="text-gray-500">Due:</span> {formatDate(invoice.dueDate)}</p>
                <p><span className="text-gray-500">Period:</span> {formatPeriod(invoice.periodStart, invoice.periodEnd)}</p>
                <p>
                  <span className="text-gray-500">Status:</span>{' '}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      invoice.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-700'
                        : invoice.status === 'PENDING' || invoice.status === 'DRAFT'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 text-xs font-semibold text-gray-400 uppercase">Description</th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-400 uppercase">Requests</th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-400 uppercase">Tokens</th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-400 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4">{invoice.description}</td>
                  <td className="py-4 text-right font-mono text-sm">{invoice.requestCount.toLocaleString()}</td>
                  <td className="py-4 text-right font-mono text-sm">{formatNumber(invoice.totalTokens)}</td>
                  <td className="py-4 text-right font-mono">${invoice.totalDollars.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-gray-900">
                <span>Total</span>
                <span className="font-mono">${invoice.totalDollars.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p className="font-medium text-gray-700">Thank you for using SCCA Connect!</p>
            <p>Payments processed securely by Polar.sh</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Invoices Page
// ═══════════════════════════════════════════════════════════════════════════

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary>({
    totalPaid: 0,
    totalPending: 0,
    invoiceCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [loadingPolarInvoice, setLoadingPolarInvoice] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/scca/billing/invoices');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch invoices');
      setInvoices(data.invoices || []);
      setSummary(data.summary || { totalPaid: 0, totalPending: 0, invoiceCount: 0 });
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadPolar = async (invoiceId: string, cachedUrl: string | null) => {
    if (cachedUrl) {
      window.open(cachedUrl, '_blank');
      return;
    }

    setLoadingPolarInvoice(invoiceId);
    try {
      const res = await fetch(`/api/scca/billing/invoices/${invoiceId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.url) {
        window.open(json.url, '_blank');
        // Update local state so subsequent clicks use cache
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoiceId ? { ...inv, polarInvoiceUrl: json.url } : inv
          )
        );
        if (previewInvoice?.id === invoiceId) {
          setPreviewInvoice((prev) => prev ? { ...prev, polarInvoiceUrl: json.url } : prev);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Polar invoice');
    } finally {
      setLoadingPolarInvoice(null);
    }
  };

  // Year-to-date totals
  const currentYear = new Date().getFullYear();
  const ytdPaid = invoices
    .filter(
      (inv) =>
        inv.status === 'PAID' &&
        new Date(inv.createdAt).getFullYear() === currentYear
    )
    .reduce((sum, inv) => sum + inv.totalDollars, 0);

  // Next invoice estimate (30 days from most recent)
  const nextInvoiceDate =
    invoices.length > 0
      ? new Date(
          new Date(invoices[0].createdAt).getTime() + 30 * 24 * 60 * 60 * 1000
        )
      : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <FileText className="w-6 h-6 text-neon-cyan/30 animate-pulse" />
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
              href="/dashboard/billing"
              className="text-terminal-dim hover:text-neon-cyan transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-neon-cyan" />
              <span className="text-sm text-terminal-text font-semibold tracking-wide">
                Invoices
              </span>
            </div>
          </div>
          <button
            onClick={fetchInvoices}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-terminal-dim hover:text-neon-cyan border border-cyber-light/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card p-3 border-neon-red/30 flex items-center gap-2"
          >
            <AlertCircle size={16} className="text-neon-red" />
            <span className="text-xs text-neon-red">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs text-terminal-dim hover:text-terminal-text"
            >
              dismiss
            </button>
          </motion.div>
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-neon-green/10 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-neon-green" />
              </div>
              <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
                Total Paid (YTD)
              </span>
            </div>
            <p className="text-xl font-display text-terminal-text font-mono">
              ${ytdPaid.toFixed(2)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="cyber-card p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-neon-yellow/10 flex items-center justify-center">
                <Clock size={18} className="text-neon-yellow" />
              </div>
              <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
                Pending
              </span>
            </div>
            <p className="text-xl font-display text-terminal-text font-mono">
              ${summary.totalPending.toFixed(2)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="cyber-card p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                <Calendar size={18} className="text-neon-purple" />
              </div>
              <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
                Next Invoice
              </span>
            </div>
            <p className="text-lg font-display text-terminal-text">
              {nextInvoiceDate
                ? nextInvoiceDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A'}
            </p>
          </motion.div>
        </div>

        {/* Invoices List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm text-terminal-text font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-terminal-dim" />
              Invoice History
            </h2>
            <span className="text-[10px] text-terminal-dim">
              {summary.invoiceCount} invoice{summary.invoiceCount !== 1 ? 's' : ''}
            </span>
          </div>

          {invoices.length > 0 ? (
            <div className="space-y-2">
              {invoices.map((invoice, idx) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="cyber-card p-4 hover:border-neon-cyan/30 transition-all group cursor-pointer"
                  onClick={() =>
                    setSelectedInvoice(
                      selectedInvoice?.id === invoice.id ? null : invoice
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                        <FileText size={18} className="text-neon-cyan" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-terminal-text font-mono">
                            {invoice.invoiceNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-1 ${getStatusClass(
                              invoice.status
                            )}`}
                          >
                            {getStatusIcon(invoice.status)}
                            {invoice.status.toLowerCase()}
                          </span>
                          {invoice.billingReason && (
                            <span className="text-[9px] text-terminal-dim bg-cyber-mid px-1.5 py-0.5 rounded">
                              {invoice.billingReason === 'subscription_cycle'
                                ? 'Renewal'
                                : invoice.billingReason === 'subscription_create'
                                ? 'New Sub'
                                : invoice.billingReason === 'subscription_update'
                                ? 'Plan Change'
                                : invoice.billingReason === 'purchase'
                                ? 'One-time'
                                : invoice.billingReason}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-terminal-dim mt-0.5">
                          {invoice.description} &middot;{' '}
                          {formatPeriod(invoice.periodStart, invoice.periodEnd)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-terminal-text font-mono">
                          {invoice.totalDisplay}
                        </p>
                        <p className="text-[10px] text-terminal-dim">
                          {formatDate(invoice.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewInvoice(invoice);
                        }}
                        className="p-1.5 text-terminal-dim hover:text-neon-cyan hover:bg-neon-cyan/5 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Preview Invoice"
                      >
                        <Eye size={16} />
                      </button>

                      {invoice.hasInvoice && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPolar(invoice.id, invoice.polarInvoiceUrl);
                          }}
                          disabled={loadingPolarInvoice === invoice.id}
                          className="p-1.5 text-terminal-dim hover:text-neon-green hover:bg-neon-green/5 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Download Polar Invoice"
                        >
                          {loadingPolarInvoice === invoice.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Download size={16} />
                          )}
                        </button>
                      )}

                      <ChevronRight
                        size={16}
                        className={`text-terminal-dim transition-transform ${
                          selectedInvoice?.id === invoice.id ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {selectedInvoice?.id === invoice.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-cyber-light/10"
                      >
                        <div className="grid md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className="text-terminal-dim mb-1">Total</p>
                            <p className="font-mono text-terminal-text">
                              {invoice.totalDisplay}
                            </p>
                          </div>
                          <div>
                            <p className="text-terminal-dim mb-1">Requests</p>
                            <p className="font-mono text-terminal-text">
                              {invoice.requestCount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-terminal-dim mb-1">Tokens</p>
                            <p className="font-mono text-terminal-text">
                              {formatNumber(invoice.totalTokens)}
                            </p>
                          </div>
                          <div>
                            <p className="text-terminal-dim mb-1">Due Date</p>
                            <p className="text-terminal-text">{formatDate(invoice.dueDate)}</p>
                          </div>
                          <div>
                            <p className="text-terminal-dim mb-1">Paid At</p>
                            <p className="text-terminal-text">{formatDate(invoice.paidAt)}</p>
                          </div>
                          <div>
                            <p className="text-terminal-dim mb-1">Currency</p>
                            <p className="font-mono text-terminal-text uppercase">
                              {invoice.currency}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewInvoice(invoice);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-colors border border-neon-cyan/20"
                          >
                            <Eye size={14} />
                            Preview
                          </button>
                          {invoice.hasInvoice && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPolar(invoice.id, invoice.polarInvoiceUrl);
                              }}
                              disabled={loadingPolarInvoice === invoice.id}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs text-neon-green hover:bg-neon-green/10 rounded-lg transition-colors border border-neon-green/20"
                            >
                              {loadingPolarInvoice === invoice.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                              Polar Invoice
                              <ExternalLink size={12} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-cyber-mid flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-terminal-dim/40" />
              </div>
              <h3 className="text-sm font-semibold text-terminal-text mb-2">No invoices yet</h3>
              <p className="text-xs text-terminal-dim mb-4 max-w-sm mx-auto">
                Your billing history will appear here once you subscribe to a paid
                plan. Invoices are created automatically when payments are processed through Polar.
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-neon-purple text-cyber-black rounded-lg hover:bg-neon-purple/90 transition-colors font-semibold"
              >
                View Plans
                <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Polar Integration Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="cyber-card p-4 border-neon-cyan/10"
        >
          <div className="flex items-center gap-2 text-[10px] text-terminal-dim">
            <ExternalLink className="w-3 h-3" />
            <span>
              Payments processed by{' '}
              <a
                href="https://polar.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-cyan hover:underline"
              >
                Polar.sh
              </a>
              . Official Polar invoices can be downloaded for each paid order.
            </span>
          </div>
        </motion.div>
      </div>

      {/* Invoice Preview Modal */}
      <AnimatePresence>
        {previewInvoice && (
          <InvoicePreviewModal
            invoice={previewInvoice}
            onClose={() => setPreviewInvoice(null)}
            onDownloadPolar={handleDownloadPolar}
            loadingPolar={loadingPolarInvoice === previewInvoice.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
