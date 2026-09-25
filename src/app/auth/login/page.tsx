'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials. Access denied.');
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

  const handleOAuthSignIn = (provider: string) => {
    setOauthLoading(provider);
    signIn(provider, { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>

        <Card className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <Image
                src="/logo.jpg"
                alt="SCCA logo"
                width={400}
                height={400}
                priority
                className="h-12 w-auto object-contain mx-auto"
              />
            </Link>
            <h1 className="text-xl font-sans font-semibold text-[var(--text-primary)] mb-2">
              Authenticate
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Enter credentials to access secure channel
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-2 mb-6">
            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={oauthLoading !== null}
              className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {oauthLoading === 'github' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GitHubIcon className="w-4 h-4" />
              )}
              Continue with GitHub
            </button>
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={oauthLoading !== null}
              className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GoogleIcon className="w-4 h-4" />
              )}
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[var(--border-color)]" />
            <span className="font-mono text-[10px] text-[var(--text-secondary)] tracking-wider uppercase">
              or use credentials
            </span>
            <div className="flex-1 h-px bg-[var(--border-color)]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-control)] border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--neon-red) 10%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--neon-red) 25%, transparent)',
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-[var(--neon-red)]" />
                <span className="text-xs text-[var(--neon-red)]">{error}</span>
              </motion.div>
            )}

            <div>
              <label className="block font-mono text-xs text-[var(--text-secondary)] mb-1.5 tracking-wider uppercase">
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
              <label className="block font-mono text-xs text-[var(--text-secondary)] mb-1.5 tracking-wider uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cyber-input pr-10"
                  placeholder="Enter passphrase"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full cyber-btn-solid py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Access System
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              No account?{' '}
              <Link
                href="/auth/register"
                className="text-[var(--neon-cyan)] transition-opacity hover:opacity-80"
              >
                Register
              </Link>
            </p>
          </div>
        </Card>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="status-dot-active" />
          <span className="font-mono text-[10px] text-[var(--text-secondary)] tracking-wider">
            AES-256-GCM ENCRYPTED SESSION
          </span>
        </div>
      </motion.div>
    </div>
  );
}
