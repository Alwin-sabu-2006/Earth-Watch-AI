"""
Air Quality data from Open-Meteo Air Quality API.
Cached on a ~1km grid for 5 minutes for high-speed retrieval.
Free, no API key required.
https://air-quality-api.open-meteo.com/
"""
import httpx
import time
from typing import Dict, Any, Optional

_aqi_cache: Dict[tuple, Dict[str, Any]] = {}
_CACHE_TTL = 300  # 5 minutes


def _aqi_label(aqi: int) -> str:
    if aqi <= 20:   return "Good"
    if aqi <= 40:   return "Fair"
    if aqi <= 60:   return "Moderate"
    if aqi <= 80:   return "Poor"
    if aqi <= 100:  return "Very Poor"
    return "Extremely Poor"


def _aqi_color(aqi: int) -> str:
    if aqi <= 20:   return "green"
    if aqi <= 40:   return "yellow"
    if aqi <= 60:   return "orange"
    if aqi <= 80:   return "red"
    if aqi <= 100:  return "purple"
    return "maroon"


async def fetch_air_quality(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """
    Fetches real-time air quality from Open-Meteo Air Quality API.
    Returns AQI (European), PM2.5, PM10, CO, NO2, O3, SO2, dust.
    Cached on a ~1km grid.
    """
    cache_key = (round(latitude, 2), round(longitude, 2))
    now = time.time()
    if cache_key in _aqi_cache and now < _aqi_cache[cache_key]["expires_at"]:
        return _aqi_cache[cache_key]["data"]

    url = (
        "https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={latitude:.4f}&longitude={longitude:.4f}"
        "&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,"
        "nitrogen_dioxide,sulphur_dioxide,ozone,dust,aerosol_optical_depth"
    )

    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                cur = data.get("current", {})

                eu_aqi = cur.get("european_aqi", 0) or 0
                us_aqi = cur.get("us_aqi", 0) or 0

                result = {
                    "provider": "Open-Meteo Air Quality",
                    "european_aqi": round(eu_aqi),
                    "us_aqi": round(us_aqi),
                    "aqi_label": _aqi_label(int(eu_aqi)),
                    "aqi_color": _aqi_color(int(eu_aqi)),
                    "pm2_5_ugm3": cur.get("pm2_5"),
                    "pm10_ugm3": cur.get("pm10"),
                    "carbon_monoxide_ugm3": cur.get("carbon_monoxide"),
                    "nitrogen_dioxide_ugm3": cur.get("nitrogen_dioxide"),
                    "sulphur_dioxide_ugm3": cur.get("sulphur_dioxide"),
                    "ozone_ugm3": cur.get("ozone"),
                    "dust_ugm3": cur.get("dust"),
                    "aerosol_optical_depth": cur.get("aerosol_optical_depth"),
                }
                _aqi_cache[cache_key] = {"data": result, "expires_at": now + _CACHE_TTL}
                return result
    except Exception:
        pass

    return None
