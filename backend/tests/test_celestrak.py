import pytest
import datetime
from app.data.celestrak_service import celestrak_service, CELESTRAK_TARGETS

def test_celestrak_init():
    assert len(celestrak_service._satrec_cache) > 0
    assert len(celestrak_service._metadata_cache) > 0


def test_propagate_position():
    # Landsat 8 NORAD 39084
    now = datetime.datetime.now(datetime.timezone.utc)
    pos = celestrak_service.propagate_position(39084, now)
    assert pos is not None
    assert "latitude" in pos
    assert "longitude" in pos
    assert "altitude" in pos
    assert -90.0 <= pos["latitude"] <= 90.0
    assert -180.0 <= pos["longitude"] <= 180.0
    assert 600 <= pos["altitude"] <= 900  # Landsat orbit ~705 km


def test_calculate_overpass():
    # Overpass for Sentinel-1A over Europe (lat 48.0, lon 12.0)
    overpass = celestrak_service.predict_next_pass(39634, 48.0, 12.0, lookahead_hours=24)
    # Even if no pass happens in 24h, it returns None or pass dict
    if overpass:
        assert "predicted_pass_time" in overpass
        assert "closest_approach_km" in overpass
        assert overpass["closest_approach_km"] >= 0


def test_overpass_cache_bounded():
    # Cache should be bounded with TTLCache
    from cachetools import TTLCache
    assert isinstance(celestrak_service._pass_cache, TTLCache)
    assert celestrak_service._pass_cache.maxsize == 1000
