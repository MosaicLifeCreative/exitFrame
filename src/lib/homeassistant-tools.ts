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
