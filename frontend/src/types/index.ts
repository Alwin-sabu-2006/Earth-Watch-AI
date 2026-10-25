export type EventType =
  | 'wildfire'
  | 'flood'
  | 'cyclone'
  | 'earthquake'
  | 'volcano'
  | 'heatwave'
  | 'storm'
  | 'environmental_anomaly';

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface Satellite {
  id: string;
  name: string;
  norad_id?: number;
  country?: string;
  operator?: string;
  mission: string;
  purpose?: string;
  orbit_type?: string;
  altitude?: number;
  launch_date?: string;
  latitude: number;
  longitude: number;
  velocity?: number;
  inclination?: number;
  period_minutes?: number;
  eccentricity?: number;
  tle_line1?: string;
  tle_line2?: string;
  sensor_type?: string;
  swath_km?: number;
  data_source?: string;
  status: string;
  is_live: boolean;
  last_updated?: string;
}

export interface EventSatelliteRel {
  satellite_id: string;
  satellite_name: string;
  mission: string;
  orbit_type: string;
  altitude?: number;
  latitude: number;
  longitude: number;
  relationship: string;
  distance_km: number;
  sensor_type?: string;
  swath_km?: number;
  next_pass_in_minutes?: number;
}

export interface DisasterEvent {
  id: string;
  title: string;
  type: EventType;
  latitude: number;
  longitude: number;
  severity: SeverityLevel;
  description?: string;
  detected_at: string;
  source: string;
  status: string;
  affected_area_km2?: number;
  estimated_population?: number;
  ai_summary?: string;
  is_live: boolean;
  is_simulated: boolean;
  relevant_satellites?: EventSatelliteRel[];
  weather_context?: WeatherData;
}

export interface LocationItem {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  region?: string;
  population?: number;
  current_events?: DisasterEvent[];
  nearby_satellites?: Satellite[];
  weather?: WeatherData;
  historical_events_count?: number;
  risk_level?: 'Low' | 'Moderate' | 'High' | 'Critical';
}

export interface WeatherData {
  is_live: boolean;
  provider: string;
  temperature_c: number;
  apparent_temperature_c: number;
  humidity_percent: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  pressure_hpa: number;
  condition: string;
  icon: string;
  weather_code: number;
  uv_index?: number | null;
  uv_label?: string | null;
  visibility_km?: number | null;
  dew_point_c?: number | null;
  cloud_cover_pct?: number | null;
  cloudcover_percent?: number | null;
  feels_like_c?: number | null;
  temperature_celsius?: number | null;
  description?: string | null;
  humidity_pct?: number | null;
}

export interface SimulationStep {
  hour: number;
  latitude: number;
  longitude: number;
  radius_km: number;
  intensity: number;
  affected_population: number;
  affected_area_km2: number;
}

export interface SimulationResult {
  simulation_id: string;
  is_simulation: boolean;
  notice: string;
  event_type: string;
  title: string;
  center_latitude: number;
  center_longitude: number;
  max_radius_km: number;
  total_affected_area_km2: number;
  estimated_population: number;
  steps: SimulationStep[];
  nearby_monitoring_satellites: EventSatelliteRel[];
  nearby_regions: string[];
  ai_risk_assessment: string;
}

export interface SimulationRequestPayload {
  event_type: string;
  starting_location_name?: string;
  latitude: number;
  longitude: number;
  intensity: number;
  radius_km: number;
  direction_deg: number;
  speed_kmh: number;
  duration_hours: number;
}

export interface AIAnalyzePayload {
  query: string;
  selected_event_id?: string;
  selected_location_id?: string;
}

export interface AIAnalyzeResult {
  query: string;
  answer: string;
  confidence: number;
  sources: string[];
  relevant_events: DisasterEvent[];
  relevant_satellites: Satellite[];
  suggestions: string[];
  insufficient_data?: boolean;
}

export interface AnalyticsResponse {
  total_events: number;
  total_satellites: number;
  events_by_type: Record<string, number>;
  events_by_severity: Record<string, number>;
  events_by_region: Record<string, number>;
  satellites_by_mission: Record<string, number>;
  timeline_trend: Array<{
    period: string;
    wildfire: number;
    flood: number;
    cyclone: number;
    earthquake: number;
    total: number;
  }>;
  last_updated: string;
}

export interface FilterState {
  eventType: string; // 'all' or specific
  severity: string;  // 'all' or specific
  status: string;    // 'all' or specific
  timelineHoursAgo: number; // 0 (now) to 48
  showSatellites: boolean;
  showDisasters: boolean;
  showOrbits: boolean;
  showLabels: boolean;
  showWildfires?: boolean;
  showNews?: boolean;
  showChokepoints?: boolean;
  showSeaRoutes?: boolean;
  showAirRoutes?: boolean;
  showSatellitePoints?: boolean;
  satelliteMission: string;
}

export interface CelesTrakStatusResponse {
  service: string;
  provider: string;
  is_live_synced: boolean;
  last_sync: string | null;
  total_norad_tracked: number;
  propagator_engine: string;
  reference_frame: string;
  tracked_satellites: number[];
}

export interface TLEDecodedResult {
  satellite_name: string;
  norad_id: number;
  classification: string;
  international_designator: string;
  epoch: {
    utc_timestamp: string;
    year: number;
    day_of_year: number;
    age_days: number;
  };
  line1_fields: {
    line_number: number;
    satellite_catalog_number: string;
    ballistic_coefficient_first_derivative: number;
    second_derivative_mean_motion: number;
    bstar_drag_term: number;
    bstar_scientific: string;
    ephemeris_type: string;
    element_set_number: string;
    checksum: string;
  };
  line2_fields: {
    line_number: number;
    satellite_catalog_number: string;
    inclination_deg: number;
    raan_deg: number;
    eccentricity: number;
    argument_of_perigee_deg: number;
    mean_anomaly_deg: number;
    mean_motion_revs_day: number;
    revolution_number_at_epoch: number;
    checksum: string;
  };
  derived_orbital_elements: {
    semi_major_axis_km: number;
    apogee_altitude_km: number;
    perigee_altitude_km: number;
    orbital_period_minutes: number;
    mean_orbital_speed_kms: number;
    orbit_regime: string;
    is_sun_synchronous: boolean;
    revolutions_per_day: number;
  };
  sensor_info: {
    sensor_type: string;
    swath_km: number;
    purpose: string;
    operator: string;
  };
}

export interface OverpassMatrixItem {
  satellite_name: string;
  norad_id: number;
  operator: string;
  sensor_type: string;
  swath_km: number;
  disaster_id: string;
  disaster_title: string;
  disaster_type: string;
  disaster_severity: string;
  target_lat: number;
  target_lon: number;
  minutes_until_pass: number;
  predicted_pass_time: string;
  closest_approach_km: number;
  is_within_swath: boolean;
  suitability_score: number;
}

export interface CelesTrakKnowledgeResponse {
  source: string;
  curator: string;
  modules: Array<{
    id: string;
    title: string;
    tag: string;
    summary: string;
    details: string[];
  }>;
  total_targets: number;
  target_satellites: Array<{
    norad_id: number;
    name: string;
    operator: string;
    sensor_type: string;
    swath_km: number;
    mission: string;
  }>;
}

export interface AirQualityData {
  provider?: string;
  european_aqi: number;
  us_aqi: number;
  aqi_label: string;
  aqi_color: string;
  pm2_5_ugm3?: number;
  pm10_ugm3?: number;
  nitrogen_dioxide_ugm3?: number;
  ozone_ugm3?: number;
  carbon_monoxide_ugm3?: number;
  sulphur_dioxide_ugm3?: number;
  dust_ugm3?: number;
  aerosol_optical_depth?: number;
}

export interface MarineData {
  provider?: string;
  wave_height_m: number;
  wave_direction_deg?: number;
  wave_period_s?: number;
  wind_wave_height_m?: number;
  swell_wave_height_m?: number;
  swell_wave_period_s?: number;
  sea_state: string;
}

export interface SolarEphemerisData {
  provider?: string;
  timezone: string;
  utc_offset_hours: number;
  is_daylight: boolean;
  solar_phase: string;
  sunrise?: string;
  sunset?: string;
  daylight_duration_hours?: number;
  uv_index_max?: number;
}

export interface WikipediaLandmark {
  provider?: string;
  title: string;
  description?: string;
  extract?: string;
  distance_km: number;
  url?: string;
  thumbnail?: string;
}

export interface USGSEarthquake {
  id: string;
  title: string;
  place: string;
  magnitude: number;
  depth_km: number;
  distance_km: number;
  severity: string;
  time: string;
  url?: string;
  tsunami_alert: boolean;
  source: string;
}

export interface SpotInspectionData {
  latitude: number;
  longitude: number;
  coordinate_label: string;
  name: string;
  display_name: string;
  country: string;
  region: string;
  terrain_type: string;
  is_maritime: boolean;
  elevation_m?: number | null;
  weather: WeatherData | null;
  air_quality?: AirQualityData | null;
  nearby_events: Array<{
    id: string;
    title: string;
    type: EventType;
    severity: SeverityLevel;
    distance_km: number;
    latitude: number;
    longitude: number;
  }>;
  nasa_events?: Array<{
    id: string;
    title: string;
    category: string;
    category_id: string;
    latitude: number;
    longitude: number;
    distance_km: number;
    source: string;
    link?: string;
  }>;
  usgs_earthquakes?: USGSEarthquake[];
  marine_conditions?: MarineData | null;
  solar_ephemeris?: SolarEphemerisData | null;
  wikipedia_info?: WikipediaLandmark | null;
  next_overpass: {
    satellite_name: string;
    operator: string;
    minutes_until_pass: number;
    predicted_pass_time: string;
    closest_approach_km: number;
    is_within_swath: boolean;
    swath_width_km: number;
    sensor_type: string;
  } | null;
  risk_level: string;
}

// ── World Monitor Real-Time Intelligence Interfaces (koala73/worldmonitor) ──

export interface WorldMonitorOverview {
  status: string;
  last_synced?: string;
  total_live_disasters: number;
  total_active_wildfires: number;
  total_geopolitical_events: number;
  monitored_chokepoints_count: number;
  newly_added_to_db?: number;
  data_sources: Record<string, string>;
}

export interface WorldMonitorStreamItem {
  id: string;
  category: 'disaster' | 'wildfire' | 'geopolitical' | 'maritime' | 'satellite';
  hazard_type?: string;
  title: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  latitude: number;
  longitude: number;
  location_name: string;
  timestamp: string;
  source: string;
  summary: string;
  metrics?: Record<string, any>;
}

export interface MaritimeChokepoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  threat_level: string;
  oil_transit_mbpd: number;
  daily_vessels: number;
  key_commodities: string[];
  connected_bodies: string[];
  littoral_states: string[];
  strategic_importance: string;
  incident_watch: string;
}

export interface ActiveWildfire {
  id: string;
  latitude: number;
  longitude: number;
  brightness_k: number;
  frp_mw: number;
  confidence: string;
  satellite: string;
  daynight: string;
  detected_at: string;
  severity: SeverityLevel;
  title: string;
  type: string;
}

export interface GeopoliticalNews {
  id: string;
  title: string;
  source: string;
  link: string;
  summary: string;
  category: string;
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
  location_name: string;
  published_at: string;
}

export interface CrisisResponsePlan {
  event_id: string;
  title: string;
  hazard_type: string;
  coordinates: { latitude: number; longitude: number };
  severity: string;
  timestamp_generated: string;
  evacuation_zone: {
    recommended_radius_km: number;
    estimated_people_at_risk: number;
    priority_level: string;
  };
  immediate_actions: string[];
  humanitarian_logistics: {
    emergency_shelter_spaces: number;
    clean_water_daily_liters: number;
    medical_triage_units_recommended: number;
    power_backup_diesel_kva: number;
  };
  space_reconnaissance_window: Array<{
    satellite_name: string;
    mission: string;
    distance_km: number;
    estimated_pass_minutes: number;
    sensor_type: string;
    swath_km: number;
  }>;
  phases: Array<{
    phase: string;
    focus: string;
  }>;
}




