"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const chars = '0123456789ABCDEF';
const targetHash = '0x9A4B...2F1C';

export function Preloader() {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hash, setHash] = useState('');

  useEffect(() => {
    const scrambleInterval = setInterval(() => {
      let tempHash = '0x';
      for (let i = 0; i < 8; i++) {
        tempHash += chars[Math.floor(Math.random() * chars.length)];
      }
      setHash(tempHash);
    }, 50);

    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return p + Math.floor(Math.random() * 15) + 5;
      });
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(scrambleInterval);
      setHash(targetHash);
      setTimeout(() => setIsVisible(false), 400);
    }, 1500);

    return () => {
      clearInterval(scrambleInterval);
      clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ clipPath: 'circle(150% at 50% 50%)' }}
          exit={{ clipPath: 'circle(0% at 50% 50%)' }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-base text-text"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="mono text-ai text-sm tracking-widest uppercase">
              Initializing Digital Employee #AI-001
            </div>
            <div className="mono text-2xl tracking-widest text-muted">
              {hash}
            </div>
            <div className="font-display text-6xl text-text font-bold">
              {Math.min(progress, 100)}%
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
