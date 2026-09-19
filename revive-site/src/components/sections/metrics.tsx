"use client";

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { useLiveData } from '@/lib/use-live-data';
import { API_BASE_URL } from '@/lib/constants';
import Counter from '@/components/ui/counter';

export function Metrics() {
  const prefersReducedMotion = useReducedMotion();
  const { data } = useLiveData<{ recoveryRate?: number; revenue?: number; violations?: number; breaches?: number }>(`${API_BASE_URL}/metrics`, 15000, {});

  const metrics = [
    { label: "Recovery Success Rate", target: data?.recoveryRate ?? 78.4, suffix: "%", decimals: 1 },
    { label: "Revenue Recovered", target: data?.revenue ?? 14250, prefix: "₹" },
    { label: "Violations Prevented", target: data?.violations ?? 8 },
    { label: "Compliance Breaches", target: data?.breaches ?? 0, isZeroHero: true }
  ];

  return (
    <section id="impact" className="py-32 bg-base relative">
      <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none filter url(#noise)" />
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-4xl md:text-5xl text-text">
            Impact. Measured. Proven.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: prefersReducedMotion ? 0 : i * 0.1 }}
              className="glass p-8 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group"
            >
              {m.isZeroHero && (
                <div className="absolute inset-0 bg-recovered/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
              )}
              
              <div className={`font-display text-5xl md:text-6xl mb-4 relative z-10 ${m.isZeroHero ? 'text-recovered drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'text-text'}`}>
                {m.prefix}
                <Counter target={m.target} decimals={m.decimals || 0} />
                {m.suffix}
              </div>
              <div className="text-muted text-sm uppercase tracking-wider relative z-10">
                {m.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
