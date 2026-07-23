import { Ionicons } from '@expo/vector-icons';

// NWS (api.weather.gov) -- free, no API key, no signup. US-only coverage,
// which is the right tradeoff for a hunting/backcountry app whose trips are
// almost always domestic, and it means nothing here is blocked on getting a
// vendor API key from Austin.
export type ForecastPeriod = {
  name: string; // "Tonight", "Wednesday", "Wednesday Night"
  dateStamp: string; // YYYY-MM-DD, local to the period
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
};

export type ForecastResult =
  | { status: 'ok'; periods: ForecastPeriod[] }
  | { status: 'out_of_range' } // valid US point, but trip is beyond NWS's ~7-day window
  | { status: 'unavailable' }; // non-US point, or the API didn't answer

// NWS periods carry their UTC offset in the ISO string (e.g. "...T06:00:00-06:00"),
// so the date substring IS already the correct local calendar date -- no
// timezone math needed.
const localDateOf = (iso: string) => iso.slice(0, 10);

export async function fetchTripForecast(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
): Promise<ForecastResult> {
  try {
    const pointRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {
      headers: { Accept: 'application/geo+json' },
    });
    if (!pointRes.ok) return { status: 'unavailable' };
    const point = await pointRes.json();
    const forecastUrl: string | undefined = point?.properties?.forecast;
    if (!forecastUrl) return { status: 'unavailable' };

    const forecastRes = await fetch(forecastUrl, { headers: { Accept: 'application/geo+json' } });
    if (!forecastRes.ok) return { status: 'unavailable' };
    const forecast = await forecastRes.json();
    const rawPeriods: {
      name: string;
      startTime: string;
      isDaytime: boolean;
      temperature: number;
      temperatureUnit: string;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
    }[] = forecast?.properties?.periods ?? [];

    const periods: ForecastPeriod[] = rawPeriods
      .map((p) => ({
        name: p.name,
        dateStamp: localDateOf(p.startTime),
        isDaytime: p.isDaytime,
        temperature: p.temperature,
        temperatureUnit: p.temperatureUnit,
        windSpeed: p.windSpeed,
        windDirection: p.windDirection,
        shortForecast: p.shortForecast,
      }))
      .filter((p) => p.dateStamp >= startDate && p.dateStamp <= endDate);

    if (periods.length === 0) return { status: 'out_of_range' };
    return { status: 'ok', periods };
  } catch {
    return { status: 'unavailable' };
  }
}

export function weatherIcon(shortForecast: string): keyof typeof Ionicons.glyphMap {
  const s = shortForecast.toLowerCase();
  if (/thunder|storm/.test(s)) return 'thunderstorm-outline';
  if (/snow|flurr|sleet|ice/.test(s)) return 'snow-outline';
  if (/rain|shower|drizzle/.test(s)) return 'rainy-outline';
  if (/fog|haze|smoke/.test(s)) return 'cloud-outline';
  if (/cloud|overcast/.test(s)) {
    return /sunny|clear/.test(s) ? 'partly-sunny-outline' : 'cloudy-outline';
  }
  if (/clear|sunny|fair/.test(s)) return 'sunny-outline';
  return 'partly-sunny-outline';
}
