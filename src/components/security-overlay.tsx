'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const bootSequence = [
  { text: '> Initializing SCCA Protocol v2.0...', delay: 0 },
  { text: '> Loading AES-256-GCM encryption module...', delay: 300 },
  { text: '> Deriving key hierarchy via HKDF-SHA256...', delay: 600 },
  { text: '> Merkle integrity chain verified', delay: 900 },
  { text: '> Secure session established', delay: 1200 },
  { text: '> System ready', delay: 1500 },
];

export function SecurityOverlay() {
  const [show, setShow] = useState(true);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    // Check if already shown this session
    if (sessionStorage.getItem('scca-boot-done')) {
      setShow(false);
      return;
    }

    bootSequence.forEach(({ text, delay }) => {
      setTimeout(() => {
        setLines((prev) => [...prev, text]);
      }, delay);
    });

    setTimeout(() => {
      sessionStorage.setItem('scca-boot-done', '1');
      setShow(false);
    }, 2100);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-cyber-black"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Scanline */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="h-px w-full animate-scanline"
              style={{
                backgroundColor: 'var(--neon-cyan)',
                opacity: 0.15,
                animationDuration: '2s',
              }}
            />
          </div>

          <div className="w-full max-w-lg px-8">
            <motion.div
              className="flex items-center gap-3 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="relative h-10 w-10">
                <Image
                  src="/logo.jpg"
                  alt="SCCA logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-sans text-xl font-semibold tracking-widest text-[var(--neon-cyan)]">
                SCCA
              </span>
            </motion.div>

            <div className="space-y-2 font-mono text-sm">
              {lines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className={
                    line.includes('ready')
                      ? 'text-[var(--neon-green)]'
                      : line.includes('verified')
                        ? 'text-[var(--neon-cyan)]'
                        : 'text-[var(--text-secondary)]'
                  }
                >
                  {line}
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-8 h-0.5 bg-cyber-mid overflow-hidden rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full"
                style={{ backgroundColor: 'var(--neon-cyan)' }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.7, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
