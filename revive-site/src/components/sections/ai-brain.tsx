"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ShieldCheck, Activity } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const MODELS = [
  { id: "groq", name: "Groq LLaMA 3.3 70B", size: "lg", color: "border-[#00BAF2] text-[#00BAF2]" },
  { id: "minimax", name: "MiniMax M3", size: "md", color: "border-stroke text-muted" },
  { id: "qwen", name: "Qwen 2.5 Coder", size: "md", color: "border-stroke text-muted" },
  { id: "nemotron", name: "Nemotron 3.5", size: "md", color: "border-stroke text-muted" },
  { id: "heuristic", name: "Deterministic Heuristics", size: "md", color: "border-[#22C55E] text-[#22C55E]", isFinal: true },
];

const DISCOUNT_TIERS = [
  { threshold: "≥ ₹25,000", discount: "5% discount", color: "bg-[#00BAF2] border-[#00BAF2]", target: 100 },
  { threshold: "≥ ₹10,000", discount: "3% discount", color: "bg-[#FBBF24] border-[#FBBF24]", target: 60 },
  { threshold: "≥ ₹5,000", discount: "2% discount", color: "bg-[#8B5CF6] border-[#8B5CF6]", target: 40 },
];

function ModelNode({
  model,
  index,
  totalModels,
  smoothProgress,
  shouldReduceMotion,
}: {
  model: (typeof MODELS)[0];
  index: number;
  totalModels: number;
  smoothProgress: any;
  shouldReduceMotion: boolean;
}) {
  const activationPoint = index / (totalModels - 1);
  const start = Math.max(0, Number((activationPoint - 0.12).toFixed(3)));
  const end = Math.min(1, Math.max(start + 0.05, Number(activationPoint.toFixed(3))));
  const range: [number, number] = [start, end];

  const opacity = useTransform(smoothProgress, range, [0.4, 1]);
  const scale = useTransform(smoothProgress, range, [0.95, 1.05]);
  const showLabel = useTransform(smoothProgress, (p: number) => p >= Math.max(0, activationPoint - 0.05));

  return (
    <motion.div 
      key={model.id}
      style={shouldReduceMotion ? {} : { opacity, scale }}
      className={`glass p-6 rounded-2xl border ${model.color} bg-surface backdrop-blur-xl relative w-full flex items-center justify-between transition-all duration-300`}
    >
      <div className="flex items-center gap-4">
        {model.isFinal ? <ShieldCheck className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
        <span className={`font-display font-bold ${model.size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
          {model.name}
        </span>
      </div>

      <motion.div
        style={{ opacity: showLabel }}
        className="absolute -right-4 translate-x-full"
      >
        {!model.isFinal ? (
          <div className="text-xs font-bold mono bg-base/80 border border-stroke px-2 py-1 rounded text-muted whitespace-nowrap">
            LLM_MODEL_SWITCH
          </div>
        ) : (
          <div className="text-sm font-bold font-display text-recovered whitespace-nowrap drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
            Heuristic = 100% uptime,<br/>zero API keys
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function DiscountTierCard({
  tier,
  index,
  smoothProgress,
  shouldReduceMotion,
}: {
  tier: (typeof DISCOUNT_TIERS)[0];
  index: number;
  smoothProgress: any;
  shouldReduceMotion: boolean;
}) {
  const start = Math.min(0.85, Math.max(0, Number((0.15 + index * 0.12).toFixed(3))));
  const end = Math.min(1.0, Math.max(start + 0.1, Number((0.45 + index * 0.12).toFixed(3))));
  const width = useTransform(smoothProgress, [start, end], ["0%", `${tier.target}%`]);

  return (
    <div key={index} className="glass p-8 rounded-2xl border border-stroke bg-surface backdrop-blur-xl shadow-xl">
      <div className="flex justify-between items-end mb-4">
        <div className="space-y-1">
          <div className="text-muted text-sm mono uppercase tracking-wider">Cart Value</div>
          <div className="text-3xl font-display text-text font-semibold">{tier.threshold}</div>
        </div>
        <div className="text-xl font-bold mono text-accent">
          {tier.discount}
        </div>
      </div>
      
      <div className="h-3 bg-base rounded-full overflow-hidden border border-stroke/50">
        <motion.div 
          className={`h-full ${tier.color} shadow-[0_0_10px_currentColor] opacity-80`}
          style={shouldReduceMotion ? { width: `${tier.target}%` } : { width }}
        />
      </div>
    </div>
  );
}

export function AIBrain() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <section id="intelligence" className="relative w-full bg-base">
      
      {/* Mobile view - Stacked layout */}
      <div className="md:hidden py-24 px-6 space-y-16">
        <div>
          <h2 className="text-4xl font-display text-text font-bold mb-4">
            Intelligence that never goes offline.
          </h2>
          <p className="text-muted text-lg">
            Five models. One decision. Deterministic fallback guarantees 100% availability.
          </p>
        </div>

        <div className="space-y-4 relative">
          <div className="absolute left-[50%] top-0 bottom-0 w-px bg-stroke -z-10" />
          {MODELS.map((model) => (
            <div key={model.id} className={`glass p-4 rounded-xl border ${model.color} bg-surface text-center mx-auto w-3/4 backdrop-blur-md`}>
              <span className="font-display font-semibold">{model.name}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-display text-text font-semibold mb-4">Discount Engine</h3>
          {DISCOUNT_TIERS.map((tier, i) => (
            <div key={i} className="glass p-4 rounded-xl border border-stroke bg-surface">
              <div className="flex justify-between items-center mb-2">
                <span className="font-display text-text">{tier.threshold}</span>
                <span className="font-bold mono text-sm">{tier.discount}</span>
              </div>
              <div className="h-2 bg-base rounded-full overflow-hidden">
                <div className={`h-full ${tier.color} opacity-80`} style={{ width: `${tier.target}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop view - Pinned layout */}
      <div ref={containerRef} className="hidden md:block h-[400vh]">
        <div className="sticky top-0 h-screen flex items-center overflow-hidden py-12 px-8 lg:px-24">
          
          {/* LEFT PANEL: Ladder */}
          <div className="w-[55%] h-full flex flex-col justify-center relative">
            
            <div className="mb-12">
              <h2 className="text-5xl lg:text-6xl font-display text-text font-bold mb-4">
                Intelligence that never goes offline.
              </h2>
              <p className="text-muted text-xl max-w-lg">
                Five models. One decision. Deterministic fallback guarantees 100% availability.
              </p>
            </div>

            <div className="relative w-full max-w-md mx-auto flex flex-col items-center gap-8">
              {/* Connecting line */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-stroke -z-10" />
              <motion.div 
                className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-accent -z-10 origin-top shadow-[0_0_15px_rgba(0,186,242,0.5)]"
                style={{ scaleY: smoothProgress }}
              />

              {MODELS.map((model, i) => (
                <ModelNode
                  key={model.id}
                  model={model}
                  index={i}
                  totalModels={MODELS.length}
                  smoothProgress={smoothProgress}
                  shouldReduceMotion={shouldReduceMotion}
                />
              ))}
            </div>
          </div>

          {/* RIGHT PANEL: Discount Engine */}
          <div className="w-[45%] h-full flex flex-col justify-center pl-16">
            <h3 className="text-2xl font-display text-text font-bold mb-8 opacity-80">Dynamic Discount Engine</h3>
            
            <div className="space-y-8">
              {DISCOUNT_TIERS.map((tier, i) => (
                <DiscountTierCard
                  key={i}
                  tier={tier}
                  index={i}
                  smoothProgress={smoothProgress}
                  shouldReduceMotion={shouldReduceMotion}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
