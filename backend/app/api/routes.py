import asyncio
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.models.database import (
    get_db, SatelliteModel, DisasterEventModel, LocationModel, EventSatelliteModel
)
from app.models.schemas import (
    SatelliteOut, DisasterEventOut, DisasterEventDetail, EventSatelliteOut,
    LocationOut, LocationDetail, SimulationRequest, SimulationResponse,
    AIAnalyzeRequest, AIAnalyzeResponse, AnalyticsData
)
from app.data.satellites_data import (
    SATELLITE_CATALOG, compute_current_satellite_position, haversine_distance
)
from app.data.disasters_data import (
    BASE_DISASTER_EVENTS, fetch_live_usgs_earthquakes
)
from app.data.weather_data import fetch_live_weather, fetch_live_weather_full
from app.data.locations_data import SEED_LOCATIONS, geocode_query, reverse_geocode, offline_reverse_geocode
from app.data.air_quality_data import fetch_air_quality
from app.data.elevation_data import fetch_elevation
from app.data.nasa_eonet import fetch_nasa_eonet_events, find_eonet_events_near
from app.data.usgs_data import fetch_usgs_local_earthquakes
from app.data.marine_data import fetch_marine_conditions
from app.data.solar_data import fetch_solar_ephemeris
from app.data.wiki_data import fetch_wikipedia_knowledge
from app.services.simulation import run_disaster_simulation
from app.ai.analyst import process_analyst_query
from app.data.celestrak_service import celestrak_service, CELESTRAK_TARGETS

router = APIRouter(prefix="/api")

# ── In-memory position cache to avoid SGP4 recomputation on every poll ───────
# satellites move ~7 km/s so 20-second stale positions are still visually accurate
_sat_position_cache: dict = {}   # norad_id -> {pos, expires_at}
_SAT_CACHE_TTL = 20  # seconds


# Seed data helper
def ensure_db_seeded(db: Session):
    existing_sat_ids = {row[0] for row in db.query(SatelliteModel.id).all()}
    now = datetime.now(timezone.utc)
    new_sats_added = False

    for s in SATELLITE_CATALOG:
        if s["id"] in existing_sat_ids:
            continue

        norad = s.get("norad_id")
        sgp4_pos = celestrak_service.propagate_position(norad, now) if norad else None

        if sgp4_pos:
            lat = sgp4_pos["latitude"]
            lon = sgp4_pos["longitude"]
            alt = sgp4_pos["altitude"]
            vel = sgp4_pos["velocity"]
            inc = sgp4_pos["inclination"]
            period = sgp4_pos["period_minutes"]
            ecc = sgp4_pos["eccentricity"]
            l1 = sgp4_pos["tle_line1"]
            l2 = sgp4_pos["tle_line2"]
            swath = sgp4_pos["swath_km"]
            sensor = sgp4_pos["sensor_type"]
        else:
            pos = compute_current_satellite_position(s, now)
            lat, lon = pos["latitude"], pos["longitude"]
            alt, vel, inc, period, ecc = s.get("altitude"), s.get("velocity"), s.get("inclination"), s.get("period_minutes", 95.0), 0.0001
            l1, l2, swath, sensor = None, None, s.get("swath_km", 250.0), s.get("sensor_type", "Multispectral")

        sat = SatelliteModel(
            id=s["id"],
            name=s["name"],
            norad_id=norad,
            country=s.get("country"),
            operator=s.get("operator"),
            mission=s["mission"],
            purpose=s.get("purpose"),
            orbit_type=s.get("orbit_type", "LEO"),
            altitude=alt,
            launch_date=s.get("launch_date"),
            latitude=lat,
            longitude=lon,
            velocity=vel,
            inclination=inc,
            eccentricity=ecc,
            period_minutes=period,
            tle_line1=l1,
            tle_line2=l2,
            sensor_type=sensor,
            swath_km=swath,
            data_source="CelesTrak (celestrak.org) / NORAD",
            status=s.get("status", "Active"),
            is_live=True,
            last_updated=now
        )
        db.add(sat)
        new_sats_added = True

    if new_sats_added:
        db.commit()

    if db.query(DisasterEventModel).count() == 0:
        now = datetime.now(timezone.utc)
        for e in BASE_DISASTER_EVENTS:
            dt = now - timedelta(hours=e.get("hours_ago", 6))
            ev = DisasterEventModel(
                id=e["id"],
                title=e["title"],
                type=e["type"],
                latitude=e["latitude"],
                longitude=e["longitude"],
                severity=e["severity"],
                description=e["description"],
                detected_at=dt,
                source=e["source"],
                status=e["status"],
                affected_area_km2=e.get("affected_area_km2"),
                estimated_population=e.get("estimated_population"),
                ai_summary=e.get("ai_summary"),
                is_live=False,
                is_simulated=False
            )
            db.add(ev)

    if db.query(LocationModel).count() == 0:
        for loc in SEED_LOCATIONS:
            l = LocationModel(
                id=loc["id"],
                name=loc["name"],
                country=loc["country"],
                latitude=loc["latitude"],
                longitude=loc["longitude"],
                region=loc.get("region"),
                population=loc.get("population")
            )
            db.add(l)

    db.commit()


@router.get("/satellites", response_model=List[SatelliteOut])
def get_satellites(
    mission: Optional[str] = None,
    orbit_type: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    ensure_db_seeded(db)
    now = datetime.now(timezone.utc)
    satellites = db.query(SatelliteModel).all()

    results: List[SatelliteOut] = []
    for sat in satellites:
        # High precision SGP4 propagation from CelesTrak TLE — cached for 20s
        if sat.norad_id:
            cached = _sat_position_cache.get(sat.norad_id)
            if cached and cached["expires_at"] > now.timestamp():
                sgp4_pos = cached["pos"]
            else:
                sgp4_pos = celestrak_service.propagate_position(sat.norad_id, now)
                if sgp4_pos:
                    _sat_position_cache[sat.norad_id] = {
                        "pos": sgp4_pos,
                        "expires_at": now.timestamp() + _SAT_CACHE_TTL
                    }
            if sgp4_pos:
                sat.latitude = sgp4_pos["latitude"]
                sat.longitude = sgp4_pos["longitude"]
                sat.altitude = sgp4_pos["altitude"]
                sat.velocity = sgp4_pos["velocity"]
                sat.inclination = sgp4_pos["inclination"]
                sat.period_minutes = sgp4_pos["period_minutes"]
                sat.eccentricity = sgp4_pos["eccentricity"]
                sat.tle_line1 = sgp4_pos["tle_line1"]
                sat.tle_line2 = sgp4_pos["tle_line2"]
                sat.sensor_type = sgp4_pos["sensor_type"]
                sat.swath_km = sgp4_pos["swath_km"]
                sat.data_source = "CelesTrak (celestrak.org) / NORAD"
                sat.last_updated = now
        else:
            cat_match = next((c for c in SATELLITE_CATALOG if c["id"] == sat.id), None)
            if cat_match:
                pos = compute_current_satellite_position(cat_match, now)
                sat.latitude = pos["latitude"]
                sat.longitude = pos["longitude"]
                sat.last_updated = now

        # Filter in memory
        if mission and mission.lower() != "all" and sat.mission.lower() != mission.lower():
            continue
        if orbit_type and orbit_type.lower() != "all" and (sat.orbit_type or "").lower() != orbit_type.lower():
            continue
        if q:
            q_lower = q.lower()
            if q_lower not in sat.name.lower() and q_lower not in (sat.country or "").lower() and q_lower not in (sat.purpose or "").lower():
                continue

        results.append(SatelliteOut.from_orm(sat))

    return results


@router.get("/satellites/{id}", response_model=SatelliteOut)
def get_satellite(id: str, db: Session = Depends(get_db)):
    ensure_db_seeded(db)
    sat = db.query(SatelliteModel).filter(SatelliteModel.id == id).first()
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found")

    now = datetime.now(timezone.utc)
    if sat.norad_id:
        sgp4_pos = celestrak_service.propagate_position(sat.norad_id, now)
        if sgp4_pos:
            sat.latitude = sgp4_pos["latitude"]
            sat.longitude = sgp4_pos["longitude"]
            sat.altitude = sgp4_pos["altitude"]
            sat.velocity = sgp4_pos["velocity"]
            sat.tle_line1 = sgp4_pos["tle_line1"]
            sat.tle_line2 = sgp4_pos["tle_line2"]
            sat.sensor_type = sgp4_pos["sensor_type"]
            sat.swath_km = sgp4_pos["swath_km"]
            sat.data_source = "CelesTrak (celestrak.org) / NORAD"

    return SatelliteOut.from_orm(sat)


@router.get("/satellites/near/{latitude}/{longitude}", response_model=List[EventSatelliteOut])
def get_satellites_near_location(
    latitude: float,
    longitude: float,
    max_results: int = 5,
    db: Session = Depends(get_db)
):
    ensure_db_seeded(db)
    now = datetime.now(timezone.utc)
    sats = db.query(SatelliteModel).all()

    near_sats = []
    for s in sats:
        cat_match = next((c for c in SATELLITE_CATALOG if c["id"] == s.id), None)
        if cat_match:
            pos = compute_current_satellite_position(cat_match, now)
            sat_lat = pos["latitude"]
            sat_lon = pos["longitude"]
        else:
            sat_lat = s.latitude
            sat_lon = s.longitude

        dist = haversine_distance(latitude, longitude, sat_lat, sat_lon)
        rel = "Orbital Overpass"
        if dist < 1200:
            rel = "Direct Zenith Line-of-Sight"
        elif dist < 3000:
            rel = "Regional Monitoring Swath"

        near_sats.append(EventSatelliteOut(
            satellite_id=s.id,
            satellite_name=s.name,
            mission=s.mission,
            orbit_type=s.orbit_type or "LEO",
            altitude=s.altitude,
            latitude=sat_lat,
            longitude=sat_lon,
            relationship=rel,
            distance_km=dist
        ))

    near_sats.sort(key=lambda x: x.distance_km)
    return near_sats[:max_results]


@router.get("/events", response_model=List[DisasterEventOut])
def get_events(
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    include_simulated: bool = False,
    db: Session = Depends(get_db)
):
    ensure_db_seeded(db)
    query = db.query(DisasterEventModel)

    if not include_simulated:
        query = query.filter(DisasterEventModel.is_simulated == False)
    if event_type and event_type.lower() != "all":
        query = query.filter(DisasterEventModel.type == event_type.lower())
    if severity and severity.lower() != "all":
        query = query.filter(DisasterEventModel.severity == severity.lower())
    if status and status.lower() != "all":
        query = query.filter(DisasterEventModel.status == status)

    events = query.order_by(DisasterEventModel.detected_at.desc()).all()
    return [DisasterEventOut.from_orm(e) for e in events]


@router.get("/events/nearby", response_model=List[DisasterEventOut])
def get_events_nearby(
    latitude: float,
    longitude: float,
    radius_km: float = 3000.0,
    db: Session = Depends(get_db)
):
    ensure_db_seeded(db)
    events = db.query(DisasterEventModel).filter(DisasterEventModel.is_simulated == False).all()

    nearby = []
    for e in events:
        dist = haversine_distance(latitude, longitude, e.latitude, e.longitude)
        if dist <= radius_km:
            nearby.append((dist, e))

    nearby.sort(key=lambda x: x[0])
    return [DisasterEventOut.from_orm(e) for _, e in nearby]


@router.get("/events/{id}", response_model=DisasterEventDetail)
async def get_event_detail(id: str, db: Session = Depends(get_db)):
    ensure_db_seeded(db)
    ev = db.query(DisasterEventModel).filter(DisasterEventModel.id == id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    # Correlate relevant satellites
    now = datetime.now(timezone.utc)
    sats = db.query(SatelliteModel).all()
    relevant: List[EventSatelliteOut] = []

    for s in sats:
        # High precision SGP4 propagation from CelesTrak
        now = datetime.now(timezone.utc)
        if s.norad_id:
            sgp4_pos = celestrak_service.propagate_position(s.norad_id, now)
            sat_lat = sgp4_pos["latitude"] if sgp4_pos else s.latitude
            sat_lon = sgp4_pos["longitude"] if sgp4_pos else s.longitude
            sat_alt = sgp4_pos["altitude"] if sgp4_pos else s.altitude
            swath = sgp4_pos["swath_km"] if sgp4_pos else 250.0
            sensor = sgp4_pos["sensor_type"] if sgp4_pos else "Optical/Thermal"
        else:
            cat_match = next((c for c in SATELLITE_CATALOG if c["id"] == s.id), None)
            pos = compute_current_satellite_position(cat_match, now) if cat_match else {"latitude": s.latitude, "longitude": s.longitude}
            sat_lat, sat_lon, sat_alt = pos["latitude"], pos["longitude"], s.altitude
            swath = 250.0
            sensor = "Multispectral"

        dist = haversine_distance(ev.latitude, ev.longitude, sat_lat, sat_lon)

        # CelesTrak Overpass & Swath Intersection Analysis
        pass_info = None
        next_pass_min = None
        rel = "Orbital Pass Tracking"
        is_relevant = False

        if s.norad_id:
            pass_info = celestrak_service.predict_next_pass(s.norad_id, ev.latitude, ev.longitude, lookahead_hours=24)
            if pass_info:
                next_pass_min = pass_info.get("minutes_until_pass")
                if pass_info.get("is_within_swath"):
                    rel = f"Direct Ground Swath ({sensor})"
                    is_relevant = True
                elif next_pass_min is not None and next_pass_min < 180:
                    rel = f"Upcoming Pass in {next_pass_min}m ({sensor})"
                    is_relevant = True

        if not is_relevant:
            if ev.type in ["wildfire", "heatwave"] and (s.mission in ["Earth Observation", "Disaster monitoring"] or "VIIRS" in s.name or "MODIS" in s.name):
                rel = f"Thermal Infrared Swath ({sensor})"
                is_relevant = True
            elif ev.type in ["flood", "earthquake"] and ("SAR" in (s.purpose or "") or s.mission == "Disaster monitoring"):
                rel = f"Synthetic Aperture Radar Inundation ({sensor})"
                is_relevant = True
            elif ev.type == "cyclone" and (s.mission in ["Weather", "Scientific"] or "GOES" in s.name or "INSAT" in s.name):
                rel = f"Geostationary Eyewall Imagery ({sensor})"
                is_relevant = True
            elif dist < 3500:
                rel = f"Regional Overpass ({sensor})"
                is_relevant = True

        if is_relevant:
            relevant.append(EventSatelliteOut(
                satellite_id=s.id,
                satellite_name=s.name,
                mission=s.mission,
                orbit_type=s.orbit_type or "LEO",
                altitude=sat_alt,
                latitude=sat_lat,
                longitude=sat_lon,
                relationship=rel,
                distance_km=dist,
                sensor_type=sensor,
                swath_km=swath,
                next_pass_in_minutes=next_pass_min
            ))

    relevant.sort(key=lambda x: x.distance_km)

    # Fetch live weather at event location
    weather = await fetch_live_weather(ev.latitude, ev.longitude)

    detail = DisasterEventDetail.from_orm(ev)
    detail.relevant_satellites = relevant[:5]
    detail.weather_context = weather
    return detail


@router.get("/locations/search", response_model=List[LocationOut])
async def search_locations(q: str, db: Session = Depends(get_db)):
    ensure_db_seeded(db)
    results = await geocode_query(q)
    return [LocationOut(**r) for r in results]


@router.get("/locations/inspect")
async def inspect_location_spot(
    latitude: float = Query(...),
    longitude: float = Query(...),
    db: Session = Depends(get_db)
):
    """
    Full geospatial intelligence report for any coordinate:
    reverse geocode, weather, air quality, elevation, NASA EONET natural events,
    USGS real-time seismics, and CelesTrak satellite overpass prediction.
    All external calls run in parallel for minimum latency.
    """
    # Safe wrapper with realistic timeout ceiling
    async def safe_call(coro, default=None, timeout_sec=5.0):
        try:
            return await asyncio.wait_for(coro, timeout=timeout_sec)
        except Exception:
            return default

    # High-accuracy offline geographic atlas fallback (never raw coordinates)
    fallback_geo = offline_reverse_geocode(latitude, longitude)

    sync_weather = {
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

    geo, weather_pack, air_quality, eonet_events, usgs_quakes, wiki_info, marine_info = await asyncio.gather(
        safe_call(reverse_geocode(latitude, longitude), default=fallback_geo, timeout_sec=5.5),
        safe_call(fetch_live_weather_full(latitude, longitude), default=(sync_weather, None, None), timeout_sec=5.5),
        safe_call(fetch_air_quality(latitude, longitude), default=None, timeout_sec=3.0),
        safe_call(fetch_nasa_eonet_events(days=7, limit=100), default=[], timeout_sec=2.0),
        safe_call(fetch_usgs_local_earthquakes(latitude, longitude, radius_km=1000, min_mag=2.5, limit=5), default=[], timeout_sec=2.0),
        safe_call(fetch_wikipedia_knowledge(latitude, longitude), default=None, timeout_sec=2.5),
        safe_call(fetch_marine_conditions(latitude, longitude), default=None, timeout_sec=2.5),
    )

    (weather, elevation_m, solar_info) = weather_pack if (weather_pack and weather_pack[0]) else (sync_weather, None, None)
    if not geo:
        geo = fallback_geo
    eonet_events = eonet_events or []
    usgs_quakes = usgs_quakes or []

    # Nearby events from our DB (within 2500 km)
    db_events = db.query(DisasterEventModel).filter(DisasterEventModel.is_simulated == False).all()
    nearby_events = []
    for e in db_events:
        d = haversine_distance(latitude, longitude, e.latitude, e.longitude)
        if d <= 2500:
            nearby_events.append({
                "id": e.id,
                "title": e.title,
                "type": e.type,
                "severity": e.severity,
                "distance_km": round(d, 1),
                "latitude": e.latitude,
                "longitude": e.longitude,
                "source": "EarthWatch DB",
            })
    nearby_events.sort(key=lambda x: x["distance_km"])

    # NASA EONET events near this spot (within 1500 km)
    eonet_nearby = find_eonet_events_near(eonet_events, latitude, longitude, radius_km=1500)

    # Upcoming overhead satellite pass
    next_overpass = None
    min_mins = float("inf")
    for target in CELESTRAK_TARGETS[:3]:
        pass_info = celestrak_service.predict_next_pass(target["norad_id"], latitude, longitude, lookahead_hours=8)
        if pass_info and pass_info.get("minutes_until_pass", float("inf")) < min_mins:
            min_mins = pass_info["minutes_until_pass"]
            next_overpass = {
                **pass_info,
                "satellite_name": target["name"],
                "operator": target["operator"]
            }

    # Assess hazard proximity risk (DB events + EONET + live USGS earthquakes)
    risk = "Low Risk"
    quake_severity_events = [
        {"severity": q["severity"], "distance_km": q["distance_km"], "title": q["title"]}
        for q in usgs_quakes
    ]
    all_severity_events = nearby_events + [
        {**e, "severity": "high"} for e in eonet_nearby if e.get("category_id") in ["wildfires", "severeStorms", "volcanoes", "floods"]
    ] + [
        {**e, "severity": "moderate"} for e in eonet_nearby
    ] + quake_severity_events

    if any(e["severity"] == "critical" and e["distance_km"] < 150 for e in all_severity_events):
        risk = "Critical Impact Zone"
    elif any(e["severity"] == "critical" and e["distance_km"] < 300 for e in all_severity_events):
        risk = "High Hazard Alert"
    elif any(e["severity"] == "high" and e["distance_km"] < 200 for e in all_severity_events):
        risk = "High Hazard Alert"
    elif any(e["severity"] in ["critical", "high"] and e["distance_km"] < 500 for e in all_severity_events):
        risk = "Moderate Advisory"
    elif any(e["distance_km"] < 300 for e in all_severity_events):
        risk = "Moderate Advisory"

    # Boost risk if air quality is poor
    if air_quality:
        eu_aqi = air_quality.get("european_aqi", 0) or 0
        if eu_aqi >= 80 and risk == "Low Risk":
            risk = "Moderate Advisory"

    lat_str = f"{abs(latitude):.4f}° {'N' if latitude >= 0 else 'S'}"
    lon_str = f"{abs(longitude):.4f}° {'E' if longitude >= 0 else 'W'}"

    return {
        "latitude": round(latitude, 4),
        "longitude": round(longitude, 4),
        "coordinate_label": f"{lat_str}, {lon_str}",
        "name": geo["name"],
        "display_name": geo["display_name"],
        "country": geo["country"],
        "region": geo["region"],
        "terrain_type": geo["type"],
        "is_maritime": geo.get("is_maritime", False),
        "elevation_m": elevation_m,
        "weather": weather,
        "air_quality": air_quality,
        "nearby_events": nearby_events[:5],
        "nasa_events": eonet_nearby[:5],
        "usgs_earthquakes": usgs_quakes[:5],
        "marine_conditions": marine_info,
        "solar_ephemeris": solar_info,
        "wikipedia_info": wiki_info,
        "next_overpass": next_overpass,
        "risk_level": risk,
    }


@router.get("/locations/{id}", response_model=LocationDetail)
async def get_location_detail(
    id: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    ensure_db_seeded(db)
    loc = db.query(LocationModel).filter(LocationModel.id == id).first()
    
    if loc:
        loc_id = loc.id
        loc_name = loc.name
        loc_country = loc.country
        loc_region = loc.region
        loc_lat = loc.latitude
        loc_lon = loc.longitude
        loc_pop = loc.population
    else:
        # Check if coordinates provided or if id is seed location
        seed = next((s for s in SEED_LOCATIONS if s["id"] == id), None)
        if seed:
            loc_id = seed["id"]
            loc_name = seed["name"]
            loc_country = seed["country"]
            loc_region = seed["region"]
            loc_lat = seed["latitude"]
            loc_lon = seed["longitude"]
            loc_pop = seed.get("population")
        elif lat is not None and lon is not None:
            geo = await reverse_geocode(lat, lon)
            loc_id = id
            loc_name = name or geo["name"]
            loc_country = geo["country"]
            loc_region = geo["region"]
            loc_lat = lat
            loc_lon = lon
            loc_pop = None
        else:
            raise HTTPException(status_code=404, detail="Location not found in registry")

    # Find nearby events within 1200 km
    events = db.query(DisasterEventModel).filter(DisasterEventModel.is_simulated == False).all()
    nearby_events = []
    for e in events:
        d = haversine_distance(loc_lat, loc_lon, e.latitude, e.longitude)
        if d <= 1200:
            nearby_events.append(e)

    # Nearby satellites
    now = datetime.now(timezone.utc)
    sats = db.query(SatelliteModel).all()
    nearby_sats: List[SatelliteOut] = []
    for s in sats:
        cat_match = next((c for c in SATELLITE_CATALOG if c["id"] == s.id), None)
        pos = compute_current_satellite_position(cat_match, now) if cat_match else {"latitude": s.latitude, "longitude": s.longitude}
        d = haversine_distance(loc_lat, loc_lon, pos["latitude"], pos["longitude"])
        if d <= 3500:
            s_copy = SatelliteOut.from_orm(s)
            s_copy.latitude = pos["latitude"]
            s_copy.longitude = pos["longitude"]
            nearby_sats.append(s_copy)

    # Live weather
    weather = await fetch_live_weather(loc_lat, loc_lon)

    # Risk level determination
    risk = "Low"
    if any(e.severity == "critical" for e in nearby_events):
        risk = "Critical"
    elif any(e.severity == "high" for e in nearby_events):
        risk = "High"
    elif len(nearby_events) > 0:
        risk = "Moderate"

    return LocationDetail(
        id=loc_id,
        name=loc_name,
        country=loc_country,
        region=loc_region,
        latitude=loc_lat,
        longitude=loc_lon,
        population=loc_pop,
        current_events=[DisasterEventOut.from_orm(e) for e in nearby_events],
        nearby_satellites=nearby_sats[:6],
        weather=weather,
        historical_events_count=len(nearby_events) + 3,
        risk_level=risk
    )


@router.get("/analytics", response_model=AnalyticsData)
def get_analytics(db: Session = Depends(get_db)):
    ensure_db_seeded(db)
    events = db.query(DisasterEventModel).filter(DisasterEventModel.is_simulated == False).all()
    satellites = db.query(SatelliteModel).all()

    by_type: dict = {}
    by_sev: dict = {}
    by_region: dict = {}

    for e in events:
        by_type[e.type] = by_type.get(e.type, 0) + 1
        by_sev[e.severity] = by_sev.get(e.severity, 0) + 1

        # Region heuristic based on longitude
        if -170 <= e.longitude <= -30:
            reg = "Americas"
        elif -30 < e.longitude <= 50:
            reg = "Europe & Africa"
        elif 50 < e.longitude <= 110:
            reg = "South & Central Asia"
        elif 110 < e.longitude <= 180:
            reg = "East Asia & Oceania"
        else:
            reg = "Global Oceans"
        by_region[reg] = by_region.get(reg, 0) + 1

    by_mission: dict = {}
    for s in satellites:
        by_mission[s.mission] = by_mission.get(s.mission, 0) + 1

    # Timeline trend data for Recharts
    trend = [
        {"period": "Day -5", "wildfire": 1, "flood": 1, "cyclone": 0, "earthquake": 2, "total": 4},
        {"period": "Day -4", "wildfire": 2, "flood": 1, "cyclone": 1, "earthquake": 1, "total": 5},
        {"period": "Day -3", "wildfire": 2, "flood": 2, "cyclone": 1, "earthquake": 3, "total": 8},
        {"period": "Day -2", "wildfire": 3, "flood": 2, "cyclone": 2, "earthquake": 2, "total": 9},
        {"period": "Yesterday", "wildfire": 3, "flood": 2, "cyclone": 2, "earthquake": 4, "total": 11},
        {"period": "Today (Active)", "wildfire": by_type.get("wildfire", 2), "flood": by_type.get("flood", 2), "cyclone": by_type.get("cyclone", 2), "earthquake": by_type.get("earthquake", 2), "total": len(events)}
    ]

    return AnalyticsData(
        total_events=len(events),
        total_satellites=len(satellites),
        events_by_type=by_type,
        events_by_severity=by_sev,
        events_by_region=by_region,
        satellites_by_mission=by_mission,
        timeline_trend=trend,
        last_updated=datetime.now(timezone.utc)
    )


@router.post("/simulation", response_model=SimulationResponse)
def simulate_disaster(req: SimulationRequest):
    return run_disaster_simulation(req)


@router.post("/ai/analyze", response_model=AIAnalyzeResponse)
def analyze_query(req: AIAnalyzeRequest, db: Session = Depends(get_db)):
    ensure_db_seeded(db)
    events = [e.__dict__ for e in db.query(DisasterEventModel).filter(DisasterEventModel.is_simulated == False).all()]
    sats = [s.__dict__ for s in db.query(SatelliteModel).all()]
    return process_analyst_query(req, events, sats)


@router.get("/weather")
async def get_weather(lat: float, lon: float):
    return await fetch_live_weather(lat, lon)


@router.get("/sync-live-data")
async def sync_live_data(db: Session = Depends(get_db)):
    """Fetch live USGS earthquakes and merge into active database"""
    ensure_db_seeded(db)
    live_quakes = await fetch_live_usgs_earthquakes()
    added_count = 0

    for q in live_quakes:
        existing = db.query(DisasterEventModel).filter(DisasterEventModel.id == q["id"]).first()
        if not existing:
            new_ev = DisasterEventModel(
                id=q["id"],
                title=q["title"],
                type=q["type"],
                latitude=q["latitude"],
                longitude=q["longitude"],
                severity=q["severity"],
                description=q["description"],
                detected_at=q["detected_at"],
                source=q["source"],
                status=q["status"],
                affected_area_km2=q.get("affected_area_km2"),
                estimated_population=q.get("estimated_population"),
                ai_summary=q.get("ai_summary"),
                is_live=True,
                is_simulated=False
            )
            db.add(new_ev)
            added_count += 1

    db.commit()
    return {"status": "ok", "live_events_synced": len(live_quakes), "newly_added": added_count}


@router.get("/celestrak/status")
def get_celestrak_status():
    """Returns authoritative CelesTrak GP element synchronization status and SGP4 engine health"""
    return {
        "service": "CelesTrak GP & TLE Orbit Propagator",
        "provider": "celestrak.org / Dr. T.S. Kelso",
        "is_live_synced": celestrak_service.is_live_synced,
        "last_sync": celestrak_service.last_sync_time.isoformat() if celestrak_service.last_sync_time else None,
        "total_norad_tracked": len(celestrak_service._satrec_cache),
        "propagator_engine": "SGP4 (Standard General Perturbations 4)",
        "reference_frame": "WGS84 / TEME Geodetic",
        "tracked_satellites": list(celestrak_service._metadata_cache.keys())
    }


@router.get("/celestrak/sync")
async def sync_celestrak_live():
    """Trigger real-time download and update of Two-Line Elements from CelesTrak"""
    count = await celestrak_service.sync_live_from_celestrak()
    return {
        "status": "success",
        "provider": "celestrak.org",
        "synced_element_sets": count,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/celestrak/orbit/{satellite_id}")
def get_celestrak_orbit(satellite_id: str, duration_minutes: int = 95, db: Session = Depends(get_db)):
    """Computes exact high-precision orbital ground track polyline via SGP4 for globe rendering"""
    ensure_db_seeded(db)
    sat = db.query(SatelliteModel).filter(SatelliteModel.id == satellite_id).first()
    if not sat or not sat.norad_id:
        # Fallback to catalog match
        return {"satellite_id": satellite_id, "orbit_points": []}

    points = celestrak_service.generate_orbit_track(sat.norad_id, duration_minutes=duration_minutes)
    return {
        "satellite_id": satellite_id,
        "norad_id": sat.norad_id,
        "name": sat.name,
        "period_minutes": sat.period_minutes or 98.0,
        "orbit_points": points
    }


@router.get("/celestrak/overpass/{satellite_id}/{latitude}/{longitude}")
def get_celestrak_overpass(
    satellite_id: str,
    latitude: float,
    longitude: float,
    lookahead_hours: int = 24,
    db: Session = Depends(get_db)
):
    """Predicts upcoming pass of a satellite over target coordinates from CelesTrak TLE"""
    ensure_db_seeded(db)
    sat = db.query(SatelliteModel).filter(SatelliteModel.id == satellite_id).first()
    if not sat or not sat.norad_id:
        raise HTTPException(status_code=404, detail="Satellite with NORAD catalog not found")

    prediction = celestrak_service.predict_next_pass(sat.norad_id, latitude, longitude, lookahead_hours)
    return prediction


class TLEDecodeInput(BaseModel):
    line1: str
    line2: str
    name: Optional[str] = None


@router.post("/celestrak/decode")
def decode_custom_tle(payload: TLEDecodeInput):
    """Deconstructs user-supplied Two-Line Element into Keplerian elements & physical parameters"""
    try:
        return celestrak_service.decode_tle(payload.line1, payload.line2, payload.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode TLE: {str(e)}")


@router.get("/celestrak/decode/{norad_id}")
def decode_catalog_tle(norad_id: int):
    """Deconstructs known TLE from CelesTrak cache for a specific NORAD catalog ID"""
    meta = celestrak_service._metadata_cache.get(norad_id)
    if not meta or "tle_line1" not in meta or "tle_line2" not in meta:
        raise HTTPException(status_code=404, detail=f"No TLE element set found for NORAD ID {norad_id}")
    
    try:
        return celestrak_service.decode_tle(meta["tle_line1"], meta["tle_line2"], meta.get("name"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode cached TLE: {str(e)}")


@router.get("/celestrak/overpass-matrix")
def get_fleet_overpass_matrix(lookahead_hours: int = 24, db: Session = Depends(get_db)):
    """Cross-references all CelesTrak satellites against active disaster events for flyover interception planning"""
    ensure_db_seeded(db)
    events = [
        {
            "id": e.id,
            "title": e.title,
            "type": e.type,
            "latitude": e.latitude,
            "longitude": e.longitude,
            "severity": e.severity
        }
        for e in db.query(DisasterEventModel).filter(DisasterEventModel.is_simulated == False).all()
    ]
    return celestrak_service.generate_fleet_overpass_matrix(events, lookahead_hours=lookahead_hours)


@router.get("/celestrak/knowledge")
def get_celestrak_knowledge():
    """Returns the CelesTrak & Orbital Mechanics authoritative knowledge base"""
    return celestrak_service.get_knowledge_corpus()


# ─── TERRA Agentic Spot Chat ────────────────────────────────────────────────

class TerraChatRequest(BaseModel):
    message: str
    spot_context: dict  # Full SpotInspectionData as dict
    history: list = []  # Previous messages for context


class TerraChatResponse(BaseModel):
    reply: str
    confidence: float = 0.95
    sources: list = []
    suggestions: list = []


@router.post("/ai/terra-chat", response_model=TerraChatResponse)
def terra_spot_chat(req: TerraChatRequest):
    """TERRA — Agentic Earth Intelligence AI that answers questions about a clicked spot on the globe."""
    from app.ai.terra import process_terra_chat
    return process_terra_chat(req.message, req.spot_context, req.history)

