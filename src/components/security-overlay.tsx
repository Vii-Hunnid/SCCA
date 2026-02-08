'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

const bootSequence = [
  { text: '> Initializing SCCA Protocol v1.0...', delay: 0 },
  { text: '> Loading AES-256-GCM encryption module...', delay: 400 },
  { text: '> Deriving key hierarchy via HKDF-SHA256...', delay: 800 },
  { text: '> Merkle integrity chain verified', delay: 1200 },
  { text: '> Secure session established', delay: 1600 },
  { text: '> System ready', delay: 2000 },
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
    }, 2800);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-cyber-black"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-full max-w-lg px-8">
            <motion.div
              className="flex items-center gap-3 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Shield className="w-8 h-8 text-neon-cyan" />
              <span className="font-display text-xl tracking-widest text-neon-cyan">
                SCCA
              </span>
            </motion.div>

            <div className="space-y-2 font-mono text-sm">
              {lines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={
                    line.includes('ready')
                      ? 'text-neon-green'
                      : line.includes('verified')
                        ? 'text-neon-cyan'
                        : 'text-terminal-dim'
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
                className="h-full bg-neon-cyan"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.4, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
