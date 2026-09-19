"use client";

import { motion } from 'framer-motion';
import MagneticButton from '@/components/ui/magnetic-button';
import { CONSOLE_URL, API_BASE_URL, API_DOCS_URL } from '@/lib/constants';

export function FinalCTA() {
  return (
    <section className="min-h-screen relative flex items-center justify-center bg-base overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 50, -50, 0],
            y: [0, -50, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-accent/20 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div
          animate={{
            x: [0, -50, 50, 0],
            y: [0, 50, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-ai/20 rounded-full blur-[120px] mix-blend-screen"
        />
      </div>
      
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none filter url(#noise)" />

      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl mx-auto">
        <h2 className="font-display text-5xl md:text-7xl lg:text-8xl text-text mb-6 tracking-tight">
          Hire Digital<br/>Employee <span className="text-ai">#AI-001</span>.
        </h2>
        
        <p className="text-muted text-lg md:text-xl mb-16 max-w-2xl leading-relaxed">
          24/7 autonomous payment recovery. Hinglish voice negotiation. Cryptographic proof. Zero compliance breaches.
        </p>

        <div className="relative mb-24">
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-accent rounded-full blur-xl pointer-events-none"
          />
          <a href={CONSOLE_URL} className="relative block">
            <MagneticButton className="px-12 py-6 text-xl rounded-full bg-text text-base hover:bg-white font-medium transition-colors">
              Deploy the Teammate
            </MagneticButton>
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-8 mono text-sm text-muted">
          <a href={CONSOLE_URL} className="hover:text-text transition-colors">/console (War Room)</a>
          <a href={`${API_BASE_URL}/health`} target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors">/health</a>
          <a href={API_DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors">API Docs</a>
        </div>
      </div>
    </section>
  );
}
