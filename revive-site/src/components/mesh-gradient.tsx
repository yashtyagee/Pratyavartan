"use client";

import { motion } from 'framer-motion';

export function MeshGradient() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-base">
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -50, 100, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 45,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
        style={{ backgroundColor: 'var(--color-accent)' }}
      />
      <motion.div
        animate={{
          x: [0, -100, 50, 0],
          y: [0, 100, -50, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 55,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-15"
        style={{ backgroundColor: 'var(--color-ai)' }}
      />
      <motion.div
        animate={{
          x: [0, 50, -100, 0],
          y: [0, 50, -50, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-15"
        style={{ backgroundColor: 'var(--color-recovered)' }}
      />
    </div>
  );
}
