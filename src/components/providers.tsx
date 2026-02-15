'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within Providers');
  }
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Initialize from localStorage or system preference
    const stored =
      typeof window !== 'undefined'
        ? (window.localStorage.getItem('scca-theme') as Theme | null)
        : null;

    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      return;
    }

    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    window.localStorage.setItem('scca-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <SessionProvider>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: theme === 'dark' ? '#12121a' : '#ffffff',
              color: theme === 'dark' ? '#b3b1ad' : '#111827',
              border:
                theme === 'dark'
                  ? '1px solid rgba(0, 240, 255, 0.2)'
                  : '1px solid rgba(15, 23, 42, 0.08)',
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
      </ThemeContext.Provider>
    </SessionProvider>
  );
}
