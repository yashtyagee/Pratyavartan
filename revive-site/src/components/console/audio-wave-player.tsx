"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";

interface AudioWavePlayerProps {
  audioUrl: string;
  provider?: string;
  scriptText?: string;
  autoPlay?: boolean;
  className?: string;
}

export function AudioWavePlayer({
  audioUrl,
  provider = "Sarvam AI (bulbul:v3)",
  scriptText,
  autoPlay = false,
  className = "",
}: AudioWavePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Compute absolute URL
  const resolvedUrl = audioUrl
    ? audioUrl.startsWith("http")
      ? audioUrl
      : `${API_BASE_URL}${audioUrl.startsWith("/") ? "" : "/"}${audioUrl}`
    : "";

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
  }, [resolvedUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !resolvedUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setHasError(false);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.error("Playback error:", err);
            setHasError(true);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const togglePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!audioUrl) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-ai/30 bg-gradient-to-r from-ai/[0.08] via-surface to-ai/[0.04] p-3.5 shadow-lg backdrop-blur-sm ${className}`}
    >
      {/* Hidden Audio Tag */}
      <audio
        ref={audioRef}
        src={resolvedUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setHasError(true)}
        preload="auto"
      />

      {/* Header Info Bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-ai/20 text-ai border border-ai/40">
            <Volume2 className="h-3.5 w-3.5" />
          </div>
          <span className="font-mono text-xs font-bold text-text">
            Hinglish Voice Note
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-ai/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-ai border border-ai/30">
          <Sparkles className="h-3 w-3" />
          <span>{provider.includes("Sarvam") ? "Sarvam AI (bulbul:v3)" : provider}</span>
        </div>
      </div>

      {/* Optional Script Preview Quote */}
      {scriptText && (
        <p className="mt-2 text-[11px] italic text-muted line-clamp-2 border-l-2 border-ai/40 pl-2">
          "{scriptText}"
        </p>
      )}

      {/* Waveform & Playback Controls */}
      <div className="mt-3 flex items-center gap-3">
        {/* Play/Pause Main Button */}
        <button
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ai text-slate-950 font-bold shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title={isPlaying ? "Pause audio" : "Play voice note"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Waveform Graphic + Slider */}
        <div className="flex-1 space-y-1">
          {/* Animated Waveform Bars */}
          <div className="flex h-6 items-center gap-1 px-1">
            {Array.from({ length: 28 }).map((_, i) => {
              const active = (currentTime / (duration || 1)) * 28 > i;
              const barHeight = isPlaying
                ? Math.sin((i + currentTime * 5) * 0.8) * 10 + 12
                : (i * 7) % 12 + 6;

              return (
                <div
                  key={i}
                  style={{ height: `${Math.max(4, Math.min(22, barHeight))}px` }}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    active
                      ? "bg-ai shadow-[0_0_6px_rgba(168,85,247,0.6)]"
                      : "bg-white/20"
                  }`}
                />
              );
            })}
          </div>

          {/* Time Scrubber Slider */}
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-ai"
          />

          <div className="flex items-center justify-between font-mono text-[10px] text-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Aux Controls: Speed & Restart & Volume */}
        <div className="flex items-center gap-1 text-muted">
          <button
            onClick={togglePlaybackRate}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] font-bold text-text hover:bg-white/10"
            title="Toggle playback speed"
          >
            {playbackRate}x
          </button>

          <button
            onClick={handleRestart}
            className="rounded-lg p-1.5 hover:bg-white/10 hover:text-text"
            title="Restart from beginning"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={toggleMute}
            className="rounded-lg p-1.5 hover:bg-white/10 hover:text-text"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-critical" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Error / Fallback Link */}
      {hasError && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-critical/15 px-2.5 py-1 text-[11px] text-critical border border-critical/30">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Audio stream failed to load.</span>
          </div>
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline font-bold"
          >
            <span>Open File</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
