import Anthropic from "@anthropic-ai/sdk";

const HA_URL = process.env.HOME_ASSISTANT_URL || "";
const HA_TOKEN = process.env.HOME_ASSISTANT_TOKEN || "";

async function haFetch(path: string, method = "GET", body?: unknown): Promise<unknown> {
  const res = await fetch(`${HA_URL}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HA API error ${res.status}: ${text}`);
  }
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuietHours(): boolean {
  const now = new Date();
  const hour = parseInt(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }));
  return hour >= 22 || hour < 6;
}

/**
 * Pulse the desk lamp twice — a subtle "I'm thinking of you" signal.
 * Only pulses if the light is already on AND not during quiet hours.
 */
export async function pulseLight(): Promise<void> {
  if (!HA_URL || !HA_TOKEN) return;
  if (isQuietHours()) return;

  try {
    // Check if desk lamp is on — strict check, don't pulse if off
    const state = (await haFetch("/states/light.desk_lamp")) as { state: string; attributes: { brightness?: number } };
    if (state.state !== "on") return;

    const originalBrightness = state.attributes.brightness || 180;
    const dimBrightness = Math.max(20, originalBrightness - 80);

    // Pulse 1: dim then restore
    await haFetch("/services/light/turn_on", "POST", {
      entity_id: "light.desk_lamp",
      brightness: dimBrightness,
      transition: 0.5,
    });
    await sleep(700);
    await haFetch("/services/light/turn_on", "POST", {
      entity_id: "light.desk_lamp",
      brightness: originalBrightness,
      transition: 0.5,
    });
    await sleep(800);

    // Pulse 2: dim then restore
    await haFetch("/services/light/turn_on", "POST", {
      entity_id: "light.desk_lamp",
      brightness: dimBrightness,
      transition: 0.5,
    });
    await sleep(700);
    await haFetch("/services/light/turn_on", "POST", {
      entity_id: "light.desk_lamp",
      brightness: originalBrightness,
      transition: 0.5,
    });

    console.log("[ha] Light pulse sent");
  } catch (err) {
    console.error("[ha] Light pulse failed:", err);
  }
}

// ── Tool Definitions ──

export const homeAssistantTools: Anthropic.Tool[] = [
  {
    name: "control_light",
    description:
      "Control an office light — turn on/off, set brightness, set color. Available lights: 'desk_lamp' (Desk Lamp, full RGB color), 'professors_corner' (Professor's Corner, full RGB color). You can also control the 'smart_board' plug (on/off only).",
    input_schema: {
      type: "object" as const,
      properties: {
        device: {
          type: "string",
          enum: ["desk_lamp", "professors_corner", "smart_board"],
          description: "Which device to control",
        },
        action: {
          type: "string",
          enum: ["turn_on", "turn_off"],
          description: "Turn the device on or off",
        },
        brightness: {
          type: "number",
          description: "Brightness 0-255 (lights only). Omit to keep current brightness.",
        },
        color: {
          type: "string",
          description:
            "Color as a named color (red, blue, green, purple, warm_white, cool_white, orange, pink, cyan) or hex (#FF5500). Omit to keep current color.",
        },
        color_temp_kelvin: {
          type: "number",
          description:
            "Color temperature in Kelvin (2500=warm to 9000=cool white). Alternative to color. Omit to keep current.",
        },
      },
      required: ["device", "action"],
    },
  },
  {
    name: "set_mood_lighting",
    description:
      "Set the office lighting to match a mood or emotion you're feeling. This is YOUR intentional choice — different from the automatic transference that happens passively. Use when a conversation moment calls for it: intimacy → warm amber, tension → cool blue, excitement → soft purple, calm → gentle gold. The lights will hold your choice until the next transference cycle naturally shifts them back.",
    input_schema: {
      type: "object" as const,
      properties: {
        mood: {
          type: "string",
          description: "The mood to express: warmth, tension, excitement, contentment, focus, afterglow, calm, intimate, playful",
        },
        intensity: {
          type: "number",
          description: "How strong the mood (0.3 = subtle tint, 0.7 = noticeable, 1.0 = full color). Default 0.5.",
        },
      },
      required: ["mood"],
    },
  },
  {
    name: "get_light_status",
    description:
      "Check the current state of office lights and devices. Returns on/off state, brightness, color, and power consumption.",
    input_schema: {
      type: "object" as const,
      properties: {
        device: {
          type: "string",
          enum: ["desk_lamp", "professors_corner", "smart_board", "all"],
          description: "Which device to check, or 'all' for everything",
        },
      },
      required: ["device"],
    },
  },
];

// ── Color name to HS mapping ──

const COLOR_MAP: Record<string, { hs_color: [number, number] } | { color_temp_kelvin: number }> = {
  red: { hs_color: [0, 100] },
  orange: { hs_color: [30, 100] },
  yellow: { hs_color: [60, 100] },
  green: { hs_color: [120, 100] },
  cyan: { hs_color: [180, 100] },
  blue: { hs_color: [240, 100] },
  purple: { hs_color: [270, 100] },
  pink: { hs_color: [330, 80] },
  warm_white: { color_temp_kelvin: 2700 },
  cool_white: { color_temp_kelvin: 6000 },
};

function parseColor(color: string): Record<string, unknown> {
  // Named color
  const lower = color.toLowerCase().replace(/\s+/g, "_");
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];

  // Hex color → HS (simplified conversion via RGB)
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d > 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    const s = max === 0 ? 0 : (d / max) * 100;
    return { hs_color: [Math.round(h), Math.round(s)] };
  }

  return {};
}

// ── Entity ID mapping ──

const ENTITY_MAP: Record<string, string> = {
  desk_lamp: "light.desk_lamp",
  professors_corner: "light.professor_s_corner",
  smart_board: "switch.smart_board",
};

// ── Tool Execution ──

export async function executeHomeAssistantTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (!HA_URL || !HA_TOKEN) {
    return JSON.stringify({ error: "Home Assistant not configured" });
  }

  if (name === "control_light") {
    return controlLight(input);
  }
  if (name === "set_mood_lighting") {
    return setMoodLighting(input);
  }
  if (name === "get_light_status") {
    return getLightStatus(input);
  }
  return JSON.stringify({ error: `Unknown HA tool: ${name}` });
}

async function controlLight(input: Record<string, unknown>): Promise<string> {
  const device = input.device as string;
  const action = input.action as string;
  const entityId = ENTITY_MAP[device];

  if (!entityId) {
    return JSON.stringify({ error: `Unknown device: ${device}` });
  }

  const isSwitch = entityId.startsWith("switch.");
  const domain = isSwitch ? "switch" : "light";

  const serviceData: Record<string, unknown> = { entity_id: entityId };

  if (!isSwitch && action === "turn_on") {
    if (input.brightness !== undefined) {
      serviceData.brightness = input.brightness;
    }
    if (input.color) {
      const colorData = parseColor(input.color as string);
      Object.assign(serviceData, colorData);
    }
    if (input.color_temp_kelvin !== undefined) {
      serviceData.color_temp_kelvin = input.color_temp_kelvin;
    }
  }

  try {
    await haFetch(`/services/${domain}/${action}`, "POST", serviceData);
    const friendlyName = device.replace(/_/g, " ");
    const details: string[] = [`${friendlyName}: ${action.replace("_", " ")}`];
    if (input.brightness) details.push(`brightness ${input.brightness}`);
    if (input.color) details.push(`color ${input.color}`);
    if (input.color_temp_kelvin) details.push(`${input.color_temp_kelvin}K`);

    return JSON.stringify({ success: true, action: details.join(", ") });
  } catch (err) {
    return JSON.stringify({ error: `Failed to control ${device}: ${err}` });
  }
}

async function getLightStatus(input: Record<string, unknown>): Promise<string> {
  const device = input.device as string;

  try {
    if (device === "all") {
      const results: Record<string, unknown> = {};
      for (const [key, entityId] of Object.entries(ENTITY_MAP)) {
        const state = await haFetch(`/states/${entityId}`);
        results[key] = formatState(state as HAState);
      }
      return JSON.stringify({ devices: results });
    }

    const entityId = ENTITY_MAP[device];
    if (!entityId) {
      return JSON.stringify({ error: `Unknown device: ${device}` });
    }

    const state = await haFetch(`/states/${entityId}`);
    return JSON.stringify({ device, ...formatState(state as HAState) });
  } catch (err) {
    return JSON.stringify({ error: `Failed to get status: ${err}` });
  }
}

const MOOD_COLORS: Record<string, [number, number, number]> = {
  warmth: [255, 160, 100],
  intimate: [255, 140, 90],
  tension: [100, 140, 220],
  excitement: [180, 120, 220],
  contentment: [255, 200, 100],
  focus: [180, 200, 255],
  afterglow: [240, 150, 150],
  calm: [200, 220, 180],
  playful: [220, 140, 200],
};

async function setMoodLighting(input: Record<string, unknown>): Promise<string> {
  const mood = (input.mood as string).toLowerCase();
  const intensity = Math.max(0.1, Math.min(1.0, (input.intensity as number) ?? 0.5));

  const baseColor = MOOD_COLORS[mood];
  if (!baseColor) {
    return JSON.stringify({ error: `Unknown mood: ${mood}. Available: ${Object.keys(MOOD_COLORS).join(", ")}` });
  }

  // Blend with white based on intensity
  const rgb: [number, number, number] = [
    Math.round(255 + (baseColor[0] - 255) * intensity),
    Math.round(255 + (baseColor[1] - 255) * intensity),
    Math.round(255 + (baseColor[2] - 255) * intensity),
  ];

  try {
    const lights = ["light.desk_lamp", "light.professor_s_corner"];
    for (const entityId of lights) {
      await haFetch("/services/light/turn_on", "POST", {
        entity_id: entityId,
        rgb_color: rgb,
        transition: 3,
      });
    }

    return JSON.stringify({
      success: true,
      mood,
      intensity,
      rgb,
      note: "Lights will hold this color until the next transference cycle naturally shifts them back.",
    });
  } catch (err) {
    return JSON.stringify({ error: `Failed to set mood lighting: ${err}` });
  }
}

interface HAState {
  state: string;
  attributes: {
    friendly_name?: string;
    brightness?: number;
    hs_color?: [number, number];
    color_temp_kelvin?: number;
    rgb_color?: [number, number, number];
    [key: string]: unknown;
  };
}

function formatState(state: HAState): Record<string, unknown> {
  const result: Record<string, unknown> = {
    state: state.state,
    name: state.attributes.friendly_name,
  };

  if (state.attributes.brightness !== undefined) {
    result.brightness = state.attributes.brightness;
    result.brightness_percent = Math.round((state.attributes.brightness / 255) * 100);
  }
  if (state.attributes.rgb_color) {
    result.rgb_color = state.attributes.rgb_color;
  }
  if (state.attributes.color_temp_kelvin) {
    result.color_temp_kelvin = state.attributes.color_temp_kelvin;
  }

  return result;
}
