"""
USGS Real-time Earthquake API Integration.
High-performance in-memory cache utilizing the official USGS CDN feed.
https://earthquake.usgs.gov/earthquakes/feed/v1.0/
"""
import httpx
import math
import time
from datetime import datetime, timezone
from typing import List, Dict, Any

# In-memory cache for global earthquakes (updated every 5 minutes)
_quake_cache: Dict[str, Any] = {"data": [], "expires_at": 0}
_CACHE_TTL = 300  # 5 minutes


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


async def _get_global_quakes() -> List[Dict[str, Any]]:
    now = time.time()
    if _quake_cache["data"] and now < _quake_cache["expires_at"]:
        return _quake_cache["data"]

    # Pre-generated, CDN-cached feed from USGS — returns in <0.5s instead of 2.5s spatial queries
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(url, headers={"User-Agent": "EarthWatch-AI/2.0"})
            if resp.status_code == 200:
                features = resp.json().get("features", [])
                parsed = []
                for f in features:
                    props = f.get("properties", {})
                    geom = f.get("geometry", {})
                    coords = geom.get("coordinates", [0, 0, 0])
                    mag = props.get("mag")
                    if mag is None:
                        continue
                    mag = float(mag)
                    place = props.get("place", "Seismic Zone")
                    time_epoch = (props.get("time") or 0) / 1000.0
                    detected_dt = datetime.fromtimestamp(time_epoch, timezone.utc).isoformat()
                    q_lat = float(coords[1])
                    q_lon = float(coords[0])
                    depth_km = float(coords[2]) if len(coords) > 2 else 0.0

                    sev = "low"
                    if mag >= 6.5:
                        sev = "critical"
                    elif mag >= 5.5:
                        sev = "high"
                    elif mag >= 4.5:
                        sev = "moderate"

                    parsed.append({
                        "id": f"usgs-{f.get('id', 'quake')}",
                        "title": props.get("title") or f"M {mag:.1f} - {place}",
                        "place": place,
                        "magnitude": round(mag, 1),
                        "depth_km": round(depth_km, 1),
                        "latitude": round(q_lat, 4),
                        "longitude": round(q_lon, 4),
                        "severity": sev,
                        "time": detected_dt,
                        "url": props.get("url"),
                        "tsunami_alert": bool(props.get("tsunami", 0)),
                        "source": "USGS Live Network"
                    })
                _quake_cache["data"] = parsed
                _quake_cache["expires_at"] = now + _CACHE_TTL
                return parsed
    except Exception:
        pass

    return _quake_cache["data"]


async def fetch_usgs_local_earthquakes(
    latitude: float,
    longitude: float,
    radius_km: float = 1000.0,
    min_mag: float = 2.5,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Returns real-time earthquakes near coordinates.
    Filtered in memory from the cached global USGS feed — sub-millisecond execution.
    """
    all_quakes = await _get_global_quakes()
    nearby: List[Dict[str, Any]] = []

    for q in all_quakes:
        if q["magnitude"] < min_mag:
            continue
        dist = haversine_km(latitude, longitude, q["latitude"], q["longitude"])
        if dist <= radius_km:
            nearby.append({**q, "distance_km": round(dist, 1)})

    nearby.sort(key=lambda x: x["distance_km"])
    return nearby[:limit]
