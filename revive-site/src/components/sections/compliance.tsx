"use client";

import { motion } from 'framer-motion';
import { Scale, ShieldCheck, ScrollText } from 'lucide-react';
import { useReducedMotion } from '@/lib/use-reduced-motion';

const CARDS = [
  {
    icon: Scale,
    title: "RBI Fair Practices",
    desc: [
      "Outreach window: 9:00-21:00 IST only",
      "Retry cap: ≥2 broken promises halts all outreach",
      "STOPPING_RULE_TRIGGERED logged on every block"
    ],
    severity: "recovered"
  },
  {
    icon: ShieldCheck,
    title: "PCI-DSS v4.0",
    desc: [
      "Zero raw card data storage",
      "Contact masking: ******3210",
      "HMAC-SHA256 webhook verification"
    ],
    severity: "accent"
  },
  {
    icon: ScrollText,
    title: "Append-Only Immutability",
    desc: [
      "No UPDATE or DELETE on audit_logs",
      "SHA-256 hash chaining: each record links to previous",
      "Tamper detection: broken chain = instant alert"
    ],
    severity: "ai"
  }
];

export function Compliance() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="compliance" className="py-32 bg-base relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none filter url(#noise)" />
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-4xl md:text-5xl text-text">
            Compliance is architecture,<br/>not afterthought.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: prefersReducedMotion ? 0 : i * 0.15 }}
              className="glass p-8 rounded-2xl border-t-4"
              style={{ borderTopColor: `var(--${card.severity})` }}
            >
              <card.icon className="w-12 h-12 mb-6" style={{ color: `var(--${card.severity})` }} />
              <h3 className="text-xl font-display text-text mb-4">{card.title}</h3>
              <ul className="space-y-3">
                {card.desc.map((item, j) => (
                  <li key={j} className="text-muted text-sm flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: `var(--${card.severity})` }} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
