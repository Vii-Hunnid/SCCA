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

const features = [
  {
    icon: Lock,
    title: 'AES-256-GCM',
    description: 'Military-grade encryption for every message with unique per-conversation keys.',
  },
  {
    icon: Database,
    title: 'Single-Row Storage',
    description: 'Entire conversations in one database row. Minimal footprint, maximum efficiency.',
  },
  {
    icon: GitBranch,
    title: 'Merkle Integrity',
    description: 'HMAC-based chain verification ensures tamper-proof conversation history.',
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
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-cyber-light/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-auto w-32">
              <Image
                src="/logo.jpg"
                alt="SCCA logo"
                width={400}
                height={400}
                priority
                className="object-contain"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-300/60 bg-white/70 text-slate-700 shadow-sm hover:bg-slate-100 dark:border-neon-cyan/40 dark:bg-cyber-dark/80 dark:text-terminal-text dark:hover:bg-cyber-mid transition-colors"
            >
              {theme === 'dark' ? 'Day mode' : 'Night mode'}
            </button>
            <Link
              href="/docs"
              className="text-sm text-terminal-dim hover:text-neon-cyan transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/auth/login"
              className="text-sm text-terminal-dim hover:text-neon-cyan transition-colors"
            >
              Sign In
            </Link>
            <Link href="/auth/register" className="cyber-btn text-xs py-2 px-4">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl w-full py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-cyan/20 bg-neon-cyan/5 mb-6">
              <div className="status-dot-active" />
              <span className="text-xs text-neon-cyan tracking-wider">
                ENCRYPTION ACTIVE
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">
              <span className="text-terminal-text">Secure Compact</span>
              <br />
              <span className="text-slate-700 dark:neon-text">Chat Architecture</span>
            </h1>

            <p className="text-terminal-dim max-w-xl mx-auto leading-relaxed mb-8">
              Privacy-first AI conversations with AES-256-GCM encryption,
              single-row storage, and cryptographic integrity verification.
              Your messages never exist unencrypted at rest.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/auth/register" className="cyber-btn-solid">
                Initialize Session
                <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Link>
              <Link
                href="/docs"
                className="text-sm text-terminal-dim hover:text-terminal-text transition-colors"
              >
                View Protocol Spec
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
              <motion.div
                key={feature.title}
                variants={item}
                className="cyber-card-hover p-6 group"
              >
                <feature.icon className="w-5 h-5 text-neon-cyan mb-3 group-hover:text-neon-green transition-colors" />
                <h3 className="text-sm font-semibold text-terminal-text mb-2 tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-xs text-neon-cyan dark:text-terminal-green leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Protocol Summary */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 cyber-card p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="status-dot-active" />
              <span className="text-xs text-neon-green tracking-wider uppercase">
                Protocol Status
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Encryption', value: 'AES-256-GCM' },
                { label: 'Key Derivation', value: 'HKDF-SHA256' },
                { label: 'Integrity', value: 'Merkle-HMAC' },
                { label: 'Compression', value: 'zlib' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-xs text-lime-400 dark:text-terminal-dim mb-1">{stat.label}</div>
                  <div className="text-sm neon-text font-semibold">{stat.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-cyber-light/10 py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-terminal-dim">
          <span>Secure Compact Chat Architecture v1.0</span>
          <span className="neon-text-green">All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
