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
  // OpenWeatherMap geocoding expects "city,state,country" format
  // "Columbus, OH" won't work but "Columbus,OH,US" will
  const queries = [location];

  // If it looks like "City, ST" (US state abbreviation), also try with ",US" appended
  const usStatePattern = /^(.+),\s*([A-Z]{2})$/i;
  const match = location.match(usStatePattern);
  if (match) {
    queries.push(`${match[1].trim()},${match[2].trim()},US`);
  }

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) continue;
      const data: GeoResult[] = await res.json();
      if (data.length === 0) continue;
      const { lat, lon, name, state, country } = data[0];
      const displayName = state ? `${name}, ${state}` : `${name}, ${country}`;
      return { lat, lon, name: displayName };
    } catch {
      continue;
    }
  }

  return null;
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
    // Current weather + 5-day forecast (free tier 2.5 API)
    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      ),
    ]);

    if (!currentRes.ok) {
      return JSON.stringify({ error: `Weather API error: HTTP ${currentRes.status}` });
    }

    const currentData = await currentRes.json();
    const current = {
      temp: Math.round(currentData.main.temp),
      feelsLike: Math.round(currentData.main.feels_like),
      description: currentData.weather?.[0]?.description || "unknown",
      windMph: Math.round(currentData.wind?.speed || 0),
      humidity: currentData.main.humidity,
      high: Math.round(currentData.main.temp_max),
      low: Math.round(currentData.main.temp_min),
      pressure: currentData.main.pressure,
      visibility: currentData.visibility ? Math.round(currentData.visibility / 1609) : undefined,
    };

    // Parse 5-day / 3-hour forecast into daily summaries
    let daily: { day: string; high: number; low: number; description: string; precipChance: number; windMph: number }[] = [];
    if (forecastRes.ok) {
      const forecastData = await forecastRes.json();
      const dayMap = new Map<string, { temps: number[]; descriptions: string[]; pops: number[]; winds: number[] }>();

      for (const entry of forecastData.list || []) {
        const dayKey = new Date(entry.dt * 1000).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "America/New_York",
        });
        if (!dayMap.has(dayKey)) {
          dayMap.set(dayKey, { temps: [], descriptions: [], pops: [], winds: [] });
        }
        const d = dayMap.get(dayKey)!;
        d.temps.push(entry.main.temp);
        if (entry.weather?.[0]?.description) d.descriptions.push(entry.weather[0].description);
        d.pops.push(entry.pop || 0);
        d.winds.push(entry.wind?.speed || 0);
      }

      daily = Array.from(dayMap.entries()).slice(0, 5).map(([day, d]) => ({
        day,
        high: Math.round(Math.max(...d.temps)),
        low: Math.round(Math.min(...d.temps)),
        description: d.descriptions[Math.floor(d.descriptions.length / 2)] || "unknown",
        precipChance: Math.round(Math.max(...d.pops) * 100),
        windMph: Math.round(Math.max(...d.winds)),
      }));
    }

    return JSON.stringify({
      success: true,
      location: locationName,
      current,
      daily: daily.length > 0 ? daily : undefined,
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
