import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Flame,
  Waves,
  Tornado,
  Mountain,
  SunMedium,
  Zap,
  Activity,
  ChevronRight,
  Search,
  Crosshair,
  MapPin,
  Clock,
  History
} from 'lucide-react';
import { DisasterEvent } from '../../types';
import { getHazardLifecycleInfo } from '../../data/hazardLifecycle';

interface DisasterListPanelProps {
  events: DisasterEvent[];
  selectedEvent: DisasterEvent | null;
  onSelectEvent: (event: DisasterEvent) => void;
  onClose: () => void;
  isSidebarOpen?: boolean;
}

export const DisasterListPanel: React.FC<DisasterListPanelProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  onClose,
  isSidebarOpen = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'wildfire': return <Flame className="w-4 h-4 text-orange-400" />;
      case 'flood': return <Waves className="w-4 h-4 text-cyan-400" />;
      case 'cyclone': return <Tornado className="w-4 h-4 text-indigo-400" />;
      case 'volcano': return <Flame className="w-4 h-4 text-rose-500" />;
      case 'heatwave': return <SunMedium className="w-4 h-4 text-amber-400" />;
      case 'earthquake': return <Mountain className="w-4 h-4 text-emerald-400" />;
      case 'storm': return <Zap className="w-4 h-4 text-yellow-400" />;
      default: return <Activity className="w-4 h-4 text-purple-400" />;
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.title.toLowerCase().includes(q) ||
      ev.type.toLowerCase().includes(q) ||
      ev.source.toLowerCase().includes(q) ||
      (ev.description && ev.description.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className={`absolute top-20 ${
        isSidebarOpen ? 'left-[304px]' : 'left-[88px]'
      } w-96 max-h-[calc(100vh-160px)] z-30 flex flex-col glass-panel rounded-2xl border border-rose-500/30 shadow-2xl text-slate-100 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300`}
    >
      {/* Header */}
      <div className="p-4 border-b border-rose-500/20 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>Recent Hazards Log</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-mono font-bold">
                7-DAY SITES
              </span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {events.length} monitored incidents • Post-disaster surveillance
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Registry"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Search Bar */}
      <div className="p-2.5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search recent hazards, earthquakes, wildfires..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400/60 transition-colors"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No hazards match &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isSelected = selectedEvent?.id === ev.id;
            const coordStr = `${Math.abs(ev.latitude).toFixed(1)}°${ev.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(ev.longitude).toFixed(1)}°${ev.longitude >= 0 ? 'E' : 'W'}`;
            const lifecycle = getHazardLifecycleInfo(ev);

            return (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className={`p-3 rounded-xl glass-card cursor-pointer flex items-center justify-between transition-all group hover:border-rose-400/50 hover:bg-slate-900/90 ${
                  isSelected ? 'border-rose-400/80 bg-rose-500/15 shadow-lg shadow-rose-500/20' : ''
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 pr-2">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 mt-0.5 shrink-0 group-hover:border-rose-400/40 transition-colors">
                    {getEventIcon(ev.type)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-white truncate group-hover:text-rose-200 transition-colors">
                      {ev.title}
                    </h4>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="uppercase text-sky-400 font-bold">{ev.type}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-amber-300/90 font-medium">
                        <History className="w-2.5 h-2.5 text-amber-400" />
                        {lifecycle.shortTimeAgo}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-slate-400">
                        <MapPin className="w-2.5 h-2.5 text-rose-400" />
                        {coordStr}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-bold border ${lifecycle.badgeColorClass}`}
                  >
                    {lifecycle.operationalBadge}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] font-mono uppercase font-bold ${
                        ev.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300'
                          : ev.severity === 'high'
                          ? 'bg-orange-500/20 text-orange-300'
                          : ev.severity === 'moderate'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-sky-500/20 text-sky-300'
                      }`}
                    >
                      {ev.severity}
                    </span>
                    <Crosshair className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
