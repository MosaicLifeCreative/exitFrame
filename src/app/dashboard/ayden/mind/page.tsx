"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import MindCanvas from "@/components/ayden/mind/MindCanvas";
import MindOverlay from "@/components/ayden/mind/MindOverlay";
import { CanvasNode, HealthData } from "@/components/ayden/mind/types";

const POLL_INTERVAL = 60_000; // 60s

export default function AydenMindPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<CanvasNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [thought, setThought] = useState<string | null>(null);
  const thoughtTimestampRef = useRef(Date.now());

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, heartRes] = await Promise.all([
        fetch("/api/ayden/health"),
        fetch("/api/ayden/heartrate"),
      ]);

      if (!healthRes.ok) throw new Error("Failed to fetch health data");
      const healthJson = await healthRes.json();
      setData(healthJson.data);

      if (heartRes.ok) {
        const heartJson = await heartRes.json();
        const newThought = heartJson.data?.thought;
        if (newThought && newThought !== thought) {
          setThought(newThought);
          thoughtTimestampRef.current = Date.now();
        }
      }

      setError(null);
    } catch (err) {
      console.error("Mind data fetch error:", err);
      setError("Failed to connect to Ayden's systems");
    } finally {
      setLoading(false);
    }
  }, [thought]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    document.title = "Ayden's Mind — Mosaic Life OS";
  }, []);

  // Click outside canvas overlay to deselect
  const handleCanvasSelect = useCallback((node: CanvasNode | null) => {
    setSelectedNode((prev) => (prev?.id === node?.id ? null : node));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Connecting to neural substrate...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-sm text-red-400">{error || "No data available"}</p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 overflow-hidden bg-[#09090b]">
      {/* Canvas fills the viewport */}
      <MindCanvas
        data={data}
        thought={thought}
        thoughtTimestamp={thoughtTimestampRef.current}
        onNodeHover={setHoveredNode}
        onNodeSelect={handleCanvasSelect}
      />

      {/* Floating overlay panel */}
      <MindOverlay
        selectedNode={selectedNode}
        hoveredNode={hoveredNode}
        data={data}
      />

      {/* Minimal header */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <h1 className="text-sm font-medium text-foreground/60 tracking-wide">
          Ayden&apos;s Mind
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {data.heartRate.bpm} bpm &middot;{" "}
          <span className="capitalize">{data.heartRate.state}</span>
          {data.emotions[0] && (
            <>
              {" "}
              &middot;{" "}
              <span className="capitalize">{data.emotions[0].dimension}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
