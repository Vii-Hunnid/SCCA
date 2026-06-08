'use client';

import { useEffect, useRef, useState } from 'react';

const CHARS = ['░', '▒', '▓', '█', '▓', '▒', '░'];

const WORDS = [
  'thinking...',
  'writing...',
  'analyzing...',
  'reasoning...',
  'composing...',
  'processing...',
  'drafting...',
  'reflecting...',
];

/** Full-size wave used in the loading bubble (before first token arrives). */
export function BlockStreamingIndicator({ className = '' }: { className?: string }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    import('animejs').then(({ animate, stagger }) => {
      const targets = refs.current.filter(Boolean) as HTMLSpanElement[];
      if (targets.length === 0) return;

      const anim = animate(targets, {
        opacity: [0.15, 1, 0.15],
        color: ['#10b981', '#6ee7b7', '#10b981'],
        delay: stagger(80, { from: 'center' }),
        duration: 700,
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      });

      cleanup = () => anim.cancel();
    });

    return () => cleanup?.();
  }, []);

  return (
    <span className={`inline-flex items-center gap-[1px] font-mono select-none ${className}`}>
      {CHARS.map((ch, i) => (
        <span
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          style={{ opacity: 0.15, color: '#10b981' }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/**
 * Inline cursor placed at the end of streaming text.
 * Shows the ░▒▓█▓▒░ wave followed by a rotating label word.
 */
export function InlineStreamingCursor() {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const [wordIdx, setWordIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  // anime.js wave on the block chars
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    import('animejs').then(({ animate, stagger }) => {
      const targets = refs.current.filter(Boolean) as HTMLSpanElement[];
      if (targets.length === 0) return;

      const anim = animate(targets, {
        opacity: [0.1, 0.9, 0.1],
        color: ['#10b981', '#6ee7b7', '#10b981'],
        delay: stagger(70, { from: 'center' }),
        duration: 600,
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      });

      cleanup = () => anim.cancel();
    });

    return () => cleanup?.();
  }, []);

  // Rotate through words every 1.8 s with a brief fade-out/in
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setWordIdx((i) => (i + 1) % WORDS.length);
        setVisible(true);
      }, 180);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 align-middle ml-1.5 select-none">
      <span className="inline-flex items-center gap-[1px] font-mono text-[0.7em]">
        {CHARS.map((ch, i) => (
          <span
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            style={{ opacity: 0.1, color: '#10b981' }}
          >
            {ch}
          </span>
        ))}
      </span>
      <span
        className="text-[10px] font-mono italic transition-opacity duration-150"
        style={{
          color: 'var(--neon-green)',
          opacity: visible ? 0.7 : 0,
        }}
      >
        {WORDS[wordIdx]}
      </span>
    </span>
  );
}
