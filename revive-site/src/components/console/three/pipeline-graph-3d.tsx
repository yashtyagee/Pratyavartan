"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";

interface PipelineGraph3DProps {
  activeStage?: string;
  className?: string;
}

const STAGES = [
  { name: "DIAGNOSE", color: 0x8b5cf6, pos: [-4, 0.5, 0] },
  { name: "NEGOTIATE", color: 0x00baf2, pos: [-2, -0.6, 0.5] },
  { name: "EXECUTE", color: 0x22c55e, pos: [0, 0.7, -0.3] },
  { name: "ORCHESTRATE", color: 0xfbbf24, pos: [2, -0.4, 0.4] },
  { name: "ASSURE", color: 0x00baf2, pos: [4, 0.3, 0] },
];

export default function PipelineGraph3D({ activeStage, className = "" }: PipelineGraph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const group = new THREE.Group();
    scene.add(group);

    // Nodes
    const nodeSpheres: THREE.Mesh[] = [];
    const sphereGeo = new THREE.SphereGeometry(0.25, 16, 16);

    STAGES.forEach((stage) => {
      const mat = new THREE.MeshStandardMaterial({
        color: stage.color,
        emissive: stage.color,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.7,
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.position.set(stage.pos[0], stage.pos[1], stage.pos[2]);
      group.add(mesh);
      nodeSpheres.push(mesh);
    });

    // Connecting Curve
    const points = STAGES.map((s) => new THREE.Vector3(...s.pos));
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.03, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x00baf2,
      transparent: true,
      opacity: 0.3,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    group.add(tubeMesh);

    // Traveling pulse particle
    const pulseGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
    group.add(pulseMesh);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    let animationFrameId: number;
    let isVisible = true;
    let t = 0;

    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const animate = () => {
      if (isVisible) {
        t = (t + 0.005) % 1;
        const pos = curve.getPoint(t);
        pulseMesh.position.copy(pos);

        // Gentle floating sway
        group.rotation.y = Math.sin(Date.now() * 0.0008) * 0.15;
        group.rotation.x = Math.cos(Date.now() * 0.0006) * 0.08;

        // Node hover bob
        nodeSpheres.forEach((sphere, i) => {
          sphere.position.y = STAGES[i].pos[1] + Math.sin(Date.now() * 0.002 + i) * 0.08;
        });

        renderer.render(scene, camera);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sphereGeo.dispose();
      tubeGeo.dispose();
      tubeMat.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();
    };
  }, [prefersReduced, activeStage]);

  if (prefersReduced) {
    return (
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent ${className}`} />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden opacity-30 transition-opacity duration-700 ${className}`}
      aria-hidden="true"
    />
  );
}
