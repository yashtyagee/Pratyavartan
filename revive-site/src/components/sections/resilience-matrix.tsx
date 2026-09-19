"use client";

import { motion } from "framer-motion";
import { BrainCircuit, AudioWaveform, Database, Workflow, CreditCard, CheckCircle } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export function ResilienceMatrix() {
  const prefersReducedMotion = useReducedMotion();

  const rows = [
    { icon: <BrainCircuit className="w-5 h-5 text-ai" />, system: "AI Engine", primary: "Groq LLaMA 3.3 70B", fallback: "4-model cascade + heuristics" },
    { icon: <AudioWaveform className="w-5 h-5 text-ai" />, system: "Voice", primary: "Sarvam AI bulbul:v1", fallback: "gTTS Hindi" },
    { icon: <Database className="w-5 h-5 text-accent" />, system: "Memory", primary: "Cognee Graph", fallback: "SQLite local" },
    { icon: <Workflow className="w-5 h-5 text-monitor" />, system: "Orchestration", primary: "n8n Cloud", fallback: "Direct API calls" },
    { icon: <CreditCard className="w-5 h-5 text-text" />, system: "Payments", primary: "Razorpay API", fallback: "UPI deep links" },
  ];

  return (
    <section id="resilience" className="py-24 sm:py-32 relative border-t border-stroke bg-base">
      <div className="container px-6 mx-auto">
        <div className="mb-16 md:text-center max-w-2xl md:mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-text mb-4"
          >
            Resilience is not optional.
          </motion.h2>
        </div>

        <div className="w-full max-w-5xl mx-auto overflow-x-auto pb-8">
          <div className="min-w-[800px] glass border border-stroke rounded-2xl bg-surface backdrop-blur-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 p-6 border-b border-stroke bg-white/[0.02] text-sm font-bold tracking-widest text-muted uppercase">
              <div>System</div>
              <div>Primary</div>
              <div>Fallback</div>
              <div>Impact</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-stroke">
              {rows.map((row, index) => (
                <motion.div 
                  key={row.system}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="grid grid-cols-4 gap-4 p-6 items-center hover:bg-white/[0.01] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {row.icon}
                    <span className="font-medium text-text">{row.system}</span>
                  </div>
                  <div className="font-mono text-sm text-text">{row.primary}</div>
                  <div className="font-mono text-sm text-muted">{row.fallback}</div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-recovered/30 bg-recovered/10 text-recovered text-xs font-bold tracking-wide">
                      <CheckCircle className="w-3.5 h-3.5" />
                      ZERO DOWNTIME
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center text-muted mt-8 font-mono text-sm"
        >
          Five systems. Five fallbacks. Zero single points of failure.
        </motion.p>
      </div>
    </section>
  );
}
