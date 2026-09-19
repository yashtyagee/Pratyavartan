"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { 
  BrainCircuit, 
  MessageSquareHeart, 
  Zap, 
  Workflow, 
  ShieldCheck 
} from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const PILLARS = [
  {
    id: "diagnose",
    title: "Diagnose",
    icon: BrainCircuit,
    color: "text-[#8B5CF6]",
    badge: "AI_DIAGNOSIS",
    description: "LLM classifies failure in milliseconds. Heuristic fallback means it's never offline."
  },
  {
    id: "negotiate",
    title: "Negotiate",
    icon: MessageSquareHeart,
    color: "text-[#FBBF24]",
    badge: "DISCOUNT_APPROVED",
    description: "Dynamic discount tiers: 2-5% based on cart value. Hinglish voice negotiation."
  },
  {
    id: "execute",
    title: "Execute",
    icon: Zap,
    color: "text-[#00BAF2]",
    badge: "MESSAGE_SENT",
    description: "1-click upi://pay deep links, instrument switching, Razorpay payment links."
  },
  {
    id: "orchestrate",
    title: "Orchestrate",
    icon: Workflow,
    color: "text-[#22C55E]",
    badge: "MANDATE_RETRY_SCHEDULED",
    description: "n8n async waits: promise grace periods, RBI-spaced mandate retries."
  },
  {
    id: "assure",
    title: "Assure",
    icon: ShieldCheck,
    color: "text-[#22C55E]",
    badge: "CHAIN_VERIFIED",
    description: "Append-only SHA-256 ledger. Zero compliance violations."
  }
];

function getPillarRange(index: number) {
  if (index === 0) {
    return {
      inputRange: [0, 0.02, 0.16, 0.22] as [number, number, number, number],
      opacityOutput: [1, 1, 1, 0] as [number, number, number, number],
      yOutput: [0, 0, 0, -40] as [number, number, number, number],
      scaleOutput: [1, 1, 1, 0.95] as [number, number, number, number],
    };
  } else if (index === 4) {
    return {
      inputRange: [0.76, 0.82, 0.95, 1.0] as [number, number, number, number],
      opacityOutput: [0, 1, 1, 1] as [number, number, number, number],
      yOutput: [40, 0, 0, 0] as [number, number, number, number],
      scaleOutput: [0.95, 1, 1, 1] as [number, number, number, number],
    };
  } else {
    const start = index * 0.2;
    const end = (index + 1) * 0.2;
    return {
      inputRange: [
        Number((start - 0.04).toFixed(3)),
        Number((start + 0.02).toFixed(3)),
        Number((end - 0.04).toFixed(3)),
        Number((end + 0.02).toFixed(3)),
      ] as [number, number, number, number],
      opacityOutput: [0, 1, 1, 0] as [number, number, number, number],
      yOutput: [40, 0, 0, -40] as [number, number, number, number],
      scaleOutput: [0.95, 1, 1, 0.95] as [number, number, number, number],
    };
  }
}

function PillarStepCard({
  pillar,
  index,
  scrollYProgress,
  shouldReduceMotion,
}: {
  pillar: (typeof PILLARS)[0];
  index: number;
  scrollYProgress: any;
  shouldReduceMotion: boolean;
}) {
  const Icon = pillar.icon;
  const range = getPillarRange(index);

  const opacity = useTransform(scrollYProgress, range.inputRange, range.opacityOutput);
  const y = useTransform(scrollYProgress, range.inputRange, range.yOutput);
  const scale = useTransform(scrollYProgress, range.inputRange, range.scaleOutput);

  return (
    <motion.div
      key={pillar.id}
      style={
        shouldReduceMotion
          ? { opacity: 1, position: "relative", marginBottom: "2rem" }
          : { opacity, y, scale }
      }
      className={shouldReduceMotion ? "" : "absolute inset-0 flex flex-col justify-center"}
    >
      <div className="glass p-12 rounded-3xl bg-surface border border-stroke backdrop-blur-xl shadow-2xl">
        <div
          className={`mb-6 inline-flex px-3 py-1.5 rounded text-sm font-bold mono border border-stroke bg-base/80 shadow-inner ${pillar.color}`}
        >
          {pillar.badge}
        </div>

        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <Icon className={`w-12 h-12 ${pillar.color}`} />
          </div>
          <h3 className="text-4xl font-display text-text font-bold">{pillar.title}</h3>
        </div>

        <p className="text-muted text-xl leading-relaxed max-w-lg">
          {pillar.description}
        </p>
      </div>
    </motion.div>
  );
}

export function FivePillars() {
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
    <section id="pillars" className="relative w-full bg-base">
      {/* Mobile view - Standard vertical flow */}
      <div className="md:hidden py-24 px-6 space-y-12">
        <div className="space-y-4">
          <h2 className="text-4xl font-display text-text font-bold">One teammate.<br />Five instincts.</h2>
        </div>
        
        <div className="space-y-8 relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-stroke -z-10" />
          
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.id} className="glass p-6 rounded-2xl relative bg-surface border border-stroke">
                <div className={`mb-4 inline-flex px-2 py-1 rounded text-xs font-bold mono border border-stroke bg-base/50 ${pillar.color}`}>
                  {pillar.badge}
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <Icon className={`w-8 h-8 ${pillar.color}`} />
                  <h3 className="text-2xl font-display text-text font-semibold">{pillar.title}</h3>
                </div>
                <p className="text-muted text-lg">{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop view - Pinned scroll sequence */}
      <div ref={containerRef} className="hidden md:block h-[500vh]">
        <div className="sticky top-0 h-screen flex items-center overflow-hidden py-12 px-8 lg:px-24">
          
          {/* Left Side: Headline & Progress */}
          <div className="w-2/5 h-full flex flex-col justify-center pr-12 relative">
            <h2 className="text-5xl lg:text-7xl font-display text-text font-bold leading-tight mb-8">
              One teammate.<br />
              <span className="text-muted">Five instincts.</span>
            </h2>
            
            <div className="relative h-64 w-full">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-stroke rounded-full overflow-hidden">
                <motion.div 
                  className="w-full bg-accent origin-top"
                  style={{ scaleY: smoothProgress, height: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Right Side: Step Cards */}
          <div className="w-3/5 h-full relative flex flex-col justify-center perspective-[1000px]">
            {PILLARS.map((pillar, i) => (
              <PillarStepCard
                key={pillar.id}
                pillar={pillar}
                index={i}
                scrollYProgress={scrollYProgress}
                shouldReduceMotion={shouldReduceMotion}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
