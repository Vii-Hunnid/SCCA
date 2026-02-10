import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from '@/components/providers';
import { SecurityOverlay } from '@/components/security-overlay';

export const metadata: Metadata = {
  title: 'SCCA',
  description:
    'Privacy-first, storage-efficient chat with AES-256-GCM encryption, HKDF key derivation, and Merkle integrity verification.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
      </head>
      <body className="font-mono">
        <Providers>
          <SecurityOverlay />
          <div className="relative min-h-screen bg-cyber-black bg-cyber-grid dark:bg-cyber-black dark:bg-cyber-grid bg-white">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
