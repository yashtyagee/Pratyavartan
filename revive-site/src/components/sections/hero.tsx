"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
} from "framer-motion";
import {
  ArrowRight,
  Play,
  BrainCircuit,
  AudioWaveform,
  Lock,
  Workflow,
} from "lucide-react";
import StaggeredText from "@/components/ui/staggered-text";
import MagneticButton from "@/components/ui/magnetic-button";
import Counter from "@/components/ui/counter";
import { useLiveData } from "@/lib/use-live-data";
import { CONSOLE_URL, API_BASE_URL } from "@/lib/constants";

/* ---------- floating phone mockup ---------- */
function PhoneMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -45]);
  const rotate = useTransform(scrollYProgress, [0, 1], [2, -2]);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {/* Phone frame */}
      <motion.div
        style={{ y: y1, rotate }}
        className="relative h-[420px] w-[220px] rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(5,7,13,0.6)] p-3 shadow-[0_0_80px_rgba(0,186,242,0.08)] backdrop-blur-xl md:h-[520px] md:w-[260px]"
      >
        {/* Screen */}
        <div className="flex h-full flex-col gap-3 overflow-hidden rounded-[24px] bg-[rgba(0,0,0,0.4)] p-4">
          {/* Failed payment notification */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            className="rounded-xl border border-[rgba(255,77,109,0.3)] bg-[rgba(255,77,109,0.08)] p-3"
          >
            <p className="mono text-[10px] text-[#FF4D6D]">PAYMENT FAILED</p>
            <p className="mt-1 text-xs text-[#E8ECF4]">UPI Transaction</p>
            <p className="mono mt-0.5 text-sm font-semibold text-[#FF4D6D]">₹2,450.00</p>
          </motion.div>

          {/* Recovery voice note */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="rounded-xl border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.08)] p-3"
          >
            <p className="mono text-[10px] text-[#8B5CF6]">AI VOICE NOTE</p>
            <div className="mt-2 flex items-center gap-2">
              {/* Mini waveform */}
              <div className="flex h-5 items-end gap-[2px]">
                {[3, 8, 5, 12, 7, 10, 4, 9, 6, 11, 5, 8].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-[2px] rounded-full bg-[#8B5CF6]"
                    animate={{ height: [h, h * 0.4, h] }}
                    transition={{ duration: 0.8, delay: i * 0.06, repeat: Infinity }}
                    style={{ height: h }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-[#8A93A6]">0:12</span>
            </div>
            <p className="mt-2 text-[10px] italic text-[#E8ECF4]/70">
              &quot;Bhaiya, 5% discount ke saath...&quot;
            </p>
          </motion.div>

          {/* QR recovery card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.5, duration: 0.6 }}
            className="mt-auto rounded-xl border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] p-3 text-center"
          >
            <p className="mono text-[10px] text-[#22C55E]">RECOVERY LINK</p>
            <div className="mx-auto mt-2 h-12 w-12 rounded-lg border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.05)]">
              <div className="grid h-full w-full grid-cols-3 gap-[2px] p-1.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`rounded-[1px] ${i % 3 === 0 ? "bg-[#22C55E]" : "bg-[#22C55E]/30"}`} />
                ))}
              </div>
            </div>
            <p className="mono mt-1 text-[9px] text-[#22C55E]/70">rzp.io/i/x7k2m</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating orbit elements */}
      <motion.div
        style={{ y: y2 }}
        className="absolute -right-4 top-1/4 h-20 w-20 rounded-2xl border border-[rgba(0,186,242,0.15)] bg-[rgba(0,186,242,0.04)] p-3 backdrop-blur-sm md:right-8"
      >
        <BrainCircuit className="h-5 w-5 text-[#00BAF2]" />
        <p className="mono mt-1 text-[8px] text-[#8A93A6]">AI_DIAGNOSIS</p>
        <p className="mono text-[9px] text-[#E8ECF4]">P=0.75</p>
      </motion.div>

      <motion.div
        style={{ y: y3 }}
        className="absolute -left-4 bottom-1/3 h-16 w-28 rounded-2xl border border-[rgba(34,197,94,0.15)] bg-[rgba(34,197,94,0.04)] p-2.5 backdrop-blur-sm md:left-4"
      >
        <Lock className="h-4 w-4 text-[#22C55E]" />
        <p className="mono mt-0.5 text-[8px] text-[#22C55E]">SHA-256 ✓</p>
        <p className="mono text-[7px] text-[#8A93A6]">a3f9e2..7b1c</p>
      </motion.div>
    </div>
  );
}

/* ---------- status bar ---------- */
function StatusBar() {
  const techStack = [
    { icon: BrainCircuit, label: "Groq LLaMA 3.3" },
    { icon: AudioWaveform, label: "Sarvam Voice" },
    { icon: Lock, label: "SHA-256 Ledger" },
    { icon: Workflow, label: "n8n Orchestrator" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.6 }}
      className="glass mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-4 rounded-full px-5 py-2.5"
    >
      {/* Live dot */}
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
        </span>
        <span className="mono text-[11px] font-medium text-[#22C55E]">LIVE</span>
      </span>

      <span className="h-3 w-px bg-[rgba(255,255,255,0.08)]" />

      {techStack.map(({ icon: Icon, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-[#8A93A6]" />
          <span className="mono text-[10px] text-[#8A93A6]">{label}</span>
        </span>
      ))}
    </motion.div>
  );
}

/* ---------- HERO SECTION ---------- */
export default function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const { data: metrics } = useLiveData<{
    recovery_rate?: number;
    total_recovered_inr?: number;
  }>(API_BASE_URL + "/metrics", 15000, {
    recovery_rate: 78.4,
    total_recovered_inr: 14250,
  });

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden"
    >
      {/* Parallax background glow */}
      <motion.div
        style={{ y: bgY }}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,186,242,0.08),transparent_70%)]" />
        <div className="absolute right-1/4 top-1/2 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.06),transparent_70%)]" />
      </motion.div>

      {/* Phone mockup (parallax layers) */}
      <div className="hidden lg:block">
        <PhoneMockup />
      </div>

      {/* Content */}
      <motion.div
        style={{ opacity }}
        className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 pb-24 pt-32 text-center"
      >
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mono mb-6 text-xs uppercase tracking-[0.3em] text-[#00BAF2]"
        >
          Digital Employee #AI-001 · Autonomous Payment Recovery
        </motion.p>

        {/* Headline */}
        <StaggeredText
          text="Every failed payment deserves a second chance."
          className="font-display mx-auto max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-7xl"
          delay={0.3}
        />

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#8A93A6] sm:text-lg"
        >
          Pratyavartan is the autonomous AI teammate that recovers dropped UPI
          payments for Kirana merchants — 24/7, in Hinglish, with cryptographic
          proof.
        </motion.p>

        {/* Live stat chips */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <div className="glass flex items-center gap-3 rounded-full px-5 py-2.5">
            <span className="h-2 w-2 rounded-full bg-[#FF4D6D]" />
            <span className="text-sm text-[#FF4D6D]">18–30% failure rate</span>
          </div>
          <div className="mono text-[#8A93A6]">→</div>
          <div className="glass flex items-center gap-3 rounded-full px-5 py-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
              <span className="inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
            </span>
            <span className="text-sm text-[#22C55E]">
              <Counter
                target={metrics?.recovery_rate ?? 78.4}
                suffix="%"
                decimals={1}
                className="text-sm"
              />{" "}
              recovered
            </span>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticButton href="#simulation" variant="primary">
            Watch It Recover
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton href="#pillars" variant="ghost">
            <Play className="h-4 w-4" />
            Explore Architecture
          </MagneticButton>
        </motion.div>

        {/* Status bar */}
        <StatusBar />
      </motion.div>

      {/* Bottom scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2" aria-hidden>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-10 w-px bg-gradient-to-b from-transparent via-[#00BAF2]/60 to-transparent"
        />
      </div>
    </section>
  );
}
