"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Check } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const LOG_LINES = [
  { time: "[00:00.000]", badge: "DETECTED", content: "payment_link.failed | pay_sim_a3f9... | ₹2,450", color: "text-muted" },
  { time: "[00:00.120]", badge: "AI_DIAGNOSIS", content: "scenario=INSUFFICIENT_BALANCE | P(recovery)=0.75", color: "text-ai" },
  { time: "[00:00.340]", badge: "DISCOUNT_APPROVED", content: "tier=3% on ₹2,450 | discount=₹73.50", color: "text-monitor" },
  { time: "[00:01.200]", badge: "VOICE_GENERATED", content: "engine=Sarvam bulbul:v1 | lang=hi-IN", color: "text-ai" },
  { time: "[00:01.800]", badge: "MESSAGE_SENT", content: "channel=whatsapp | link=rzp.io/i/x7k2m", color: "text-accent" },
  { time: "[00:45.000]", badge: "RECOVERED", content: "₹2,376.50 collected | hash=a3f9e2..7b1c", color: "text-recovered", isFinal: true },
];

function TypewriterLine({ line, delay, onComplete }: { line: any, delay: number, onComplete: () => void }) {
  const [displayedContent, setDisplayedContent] = useState("");
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayedContent(line.content);
      onComplete();
      return;
    }

    let timeout: NodeJS.Timeout;
    const startDelay = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedContent(line.content.substring(0, i + 1));
        i++;
        if (i === line.content.length) {
          clearInterval(interval);
          onComplete();
        }
      }, 30);
      timeout = interval;
    }, delay);

    return () => {
      clearTimeout(startDelay);
      clearInterval(timeout);
    };
  }, [line.content, delay, onComplete, shouldReduceMotion]);

  if (!displayedContent && !shouldReduceMotion) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mono text-sm sm:text-base leading-relaxed mb-3">
      <span className="text-muted whitespace-nowrap">{line.time}</span>
      <span className={`w-40 font-bold whitespace-nowrap ${line.color}`}>{line.badge}</span>
      <span className="text-text flex items-center gap-2">
        {displayedContent}
        {line.isFinal && displayedContent === line.content && (
          <motion.span 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-recovered"
          >
            <Check className="w-5 h-5 inline" />
          </motion.span>
        )}
      </span>
    </div>
  );
}

export function SimulationTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isInView && visibleLines === 0) {
      setVisibleLines(1);
    }
  }, [isInView, visibleLines]);

  const handleLineComplete = (index: number) => {
    if (index === LOG_LINES.length - 1) {
      setTimeout(() => setIsComplete(true), 500);
    } else {
      setTimeout(() => setVisibleLines(prev => Math.max(prev, index + 2)), 500);
    }
  };

  return (
    <section id="simulation" className="py-24 px-6 md:px-12 lg:px-24 bg-base relative">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-ai/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto" ref={containerRef}>
        <div className="glass rounded-xl overflow-hidden bg-surface border border-stroke shadow-2xl backdrop-blur-xl">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stroke bg-base/50">
            <div className="w-3 h-3 rounded-full bg-critical" />
            <div className="w-3 h-3 rounded-full bg-monitor" />
            <div className="w-3 h-3 rounded-full bg-recovered" />
            <span className="ml-4 mono text-xs text-muted">recovery_lifecycle.log</span>
          </div>

          {/* Terminal Body */}
          <div className="p-6 sm:p-8 min-h-[400px] overflow-x-auto">
            {isInView && LOG_LINES.slice(0, visibleLines).map((line, i) => (
              <TypewriterLine 
                key={i} 
                line={line} 
                delay={i === 0 ? 300 : 0} 
                onComplete={() => handleLineComplete(i)} 
              />
            ))}
            
            {isComplete && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, scale: [1, 1.02, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                className="mt-8 pt-4 border-t border-stroke/50 mono text-recovered font-bold flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                ✓ Recovery complete. 45 seconds. Zero human intervention.
              </motion.div>
            )}
            
            {/* Blinking Cursor */}
            {!isComplete && visibleLines > 0 && (
              <motion.div 
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-3 h-5 bg-text inline-block mt-2"
              />
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-muted text-sm font-display">
          Real audit events. Real sequencing. No mock scripts.
        </p>
      </div>
    </section>
  );
}
