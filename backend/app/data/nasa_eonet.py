"""
NASA EONET (Earth Observatory Natural Event Tracker) integration.
Free API, no key required.
https://eonet.gsfc.nasa.gov/api/v3/
"""
import httpx
from typing import List, Dict, Any

# In-process cache — EONET events don't change minute-to-minute
_eonet_cache: Dict[str, Any] = {}
_CACHE_TTL_SECONDS = 900  # 15-minute cache

import time


async def fetch_nasa_eonet_events(days: int = 7, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Fetches currently open natural events from NASA EONET.
    Categories include: wildfires, severe storms, volcanoes, sea/lake ice,
    earthquakes, floods, landslides, dust/haze, snow.
    Results are cached for 15 minutes to avoid hammering the API.
    """
    cache_key = f"eonet_{days}_{limit}"
    cached = _eonet_cache.get(cache_key)
    if cached and cached["expires"] > time.time():
        return cached["data"]

    url = (
        f"https://eonet.gsfc.nasa.gov/api/v3/events"
        f"?status=open&days={days}&limit={limit}"
    )

    events = []
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                for ev in data.get("events", []):
                    # Extract first geometry point
                    geometries = ev.get("geometries", [])
                    if not geometries:
                        continue
                    geo = geometries[-1]  # most recent geometry
                    coords = geo.get("coordinates", [])
                    if not coords or len(coords) < 2:
                        continue

                    categories = ev.get("categories", [])
                    cat_title = categories[0].get("title", "Unknown") if categories else "Unknown"
                    cat_id = categories[0].get("id", "unknown") if categories else "unknown"

                    events.append({
                        "id": ev.get("id"),
                        "title": ev.get("title"),
                        "category": cat_title,
                        "category_id": cat_id,
                        "longitude": float(coords[0]),
                        "latitude": float(coords[1]),
                        "date": geo.get("date"),
                        "source": "NASA EONET",
                        "link": ev.get("link"),
                    })
    except Exception:
        pass

    _eonet_cache[cache_key] = {"data": events, "expires": time.time() + _CACHE_TTL_SECONDS}
    return events


def find_eonet_events_near(
    events: List[Dict[str, Any]],
    latitude: float,
    longitude: float,
    radius_km: float = 1000
) -> List[Dict[str, Any]]:
    """Filter EONET events within radius_km of the given coordinate."""
    import math

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        return R * 2 * math.asin(math.sqrt(a))

    nearby = []
    for ev in events:
        d = haversine(latitude, longitude, ev["latitude"], ev["longitude"])
        if d <= radius_km:
            nearby.append({**ev, "distance_km": round(d, 1)})

    nearby.sort(key=lambda x: x["distance_km"])
    return nearby
