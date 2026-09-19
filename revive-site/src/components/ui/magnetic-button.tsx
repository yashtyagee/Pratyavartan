"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}

export default function MagneticButton({
  children,
  className = "",
  href,
  onClick,
  variant = "primary",
  disabled = false,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 15 });
  const sy = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced || disabled) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 120) {
      x.set(dx * 0.15);
      y.set(dy * 0.15);
    }
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  const baseClasses =
    variant === "primary"
      ? "bg-accent text-[#05070D] font-semibold hover:shadow-[0_0_30px_rgba(0,186,242,0.3)]"
      : "border border-[rgba(255,255,255,0.08)] text-[#E8ECF4] font-medium hover:border-[rgba(0,186,242,0.4)]";

  const Tag = href ? "a" : "button";
  const linkProps = href
    ? { href, target: href.startsWith("http") ? "_blank" : undefined, rel: href.startsWith("http") ? "noopener noreferrer" : undefined }
    : { onClick: disabled ? undefined : onClick, disabled };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: sx, y: sy, display: "inline-block" }}
    >
      <motion.div whileTap={{ scale: 0.97 }} className="relative">
        <Tag
          {...(linkProps as any)}
          className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm transition-all duration-300 ${baseClasses} ${className}`}
        >
          {/* Shine sweep */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative z-10 flex items-center gap-2">{children}</span>
        </Tag>
      </motion.div>
    </motion.div>
  );
}
