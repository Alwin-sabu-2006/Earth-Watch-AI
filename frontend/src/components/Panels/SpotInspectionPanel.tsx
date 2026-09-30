import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  MapPin,
  Crosshair,
  Compass,
  CloudSun,
  Wind,
  Droplets,
  Gauge,
  Satellite as SatelliteIcon,
  ShieldAlert,
  AlertTriangle,
  FlaskConical,
  Bot,
  Copy,
  Check,
  ZoomIn,
  Flame,
  Waves,
  Mountain,
  Tornado,
  Zap,
  Activity,
  Eye,
  Thermometer,
  Globe,
  Radio,
  Sun,
  Moon,
  BookOpen,
  ExternalLink,
  Clock,
  Loader2,
} from 'lucide-react';
import { SpotInspectionData, DisasterEvent, WeatherData } from '../../types';
import { fetchLiveWeatherClient } from '../../services/liveWeather';

interface SpotInspectionPanelProps {
  data: SpotInspectionData | null;
  isLoading: boolean;
  onClose: () => void;
  onSimulateAtSpot: (lat: number, lon: number, name: string) => void;
  onAskAIAboutSpot: (spotName: string, lat: number, lon: number) => void;
  onSelectEvent: (ev: DisasterEvent) => void;
  onZoomIn: (lat: number, lon: number) => void;
}

// ── TERRA local AI summary generator ──────────────────────────────────────────
function generateTerraSummary(data: SpotInspectionData, weatherOverride?: WeatherData | null): string {
  const name = data.name || 'this location';
  const country = data.country || 'Unknown territory';
  const terrain = data.terrain_type || 'unclassified terrain';
  const risk = data.risk_level || 'Unknown';
  const isOcean = data.is_maritime;
  const weather = weatherOverride || data.weather;
  const events = data.nearby_events || [];
  const nasaEvents = (data as any).nasa_events || [];
  const overpass = data.next_overpass;
  const aq = (data as any).air_quality;
  const elev = (data as any).elevation_m;

  let summary = '';

  // Location intro with elevation
  if (isOcean) {
    summary += `📍 ${name} is an open maritime zone in ${country}, classified as ${terrain}.`;
  } else {
    const elevStr = elev != null ? ` at ${elev}m elevation` : '';
    summary += `📍 ${name} is located in ${country}${elevStr}, featuring ${terrain}.`;
  }

  // Weather insight
  if (weather) {
    const temp = weather.temperature_c ?? '?';
    const condition = weather.condition || 'conditions recorded';
    const wind = weather.wind_speed_kmh ?? '?';
    const humidity = weather.humidity_percent ?? '?';
    const uv = weather.uv_index != null ? ` UV index: ${weather.uv_index} (${weather.uv_label}).` : '';
    summary += ` Conditions: ${condition} at ${temp}°C, wind ${wind} km/h, humidity ${humidity}%.${uv}`;
  } else {
    summary += ` No live meteorological data available.`;
  }

  // Air quality
  if (aq && aq.european_aqi != null) {
    summary += ` Air quality: ${aq.aqi_label} (AQI ${aq.european_aqi}).`;
  }

  // Marine ocean state
  const marine = data.marine_conditions;
  if (marine && marine.wave_height_m != null) {
    summary += ` 🌊 Ocean state: ${marine.sea_state} with ${marine.wave_height_m}m waves.`;
  }

  // Solar astronomy & time
  const solar = data.solar_ephemeris;
  if (solar) {
    summary += ` ☀️ ${solar.solar_phase} (${solar.timezone}, Sunrise: ${solar.sunrise || '—'}, Sunset: ${solar.sunset || '—'}).`;
  }

  // USGS Real-time earthquakes
  const quakes = data.usgs_earthquakes || [];
  if (quakes.length > 0) {
    summary += ` 🌋 Seismic: M${quakes[0].magnitude} quake ${quakes[0].distance_km}km away (USGS).`;
  }

  // Wikipedia landmark
  const wiki = data.wikipedia_info;
  if (wiki && wiki.title) {
    summary += ` 🏛️ Area landmark: ${wiki.title} (${wiki.distance_km}km).`;
  }

  // Risk and events insight
  const allEvents = [...events, ...nasaEvents];
  if (risk.toLowerCase().includes('critical') || risk.toLowerCase().includes('high')) {
    summary += ` ⚠️ ${risk} environmental risk`;
    if (allEvents.length > 0) {
      summary += ` — ${allEvents.length} active hazard event${allEvents.length > 1 ? 's' : ''} nearby including ${allEvents[0].title}.`;
    } else { summary += `.`; }
  } else if (allEvents.length > 0) {
    summary += ` ${allEvents.length} nearby natural event${allEvents.length > 1 ? 's' : ''} being monitored — risk: ${risk}.`;
  } else {
    summary += ` ✅ No active events detected in range. Risk level: ${risk}.`;
  }

  // Satellite
  if (overpass) {
    const sat = overpass.satellite_name || 'a monitoring satellite';
    const eta = overpass.minutes_until_pass;
    summary += eta < 60
      ? ` 🛰️ ${sat} overpass in ${eta}m.`
      : ` 🛰️ ${sat} overpass in ${Math.floor(eta/60)}h ${eta%60}m.`;
  }

  return summary;
}

// ── Risk color helpers ─────────────────────────────────────────────────────────
function getRiskColor(risk: string): string {
  const r = risk.toLowerCase();
  if (r.includes('critical')) return 'text-rose-400';
  if (r.includes('high')) return 'text-orange-400';
  if (r.includes('moderate') || r.includes('medium') || r.includes('advisory')) return 'text-amber-400';
  return 'text-emerald-400'; // Low Risk / Nominal
}

function getRiskBg(risk: string): string {
  const r = risk.toLowerCase();
  if (r.includes('critical')) return 'bg-rose-500/15 border-rose-500/30';
  if (r.includes('high')) return 'bg-orange-500/15 border-orange-500/30';
  if (r.includes('moderate') || r.includes('advisory')) return 'bg-amber-500/15 border-amber-500/30';
  return 'bg-emerald-500/15 border-emerald-500/30';
}

function getRiskDot(risk: string): string {
  const r = risk.toLowerCase();
  if (r.includes('critical')) return 'bg-rose-500 animate-ping';
  if (r.includes('high')) return 'bg-orange-500 animate-pulse';
  if (r.includes('moderate') || r.includes('advisory')) return 'bg-amber-400';
  return 'bg-emerald-400';
}

function getHazardIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'wildfire': return <Flame className="w-3.5 h-3.5 text-orange-400" />;
    case 'flood': return <Waves className="w-3.5 h-3.5 text-cyan-400" />;
    case 'cyclone': return <Tornado className="w-3.5 h-3.5 text-indigo-400" />;
    case 'earthquake': return <Mountain className="w-3.5 h-3.5 text-emerald-400" />;
    case 'storm': return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
    default: return <Activity className="w-3.5 h-3.5 text-purple-400" />;
  }
}

export const SpotInspectionPanel: React.FC<SpotInspectionPanelProps> = ({
  data,
  isLoading,
  onClose,
  onSimulateAtSpot,
  onAskAIAboutSpot,
  onSelectEvent,
  onZoomIn,
}) => {
  const [copied, setCopied] = useState(false);
  const [localWeather, setLocalWeather] = useState<WeatherData | null>(null);

  // Directly fetch real live weather if missing or pending
  useEffect(() => {
    if (!data) {
      setLocalWeather(null);
      return;
    }
    if (data.weather && data.weather.is_live && data.weather.temperature_c != null) {
      setLocalWeather(data.weather);
      return;
    }
    let isMounted = true;
    fetchLiveWeatherClient(data.latitude, data.longitude).then((w) => {
      if (isMounted && w) {
        setLocalWeather(w);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [data?.latitude, data?.longitude, data?.weather]);

  const activeWeather = (data?.weather && data.weather.is_live && data.weather.temperature_c != null)
    ? data.weather
    : localWeather;

  const terraSummary = useMemo(() => {
    if (!data) return '';
    return generateTerraSummary(data, activeWeather);
  }, [data, activeWeather]);

  if (!data && !isLoading) return null;

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(`${data.latitude}, ${data.longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <style>{`
        @keyframes terraFadeIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes terraPulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(6,182,212,0.3); }
          50%       { box-shadow: 0 0 12px 4px rgba(6,182,212,0.1); }
        }
        @keyframes terraSpin { to { transform: rotate(360deg); } }
        .terra-panel { animation: terraFadeIn 0.35s cubic-bezier(0.16,1,0.3,1); }
        .terra-avatar-glow { animation: terraPulseGlow 2.5s infinite; }
        .terra-crosshair { animation: terraSpin 4s linear infinite; }
        .terra-scroll::-webkit-scrollbar { width: 3px; }
        .terra-scroll::-webkit-scrollbar-track { background: transparent; }
        .terra-scroll::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.2); border-radius: 99px; }
      `}</style>

      <div
        className="terra-panel"
        style={{
          position: 'absolute',
          top: '80px',
          right: '24px',
          width: '380px',
          maxHeight: 'calc(100vh - 100px)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 30,
          borderRadius: '20px',
          border: '1px solid rgba(6,182,212,0.3)',
          background: 'rgba(2,8,23,0.95)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 0 1px rgba(6,182,212,0.08), 0 25px 60px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}
      >
        {/* ── TERRA Header ──────────────────────────────────────────── */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(6,182,212,0.12)',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(2,8,23,0.8) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Avatar */}
            <div
              className="terra-avatar-glow"
              style={{
                width: '42px', height: '42px', borderRadius: '50%',
                border: '2px solid rgba(6,182,212,0.6)',
                overflow: 'hidden', background: '#0c1a2e', flexShrink: 0,
                position: 'relative',
              }}
            >
              <img
                src="/terra_avatar.jpg"
                alt="TERRA"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {/* fallback icon */}
              <Globe style={{ position: 'absolute', inset: 0, margin: 'auto', width: 22, height: 22, color: '#22d3ee' }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#f1f5f9', letterSpacing: '0.5px' }}>
                  TERRA
                </span>
                <span style={{
                  padding: '1px 7px', borderRadius: '99px',
                  background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)',
                  fontSize: '9px', fontFamily: 'monospace', color: '#67e8f9', letterSpacing: '1px',
                }}>
                  EARTH INTELLIGENCE
                </span>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#10b981',
                  boxShadow: '0 0 6px #10b981', display: 'inline-block',
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: '2px' }}>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data?.name || (isLoading ? 'Locating Target...' : 'Surface Location')}
                </span>
                {data?.country && data.country !== data.name && data.country !== 'Earth Coordinates' && (
                  <span style={{ fontSize: '10px', color: '#94a3b8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    • {data.country}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {data && (
              <button
                onClick={() => onZoomIn(data.latitude, data.longitude)}
                title="Fly camera to spot"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '5px', borderRadius: '8px' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              >
                <ZoomIn size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '5px', borderRadius: '8px' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Loading State ─────────────────────────────────────────── */}
        {!data && isLoading ? (
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'monospace' }}>
            {[0.75, 1, 0.6, 0.85, 0.5].map((w, i) => (
              <div key={i} style={{
                height: i === 1 || i === 3 ? 52 : 16,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                width: `${w * 100}%`,
                animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite alternate`,
              }} />
            ))}
            <div style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginTop: 8 }}>
              Querying geospatial feeds, meteorology & CelesTrak TLEs...
            </div>
          </div>
        ) : data ? (
          <div
            className="terra-scroll"
            style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {/* Live Telemetry Progress Banner when fetching background feeds */}
            {isLoading && (
              <div style={{
                padding: '7px 11px',
                borderRadius: '10px',
                background: 'linear-gradient(90deg, rgba(6,182,212,0.12) 0%, rgba(99,102,241,0.08) 100%)',
                border: '1px solid rgba(6,182,212,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#67e8f9',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', display: 'inline-block', boxShadow: '0 0 6px #22d3ee' }} />
                  Target locked · Stream synchronizing...
                </span>
                <span style={{ color: '#38bdf8', fontSize: '9px', fontWeight: 700 }}>LIVE</span>
              </div>
            )}

            {/* ── TERRA AI Summary Card ───────────────────────────── */}
            <div style={{
              padding: '13px 14px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.07) 0%, rgba(15,23,42,0.9) 100%)',
              border: '1px solid rgba(6,182,212,0.18)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Crosshair size={11} color="#22d3ee" className="terra-crosshair" />
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#22d3ee', letterSpacing: '1.5px', fontWeight: 600 }}>
                  TERRA INTELLIGENCE BRIEF
                </span>
              </div>
              <p style={{ fontSize: '12px', lineHeight: '1.7', color: '#94a3b8', margin: 0 }}>
                {terraSummary}
              </p>
            </div>

            {/* ── Coordinates ─────────────────────────────────────── */}
            <div style={{
              padding: '11px 13px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Compass size={11} color="#22d3ee" /> TARGET POSITION
                </span>
                <button
                  onClick={handleCopy}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontFamily: 'monospace', color: copied ? '#10b981' : '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#38bdf8', letterSpacing: '0.2px', marginBottom: 4 }}>
                {data.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: '#cbd5e1', marginBottom: 6 }}>
                <MapPin size={11} color="#f43f5e" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.display_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#67e8f9', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 6px', borderRadius: '4px' }}>
                  {data.coordinate_label}
                </span>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>
                  Region: <strong style={{ color: '#cbd5e1' }}>{data.region || data.country}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: '10px', fontFamily: 'monospace', color: '#475569' }}>
                <span>Country: <strong style={{ color: '#94a3b8' }}>{data.country}</strong></span>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {data.elevation_m != null && (
                    <span style={{
                      padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600,
                      background: 'rgba(56,189,248,0.1)', color: '#38bdf8',
                      border: '1px solid rgba(56,189,248,0.25)',
                    }}>
                      {data.elevation_m}m MSL
                    </span>
                  )}
                  <span style={{
                    padding: '1px 8px', borderRadius: '99px', fontSize: '9px', fontWeight: 600,
                    background: data.is_maritime ? 'rgba(6,182,212,0.12)' : 'rgba(16,185,129,0.12)',
                    color: data.is_maritime ? '#67e8f9' : '#6ee7b7',
                    border: `1px solid ${data.is_maritime ? 'rgba(6,182,212,0.25)' : 'rgba(16,185,129,0.25)'}`,
                  }}>
                    {data.terrain_type}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Risk Level ──────────────────────────────────────── */}
            <div style={{
              padding: '11px 13px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
              className={`border ${getRiskBg(data.risk_level)}`}
            >
              <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShieldAlert size={11} color="#f43f5e" /> ENVIRONMENTAL RISK
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span className={`w-2 h-2 rounded-full ${getRiskDot(data.risk_level)}`}
                  style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%' }} />
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}
                  className={getRiskColor(data.risk_level)}>
                  {data.risk_level.toUpperCase()}
                </span>
              </div>
            </div>

            {/* ── Weather Card ────────────────────────────────────── */}
            {activeWeather && activeWeather.temperature_c != null ? (
              <div style={{
                padding: '13px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(2,8,23,0.8) 100%)',
                border: '1px solid rgba(251,191,36,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CloudSun size={11} color="#fbbf24" /> ATMOSPHERIC CONDITIONS
                  </span>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#10b981', fontWeight: 600 }}>● OPEN-METEO LIVE</span>
                </div>

                {/* Temp hero */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: '28px', fontWeight: 900, color: '#f1f5f9', fontFamily: 'monospace', lineHeight: 1 }}>
                      {activeWeather.temperature_c}°
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      C (feels {activeWeather.apparent_temperature_c ?? activeWeather.temperature_c}°)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '20px' }}>{activeWeather.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#7dd3fc' }}>
                      {activeWeather.condition || 'Atmospheric telemetry'}
                    </span>
                  </div>
                </div>

                {/* Grid metrics */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 8, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {[
                    { icon: <Wind size={12} color="#38bdf8" />, label: 'Wind', val: `${activeWeather.wind_speed_kmh ?? 0} km/h` },
                    { icon: <Droplets size={12} color="#22d3ee" />, label: 'Humidity', val: `${activeWeather.humidity_percent ?? 0}%` },
                    { icon: <Gauge size={12} color="#818cf8" />, label: 'Pressure', val: `${activeWeather.pressure_hpa ?? 1013} hPa` },
                    { icon: <Eye size={12} color="#a78bfa" />, label: 'Visibility', val: `${activeWeather.visibility_km ?? '—'} km` },
                    { icon: <Thermometer size={12} color="#fb923c" />, label: 'Dew Pt', val: `${activeWeather.dew_point_c ?? '—'}°C` },
                    { icon: <Radio size={12} color="#34d399" />, label: 'Clouds', val: `${activeWeather.cloud_cover_pct ?? 0}%` },
                  ].map(({ icon, label, val }, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {icon}
                      <div>
                        <div style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{label}</div>
                        <div style={{ fontSize: '10px', color: '#cbd5e1', fontFamily: 'monospace', fontWeight: 600 }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : isLoading ? (
              <div style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(15,23,42,0.6)',
                border: '1px dashed rgba(251,191,36,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <Loader2 size={16} className="animate-spin text-amber-400" />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#f1f5f9' }}>Acquiring Live Atmospheric Telemetry...</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Open-Meteo satellite weather radar sync</div>
                </div>
              </div>
            ) : null}

            {/* ── Satellite Overpass ──────────────────────────────── */}
            {data.next_overpass && (
              <div style={{
                padding: '13px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(99,102,241,0.06) 100%)',
                border: '1px solid rgba(14,165,233,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#38bdf8', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                    <SatelliteIcon size={11} /> NEXT SATELLITE OVERPASS
                  </span>
                  <span style={{
                    padding: '1px 6px', borderRadius: '99px',
                    background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)',
                    fontSize: '8px', fontFamily: 'monospace', color: '#38bdf8',
                  }}>SGP4</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                      {data.next_overpass.satellite_name}
                      <span style={{ fontSize: '10px', color: '#475569', fontWeight: 400, marginLeft: 5 }}>
                        ({data.next_overpass.operator})
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: 2 }}>
                      Sensor: <span style={{ color: '#67e8f9' }}>{data.next_overpass.sensor_type}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#22d3ee' }}>
                      {data.next_overpass.minutes_until_pass < 60
                        ? `~${data.next_overpass.minutes_until_pass}m`
                        : `~${Math.floor(data.next_overpass.minutes_until_pass / 60)}h ${data.next_overpass.minutes_until_pass % 60}m`}
                    </div>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569' }}>until pass</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '10px', fontFamily: 'monospace',
                }}>
                  <span style={{ color: '#475569' }}>
                    Approach: <strong style={{ color: '#94a3b8' }}>{data.next_overpass.closest_approach_km} km</strong>
                  </span>
                  {data.next_overpass.is_within_swath ? (
                    <span style={{ color: '#10b981', fontWeight: 700 }}>✓ IN DIRECT SWATH</span>
                  ) : (
                    <span style={{ color: '#475569' }}>Off-Nadir</span>
                  )}
                </div>
              </div>
            )}

            {/* ── Air Quality Card ─────────────────────────────────── */}
            {(data as any).air_quality && (
              <div style={{
                padding: '13px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(2,8,23,0.8) 100%)',
                border: '1px solid rgba(167,139,250,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Wind size={11} color="#a78bfa" /> AIR QUALITY
                  </span>
                  <span style={{
                    padding: '1px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700,
                    fontFamily: 'monospace',
                    color: (data as any).air_quality.aqi_color === 'green' ? '#34d399'
                         : (data as any).air_quality.aqi_color === 'yellow' ? '#fbbf24'
                         : (data as any).air_quality.aqi_color === 'orange' ? '#fb923c'
                         : '#f87171',
                  }}>
                    {(data as any).air_quality.aqi_label?.toUpperCase()}
                  </span>
                </div>

                {/* AQI hero */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'monospace', color: '#f1f5f9', lineHeight: 1 }}>
                    {(data as any).air_quality.european_aqi}
                  </span>
                  <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>EU AQI</span>
                  {(data as any).air_quality.us_aqi != null && (
                    <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace', marginLeft: 8 }}>
                      US AQI: <strong style={{ color: '#94a3b8' }}>{(data as any).air_quality.us_aqi}</strong>
                    </span>
                  )}
                </div>

                {/* Pollutant grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { label: 'PM2.5', val: (data as any).air_quality.pm2_5_ugm3, unit: 'μg/m³' },
                    { label: 'PM10',  val: (data as any).air_quality.pm10_ugm3,  unit: 'μg/m³' },
                    { label: 'NO₂',   val: (data as any).air_quality.nitrogen_dioxide_ugm3, unit: 'μg/m³' },
                    { label: 'O₃',    val: (data as any).air_quality.ozone_ugm3, unit: 'μg/m³' },
                    { label: 'CO',    val: (data as any).air_quality.carbon_monoxide_ugm3, unit: 'μg/m³' },
                    { label: 'SO₂',   val: (data as any).air_quality.sulphur_dioxide_ugm3, unit: 'μg/m³' },
                  ].filter(p => p.val != null).map(({ label, val, unit }) => (
                    <div key={label} style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                      <span style={{ color: '#475569' }}>{label} </span>
                      <strong style={{ color: '#c4b5fd' }}>{typeof val === 'number' ? val.toFixed(1) : val}</strong>
                      <span style={{ color: '#334155', fontSize: '9px' }}> {unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Solar Astronomy & Timezone Card ─────────────────── */}
            {data.solar_ephemeris && (
              <div style={{
                padding: '13px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(2,8,23,0.8) 100%)',
                border: '1px solid rgba(245,158,11,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#fbbf24', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                    {data.solar_ephemeris.is_daylight ? <Sun size={11} color="#fbbf24" /> : <Moon size={11} color="#38bdf8" />}
                    SOLAR EPHEMERIS & ASTRONOMY
                  </span>
                  <span style={{
                    padding: '1px 7px', borderRadius: '99px', fontSize: '9px', fontWeight: 600,
                    background: data.solar_ephemeris.is_daylight ? 'rgba(245,158,11,0.15)' : 'rgba(56,189,248,0.15)',
                    color: data.solar_ephemeris.is_daylight ? '#fbbf24' : '#38bdf8',
                    fontFamily: 'monospace',
                  }}>
                    {data.solar_ephemeris.solar_phase?.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>LOCAL TIMEZONE</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>
                      {data.solar_ephemeris.timezone} <span style={{ color: '#94a3b8', fontSize: '10px' }}>(UTC {data.solar_ephemeris.utc_offset_hours >= 0 ? `+${data.solar_ephemeris.utc_offset_hours}` : data.solar_ephemeris.utc_offset_hours}h)</span>
                    </div>
                  </div>
                  {data.solar_ephemeris.uv_index_max != null && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>PEAK UV</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                        {data.solar_ephemeris.uv_index_max}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>SUNRISE</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#fed7aa', fontFamily: 'monospace' }}>
                      {data.solar_ephemeris.sunrise || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>SUNSET</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#fed7aa', fontFamily: 'monospace' }}>
                      {data.solar_ephemeris.sunset || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>DAYLIGHT</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#fed7aa', fontFamily: 'monospace' }}>
                      {data.solar_ephemeris.daylight_duration_hours ? `${data.solar_ephemeris.daylight_duration_hours}h` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Marine Hydrodynamics Card ────────────────────────── */}
            {data.marine_conditions && (
              <div style={{
                padding: '13px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(15,23,42,0.95) 100%)',
                border: '1px solid rgba(6,182,212,0.22)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#22d3ee', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                    <Waves size={11} color="#22d3ee" /> OCEAN HYDRODYNAMICS
                  </span>
                  <span style={{
                    padding: '1px 7px', borderRadius: '99px', fontSize: '9px', fontWeight: 600,
                    background: 'rgba(6,182,212,0.15)', color: '#67e8f9', fontFamily: 'monospace',
                  }}>
                    {data.marine_conditions.sea_state}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'monospace', color: '#67e8f9', lineHeight: 1 }}>
                    {data.marine_conditions.wave_height_m}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>meters wave height</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>PERIOD</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#a5f3fc', fontFamily: 'monospace' }}>
                      {data.marine_conditions.wave_period_s ? `${data.marine_conditions.wave_period_s}s` : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>DIRECTION</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#a5f3fc', fontFamily: 'monospace' }}>
                      {data.marine_conditions.wave_direction_deg ? `${data.marine_conditions.wave_direction_deg}°` : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '8px', color: '#475569', fontFamily: 'monospace' }}>SWELL</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#a5f3fc', fontFamily: 'monospace' }}>
                      {data.marine_conditions.swell_wave_height_m ? `${data.marine_conditions.swell_wave_height_m}m` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── USGS Live Seismics & Recent Earthquakes Card ──────── */}
            {data.usgs_earthquakes && data.usgs_earthquakes.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#10b981', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                    <Mountain size={11} color="#10b981" /> USGS REAL-TIME SEISMIC FEED
                  </span>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569' }}>
                    {data.usgs_earthquakes.length} within 1,000 km
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {data.usgs_earthquakes.map((q) => (
                    <div key={q.id} style={{
                      padding: '9px 11px',
                      borderRadius: '10px',
                      background: 'rgba(16,185,129,0.06)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#a7f3d0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.title}
                        </div>
                        <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#047857', marginTop: 1 }}>
                          Depth: {q.depth_km} km · USGS Live Network
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                          {Math.round(q.distance_km)} km
                        </div>
                        <div style={{ fontSize: '8px', fontFamily: 'monospace', color: '#475569' }}>away</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Wikipedia Landmark & Context Card ────────────────── */}
            {data.wikipedia_info && (
              <div style={{
                padding: '13px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(15,23,42,0.95) 100%)',
                border: '1px solid rgba(99,102,241,0.22)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#818cf8', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                    <BookOpen size={11} color="#818cf8" /> WIKIPEDIA GEOGRAPHICAL CONTEXT
                  </span>
                  {data.wikipedia_info.url && (
                    <a
                      href={data.wikipedia_info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '9px', fontFamily: 'monospace', color: '#a5b4fc', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      Read <ExternalLink size={9} />
                    </a>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {data.wikipedia_info.thumbnail && (
                    <img
                      src={data.wikipedia_info.thumbnail}
                      alt={data.wikipedia_info.title}
                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                      {data.wikipedia_info.title}
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
                        ({data.wikipedia_info.distance_km} km away)
                      </span>
                    </div>
                    {data.wikipedia_info.description && (
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', marginBottom: 4 }}>
                        {data.wikipedia_info.description}
                      </div>
                    )}
                    {data.wikipedia_info.extract && (
                      <p style={{ fontSize: '11px', lineHeight: 1.5, color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {data.wikipedia_info.extract}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── NASA EONET Live Events ───────────────────────────── */}
            {(data as any).nasa_events && (data as any).nasa_events.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#f97316', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                    <Flame size={11} color="#f97316" /> NASA EONET LIVE EVENTS
                  </span>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569' }}>
                    {(data as any).nasa_events.length} detected
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(data as any).nasa_events.map((ev: any) => (
                    <div key={ev.id} style={{
                      padding: '9px 11px',
                      borderRadius: '10px',
                      background: 'rgba(249,115,22,0.06)',
                      border: '1px solid rgba(249,115,22,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#fed7aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.title}
                        </div>
                        <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#78350f', marginTop: 1 }}>
                          {ev.category} · NASA EONET
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#fb923c' }}>
                          {Math.round(ev.distance_km)} km
                        </div>
                        <div style={{ fontSize: '8px', fontFamily: 'monospace', color: '#475569' }}>away</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Nearby Hazard Events ────────────────────────────── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ShieldAlert size={11} color="#f43f5e" /> REGIONAL HAZARD FOOTPRINT
                </span>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569' }}>
                  {data.nearby_events.length} in range
                </span>
              </div>

              {data.nearby_events.length === 0 ? (
                <div style={{
                  padding: '12px', borderRadius: '12px',
                  background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
                  textAlign: 'center', fontSize: '11px', color: '#34d399', fontFamily: 'monospace',
                }}>
                  ✅ No active disaster zones within 2,500 km
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.nearby_events.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent(ev as any)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.18s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)';
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        {getHazardIcon(ev.type)}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.title}
                          </div>
                          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569', textTransform: 'capitalize' }}>
                            {ev.type} · {ev.severity}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                          {Math.round(ev.distance_km)} km
                        </div>
                        <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569' }}>away</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Connected Live APIs Footer ──────────────────────── */}
            <div style={{
              padding: '9px 11px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ fontSize: '8px', fontFamily: 'monospace', color: '#475569', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                ACTIVE GEOSPATIAL INTELLIGENCE PIPELINE:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[
                  { name: 'Open-Meteo Weather', color: '#fbbf24' },
                  { name: 'Atmospheric AQI', color: '#c084fc' },
                  { name: 'SRTM 90m DEM', color: '#38bdf8' },
                  { name: 'Marine Wave Model', color: '#22d3ee' },
                  { name: 'USGS Seismology', color: '#34d399' },
                  { name: 'NASA EONET v3', color: '#fb923c' },
                  { name: 'CelesTrak SGP4', color: '#818cf8' },
                  { name: 'Wikimedia Geo', color: '#93c5fd' },
                  { name: 'OSM Nominatim', color: '#94a3b8' },
                ].map((src) => (
                  <span key={src.name} style={{
                    fontSize: '8px',
                    fontFamily: 'monospace',
                    color: src.color,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}>
                    {src.name}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Action Buttons ──────────────────────────────────── */}
            <div style={{
              paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', gap: 7,
            }}>
              <button
                onClick={() => onSimulateAtSpot(data.latitude, data.longitude, data.name)}
                style={{
                  width: '100%', padding: '9px 14px',
                  borderRadius: '12px',
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  color: '#fbbf24', fontFamily: 'monospace', fontSize: '11px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(245,158,11,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(245,158,11,0.1)'; }}
              >
                <FlaskConical size={13} />
                Simulate Hazard Incident Here
              </button>

              <button
                onClick={() => onAskAIAboutSpot(data.name, data.latitude, data.longitude)}
                style={{
                  width: '100%', padding: '9px 14px',
                  borderRadius: '12px',
                  background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
                  color: '#c4b5fd', fontFamily: 'monospace', fontSize: '11px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'all 0.2s',
                }}
              >
                <Bot size={13} />
                Ask AI Analyst About Region
              </button>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '100%', padding: '9px 14px',
                  borderRadius: '12px',
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                  color: '#60a5fa', fontFamily: 'monospace', fontSize: '11px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  textDecoration: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                }}
                onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(59,130,246,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(59,130,246,0.1)'; }}
              >
                <ExternalLink size={13} />
                Explore on Google Maps
              </a>
            </div>

          </div>
        ) : null}
      </div>
    </>
  );
};
