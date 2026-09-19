"use client";

import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { Play, Pause, Circle, CircleDot, Volume2 } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useLiveData } from "@/lib/use-live-data";
import { API_BASE_URL } from "@/lib/constants";

export function VoiceEngine() {
  const prefersReducedMotion = useReducedMotion();
  const { data: status } = useLiveData<{ active_engine?: string; primary_engine?: string; sarvam_configured?: boolean }>(
    `${API_BASE_URL}/api/voice-status`,
    15000,
    {}
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeEngine = status?.active_engine ?? "Sarvam AI";
  const isSarvam = status?.sarvam_configured ?? true;

  const handlePlayToggle = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    try {
      if (!audioRef.current) {
        const res = await fetch(`${API_BASE_URL}/api/voice-sample`);
        const data = await res.json();
        const audioSrc = data.audio_url?.startsWith("http")
          ? data.audio_url
          : `${API_BASE_URL}${data.audio_url}`;

        const audio = new Audio(audioSrc);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
        audioRef.current = audio;
      }

      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <section id="voice" className="relative py-24 sm:py-32 overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 z-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--ai)_0%,_transparent_70%)] opacity-[0.05] blur-[100px] pointer-events-none"></div>

      <div className="container relative z-10 px-6 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-text mb-4">
            Voice that speaks their language.
          </h2>
          <p className="text-lg text-muted mb-16 max-w-2xl mx-auto">
            Hinglish negotiation scripts generated in real-time. Two engines, zero silence.
          </p>
        </motion.div>

        {/* Centerpiece */}
        <div className="relative mx-auto w-full max-w-2xl glass border border-stroke rounded-2xl p-8 sm:p-12 bg-surface backdrop-blur-xl">
          {/* Waveform */}
          <div className="flex items-center justify-center h-24 gap-[8px] mb-8">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-[3px] bg-ai rounded-full"
                animate={
                  !prefersReducedMotion
                    ? {
                        height: isPlaying 
                          ? ["16px", `${Math.random() * 60 + 20}px`, "16px"]
                          : ["16px", `${Math.random() * 20 + 16}px`, "16px"],
                      }
                    : { height: "24px" }
                }
                transition={{
                  repeat: Infinity,
                  duration: isPlaying ? 0.4 + Math.random() * 0.4 : 1.5 + Math.random() * 0.5,
                  delay: i * 0.05,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>

          {/* Script Sample */}
          <div className="text-left mb-10 space-y-4">
            <blockquote className="text-xl sm:text-2xl text-text font-medium italic border-l-4 border-ai pl-6 py-2">
              "Bhaiya, payment fail ho gaya tha — main Priya, merchant ki taraf se. <span className="text-accent">5% instant discount</span> ke saath abhi pay kar sakte hain."
            </blockquote>
          </div>

          {/* Controls & Status */}
          <div className="flex flex-wrap items-center justify-between gap-6 border-t border-stroke pt-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayToggle}
              className="flex items-center gap-3 px-6 py-3 bg-white text-base text-slate-950 rounded-full font-bold transition-all hover:bg-opacity-90 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause Audio</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span>Listen Voice Sample</span>
                </>
              )}
            </motion.button>

            <div className="flex items-center gap-4 flex-wrap justify-end">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-stroke bg-surface">
                <CircleDot className={`w-3 h-3 ${isSarvam ? 'text-recovered animate-pulse' : 'text-muted'}`} />
                <span className="text-sm font-medium text-text">Sarvam AI bulbul:v3</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-stroke bg-surface">
                <Circle className={`w-3 h-3 ${!isSarvam ? 'text-recovered animate-pulse' : 'text-monitor'}`} />
                <span className="text-sm font-medium text-text">gTTS Fallback</span>
              </div>
            </div>
          </div>
          
          {/* Small Badge */}
          <div className="absolute top-4 right-4 text-[10px] uppercase tracking-widest font-mono text-muted bg-base px-2 py-1 rounded border border-stroke">
            {isSarvam ? 'SARVAM_BULBUL_V3_ACTIVE' : 'SARVAM_FALLBACK_TO_GTTS'}
          </div>
        </div>
      </div>
    </section>
  );
}
