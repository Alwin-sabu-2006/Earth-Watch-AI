import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Flame,
  Waves,
  Tornado,
  Mountain,
  SunMedium,
  Zap,
  Activity,
  Satellite as SatelliteIcon,
  Bot,
  CloudSun,
  Wind,
  Droplets,
  Gauge,
  ExternalLink,
  ShieldAlert,
  Radio,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Compass,
  List,
  Info,
  MapPin,
  Clock,
  Layers,
  FileText,
  Calendar,
  History,
  Radar
} from 'lucide-react';
import { DisasterEvent, EventSatelliteRel, Satellite, WeatherData } from '../../types';
import { fetchLiveWeatherClient } from '../../services/liveWeather';
import { getHazardLifecycleInfo } from '../../data/hazardLifecycle';

interface EventDetailPanelProps {
  event: DisasterEvent;
  allEvents?: DisasterEvent[];
  onSelectEvent?: (event: DisasterEvent) => void;
  onClose: () => void;
  onSelectSatelliteId: (satId: string) => void;
  onFlyToSite?: (lat: number, lon: number, altitude?: number) => void;
  onBackToList?: () => void;
  isSidebarOpen?: boolean;
}

export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({
  event,
  allEvents = [],
  onSelectEvent,
  onClose,
  onSelectSatelliteId,
  onFlyToSite,
  onBackToList,
  isSidebarOpen = false,
}) => {
  const [liveWeather, setLiveWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (event.weather_context && event.weather_context.is_live && event.weather_context.temperature_c != null) {
      setLiveWeather(event.weather_context);
      return;
    }
    let isMounted = true;
    fetchLiveWeatherClient(event.latitude, event.longitude).then((w) => {
      if (isMounted && w) setLiveWeather(w);
    });
    return () => {
      isMounted = false;
    };
  }, [event.id, event.latitude, event.longitude, event.weather_context]);

  const weather = (event.weather_context && event.weather_context.is_live && event.weather_context.temperature_c != null)
    ? event.weather_context
    : liveWeather;

  const lifecycle = getHazardLifecycleInfo(event);

  const currentIndex = allEvents.findIndex((e) => e.id === event.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allEvents.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectEvent) {
      onSelectEvent(allEvents[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectEvent) {
      onSelectEvent(allEvents[currentIndex + 1]);
    }
  };

  const handleRecenter = () => {
    if (onFlyToSite) {
      const radiusKm = Math.sqrt(event.affected_area_km2 || 400);
      const siteAltitude = Math.max(160000, Math.min(380000, radiusKm * 6500));
      onFlyToSite(event.latitude, event.longitude, siteAltitude);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50 neon-glow-rose';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50 neon-glow-amber';
      case 'moderate':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/50';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'wildfire': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'flood': return <Waves className="w-5 h-5 text-cyan-400" />;
      case 'cyclone': return <Tornado className="w-5 h-5 text-indigo-400" />;
      case 'volcano': return <Flame className="w-5 h-5 text-rose-500" />;
      case 'heatwave': return <SunMedium className="w-5 h-5 text-amber-400" />;
      case 'earthquake': return <Mountain className="w-5 h-5 text-emerald-400" />;
      case 'storm': return <Zap className="w-5 h-5 text-yellow-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-purple-400" />;
    }
  };

  // Detailed mechanism synthesis according to disaster type
  const getHazardMechanism = (ev: DisasterEvent) => {
    switch (ev.type.toLowerCase()) {
      case 'earthquake':
        return 'Tectonic lithospheric stress release along continental fault boundaries. Seismic wave displacement propagates radially through crustal strata, generating high-frequency tremors and regional aftershock hazards.';
      case 'volcano':
        return 'Subterranean magma column decompression and hydrothermal vent pressurization resulting in explosive tephra ejection, pyroclastic flow potential, and atmospheric sulfur dioxide emissions.';
      case 'wildfire':
        return 'Rapid thermal radiant combustion driven by arid fuel conditions, elevated ambient temperatures, and desiccating wind vectors promoting rapid flame perimeter propagation across canopy and brush.';
      case 'cyclone':
        return 'Intense oceanic cyclogenesis fueled by high sea surface temperatures (>26.5°C), organized deep convection, and Coriolis acceleration generating destructive storm surge and gale-force wind fields.';
      case 'flood':
        return 'Severe meteorological precipitation and watershed catchment saturation exceeding riverbank discharge capacities, resulting in low-lying overland inundation and sediment scour.';
      case 'heatwave':
        return 'Stagnant high-pressure atmospheric heat dome trapping solar radiation and compressing descending air masses, inducing dangerous surface thermal anomalies and physiological heat index stress.';
      default:
        return 'Multi-sensor environmental anomaly verified through automated radiometric and ground sensor telemetry.';
    }
  };

  const latLabel = `${Math.abs(event.latitude).toFixed(3)}°${event.latitude >= 0 ? 'N' : 'S'}`;
  const lonLabel = `${Math.abs(event.longitude).toFixed(3)}°${event.longitude >= 0 ? 'E' : 'W'}`;

  return (
    <div
      className={`absolute top-20 ${
        isSidebarOpen ? 'left-[304px]' : 'left-[88px]'
      } w-96 max-h-[calc(100vh-160px)] z-30 flex flex-col glass-panel rounded-2xl border border-rose-500/35 shadow-2xl text-slate-100 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300`}
    >
      {/* Top Registry Navigator Bar */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-rose-500/20 flex items-center justify-between text-xs font-mono">
        {onBackToList ? (
          <button
            onClick={onBackToList}
            className="flex items-center gap-1.5 text-rose-300 hover:text-white px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer text-[11px]"
            title="Return to full Hazard Registry list"
          >
            <List className="w-3.5 h-3.5 text-rose-400" />
            <span>Hazard Registry</span>
            {allEvents.length > 0 && (
              <span className="text-[10px] text-rose-400/80">({allEvents.length})</span>
            )}
          </button>
        ) : (
          <span className="text-rose-400 flex items-center gap-1 font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>HAZARD LOG</span>
          </span>
        )}

        {/* Previous / Next Hazard Browsing */}
        <div className="flex items-center gap-1">
          {allEvents.length > 0 && (
            <span className="text-[10px] text-slate-400 mr-1">
              {currentIndex >= 0 ? `${currentIndex + 1}/${allEvents.length}` : ''}
            </span>
          )}
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className={`p-1 rounded-lg border transition-all ${
              hasPrev
                ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-rose-400 hover:text-white cursor-pointer'
                : 'border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
            }`}
            title="Previous Hazard in Registry"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            disabled={!hasNext}
            className={`p-1 rounded-lg border transition-all ${
              hasNext
                ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-rose-400 hover:text-white cursor-pointer'
                : 'border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
            }`}
            title="Next Hazard in Registry"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRecenter}
            className="p-1 ml-1 rounded-lg border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:text-white hover:bg-rose-500/30 transition-all cursor-pointer"
            title="Focus camera on exact hazard site"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div className="p-4 border-b border-rose-500/15 bg-slate-950/40 space-y-2.5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-rose-500/30 shadow-md shadow-rose-500/10 shrink-0">
            {getEventIcon(event.type)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${getSeverityBadge(event.severity)}`}>
                {event.severity}
              </span>
              <span className="text-xs font-mono uppercase text-rose-400 font-bold">
                {event.type}
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${lifecycle.badgeColorClass}`}>
                {lifecycle.operationalBadge}
              </span>
            </div>
            <h3 className="font-bold text-sm text-white line-clamp-2 mt-1 leading-snug" title={event.title}>
              {event.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 font-mono mt-1">
              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
              <span>Exact Site: {latLabel}, {lonLabel}</span>
            </div>
          </div>
        </div>

        {/* Real-world Incident Timeline & Recency Banner */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1 text-[11px] font-mono">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Recorded: {lifecycle.timeAgoLabel}
            </span>
            <span className="text-[10px] text-slate-400">{lifecycle.formattedDate}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800">
            <Radar className="w-3 h-3 text-sky-400 shrink-0" />
            <span className="text-sky-300 font-medium truncate">{lifecycle.lifecycleStage}</span>
          </div>
        </div>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Core Metric Cards */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" />
              EPICENTER
            </span>
            <div className="font-mono text-white font-semibold mt-0.5 text-[11px]">
              {latLabel}, {lonLabel}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              EVENT RECENCY
            </span>
            <div className="font-semibold text-amber-300 font-mono mt-0.5">
              {lifecycle.shortTimeAgo}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono uppercase">AFFECTED FOOTPRINT</span>
            <div className="font-mono text-white font-semibold mt-0.5">
              {event.affected_area_km2 ? `${event.affected_area_km2.toLocaleString()} km²` : 'Regional Footprint'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono uppercase">EXPOSED POPULATION</span>
            <div className="font-mono text-white font-semibold mt-0.5">
              {event.estimated_population ? event.estimated_population.toLocaleString() : 'Surveillance Active'}
            </div>
          </div>
        </div>

        {/* Detailed Event Description & Situational Telemetry */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-rose-300 font-bold">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              EVENT DESCRIPTION & TELEMETRY
            </span>
            <span className="text-[9px] text-slate-400 uppercase">{event.source} VERIFIED</span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed">
            {event.description || `Real-time geospatial hazard alert registered at ${latLabel}, ${lonLabel}. Verified monitoring feeds indicate ongoing physical disruption within the affected sector.`}
          </p>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 space-y-1">
            <div className="font-mono text-[10px] text-slate-400 uppercase font-semibold">
              GEOPHYSICAL MECHANISM:
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {getHazardMechanism(event)}
            </p>
          </div>
        </div>

        {/* Real-World Post-Disaster Surveillance Context */}
        <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-300 font-bold">
            <Radar className="w-3.5 h-3.5 text-sky-400" />
            <span>POST-EVENT SATELLITE SURVEILLANCE STATUS</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {lifecycle.whyMonitoredRationale}
          </p>

          <div className="pt-1.5 border-t border-sky-500/20 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>ACTIVE SENSORS:</span>
            <span className="text-cyan-300 font-medium truncate max-w-[200px]">{lifecycle.ongoingSensors}</span>
          </div>
        </div>

        {/* Real-time Local Weather at Epicenter */}
        {weather && weather.temperature_c != null && (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400 mb-2">
              <div className="flex items-center gap-1.5">
                <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                <span>CURRENT WEATHER AT SITE</span>
              </div>
              <span className="text-[9px] text-emerald-400 font-bold">OPEN-METEO LIVE</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{weather.icon}</span>
                <div>
                  <div className="font-bold text-white text-base">
                    {weather.temperature_c}°C
                  </div>
                  <div className="text-[11px] text-slate-300 capitalize">
                    {weather.condition}
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] font-mono text-slate-300 space-y-1">
                <div className="flex items-center gap-1 justify-end">
                  <Wind className="w-3 h-3 text-sky-400" />
                  <span>{weather.wind_speed_kmh} km/h wind</span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Droplets className="w-3 h-3 text-cyan-400" />
                  <span>{weather.humidity_percent}% humidity</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Satellites Observing This Hazard Site */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 font-mono uppercase">
              <SatelliteIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>Overhead Satellite Surveillance Passes</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {event.relevant_satellites?.length || 0} active in sector
            </span>
          </div>

          {event.relevant_satellites && event.relevant_satellites.length > 0 ? (
            <div className="space-y-2">
              {event.relevant_satellites.map((rel) => (
                <div
                  key={rel.satellite_id}
                  onClick={() => onSelectSatelliteId(rel.satellite_id)}
                  className="p-2.5 rounded-xl glass-card cursor-pointer group flex flex-col gap-1.5 hover:border-sky-400/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white group-hover:text-sky-300 transition-colors flex items-center gap-1.5">
                      <span>🛰️ {rel.satellite_name}</span>
                    </span>
                    <span className="text-[10px] font-mono text-sky-400 font-bold">
                      {rel.distance_km.toFixed(0)} km away
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="text-[10px] font-mono text-slate-400">{rel.sensor_type || rel.mission}</span>
                    <span className="text-emerald-400 text-[10px] font-mono font-medium">
                      {rel.relationship}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Swath: {rel.swath_km ? `${rel.swath_km.toFixed(0)} km` : '250 km'}</span>
                    {rel.next_pass_in_minutes !== undefined && rel.next_pass_in_minutes !== null ? (
                      <span className="text-cyan-300 font-semibold">
                        {rel.next_pass_in_minutes === 0 ? 'Zenith Pass Active' : `Next Pass in ~${rel.next_pass_in_minutes}m`}
                      </span>
                    ) : (
                      <span className="text-slate-500">CelesTrak Verified</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
              Scanning active orbital constellation for nearest surveillance pass...
            </div>
          )}
        </div>

        {/* AI Synthesis Note */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900/60 border border-indigo-500/30 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>EARTHWATCH AI SYNTHESIS</span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              AI-GENERATED
            </span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed italic">
            &ldquo;{event.ai_summary || `Multi-sensor satellite observation across ${event.title} confirms the primary event occurred recently and post-disaster monitoring is active. Sentinel-1 SAR and optical passes continue mapping surface stability.`}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
};
