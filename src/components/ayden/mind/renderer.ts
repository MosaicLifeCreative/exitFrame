// ── Canvas rendering functions for Ayden Mind visualization ──
// Pure functions that draw to a CanvasRenderingContext2D.

import { CanvasNode, CanvasEdge, Particle } from "./types";

// ── Background ──

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) {
  // Subtle radial gradient: slightly lighter center, darker edges
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
  grad.addColorStop(0, "#111113");
  grad.addColorStop(1, "#09090b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// ── Ring guides (very subtle concentric circles) ──

export function drawRingGuides(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  minDim: number
) {
  const rings = [0.18, 0.34, 0.42]; // neuros, values, interests
  ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
  ctx.lineWidth = 1;
  for (const r of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, minDim * r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── Edges ──

export function drawEdge(
  ctx: CanvasRenderingContext2D,
  edge: CanvasEdge,
  fromNode: CanvasNode,
  toNode: CanvasNode
) {
  ctx.beginPath();
  ctx.moveTo(fromNode.x, fromNode.y);
  ctx.lineTo(toNode.x, toNode.y);

  const alpha = Math.max(0.03, edge.strength * 0.15);
  ctx.strokeStyle = hexToRgba(edge.color, alpha);
  ctx.lineWidth = 0.5 + edge.strength * 1;
  ctx.stroke();
}

// ── Particles ──

export function drawParticle(
  ctx: CanvasRenderingContext2D,
  particle: Particle,
  fromNode: CanvasNode,
  toNode: CanvasNode
) {
  const x = fromNode.x + (toNode.x - fromNode.x) * particle.progress;
  const y = fromNode.y + (toNode.y - fromNode.y) * particle.progress;

  ctx.beginPath();
  ctx.arc(x, y, particle.size, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(particle.color, 0.6);
  ctx.fill();
}

// ── Nodes ──

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: CanvasNode,
  time: number
) {
  let radius = node.radius;

  if (node.type === "heart") {
    // Heartbeat animation: pulse based on BPM
    const bpm = (node.data.bpm as number) || 72;
    const beatPeriod = 60 / bpm;
    const beatPhase = (time % beatPeriod) / beatPeriod;
    // Sharp systole then gradual diastole
    const pulse = beatPhase < 0.15
      ? Math.sin(beatPhase / 0.15 * Math.PI) * 0.25
      : Math.max(0, (1 - (beatPhase - 0.15) / 0.85)) * 0.05;
    radius = node.radius * (1 + pulse);
  } else {
    // Subtle breathing animation for all other nodes
    const breathSpeed = node.type === "neurotransmitter" ? 0.4 : 0.25;
    const breathAmp = 0.03 + node.glowIntensity * 0.03;
    // Offset each node's phase by its position
    const phase = (node.x * 0.01 + node.y * 0.01 + time * breathSpeed);
    radius = node.radius * (1 + Math.sin(phase) * breathAmp);
  }

  // Glow layer
  if (node.glowIntensity > 0.1) {
    const glowRadius = radius * (2.5 + node.glowIntensity);
    const glow = ctx.createRadialGradient(
      node.x, node.y, radius * 0.5,
      node.x, node.y, glowRadius
    );
    glow.addColorStop(0, hexToRgba(node.color, node.glowIntensity * 0.2));
    glow.addColorStop(1, hexToRgba(node.color, 0));
    ctx.beginPath();
    ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
  }

  // Core circle
  const coreGrad = ctx.createRadialGradient(
    node.x - radius * 0.2,
    node.y - radius * 0.2,
    0,
    node.x,
    node.y,
    radius
  );
  coreGrad.addColorStop(0, lighten(node.color, 0.3));
  coreGrad.addColorStop(1, node.color);

  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();
}

// ── Labels ──

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  node: CanvasNode,
  showAll: boolean = false
) {
  // Always show labels for heart and neurotransmitters; others only on hover
  if (!showAll && node.type !== "heart" && node.type !== "neurotransmitter") {
    return;
  }

  const fontSize = node.type === "heart" ? 11 : node.type === "neurotransmitter" ? 10 : 9;
  ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const labelY = node.y + node.radius + 6;
  const label = node.type === "neurotransmitter"
    ? capitalizeFirst(node.label)
    : node.label;

  // Text shadow for readability
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillText(label, node.x + 1, labelY + 1);

  ctx.fillStyle = hexToRgba(node.color, 0.7);
  ctx.fillText(label, node.x, labelY);

  // Level indicator for neurotransmitters
  if (node.type === "neurotransmitter") {
    const level = node.data.level as number;
    if (level !== undefined) {
      ctx.font = `9px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fillText(`${Math.round(level)}`, node.x, labelY + fontSize + 2);
    }
  }
}

// ── Hover label (for values, interests, emotions) ──

export function drawHoverLabel(
  ctx: CanvasRenderingContext2D,
  node: CanvasNode
) {
  if (node.type === "heart" || node.type === "neurotransmitter") return;

  const fontSize = 10;
  ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const label = node.type === "emotion"
    ? node.label
    : node.type === "interest"
      ? node.label
      : node.label;

  const labelY = node.y - node.radius - 6;

  // Background pill
  const textWidth = ctx.measureText(label).width;
  const padding = 6;
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  roundRect(ctx, node.x - textWidth / 2 - padding, labelY - fontSize - 4, textWidth + padding * 2, fontSize + 8, 4);
  ctx.fill();

  ctx.fillStyle = node.color;
  ctx.fillText(label, node.x, labelY);
}

// ── Thought display near heart ──

export function drawThought(
  ctx: CanvasRenderingContext2D,
  thought: string | null,
  heartNode: CanvasNode,
  time: number,
  thoughtAge: number // seconds since thought appeared
) {
  if (!thought) return;

  // Fade in over 2s, hold, fade out after 12s
  let alpha: number;
  if (thoughtAge < 2) {
    alpha = thoughtAge / 2;
  } else if (thoughtAge < 12) {
    alpha = 1;
  } else if (thoughtAge < 15) {
    alpha = 1 - (thoughtAge - 12) / 3;
  } else {
    return; // fully faded
  }

  const maxWidth = 260;
  const fontSize = 11;
  ctx.font = `italic ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Truncate if needed
  let displayText = thought;
  if (ctx.measureText(thought).width > maxWidth * 2) {
    displayText = thought.slice(0, 80) + "...";
  }

  // Word wrap
  const lines = wrapText(ctx, displayText, maxWidth);
  const lineHeight = fontSize + 3;
  const blockY = heartNode.y + heartNode.radius + 30;

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], heartNode.x, blockY + i * lineHeight);
  }
}

// ── Utility helpers ──

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith("rgba")) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 255 * amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + 255 * amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + 255 * amount);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3); // max 3 lines
}
