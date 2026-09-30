"""
Elevation data from Open-Meteo Elevation API.
Free, no API key required.
https://api.open-meteo.com/v1/elevation
"""
import httpx
from typing import Optional


async def fetch_elevation(latitude: float, longitude: float) -> Optional[float]:
    """
    Returns the elevation in meters above sea level for the given coordinate.
    Uses the Open-Meteo Elevation API (SRTM 90m digital elevation model).
    """
    url = (
        f"https://api.open-meteo.com/v1/elevation"
        f"?latitude={latitude:.4f}&longitude={longitude:.4f}"
    )
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                elevations = data.get("elevation", [])
                if elevations:
                    return round(float(elevations[0]), 1)
    except Exception:
        pass
    return None
