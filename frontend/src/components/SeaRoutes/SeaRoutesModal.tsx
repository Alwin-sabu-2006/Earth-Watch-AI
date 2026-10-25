import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Ship, Anchor, Navigation, RefreshCw, Waves, AlertTriangle,
  Globe, BarChart3, Eye, MapPin, Clock, Activity, TrendingUp,
  ChevronRight, Radio, Shield, Zap
} from 'lucide-react';

interface SeaRoutesModalProps {
  onClose: () => void;
  onFlyTo?: (lat: number, lon: number, alt: number) => void;
}

interface VesselData {
  mmsi: string;
  name: string;
  type: string;
  flag: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  destination: string;
  status: string;
  length?: number;
  draught?: number;
  eta?: string;
}

interface SeaLane {
  id: string;
  name: string;
  region: string;
  type: string;
  dailyVessels: number;
  oilTransitMbpd: number;
  status: 'open' | 'restricted' | 'closed' | 'monitored';
  threat: 'low' | 'moderate' | 'high' | 'critical';
  lat: number;
  lon: number;
  description: string;
  commodities: string[];
}

const SEA_LANES: SeaLane[] = [
  {
    id: 'strait-malacca',
    name: 'Strait of Malacca',
    region: 'Southeast Asia',
    type: 'Strait',
    dailyVessels: 290,
    oilTransitMbpd: 16.0,
    status: 'open',
    threat: 'moderate',
    lat: 2.5,
    lon: 101.5,
    description: 'World\'s busiest strait connecting Indian Ocean to Pacific. 40% of global trade transits here.',
    commodities: ['Oil', 'LNG', 'Container', 'Bulk']
  },
  {
    id: 'suez-canal',
    name: 'Suez Canal',
    region: 'Middle East / Egypt',
    type: 'Canal',
    dailyVessels: 51,
    oilTransitMbpd: 5.5,
    status: 'monitored',
    threat: 'high',
    lat: 30.7,
    lon: 32.3,
    description: 'Critical Red Sea-Mediterranean link. Houthi threat has rerouted significant tonnage around Cape of Good Hope.',
    commodities: ['Oil', 'Container', 'LNG', 'Bulk']
  },
  {
    id: 'hormuz',
    name: 'Strait of Hormuz',
    region: 'Persian Gulf',
    type: 'Strait',
    dailyVessels: 35,
    oilTransitMbpd: 21.0,
    status: 'monitored',
    threat: 'high',
    lat: 26.5,
    lon: 56.2,
    description: 'World\'s most critical energy chokepoint. ~21 million bpd oil passes through here daily.',
    commodities: ['Oil', 'LNG', 'Petrochemicals']
  },
  {
    id: 'bab-el-mandeb',
    name: 'Bab-el-Mandeb',
    region: 'Red Sea',
    type: 'Strait',
    dailyVessels: 48,
    oilTransitMbpd: 6.2,
    status: 'restricted',
    threat: 'critical',
    lat: 12.6,
    lon: 43.3,
    description: 'Red Sea gateway under active Houthi threat. Major rerouting underway via Cape of Good Hope.',
    commodities: ['Oil', 'Container', 'LNG']
  },
  {
    id: 'panama-canal',
    name: 'Panama Canal',
    region: 'Central America',
    type: 'Canal',
    dailyVessels: 40,
    oilTransitMbpd: 0.9,
    status: 'open',
    threat: 'low',
    lat: 9.1,
    lon: -79.7,
    description: 'Atlantic-Pacific connector. Drought-induced water level concerns reduced traffic in 2024.',
    commodities: ['Container', 'Bulk', 'LNG', 'Vehicles']
  },
  {
    id: 'cape-of-good-hope',
    name: 'Cape of Good Hope',
    region: 'Southern Africa',
    type: 'Route',
    dailyVessels: 85,
    oilTransitMbpd: 3.1,
    status: 'open',
    threat: 'low',
    lat: -34.4,
    lon: 18.5,
    description: 'Red Sea alternative route. Traffic surged +65% due to Houthi-related Suez diversions.',
    commodities: ['Oil', 'Container', 'LNG', 'Bulk']
  },
  {
    id: 'danish-straits',
    name: 'Danish Straits',
    region: 'Northern Europe',
    type: 'Strait',
    dailyVessels: 160,
    oilTransitMbpd: 3.0,
    status: 'open',
    threat: 'low',
    lat: 56.0,
    lon: 10.5,
    description: 'Baltic Sea gateway connecting Scandinavian oil flows to North Sea and Atlantic markets.',
    commodities: ['Oil', 'LNG', 'Bulk', 'Container']
  },
  {
    id: 'gibraltar',
    name: 'Strait of Gibraltar',
    region: 'Mediterranean',
    type: 'Strait',
    dailyVessels: 110,
    oilTransitMbpd: 2.1,
    status: 'open',
    threat: 'low',
    lat: 35.95,
    lon: -5.45,
    description: 'Mediterranean-Atlantic gateway. Key link for European energy and container trade.',
    commodities: ['Oil', 'LNG', 'Container']
  },
  {
    id: 'taiwan-strait',
    name: 'Taiwan Strait',
    region: 'East Asia',
    type: 'Strait',
    dailyVessels: 250,
    oilTransitMbpd: 2.5,
    status: 'monitored',
    threat: 'moderate',
    lat: 24.5,
    lon: 119.5,
    description: 'Critical semiconductor supply chain corridor. Geopolitical tensions create strategic risk.',
    commodities: ['Container', 'Electronics', 'Oil', 'Bulk']
  },
  {
    id: 'arctic-route',
    name: 'Northern Sea Route',
    region: 'Arctic',
    type: 'Route',
    dailyVessels: 12,
    oilTransitMbpd: 0.4,
    status: 'open',
    threat: 'low',
    lat: 72.0,
    lon: 120.0,
    description: 'Ice-retreating Arctic corridor offering Europe-Asia shortcut. Russian-controlled passage.',
    commodities: ['LNG', 'Oil', 'Bulk', 'Container']
  },
  {
    id: 'lombok-strait',
    name: 'Lombok Strait',
    region: 'Indonesia',
    type: 'Strait',
    dailyVessels: 55,
    oilTransitMbpd: 1.8,
    status: 'open',
    threat: 'low',
    lat: -8.7,
    lon: 115.7,
    description: 'Malacca alternative used by VLCC tankers too large for Malacca. Growing strategic importance.',
    commodities: ['Oil', 'LNG', 'Bulk']
  },
  {
    id: 'bosphorus',
    name: 'Turkish Straits / Bosphorus',
    region: 'Black Sea',
    type: 'Strait',
    dailyVessels: 45,
    oilTransitMbpd: 2.9,
    status: 'monitored',
    threat: 'moderate',
    lat: 41.1,
    lon: 29.0,
    description: 'Black Sea-Mediterranean gateway. Critical for Russian, Kazakh, and Azeri oil exports.',
    commodities: ['Oil', 'Bulk', 'Container', 'LNG']
  },
];

// Simulate live vessel data (in production would call VesselFinder/MarineTraffic API)
const generateLiveVessels = (): VesselData[] => [
  { mmsi: '636020805', name: 'EVER ACE', type: 'Container Ship', flag: '🇱🇷', lat: 26.8, lon: 56.4, speed: 14.2, heading: 142, destination: 'SINGAPORE', status: 'Underway', length: 400, eta: '2026-10-22' },
  { mmsi: '477413200', name: 'PIONEER ISLE', type: 'VLCC Tanker', flag: '🇭🇰', lat: 26.2, lon: 56.1, speed: 11.5, heading: 220, destination: 'FUJAIRAH', status: 'Underway', length: 333, draught: 19.5 },
  { mmsi: '255805940', name: 'ATLANTIC VISION', type: 'LNG Carrier', flag: '🇵🇹', lat: 12.3, lon: 43.8, speed: 16.1, heading: 185, destination: 'ROTTERDAM', status: 'Underway', length: 295, eta: '2026-10-28' },
  { mmsi: '563085870', name: 'MSC DIANA', type: 'Container Ship', flag: '🇸🇬', lat: 2.3, lon: 101.8, speed: 18.4, heading: 95, destination: 'PORT KLANG', status: 'Underway', length: 366 },
  { mmsi: '311000129', name: 'BRITISH INTEGRITY', type: 'Oil Tanker', flag: '🇧🇸', lat: -33.9, lon: 18.4, speed: 13.2, heading: 330, destination: 'ANTWERP', status: 'Underway', length: 274, draught: 16.2 },
  { mmsi: '636017826', name: 'COSCO PRIDE', type: 'Bulk Carrier', flag: '🇱🇷', lat: 1.9, lon: 104.2, speed: 10.8, heading: 60, destination: 'DALIAN', status: 'Underway', length: 225 },
  { mmsi: '209182000', name: 'EURONIKE', type: 'Container Ship', flag: '🇨🇾', lat: 30.5, lon: 32.6, speed: 9.4, heading: 340, destination: 'PIRAEUS', status: 'Underway', length: 294 },
  { mmsi: '477395700', name: 'OCEANS NAVIGATOR', type: 'VLCC Tanker', flag: '🇭🇰', lat: 27.1, lon: 56.8, speed: 12.0, heading: 110, destination: 'NINGBO', status: 'Underway', length: 330 },
  { mmsi: '311000892', name: 'TEAL ARROW', type: 'LPG Carrier', flag: '🇧🇸', lat: 35.7, lon: -5.3, speed: 17.2, heading: 85, destination: 'BARCELONA', status: 'Underway', length: 180 },
  { mmsi: '219022000', name: 'MAERSK MCKINNEY', type: 'Container Ship', flag: '🇩🇰', lat: 9.3, lon: -79.5, speed: 7.8, heading: 290, destination: 'LOS ANGELES', status: 'Underway', length: 399 },
];

const VESSEL_TYPE_COLORS: Record<string, string> = {
  'Container Ship': 'text-sky-400',
  'VLCC Tanker': 'text-orange-400',
  'Oil Tanker': 'text-amber-400',
  'LNG Carrier': 'text-cyan-400',
  'LPG Carrier': 'text-teal-400',
  'Bulk Carrier': 'text-slate-400',
};

const THREAT_CONFIG = {
  low: { color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40', dot: 'bg-emerald-400', label: 'LOW THREAT' },
  moderate: { color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40', dot: 'bg-amber-400', label: 'MODERATE' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40', dot: 'bg-orange-400', label: 'HIGH THREAT' },
  critical: { color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/40', dot: 'bg-rose-500 animate-pulse', label: 'CRITICAL' },
};

const STATUS_CONFIG = {
  open: { color: 'text-emerald-400', label: 'OPEN' },
  restricted: { color: 'text-orange-400', label: 'RESTRICTED' },
  closed: { color: 'text-rose-400', label: 'CLOSED' },
  monitored: { color: 'text-amber-400', label: 'MONITORED' },
};

export const SeaRoutesModal: React.FC<SeaRoutesModalProps> = ({ onClose, onFlyTo }) => {
  const [vessels, setVessels] = useState<VesselData[]>([]);
  const [selectedLane, setSelectedLane] = useState<SeaLane | null>(null);
  const [activeTab, setActiveTab] = useState<'lanes' | 'vessels' | 'stats'>('lanes');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [filterThreat, setFilterThreat] = useState<string>('all');

  const loadVessels = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setVessels(generateLiveVessels());
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 800);
  }, []);

  useEffect(() => {
    loadVessels();
    const interval = setInterval(loadVessels, 30000);
    return () => clearInterval(interval);
  }, [loadVessels]);

  const filteredLanes = filterThreat === 'all'
    ? SEA_LANES
    : SEA_LANES.filter(l => l.threat === filterThreat);

  const totalDailyVessels = SEA_LANES.reduce((s, l) => s + l.dailyVessels, 0);
  const totalOilTransit = SEA_LANES.reduce((s, l) => s + l.oilTransitMbpd, 0);
  const criticalRoutes = SEA_LANES.filter(l => l.threat === 'critical' || l.threat === 'high').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[88vh] flex flex-col rounded-2xl border border-teal-500/30 bg-slate-950/95 shadow-2xl shadow-teal-500/10 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Gradient accent top border */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-teal-500/20 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Ship className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wider text-white flex items-center gap-2">
                LIVE SEA ROUTES
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  AIS LIVE
                </span>
              </div>
              <div className="text-[10px] font-mono text-teal-400/80 tracking-widest">
                GLOBAL MARITIME INTELLIGENCE • {SEA_LANES.length} ROUTES • {vessels.length} VESSELS TRACKED
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={loadVessels}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-teal-500/10 text-teal-400 transition-all border border-teal-500/30"
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
        <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-teal-500/10 bg-slate-950/40">
          {[
            { icon: <Ship className="w-4 h-4 text-teal-400" />, label: 'Daily Vessels', value: totalDailyVessels.toLocaleString(), color: 'text-teal-300' },
            { icon: <Activity className="w-4 h-4 text-orange-400" />, label: 'Oil Transit (Mbpd)', value: totalOilTransit.toFixed(1), color: 'text-orange-300' },
            { icon: <AlertTriangle className="w-4 h-4 text-rose-400" />, label: 'High/Critical Routes', value: criticalRoutes.toString(), color: 'text-rose-300' },
            { icon: <Globe className="w-4 h-4 text-sky-400" />, label: 'Routes Monitored', value: SEA_LANES.length.toString(), color: 'text-sky-300' },
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
        <div className="flex items-center gap-1 px-6 py-2 border-b border-teal-500/10">
          {[
            { id: 'lanes', label: 'Maritime Lanes', icon: <Navigation className="w-3.5 h-3.5" /> },
            { id: 'vessels', label: 'Live Vessels', icon: <Ship className="w-3.5 h-3.5" /> },
            { id: 'stats', label: 'Traffic Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

          {activeTab === 'lanes' && (
            <div className="ml-auto flex items-center gap-1">
              {(['all', 'critical', 'high', 'moderate', 'low'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterThreat(t)}
                  className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-all ${
                    filterThreat === t
                      ? 'bg-teal-500/30 text-teal-200 font-bold'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {t === 'all' ? 'All' : t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Maritime Lanes Tab */}
          {activeTab === 'lanes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4">
              {filteredLanes.map((lane) => {
                const threat = THREAT_CONFIG[lane.threat];
                const status = STATUS_CONFIG[lane.status];
                const isSelected = selectedLane?.id === lane.id;
                return (
                  <div
                    key={lane.id}
                    onClick={() => {
                      setSelectedLane(isSelected ? null : lane);
                      if (!isSelected && onFlyTo) onFlyTo(lane.lat, lane.lon, 800000);
                    }}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all group hover:scale-[1.01] ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-400/60 shadow-lg shadow-teal-500/10'
                        : 'bg-slate-900/60 border-slate-800/60 hover:border-teal-500/30 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${threat.dot}`} />
                        <span className="font-bold text-sm text-white">{lane.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${threat.bg} ${threat.color}`}>
                          {threat.label}
                        </span>
                        <span className={`text-[9px] font-mono ${status.color}`}>{status.label}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-teal-400/80 font-mono mb-2 uppercase tracking-wider">
                      {lane.region} • {lane.type}
                    </div>

                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">{lane.description}</p>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="text-center">
                        <div className="text-sm font-bold text-teal-300 font-mono">{lane.dailyVessels}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Vessels/Day</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-orange-300 font-mono">{lane.oilTransitMbpd}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Mbpd Oil</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-sky-300 font-mono">{lane.commodities.length}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Commodities</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {lane.commodities.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-mono">{c}</span>
                      ))}
                    </div>

                    {onFlyTo && (
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Live Vessels Tab */}
          {activeTab === 'vessels' && (
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-mono text-slate-400">
                <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                <span>AIS transponder data — {vessels.length} vessels in tracked corridors</span>
              </div>
              <div className="space-y-2">
                {vessels.map((vessel) => (
                  <div
                    key={vessel.mmsi}
                    onClick={() => onFlyTo && onFlyTo(vessel.lat, vessel.lon, 400000)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-teal-500/30 hover:bg-slate-900/80 cursor-pointer transition-all group"
                  >
                    <div className="text-2xl">{vessel.flag}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-white truncate">{vessel.name}</span>
                        <span className={`text-[10px] font-mono ${VESSEL_TYPE_COLORS[vessel.type] ?? 'text-slate-400'}`}>{vessel.type}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        MMSI: {vessel.mmsi} •
                        {vessel.lat.toFixed(2)}°{vessel.lat >= 0 ? 'N' : 'S'}, {Math.abs(vessel.lon).toFixed(2)}°{vessel.lon >= 0 ? 'E' : 'W'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-teal-300">{vessel.speed} kn</div>
                      <div className="text-[10px] text-slate-500">HDG {vessel.heading}°</div>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <div className="text-[10px] font-mono text-slate-300 truncate">→ {vessel.destination}</div>
                      {vessel.eta && <div className="text-[9px] text-slate-500">ETA {vessel.eta}</div>}
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 group-hover:text-teal-300 transition-colors">
                      <Activity className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono">LIVE</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-teal-950/30 border border-teal-500/20 text-[10px] text-teal-400/70 font-mono">
                ℹ AIS data is simulated for demonstration. In production, connect to MarineTraffic API, VesselFinder, or BarentsWatch for real-time transponder data.
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Threat Distribution */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-rose-400" />
                    Threat Distribution
                  </div>
                  {(['critical', 'high', 'moderate', 'low'] as const).map((t) => {
                    const count = SEA_LANES.filter(l => l.threat === t).length;
                    const pct = Math.round((count / SEA_LANES.length) * 100);
                    const cfg = THREAT_CONFIG[t];
                    return (
                      <div key={t} className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-mono w-16 ${cfg.color}`}>{cfg.label}</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cfg.dot.replace('animate-pulse', '')} bg-current transition-all`}
                            style={{ width: `${pct}%`, backgroundColor: t === 'critical' ? '#f43f5e' : t === 'high' ? '#fb923c' : t === 'moderate' ? '#fbbf24' : '#34d399' }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>

                {/* Top Oil Chokepoints */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                    Top Oil Transit (Mbpd)
                  </div>
                  {[...SEA_LANES].sort((a, b) => b.oilTransitMbpd - a.oilTransitMbpd).slice(0, 6).map((lane) => (
                    <div key={lane.id} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] text-slate-400 truncate flex-1">{lane.name}</span>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-orange-400"
                          style={{ width: `${Math.round((lane.oilTransitMbpd / 21) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-orange-300 w-8 text-right">{lane.oilTransitMbpd}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Busiest Routes by Vessel Count */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Ship className="w-3.5 h-3.5 text-teal-400" />
                  Busiest Routes by Daily Vessel Traffic
                </div>
                {[...SEA_LANES].sort((a, b) => b.dailyVessels - a.dailyVessels).map((lane) => {
                  const threat = THREAT_CONFIG[lane.threat];
                  return (
                    <div key={lane.id} className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${threat.dot}`} />
                      <span className="text-[11px] text-slate-300 w-40 truncate">{lane.name}</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all"
                          style={{ width: `${Math.round((lane.dailyVessels / 290) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-teal-300 w-12 text-right">{lane.dailyVessels}/day</span>
                    </div>
                  );
                })}
              </div>

              {/* Live alert */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-rose-300 mb-1">ACTIVE DISRUPTION — RED SEA / BAB-EL-MANDEB</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Houthi attacks on commercial shipping have diverted 60-70% of Red Sea traffic via Cape of Good Hope, adding 8-14 days transit time and ~$1M additional fuel cost per voyage. Suez Canal revenue down ~40%.
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
