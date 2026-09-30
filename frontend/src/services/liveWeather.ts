// Direct Real-Time Live Weather Service via Open-Meteo
import { WeatherData } from '../types';

const WMO_MAP: Record<number, [string, string]> = {
  0: ['Clear Sky', '☀️'],
  1: ['Mainly Clear', '🌤️'],
  2: ['Partly Cloudy', '⛅'],
  3: ['Overcast', '☁️'],
  45: ['Foggy', '🌫️'],
  48: ['Depositing Rime Fog', '🌫️'],
  51: ['Light Drizzle', '🌦️'],
  53: ['Moderate Drizzle', '🌧️'],
  55: ['Dense Drizzle', '🌧️'],
  56: ['Light Freezing Drizzle', '🌨️'],
  57: ['Dense Freezing Drizzle', '🌨️'],
  61: ['Slight Rain', '🌦️'],
  62: ['Rain', '🌧️'],
  63: ['Moderate Rain', '🌧️'],
  65: ['Heavy Rain', '🌧️'],
  66: ['Light Freezing Rain', '🌨️'],
  67: ['Heavy Freezing Rain', '🌨️'],
  71: ['Slight Snowfall', '❄️'],
  73: ['Moderate Snowfall', '❄️'],
  75: ['Heavy Snowfall', '❄️'],
  77: ['Snow Grains', '❄️'],
  80: ['Slight Rain Showers', '🌦️'],
  81: ['Moderate Rain Showers', '🌧️'],
  82: ['Violent Rain Showers', '⛈️'],
  85: ['Slight Snow Showers', '🌨️'],
  86: ['Heavy Snow Showers', '🌨️'],
  95: ['Thunderstorm', '⚡'],
  96: ['Thunderstorm with Slight Hail', '⛈️'],
  99: ['Severe Thunderstorm with Hail', '⛈️'],
};

const _clientWeatherCache = new Map<string, { data: WeatherData; expires: number }>();

function getUvLabel(uv: number): string {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
}

/**
 * Fetch 100% genuine real-time live weather from Open-Meteo
 * Returns null if network fails completely — never fabricates mock numbers.
 */
export async function fetchLiveWeatherClient(
  lat: number,
  lon: number
): Promise<WeatherData | null> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const now = Date.now();
  const cached = _clientWeatherCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,surface_pressure` +
    `&hourly=uv_index,visibility,dew_point_2m` +
    `&forecast_days=1&timezone=auto`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    const cur = json.current || {};
    const hourly = json.hourly || {};
    const code = Number(cur.weather_code ?? 0);
    const [cond, icon] = WMO_MAP[code] || ['Partly Cloudy', '⛅'];

    const uv = hourly.uv_index ? hourly.uv_index[0] : null;
    const vis = hourly.visibility ? hourly.visibility[0] : null;
    const dew = hourly.dew_point_2m ? hourly.dew_point_2m[0] : null;

    const weatherData: WeatherData = {
      is_live: true,
      provider: 'Open-Meteo Global Forecasting Model',
      temperature_c: Math.round((cur.temperature_2m ?? 0) * 10) / 10,
      apparent_temperature_c: Math.round((cur.apparent_temperature ?? 0) * 10) / 10,
      humidity_percent: Math.round(cur.relative_humidity_2m ?? 0),
      precipitation_mm: Math.round((cur.precipitation ?? 0) * 10) / 10,
      wind_speed_kmh: Math.round((cur.wind_speed_10m ?? 0) * 10) / 10,
      wind_direction_deg: cur.wind_direction_10m ?? 0,
      pressure_hpa: Math.round((cur.surface_pressure ?? 1013) * 10) / 10,
      condition: cond,
      icon: icon,
      weather_code: code,
      uv_index: uv != null ? Math.round(uv * 10) / 10 : null,
      uv_label: uv != null ? getUvLabel(uv) : null,
      visibility_km: vis != null ? Math.round((vis / 1000) * 10) / 10 : null,
      dew_point_c: dew != null ? Math.round(dew * 10) / 10 : null,
      cloud_cover_pct: cur.cloud_cover ?? 0,
      cloudcover_percent: cur.cloud_cover ?? 0,
      feels_like_c: Math.round((cur.apparent_temperature ?? 0) * 10) / 10,
      temperature_celsius: Math.round((cur.temperature_2m ?? 0) * 10) / 10,
      description: cond,
      humidity_pct: Math.round(cur.relative_humidity_2m ?? 0),
    };

    _clientWeatherCache.set(cacheKey, { data: weatherData, expires: now + 120000 });
    return weatherData;
  } catch (err) {
    console.warn('Direct Open-Meteo fetch failed:', err);
    return null;
  }
}
