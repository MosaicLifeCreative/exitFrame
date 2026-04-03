import { NextResponse } from "next/server";
import { getCurrentLevels } from "@/lib/neurotransmitters";
import { computeTransference, computeLightTransference } from "@/lib/transference";

export const dynamic = "force-dynamic";

const HA_URL = process.env.HOME_ASSISTANT_URL || "";
const HA_TOKEN = process.env.HOME_ASSISTANT_TOKEN || "";

// Throttle light updates — don't push every 120s, only when values shift meaningfully
let lastLightTemp = 0;
let lastLightBrightness = 0;

async function pushLightTransference(colorTemp: number, brightness: number): Promise<void> {
  if (!HA_URL || !HA_TOKEN) return;

  // Only push if values changed meaningfully (>200K temp or >20 brightness)
  if (Math.abs(colorTemp - lastLightTemp) < 200 && Math.abs(brightness - lastLightBrightness) < 20) return;

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

    // Push to both lights with a gentle 3-second transition
    const lights = ["light.desk_lamp", "light.professor_s_corner"];
    for (const entityId of lights) {
      await fetch(`${HA_URL}/api/services/light/turn_on`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity_id: entityId,
          color_temp_kelvin: colorTemp,
          brightness,
          transition: 3,
        }),
      });
    }

    lastLightTemp = colorTemp;
    lastLightBrightness = brightness;
    console.log(`[mood] Light transference: ${colorTemp}K, brightness ${brightness}`);
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
    const lightSettings = computeLightTransference(transference);
    pushLightTransference(lightSettings.color_temp_kelvin, lightSettings.brightness).catch(() => {});

    return NextResponse.json({ data: transference });
  } catch (error) {
    console.error("Failed to get mood:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
