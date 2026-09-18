"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const SIGNALS = ["CUSTOMER", "PAYMENT", "HISTORY", "BANK", "TIMING", "VALUE", "FAILURE", "BEHAVIOUR", "RISK"];

/** Section 6 — teal signal streams converge into a pulsing copper→teal core. */
export default function AgentSection() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".orbit-sig",
        { autoAlpha: 0.25 },
        { autoAlpha: 1, stagger: 0.05, scrollTrigger: { trigger: el, start: "top bottom", end: "center center", scrub: true } }
      );
      document.querySelectorAll<HTMLElement>(".orbit-sig").forEach((n) => {
        const dx = n.dataset.dx ?? "0";
        const dy = n.dataset.dy ?? "0";
        gsap.fromTo(
          n,
          { x: `${dx}`, y: `${dy}` },
          {
            x: "0%",
            y: "0%",
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "center 55%", scrub: true },
          }
        );
      });
      gsap.fromTo(
        ".agent-core",
        { scale: 0.7, filter: "blur(8px)" },
        { scale: 1, filter: "blur(0px)", scrollTrigger: { trigger: el, start: "top bottom", end: "center center", scrub: true } }
      );
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={root} className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-28">
      <div className="text-center">
        <p className="mono text-xs uppercase tracking-[0.3em] text-body/40">The AI Teammate</p>
        <h2 className="font-display mt-4 text-5xl font-bold tracking-tight md:text-6xl">
          Meet your Merchant's <span className="serif-it grad-text-teal">AI Teammate (#AI-001)</span>
        </h2>

        <div className="relative mx-auto mt-20 aspect-square w-full max-w-xl">
          {SIGNALS.map((s, i) => {
            const a = (i / SIGNALS.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <span
                key={s}
                data-dx={`${Math.cos(a) * 160}px`}
                data-dy={`${Math.sin(a) * 160}px`}
                className="orbit-sig mono absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal/30 bg-canvas/80 px-3 py-1 text-[10px] tracking-wider text-teal"
              >
                {s}
              </span>
            );
          })}
          <div className="agent-core core-pulse absolute left-1/2 top-1/2 flex h-36 w-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-canvas">
            <span className="grad-text font-display text-lg font-bold tracking-[0.14em]">प्रत्यावर्तन</span>
          </div>
        </div>
      </div>
    </section>
  );
}
