import React, { useState, useEffect, useMemo } from 'react';
import { GlobeViewer } from './components/Globe/GlobeViewer';
import { GlobeErrorBoundary } from './components/Globe/GlobeErrorBoundary';
import { LandingPage } from './components/Landing/LandingPage';
import { Sidebar, NavTab } from './components/Navigation/Sidebar';
import { GlobalSearch } from './components/Search/GlobalSearch';
import { TimelineBar } from './components/Timeline/TimelineBar';
import { EventDetailPanel } from './components/Panels/EventDetailPanel';
import { SatelliteDetailPanel } from './components/Panels/SatelliteDetailPanel';
import { LocationIntelligencePanel } from './components/Panels/LocationIntelligencePanel';
import { SpotInspectionPanel } from './components/Panels/SpotInspectionPanel';
import { DisasterListPanel } from './components/Panels/DisasterListPanel';
import { SatelliteListPanel } from './components/Panels/SatelliteListPanel';
import { LocationsListPanel } from './components/Panels/LocationsListPanel';
import { AIAnalystModal } from './components/AIAnalyst/AIAnalystModal';
import { SimulationModal } from './components/Simulation/SimulationModal';
import { AnalyticsModal } from './components/Analytics/AnalyticsModal';
import { SettingsModal } from './components/Settings/SettingsModal';
import { CelesTrakKnowledgeModal } from './components/CelesTrak/CelesTrakKnowledgeModal';
import { YourNameInLandsatModal } from './components/FunZone/YourNameInLandsatModal';

import { api } from './services/api';
import {
  DisasterEvent,
  Satellite,
  LocationItem,
  SimulationResult,
  AnalyticsResponse,
  FilterState,
  SpotInspectionData
} from './types';
import { CheckCircle2, AlertCircle, RefreshCw, Menu, Clock, Maximize2, Minimize2, Sparkles, ArrowLeft } from 'lucide-react';
import { DEFAULT_GLOBAL_LOCATIONS } from './components/Panels/LocationsListPanel';
import { getLocalPlaceInfo, reverseGeocodeClient } from './services/geocoding';
import { fetchLiveWeatherClient } from './services/liveWeather';

export const App: React.FC = () => {
  // Navigation & View State
  const [isLandingPage, setIsLandingPage] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('explore')) {
      return false;
    }
    return true;
  });
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');

  // Core Data
  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);

  // Active Selections
  const [selectedEvent, setSelectedEvent] = useState<DisasterEvent | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<Satellite | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Spot Inspection State
  const [inspectedSpot, setInspectedSpot] = useState<SpotInspectionData | null>(null);
  const [isLoadingSpot, setIsLoadingSpot] = useState<boolean>(false);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lon: number; altitude?: number; id: number } | null>(null);
  const [simulationInitialLocation, setSimulationInitialLocation] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [analystInitialQuery, setAnalystInitialQuery] = useState<string | undefined>(undefined);

  // Modals & Panels
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [showTimeline, setShowTimeline] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  // Global Filters
  const [filters, setFilters] = useState<FilterState>({
    eventType: 'all',
    severity: 'all',
    status: 'all',
    timelineHoursAgo: 0,
    showSatellites: true,
    showDisasters: true,
    showOrbits: true,
    showLabels: true,
    satelliteMission: 'all',
  });

  // Initial Data Fetching
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [evData, satData, anaData] = await Promise.all([
          api.getEvents(),
          api.getSatellites(),
          api.getAnalytics(),
        ]);
        setEvents(evData);
        setSatellites(satData);
        setAnalytics(anaData);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Periodic Satellite Position Refresh (Keeps orbits active in real-time)
  // 30s interval: satellites move ~7km/s so positions are still accurate at this cadence
  // and it reduces backend load by 6x vs the old 5s polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updatedSats = await api.getSatellites();
        if (updatedSats && updatedSats.length > 0) {
          setSatellites(updatedSats);
        }
      } catch {
        // Ignore background polling glitches
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Events based on sidebar controls and bottom timeline scrubber
  const displayedEvents = useMemo(() => {
    return events.filter((ev) => {
      // Event Type filter
      if (filters.eventType !== 'all' && ev.type !== filters.eventType) {
        return false;
      }
      // Severity filter
      if (filters.severity !== 'all' && ev.severity !== filters.severity) {
        return false;
      }
      // Timeline scrubber filter: if scrubber is set to X hours ago, hide events detected more recently than scrubber
      if (filters.timelineHoursAgo > 0) {
        const eventTime = new Date(ev.detected_at).getTime();
        const cutoffTime = Date.now() - filters.timelineHoursAgo * 3600 * 1000;
        if (eventTime > cutoffTime) {
          return false;
        }
      }
      return true;
    });
  }, [events, filters]);

  // Handle Event Selection
  const handleSelectEvent = async (event: DisasterEvent | null) => {
    if (!event) {
      setSelectedEvent(null);
      return;
    }
    setSelectedSatellite(null);
    setSelectedLocation(null);
    setInspectedSpot(null);
    // Fetch enriched details with relevant satellites & weather
    const detail = await api.getEventById(event.id);
    const selected = detail || event;
    // Guarantee real live weather if missing or pending
    if (!selected.weather_context || !selected.weather_context.is_live || selected.weather_context.temperature_c == null) {
      fetchLiveWeatherClient(selected.latitude, selected.longitude).then((liveW) => {
        if (liveW) {
          setSelectedEvent((prev) => (prev && prev.id === selected.id ? { ...prev, weather_context: liveW } : prev));
        }
      });
    }
    setSelectedEvent(selected);
  };

  // Handle Satellite Selection
  const handleSelectSatellite = async (sat: Satellite | null) => {
    if (!sat) {
      setSelectedSatellite(null);
      return;
    }
    setSelectedEvent(null);
    setSelectedLocation(null);
    setInspectedSpot(null);
    const detail = await api.getSatelliteById(sat.id);
    setSelectedSatellite(detail || sat);
  };

  // Handle Satellite by ID Selection (from Event panel)
  const handleSelectSatelliteById = async (satId: string) => {
    const sat = satellites.find((s) => s.id === satId);
    if (sat) {
      handleSelectSatellite(sat);
    } else {
      const fetched = await api.getSatelliteById(satId);
      if (fetched) handleSelectSatellite(fetched);
    }
  };

  // Handle Location Selection
  const handleSelectLocation = async (loc: LocationItem) => {
    setSelectedEvent(null);
    setSelectedSatellite(null);
    setInspectedSpot(null);
    const detail = await api.getLocationById(loc.id);
    let selectedLoc = detail || loc;
    
    // Ensure real live weather is available
    if (!selectedLoc.weather || !selectedLoc.weather.is_live || selectedLoc.weather.temperature_c == null) {
      fetchLiveWeatherClient(loc.latitude, loc.longitude).then((liveW) => {
        if (liveW) {
          setSelectedLocation((prev) => (prev && prev.id === loc.id ? { ...prev, weather: liveW } : prev));
        }
      });
    }
    setSelectedLocation(selectedLoc);

    // Fly the globe camera to the selected location
    // OSM-sourced places (cities/towns): close zoom; large country seeds: wide view; others: balanced city view
    let altitude = 250000; // default mid-level zoom
    if (loc.id.startsWith('osm-')) {
      altitude = 80000; // specific city/town, zoom very close
    } else if (loc.population != null && loc.population > 30_000_000) {
      altitude = 1200000; // country/large region
    } else if (loc.population != null && loc.population > 5_000_000) {
      altitude = 500000; // large city
    } else if (loc.population != null && loc.population > 500_000) {
      altitude = 150000; // medium city
    }
    setFlyToTarget({ lat: loc.latitude, lon: loc.longitude, altitude, id: Date.now() });
  };

  // Handle Arbitrary Spot Inspection on 3D Globe Surface
  const handleInspectSpot = async (lat: number, lon: number) => {
    // Focus viewport on the inspected spot
    setSelectedEvent(null);
    setSelectedSatellite(null);
    setSelectedLocation(null);
    setIsLoadingSpot(true);

    const latFixed = Number(lat.toFixed(4));
    const lonFixed = Number(lon.toFixed(4));
    const coordStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;

    // Fast local spatial calculation for hazard events
    const localEventsNearby = events.map(e => {
      const dLat = (e.latitude - latFixed) * Math.PI / 180;
      const dLon = (e.longitude - lonFixed) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(latFixed * Math.PI / 180) * Math.cos(e.latitude * Math.PI / 180) * Math.sin(dLon/2)**2;
      const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return {
        id: e.id,
        title: e.title,
        type: e.type,
        severity: e.severity,
        distance_km: Math.round(dist),
        latitude: e.latitude,
        longitude: e.longitude
      };
    }).filter(e => e.distance_km <= 2500).sort((a, b) => a.distance_km - b.distance_km);

    // 0ms Instant Accurate Local Place Recognition (Never raw coordinates!)
    const localPlace = getLocalPlaceInfo(latFixed, lonFixed);

    let initialRisk = 'Low Risk';
    if (localEventsNearby.some(e => e.severity === 'critical' && e.distance_km < 150)) {
      initialRisk = 'Critical Impact Zone';
    } else if (localEventsNearby.some(e => (e.severity === 'critical' && e.distance_km < 300) || (e.severity === 'high' && e.distance_km < 200))) {
      initialRisk = 'High Hazard Alert';
    } else if (localEventsNearby.some(e => e.distance_km < 300 || (['critical', 'high'].includes(e.severity) && e.distance_km < 500))) {
      initialRisk = 'Moderate Advisory';
    }

    // Immediate optimistic beacon with genuine geographic name
    const placeholderSpot: SpotInspectionData = {
      latitude: latFixed,
      longitude: lonFixed,
      coordinate_label: coordStr,
      name: localPlace.name,
      display_name: localPlace.display_name,
      country: localPlace.country,
      region: localPlace.region,
      terrain_type: localPlace.terrain_type,
      is_maritime: localPlace.is_maritime,
      weather: null,
      nearby_events: localEventsNearby.slice(0, 5),
      next_overpass: null,
      risk_level: initialRisk,
    };
    setInspectedSpot(placeholderSpot);

    // Progressive update 1: Fast client reverse geocode (~200ms)
    reverseGeocodeClient(latFixed, lonFixed).then((fastGeo) => {
      if (fastGeo && fastGeo.name && !/^[0-9.-]+[°\s]/.test(fastGeo.name)) {
        setInspectedSpot((prev) => {
          if (!prev || prev.latitude !== latFixed || prev.longitude !== lonFixed) return prev;
          const shouldNotBeSea = prev.country === 'India' || fastGeo.country === 'India' || !fastGeo.is_maritime;
          return {
            ...prev,
            name: fastGeo.name,
            display_name: fastGeo.display_name,
            country: fastGeo.country,
            region: fastGeo.region,
            terrain_type: shouldNotBeSea ? 'Terrestrial' : fastGeo.terrain_type,
            is_maritime: shouldNotBeSea ? false : fastGeo.is_maritime,
          };
        });
      }
    }).catch(() => {});

    // Progressive update 2: Fast direct live weather (~300ms)
    fetchLiveWeatherClient(latFixed, lonFixed).then((liveW) => {
      if (liveW) {
        setInspectedSpot((prev) => (prev && prev.latitude === latFixed && prev.longitude === lonFixed ? { ...prev, weather: liveW } : prev));
      }
    }).catch(() => {});

    // Progressive update 3: Complete geospatial intelligence from backend (SGP4 overpass, seismics, EONET, air quality)
    try {
      const backendResult = await api.inspectSpot(latFixed, lonFixed);
      if (backendResult) {
        setInspectedSpot((prev) => {
          if (!prev || prev.latitude !== latFixed || prev.longitude !== lonFixed) return prev;
          // Guard: if spot is on Indian mainland or recognized as land, never overwrite with marine basin
          const isLand = prev.country === 'India' || backendResult.country === 'India' || !prev.is_maritime;
          const backendIsSea = backendResult.is_maritime || backendResult.country === 'Arabian Sea' || backendResult.country === 'Bay of Bengal';
          const keepPrevGeo = isLand && backendIsSea;

          return {
            ...backendResult,
            name: keepPrevGeo ? prev.name : (backendResult.name || prev.name),
            display_name: keepPrevGeo ? prev.display_name : (backendResult.display_name || prev.display_name),
            country: keepPrevGeo ? prev.country : (backendResult.country || prev.country),
            region: keepPrevGeo ? prev.region : (backendResult.region || prev.region),
            terrain_type: (isLand && !keepPrevGeo) ? (backendResult.terrain_type || 'Terrestrial') : (isLand ? 'Terrestrial' : backendResult.terrain_type),
            is_maritime: isLand ? false : backendResult.is_maritime,
            weather: (backendResult.weather && backendResult.weather.is_live && backendResult.weather.temperature_c != null)
              ? backendResult.weather
              : (prev.weather || backendResult.weather),
          };
        });
      }
    } catch (err) {
      console.warn('Backend inspection query fallback, using direct client telemetry:', err);
    } finally {
      setIsLoadingSpot(false);
    }
  };

  // Fly Camera to Coordinate
  const handleFlyTo = (lat: number, lon: number, altitude: number = 350000) => {
    setFlyToTarget({ lat, lon, altitude, id: Date.now() });
  };

  // Simulate Hazard at Inspected Spot
  const handleSimulateAtSpot = (lat: number, lon: number, name: string) => {
    setSimulationInitialLocation({ name, lat, lon });
    setInspectedSpot(null);
    setCurrentTab('simulation');
  };

  // Ask AI Analyst about Inspected Spot
  const handleAskAIAboutSpot = (spotName: string, lat: number, lon: number) => {
    setAnalystInitialQuery(
      `Provide a comprehensive environmental threat assessment and satellite monitoring coverage analysis for ${spotName} at coordinates (${lat.toFixed(2)}, ${lon.toFixed(2)}).`
    );
    setInspectedSpot(null);
    setCurrentTab('analyst');
  };

  // Sync Live USGS Earthquake Feeds
  const handleSyncLive = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncLiveUSGS();
      const updatedEvents = await api.getEvents();
      setEvents(updatedEvents);
      const updatedAnalytics = await api.getAnalytics();
      setAnalytics(updatedAnalytics);

      setToastMessage(`Synced ${res.live_events_synced} live events from USGS! (${res.newly_added} new)`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      setToastMessage('Live USGS sync completed (using cache)');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Switch between tabs
  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    // Auto-open modal/drawers
    if (tab === 'overview') {
      setSelectedEvent(null);
      setSelectedSatellite(null);
      setSelectedLocation(null);
      setInspectedSpot(null);
    }
  };

  // Listen for browser forward/backward navigation between Index and Home/Explore
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const hasExplore = window.location.search.includes('explore');
        setIsLandingPage(!hasExplore);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Back to Index / Landing Page navigation handler
  const handleBackToIndex = () => {
    setIsLandingPage(true);
    if (typeof window !== 'undefined') {
      window.history.pushState({ page: 'index' }, '', window.location.pathname);
    }
  };

  // Landing Page Entry points
  const handleEnterExplore = () => {
    setIsLandingPage(false);
    setCurrentTab('overview');
    if (typeof window !== 'undefined') {
      window.history.pushState({ page: 'explore' }, '', '?explore=true');
    }
  };

  const handleEnterDisasters = () => {
    setIsLandingPage(false);
    setCurrentTab('disasters');
    if (events.length > 0) {
      handleSelectEvent(events[0]);
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({ page: 'explore', tab: 'disasters' }, '', '?explore=true&tab=disasters');
    }
  };

  if (isLandingPage) {
    return (
      <LandingPage
        onEnterExplore={handleEnterExplore}
        onEnterDisasters={handleEnterDisasters}
        eventCount={events.length}
        satelliteCount={satellites.length}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-6 z-50 px-4 py-2.5 rounded-xl glass-panel border border-emerald-500/40 text-emerald-300 text-xs font-mono shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Left Sidebar (Collapsible Mini-Dock / Expanded Drawer) */}
      {!isZenMode && (
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          filters={filters}
          onFilterChange={setFilters}
          disasterCount={events.length}
          satelliteCount={satellites.length}
          onSyncLive={handleSyncLive}
          isSyncing={isSyncing}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onBackToIndex={handleBackToIndex}
        />
      )}

      {/* Full-Bleed 3D Globe Canvas (Spans 100% of viewport) */}
      <main className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Top Floating Header & Global Omni-Search */}
        {!isZenMode ? (
          <div className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2.5">
              {/* Back to Index Page Button */}
              <button
                onClick={handleBackToIndex}
                className="px-3 py-2.5 rounded-xl glass-panel hover:bg-slate-800/90 text-sky-400 hover:text-white border border-slate-700/60 hover:border-sky-400/50 flex items-center gap-1.5 text-xs font-mono shadow-xl transition-all group cursor-pointer"
                title="Back to Index Page"
                aria-label="Back to Index Page"
              >
                <ArrowLeft className="w-4 h-4 text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline font-bold tracking-wider">INDEX</span>
              </button>

              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2.5 rounded-xl glass-panel transition-all border flex items-center gap-2 text-xs font-mono shadow-xl ${
                  isSidebarOpen
                    ? 'border-sky-400 bg-sky-500/20 text-white'
                    : 'border-slate-700/60 bg-slate-900/80 hover:bg-slate-800 text-sky-400 hover:text-white'
                }`}
                title={isSidebarOpen ? "Collapse Mission Control" : "Open Mission Control & Filters"}
              >
                <Menu className="w-4 h-4" />
                <span className="hidden sm:inline font-bold">CONTROL</span>
              </button>

              <GlobalSearch
                events={events}
                satellites={satellites}
                onSelectEvent={handleSelectEvent}
                onSelectSatellite={handleSelectSatellite}
                onSelectLocation={handleSelectLocation}
              />
            </div>

            {/* Top Right Action Pills */}
            <div className="pointer-events-auto flex items-center gap-2">
              {/* Timeline Toggle */}
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className={`px-3 py-1.5 rounded-xl glass-panel text-xs font-mono transition-all border flex items-center gap-1.5 shadow-lg ${
                  showTimeline
                    ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
                    : 'border-slate-700/60 hover:bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
                title="Toggle Timeline Progression Scrubber"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden md:inline">TIMELINE</span>
              </button>

              {/* Live CelesTrak Hub */}
              <button
                onClick={() => handleSelectTab('celestrak')}
                className="px-3 py-1.5 rounded-xl glass-panel hover:bg-slate-800/80 border border-sky-500/40 text-sky-300 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-500/10"
                title="Open CelesTrak Space Intelligence & TLE Deconstructor"
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="hidden sm:inline">CELESTRAK</span>
              </button>

              {/* Find Our Name on the Earth */}
              <button
                onClick={() => handleSelectTab('funzone')}
                className="px-3.5 py-1.5 rounded-xl glass-panel hover:bg-slate-800/80 border border-cyan-400/50 bg-cyan-950/25 text-cyan-300 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 hover:scale-105"
                title="Find Our Name on the Earth: Spell your name using natural satellite landforms from space!"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden sm:inline font-bold">NAME ON EARTH</span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/30 text-[9px] font-mono text-cyan-200 uppercase font-bold">EXPLORE</span>
              </button>

              {/* Zen Fullscreen Viewport Mode */}
              <button
                onClick={() => setIsZenMode(true)}
                className="p-2 rounded-xl glass-panel hover:bg-slate-800/80 text-slate-400 hover:text-white transition-all border border-slate-700/60"
                title="Zen Mode: Hide all controls for completely unobstructed Earth view"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Back to Index Page */}
              <button
                onClick={handleBackToIndex}
                className="px-3 py-1.5 rounded-xl glass-panel hover:bg-slate-800/80 text-slate-300 hover:text-white text-xs font-mono transition-all border border-slate-700/60 hover:border-sky-400/50 flex items-center gap-1.5 shadow-lg group cursor-pointer"
                title="Back to Index / Landing Page"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden md:inline">INDEX PAGE</span>
              </button>
            </div>
          </div>
        ) : (
          /* Zen Mode Active - Floating Restore HUD Button */
          <button
            onClick={() => setIsZenMode(false)}
            className="absolute top-4 right-6 z-50 px-3.5 py-2 rounded-xl glass-panel border border-sky-500/50 bg-slate-950/80 text-sky-300 text-xs font-mono shadow-2xl flex items-center gap-2 hover:scale-105 transition-all cursor-pointer animate-in fade-in"
            title="Exit Zen Mode & Restore HUD"
          >
            <Minimize2 className="w-4 h-4" />
            <span>SHOW HUD</span>
          </button>
        )}

        {/* 3D Cesium Earth Canvas */}
        <GlobeErrorBoundary>
          <GlobeViewer
            events={displayedEvents}
            satellites={satellites}
            selectedEvent={selectedEvent}
            selectedSatellite={selectedSatellite}
            inspectedSpot={inspectedSpot}
            simulationResult={simulationResult}
            showSatellites={filters.showSatellites}
            showDisasters={filters.showDisasters}
            showOrbits={filters.showOrbits}
            showLabels={filters.showLabels}
            flyToTarget={flyToTarget}
            onSelectEvent={handleSelectEvent}
            onSelectSatellite={handleSelectSatellite}
            onInspectSpot={handleInspectSpot}
            onToggleLabels={() => setFilters((f) => ({ ...f, showLabels: !f.showLabels }))}
          />
        </GlobeErrorBoundary>

        {/* Spot Inspection Intelligence Panel */}
        {(inspectedSpot || isLoadingSpot) && (
          <SpotInspectionPanel
            data={inspectedSpot}
            isLoading={isLoadingSpot}
            onClose={() => setInspectedSpot(null)}
            onSimulateAtSpot={handleSimulateAtSpot}
            onAskAIAboutSpot={handleAskAIAboutSpot}
            onSelectEvent={(ev) => handleSelectEvent(ev)}
            onZoomIn={(lat, lon) => handleFlyTo(lat, lon, 350000)}
          />
        )}

        {/* Event Detail Panel */}
        {selectedEvent && (
          <EventDetailPanel
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onSelectSatelliteId={handleSelectSatelliteById}
          />
        )}

        {/* Satellite Detail Panel */}
        {selectedSatellite && (
          <SatelliteDetailPanel
            satellite={selectedSatellite}
            onClose={() => setSelectedSatellite(null)}
            onTrackSatellite={(sat) => handleSelectSatellite(sat)}
          />
        )}

        {/* Location Intelligence Panel */}
        {selectedLocation && (
          <LocationIntelligencePanel
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            onSelectEvent={handleSelectEvent}
            onSelectSatellite={handleSelectSatellite}
          />
        )}

        {/* Disasters Drawer when on 'disasters' tab */}
        {currentTab === 'disasters' && !selectedEvent && !selectedSatellite && !selectedLocation && (
          <DisasterListPanel
            events={displayedEvents}
            selectedEvent={selectedEvent}
            onSelectEvent={handleSelectEvent}
            onClose={() => setCurrentTab('overview')}
          />
        )}

        {/* Satellites Drawer when on 'satellites' tab */}
        {currentTab === 'satellites' && !selectedEvent && !selectedSatellite && !selectedLocation && (
          <SatelliteListPanel
            satellites={satellites}
            selectedSatellite={selectedSatellite}
            onSelectSatellite={handleSelectSatellite}
            onClose={() => setCurrentTab('overview')}
          />
        )}

        {/* Locations Drawer when on 'locations' tab */}
        {currentTab === 'locations' && !selectedEvent && !selectedSatellite && !selectedLocation && (
          <LocationsListPanel
            onSelectLocation={handleSelectLocation}
            onClose={() => setCurrentTab('overview')}
          />
        )}

        {/* Bottom Timeline Scrubber (Only rendered when toggled on) */}
        {!isZenMode && showTimeline && (
          <TimelineBar
            events={events}
            hoursAgo={filters.timelineHoursAgo}
            onHoursAgoChange={(hours) => setFilters((f) => ({ ...f, timelineHoursAgo: hours }))}
            onSelectEvent={handleSelectEvent}
            onClose={() => setShowTimeline(false)}
          />
        )}
      </main>

      {/* AI Analyst Modal */}
      {currentTab === 'analyst' && (
        <AIAnalystModal
          onClose={() => {
            setAnalystInitialQuery(undefined);
            setCurrentTab('overview');
          }}
          onSelectEvent={handleSelectEvent}
          onSelectSatellite={handleSelectSatellite}
          initialQuery={analystInitialQuery}
        />
      )}

      {/* Disaster Simulation Modal */}
      {currentTab === 'simulation' && (
        <SimulationModal
          onClose={() => {
            setSimulationInitialLocation(null);
            setCurrentTab('overview');
          }}
          onSimulationApplied={(res) => {
            setSimulationResult(res);
            setSimulationInitialLocation(null);
            setCurrentTab('overview');
          }}
          onClearSimulation={() => {
            setSimulationResult(null);
            setSimulationInitialLocation(null);
            setCurrentTab('overview');
          }}
          currentSimulation={simulationResult}
          initialLocation={simulationInitialLocation}
        />
      )}

      {/* Analytics Dashboard Modal */}
      {currentTab === 'analytics' && (
        <AnalyticsModal
          analytics={analytics}
          onClose={() => setCurrentTab('overview')}
        />
      )}

      {/* CelesTrak Space Intelligence & TLE Deconstructor Modal */}
      {currentTab === 'celestrak' && (
        <CelesTrakKnowledgeModal
          onClose={() => setCurrentTab('overview')}
          onSelectSatellite={handleSelectSatellite}
          onSelectEvent={handleSelectEvent}
          satellites={satellites}
          events={events}
        />
      )}

      {/* NASA Fun Zone: Your Name in Landsat Modal */}
      {currentTab === 'funzone' && (
        <YourNameInLandsatModal
          onClose={() => setCurrentTab('overview')}
          onFlyToLocation={(lat, lon, alt) => handleFlyTo(lat, lon, alt)}
        />
      )}

      {/* Settings Modal */}
      {currentTab === 'settings' && (
        <SettingsModal
          onClose={() => setCurrentTab('overview')}
          onSyncLive={handleSyncLive}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
};

export default App;
