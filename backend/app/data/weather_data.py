"""
Weather, Elevation & Solar Ephemeris from Open-Meteo API.
Combines atmospheric forecast, SRTM elevation, and solar ephemeris into
a single unified high-speed request with 2-minute in-memory caching.
Free, no API key required.
"""
import httpx
import time
from typing import Dict, Any, Tuple, Optional

# In-memory weather cache (key: round(lat, 2), round(lon, 2))
_weather_cache: Dict[tuple, Dict[str, Any]] = {}
_CACHE_TTL = 120  # 2 minutes

# WMO Weather interpretation codes
WMO_CODES = {
    0:  ("Clear sky", "☀️"),
    1:  ("Mainly clear", "🌤️"),
    2:  ("Partly cloudy", "⛅"),
    3:  ("Overcast", "☁️"),
    45: ("Fog", "🌫️"),
    48: ("Depositing rime fog", "🌫️"),
    51: ("Light drizzle", "🌦️"),
    53: ("Moderate drizzle", "🌦️"),
    55: ("Dense drizzle", "🌧️"),
    61: ("Slight rain", "🌧️"),
    63: ("Moderate rain", "🌧️"),
    65: ("Heavy rain", "🌧️"),
    71: ("Slight snow", "🌨️"),
    73: ("Moderate snow", "❄️"),
    75: ("Heavy snow", "❄️"),
    77: ("Snow grains", "❄️"),
    80: ("Slight rain showers", "🌦️"),
    81: ("Moderate rain showers", "🌧️"),
    82: ("Violent rain showers", "⛈️"),
    85: ("Slight snow showers", "🌨️"),
    86: ("Heavy snow showers", "❄️"),
    95: ("Thunderstorm", "⛈️"),
    96: ("Thunderstorm with slight hail", "⛈️"),
    99: ("Thunderstorm with heavy hail", "⛈️"),
}


def _uv_label(uv: float) -> str:
    if uv < 3:  return "Low"
    if uv < 6:  return "Moderate"
    if uv < 8:  return "High"
    if uv < 11: return "Very High"
    return "Extreme"


def _format_time(t: Optional[str]) -> Optional[str]:
    if not t:
        return None
    try:
        return t.split("T")[1][:5]
    except Exception:
        return t


async def fetch_live_weather_full(
    latitude: float,
    longitude: float
) -> Tuple[Dict[str, Any], Optional[float], Optional[Dict[str, Any]]]:
    """
    Unified single-hop API request to Open-Meteo returning:
    (weather_dict, elevation_meters, solar_ephemeris_dict).
    Cached on a ~1km grid for 2 minutes to minimize latency.
    """
    cache_key = (round(latitude, 2), round(longitude, 2))
    now = time.time()
    if cache_key in _weather_cache and now < _weather_cache[cache_key]["expires_at"]:
        cached = _weather_cache[cache_key]
        return cached["weather"], cached["elevation"], cached["solar"]

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude:.4f}&longitude={longitude:.4f}"
        f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
        f"precipitation,rain,snowfall,weather_code,cloud_cover,"
        f"wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,"
        f"vapour_pressure_deficit,is_day"
        f"&hourly=uv_index,visibility,dew_point_2m"
        f"&daily=sunrise,sunset,daylight_duration,uv_index_max"
        f"&forecast_days=1&timezone=auto"
    )

    # Primary Live Fetch: Open-Meteo full hourly & daily forecast
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                cur = data.get("current", {})
                hourly = data.get("hourly", {})
                daily = data.get("daily", {})
                code = cur.get("weather_code", 0)
                desc, icon = WMO_CODES.get(code, ("Partly Cloudy", "⛅"))

                uv = (hourly.get("uv_index") or [None])[0]
                vis = (hourly.get("visibility") or [None])[0]
                dew = (hourly.get("dew_point_2m") or [None])[0]
                wind_dir_deg = cur.get("wind_direction_10m", 0)

                def deg_to_compass(deg):
                    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
                            "S","SSW","SW","WSW","W","WNW","NW","NNW"]
                    return dirs[round(deg / 22.5) % 16]

                elevation = data.get("elevation")
                if elevation is not None:
                    elevation = round(float(elevation), 1)

                weather = {
                    "is_live": True,
                    "provider": "Open-Meteo Global Forecasting Model",
                    "temperature_c": cur.get("temperature_2m"),
                    "apparent_temperature_c": cur.get("apparent_temperature"),
                    "humidity_percent": cur.get("relative_humidity_2m"),
                    "precipitation_mm": cur.get("precipitation", 0.0),
                    "rain_mm": cur.get("rain", 0.0),
                    "snowfall_cm": cur.get("snowfall", 0.0),
                    "wind_speed_kmh": cur.get("wind_speed_10m"),
                    "wind_gusts_kmh": cur.get("wind_gusts_10m"),
                    "wind_direction_deg": wind_dir_deg,
                    "wind_direction": deg_to_compass(wind_dir_deg or 0),
                    "pressure_hpa": cur.get("surface_pressure"),
                    "cloud_cover_pct": cur.get("cloud_cover"),
                    "uv_index": round(uv, 1) if uv is not None else None,
                    "uv_label": _uv_label(float(uv)) if uv is not None else None,
                    "visibility_km": round(float(vis) / 1000, 1) if vis is not None else None,
                    "dew_point_c": round(float(dew), 1) if dew is not None else None,
                    "vapour_pressure_deficit": cur.get("vapour_pressure_deficit"),
                    "condition": desc,
                    "icon": icon,
                    "weather_code": code,
                }

                # Solar Ephemeris & Timezone
                is_day = bool(cur.get("is_day", 1))
                tz_name = data.get("timezone", "UTC")
                tz_offset_sec = data.get("utc_offset_seconds", 0)
                sunrises = daily.get("sunrise", [])
                sunsets = daily.get("sunset", [])
                daylight_secs = daily.get("daylight_duration", [])
                uv_max = daily.get("uv_index_max", [])

                solar = {
                    "provider": "Open-Meteo Solar/Astronomy",
                    "timezone": tz_name,
                    "utc_offset_hours": round(tz_offset_sec / 3600.0, 1),
                    "is_daylight": is_day,
                    "solar_phase": "Daylight" if is_day else "Night / Nocturnal",
                    "sunrise": _format_time(sunrises[0] if sunrises else None),
                    "sunset": _format_time(sunsets[0] if sunsets else None),
                    "daylight_duration_hours": round(daylight_secs[0] / 3600.0, 1) if daylight_secs else None,
                    "uv_index_max": round(uv_max[0], 1) if uv_max else None,
                }

                _weather_cache[cache_key] = {
                    "weather": weather,
                    "elevation": elevation,
                    "solar": solar,
                    "expires_at": now + _CACHE_TTL
                }

                return weather, elevation, solar
    except Exception:
        pass

    # Secondary Live Fallback: Lightweight Open-Meteo Current Weather
    try:
        simple_url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={latitude:.4f}&longitude={longitude:.4f}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure"
            f"&timezone=auto"
        )
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(simple_url)
            if resp.status_code == 200:
                data = resp.json()
                cur = data.get("current", {})
                code = cur.get("weather_code", 0)
                desc, icon = WMO_CODES.get(code, ("Clear Sky", "☀️"))
                wind_dir_deg = cur.get("wind_direction_10m", 0)
                dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
                w_dir = dirs[round(wind_dir_deg / 22.5) % 16]

                weather = {
                    "is_live": True,
                    "provider": "Open-Meteo Real-time Sensor Feed",
                    "temperature_c": cur.get("temperature_2m"),
                    "apparent_temperature_c": cur.get("apparent_temperature"),
                    "humidity_percent": cur.get("relative_humidity_2m"),
                    "precipitation_mm": cur.get("precipitation", 0.0),
                    "wind_speed_kmh": cur.get("wind_speed_10m"),
                    "wind_direction": w_dir,
                    "pressure_hpa": cur.get("surface_pressure"),
                    "condition": desc,
                    "icon": icon,
                    "weather_code": code,
                }
                _weather_cache[cache_key] = {
                    "weather": weather,
                    "elevation": data.get("elevation"),
                    "solar": None,
                    "expires_at": now + _CACHE_TTL
                }
                return weather, data.get("elevation"), None
    except Exception:
        pass

    # If completely unreachable, return explicit live-pending state instead of fabricated mock numbers
    pending_weather = {
        "is_live": False,
        "provider": "Meteorological Synchronizer",
        "temperature_c": None,
        "apparent_temperature_c": None,
        "humidity_percent": None,
        "precipitation_mm": None,
        "wind_speed_kmh": None,
        "condition": "Atmospheric telemetry sync pending",
        "icon": "🌤️",
        "weather_code": 1,
    }
    return pending_weather, None, None


async def fetch_live_weather(latitude: float, longitude: float) -> Dict[str, Any]:
    w, _, _ = await fetch_live_weather_full(latitude, longitude)
    return w
