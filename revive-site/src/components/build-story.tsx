const STORIES = [
  {
    broke: "Sarvam AI / Cognee API timeout",
    out: "Reliability Fallback Safety Net engaged — voice instantly failed over to gTTS, and context memory safely committed to local SQLite WAL ledger.",
    code: "voice = sarvam_tts() or gtts_fallback()\nmem = cognee_sync() or sqlite_wal()",
  },
  {
    broke: "LLM provider went 404 mid-demo",
    out: "Deterministic fallback engine took over — the sweep never stopped, diagnosis continued on hard-coded rules.",
    code: "fallback_diag = heuristic_classifier(err)",
  },
  {
    broke: "Gateway test quota exhausted",
    out: "Link caching layer born — recovery links are provisioned once, cached, and reused idempotently.",
    code: "link = link_cache.get_or_create(payment_id)",
  },
];

/** Built-in-public band — honest war stories from the real build. */
export default function BuildStory() {
  return (
    <section className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <p className="mono text-xs uppercase tracking-[0.3em] text-body/40">Built in public</p>
        <h2 className="font-display mt-4 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          What broke, and how we got out.
        </h2>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STORIES.map((s) => (
            <article key={s.broke} className="fine-card rounded-2xl !border-copper/30 p-8">
              <p className="font-display text-xl font-bold text-white">{s.broke}</p>
              <p className="mt-4 text-sm leading-relaxed text-body/65">{s.out}</p>
              <pre className="mono mt-6 overflow-x-auto rounded-lg border border-white/8 bg-black/40 p-4 text-[11px] text-teal">
                {s.code}
              </pre>
            </article>
          ))}
        </div>

        <p className="mt-10 text-sm text-white/60">
          No testimonials. Just <span className="text-copper">receipts</span>.
        </p>
      </div>
    </section>
  );
}
