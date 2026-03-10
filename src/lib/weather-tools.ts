import Anthropic from "@anthropic-ai/sdk";

export const weatherTools: Anthropic.Tool[] = [
  {
    name: "get_weather",
    description:
      "Get current weather conditions and forecast for a location. Use this when Trey asks about weather, or when you need weather data for planning (workouts, travel, outfit suggestions). Defaults to Columbus, OH if no location specified.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description:
            "City name or 'city, state' or 'city, country'. Examples: 'Columbus, OH', 'Colorado Springs, CO', 'London, UK'. Defaults to Columbus, OH if omitted.",
        },
      },
      required: [],
    },
  },
];

interface WeatherInput {
  location?: string;
}

interface GeoResult {
  name: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
}

const DEFAULT_LAT = 39.9612;
const DEFAULT_LON = -82.9988;
const DEFAULT_LOCATION = "Columbus, OH";

async function geocodeLocation(
  location: string,
  apiKey: string
): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data: GeoResult[] = await res.json();
    if (data.length === 0) return null;
    const { lat, lon, name, state, country } = data[0];
    const displayName = state ? `${name}, ${state}` : `${name}, ${country}`;
    return { lat, lon, name: displayName };
  } catch {
    return null;
  }
}

async function getWeather(input: WeatherInput): Promise<string> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return JSON.stringify({ error: "Weather is not configured (OPENWEATHER_API_KEY missing)" });
  }

  let lat = DEFAULT_LAT;
  let lon = DEFAULT_LON;
  let locationName = DEFAULT_LOCATION;

  if (input.location) {
    const geo = await geocodeLocation(input.location, apiKey);
    if (!geo) {
      return JSON.stringify({ error: `Could not find location: ${input.location}` });
    }
    lat = geo.lat;
    lon = geo.lon;
    locationName = geo.name;
  }

  try {
    // Try OneCall 3.0 first
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=imperial&exclude=minutely&appid=${apiKey}`;
    let res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      // Fall back to 2.5 API (free tier)
      const fallbackUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;
      res = await fetch(fallbackUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        return JSON.stringify({ error: `Weather API error: HTTP ${res.status}` });
      }

      const data = await res.json();
      return JSON.stringify({
        success: true,
        location: locationName,
        current: {
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          description: data.weather?.[0]?.description || "unknown",
          windMph: Math.round(data.wind?.speed || 0),
          humidity: data.main.humidity,
          high: Math.round(data.main.temp_max),
          low: Math.round(data.main.temp_min),
          pressure: data.main.pressure,
          visibility: data.visibility ? Math.round(data.visibility / 1609) : undefined, // meters to miles
        },
      });
    }

    const data = await res.json();
    const current = data.current;
    const today = data.daily?.[0];
    const alerts = data.alerts?.map((a: { event: string; description: string }) => ({
      event: a.event,
      description: a.description?.slice(0, 200),
    })) || [];

    // Build hourly forecast (next 12 hours)
    const hourly = (data.hourly || []).slice(0, 12).map((h: {
      dt: number;
      temp: number;
      weather: { description: string }[];
      pop: number;
    }) => ({
      time: new Date(h.dt * 1000).toLocaleTimeString("en-US", {
        hour: "numeric",
        timeZone: "America/New_York",
      }),
      temp: Math.round(h.temp),
      description: h.weather?.[0]?.description,
      precipChance: Math.round((h.pop || 0) * 100),
    }));

    // Build daily forecast (next 5 days)
    const daily = (data.daily || []).slice(0, 5).map((d: {
      dt: number;
      temp: { max: number; min: number };
      weather: { description: string }[];
      pop: number;
      wind_speed: number;
    }) => ({
      day: new Date(d.dt * 1000).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "America/New_York",
      }),
      high: Math.round(d.temp.max),
      low: Math.round(d.temp.min),
      description: d.weather?.[0]?.description,
      precipChance: Math.round((d.pop || 0) * 100),
      windMph: Math.round(d.wind_speed || 0),
    }));

    return JSON.stringify({
      success: true,
      location: locationName,
      current: {
        temp: Math.round(current.temp),
        feelsLike: Math.round(current.feels_like),
        description: current.weather?.[0]?.description || "unknown",
        windMph: Math.round(current.wind_speed || 0),
        humidity: current.humidity,
        high: Math.round(today?.temp?.max || current.temp),
        low: Math.round(today?.temp?.min || current.temp),
        uvIndex: current.uvi,
        dewPoint: Math.round(current.dew_point || 0),
      },
      alerts: alerts.length > 0 ? alerts : undefined,
      hourly,
      daily,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return JSON.stringify({ error: "Weather request timed out" });
    }
    const msg = err instanceof Error ? err.message : "Unknown weather error";
    return JSON.stringify({ error: msg });
  }
}

export async function executeWeatherTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "get_weather":
      return getWeather(toolInput as unknown as WeatherInput);
    default:
      return JSON.stringify({ error: `Unknown weather tool: ${toolName}` });
  }
}
