'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useTheme } from '@/components/providers';

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface NewKeyResponse {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  expiresAt: string | null;
  createdAt: string;
  warning: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [keyName, setKeyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const { theme } = useTheme();

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/scca/keys');
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/scca/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName.trim(),
          expiresInDays: expiresInDays || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create key');
        return;
      }

      setNewKey(data);
      setShowCreateForm(false);
      setKeyName('');
      setExpiresInDays('');
      fetchKeys();
    } catch {
      setError('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      const res = await fetch(`/api/scca/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to revoke key');
      }
    } catch {
      setError('Failed to revoke key');
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
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
              <Key className="w-4 h-4" style={{ color: 'var(--neon-cyan)' }} />
              <span className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
                API Keys
              </span>
            </div>
          </div>
          <Link
            href="/docs#vault"
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Vault API Docs
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Intro */}
        <div className="mb-8">
          <h1 className="text-lg font-display tracking-wide mb-2 text-[var(--text-primary)]">
            <span style={{ color: 'var(--neon-cyan)' }}>#</span> API Keys
          </h1>
          <p className="text-xs leading-relaxed max-w-2xl text-[var(--text-secondary)]">
            Generate API keys to use SCCA&apos;s Vault API from your own applications.
            Authenticate with{' '}
            <code className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)]" style={{ color: 'var(--neon-cyan)' }}>
              Authorization: Bearer scca_k_...
            </code>{' '}
            to encrypt, decrypt, and verify data programmatically.
          </p>
        </div>

        {/* Error */}
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

        {/* New key display (shown once after creation) */}
        <AnimatePresence>
          {newKey && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 cyber-card p-5"
              style={{ borderColor: 'var(--neon-yellow)', borderWidth: '1px' }}
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--neon-yellow)' }} />
                <div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--neon-yellow)' }}>
                    Save your API key now
                  </span>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    This key will not be shown again. Store it securely.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded p-3 border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                <code className="flex-1 text-sm break-all font-mono" style={{ color: 'var(--neon-green)' }}>
                  {newKey.key}
                </code>
                <button
                  onClick={() => handleCopy(newKey.key)}
                  className="p-2 rounded transition-colors flex-shrink-0"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  {copied ? (
                    <Check className="w-4 h-4" style={{ color: 'var(--neon-green)' }} />
                  ) : (
                    <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-secondary)]">
                  Key: {newKey.name}
                </span>
                <button
                  onClick={() => setNewKey(null)}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  I&apos;ve saved it
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick usage example */}
        <div className="mb-6 cyber-card p-4">
          <span className="text-[10px] tracking-wider uppercase text-[var(--text-secondary)]">
            Quick usage
          </span>
          <div className="mt-2 rounded p-3 border overflow-x-auto" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
            <code className="text-xs whitespace-pre text-[var(--text-primary)]">{`curl -X POST https://your-domain.com/api/scca/vault/encrypt \\
  -H "Authorization: Bearer scca_k_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"data": "encrypt this", "context": "my-project"}'`}</code>
          </div>
        </div>

        {/* Create new key */}
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="cyber-btn-solid text-xs py-2.5 px-5 mb-6 flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate New Key
          </button>
        ) : (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleCreate}
            className="mb-6 cyber-card p-5"
          >
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
              <Plus className="w-4 h-4" style={{ color: 'var(--neon-cyan)' }} />
              Generate New API Key
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                  Key Name *
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Production Backend, Dev Testing"
                  className="cyber-input"
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1.5">
                  Expires In (days) — optional
                </label>
                <input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) =>
                    setExpiresInDays(e.target.value ? parseInt(e.target.value) : '')
                  }
                  placeholder="Leave empty for no expiry"
                  className="cyber-input"
                  min={1}
                  max={365}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating || !keyName.trim()}
                  className="cyber-btn-solid text-xs py-2 px-4"
                >
                  {creating ? 'Generating...' : 'Generate Key'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setKeyName('');
                    setExpiresInDays('');
                  }}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}

        {/* Keys list */}
        <div>
          <h3 className="text-xs text-[var(--text-secondary)] tracking-wider uppercase mb-3">
            Active Keys ({keys.length}/10)
          </h3>

          {loading ? (
            <div className="cyber-card p-8 text-center">
              <Shield className="w-6 h-6 mx-auto animate-pulse mb-2" style={{ color: 'var(--neon-cyan)', opacity: 0.3 }} />
              <span className="text-xs text-[var(--text-secondary)]">Loading keys...</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="cyber-card p-8 text-center">
              <Key className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
              <span className="text-xs text-[var(--text-secondary)]">
                No API keys yet. Generate one to get started.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <motion.div
                  key={key.id}
                  layout
                  className="cyber-card p-4 flex items-center gap-4"
                >
                  <Key className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--neon-cyan)' }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold truncate text-[var(--text-primary)]">
                        {key.name}
                      </span>
                      <code className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                        {key.keyPrefix}
                      </code>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
                      <span>
                        Created{' '}
                        {formatDistanceToNow(new Date(key.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {key.lastUsedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Last used{' '}
                          {formatDistanceToNow(new Date(key.lastUsedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                      {key.expiresAt && (
                        <span
                          className={
                            new Date(key.expiresAt) < new Date()
                              ? ''
                              : ''
                          }
                          style={{ color: new Date(key.expiresAt) < new Date() ? 'var(--neon-red)' : 'var(--neon-yellow)' }}
                        >
                          {new Date(key.expiresAt) < new Date()
                            ? 'Expired'
                            : `Expires ${formatDistanceToNow(new Date(key.expiresAt), { addSuffix: true })}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevoke(key.id)}
                    disabled={revoking === key.id}
                    className="p-2 rounded transition-colors flex-shrink-0"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-red)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    title="Revoke key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
