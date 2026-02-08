import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from '@/components/providers';
import { SecurityOverlay } from '@/components/security-overlay';

export const metadata: Metadata = {
  title: 'SCCA - Secure Compact Chat Architecture',
  description:
    'Privacy-first, storage-efficient chat with AES-256-GCM encryption, HKDF key derivation, and Merkle integrity verification.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-mono">
        <Providers>
          <SecurityOverlay />
          <div className="relative min-h-screen bg-cyber-black bg-cyber-grid">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
