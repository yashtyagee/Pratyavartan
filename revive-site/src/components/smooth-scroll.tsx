"use client";

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { useAnimationFrame } from 'framer-motion';
import { useReducedMotion } from '@/lib/use-reduced-motion';

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  useAnimationFrame((time) => {
    if (lenisRef.current) {
      lenisRef.current.raf(time);
    }
  });

  return <>{children}</>;
}
