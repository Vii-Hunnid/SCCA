import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import '@/styles/globals.css';
import { Providers } from '@/components/providers';
import { SecurityOverlay } from '@/components/security-overlay';

const STS_TRACKING_TOKEN = 'st_O5qQ11BFYsb1w8XXKqskghypwpsWymGU_mugn6npg';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
      </head>
      <body className="font-sans">
        <Providers>
          <SecurityOverlay />
          <div className="relative min-h-screen bg-[var(--bg-primary)]">
            {children}
          </div>
        </Providers>
        <Script
          src="https://www.sitetooling.space/track.js"
          data-token={STS_TRACKING_TOKEN}
          strategy="afterInteractive"
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.sitetooling.space/noscript.gif?token=${STS_TRACKING_TOKEN}`}
            alt="sitetooling.space"
          />
        </noscript>
      </body>
    </html>
  );
}
