"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import { AlertTriangle, BrainCircuit, Clock, Search, CheckCircle, Phone, AlertOctagon, Send, Eye } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export function Orchestration() {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const pathLength = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <section id="orchestration" ref={containerRef} className="py-24 sm:py-32 relative border-t border-stroke bg-base">
      <div className="container px-6 mx-auto">
        
        <div className="mb-16 md:text-center max-w-2xl md:mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-text mb-4"
          >
            Orchestration with guardrails.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted"
          >
            RBI-compliant retry windows. Promise tracking. Automated escalation.
          </motion.p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-center">
          
          {/* LEFT: Node Graph (55%) */}
          <div className="w-full lg:w-[55%] relative glass border border-stroke rounded-2xl p-6 sm:p-8 bg-surface backdrop-blur-xl min-h-[500px] flex items-center justify-center">
            
            {/* Connecting Lines SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {/* Note: In a real implementation, path coordinates would be precisely mapped to node positions. Using illustrative paths here. */}
              <motion.path
                d="M 100 80 L 100 150"
                stroke="var(--stroke)"
                strokeWidth="2"
                fill="none"
                style={{ pathLength: prefersReducedMotion ? 1 : pathLength }}
              />
              <motion.path
                d="M 100 230 L 100 300"
                stroke="var(--stroke)"
                strokeWidth="2"
                fill="none"
                style={{ pathLength: prefersReducedMotion ? 1 : pathLength }}
              />
              <motion.path
                d="M 100 380 L 50 420"
                stroke="var(--stroke)"
                strokeWidth="2"
                fill="none"
                style={{ pathLength: prefersReducedMotion ? 1 : pathLength }}
              />
              <motion.path
                d="M 100 380 L 250 420 L 250 450"
                stroke="var(--stroke)"
                strokeWidth="2"
                fill="none"
                style={{ pathLength: prefersReducedMotion ? 1 : pathLength }}
              />
            </svg>

            <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
              
              <NodeCard icon={<AlertTriangle className="text-critical" />} label="Payment Failed" delay={0.1} />
              <NodeCard icon={<BrainCircuit className="text-ai" />} label="AI Diagnosis" delay={0.2} />
              
              <div className="mx-auto w-32 py-2 text-center border border-stroke bg-surface rotate-3 font-mono text-xs text-muted">
                Promise-to-Pay?
              </div>
              
              <div className="grid grid-cols-2 gap-6 w-full">
                {/* YES Branch */}
                <div className="flex flex-col gap-4">
                  <div className="text-[10px] text-center font-bold text-recovered tracking-widest">YES</div>
                  <NodeCard icon={<Clock className="text-monitor" />} label="Wait Grace Period" delay={0.4} small />
                  <NodeCard icon={<Search className="text-text" />} label="Check Status" delay={0.5} small />
                  <div className="flex flex-col gap-2 pl-4 border-l border-stroke">
                    <NodeCard icon={<CheckCircle className="text-recovered" />} label="RECOVERED" delay={0.6} small />
                    <NodeCard icon={<Phone className="text-ai" />} label="Voice Reminder" delay={0.7} small />
                    <NodeCard icon={<AlertOctagon className="text-critical" />} label="Escalate" delay={0.8} small />
                  </div>
                </div>

                {/* NO Branch */}
                <div className="flex flex-col gap-4 pt-[18px]">
                  <div className="text-[10px] text-center font-bold text-critical tracking-widest">NO</div>
                  <NodeCard icon={<Send className="text-accent" />} label="Send Recovery Link" delay={0.4} small />
                  <NodeCard icon={<Eye className="text-monitor" />} label="Monitor" delay={0.5} small />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Compliance Clock (45%) */}
          <div className="w-full lg:w-[45%] flex flex-col gap-8">
            <div className="glass border border-stroke rounded-2xl p-8 bg-surface backdrop-blur-xl relative overflow-hidden flex flex-col items-center justify-center">
              
              <div className="relative w-64 h-64 mb-8">
                {/* Clock SVG */}
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {/* Background Circle */}
                  <circle cx="50" cy="50" r="45" fill="none" stroke="var(--stroke)" strokeWidth="2" />
                  
                  {/* Invalid Window (21:00 - 9:00) => 270deg to 135deg visually if mapped to 24h. 
                      Let's simplify: 24h dial. 12 at top. 
                      9 to 21 is bottom half. */}
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="var(--critical)" 
                    strokeWidth="4" 
                    strokeDasharray="283" 
                    strokeDashoffset="141.5" 
                    className="opacity-50"
                  />
                  
                  {/* Valid Window (9:00 - 21:00) */}
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="var(--recovered)" 
                    strokeWidth="4" 
                    strokeDasharray="283" 
                    strokeDashoffset="-141.5" 
                  />
                  
                  {/* Ticks */}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <line 
                      key={i}
                      x1="50" y1="5" x2="50" y2="9"
                      stroke="var(--muted)"
                      strokeWidth="1"
                      transform={`rotate(${i * 15} 50 50)`}
                    />
                  ))}
                  
                  {/* Labels */}
                  <text x="50" y="25" fill="var(--text)" fontSize="8" textAnchor="middle" transform="rotate(90 50 50)">00:00</text>
                  <text x="50" y="80" fill="var(--text)" fontSize="8" textAnchor="middle" transform="rotate(90 50 50)">12:00</text>
                  <text x="25" y="52.5" fill="var(--recovered)" fontSize="8" textAnchor="middle" transform="rotate(90 50 50)">09:00</text>
                  <text x="75" y="52.5" fill="var(--recovered)" fontSize="8" textAnchor="middle" transform="rotate(90 50 50)">21:00</text>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xs font-mono text-muted">IST WINDOW</div>
                    <div className="text-lg font-bold text-recovered">09:00-21:00</div>
                  </div>
                </div>
              </div>

              <div className="w-full bg-base border border-monitor/30 rounded-lg p-4">
                <p className="text-sm text-text font-medium mb-2">
                  "Promise at 23:00 IST → Clamped to 21:00 IST next day"
                </p>
                <span className="inline-block px-2 py-1 bg-monitor/10 text-monitor border border-monitor/20 rounded text-[10px] font-mono uppercase">
                  clamped=true
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold tracking-widest text-muted uppercase">Mandate Retry Timeline</div>
              <div className="glass border border-stroke rounded-xl p-4 flex flex-col gap-4 text-sm font-mono text-text">
                <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-accent"></div> Attempt 1: Tomorrow 10:30</div>
                <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-monitor"></div> Attempt 2: Day-after 10:30</div>
                <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-critical"></div> Attempt 3: 1st next month</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

function NodeCard({ icon, label, delay, small = false }: { icon: React.ReactNode, label: string, delay: number, small?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay, duration: 0.4 }}
      className={`flex items-center gap-3 bg-surface border border-stroke rounded-lg mx-auto w-full ${small ? 'p-2 max-w-[160px]' : 'p-4 max-w-[240px]'}`}
    >
      <div className={`flex-shrink-0 ${small ? 'w-5 h-5' : 'w-6 h-6'}`}>
        {icon}
      </div>
      <span className={`font-medium text-text ${small ? 'text-xs' : 'text-sm'}`}>{label}</span>
    </motion.div>
  );
}
