"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  QrCode,
  Wallet,
  Banknote,
  ServerOff,
  CalendarX,
} from "lucide-react";
import TiltCard from "@/components/ui/tilt-card";

/* ---------- MARQUEE ---------- */
const TICKER_ITEMS = [
  { label: "QR DROPOFF", icon: QrCode },
  { label: "UPI LIMIT EXCEEDED", icon: Wallet },
  { label: "INSUFFICIENT BALANCE", icon: Banknote },
  { label: "BANK DOWNTIME", icon: ServerOff },
  { label: "MANDATE DECLINE", icon: CalendarX },
];

function InfiniteMarquee() {
  // Duplicate for seamless loop
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="relative overflow-hidden py-6">
      {/* Left fade */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#05070D] to-transparent" />
      {/* Right fade */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#05070D] to-transparent" />

      <div className="flex w-max animate-[marquee_30s_linear_infinite] items-center gap-8">
        {items.map(({ label, icon: Icon }, i) => (
          <span
            key={`${label}-${i}`}
            className="flex items-center gap-3 whitespace-nowrap"
          >
            <Icon className="h-4 w-4 text-[#FF4D6D]" />
            <span className="mono text-sm font-medium tracking-wider text-[#8A93A6]">
              {label}
            </span>
            <span className="text-[#8A93A6]/30">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- FAILURE CARDS ---------- */
const FAILURES = [
  {
    code: "QR_FAIL",
    icon: QrCode,
    title: "QR Code Dropoff",
    stat: "₹847 avg ticket",
    description: "Customer scans QR but payment fails mid-flow. Session lost, cart abandoned.",
    color: "#FF4D6D",
    borderClass: "border-t-[#FF4D6D]",
  },
  {
    code: "UPI_LIMIT",
    icon: Wallet,
    title: "UPI Limit Exceeded",
    stat: "₹1L daily cap",
    description: "Transaction blocked by PSP daily limit. Customer unaware until failure.",
    color: "#FBBF24",
    borderClass: "border-t-[#FBBF24]",
  },
  {
    code: "INSUFFICIENT_BALANCE",
    icon: Banknote,
    title: "Insufficient Balance",
    stat: "34% of failures",
    description: "Most common failure. Customer has intent but not enough funds in linked account.",
    color: "#FF4D6D",
    borderClass: "border-t-[#FF4D6D]",
  },
  {
    code: "BANK_DOWN",
    icon: ServerOff,
    title: "Bank Downtime",
    stat: "3–4hr avg outage",
    description: "Bank server maintenance windows. Payments silently fail. No customer fault.",
    color: "#FBBF24",
    borderClass: "border-t-[#FBBF24]",
  },
  {
    code: "MANDATE_FAIL",
    icon: CalendarX,
    title: "Mandate Decline",
    stat: "22% bounce rate",
    description: "Recurring payment mandate rejected. Subscription revenue at risk.",
    color: "#8B5CF6",
    borderClass: "border-t-[#8B5CF6]",
  },
];

export default function ProblemMarquee() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <section className="relative py-24">
      {/* Marquee */}
      <InfiniteMarquee />

      {/* Cards */}
      <div
        ref={ref}
        className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-5 px-6 sm:grid-cols-2 lg:grid-cols-5"
      >
        {FAILURES.map((f, i) => (
          <motion.div
            key={f.code}
            initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={
              inView
                ? { opacity: 1, clipPath: "inset(0 0 0% 0)" }
                : undefined
            }
            transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
          >
            <TiltCard
              className={`group border-t-[3px] ${f.borderClass} p-5`}
              glareColor={`${f.color}20`}
            >
              <f.icon
                className="mb-3 h-6 w-6"
                style={{ color: f.color }}
              />
              <h3 className="font-display text-sm font-semibold text-[#E8ECF4]">
                {f.title}
              </h3>
              <p
                className="mono mt-1 text-xs font-medium"
                style={{ color: f.color }}
              >
                {f.stat}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#8A93A6]">
                {f.description}
              </p>
              <span className="mono mt-3 inline-block rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[9px] text-[#8A93A6]">
                {f.code}
              </span>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
