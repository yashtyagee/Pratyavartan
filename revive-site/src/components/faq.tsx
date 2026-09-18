"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What is Pratyavartan?",
    a: "Your Paytm Merchant's AI Teammate (Digital Employee #AI-001). It ingests HMAC-verified failure webhooks, diagnoses Kirana QR and retail payment failures, picks the highest-probability recovery action, executes it, and writes every step to a hash-chained audit ledger.",
    key: "AI Teammate",
  },
  {
    q: "Is the AI unrestricted?",
    a: "No — bounded autonomy. Hard stopping rules supersede any model output: retry cap ≤ 2 per payment, confidence threshold before acting, and UNKNOWN diagnoses always escalate to a human.",
    key: "bounded autonomy",
  },
  {
    q: "Does it spam customers?",
    a: "No. Outreach is confined to the RBI-permitted 9:00–21:00 IST window, the retry cap prevents harassment loops, and bank-downtime diagnoses trigger silent monitoring instead of messages.",
    key: "RBI window",
  },
  {
    q: "What happens when the AI is unsure?",
    a: "It escalates. LOW-confidence or UNKNOWN diagnoses route to ESCALATE_HUMAN with the full reasoning trail attached — a human decides with complete context.",
    key: "escalate",
  },
  {
    q: "Is the audit trail editable?",
    a: "No. The ledger is append-only and SHA-256 hash-chained: each record commits its predecessor's digest, so tampering with history is cryptographically evident.",
    key: "hash-chained",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative px-6 py-32">
      <div className="mx-auto max-w-3xl">
        <p className="mono text-xs uppercase tracking-[0.3em] text-body/40">FAQ</p>
        <h2 className="font-display mt-4 text-4xl font-bold tracking-tight md:text-5xl">
          Asked, <span className="grad-text">answered.</span>
        </h2>

        <div className="mt-12 divide-y divide-white/8 border-y border-white/8">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span className="font-display text-lg font-medium text-white">{f.q}</span>
                  <span
                    className={`mono shrink-0 text-xl transition-transform duration-300 ${isOpen ? "rotate-45 text-copper" : "text-teal"}`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-7 pr-10 text-sm leading-relaxed text-body/70">
                      {f.a.split(f.key)[0]}
                      <span className={f.key === "hash-chained" || f.key === "RBI window" ? "text-teal" : "text-copper"}>
                        {f.key}
                      </span>
                      {f.a.split(f.key)[1]}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
