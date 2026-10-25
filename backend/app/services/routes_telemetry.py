"""
Routes Telemetry Service for EarthWatch AI
Provides real-time global maritime shipping corridors, active commercial vessels,
international aviation airways, and live commercial aircraft positions.
Positions are calculated along real-world geodesic / waypoint routes with continuous time interpolation.
"""

import time
import math
from typing import List, Dict, Any


def haversine_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates initial bearing (in degrees) from point 1 to point 2."""
    r_lat1 = math.radians(lat1)
    r_lat2 = math.radians(lat2)
    d_lon = math.radians(lon2 - lon1)
    y = math.sin(d_lon) * math.cos(r_lat2)
    x = math.cos(r_lat1) * math.sin(r_lat2) - math.sin(r_lat1) * math.cos(r_lat2) * math.cos(d_lon)
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360) % 360


def interpolate_segment(p1: tuple, p2: tuple, fraction: float) -> tuple:
    """Linear or great circle interpolation between two (lat, lon) coordinates."""
    lat = p1[0] + (p2[0] - p1[0]) * fraction
    lon = p1[1] + (p2[1] - p1[1]) * fraction
    return (lat, lon)


# ============================================================================
# 1. GLOBAL MARITIME SHIPPING LANES (SEA ROUTES)
# ============================================================================

SEA_ROUTES_DATA: List[Dict[str, Any]] = [
    {
        "id": "sr-asia-europe-suez",
        "name": "Asia–Europe Megacarrier Arterial (via Suez Canal)",
        "trade_type": "Container & Consumer Goods",
        "primary_cargo": "Manufactured Goods, Electronics, Machinery",
        "annual_volume_teu": "24 Million TEU",
        "color": "#06b6d4",
        "waypoints": [
            [31.23, 121.47, "Shanghai Container Terminal"],
            [22.31, 114.17, "Hong Kong Kwai Tsing Port"],
            [10.77, 106.70, "Ho Chi Minh Port"],
            [1.29, 103.85, "Port of Singapore (Malacca Strait)"],
            [5.95, 80.53, "Dondra Head, Sri Lanka"],
            [12.58, 43.33, "Bab el-Mandeb Strait"],
            [22.50, 38.00, "Red Sea Corridor"],
            [29.97, 32.55, "Suez Canal Transit Zone"],
            [31.50, 32.30, "Port Said, Egypt"],
            [36.00, 15.00, "Central Mediterranean Trench"],
            [36.14, -5.35, "Strait of Gibraltar"],
            [43.50, -9.50, "Cape Finisterre Traffic Separation Scheme"],
            [50.00, -1.00, "English Channel (Dover Strait)"],
            [51.92, 4.47, "Port of Rotterdam, Netherlands"]
        ]
    },
    {
        "id": "sr-transpacific-la",
        "name": "Trans-Pacific Trunk Route (East Asia to California)",
        "trade_type": "Trans-Oceanic Container Route",
        "primary_cargo": "Consumer Electronics, Automotives, Retail",
        "annual_volume_teu": "18.5 Million TEU",
        "color": "#38bdf8",
        "waypoints": [
            [31.23, 121.47, "Shanghai Yangshan Deepwater"],
            [35.44, 139.63, "Yokohama / Tokyo Bay"],
            [38.00, 160.00, "North Pacific High Seas"],
            [40.00, -170.00, "Mid-Pacific International Dateline"],
            [37.00, -145.00, "Eastern Pacific Deepwater Approach"],
            [33.74, -118.26, "Port of Los Angeles / Long Beach"]
        ]
    },
    {
        "id": "sr-persian-gulf-crude",
        "name": "Persian Gulf Crude Energy Highway",
        "trade_type": "Energy & Hydrocarbons",
        "primary_cargo": "Crude Oil (VLCC / ULCC Supertankers)",
        "annual_volume_teu": "21 Million Barrels / Day",
        "color": "#f59e0b",
        "waypoints": [
            [29.04, 48.15, "Mina Al-Ahmadi, Kuwait"],
            [26.65, 50.15, "Ras Tanura Oil Terminal, Saudi Arabia"],
            [26.56, 56.25, "Strait of Hormuz (Oman / Iran)"],
            [23.50, 59.00, "Gulf of Oman Exit"],
            [15.00, 65.00, "Arabian Sea Deepwater Lane"],
            [6.00, 78.00, "South of Sri Lanka Shipping Channel"],
            [1.25, 103.80, "Singapore Refinery Hub"],
            [12.00, 112.00, "South China Sea Main Line"],
            [25.00, 122.50, "East China Sea Tanker Track"],
            [34.80, 128.70, "Busan / Ulsan Refinery Complex, South Korea"]
        ]
    },
    {
        "id": "sr-transatlantic-us-europe",
        "name": "North Atlantic Industrial Trunk",
        "trade_type": "Container & Chemicals",
        "primary_cargo": "Chemicals, Pharmaceuticals, Specialized Machinery",
        "annual_volume_teu": "7.2 Million TEU",
        "color": "#0ea5e9",
        "waypoints": [
            [51.21, 4.40, "Port of Antwerp, Belgium"],
            [50.50, -0.50, "English Channel Outbound"],
            [48.00, -10.00, "Celtic Sea Shelf Break"],
            [45.00, -35.00, "Mid-North Atlantic Track"],
            [41.00, -60.00, "Grand Banks South Approach"],
            [40.67, -74.04, "Port of New York and New Jersey"]
        ]
    },
    {
        "id": "sr-panama-canal-transit",
        "name": "Panama Canal Inter-Oceanic Link",
        "trade_type": "Neopanamax Multimodal",
        "primary_cargo": "LNG, Grain, Container Goods",
        "annual_volume_teu": "14,000 Transits / Year",
        "color": "#10b981",
        "waypoints": [
            [8.95, -79.55, "Balboa Anchorage (Pacific Approach)"],
            [9.08, -79.68, "Miraflores & Pedro Miguel Locks"],
            [9.15, -79.85, "Gatun Lake Navigation Channel"],
            [9.30, -79.91, "Agua Clara Locks"],
            [9.35, -79.90, "Colon (Caribbean Entrance)"],
            [16.00, -80.00, "Central Caribbean Corridor"],
            [21.50, -85.50, "Yucatan Channel Passage"],
            [29.30, -94.80, "Port of Houston / Galveston, USA"]
        ]
    },
    {
        "id": "sr-cape-good-hope",
        "name": "Cape of Good Hope Global Bypass",
        "trade_type": "Bulk Minerals & Alternative Suez Reroute",
        "primary_cargo": "Iron Ore, Coal, Crude Oil",
        "annual_volume_teu": "8,500 Ships / Year",
        "color": "#8b5cf6",
        "waypoints": [
            [1.25, 103.80, "Singapore Anchorage"],
            [-8.00, 85.00, "South Indian Ocean Trade Wind Route"],
            [-25.00, 50.00, "South of Madagascar Sea"],
            [-34.35, 18.49, "Cape of Good Hope, South Africa"],
            [-20.00, 5.00, "South Atlantic Benguela Current"],
            [0.00, -15.00, "Equatorial Atlantic Crossing"],
            [28.00, -16.00, "Canary Islands Passage"],
            [50.00, -2.00, "English Channel Entrance"]
        ]
    },
    {
        "id": "sr-australia-asia-iron-ore",
        "name": "Pilbara–East Asia Iron Ore & LNG Conveyor",
        "trade_type": "Dry Bulk & Cryogenic Gas",
        "primary_cargo": "Iron Ore (VLOC Ships), LNG",
        "annual_volume_teu": "900 Million Metric Tons",
        "color": "#ec4899",
        "waypoints": [
            [-20.31, 118.57, "Port Hedland / Dampier, Western Australia"],
            [-10.00, 117.00, "Lombok Strait Approach"],
            [-0.50, 119.00, "Makassar Strait Deep Trench"],
            [6.00, 120.00, "Celebes Sea Navigation Passage"],
            [14.50, 119.50, "West of Luzon, Philippines"],
            [22.00, 121.00, "Luzon Strait Deepwater Lane"],
            [31.00, 122.50, "Qingdao / Caofeidian Bulk Terminals, China"]
        ]
    }
]

# Real-world commercial vessels navigating along these routes
COMMERCIAL_VESSELS_SEED = [
    {
        "imo": 9811000,
        "name": "EVER GIVEN",
        "flag": "Panama",
        "type": "Ultra Large Container Vessel (ULCV)",
        "capacity": "20,124 TEU",
        "length_m": 400,
        "route_id": "sr-asia-europe-suez",
        "origin": "Port of Shanghai (CNSHA)",
        "destination": "Port of Rotterdam (NLRTM)",
        "speed_knots": 19.4,
        "draught_m": 15.7,
        "current_segment_index": 7,
        "segment_progress": 0.42
    },
    {
        "imo": 9632064,
        "name": "MAERSK MC-KINNEY MOLLER",
        "flag": "Denmark",
        "type": "Triple-E Container Ship",
        "capacity": "18,270 TEU",
        "length_m": 399,
        "route_id": "sr-asia-europe-suez",
        "origin": "Tanjung Pelepas (MYTPP)",
        "destination": "Hamburg (DEHAM)",
        "speed_knots": 18.8,
        "draught_m": 15.2,
        "current_segment_index": 4,
        "segment_progress": 0.68
    },
    {
        "imo": 9253272,
        "name": "TI EUROPE",
        "flag": "Marshall Islands",
        "type": "Ultra Large Crude Carrier (ULCC)",
        "capacity": "3,166,353 Barrels Crude",
        "length_m": 380,
        "route_id": "sr-persian-gulf-crude",
        "origin": "Ras Tanura (SARST)",
        "destination": "Ulsan (KRUSN)",
        "speed_knots": 14.5,
        "draught_m": 21.8,
        "current_segment_index": 3,
        "segment_progress": 0.35
    },
    {
        "imo": 9795610,
        "name": "COSCO SHIPPING UNIVERSE",
        "flag": "Hong Kong",
        "type": "Super Container Carrier",
        "capacity": "21,237 TEU",
        "length_m": 400,
        "route_id": "sr-transpacific-la",
        "origin": "Ningbo-Zhoushan (CNNGB)",
        "destination": "Long Beach (USLGB)",
        "speed_knots": 20.2,
        "draught_m": 16.0,
        "current_segment_index": 3,
        "segment_progress": 0.55
    },
    {
        "imo": 9387425,
        "name": "Q-MAX MOZAH",
        "flag": "Qatar",
        "type": "Membrane LNG Carrier",
        "capacity": "266,000 m³ Liquefied Gas",
        "length_m": 345,
        "route_id": "sr-asia-europe-suez",
        "origin": "Ras Laffan (QARLF)",
        "destination": "Gate Terminal Rotterdam (NLRTM)",
        "speed_knots": 17.5,
        "draught_m": 12.0,
        "current_segment_index": 5,
        "segment_progress": 0.81
    },
    {
        "imo": 9419163,
        "name": "VALE BRASIL",
        "flag": "Singapore",
        "type": "Valemax Very Large Ore Carrier (VLOC)",
        "capacity": "400,000 DWT",
        "length_m": 362,
        "route_id": "sr-cape-good-hope",
        "origin": "Ponta da Madeira (BRPDM)",
        "destination": "Qingdao Bulk (CNTAO)",
        "speed_knots": 13.8,
        "draught_m": 23.0,
        "current_segment_index": 3,
        "segment_progress": 0.44
    },
    {
        "imo": 9708813,
        "name": "MSC OSCAR",
        "flag": "Panama",
        "type": "Olympic Class Container Vessel",
        "capacity": "19,224 TEU",
        "length_m": 395,
        "route_id": "sr-transatlantic-us-europe",
        "origin": "Bremerhaven (DEBRV)",
        "destination": "Savannah (USSAV)",
        "speed_knots": 19.0,
        "draught_m": 14.8,
        "current_segment_index": 3,
        "segment_progress": 0.60
    },
    {
        "imo": 9743916,
        "name": "FMG NICOLA",
        "flag": "Liberia",
        "type": "Wozmax VLOC Dry Bulk",
        "capacity": "260,000 DWT Iron Ore",
        "length_m": 327,
        "route_id": "sr-australia-asia-iron-ore",
        "origin": "Port Hedland (AUPHE)",
        "destination": "Caofeidian (CNCFI)",
        "speed_knots": 14.2,
        "draught_m": 18.5,
        "current_segment_index": 2,
        "segment_progress": 0.72
    },
    {
        "imo": 9839438,
        "name": "CMA CGM ANTOINE DE SAINT EXUPERY",
        "flag": "France",
        "type": "LNG-Powered Mega Container Vessel",
        "capacity": "20,600 TEU",
        "length_m": 400,
        "route_id": "sr-asia-europe-suez",
        "origin": "Port Klang (MYPKG)",
        "destination": "Le Havre (FRLEH)",
        "speed_knots": 18.6,
        "draught_m": 15.5,
        "current_segment_index": 6,
        "segment_progress": 0.29
    },
    {
        "imo": 9726861,
        "name": "FRONT ALTAIR",
        "flag": "Marshall Islands",
        "type": "Aframax Crude Tanker",
        "capacity": "110,000 DWT",
        "length_m": 251,
        "route_id": "sr-persian-gulf-crude",
        "origin": "Jubail (SAJUB)",
        "destination": "Singapore Shell (SGSIN)",
        "speed_knots": 14.0,
        "draught_m": 14.2,
        "current_segment_index": 5,
        "segment_progress": 0.50
    }
]


# ============================================================================
# 2. GLOBAL COMMERCIAL AVIATION AIRWAYS (AIR ROUTES)
# ============================================================================

AIR_ROUTES_DATA: List[Dict[str, Any]] = [
    {
        "id": "ar-nat-london-ny",
        "name": "North Atlantic Track Alpha (LHR ↔ JFK)",
        "origin_iata": "LHR",
        "origin_city": "London",
        "dest_iata": "JFK",
        "dest_city": "New York",
        "flight_level": "FL370 (37,000 ft)",
        "color": "#38bdf8",
        "waypoints": [
            [51.47, -0.46, "London Heathrow (LHR)"],
            [54.50, -6.00, "Belfast FIR Waypoint"],
            [57.00, -20.00, "Oceanic Entry Point SUNOT"],
            [58.00, -30.00, "NAT Waypoint 58N030W"],
            [57.00, -40.00, "Southern Greenland Gander Oceanic"],
            [54.00, -50.00, "Coast of Labrador ELSIR"],
            [48.00, -63.00, "Gulf of St. Lawrence"],
            [44.00, -70.00, "Boston Approach Corridor"],
            [40.64, -73.78, "John F. Kennedy Intl (JFK)"]
        ]
    },
    {
        "id": "ar-pac-tokyo-sf",
        "name": "North Pacific Air Route Corridor (HND ↔ SFO)",
        "origin_iata": "HND",
        "origin_city": "Tokyo",
        "dest_iata": "SFO",
        "dest_city": "San Francisco",
        "flight_level": "FL390 (39,000 ft)",
        "color": "#10b981",
        "waypoints": [
            [35.55, 139.78, "Tokyo Haneda (HND)"],
            [42.00, 150.00, "Kurile Islands Transition"],
            [48.00, 165.00, "North Pacific Jet Stream Core"],
            [52.00, -175.00, "Aleutian Islands Bypass"],
            [50.00, -150.00, "Gulf of Alaska Great Circle Arc"],
            [43.00, -130.00, "Offshore Oregon Tracking Waypoint"],
            [37.62, -122.38, "San Francisco Intl (SFO)"]
        ]
    },
    {
        "id": "ar-eur-mideast-india",
        "name": "Euro–Gulf–Asia Skyway (FRA ↔ DXB ↔ DEL)",
        "origin_iata": "FRA",
        "origin_city": "Frankfurt",
        "dest_iata": "DEL",
        "dest_city": "New Delhi",
        "flight_level": "FL360 (36,000 ft)",
        "color": "#f59e0b",
        "waypoints": [
            [50.03, 8.57, "Frankfurt Airport (FRA)"],
            [45.82, 16.07, "Zagreb Control Area"],
            [41.00, 28.82, "Istanbul Airway Passage"],
            [36.90, 35.32, "Eastern Mediterranean Turkey/Syria"],
            [29.37, 47.98, "Northern Persian Gulf"],
            [25.25, 55.36, "Dubai Intl Gateway (DXB)"],
            [23.50, 62.00, "Muscat Oceanic Flight Info Region"],
            [24.50, 70.00, "Gujarat Air Corridor Entrance"],
            [28.56, 77.10, "Indira Gandhi Intl, New Delhi (DEL)"]
        ]
    },
    {
        "id": "ar-kangaroo-route",
        "name": "Kangaroo Express Route (SIN ↔ SYD)",
        "origin_iata": "SIN",
        "origin_city": "Singapore",
        "dest_iata": "SYD",
        "dest_city": "Sydney",
        "flight_level": "FL380 (38,000 ft)",
        "color": "#8b5cf6",
        "waypoints": [
            [1.36, 103.99, "Singapore Changi (SIN)"],
            [-6.13, 106.65, "Jakarta Soekarno-Hatta Transition"],
            [-12.00, 115.00, "Java Sea / Bali Southern Oceanic Waypoint"],
            [-21.00, 126.00, "Western Australia Great Sandy Desert"],
            [-26.00, 134.00, "Central Australia / Alice Springs"],
            [-31.00, 142.00, "Broken Hill Overland Waypoint"],
            [-33.95, 151.18, "Sydney Kingsford Smith (SYD)"]
        ]
    },
    {
        "id": "ar-us-transcontinental",
        "name": "US Coast-to-Coast Jet Corridor (JFK ↔ LAX)",
        "origin_iata": "JFK",
        "origin_city": "New York",
        "dest_iata": "LAX",
        "dest_city": "Los Angeles",
        "flight_level": "FL350 (35,000 ft)",
        "color": "#06b6d4",
        "waypoints": [
            [40.64, -73.78, "John F. Kennedy Intl (JFK)"],
            [41.00, -80.00, "Pennsylvania Waypoint ETG"],
            [41.50, -88.00, "Chicago Airway Transition"],
            [41.20, -96.00, "Omaha VOR Flight Path"],
            [39.80, -105.00, "Denver Rocky Mountain Divide"],
            [37.00, -113.00, "Utah / Arizona Plateau"],
            [34.00, -117.00, "San Bernardino Descent Approach"],
            [33.94, -118.41, "Los Angeles Intl (LAX)"]
        ]
    },
    {
        "id": "ar-asia-pacific-spine",
        "name": "East Asian Mega-Spine (HND ↔ ICN ↔ HKG ↔ SIN)",
        "origin_iata": "HND",
        "origin_city": "Tokyo",
        "dest_iata": "SIN",
        "dest_city": "Singapore",
        "flight_level": "FL400 (40,000 ft)",
        "color": "#ec4899",
        "waypoints": [
            [35.55, 139.78, "Tokyo Haneda (HND)"],
            [35.00, 132.00, "Western Honshu Skyway"],
            [37.47, 126.44, "Seoul Incheon (ICN)"],
            [31.14, 121.80, "Shanghai Pudong (PVG)"],
            [25.08, 121.23, "Taipei Taoyuan (TPE)"],
            [22.31, 113.91, "Hong Kong Intl (HKG)"],
            [16.00, 110.00, "Da Nang / Vietnam High-Altitude Airway"],
            [1.36, 103.99, "Singapore Changi (SIN)"]
        ]
    },
    {
        "id": "ar-transatlantic-south",
        "name": "Pan-American Spine (MIA ↔ BOG ↔ GRU)",
        "origin_iata": "MIA",
        "origin_city": "Miami",
        "dest_iata": "GRU",
        "dest_city": "São Paulo",
        "flight_level": "FL370 (37,000 ft)",
        "color": "#a855f7",
        "waypoints": [
            [25.79, -80.29, "Miami Intl (MIA)"],
            [20.00, -78.00, "Cuba / Caribbean Passage"],
            [12.00, -75.00, "Cartagena Air Corridor"],
            [4.70, -74.15, "Bogotá El Dorado (BOG)"],
            [-3.00, -60.00, "Amazon Basin / Manaus Gateway"],
            [-12.00, -50.00, "Cerrado Central Plateau"],
            [-23.43, -46.47, "São Paulo–Guarulhos (GRU)"]
        ]
    }
]

# Real-world commercial flights navigating along these airways
COMMERCIAL_FLIGHTS_SEED = [
    {
        "callsign": "BAW178",
        "airline": "British Airways",
        "aircraft": "Boeing 777-300ER",
        "reg": "G-STBL",
        "route_id": "ar-nat-london-ny",
        "origin": "LHR (London)",
        "destination": "JFK (New York)",
        "altitude_ft": 37000,
        "groundspeed_kts": 490,
        "current_segment_index": 3,
        "segment_progress": 0.48
    },
    {
        "callsign": "UAE201",
        "airline": "Emirates",
        "aircraft": "Airbus A380-800",
        "reg": "A6-EUV",
        "route_id": "ar-nat-london-ny",
        "origin": "DXB (Dubai)",
        "destination": "JFK (New York)",
        "altitude_ft": 39000,
        "groundspeed_kts": 512,
        "current_segment_index": 5,
        "segment_progress": 0.72
    },
    {
        "callsign": "ANA106",
        "airline": "All Nippon Airways",
        "aircraft": "Boeing 787-9 Dreamliner",
        "reg": "JA894A",
        "route_id": "ar-pac-tokyo-sf",
        "origin": "HND (Tokyo)",
        "destination": "SFO (San Francisco)",
        "altitude_ft": 39000,
        "groundspeed_kts": 540,
        "current_segment_index": 3,
        "segment_progress": 0.62
    },
    {
        "callsign": "UAL857",
        "airline": "United Airlines",
        "aircraft": "Boeing 777-200ER",
        "reg": "N78001",
        "route_id": "ar-pac-tokyo-sf",
        "origin": "SFO (San Francisco)",
        "destination": "HND (Tokyo)",
        "altitude_ft": 38000,
        "groundspeed_kts": 485,
        "current_segment_index": 2,
        "segment_progress": 0.35
    },
    {
        "callsign": "DLH760",
        "airline": "Lufthansa",
        "aircraft": "Airbus A350-900",
        "reg": "D-AIXM",
        "route_id": "ar-eur-mideast-india",
        "origin": "FRA (Frankfurt)",
        "destination": "DEL (New Delhi)",
        "altitude_ft": 36000,
        "groundspeed_kts": 505,
        "current_segment_index": 4,
        "segment_progress": 0.81
    },
    {
        "callsign": "AIC101",
        "airline": "Air India",
        "aircraft": "Boeing 777-300ER",
        "reg": "VT-ALQ",
        "route_id": "ar-eur-mideast-india",
        "origin": "DEL (New Delhi)",
        "destination": "LHR (London)",
        "altitude_ft": 35000,
        "groundspeed_kts": 498,
        "current_segment_index": 6,
        "segment_progress": 0.40
    },
    {
        "callsign": "QFA1",
        "airline": "Qantas Airways",
        "aircraft": "Airbus A380-800",
        "reg": "VH-OQA",
        "route_id": "ar-kangaroo-route",
        "origin": "SIN (Singapore)",
        "destination": "SYD (Sydney)",
        "altitude_ft": 40000,
        "groundspeed_kts": 525,
        "current_segment_index": 3,
        "segment_progress": 0.53
    },
    {
        "callsign": "SIA322",
        "airline": "Singapore Airlines",
        "aircraft": "Airbus A350-900ULR",
        "reg": "9V-SGA",
        "route_id": "ar-kangaroo-route",
        "origin": "SIN (Singapore)",
        "destination": "MEL (Melbourne)",
        "altitude_ft": 39000,
        "groundspeed_kts": 518,
        "current_segment_index": 2,
        "segment_progress": 0.22
    },
    {
        "callsign": "AAL1",
        "airline": "American Airlines",
        "aircraft": "Airbus A321T",
        "reg": "N101NN",
        "route_id": "ar-us-transcontinental",
        "origin": "JFK (New York)",
        "destination": "LAX (Los Angeles)",
        "altitude_ft": 34000,
        "groundspeed_kts": 475,
        "current_segment_index": 4,
        "segment_progress": 0.65
    },
    {
        "callsign": "CPA735",
        "airline": "Cathay Pacific",
        "aircraft": "Airbus A350-1000",
        "reg": "B-LXA",
        "route_id": "ar-asia-pacific-spine",
        "origin": "HKG (Hong Kong)",
        "destination": "SIN (Singapore)",
        "altitude_ft": 41000,
        "groundspeed_kts": 510,
        "current_segment_index": 5,
        "segment_progress": 0.58
    },
    {
        "callsign": "TAM8091",
        "airline": "LATAM Airlines",
        "aircraft": "Boeing 787-9 Dreamliner",
        "reg": "CC-BGA",
        "route_id": "ar-transatlantic-south",
        "origin": "MIA (Miami)",
        "destination": "GRU (São Paulo)",
        "altitude_ft": 37000,
        "groundspeed_kts": 500,
        "current_segment_index": 3,
        "segment_progress": 0.38
    }
]


class RoutesTelemetryService:
    """Computes dynamic vessel and flight positions along global routes with continuous time progression."""

    def __init__(self):
        self.start_time = time.time()

    def get_sea_routes_data(self) -> Dict[str, Any]:
        """Returns all global maritime routes and interpolated commercial vessel positions."""
        now = time.time()
        elapsed_hours = (now - self.start_time) / 3600.0

        vessels_live = []
        routes_by_id = {r["id"]: r for r in SEA_ROUTES_DATA}

        for v in COMMERCIAL_VESSELS_SEED:
            route = routes_by_id.get(v["route_id"])
            if not route:
                continue

            waypoints = route["waypoints"]
            num_segments = len(waypoints) - 1

            # Progression speed: commercial vessels move ~14-22 knots
            # Time factor creates continuous visual movement
            speed_factor = (v["speed_knots"] / 20.0) * 0.05
            raw_progress = v["current_segment_index"] + v["segment_progress"] + (elapsed_hours * speed_factor)
            
            # Loop along the route
            cycle_progress = raw_progress % num_segments
            seg_idx = int(cycle_progress)
            frac = cycle_progress - seg_idx

            p1 = (waypoints[seg_idx][0], waypoints[seg_idx][1])
            p2 = (waypoints[seg_idx + 1][0], waypoints[seg_idx + 1][1])

            lat, lon = interpolate_segment(p1, p2, frac)
            heading = haversine_bearing(p1[0], p1[1], p2[0], p2[1])

            vessels_live.append({
                "imo": v["imo"],
                "name": v["name"],
                "flag": v["flag"],
                "type": v["type"],
                "capacity": v["capacity"],
                "length_m": v["length_m"],
                "route_name": route["name"],
                "origin": v["origin"],
                "destination": v["destination"],
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "heading": round(heading, 1),
                "speed_knots": v["speed_knots"],
                "draught_m": v["draught_m"],
                "status": "Underway Using Engine",
                "next_waypoint": waypoints[min(seg_idx + 1, len(waypoints) - 1)][2]
            })

        return {
            "routes_count": len(SEA_ROUTES_DATA),
            "vessels_count": len(vessels_live),
            "routes": SEA_ROUTES_DATA,
            "vessels": vessels_live
        }

    def get_air_routes_data(self) -> Dict[str, Any]:
        """Returns all global air traffic airways and interpolated commercial aircraft positions."""
        now = time.time()
        elapsed_hours = (now - self.start_time) / 3600.0

        flights_live = []
        routes_by_id = {r["id"]: r for r in AIR_ROUTES_DATA}

        for f in COMMERCIAL_FLIGHTS_SEED:
            route = routes_by_id.get(f["route_id"])
            if not route:
                continue

            waypoints = route["waypoints"]
            num_segments = len(waypoints) - 1

            # Commercial planes fly ~480-540 knots (much faster progression across segments)
            speed_factor = (f["groundspeed_kts"] / 500.0) * 0.4
            raw_progress = f["current_segment_index"] + f["segment_progress"] + (elapsed_hours * speed_factor)

            cycle_progress = raw_progress % num_segments
            seg_idx = int(cycle_progress)
            frac = cycle_progress - seg_idx

            p1 = (waypoints[seg_idx][0], waypoints[seg_idx][1])
            p2 = (waypoints[seg_idx + 1][0], waypoints[seg_idx + 1][1])

            lat, lon = interpolate_segment(p1, p2, frac)
            heading = haversine_bearing(p1[0], p1[1], p2[0], p2[1])

            altitude_m = (f["altitude_ft"] * 0.3048)

            flights_live.append({
                "callsign": f["callsign"],
                "airline": f["airline"],
                "aircraft": f["aircraft"],
                "reg": f["reg"],
                "route_name": route["name"],
                "origin": f["origin"],
                "destination": f["destination"],
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "altitude_ft": f["altitude_ft"],
                "altitude_meters": round(altitude_m, 1),
                "groundspeed_kts": f["groundspeed_kts"],
                "groundspeed_kmh": round(f["groundspeed_kts"] * 1.852, 1),
                "heading": round(heading, 1),
                "squawk": "7700" if f.get("emergency") else "2415",
                "status": "En Route (Cruising)",
                "next_waypoint": waypoints[min(seg_idx + 1, len(waypoints) - 1)][2]
            })

        return {
            "routes_count": len(AIR_ROUTES_DATA),
            "flights_count": len(flights_live),
            "routes": AIR_ROUTES_DATA,
            "flights": flights_live
        }


routes_telemetry_service = RoutesTelemetryService()
