'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  MessageSquare,
  Key,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Lock,
  FileCode,
  BarChart3,
  CreditCard,
  Gauge,
  Sun,
  Moon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { useTheme } from '@/components/providers';

interface DashboardPageShellProps {
  children: React.ReactNode;
}

export function DashboardPageShell({
  children,
}: DashboardPageShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image
                  src="/logo.jpg"
                  alt="SCCA logo"
                  width={100}
                  height={100}
                  priority
                  className="object-contain"
                />
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors p-1"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <Link
                href="/dashboard"
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                  pathname === '/dashboard'
                    ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5'
                    : 'text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </Link>
              <Link
                href="/dashboard/platform"
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                  pathname === '/dashboard/platform'
                    ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5'
                    : 'text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                Platform
              </Link>
              <Link
                href="/dashboard/api-keys"
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                  pathname === '/dashboard/api-keys'
                    ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5'
                    : 'text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                API Keys
              </Link>
              <Link
                href="/dashboard/usage"
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                  pathname === '/dashboard/usage'
                    ? 'text-[var(--neon-green)] bg-[var(--neon-green)]/5'
                    : 'text-[var(--text-secondary)] hover:text-[var(--neon-green)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Usage
              </Link>
              <Link
                href="/dashboard/billing"
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                  pathname === '/dashboard/billing'
                    ? 'text-[var(--neon-purple)] bg-[var(--neon-purple)]/5'
                    : 'text-[var(--text-secondary)] hover:text-[var(--neon-purple)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Billing
              </Link>
              <Link
                href="/dashboard/invoices"
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                  pathname === '/dashboard/invoices'
                    ? 'text-[var(--neon-purple)] bg-[var(--neon-purple)]/5'
                    : 'text-[var(--text-secondary)] hover:text-[var(--neon-purple)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Invoices
              </Link>
            </div>

            {/* Sidebar Footer */}
            <div className="border-t border-[var(--border-color)] p-3 space-y-1">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] hover:bg-[var(--bg-tertiary)]"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5" />
                    Dark Mode
                  </>
                )}
              </button>
              
              <Link
                href="/docs"
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)]
                           hover:text-[var(--neon-cyan)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
                Documentation
              </Link>
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--neon-green)]">
                <Lock className="w-3 h-3" />
                <span>E2E Encrypted</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)]
                           hover:text-[var(--neon-red)] hover:bg-[var(--neon-red)]/5 rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)]">
        {/* Top Bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors p-1"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              Dashboard
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="status-dot-active" />
            <span className="text-xs text-[var(--text-secondary)]">Secure</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[var(--bg-primary)]">{children}</main>
      </div>
    </div>
  );
}
