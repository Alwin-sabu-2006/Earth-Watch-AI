"""
Wikipedia Geospatial Knowledge & Landmark API Integration.
High-speed in-memory cached lookup with 1.0s timeout.
"""
import httpx
import urllib.parse
from typing import Optional, Dict, Any

_wiki_cache: Dict[tuple, Any] = {}


async def fetch_wikipedia_knowledge(latitude: float, longitude: float, radius_m: int = 15000) -> Optional[Dict[str, Any]]:
    """
    Finds the nearest geographical landmark on Wikipedia within radius_m.
    Cached on a ~10km grid for instant responses.
    """
    cache_key = (round(latitude, 1), round(longitude, 1))
    if cache_key in _wiki_cache:
        return _wiki_cache[cache_key]

    geo_url = (
        "https://en.wikipedia.org/w/api.php"
        f"?action=query&list=geosearch&gscoord={latitude:.4f}|{longitude:.4f}"
        f"&gsradius={radius_m}&gslimit=1&format=json"
    )

    headers = {"User-Agent": "EarthWatch-AI/2.0 (geointel@earthwatch.local)"}

    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get(geo_url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("query", {}).get("geosearch", [])
                if not results:
                    _wiki_cache[cache_key] = None
                    return None

                first = results[0]
                title = first.get("title")
                dist_m = first.get("dist", 0)

                summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
                s_resp = await client.get(summary_url, headers=headers)
                if s_resp.status_code == 200:
                    s_data = s_resp.json()
                    extract = s_data.get("extract")
                    description = s_data.get("description")
                    page_url = s_data.get("content_urls", {}).get("desktop", {}).get("page")
                    thumbnail = s_data.get("thumbnail", {}).get("source")

                    result = {
                        "provider": "Wikipedia GeoSearch",
                        "title": title,
                        "description": description,
                        "extract": extract[:300] + "..." if extract and len(extract) > 300 else extract,
                        "distance_km": round(dist_m / 1000.0, 1),
                        "url": page_url,
                        "thumbnail": thumbnail,
                    }
                    _wiki_cache[cache_key] = result
                    return result
    except Exception:
        pass

    _wiki_cache[cache_key] = None
    return None
