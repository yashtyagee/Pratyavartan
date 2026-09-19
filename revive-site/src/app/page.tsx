import { Navbar } from "@/components/navbar";
import { SmoothScroll } from "@/components/smooth-scroll";
import { ScrollProgress } from "@/components/scroll-progress";
import { CustomCursor } from "@/components/custom-cursor";
import { Preloader } from "@/components/preloader";
import { GrainOverlay } from "@/components/grain-overlay";
import { MeshGradient } from "@/components/mesh-gradient";

import Hero from "@/components/sections/hero";
import ProblemMarquee from "@/components/sections/problem-marquee";
import { FivePillars } from "@/components/sections/five-pillars";
import { SimulationTerminal } from "@/components/sections/simulation-terminal";
import { AIBrain } from "@/components/sections/ai-brain";
import { VoiceEngine } from "@/components/sections/voice-engine";
import { Orchestration } from "@/components/sections/orchestration";
import { MemoryLayer } from "@/components/sections/memory-layer";
import { ResilienceMatrix } from "@/components/sections/resilience-matrix";
import { CryptoLedger } from "@/components/sections/crypto-ledger";
import { Compliance } from "@/components/sections/compliance";
import { Metrics } from "@/components/sections/metrics";
import { FinalCTA } from "@/components/sections/final-cta";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <SmoothScroll>
      <Preloader />
      <ScrollProgress />
      <CustomCursor />
      <GrainOverlay />
      <MeshGradient />

      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <ProblemMarquee />
          <FivePillars />
          <SimulationTerminal />
          <AIBrain />
          <VoiceEngine />
          <Orchestration />
          <MemoryLayer />
          <ResilienceMatrix />
          <CryptoLedger />
          <Compliance />
          <Metrics />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
