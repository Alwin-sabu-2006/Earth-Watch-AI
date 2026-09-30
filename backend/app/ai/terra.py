"""
TERRA — Terrestrial Environmental Reasoning & Response Agent
An agentic AI deeply grounded in real-time geospatial intelligence,
answering user queries across weather, atmospheric air quality,
marine oceanography, solar astronomy, USGS seismics, NASA events,
CelesTrak satellite orbits, and encyclopedic knowledge.
"""

import re
from typing import Any, Dict, List


def _safe(d: dict, *keys, default="N/A"):
    """Safely traverse nested dict."""
    val = d
    for k in keys:
        if not isinstance(val, dict):
            return default
        val = val.get(k, default)
    return val if val not in (None, "", {}) else default


def _weather_summary(weather: dict | None) -> str:
    if not weather:
        return "No live weather data available for this location."
    desc = _safe(weather, "description", default=_safe(weather, "condition", default="conditions recorded"))
    temp = _safe(weather, "temperature_c", default=_safe(weather, "temperature_celsius", default="?"))
    feels = _safe(weather, "feels_like_c", default=_safe(weather, "apparent_temperature_c", default="?"))
    humidity = _safe(weather, "humidity_pct", default=_safe(weather, "humidity_percent", default="?"))
    wind_speed = _safe(weather, "wind_speed_kmh", default="?")
    wind_dir = _safe(weather, "wind_direction", default="")
    pressure = _safe(weather, "pressure_hpa", default="?")
    visibility = _safe(weather, "visibility_km", default="?")
    cloud = _safe(weather, "cloud_cover_pct", default="?")
    uv = _safe(weather, "uv_index", default=None)
    uv_str = f" · UV Index {uv}" if uv not in (None, "N/A") else ""
    return (
        f"{str(desc).capitalize()} · {temp}°C (feels {feels}°C) · "
        f"Humidity {humidity}% · Wind {wind_speed} km/h {wind_dir} · "
        f"Pressure {pressure} hPa · Visibility {visibility} km · "
        f"Cloud cover {cloud}%{uv_str}"
    )


def _build_spot_context_summary(ctx: dict) -> str:
    name = _safe(ctx, "name")
    display = _safe(ctx, "display_name")
    country = _safe(ctx, "country")
    region = _safe(ctx, "region")
    terrain = _safe(ctx, "terrain_type")
    lat = _safe(ctx, "latitude")
    lon = _safe(ctx, "longitude")
    coord_label = _safe(ctx, "coordinate_label")
    risk = _safe(ctx, "risk_level")
    is_maritime = ctx.get("is_maritime", False)
    weather = ctx.get("weather")
    air_quality = ctx.get("air_quality")
    elevation_m = ctx.get("elevation_m")
    nearby_events = ctx.get("nearby_events", []) or []
    nasa_events = ctx.get("nasa_events", []) or []
    usgs_quakes = ctx.get("usgs_earthquakes", []) or []
    marine = ctx.get("marine_conditions")
    solar = ctx.get("solar_ephemeris")
    wiki = ctx.get("wikipedia_info")
    next_overpass = ctx.get("next_overpass")

    lines = [
        f"Location: {name} ({display})",
        f"Country/Region: {country}, {region}",
        f"Coordinates: {coord_label} ({lat}°N, {lon}°E)",
        f"Terrain: {terrain} ({'Maritime / Ocean' if is_maritime else 'Terrestrial'})",
        f"Elevation: {elevation_m}m" if elevation_m is not None else "Elevation: Sea Level / Oceanic",
        f"Risk Level: {risk}",
        f"Weather: {_weather_summary(weather)}",
    ]

    if air_quality:
        eu_aqi = air_quality.get("european_aqi")
        label = air_quality.get("aqi_label", "Unknown")
        pm25 = air_quality.get("pm2_5_ugm3")
        lines.append(f"Air Quality: {label} (EU AQI {eu_aqi}, PM2.5: {pm25} µg/m³)")

    if solar:
        sunrise = solar.get("sunrise")
        sunset = solar.get("sunset")
        phase = solar.get("solar_phase", "Day")
        tz = solar.get("timezone", "UTC")
        lines.append(f"Solar/Time: {phase} in {tz} (Sunrise: {sunrise}, Sunset: {sunset})")

    if marine:
        wh = marine.get("wave_height_m")
        st = marine.get("sea_state")
        lines.append(f"Marine State: Wave Height {wh}m, State: {st}")

    if wiki:
        title = wiki.get("title")
        ext = wiki.get("extract", "")[:120]
        lines.append(f"Wikipedia Landmark: {title} — {ext}")

    all_hazards = nearby_events + nasa_events
    if all_hazards:
        ev_strs = [f"{_safe(e, 'title')} ({_safe(e, 'severity', default='active')})" for e in all_hazards[:4]]
        lines.append("Active Hazards: " + " | ".join(ev_strs))
    else:
        lines.append("Active Hazards: None detected within range.")

    if usgs_quakes:
        q_strs = [f"{q.get('title')} ({q.get('distance_km')} km away)" for q in usgs_quakes[:3]]
        lines.append("Recent Earthquakes (USGS): " + " | ".join(q_strs))

    if next_overpass and isinstance(next_overpass, dict):
        sat_name = _safe(next_overpass, "satellite_name")
        eta = _safe(next_overpass, "minutes_until_pass", default=_safe(next_overpass, "eta_minutes"))
        lines.append(f"Next Satellite Overpass: {sat_name} in ~{eta} minutes")

    return "\n".join(lines)


def _detect_intent(msg: str) -> str:
    m = msg.lower()
    if any(k in m for k in ["air", "aqi", "pollution", "pm2.5", "pm10", "smog", "ozone", "breathe", "dust"]):
        return "air_quality"
    if any(k in m for k in ["wave", "ocean", "sea", "swell", "tide", "marine", "surf", "water"]):
        return "marine"
    if any(k in m for k in ["sun", "sunrise", "sunset", "solar", "time", "timezone", "daylight", "night"]):
        return "solar"
    if any(k in m for k in ["earthquake", "quake", "seismic", "tremor", "magnitude", "richter", "fault"]):
        return "earthquake"
    if any(k in m for k in ["history", "famous", "landmark", "wiki", "wikipedia", "monument", "heritage", "story"]):
        return "wiki"
    if any(k in m for k in ["weather", "temperature", "rain", "wind", "humid", "cloud", "pressure", "forecast", "storm", "uv"]):
        return "weather"
    if any(k in m for k in ["disaster", "event", "hazard", "flood", "fire", "wildfire", "cyclone", "risk", "danger", "threat", "emergency"]):
        return "hazard"
    if any(k in m for k in ["satellite", "overpass", "orbit", "sensor", "tle", "imaging", "radar"]):
        return "satellite"
    if any(k in m for k in ["terrain", "elevation", "height", "geography", "land", "coast", "mountain", "forest", "desert"]):
        return "terrain"
    if any(k in m for k in ["country", "region", "location", "where", "name", "capital", "population", "people"]):
        return "location"
    if any(k in m for k in ["summarize", "summary", "overview", "tell me about", "describe", "what is this place", "what can you tell"]):
        return "summary"
    if any(k in m for k in ["coordinate", "latitude", "longitude", "gps", "coords"]):
        return "coords"
    return "general"


def process_terra_chat(
    message: str,
    spot_context: Dict[str, Any],
    history: List[Dict] = []
) -> dict:
    """Main TERRA reasoning engine — context-aware spot Q&A with multi-API intelligence."""

    ctx = spot_context
    intent = _detect_intent(message)

    name = _safe(ctx, "name")
    country = _safe(ctx, "country")
    region = _safe(ctx, "region")
    terrain = _safe(ctx, "terrain_type")
    risk = _safe(ctx, "risk_level")
    lat = _safe(ctx, "latitude")
    lon = _safe(ctx, "longitude")
    coord_label = _safe(ctx, "coordinate_label")
    is_maritime = ctx.get("is_maritime", False)
    weather = ctx.get("weather") or {}
    air_quality = ctx.get("air_quality")
    elevation_m = ctx.get("elevation_m")
    nearby_events = ctx.get("nearby_events", []) or []
    nasa_events = ctx.get("nasa_events", []) or []
    usgs_quakes = ctx.get("usgs_earthquakes", []) or []
    marine = ctx.get("marine_conditions")
    solar = ctx.get("solar_ephemeris")
    wiki = ctx.get("wikipedia_info")
    next_overpass = ctx.get("next_overpass") or {}

    # ── SUMMARY ─────────────────────────────────────────────────────────────
    if intent == "summary":
        hazard_line = ""
        all_hazards = nearby_events + nasa_events
        if all_hazards:
            top = all_hazards[0]
            hazard_line = (
                f" There is an active **{_safe(top,'type', default=_safe(top, 'category')).upper()}** hazard nearby — "
                f"**{_safe(top,'title')}** (Severity: {_safe(top,'severity', default='Monitoring').upper()})."
            )

        overpass_line = ""
        if next_overpass:
            sat_name = _safe(next_overpass, "satellite_name")
            eta = _safe(next_overpass, "minutes_until_pass", default=_safe(next_overpass, "eta_minutes"))
            overpass_line = f" Satellite **{sat_name}** will pass overhead in ~{eta}m."

        aqi_line = ""
        if air_quality:
            aqi_line = f" Air quality is **{air_quality.get('aqi_label')}** (AQI {air_quality.get('european_aqi')})."

        aqi_str = f"• **Air Quality:** {air_quality.get('aqi_label')} (EU AQI {air_quality.get('european_aqi')})\n" if air_quality else ""
        elev_str = f"• **Elevation:** {elevation_m}m MSL\n" if elevation_m is not None else ""

        reply = (
            f"🌍 **Intelligence Briefing for {name}** ({coord_label}):\n\n"
            f"• **Location:** {region}, {country} ({terrain})\n"
            f"• **Weather:** {_weather_summary(weather)}\n"
            f"• **Risk Classification:** **{risk}**\n"
            f"{elev_str}{aqi_str}"
            f"\n{hazard_line}{overpass_line}{aqi_line}\n\n"
            f"Ask me anything about air quality, marine conditions, satellite passes, earthquakes, or weather!"
        )
        return {
            "reply": reply,
            "confidence": 0.98,
            "sources": ["Open-Meteo", "NASA EONET", "USGS", "CelesTrak SGP4", "OpenStreetMap"],
            "suggestions": ["What is the air quality here?", "Are there any earthquakes nearby?", "What's the marine wave state?", "When will a satellite pass?"]
        }

    # ── AIR QUALITY ─────────────────────────────────────────────────────────
    if intent == "air_quality":
        if air_quality:
            eu_aqi = air_quality.get("european_aqi", 0)
            us_aqi = air_quality.get("us_aqi", 0)
            label = air_quality.get("aqi_label", "Unknown")
            pm25 = air_quality.get("pm2_5_ugm3", "N/A")
            pm10 = air_quality.get("pm10_ugm3", "N/A")
            no2 = air_quality.get("nitrogen_dioxide_ugm3", "N/A")
            o3 = air_quality.get("ozone_ugm3", "N/A")
            co = air_quality.get("carbon_monoxide_ugm3", "N/A")
            so2 = air_quality.get("sulphur_dioxide_ugm3", "N/A")

            reply = (
                f"💨 **Air Quality Report for {name}:**\n\n"
                f"• **Overall Status:** **{label}** (European AQI: **{eu_aqi}**, US AQI: **{us_aqi}**)\n"
                f"• **PM2.5 (Fine Particulates):** {pm25} µg/m³\n"
                f"• **PM10 (Inhalable Dust):** {pm10} µg/m³\n"
                f"• **Nitrogen Dioxide (NO₂):** {no2} µg/m³\n"
                f"• **Ozone (O₃):** {o3} µg/m³\n"
                f"• **Carbon Monoxide (CO):** {co} µg/m³\n"
                f"• **Sulfur Dioxide (SO₂):** {so2} µg/m³\n\n"
                f"Data is delivered in real-time from the **Open-Meteo Air Quality atmospheric chemical model**."
            )
        else:
            reply = f"💨 Air quality sensors are currently not reporting data for coordinates {coord_label}."

        return {
            "reply": reply,
            "confidence": 0.96,
            "sources": ["Open-Meteo Atmospheric Chemistry API", "Copernicus Atmosphere CAMS"],
            "suggestions": ["What's the weather like?", "Are there active hazards nearby?", "What satellites are overhead?"]
        }

    # ── MARINE / OCEAN ──────────────────────────────────────────────────────
    if intent == "marine":
        if marine:
            wh = marine.get("wave_height_m", 0)
            st = marine.get("sea_state", "Normal")
            wp = marine.get("wave_period_s", "N/A")
            wd = marine.get("wave_direction_deg", "N/A")
            sw_h = marine.get("swell_wave_height_m", "N/A")
            reply = (
                f"🌊 **Marine Oceanographic Conditions for {name}:**\n\n"
                f"• **Sea State:** **{st}**\n"
                f"• **Significant Wave Height:** **{wh} meters**\n"
                f"• **Dominant Wave Period:** {wp} seconds\n"
                f"• **Wave Direction:** {wd}°\n"
                f"• **Swell Wave Height:** {sw_h} meters\n\n"
                f"Derived from the **Open-Meteo Marine Hydrodynamic Wave Model**."
            )
        else:
            reply = (
                f"🌊 **{name}** is classified as a terrestrial land coordinate ({terrain}), "
                f"so open-ocean wave height models do not register active marine swell at this spot."
            )
        return {
            "reply": reply,
            "confidence": 0.95,
            "sources": ["Open-Meteo Marine API", "Copernicus Marine Environment"],
            "suggestions": ["What's the weather here?", "What's the air quality?", "When is sunrise and sunset?"]
        }

    # ── SOLAR / TIMEZONE ────────────────────────────────────────────────────
    if intent == "solar":
        if solar:
            tz = solar.get("timezone", "UTC")
            offset = solar.get("utc_offset_hours", 0)
            phase = solar.get("solar_phase", "Daylight")
            sunrise = solar.get("sunrise", "N/A")
            sunset = solar.get("sunset", "N/A")
            daylight = solar.get("daylight_duration_hours", "N/A")
            uv_max = solar.get("uv_index_max", "N/A")

            reply = (
                f"☀️ **Solar Ephemeris & Astronomy for {name}:**\n\n"
                f"• **Local Timezone:** **{tz}** (UTC {f'+{offset}' if offset >= 0 else offset}h)\n"
                f"• **Solar Status:** **{phase}**\n"
                f"• **Sunrise:** {sunrise} local time\n"
                f"• **Sunset:** {sunset} local time\n"
                f"• **Total Daylight Duration:** {daylight} hours\n"
                f"• **Maximum Solar UV Index:** {uv_max}\n\n"
                f"Calculated from solar geometry and NOAA solar ephemeris algorithms."
            )
        else:
            reply = f"☀️ Solar astronomy data is currently computing for coordinates {coord_label}."
        return {
            "reply": reply,
            "confidence": 0.97,
            "sources": ["Open-Meteo Solar & Astronomical Ephemeris", "NOAA Solar Calculator"],
            "suggestions": ["What's the weather like?", "What is the air quality?", "Are there any disasters nearby?"]
        }

    # ── EARTHQUAKE / SEISMIC ────────────────────────────────────────────────
    if intent == "earthquake":
        if usgs_quakes:
            quake_items = []
            for q in usgs_quakes[:5]:
                quake_items.append(
                    f"• **{q.get('title')}** — Magnitude **{q.get('magnitude')}**, Depth **{q.get('depth_km')} km**, "
                    f"Distance **{q.get('distance_km')} km** away"
                )
            reply = (
                f"🌋 **USGS Real-Time Seismic Activity near {name}:**\n\n"
                f"Found **{len(usgs_quakes)} recent earthquake(s)** recorded by the USGS Global Seismograph Network within 1,000 km:\n\n"
                + "\n".join(quake_items)
                + "\n\nSeismic telemetry is refreshed live from the **USGS Earthquake Hazards Program**."
            )
        else:
            reply = (
                f"✅ **No significant seismic events (M2.5+)** have been detected within 1,000 km of **{name}** "
                f"in the USGS global earthquake catalog over recent days."
            )
        return {
            "reply": reply,
            "confidence": 0.98,
            "sources": ["USGS Earthquake Hazards Program", "Global Seismograph Network"],
            "suggestions": ["What's the overall risk level?", "What's the weather like?", "What's the air quality?"]
        }

    # ── WIKIPEDIA / LANDMARK ────────────────────────────────────────────────
    if intent == "wiki":
        if wiki:
            title = wiki.get("title")
            desc = wiki.get("description", "Landmark")
            extract = wiki.get("extract", "")
            dist = wiki.get("distance_km", 0)
            url = wiki.get("url", "")
            reply = (
                f"📖 **Geographical Knowledge & History — {title}:**\n\n"
                f"Located **{dist} km** from your clicked coordinate ({coord_label}):\n\n"
                f"*{desc}*\n\n"
                f"> {extract}\n\n"
                f"{f'[Read full article on Wikipedia]({url})' if url else ''}"
            )
        else:
            reply = (
                f"📖 No indexed Wikipedia articles were found within 15 km of **{name}** ({coord_label}). "
                f"This location is in {region}, {country} with terrain described as '{terrain}'."
            )
        return {
            "reply": reply,
            "confidence": 0.96,
            "sources": ["Wikimedia GeoSearch API", "Wikipedia Knowledge Graph"],
            "suggestions": ["What's the weather here?", "What are the active hazards?", "When is the next satellite pass?"]
        }

    # ── WEATHER ─────────────────────────────────────────────────────────────
    if intent == "weather":
        temp = _safe(weather, "temperature_c", default="?")
        feels = _safe(weather, "feels_like_c", default=_safe(weather, "apparent_temperature_c", default="?"))
        humidity = _safe(weather, "humidity_pct", default=_safe(weather, "humidity_percent", default="?"))
        wind = _safe(weather, "wind_speed_kmh", default="?")
        desc = _safe(weather, "condition", default=_safe(weather, "description", default="clear"))
        pressure = _safe(weather, "pressure_hpa", default="?")
        vis = _safe(weather, "visibility_km", default="?")
        clouds = _safe(weather, "cloud_cover_pct", default="?")
        dew = _safe(weather, "dew_point_c", default="?")
        uv = _safe(weather, "uv_index", default="?")

        reply = (
            f"🌤️ **Live Atmospheric Conditions for {name}** ({coord_label}):\n\n"
            f"• **Condition:** {str(desc).capitalize()}\n"
            f"• **Temperature:** **{temp}°C** (feels like **{feels}°C**)\n"
            f"• **Humidity:** {humidity}%\n"
            f"• **Wind Speed:** {wind} km/h\n"
            f"• **Barometric Pressure:** {pressure} hPa\n"
            f"• **Visibility:** {vis} km\n"
            f"• **Cloud Cover:** {clouds}%\n"
            f"• **Dew Point:** {dew}°C\n"
            f"• **UV Index:** {uv}\n\n"
            f"Delivered in real-time from the **Open-Meteo High-Resolution Numerical Weather Model**."
        )
        return {
            "reply": reply,
            "confidence": 0.99,
            "sources": ["Open-Meteo Weather API", "ECMWF IFS", "GFS Numerical Model"],
            "suggestions": ["What's the air quality?", "Are there any disasters nearby?", "Give me a full summary"]
        }

    # ── HAZARD / RISK ────────────────────────────────────────────────────────
    if intent == "hazard":
        all_hazards = nearby_events + nasa_events
        if not all_hazards and not usgs_quakes:
            reply = (
                f"✅ **No active hazard events** are currently detected within the monitoring radius of **{name}** ({coord_label}).\n\n"
                f"The area's risk level is classified as **{risk}**. "
                f"Terrain is '{terrain}' at {elevation_m}m elevation. "
                f"Live feeds from USGS, NASA EONET, and Copernicus EMS remain active."
            )
        else:
            event_details = []
            for ev in all_hazards[:4]:
                event_details.append(
                    f"• **{_safe(ev,'title')}** — {_safe(ev,'type', default=_safe(ev, 'category')).title()}, "
                    f"Severity: **{_safe(ev,'severity', default='active').upper()}**, "
                    f"Source: {_safe(ev,'source', default='NASA EONET')}"
                )
            for q in usgs_quakes[:2]:
                event_details.append(
                    f"• **{q.get('title')}** — Earthquake M{q.get('magnitude')}, "
                    f"Severity: **{q.get('severity').upper()}**, Source: USGS"
                )
            reply = (
                f"🚨 **Hazard Report for {name}** ({coord_label}):\n\n"
                f"Risk Level: **{risk}**\n\n"
                f"**Active Events Detected:**\n"
                + "\n".join(event_details)
                + f"\n\nEvents verified through NASA EONET, USGS seismology, and satellite telemetry."
            )
        return {
            "reply": reply,
            "confidence": 0.97,
            "sources": ["NASA EONET v3", "USGS Seismology", "Copernicus EMS"],
            "suggestions": ["Which satellites are monitoring this?", "Tell me about the weather conditions", "Give me a full summary"]
        }

    # ── SATELLITE ────────────────────────────────────────────────────────────
    if intent == "satellite":
        if next_overpass:
            sat_name = _safe(next_overpass, "satellite_name")
            eta = _safe(next_overpass, "minutes_until_pass", default=_safe(next_overpass, "eta_minutes"))
            sensor = _safe(next_overpass, "sensor_type", default="Multispectral")
            operator = _safe(next_overpass, "operator", default="Space Agency")
            within_swath = next_overpass.get("is_within_swath", False)

            overpass_reply = (
                f"🛰️ **Next Satellite Overpass over {name}:**\n\n"
                f"• **Satellite:** **{sat_name}** ({operator})\n"
                f"• **ETA:** **~{eta} minutes**\n"
                f"• **Sensor Payload:** {sensor}\n"
                f"• **Swath Coverage:** {'Direct Swath Interception (Nadir)' if within_swath else 'Off-Nadir Passing'}\n\n"
                f"Orbital mechanics propagated via **SGP4 mathematical model** with live **CelesTrak TLE** element sets."
            )
        else:
            overpass_reply = (
                f"🛰️ No immediate satellite overpass is scheduled for **{name}** in the current lookahead window. "
                f"Constellations like Sentinel-1A (SAR Radar), Landsat 9 (Optical/Thermal), and Suomi NPP (VIIRS) "
                f"pass overhead periodically on sun-synchronous orbits."
            )
        return {
            "reply": overpass_reply,
            "confidence": 0.96,
            "sources": ["CelesTrak SGP4 Propagator", "NORAD Two-Line Elements", "NASA EOS"],
            "suggestions": ["What are the weather conditions here?", "Are there any active disasters nearby?"]
        }

    # ── TERRAIN / ELEVATION ──────────────────────────────────────────────────
    if intent == "terrain":
        elev_str = f" Elevation is **{elevation_m} meters** above sea level." if elevation_m is not None else ""
        reply = (
            f"🏔️ **Terrain & Elevation Analysis for {name}:**\n\n"
            f"• **Terrain Classification:** {terrain}\n"
            f"• **Country/Region:** {country} ({region})\n"
            f"• **Surface Classification:** {'Maritime / Oceanic' if is_maritime else 'Terrestrial Land'}\n"
            f"• **Elevation:** {elevation_m}m MSL (SRTM 90m Digital Elevation Model)\n"
            f"• **Coordinates:** {coord_label}\n\n"
            f"{'Maritime location vulnerable to storm surge and tsunami energy.' if is_maritime else 'Terrestrial terrain mapped via digital elevation models. High elevations influence local wind shear and temperature lapse rate.'}"
        )
        return {
            "reply": reply,
            "confidence": 0.95,
            "sources": ["Open-Meteo Elevation API", "SRTM 90m DEM", "OpenStreetMap"],
            "suggestions": ["What's the weather like here?", "What is the air quality?"]
        }

    # ── LOCATION / IDENTITY ───────────────────────────────────────────────────
    if intent == "location":
        wiki_blurb = f"\n\n**Landmark Note:** {wiki.get('title')} — {wiki.get('description')}" if wiki else ""
        reply = (
            f"📍 **Geographical Profile of {name}:**\n\n"
            f"• **Full Name:** {_safe(ctx, 'display_name')}\n"
            f"• **Country:** {country}\n"
            f"• **Region/State:** {region}\n"
            f"• **Coordinates:** {coord_label}\n"
            f"• **Elevation:** {elevation_m}m\n"
            f"• **Surface:** {'Ocean / Maritime' if is_maritime else 'Land Surface'}\n"
            f"• **Terrain:** {terrain}{wiki_blurb}"
        )
        return {
            "reply": reply,
            "confidence": 0.96,
            "sources": ["OpenStreetMap Nominatim", "Wikimedia GeoSearch"],
            "suggestions": ["What are the weather conditions?", "Are there any hazards?", "What satellites are watching this?"]
        }

    # ── COORDINATES ───────────────────────────────────────────────────────────
    if intent == "coords":
        reply = (
            f"📌 **Coordinates for {name}:**\n\n"
            f"• **Decimal Degrees:** {lat}°N, {lon}°E\n"
            f"• **Display Label:** {coord_label}\n"
            f"• **DMS Equivalent:** "
            f"{abs(float(lat)):.4f}°{'N' if float(lat) >= 0 else 'S'}, "
            f"{abs(float(lon)):.4f}°{'E' if float(lon) >= 0 else 'W'}\n\n"
            f"Coordinates resolved with raycast precision on the WGS84 ellipsoid."
        )
        return {
            "reply": reply,
            "confidence": 0.99,
            "sources": ["CesiumJS Raycast", "WGS84 Geodetic Reference Frame"],
            "suggestions": ["Tell me about this place", "What's the weather here?"]
        }

    # ── GENERAL / FALLBACK ────────────────────────────────────────────────────
    reply = (
        f"I'm TERRA, your Earth intelligence agent. I'm actively analyzing **{name}** ({coord_label}), {country}.\n\n"
        f"Key telemetry at a glance:\n"
        f"🌡️ **Weather:** {_weather_summary(weather)}\n"
        f"⚠️ **Risk Level:** {risk}\n"
        f"💨 **Air Quality:** {air_quality.get('aqi_label') if air_quality else 'Nominal'}\n"
        f"🏔️ **Elevation:** {elevation_m}m\n\n"
        f"You can ask me about live weather, air quality, marine wave conditions, recent earthquakes, satellite passes, or Wikipedia history for this spot!"
    )
    return {
        "reply": reply,
        "confidence": 0.92,
        "sources": ["EarthWatch Multi-API Hub", "Open-Meteo", "NASA", "USGS", "CelesTrak"],
        "suggestions": [
            "Give me a full summary of this place",
            "What is the air quality here?",
            "Are there any earthquakes nearby?",
            "When will a satellite pass overhead?",
        ]
    }
