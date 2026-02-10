'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  MessageSquare,
  Plus,
  Key,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Lock,
  FileCode,
  BarChart3,
  CreditCard,
  Gauge,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ConversationList } from './conversation-list';
import Image from 'next/image';

interface DashboardShellProps {
  children: React.ReactNode;
  conversations?: Array<{
    id: string;
    title: string;
    updatedAt: string;
    messageCount: number;
  }>;
  onNewChat?: () => void;
  onSelectConversation?: (id: string) => void;
  activeConversationId?: string;
}

export function DashboardShell({
  children,
  conversations = [],
  onNewChat,
  onSelectConversation,
  activeConversationId,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col border-r border-cyber-light/10 bg-cyber-darker overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-cyber-light/10">
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
                className="text-terminal-dim hover:text-neon-cyan transition-colors p-1"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={onNewChat}
                className="w-full cyber-btn text-xs py-2 flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                New Conversation
              </button>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={onSelectConversation}
              />
            </div>

            {/* Sidebar Footer */}
            <div className="border-t border-cyber-light/10 p-3 space-y-1">
              {/* Platform Console */}
              <Link
                href="/dashboard/platform"
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                  pathname === '/dashboard/platform'
                    ? 'text-neon-cyan bg-neon-cyan/5'
                    : 'text-terminal-dim hover:text-neon-cyan hover:bg-cyber-mid/30'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                Platform
              </Link>
              <Link
                href="/dashboard/api-keys"
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                  pathname === '/dashboard/api-keys'
                    ? 'text-neon-cyan bg-neon-cyan/5'
                    : 'text-terminal-dim hover:text-neon-cyan hover:bg-cyber-mid/30'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                API Keys
              </Link>
              <Link
                href="/dashboard/usage"
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                  pathname === '/dashboard/usage'
                    ? 'text-neon-green bg-neon-green/5'
                    : 'text-terminal-dim hover:text-neon-green hover:bg-cyber-mid/30'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Usage
              </Link>
              <Link
                href="/dashboard/billing"
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                  pathname === '/dashboard/billing'
                    ? 'text-neon-purple bg-neon-purple/5'
                    : 'text-terminal-dim hover:text-neon-purple hover:bg-cyber-mid/30'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Billing
              </Link>
              <Link
                href="/docs"
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-terminal-dim
                           hover:text-neon-cyan hover:bg-cyber-mid/30 rounded transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
                Documentation
              </Link>
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-terminal-dim">
                <Lock className="w-3 h-3 text-neon-green" />
                <span className="text-neon-green">E2E Encrypted</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-terminal-dim
                           hover:text-neon-red hover:bg-neon-red/5 rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-cyber-light/10 bg-cyber-darker/50">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-terminal-dim hover:text-neon-cyan transition-colors p-1"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-terminal-dim" />
            <span className="text-sm text-terminal-dim">
              {activeConversationId ? 'Secure Channel' : 'Dashboard'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="status-dot-active" />
            <span className="text-xs text-terminal-dim">Secure</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
