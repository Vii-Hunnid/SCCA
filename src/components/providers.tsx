'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#12121a',
            color: '#b3b1ad',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.85rem',
          },
          success: {
            iconTheme: { primary: '#00ff9d', secondary: '#0a0a0f' },
          },
          error: {
            iconTheme: { primary: '#ff3333', secondary: '#0a0a0f' },
          },
        }}
      />
      {children}
    </SessionProvider>
  );
}
