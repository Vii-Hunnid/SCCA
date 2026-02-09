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
    <div className="min-h-screen bg-cyber-black">
      {/* Header */}
      <header className="border-b border-cyber-light/10 bg-cyber-darker/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-terminal-dim hover:text-neon-cyan transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-neon-cyan" />
              <span className="text-sm text-terminal-text font-semibold tracking-wide">
                API Keys
              </span>
            </div>
          </div>
          <Link
            href="/docs#vault"
            className="flex items-center gap-1.5 text-xs text-terminal-dim hover:text-neon-cyan transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Vault API Docs
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Intro */}
        <div className="mb-8">
          <h1 className="text-lg font-display text-terminal-text tracking-wide mb-2">
            <span className="text-neon-cyan">#</span> API Keys
          </h1>
          <p className="text-xs text-terminal-dim leading-relaxed max-w-2xl">
            Generate API keys to use SCCA&apos;s Vault API from your own applications.
            Authenticate with{' '}
            <code className="text-neon-cyan bg-cyber-darker px-1.5 py-0.5 rounded">
              Authorization: Bearer scca_k_...
            </code>{' '}
            to encrypt, decrypt, and verify data programmatically.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 cyber-card p-3 border-neon-red/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-neon-red flex-shrink-0" />
            <span className="text-xs text-neon-red">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-terminal-dim hover:text-terminal-text text-xs"
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
              className="mb-6 cyber-card p-5 border-neon-yellow/30"
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-neon-yellow flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-semibold text-neon-yellow">
                    Save your API key now
                  </span>
                  <p className="text-xs text-terminal-dim mt-1">
                    This key will not be shown again. Store it securely.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-cyber-darker rounded p-3 border border-cyber-light/20">
                <code className="flex-1 text-sm text-neon-green break-all font-mono">
                  {newKey.key}
                </code>
                <button
                  onClick={() => handleCopy(newKey.key)}
                  className="p-2 rounded bg-cyber-mid/50 text-terminal-dim hover:text-neon-cyan transition-colors flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-neon-green" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-terminal-dim">
                  Key: {newKey.name}
                </span>
                <button
                  onClick={() => setNewKey(null)}
                  className="text-xs text-terminal-dim hover:text-terminal-text transition-colors"
                >
                  I&apos;ve saved it
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick usage example */}
        <div className="mb-6 cyber-card p-4">
          <span className="text-[10px] text-terminal-dim tracking-wider uppercase">
            Quick usage
          </span>
          <div className="mt-2 bg-cyber-darker rounded p-3 border border-cyber-light/20 overflow-x-auto">
            <code className="text-xs text-terminal-text whitespace-pre">{`curl -X POST https://your-domain.com/api/scca/vault/encrypt \\
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
            <h3 className="text-sm text-terminal-text font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-neon-cyan" />
              Generate New API Key
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-terminal-dim block mb-1.5">
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
                <label className="text-xs text-terminal-dim block mb-1.5">
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
                  className="text-xs text-terminal-dim hover:text-terminal-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}

        {/* Keys list */}
        <div>
          <h3 className="text-xs text-terminal-dim tracking-wider uppercase mb-3">
            Active Keys ({keys.length}/10)
          </h3>

          {loading ? (
            <div className="cyber-card p-8 text-center">
              <Shield className="w-6 h-6 text-neon-cyan/30 mx-auto animate-pulse mb-2" />
              <span className="text-xs text-terminal-dim">Loading keys...</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="cyber-card p-8 text-center">
              <Key className="w-6 h-6 text-terminal-dim/30 mx-auto mb-2" />
              <span className="text-xs text-terminal-dim">
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
                  <Key className="w-4 h-4 text-neon-cyan flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-terminal-text font-semibold truncate">
                        {key.name}
                      </span>
                      <code className="text-[10px] text-terminal-dim bg-cyber-darker px-1.5 py-0.5 rounded">
                        {key.keyPrefix}
                      </code>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-terminal-dim">
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
                              ? 'text-neon-red'
                              : 'text-neon-yellow'
                          }
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
                    className="p-2 text-terminal-dim hover:text-neon-red hover:bg-neon-red/5 rounded transition-colors flex-shrink-0"
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
