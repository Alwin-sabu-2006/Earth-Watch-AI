"""
Open-Meteo Marine Hydrodynamics & Wave API Integration.
Free, official Open-Meteo Marine API (no key required).
https://marine-api.open-meteo.com/
"""
import time
import httpx
from typing import Optional, Dict, Any

_marine_cache: Dict[tuple, Dict[str, Any]] = {}
_CACHE_TTL = 600  # 10 minutes


async def fetch_marine_conditions(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """
    Fetches real-time wave height, swell, and ocean wave period.
    Returns None for deep landlocked coordinates where no marine grid is active.
    Cached on 0.1 degree grid for 10 minutes for instant repeat response.
    """
    now = time.time()
    cache_key = (round(latitude, 1), round(longitude, 1))
    if cache_key in _marine_cache:
        cached = _marine_cache[cache_key]
        if now < cached["expires_at"]:
            return cached["data"]

    url = (
        "https://marine-api.open-meteo.com/v1/marine"
        f"?latitude={latitude:.4f}&longitude={longitude:.4f}"
        "&current=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,swell_wave_period"
    )

    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get(url, headers={"User-Agent": "EarthWatch-AI/2.0"})
            if resp.status_code == 200:
                data = resp.json()
                cur = data.get("current", {})
                wave_height = cur.get("wave_height")
                if wave_height is None:
                    _marine_cache[cache_key] = {"data": None, "expires_at": now + _CACHE_TTL}
                    return None

                def sea_state_label(h: float) -> str:
                    if h < 0.5:
                        return "Calm (Glassy/Rippled)"
                    elif h < 1.25:
                        return "Smooth to Slight"
                    elif h < 2.5:
                        return "Moderate Seas"
                    elif h < 4.0:
                        return "Rough Seas"
                    elif h < 6.0:
                        return "Very Rough"
                    elif h < 9.0:
                        return "High Seas"
                    return "Phenomenal / Extreme Seas"

                res = {
                    "provider": "Open-Meteo Marine",
                    "wave_height_m": round(float(wave_height), 2),
                    "wave_direction_deg": cur.get("wave_direction"),
                    "wave_period_s": cur.get("wave_period"),
                    "wind_wave_height_m": cur.get("wind_wave_height"),
                    "swell_wave_height_m": cur.get("swell_wave_height"),
                    "swell_wave_period_s": cur.get("swell_wave_period"),
                    "sea_state": sea_state_label(float(wave_height)),
                }
                _marine_cache[cache_key] = {"data": res, "expires_at": now + _CACHE_TTL}
                return res
    except Exception:
        pass

    _marine_cache[cache_key] = {"data": None, "expires_at": now + _CACHE_TTL}
    return None
