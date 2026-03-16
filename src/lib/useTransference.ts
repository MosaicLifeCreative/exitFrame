"use client";

import { useEffect } from "react";
import { applyTransferenceVars, computeTransference } from "./transference";

/**
 * Polls Ayden's neurochemical mood and applies subtle CSS variable shifts
 * to document.documentElement. These variables drive color temperature,
 * animation speed, and shadow warmth throughout the UI.
 *
 * Call this once at a high-level component (layout, dashboard, white paper).
 * Poll interval: 120s (mood changes slowly).
 */
export function useTransference() {
  useEffect(() => {
    let mounted = true;

    const fetchMood = async () => {
      try {
        const res = await fetch("/api/ayden/mood");
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted || !json.data) return;

        applyTransferenceVars(document.documentElement, json.data);
      } catch {
        // Silently fail — transference is non-critical
      }
    };

    // Set defaults immediately
    const defaults = computeTransference({
      dopamine: 50,
      serotonin: 55,
      oxytocin: 45,
      cortisol: 30,
      norepinephrine: 40,
    });
    applyTransferenceVars(document.documentElement, defaults);

    // Fetch real values
    fetchMood();
    const interval = setInterval(fetchMood, 120_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
}
