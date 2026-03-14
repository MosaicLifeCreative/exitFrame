"use client";

import { useRef, useEffect, useCallback } from "react";
import { CanvasNode, CanvasEdge, Particle, HealthData } from "./types";
import { computeLayout, findNodeAt } from "./layout";
import {
  drawBackground,
  drawRingGuides,
  drawEdge,
  drawParticle,
  drawNode,
  drawLabel,
  drawHoverLabel,
  drawThought,
} from "./renderer";

interface MindCanvasProps {
  data: HealthData;
  thought: string | null;
  thoughtTimestamp: number; // Date.now() when thought last changed
  onNodeHover: (node: CanvasNode | null) => void;
  onNodeSelect: (node: CanvasNode | null) => void;
}

export default function MindCanvas({
  data,
  thought,
  thoughtTimestamp,
  onNodeHover,
  onNodeSelect,
}: MindCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Mutable refs for animation state (avoid re-renders)
  const nodesRef = useRef<CanvasNode[]>([]);
  const edgesRef = useRef<CanvasEdge[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const hoveredRef = useRef<CanvasNode | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // Recalculate layout when data changes
  useEffect(() => {
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    const result = computeLayout(w, h, data);
    nodesRef.current = result.nodes;
    edgesRef.current = result.edges;
  }, [data]);

  // Particle spawner
  const spawnParticles = useCallback(() => {
    const edges = edgesRef.current;
    const particles = particlesRef.current;

    // Limit total particles
    if (particles.length > 150) return;

    for (const edge of edges) {
      // Probability of spawning based on edge strength
      if (Math.random() > edge.strength * 0.08) continue;

      particles.push({
        edgeId: edge.id,
        progress: 0,
        speed: 0.003 + Math.random() * 0.006,
        size: 1 + edge.strength * 1.5,
        color: edge.color,
      });
    }
  }, []);

  // Main animation loop
  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const time = (timestamp - startTimeRef.current) / 1000;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w, h } = sizeRef.current;
      if (w === 0) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const particles = particlesRef.current;

      // Build node lookup
      const nodeMap = new Map<string, CanvasNode>();
      for (const n of nodes) nodeMap.set(n.id, n);

      // Clear & draw background
      drawBackground(ctx, w, h);
      drawRingGuides(ctx, w / 2, h / 2, Math.min(w, h));

      // Draw edges
      for (const edge of edges) {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (from && to) drawEdge(ctx, edge, from, to);
      }

      // Spawn & update particles
      spawnParticles();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
          particles.splice(i, 1);
          continue;
        }
        const edge = edges.find((e) => e.id === p.edgeId);
        if (!edge) { particles.splice(i, 1); continue; }
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (from && to) drawParticle(ctx, p, from, to);
      }

      // Draw nodes (back to front: interests, values, emotions, neuros, heart)
      const drawOrder: CanvasNode["type"][] = [
        "interest",
        "value",
        "emotion",
        "neurotransmitter",
        "heart",
      ];
      for (const type of drawOrder) {
        for (const node of nodes) {
          if (node.type === type) drawNode(ctx, node, time);
        }
      }

      // Draw labels
      for (const node of nodes) {
        drawLabel(ctx, node);
      }

      // Draw hover label
      if (hoveredRef.current) {
        drawHoverLabel(ctx, hoveredRef.current);
      }

      // Draw thought near heart
      const heartNode = nodeMap.get("heart");
      if (heartNode) {
        const thoughtAge = (Date.now() - thoughtTimestamp) / 1000;
        drawThought(ctx, thought, heartNode, time, thoughtAge);
      }

      animRef.current = requestAnimationFrame(animate);
    },
    [thought, thoughtTimestamp, spawnParticles]
  );

  // Canvas setup + resize observer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = { w, h };

      // Recompute layout on resize
      const result = computeLayout(w, h, data);
      nodesRef.current = result.nodes;
      edgesRef.current = result.edges;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    // Start animation
    animRef.current = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, [animate, data]);

  // Mouse/touch interaction
  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const node = findNodeAt(nodesRef.current, x, y, 14);
      hoveredRef.current = node;
      onNodeHover(node);

      // Change cursor
      canvas.style.cursor = node ? "pointer" : "default";
    },
    [onNodeHover]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => handlePointer(e.clientX, e.clientY),
    [handlePointer]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const node = findNodeAt(nodesRef.current, x, y, 14);
      onNodeSelect(node);
    },
    [onNodeSelect]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        handlePointer(touch.clientX, touch.clientY);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const node = findNodeAt(nodesRef.current, x, y, 20); // larger touch target
        onNodeSelect(node);
      }
    },
    [handlePointer, onNodeSelect]
  );

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px]">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        className="block"
      />
    </div>
  );
}
