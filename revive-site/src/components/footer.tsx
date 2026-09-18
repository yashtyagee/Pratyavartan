import { CONSOLE_URL, API_DOCS_URL } from "@/lib/constants";

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "PRODUCT",
    links: [
      { label: "AI Teammate (#AI-001)", href: "#how-it-works" },
      { label: "Decision Core", href: "#intelligence" },
      { label: "Guardrails", href: "#recovery" },
      { label: "Live War Room", href: CONSOLE_URL, external: true },
    ],
  },
  {
    title: "PLATFORM",
    links: [
      { label: "Live Console", href: CONSOLE_URL, external: true },
      { label: "Interactive API Docs", href: API_DOCS_URL, external: true },
      { label: "Webhooks Engine", href: "#how-it-works" },
      { label: "Audit Ledger", href: CONSOLE_URL, external: true },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "About Pravart", href: "#top" },
      { label: "Razorpay Buildathon", href: "#top" },
      { label: "Architecture", href: "#how-it-works" },
      { label: "System Status", href: CONSOLE_URL, external: true },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "API Reference", href: API_DOCS_URL, external: true },
      { label: "Compliance Notes", href: "#recovery" },
      { label: "Developer Guide", href: "#how-it-works" },
      { label: "GitHub Repo", href: "#top" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/8 px-6 pb-10 pt-20">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.2fr_repeat(4,1fr)]">
        <div>
          <p className="flex items-baseline gap-2">
            <span className="grad-text font-display text-xl font-bold">प्रत्यावर्तन</span>
            <span className="font-display text-sm tracking-[0.22em] text-white">PRAVART</span>
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-body/50">
            Your Paytm Merchant's AI Teammate (Digital Employee #AI-001). Bounded by policy, proven by a hash-chained audit ledger.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="mono text-xs tracking-widest text-teal/80">{c.title}</p>
            <ul className="mt-5 space-y-3">
              {c.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target={l.external ? "_blank" : undefined}
                    rel={l.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-body/60 transition-colors hover:text-copper"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* giant Devanagari wordmark — copper gradient, ~200px on desktop */}
      <div className="pointer-events-none relative mt-16 select-none overflow-hidden" aria-hidden>
        <p
          className="grad-text whitespace-nowrap text-center font-bold leading-none"
          style={{ fontSize: "clamp(72px, 16vw, 200px)" }}
        >
          प्रत्यावर्तन
        </p>
      </div>

      <div className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-6">
        <p className="mono text-xs text-teal">© Pratyavartan 2026</p>
        <div className="flex gap-6 text-xs text-body/40">
          <a href="#top" className="transition-colors hover:text-copper">Privacy</a>
          <a href="#top" className="transition-colors hover:text-copper">Terms</a>
        </div>
      </div>
    </footer>
  );
}
