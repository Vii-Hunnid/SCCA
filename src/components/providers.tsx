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
    // Dark is the default; only an explicit stored choice overrides it
    const stored =
      typeof window !== 'undefined'
        ? (window.localStorage.getItem('scca-theme') as Theme | null)
        : null;

    setTheme(stored === 'light' || stored === 'dark' ? stored : 'dark');
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
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-elevated)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.85rem',
            },
            success: {
              iconTheme: { primary: 'var(--neon-green)', secondary: 'var(--bg-primary)' },
            },
            error: {
              iconTheme: { primary: 'var(--neon-red)', secondary: 'var(--bg-primary)' },
            },
          }}
        />
        {children}
      </ThemeContext.Provider>
    </SessionProvider>
  );
}
