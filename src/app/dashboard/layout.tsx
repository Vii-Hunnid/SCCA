'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Shield } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();

  if (status === 'unauthenticated') {
    redirect('/auth/login');
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-black">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-8 h-8 text-neon-cyan animate-pulse" />
          <div className="flex gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-xs text-terminal-dim tracking-wider">
            Establishing secure session...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
