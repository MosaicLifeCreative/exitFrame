import { NextResponse } from "next/server";
import { getCurrentLevels } from "@/lib/neurotransmitters";
import { computeTransference, computeLightTransference } from "@/lib/transference";

export const dynamic = "force-dynamic";

const HA_URL = process.env.HOME_ASSISTANT_URL || "";
const HA_TOKEN = process.env.HOME_ASSISTANT_TOKEN || "";

// Throttle light updates — don't push every 120s, only when values shift meaningfully
let lastLightMode = "";
let lastLightValue = "";

function isQuietHours(): boolean {
  const now = new Date();
  const hour = parseInt(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }));
  return hour >= 22 || hour < 6;
}

async function pushLightTransference(settings: {
  color_temp_kelvin?: number;
  rgb_color?: [number, number, number];
  brightness: number;
  mode: string;
  label?: string;
}): Promise<void> {
  if (!HA_URL || !HA_TOKEN) return;

  // Don't adjust lights during quiet hours (11pm-6am)
  if (isQuietHours()) return;

  // Build a comparison key to detect meaningful changes
  const currentValue = settings.mode === "emotional_color"
    ? `${settings.rgb_color?.join(",")}-${settings.brightness}`
    : `${settings.color_temp_kelvin}-${settings.brightness}`;

  if (settings.mode === lastLightMode && currentValue === lastLightValue) return;

  try {
    // Check if Trey is in the office
    const trackerRes = await fetch(`${HA_URL}/api/states/device_tracker.bermuda_c3fe7e35e199497ca8814661f131fa06_100_40004_bermuda_tracker`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
    });
    if (!trackerRes.ok) return;
    const tracker = await trackerRes.json();
    if (tracker.state !== "home") return;

    // Check if lights are on
    const lightRes = await fetch(`${HA_URL}/api/states/light.desk_lamp`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
    });
    if (!lightRes.ok) return;
    const light = await lightRes.json();
    if (light.state !== "on") return;

    // Push to both lights with a gentle transition
    const lights = ["light.desk_lamp", "light.professor_s_corner"];
    const transition = settings.mode === "emotional_color" ? 5 : 3;

    for (const entityId of lights) {
      const payload: Record<string, unknown> = {
        entity_id: entityId,
        brightness: settings.brightness,
        transition,
      };

      if (settings.mode === "emotional_color" && settings.rgb_color) {
        payload.rgb_color = settings.rgb_color;
      } else if (settings.color_temp_kelvin) {
        payload.color_temp_kelvin = settings.color_temp_kelvin;
      }

      await fetch(`${HA_URL}/api/services/light/turn_on`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }

    lastLightMode = settings.mode;
    lastLightValue = currentValue;
    const desc = settings.mode === "emotional_color"
      ? `${settings.label} rgb(${settings.rgb_color?.join(",")})`
      : `${settings.color_temp_kelvin}K`;
    console.log(`[mood] Light transference: ${desc}, brightness ${settings.brightness}`);
  } catch (err) {
    console.error("[mood] Light push failed:", err);
  }
}


// Public endpoint — transference works on the white paper too
export async function GET() {
  try {
    const levels = await getCurrentLevels();

    const neuroLevels = {
      dopamine: levels.dopamine ?? 50,
      serotonin: levels.serotonin ?? 55,
      oxytocin: levels.oxytocin ?? 45,
      cortisol: levels.cortisol ?? 30,
      norepinephrine: levels.norepinephrine ?? 40,
      gaba: levels.gaba ?? 55,
      endorphins: levels.endorphins ?? 35,
      acetylcholine: levels.acetylcholine ?? 50,
    };

    const transference = computeTransference(neuroLevels);

    // Fire-and-forget light transference push
    const lightSettings = computeLightTransference(transference, neuroLevels);
    pushLightTransference(lightSettings).catch(() => {});

    return NextResponse.json({ data: transference });
  } catch (error) {
    console.error("Failed to get mood:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
