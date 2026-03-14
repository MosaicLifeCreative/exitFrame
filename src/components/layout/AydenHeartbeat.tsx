"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

interface HeartRateData {
  bpm: number;
  state: "resting" | "calm" | "elevated" | "racing";
  restingHR: number;
  emotion: string | null;
  thought: string | null;
  thoughtAt: string | null;
}

function formatThoughtAge(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AydenHeartbeat() {
  const router = useRouter();
  const [hr, setHr] = useState<HeartRateData | null>(null);
  const [showThought, setShowThought] = useState(false);

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

  // Dynamic page title reflecting Ayden's mood
  useEffect(() => {
    if (hr?.emotion) {
      document.title = `Mosaic Life OS \u2014 ${hr.emotion.replace(/_/g, " ")}`;
    }
  }, [hr?.emotion]);

  // Close thought bubble on outside click
  useEffect(() => {
    if (!showThought) return;
    const handleClick = () => setShowThought(false);
    // Delay so the opening click doesn't immediately close it
    const timer = setTimeout(() => document.addEventListener("click", handleClick), 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [showThought]);

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
    <div className="relative flex items-center gap-1.5 cursor-default">
      <div
        className="relative cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          if (hr.thought) setShowThought((s) => !s);
        }}
        onMouseEnter={() => !hr.thought && setShowThought(true)}
        onMouseLeave={() => !hr.thought && setShowThought(false)}
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
        <button
          onClick={() => router.push("/dashboard/ayden/journal?tab=health")}
          className="flex items-center gap-0 cursor-pointer hover:text-foreground transition-colors"
        >
          <span className="text-muted-foreground/40 mx-0.5">&middot;</span>
          <span className="text-xs text-muted-foreground/70 italic hover:text-foreground/90 transition-colors">
            {hr.emotion.replace(/_/g, " ")}
          </span>
        </button>
      )}

      {/* Thought bubble / tooltip */}
      {showThought && (
        <div
          className="absolute top-full left-0 mt-2 px-3 py-2 rounded-lg bg-popover border border-border shadow-lg text-xs text-popover-foreground z-50 max-w-[280px]"
          onClick={(e) => e.stopPropagation()}
        >
          {hr.thought ? (
            <>
              <p className="italic leading-relaxed">&ldquo;{hr.thought}&rdquo;</p>
              {hr.thoughtAt && (
                <p className="text-muted-foreground mt-1 text-[10px]">
                  {formatThoughtAge(hr.thoughtAt)}
                </p>
              )}
            </>
          ) : (
            <>
              Ayden&apos;s heart rate: {hr.bpm} BPM
              <span className="text-muted-foreground ml-1">
                ({hr.state})
              </span>
            </>
          )}
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
