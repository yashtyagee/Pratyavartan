"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  CheckCircle2,
  Copy,
  ExternalLink,
  Smartphone,
  Sparkles,
  Volume2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";

interface PaytmQrStandeeProps {
  paymentId: string;
  merchantName?: string;
  amountInr: number;
  discountPercentage?: number;
  upiIntentUri?: string;
  paymentLink?: string;
  onPaymentSettled?: () => void;
  className?: string;
}

export function PaytmQrStandee({
  paymentId,
  merchantName = "Sharma General Store",
  amountInr = 2940.0,
  discountPercentage = 0,
  upiIntentUri,
  paymentLink,
  onPaymentSettled,
  className = "",
}: PaytmQrStandeeProps) {
  const [copied, setCopied] = useState(false);
  const [isSimulatingPay, setIsSimulatingPay] = useState(false);
  const [settledSuccess, setSettledSuccess] = useState(false);

  // Generate genuine NPCI compliant UPI Intent URI if not provided
  const rawVpa = "sharmageneral@paytm";
  const finalUpiUri =
    upiIntentUri ||
    `upi://pay?pa=${encodeURIComponent(rawVpa)}&pn=${encodeURIComponent(
      merchantName
    )}&am=${amountInr.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
      `Pratyavartan Recovery ${paymentId || "Kirana"}`
    )}`;

  const finalPaymentLink =
    paymentLink || `https://rzp.io/i/plink_${(paymentId || "recovery").slice(-8)}`;

  const handleCopyUri = () => {
    navigator.clipboard.writeText(finalUpiUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async () => {
    if (!paymentId || isSimulatingPay) return;
    setIsSimulatingPay(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/simulate-customer-pays/${encodeURIComponent(paymentId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (res.ok) {
        setSettledSuccess(true);
        if (onPaymentSettled) onPaymentSettled();
      }
    } catch {
      // ignore
    } finally {
      setIsSimulatingPay(false);
    }
  };

  return (
    <div
      className={`relative mx-auto flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-[#00BAF2]/40 bg-[#001433] text-white shadow-[0_10px_40px_rgba(0,41,112,0.6)] ${className}`}
    >
      {/* Top Paytm Standee Header */}
      <div className="relative bg-gradient-to-r from-[#002970] via-[#00408a] to-[#002970] px-5 py-3 text-center border-b border-[#00BAF2]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#00BAF2] animate-ping" />
            <span className="font-mono text-[10px] font-bold tracking-widest text-[#00BAF2] uppercase">
              Paytm Soundbox 4.0
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-[#00BAF2]/20 px-2 py-0.5 text-[9px] font-semibold text-[#00BAF2] border border-[#00BAF2]/40">
            <ShieldCheck className="h-3 w-3" />
            <span>NPCI Verified</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="font-display text-xl font-extrabold tracking-tight text-white">
            Pay<span className="text-[#00BAF2]">tm</span>
          </span>
          <span className="text-xs text-white/70 font-medium">| Accepted Here</span>
        </div>

        <div className="mt-0.5 text-xs font-semibold text-white/90 truncate">
          {merchantName}
        </div>
        <div className="font-mono text-[10px] text-[#00BAF2]/90">
          VPA: {rawVpa}
        </div>
      </div>

      {/* Amount Display Card */}
      <div className="bg-[#001E4D]/80 px-4 py-2.5 text-center border-b border-white/10">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-white/70">Recovery Payable:</span>
          <span className="font-display text-2xl font-black text-white tracking-tight">
            ₹{amountInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        {discountPercentage > 0 && (
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
            <Sparkles className="h-3 w-3" />
            <span>{discountPercentage}% Instant Discount Applied</span>
          </div>
        )}
      </div>

      {/* QR Code Container with High-Contrast White Background for 100% Scannability */}
      <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-[#001433] to-[#000d21]">
        <div className="relative rounded-2xl bg-white p-3.5 shadow-[0_0_25px_rgba(0,186,242,0.3)] border-2 border-[#00BAF2]">
          <QRCodeSVG
            value={finalUpiUri}
            size={180}
            level="M"
            includeMargin={false}
            className="rounded-lg"
          />

          {/* Center Logo Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md border border-slate-200">
              <span className="font-display text-[10px] font-black text-[#002970]">
                Pay<span className="text-[#00BAF2]">tm</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-white/80">
          <Smartphone className="h-3.5 w-3.5 text-[#00BAF2]" />
          <span>Point any camera or UPI app to pay</span>
        </div>

        {/* Accepted Apps Bar */}
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-[10px] text-white/70 border border-white/10 font-mono">
          <span className="text-[#00BAF2] font-semibold">GPay</span> •
          <span className="text-purple-300 font-semibold">PhonePe</span> •
          <span className="text-[#00BAF2] font-semibold">Paytm</span> •
          <span className="text-emerald-300 font-semibold">BHIM</span>
        </div>
      </div>

      {/* Action Controls & Soundbox Simulation */}
      <div className="p-4 bg-[#00183b] border-t border-white/10 space-y-2">
        {settledSuccess ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-xs font-bold text-emerald-300 border border-emerald-500/40 animate-pulse">
            <CheckCircle2 className="h-4 w-4" />
            <span>Soundbox Alert: Payment Verified & Settled!</span>
          </div>
        ) : (
          <button
            onClick={handleSimulatePayment}
            disabled={isSimulatingPay}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00BAF2] to-[#0088cc] py-2.5 font-display text-xs font-bold text-slate-950 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 shadow-[0_0_20px_rgba(0,186,242,0.4)] cursor-pointer"
          >
            <Zap className="h-4 w-4 fill-current" />
            <span>
              {isSimulatingPay
                ? "Simulating Live UPI Webhook..."
                : `Simulate Customer Scan & Pay (₹${amountInr.toLocaleString("en-IN")})`}
            </span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
          <button
            onClick={handleCopyUri}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-1.5 text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Copy className="h-3 w-3 text-[#00BAF2]" />
            <span>{copied ? "Copied UPI!" : "Copy UPI URI"}</span>
          </button>

          <a
            href={finalUpiUri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-1.5 text-white/90 hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="h-3 w-3 text-[#00BAF2]" />
            <span>1-Click App Pay</span>
          </a>
        </div>
      </div>
    </div>
  );
}
