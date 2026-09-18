"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const ACTIONS = [
  { name: "RETRY NOW", p: 31 },
  { name: "SMART RETRY LATER", p: 58 },
  { name: "UPI 1-CLICK INTENT", p: 79 },
  { name: "CARD/EMI PAYMENT LINK", p: 87, optimal: true },
];

/** Section 8 — teal probability bars, copper optimal glow, amber confidence preview. */
export default function RecoveryStrategy() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bar-fill",
        { scaleX: 0 },
        {
          scaleX: 1,
          transformOrigin: "left center",
          ease: "power2.out",
          stagger: 0.15,
          scrollTrigger: { trigger: el, start: "top 70%", end: "top 25%", scrub: true },
        }
      );
      gsap.fromTo(
        ".pct",
        { textContent: 0 },
        {
          textContent: (i: number, t: Element) => (t as HTMLElement).dataset.p as string,
          snap: { textContent: 1 },
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 60%", once: true },
        }
      );
      gsap.fromTo(
        ".optimal",
        { boxShadow: "0 0 0 rgba(205,127,50,0)" },
        { boxShadow: "0 0 100px rgba(205,127,50,0.18)", scrollTrigger: { trigger: el, start: "top 40%", end: "top 10%", scrub: true } }
      );
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={root} className="relative mx-auto max-w-7xl px-6 py-32">
      <p className="mono text-xs uppercase tracking-[0.3em] text-body/40">Recovery strategy · live evaluation</p>
      <h2 className="font-display mt-4 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
        Four paths. One <span className="serif-it grad-text">highest probability.</span>
      </h2>
      <p className="mt-4 max-w-xl text-sm italic text-copper/80">
        Probabilities shown are illustrative of the scoring model — the AI Teammate (#AI-001) computes them per transaction at decision time.
      </p>

      <ul className="mt-14 space-y-5" aria-label="Recovery action probabilities">
        {ACTIONS.map((a) => (
          <li key={a.name}>
            <div className="mb-2 flex items-center justify-between">
              <span className={`mono text-sm ${a.optimal ? "font-semibold text-copper" : "text-body/75"}`}>
                {a.name}
                {a.optimal && <span className="ml-3 rounded border border-copper/50 px-2 py-0.5 text-[10px] tracking-widest">OPTIMAL</span>}
              </span>
              <span className={`mono text-sm ${a.optimal ? "text-copper" : "text-body/50"}`}>
                <span className="pct" data-p={a.p}>0</span>%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className={`bar-fill h-full rounded-full ${a.optimal ? "bg-copper" : "bg-teal/80"}`}
                style={{ width: `${a.p}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="optimal fine-card amber-pulse mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl !border-copper/50 p-8 transition-shadow duration-700 md:flex-row md:items-center">
        <div>
          <p className="mono text-xs tracking-widest text-body/40">SELECTED ACTION</p>
          <p className="serif-it mt-2 text-3xl text-copper">Generate Card/EMI payment link</p>
          <p className="mt-2 text-sm text-body/55">Full amount preserved · zero discount · instant 1-tap Kirana payment.</p>
        </div>
        <div className="text-right">
          <p className="mono text-xs tracking-widest text-body/40">CONFIDENCE</p>
          <p className="mono text-5xl font-bold text-amber">94%</p>
        </div>
      </div>
    </section>
  );
}
