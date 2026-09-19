"use client";

import { motion } from "framer-motion";
import { UserCheck, AlertTriangle, ShieldAlert, Lock } from "lucide-react";
import TiltCard from "@/components/ui/tilt-card";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export function MemoryLayer() {
  const prefersReducedMotion = useReducedMotion();

  const cards = [
    {
      id: "standard",
      title: "Clean history. Full recovery toolkit available. Dynamic discounts, voice outreach, payment links.",
      badge: "STANDARD",
      icon: <UserCheck className="w-8 h-8 text-recovered mb-4" />,
      borderClass: "border-t-recovered",
      badgeClass: "bg-recovered/10 text-recovered border-recovered/20"
    },
    {
      id: "medium",
      title: "1 broken promise detected. Reduced outreach frequency. Voice reminders continue. Escalation threshold lowered.",
      badge: "MEDIUM_RISK",
      icon: <AlertTriangle className="w-8 h-8 text-monitor mb-4" />,
      borderClass: "border-t-monitor",
      badgeClass: "bg-monitor/10 text-monitor border-monitor/20"
    },
    {
      id: "high",
      title: "≥2 broken promises. Outreach stopped entirely. Human escalation triggered. STOPPING_RULE_TRIGGERED logged.",
      badge: "HIGH_RISK · ESCALATE_HUMAN",
      icon: <ShieldAlert className="w-8 h-8 text-critical mb-4" />,
      borderClass: "border-t-critical",
      badgeClass: "bg-critical/10 text-critical border-critical/20"
    }
  ];

  return (
    <section id="memory" className="py-24 sm:py-32 relative">
      <div className="container px-6 mx-auto">
        <div className="mb-16 md:text-center max-w-2xl md:mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-text mb-4"
          >
            Memory that protects both sides.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted"
          >
            Customer behavior history drives every decision. Bad actors are auto-blocked.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <TiltCard className={`h-full p-8 border-t-4 ${card.borderClass} flex flex-col justify-between`}>
                <div>
                  {card.icon}
                  <p className="text-text text-base leading-relaxed mb-8">
                    {card.title}
                  </p>
                </div>
                <div className={`inline-flex self-start px-3 py-1 rounded-full border text-xs font-mono font-bold tracking-wide ${card.badgeClass}`}>
                  {card.badge}
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-md bg-surface/50 border border-monitor/30 rounded-lg p-4 flex items-center justify-center gap-3 backdrop-blur-sm"
        >
          <Lock className="w-4 h-4 text-monitor" />
          <span className="font-mono text-sm text-monitor">Stopping rules are hard-coded, not suggested.</span>
        </motion.div>
      </div>
    </section>
  );
}
