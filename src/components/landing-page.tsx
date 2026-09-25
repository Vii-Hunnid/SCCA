'use client';

import { motion } from 'framer-motion';
import {
  Lock,
  Zap,
  Database,
  ArrowRight,
  GitBranch,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/components/providers';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trackEvent } from '@/lib/analytics';

const features = [
  {
    icon: Lock,
    title: 'AES-256-GCM',
    description: 'Authenticated encryption for every message, with unique per-conversation keys.',
  },
  {
    icon: Database,
    title: 'Single-Row Storage',
    description: 'Entire conversations in one database row. Minimal footprint, maximum efficiency.',
  },
  {
    icon: GitBranch,
    title: 'Merkle Integrity',
    description: 'HMAC-based chain verification ensures tamper-evident conversation history.',
  },
  {
    icon: Zap,
    title: 'Destructive Editing',
    description: 'Irreversible edits with cryptographic re-keying. No ghost data, no traces.',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="SCCA logo"
              width={400}
              height={400}
              priority
              className="h-9 w-auto object-contain"
            />
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              SCCA
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={toggleTheme}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--border-light)] transition-colors"
            >
              {theme === 'dark' ? 'Day mode' : 'Night mode'}
            </button>
            <Link
              href="/docs"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/auth/login"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="cyber-btn-sm"
              onClick={() =>
                trackEvent('button_click', {
                  button_text: 'Get Started',
                  location: 'nav',
                  page: '/',
                })
              }
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl w-full py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <div className="flex justify-center mb-8">
              <Badge tone="green" className="gap-2">
                <span className="status-dot-active" />
                Encryption active
              </Badge>
            </div>

            <h1 className="font-sans text-5xl md:text-6xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
              SCCA
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--neon-cyan)] mb-6">
              Secure Compact Chat Architecture
            </p>

            <p className="text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed mb-10">
              Privacy-first AI conversations with AES-256-GCM encryption at rest,
              single-row storage, and Merkle integrity verification.
            </p>

            <div className="flex items-center justify-center gap-6">
              <Link
                href="/auth/register"
                className="cyber-btn-solid"
                onClick={() =>
                  trackEvent('button_click', {
                    button_text: 'Initialize Session',
                    location: 'hero_section',
                    page: '/',
                  })
                }
              >
                Initialize Session
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs"
                className="font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors"
                onClick={() =>
                  trackEvent('button_click', {
                    button_text: 'Protocol spec',
                    location: 'hero_section',
                    page: '/',
                    href: '/docs',
                  })
                }
              >
                Protocol spec →
              </Link>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={item}>
                <Card hover className="p-6 h-full group">
                  <feature.icon className="w-5 h-5 mb-3 text-[var(--neon-cyan)] group-hover:text-[var(--neon-green)] transition-colors" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 tracking-wide">
                    {feature.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Protocol Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-12"
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="status-dot-active" />
                <span className="font-mono text-xs text-[var(--neon-green)] tracking-wider uppercase">
                  Protocol status
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="cyan">Encryption · AES-256-GCM</Badge>
                <Badge tone="cyan">Key derivation · HKDF-SHA256</Badge>
                <Badge tone="cyan">Integrity · Merkle-HMAC</Badge>
                <Badge tone="neutral">Compression · zlib</Badge>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Secure Compact Chat Architecture v2.0</span>
          <span className="text-[var(--neon-green)]">All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
