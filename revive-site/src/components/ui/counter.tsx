"use client";

import { useRef, useEffect, useState } from "react";
import { useInView, animate } from "framer-motion";

interface CounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export default function Counter({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2,
  className = "",
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;

    const controls = animate(0, target, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate(value) {
        const formatted = decimals > 0
          ? value.toFixed(decimals)
          : Math.round(value).toLocaleString("en-IN");
        setDisplay(formatted);
      },
    });

    return () => controls.stop();
  }, [inView, target, duration, decimals]);

  return (
    <span ref={ref} className={`font-display tabular-nums ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
