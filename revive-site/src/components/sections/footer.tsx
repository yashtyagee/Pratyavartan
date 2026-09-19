"use client";

import { motion } from 'framer-motion';

export function Footer() {
  return (
    <footer className="bg-base border-t border-stroke relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none filter url(#noise)" />
      
      <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 items-center">
          
          {/* Logo */}
          <div className="flex flex-col items-center md:items-start">
            <div className="font-display text-4xl mb-2 bg-gradient-to-r from-accent to-ai bg-clip-text text-transparent">
              प्रत्यावर्तन
            </div>
            <div className="text-muted tracking-[0.3em] text-xs font-medium">
              PRATYAVARTAN
            </div>
          </div>

          {/* Status Line */}
          <div className="flex justify-center">
            <div className="mono text-xs text-muted flex items-center gap-3 bg-surface px-4 py-2 rounded-full border border-stroke">
              <motion.div
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-recovered"
              />
              GET /health → 200 OK · 12ms
            </div>
          </div>

          {/* Links */}
          <div className="flex justify-center md:justify-end gap-6 text-sm text-muted flex-wrap">
            <a href="#how-it-works" className="hover:text-text transition-colors">How It Works</a>
            <a href="#intelligence" className="hover:text-text transition-colors">Intelligence</a>
            <a href="#voice" className="hover:text-text transition-colors">Voice</a>
            <a href="#compliance" className="hover:text-text transition-colors">Compliance</a>
            <a href="#impact" className="hover:text-text transition-colors">Impact</a>
          </div>

        </div>

        {/* Bottom */}
        <div className="text-center text-muted/50 text-sm border-t border-stroke/50 pt-8">
          Built for Indian commerce
        </div>
      </div>
    </footer>
  );
}
