import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource-variable/space-grotesk";
import "@fontsource/jetbrains-mono/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "प्रत्यावर्तन — Your Paytm Merchant's AI Teammate (Digital Employee #AI-001)",
  description:
    "Pratyavartan is the Digital Employee #AI-001 for Kirana and retail merchants. It understands why a payment failed, decides what should happen next, and autonomously executes the highest-probability recovery — inside bounded, audited guardrails.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className="bg-canvas text-body antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
