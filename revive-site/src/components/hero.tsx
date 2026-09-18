"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Play } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import Scramble from "@/components/cinema/scramble";
import WeightWord from "@/components/cinema/weight-word";
import Magnetic from "@/components/cinema/magnetic";
import { CONSOLE_URL } from "@/lib/constants";

/**
 * Slow intelligent transaction network — teal/cyan (cold, technical) signals
 * pulsing into a settlement hub. Every dot carries payment meaning.
 */
const SIGNALS = ["UPI", "CARD", "EMI", "BANK", "MANDATE", "CUSTOMER", "RISK", "HISTORY", "TIMING", "FAILURE CODE"];

function SignalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Node = { x: number; y: number; vx: number; vy: number; r: number; label?: string; hub?: boolean };
    let nodes: Node[] = [];

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodes = [{ x: w * 0.62, y: h * 0.5, vx: 0, vy: 0, r: 4, hub: true }];
      SIGNALS.forEach((label, i) => {
        const a = (i / SIGNALS.length) * Math.PI * 2;
        nodes.push({
          x: w * 0.62 + Math.cos(a) * (w * 0.3),
          y: h * 0.5 + Math.sin(a) * (h * 0.34),
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          r: 2.6,
          label,
        });
      });
      for (let i = 0; i < 26; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: 1 + Math.random() * 1.2,
        });
      }
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const hub = nodes[0];

      for (const n of nodes) {
        if (!reduced) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
        if (!n.hub && !n.label) continue;
        ctx.strokeStyle = `rgba(32,178,170,${n.label ? 0.25 : 0.08})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(hub.x, hub.y);
        ctx.stroke();

        if (!reduced && n.label) {
          const t = (Date.now() % 2600) / 2600;
          ctx.fillStyle = "rgba(127,214,208,0.85)";
          ctx.beginPath();
          ctx.arc(n.x + (hub.x - n.x) * t, n.y + (hub.y - n.y) * t, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = n.hub ? "#20b2aa" : n.label ? "rgba(32,178,170,0.9)" : "rgba(224,224,224,0.35)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        if (n.hub) {
          ctx.strokeStyle = "rgba(205,127,50,0.45)";
          ctx.beginPath();
          ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (n.label) {
          ctx.font = "500 11px 'JetBrains Mono', monospace";
          ctx.fillStyle = "rgba(224,224,224,0.6)";
          ctx.fillText(n.label, n.x + 8, n.y + 3);
        }
      }
    };

    const loop = () => {
      if (!running) return;
      draw();
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) draw();
    else raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw();
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([e]) => {
      if (reduced) return;
      if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(loop); }
      else if (!e.isIntersecting) { running = false; cancelAnimationFrame(raf); }
    });
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [reduced]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

export default function Hero() {
  return (
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden">
      <SignalCanvas />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#1a1a1a_88%)]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-36 text-center">
        <p className="mono mb-6 text-xs uppercase tracking-[0.3em] text-teal">Digital Employee #AI-001 · Kirana Merchant AI Teammate</p>
        <h1 className="font-display mx-auto max-w-4xl text-5xl font-bold leading-[1.04] tracking-tight text-white md:text-7xl">
          <Scramble text="Payment failures aren’t the end." />
          <br />
          <span className="serif-it grad-text-teal"><WeightWord text="They’re decisions." /></span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-body/70">
          Pratyavartan is the Digital Employee #AI-001 for merchants. It understands why a Kirana QR payment failed, decides what should happen next, and autonomously executes the highest-probability recovery — inside bounded, audited guardrails.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic><a
            href={CONSOLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full bg-teal px-6 py-3 font-semibold text-[#06201e] transition-all hover:bg-copper hover:text-white"
          >
            Launch War Room
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </a></Magnetic>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-medium text-body/80 transition-colors hover:border-copper/60 hover:text-white"
          >
            <Play className="h-4 w-4" aria-hidden />
            Explore Architecture
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2" aria-hidden>
        <div className="h-10 w-px animate-pulse bg-gradient-to-b from-transparent via-teal/70 to-transparent" />
      </div>
    </section>
  );
}
