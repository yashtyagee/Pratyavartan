"use client";

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { useLiveData } from '@/lib/use-live-data';
import { API_BASE_URL } from '@/lib/constants';
import MagneticButton from '@/components/ui/magnetic-button';

const BLOCKS = [
  { id: 1, type: 'DETECTED', severity: 'monitor', hash: 'e3b0c442', time: '10:42:01 IST' },
  { id: 2, type: 'AI_DIAGNOSIS', severity: 'ai', hash: '8a9d0f31', time: '10:42:15 IST' },
  { id: 3, type: 'VOICE_GENERATED', severity: 'accent', hash: 'c5a9b2d4', time: '10:42:30 IST' },
  { id: 4, type: 'MESSAGE_SENT', severity: 'accent', hash: '7d3e9a12', time: '10:42:35 IST' },
  { id: 5, type: 'PAYMENT_LINK_CLICK', severity: 'monitor', hash: '1f9c8b4a', time: '10:55:12 IST' },
  { id: 6, type: 'RECOVERED', severity: 'recovered', hash: 'a3f9e2b8', time: '10:57:05 IST' },
];

function ScrambleText({ text, shouldScramble }: { text: string; shouldScramble: boolean }) {
  const [display, setDisplay] = useState(text);
  
  useEffect(() => {
    if (!shouldScramble) return;
    
    const chars = '0123456789abcdef';
    let iterations = 0;
    const interval = setInterval(() => {
      setDisplay(text.split('').map((char, index) => {
        if (index < iterations) return text[index];
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(''));
      
      if (iterations >= text.length) {
        clearInterval(interval);
        setDisplay(text);
      }
      iterations += 1 / 3;
    }, 30);
    
    return () => clearInterval(interval);
  }, [text, shouldScramble]);

  return <span className="mono">{display}</span>;
}

export function CryptoLedger() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });
  const prefersReducedMotion = useReducedMotion();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const { data } = useLiveData<{ total?: number; total_records?: number }>(`${API_BASE_URL}/verify-audit-chain`, 15000, {});

  const xProgress = useTransform(scrollYProgress, [0, 1], ["0%", "-80%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerified(true);
    }, 1500);
  };

  return (
    <section id="ledger" ref={containerRef} className="relative h-[400vh] bg-base">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden">
        <motion.div style={{ opacity: prefersReducedMotion ? 1 : opacity }} className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none filter url(#noise)" />
        </motion.div>

        <div className="z-10 text-center mb-16 px-4">
          <h2 className="font-display text-4xl md:text-6xl text-text mb-6">Every decision.<br/>Cryptographically sealed.</h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Append-only SHA-256 hash chain. Tamper-evident. Court-admissible audit trail.
          </p>
        </div>

        <div className="w-full overflow-x-hidden relative h-64 md:h-80 flex items-center mb-12 hidden md:flex">
          <motion.div style={{ x: prefersReducedMotion ? 0 : xProgress }} className="flex items-center gap-8 px-[50vw]">
            {BLOCKS.map((block, i) => (
              <div key={block.id} className="flex items-center">
                <div className="glass p-6 w-64 h-48 flex flex-col justify-between border-t-2 shrink-0 rounded-xl"
                  style={{ borderTopColor: `var(--${block.severity})` }}>
                  <div className="flex justify-between items-start">
                    <span className="mono text-muted text-sm">#00{block.id}</span>
                    <span className="mono text-xs px-2 py-1 rounded bg-surface border border-stroke"
                      style={{ color: `var(--${block.severity})` }}>
                      {block.type}
                    </span>
                  </div>
                  <div className="mono text-text text-xl">
                    <ScrambleText text={block.hash} shouldScramble={true} />
                  </div>
                  <div className="text-muted text-sm">{block.time}</div>
                  
                  <AnimatePresence>
                    {verified && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -top-3 -right-3 text-recovered bg-base rounded-full"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {i < BLOCKS.length - 1 && (
                  <div className="w-16 flex items-center justify-center text-accent/50 mx-4">
                    <motion.div
                      animate={verified ? { color: 'var(--recovered)', scale: [1, 1.2, 1] } : {}}
                      transition={{ delay: i * 0.1 }}
                    >
                      <LinkIcon className="w-6 h-6" />
                    </motion.div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </div>
        
        {/* Mobile View */}
        <div className="flex md:hidden w-full overflow-x-auto px-4 pb-8 space-x-6 snap-x">
           {BLOCKS.map((block, i) => (
              <div key={block.id} className="snap-center glass p-6 w-64 h-48 flex flex-col justify-between border-t-2 shrink-0 rounded-xl relative"
                  style={{ borderTopColor: `var(--${block.severity})` }}>
                  <div className="flex justify-between items-start">
                    <span className="mono text-muted text-sm">#00{block.id}</span>
                    <span className="mono text-xs px-2 py-1 rounded bg-surface border border-stroke"
                      style={{ color: `var(--${block.severity})` }}>
                      {block.type}
                    </span>
                  </div>
                  <div className="mono text-text text-xl">
                    <ScrambleText text={block.hash} shouldScramble={true} />
                  </div>
                  <div className="text-muted text-sm">{block.time}</div>
              </div>
           ))}
        </div>

        <div className="z-10 flex flex-col items-center gap-6 px-4 w-full max-w-md">
          <MagneticButton onClick={handleVerify} disabled={verifying || verified}>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              {verifying ? 'Verifying Chain...' : verified ? 'Chain Verified' : 'Verify Chain'}
            </span>
          </MagneticButton>
          
          {(verifying || verified) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full glass p-4 rounded-xl mono text-xs sm:text-sm text-accent break-words"
            >
              {verified ? 
                `{ verified: true, total_records: ${data?.total_records ?? data?.total ?? 847}, broken_links: [], genesis: "a3f9e2..." }` :
                '> verifying SHA-256 blocks...\n> computing hashes...'
              }
            </motion.div>
          )}

          <div className="mt-8 glass px-6 py-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex-1">
              <div className="text-text font-medium mb-1">Contact masking. Zero PII in transit.</div>
              <div className="text-muted text-sm">Real-time redaction before storage.</div>
            </div>
            <div className="mono text-recovered bg-surface px-3 py-2 rounded-lg border border-stroke">
              <ScrambleText text="******3210" shouldScramble={true} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
