"use client";

import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CONSOLE_URL } from '@/lib/constants';

const SECTIONS = ["How It Works", "Intelligence", "Voice", "Orchestration", "Compliance", "Impact"];

export function Navbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 80);
  });

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    
    SECTIONS.forEach(section => {
      const id = section.toLowerCase().replace(/\s+/g, '-');
      const el = document.getElementById(id);
      
      if (el) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setActiveSection(section);
            }
          },
          { rootMargin: '-40% 0px -40% 0px' }
        );
        observer.observe(el);
        observers.push(observer);
      }
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.nav
        className={`flex items-center justify-between px-6 py-3 rounded-full transition-all duration-300 ${
          isScrolled 
            ? 'glass shadow-2xl shadow-black/50 w-full max-w-5xl' 
            : 'w-full max-w-7xl bg-transparent'
        }`}
        layout
      >
        <div className="font-display font-bold text-xl tracking-tight">
          Pratyavartan
        </div>
        
        <div className="hidden md:flex items-center space-x-8">
          {SECTIONS.map((section) => (
            <Link 
              key={section} 
              href={`#${section.toLowerCase().replace(/\s+/g, '-')}`}
              className={`text-sm transition-colors duration-200 ${
                activeSection === section ? 'text-accent font-medium' : 'text-muted hover:text-text'
              }`}
            >
              {section}
            </Link>
          ))}
        </div>

        <a 
          href={CONSOLE_URL}
          className="group relative flex items-center gap-2 px-5 py-2 bg-text text-base rounded-full font-medium overflow-hidden transition-transform hover:scale-105 active:scale-95"
        >
          <span className="relative z-10">Launch War Room</span>
          <ArrowRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1" />
          <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-20 transition-opacity" />
        </a>
      </motion.nav>
    </motion.header>
  );
}
