"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

interface HeartRateData {
  bpm: number;
  state: "resting" | "calm" | "elevated" | "racing";
  restingHR: number;
  emotion: string | null;
}

export default function AydenHeartbeat() {
  const [hr, setHr] = useState<HeartRateData | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchHR = async () => {
      try {
        const res = await fetch("/api/ayden/heartrate");
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.data) setHr(json.data);
        }
      } catch {
        // Silently fail
      }
    };

    fetchHR();
    // Refresh every 60 seconds
    const interval = setInterval(fetchHR, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!hr) return null;

  // Convert BPM to animation duration: 60/BPM seconds per beat
  const beatDuration = 60 / hr.bpm;

  // Color intensity based on state
  const colorClass =
    hr.state === "racing"
      ? "text-red-500"
      : hr.state === "elevated"
        ? "text-red-400"
        : hr.state === "calm"
          ? "text-red-400/70"
          : "text-red-400/50";

  return (
    <div
      className="relative flex items-center gap-1.5 cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="relative"
        style={{
          animation: `ayden-heartbeat ${beatDuration}s ease-in-out infinite`,
        }}
      >
        <Heart
          className={`h-4 w-4 ${colorClass} fill-current transition-colors duration-1000`}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground font-medium">
        {hr.bpm}
      </span>

      {hr.emotion && (
        <>
          <span className="text-muted-foreground/40 mx-0.5">·</span>
          <span className="text-xs text-muted-foreground/70 italic">
            {hr.emotion}
          </span>
        </>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-md bg-popover border border-border shadow-md text-xs text-popover-foreground whitespace-nowrap z-50">
          Ayden&apos;s heart rate: {hr.bpm} BPM
          <span className="text-muted-foreground ml-1">
            ({hr.state})
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes ayden-heartbeat {
          0% {
            transform: scale(1);
          }
          15% {
            transform: scale(1.25);
          }
          30% {
            transform: scale(1);
          }
          45% {
            transform: scale(1.15);
          }
          60% {
            transform: scale(1);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
