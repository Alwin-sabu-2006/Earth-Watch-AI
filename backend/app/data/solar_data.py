"""
Solar Ephemeris, Daylight, Sunrise/Sunset & Timezone Data Integration.
Utilizes Open-Meteo Solar & Daily Astronomy variables (free, no key required).
"""
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any


async def fetch_solar_ephemeris(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """
    Fetches solar ephemeris: sunrise, sunset, daylight duration, UV index, and local timezone.
    """
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude:.4f}&longitude={longitude:.4f}"
        "&daily=sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max"
        "&current=is_day"
        "&timezone=auto"
    )

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(url, headers={"User-Agent": "EarthWatch-AI/2.0"})
            if resp.status_code == 200:
                data = resp.json()
                daily = data.get("daily", {})
                current = data.get("current", {})
                tz_name = data.get("timezone", "UTC")
                tz_offset_sec = data.get("utc_offset_seconds", 0)

                sunrises = daily.get("sunrise", [])
                sunsets = daily.get("sunset", [])
                daylight_secs = daily.get("daylight_duration", [])
                uv_max = daily.get("uv_index_max", [])

                sunrise_str = sunrises[0] if sunrises else None
                sunset_str = sunsets[0] if sunsets else None
                daylight_hrs = round(daylight_secs[0] / 3600.0, 1) if daylight_secs else None
                max_uv = round(uv_max[0], 1) if uv_max else None

                # Format time cleanly (HH:MM)
                def format_iso_time(t: Optional[str]) -> Optional[str]:
                    if not t:
                        return None
                    try:
                        return t.split("T")[1][:5]
                    except Exception:
                        return t

                is_day = bool(current.get("is_day", 1))

                return {
                    "provider": "Open-Meteo Solar/Astronomy",
                    "timezone": tz_name,
                    "utc_offset_hours": round(tz_offset_sec / 3600.0, 1),
                    "is_daylight": is_day,
                    "solar_phase": "Daylight" if is_day else "Night / Nocturnal",
                    "sunrise": format_iso_time(sunrise_str),
                    "sunset": format_iso_time(sunset_str),
                    "daylight_duration_hours": daylight_hrs,
                    "uv_index_max": max_uv,
                }
    except Exception:
        pass

    return None
