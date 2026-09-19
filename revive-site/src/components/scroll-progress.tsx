"use client";

import { motion, useScroll, useTransform } from 'framer-motion';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[100]"
      style={{
        scaleX,
        transformOrigin: "0%",
        background: "linear-gradient(90deg, var(--color-accent), var(--color-ai))"
      }}
    />
  );
}
