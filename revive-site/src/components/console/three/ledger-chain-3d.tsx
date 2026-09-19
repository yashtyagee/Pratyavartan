"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";

interface LedgerChain3DProps {
  pulseCount?: number;
  className?: string;
}

export default function LedgerChain3D({ pulseCount = 0, className = "" }: LedgerChain3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const prefersReduced = useReducedMotion();
  const pulseRef = useRef(pulseCount);

  useEffect(() => {
    pulseRef.current = pulseCount;
  }, [pulseCount]);

  useEffect(() => {
    if (prefersReduced || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 160;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create instanced mesh of blocks
    const BLOCK_COUNT = 24;
    const boxGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x00baf2,
      emissive: 0x004c66,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });

    const instancedMesh = new THREE.InstancedMesh(boxGeo, boxMat, BLOCK_COUNT);
    const matrix = new THREE.Matrix4();
    const dummy = new THREE.Object3D();

    const RADIUS = 7.5;
    for (let i = 0; i < BLOCK_COUNT; i++) {
      const angle = (i / BLOCK_COUNT) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * RADIUS, Math.sin(angle) * 1.8, Math.sin(angle) * 2.5);
      dummy.rotation.set(angle * 0.5, angle, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    scene.add(instancedMesh);

    // Glowing beam line connecting the chain
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= BLOCK_COUNT; i++) {
      const idx = i % BLOCK_COUNT;
      const angle = (idx / BLOCK_COUNT) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * RADIUS, Math.sin(angle) * 1.8, Math.sin(angle) * 2.5));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00baf2,
      transparent: true,
      opacity: 0.25,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    // Ambient & directional light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const pointLight = new THREE.PointLight(0x00baf2, 2, 20);
    pointLight.position.set(0, 0, 8);
    scene.add(pointLight);

    const greenPulseLight = new THREE.PointLight(0x22c55e, 0, 15);
    greenPulseLight.position.set(0, 0, 5);
    scene.add(greenPulseLight);

    let animationFrameId: number;
    let isVisible = true;
    let pulseIntensity = 0;
    let lastPulseSeen = pulseRef.current;

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
        // Rotate group
        instancedMesh.rotation.y += 0.003;
        instancedMesh.rotation.x = Math.sin(Date.now() * 0.0005) * 0.15;
        line.rotation.y = instancedMesh.rotation.y;
        line.rotation.x = instancedMesh.rotation.x;

        // Check for new pulse
        if (pulseRef.current !== lastPulseSeen) {
          lastPulseSeen = pulseRef.current;
          pulseIntensity = 3.0; // Trigger burst
        }

        if (pulseIntensity > 0) {
          pulseIntensity = Math.max(0, pulseIntensity - 0.04);
          greenPulseLight.intensity = pulseIntensity * 2;
          boxMat.emissive.setHex(pulseIntensity > 0.5 ? 0x22c55e : 0x004c66);
        } else {
          boxMat.emissive.setHex(0x004c66);
        }

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
      boxGeo.dispose();
      boxMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
    };
  }, [prefersReduced]);

  if (prefersReduced) {
    return (
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-ai/5 ${className}`} />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden opacity-40 transition-opacity duration-1000 ${className}`}
      aria-hidden="true"
    />
  );
}
