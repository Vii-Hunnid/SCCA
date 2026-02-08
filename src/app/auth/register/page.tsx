'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, UserPlus, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passphrases do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Passphrase must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        return;
      }

      // Auto-login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created. Please sign in manually.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Connection failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Shield className="w-6 h-6 text-neon-cyan" />
            <span className="font-display text-sm tracking-[0.3em] text-neon-cyan uppercase">
              SCCA
            </span>
          </Link>
          <h1 className="text-xl font-display font-semibold text-terminal-text mb-2">
            Create Identity
          </h1>
          <p className="text-xs text-terminal-dim">
            Generate your cryptographic identity
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded bg-neon-red/10 border border-neon-red/20"
            >
              <AlertCircle className="w-4 h-4 text-neon-red flex-shrink-0" />
              <span className="text-xs text-neon-red">{error}</span>
            </motion.div>
          )}

          <div>
            <label className="block text-xs text-terminal-dim mb-1.5 tracking-wider uppercase">
              Callsign
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="cyber-input"
              placeholder="Your display name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-terminal-dim mb-1.5 tracking-wider uppercase">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="cyber-input"
              placeholder="operator@scca.dev"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-terminal-dim mb-1.5 tracking-wider uppercase">
              Passphrase
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cyber-input pr-10"
                placeholder="Min 8 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-dim hover:text-neon-cyan transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-terminal-dim mb-1.5 tracking-wider uppercase">
              Confirm Passphrase
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="cyber-input"
              placeholder="Re-enter passphrase"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full cyber-btn-solid py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
                Generating keys...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Initialize Identity
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-terminal-dim">
            Already registered?{' '}
            <Link
              href="/auth/login"
              className="text-neon-cyan hover:text-neon-green transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>

        {/* Security Badge */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="status-dot-active" />
          <span className="text-[10px] text-terminal-dim tracking-wider">
            PBKDF2 KEY DERIVATION ACTIVE
          </span>
        </div>
      </motion.div>
    </div>
  );
}
