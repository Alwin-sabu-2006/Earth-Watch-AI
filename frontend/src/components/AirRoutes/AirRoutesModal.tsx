import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Plane, Navigation, RefreshCw, Globe, BarChart3,
  AlertTriangle, MapPin, Clock, Activity, TrendingUp,
  Radio, Shield, Zap, Wind, ArrowUpRight
} from 'lucide-react';

interface AirRoutesModalProps {
  onClose: () => void;
  onFlyTo?: (lat: number, lon: number, alt: number) => void;
}

interface FlightData {
  icao24: string;
  callsign: string;
  airline: string;
  origin: string;
  destination: string;
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  heading: number;
  aircraft: string;
  status: 'en-route' | 'climbing' | 'descending' | 'holding';
  flag: string;
}

interface AirCorridor {
  id: string;
  name: string;
  region: string;
  type: string;
  dailyFlights: number;
  passengersMil: number;
  status: 'open' | 'restricted' | 'notam' | 'closed';
  risk: 'low' | 'moderate' | 'high' | 'critical';
  lat: number;
  lon: number;
  description: string;
  altitudeRange: string;
  operators: string[];
}

const AIR_CORRIDORS: AirCorridor[] = [
  {
    id: 'north-atlantic',
    name: 'North Atlantic Tracks (NAT)',
    region: 'North Atlantic',
    type: 'NATS Organized Track System',
    dailyFlights: 1200,
    passengersMil: 78,
    status: 'open',
    risk: 'low',
    lat: 54.0,
    lon: -30.0,
    description: 'World\'s busiest oceanic airspace. Structured tracks shift daily based on jet stream. ~1,200 transatlantic flights daily.',
    altitudeRange: 'FL310–FL400',
    operators: ['FAA', 'NAVCANADA', 'NATS']
  },
  {
    id: 'ukraine-airspace',
    name: 'Eastern European Restricted Zone',
    region: 'Eastern Europe / Ukraine',
    type: 'Conflict Airspace',
    dailyFlights: 0,
    passengersMil: 0,
    status: 'closed',
    risk: 'critical',
    lat: 49.0,
    lon: 31.5,
    description: 'Ukrainian airspace closed since Feb 2022. Russian invasion created one of the largest airspace closures in aviation history, forcing rerouting over Poland/Romania.',
    altitudeRange: 'All altitudes',
    operators: ['EUROCONTROL']
  },
  {
    id: 'polar-routes',
    name: 'Polar Transpacific Routes',
    region: 'Arctic / North Pole',
    type: 'Polar Route System',
    dailyFlights: 150,
    passengersMil: 12,
    status: 'restricted',
    risk: 'moderate',
    lat: 88.0,
    lon: 0.0,
    description: 'Polar routes severely disrupted by Russian airspace closure. Flights must use Central Asian alternatives, adding 2-3hrs to Tokyo/Seoul routes.',
    altitudeRange: 'FL350–FL410',
    operators: ['FAA', 'CAA', 'CAAC']
  },
  {
    id: 'europe-asia',
    name: 'Europe–Asia Corridor',
    region: 'Central Asia / Middle East',
    type: 'Primary Trunk Route',
    dailyFlights: 680,
    passengersMil: 110,
    status: 'open',
    risk: 'moderate',
    lat: 40.0,
    lon: 55.0,
    description: 'Major Europe-Asia arteries via Turkey, Iran, Central Asian states. Russian closure forced southern diversions through these corridors.',
    altitudeRange: 'FL330–FL390',
    operators: ['EUROCONTROL', 'ICAO']
  },
  {
    id: 'pacific-tracks',
    name: 'Pacific Organized Tracks (PACOTS)',
    region: 'North Pacific',
    type: 'Organized Track System',
    dailyFlights: 450,
    passengersMil: 55,
    status: 'open',
    risk: 'low',
    lat: 45.0,
    lon: -155.0,
    description: 'Dynamic daily track system across North Pacific. Tracks shift with jet stream position for fuel efficiency on US-Asia routes.',
    altitudeRange: 'FL310–FL390',
    operators: ['FAA', 'JCAB']
  },
  {
    id: 'middle-east',
    name: 'Middle East Airspace Hub',
    region: 'Gulf / Middle East',
    type: 'Hub & Spoke Crossroads',
    dailyFlights: 3200,
    passengersMil: 140,
    status: 'notam',
    risk: 'moderate',
    lat: 25.0,
    lon: 51.0,
    description: 'UAE/Qatar mega-hub crossroads. NOTAMs active for Iranian-controlled airspace over Strait of Hormuz region. Emirates, Qatar Airways operate here.',
    altitudeRange: 'FL250–FL400',
    operators: ['GCAA', 'CAA Qatar', 'CAMA Iran']
  },
  {
    id: 'southeast-asia-hub',
    name: 'Southeast Asia Crossroads',
    region: 'ASEAN',
    type: 'Multi-FIR Convergence',
    dailyFlights: 2800,
    passengersMil: 135,
    status: 'open',
    risk: 'low',
    lat: 5.0,
    lon: 103.0,
    description: 'Singapore/Bangkok nexus for intra-Asia and intercontinental flights. One of the world\'s densest air traffic regions.',
    altitudeRange: 'All altitudes',
    operators: ['CAAS', 'AEROTHAI', 'DGCA']
  },
  {
    id: 'south-china-sea',
    name: 'South China Sea AOR',
    region: 'East Asia',
    type: 'Geopolitically Complex FIR',
    dailyFlights: 900,
    passengersMil: 45,
    status: 'notam',
    risk: 'high',
    lat: 15.0,
    lon: 113.0,
    description: 'Overlapping FIR claims between China, Vietnam, Philippines. China\'s ADIZ declarations create operational complexity for civilian aviation.',
    altitudeRange: 'FL250–FL400',
    operators: ['CAAC', 'VNAV', 'Manila FIR']
  },
  {
    id: 'africa-routes',
    name: 'Sub-Saharan Africa Corridor',
    region: 'Africa',
    type: 'Developing Route Network',
    dailyFlights: 380,
    passengersMil: 18,
    status: 'open',
    risk: 'moderate',
    lat: 5.0,
    lon: 20.0,
    description: 'Growing intra-Africa and Africa-Europe routes. Conflict zones in Sahel/Sudan force detours. Addis Ababa (Ethiopian) is key African hub.',
    altitudeRange: 'FL280–FL380',
    operators: ['ASECNA', 'ICAO AFI']
  },
  {
    id: 'latin-america',
    name: 'Latin America Air Bridges',
    region: 'South America',
    type: 'Continental Network',
    dailyFlights: 920,
    passengersMil: 48,
    status: 'open',
    risk: 'low',
    lat: -15.0,
    lon: -55.0,
    description: 'São Paulo/Bogotá hubs connecting North-South America and transatlantic services. LATAM operates major trunk routes here.',
    altitudeRange: 'FL300–FL390',
    operators: ['ANAC Brazil', 'FAA Colombia', 'DGAC']
  },
];

const generateLiveFlights = (): FlightData[] => [
  { icao24: 'a820e6', callsign: 'UAE101', airline: 'Emirates', origin: 'DXB', destination: 'JFK', lat: 54.2, lon: -25.1, altitude: 37000, speed: 548, heading: 315, aircraft: 'A380', status: 'en-route', flag: '🇦🇪' },
  { icao24: '3c675a', callsign: 'DLH400', airline: 'Lufthansa', origin: 'FRA', destination: 'LAX', lat: 48.3, lon: -42.2, altitude: 39000, speed: 562, heading: 285, aircraft: 'A350', status: 'en-route', flag: '🇩🇪' },
  { icao24: '400f86', callsign: 'BAW175', airline: 'British Airways', origin: 'LHR', destination: 'SFO', lat: 56.1, lon: -15.8, altitude: 36000, speed: 531, heading: 292, aircraft: 'B777', status: 'en-route', flag: '🇬🇧' },
  { icao24: '71be12', callsign: 'SIA21', airline: 'Singapore Airlines', origin: 'SIN', destination: 'LHR', lat: 38.7, lon: 62.5, altitude: 41000, speed: 577, heading: 300, aircraft: 'A350ULR', status: 'en-route', flag: '🇸🇬' },
  { icao24: '780a20', callsign: 'CPA253', airline: 'Cathay Pacific', origin: 'HKG', destination: 'ORD', lat: 55.9, lon: -168.2, altitude: 38000, speed: 545, heading: 70, aircraft: 'B777', status: 'en-route', flag: '🇭🇰' },
  { icao24: 'aab0b1', callsign: 'AAL100', airline: 'American Airlines', origin: 'JFK', destination: 'LHR', lat: 51.2, lon: -28.4, altitude: 37000, speed: 550, heading: 55, aircraft: 'B777', status: 'en-route', flag: '🇺🇸' },
  { icao24: 'c060a1', callsign: 'ACA858', airline: 'Air Canada', origin: 'YYZ', destination: 'NRT', lat: 66.8, lon: -140.2, altitude: 40000, speed: 538, heading: 325, aircraft: 'B787', status: 'en-route', flag: '🇨🇦' },
  { icao24: '899100', callsign: 'QTR9', airline: 'Qatar Airways', origin: 'DOH', destination: 'SYD', lat: 3.2, lon: 95.8, altitude: 39000, speed: 565, heading: 135, aircraft: 'A350', status: 'en-route', flag: '🇶🇦' },
  { icao24: '461f26', callsign: 'KLM691', airline: 'KLM', origin: 'AMS', destination: 'NBO', lat: 12.5, lon: 22.1, altitude: 37000, speed: 520, heading: 155, aircraft: 'B787', status: 'en-route', flag: '🇳🇱' },
  { icao24: '86070b', callsign: 'JAL7', airline: 'Japan Airlines', origin: 'NRT', destination: 'LHR', lat: 60.2, lon: -10.5, altitude: 38000, speed: 558, heading: 350, aircraft: 'B787', status: 'en-route', flag: '🇯🇵' },
];

const RISK_CONFIG = {
  low: { color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40', dot: 'bg-emerald-400', label: 'LOW RISK' },
  moderate: { color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40', dot: 'bg-amber-400', label: 'MODERATE' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40', dot: 'bg-orange-400', label: 'HIGH RISK' },
  critical: { color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/40', dot: 'bg-rose-500 animate-pulse', label: 'CRITICAL' },
};

const STATUS_CONFIG = {
  open: { color: 'text-emerald-400', label: 'OPEN' },
  restricted: { color: 'text-amber-400', label: 'RESTRICTED' },
  notam: { color: 'text-orange-400', label: 'NOTAM ACTIVE' },
  closed: { color: 'text-rose-400', label: 'CLOSED' },
};

export const AirRoutesModal: React.FC<AirRoutesModalProps> = ({ onClose, onFlyTo }) => {
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [selectedCorridor, setSelectedCorridor] = useState<AirCorridor | null>(null);
  const [activeTab, setActiveTab] = useState<'corridors' | 'flights' | 'stats'>('corridors');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [filterRisk, setFilterRisk] = useState<string>('all');

  const loadFlights = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setFlights(generateLiveFlights());
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 600);
  }, []);

  useEffect(() => {
    loadFlights();
    const interval = setInterval(loadFlights, 20000);
    return () => clearInterval(interval);
  }, [loadFlights]);

  const filteredCorridors = filterRisk === 'all'
    ? AIR_CORRIDORS
    : AIR_CORRIDORS.filter(c => c.risk === filterRisk);

  const totalDailyFlights = AIR_CORRIDORS.reduce((s, c) => s + c.dailyFlights, 0);
  const totalPassengers = AIR_CORRIDORS.reduce((s, c) => s + c.passengersMil, 0);
  const highRiskCorridors = AIR_CORRIDORS.filter(c => c.risk === 'critical' || c.risk === 'high').length;
  const closedCorridors = AIR_CORRIDORS.filter(c => c.status === 'closed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[88vh] flex flex-col rounded-2xl border border-violet-500/30 bg-slate-950/95 shadow-2xl shadow-violet-500/10 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Gradient accent top border */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-violet-500/20 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wider text-white flex items-center gap-2">
                LIVE AIR ROUTES
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  ADS-B LIVE
                </span>
              </div>
              <div className="text-[10px] font-mono text-violet-400/80 tracking-widest">
                GLOBAL AVIATION INTELLIGENCE • {AIR_CORRIDORS.length} CORRIDORS • {flights.length} FLIGHTS TRACKED
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={loadFlights}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-violet-500/10 text-violet-400 transition-all border border-violet-500/30"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-700/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-violet-500/10 bg-slate-950/40">
          {[
            { icon: <Plane className="w-4 h-4 text-violet-400" />, label: 'Daily Flights', value: totalDailyFlights.toLocaleString(), color: 'text-violet-300' },
            { icon: <Activity className="w-4 h-4 text-sky-400" />, label: 'Passengers/Year (M)', value: totalPassengers.toFixed(0), color: 'text-sky-300' },
            { icon: <AlertTriangle className="w-4 h-4 text-rose-400" />, label: 'High Risk Zones', value: highRiskCorridors.toString(), color: 'text-rose-300' },
            { icon: <Shield className="w-4 h-4 text-orange-400" />, label: 'Closed Airspaces', value: closedCorridors.toString(), color: 'text-orange-300' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
              {stat.icon}
              <div>
                <div className={`text-sm font-bold font-mono ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-violet-500/10">
          {[
            { id: 'corridors', label: 'Air Corridors', icon: <Navigation className="w-3.5 h-3.5" /> },
            { id: 'flights', label: 'Live Flights', icon: <Plane className="w-3.5 h-3.5" /> },
            { id: 'stats', label: 'Route Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

          {activeTab === 'corridors' && (
            <div className="ml-auto flex items-center gap-1">
              {(['all', 'critical', 'high', 'moderate', 'low'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRisk(r)}
                  className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-all ${
                    filterRisk === r
                      ? 'bg-violet-500/30 text-violet-200 font-bold'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {r === 'all' ? 'All' : r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Air Corridors Tab */}
          {activeTab === 'corridors' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4">
              {filteredCorridors.map((corridor) => {
                const risk = RISK_CONFIG[corridor.risk];
                const status = STATUS_CONFIG[corridor.status];
                const isSelected = selectedCorridor?.id === corridor.id;
                return (
                  <div
                    key={corridor.id}
                    onClick={() => {
                      setSelectedCorridor(isSelected ? null : corridor);
                      if (!isSelected && onFlyTo) onFlyTo(corridor.lat, corridor.lon, 3000000);
                    }}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all group hover:scale-[1.01] ${
                      isSelected
                        ? 'bg-violet-500/10 border-violet-400/60 shadow-lg shadow-violet-500/10'
                        : 'bg-slate-900/60 border-slate-800/60 hover:border-violet-500/30 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${risk.dot}`} />
                        <span className="font-bold text-sm text-white leading-tight">{corridor.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${risk.bg} ${risk.color}`}>
                          {risk.label}
                        </span>
                        <span className={`text-[9px] font-mono ${status.color}`}>{status.label}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-violet-400/80 font-mono mb-2 uppercase tracking-wider">
                      {corridor.region} • {corridor.type}
                    </div>

                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">{corridor.description}</p>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="text-center">
                        <div className="text-sm font-bold text-violet-300 font-mono">
                          {corridor.dailyFlights > 0 ? corridor.dailyFlights.toLocaleString() : 'CLOSED'}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase">Flights/Day</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-sky-300 font-mono">
                          {corridor.passengersMil > 0 ? `${corridor.passengersMil}M` : '—'}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase">Pax/Year</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-slate-300 font-mono text-[10px]">{corridor.altitudeRange}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Altitude</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {corridor.operators.map((op) => (
                        <span key={op} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-mono">{op}</span>
                      ))}
                    </div>

                    {onFlyTo && (
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MapPin className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Live Flights Tab */}
          {activeTab === 'flights' && (
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-mono text-slate-400">
                <Radio className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                <span>ADS-B transponder data — {flights.length} long-haul flights tracked in key corridors</span>
              </div>
              <div className="space-y-2">
                {flights.map((flight) => (
                  <div
                    key={flight.icao24}
                    onClick={() => onFlyTo && onFlyTo(flight.lat, flight.lon, 1500000)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-violet-500/30 hover:bg-slate-900/80 cursor-pointer transition-all group"
                  >
                    <div className="text-2xl">{flight.flag}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-white font-mono">{flight.callsign}</span>
                        <span className="text-[10px] font-mono text-slate-400">{flight.airline}</span>
                        <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[9px] font-mono">{flight.aircraft}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ICAO: {flight.icao24} •
                        {Math.abs(flight.lat).toFixed(1)}°{flight.lat >= 0 ? 'N' : 'S'}, {Math.abs(flight.lon).toFixed(1)}°{flight.lon >= 0 ? 'E' : 'W'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sky-300 font-mono text-xs">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      {flight.origin}
                    </div>
                    <div className="text-slate-500 text-xs">→</div>
                    <div className="text-xs font-mono text-violet-300">{flight.destination}</div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-emerald-300">{flight.altitude.toLocaleString()} ft</div>
                      <div className="text-[10px] text-slate-500">{flight.speed} kts / HDG {flight.heading}°</div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 group-hover:text-violet-300 transition-colors">
                      <Activity className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono uppercase">{flight.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-violet-950/30 border border-violet-500/20 text-[10px] text-violet-400/70 font-mono">
                ℹ Flight data is representative. In production, integrate OpenSky Network API, ADS-B Exchange, or FlightAware for real ADS-B transponder data.
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Risk Distribution */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-rose-400" />
                    Risk Distribution
                  </div>
                  {(['critical', 'high', 'moderate', 'low'] as const).map((r) => {
                    const count = AIR_CORRIDORS.filter(c => c.risk === r).length;
                    const pct = Math.round((count / AIR_CORRIDORS.length) * 100);
                    const cfg = RISK_CONFIG[r];
                    const barColor = r === 'critical' ? '#f43f5e' : r === 'high' ? '#fb923c' : r === 'moderate' ? '#fbbf24' : '#34d399';
                    return (
                      <div key={r} className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-mono w-20 ${cfg.color}`}>{cfg.label}</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 w-12 text-right">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>

                {/* Busiest Corridors */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                    Top Flight Volume
                  </div>
                  {[...AIR_CORRIDORS].sort((a, b) => b.dailyFlights - a.dailyFlights).slice(0, 6).map((c) => (
                    <div key={c.id} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] text-slate-400 truncate flex-1">{c.name.split(' ').slice(0, 3).join(' ')}</span>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-400"
                          style={{ width: `${Math.round((c.dailyFlights / 3200) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-violet-300 w-12 text-right">{c.dailyFlights.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Corridors by Traffic */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-violet-400" />
                  All Corridors — Daily Flight Volume
                </div>
                {[...AIR_CORRIDORS].sort((a, b) => b.dailyFlights - a.dailyFlights).map((corridor) => {
                  const risk = RISK_CONFIG[corridor.risk];
                  return (
                    <div key={corridor.id} className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${risk.dot}`} />
                      <span className="text-[11px] text-slate-300 w-48 truncate">{corridor.name}</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500 transition-all"
                          style={{ width: `${Math.round((corridor.dailyFlights / 3200) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-violet-300 w-16 text-right">
                        {corridor.dailyFlights > 0 ? `${corridor.dailyFlights.toLocaleString()}/day` : 'CLOSED'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Active disruption alerts */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-rose-300 mb-1">AIRSPACE CLOSED — UKRAINE</div>
                    <div className="text-[11px] text-slate-400">Ukrainian airspace closed since 24 Feb 2022. ~300 daily flights previously transited this airspace. Europe-Asia routes now add 3-5hrs via southern corridors.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-amber-300 mb-1">NOTAM — SOUTH CHINA SEA FIR</div>
                    <div className="text-[11px] text-slate-400">China ADIZ declarations and overlapping FIR claims create NOTAM complexity for civilian operations over Paracel/Spratly Island regions.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-orange-950/30 border border-orange-500/30">
                  <Wind className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-orange-300 mb-1">POLAR ROUTE DISRUPTION — NORTH PACIFIC</div>
                    <div className="text-[11px] text-slate-400">Russian airspace closure since 2022 has forced 100+ daily flights onto longer Pacific or Central Asian routes, adding $200K+ fuel cost per long-haul flight.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
