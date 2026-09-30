import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  ArrowLeft,
  Compass,
  Download,
  LayoutGrid,
  ExternalLink,
  Satellite as SatelliteIcon,
  RefreshCw,
  Sparkles,
  Share2,
  Copy,
  Check,
  Eye,
  Layers,
  MapPin,
  Sliders,
  Globe2,
  Mountain,
  Waves,
  Trees,
  Search,
  Maximize2
} from 'lucide-react';
import {
  OFFICIAL_LANDSAT_ITEMS,
  LANDSAT_MAP_BY_LETTER,
  OfficialLandsatItem,
  parseDMS
} from '../../data/landsatOfficialData';

interface YourNameInLandsatModalProps {
  onClose: () => void;
  onFlyToLocation: (lat: number, lon: number, altitude?: number) => void;
}

// Quick presets for exploration
const PRESET_WORDS = ['EARTHWATCH', 'ALWIN', 'ORBIT', 'TERRA', 'AMAZON', 'COSMOS'];

// Spectral imaging filters
type SpectralFilter = 'natural' | 'infrared' | 'swir' | 'cyber';

interface SpectralOption {
  id: SpectralFilter;
  name: string;
  badge: string;
  filterClass: string;
  description: string;
}

const SPECTRAL_OPTIONS: SpectralOption[] = [
  {
    id: 'natural',
    name: 'Natural True Color',
    badge: 'RGB 4-3-2',
    filterClass: 'brightness-100 contrast-100 saturate-100',
    description: 'Visible spectrum as seen by the human eye from low Earth orbit.'
  },
  {
    id: 'infrared',
    name: 'Color Infrared (CIR)',
    badge: 'NIR 5-4-3',
    filterClass: 'hue-rotate-140 saturate-150 contrast-110',
    description: 'Near-infrared false color highlighting plant biomass and river networks.'
  },
  {
    id: 'swir',
    name: 'Geological SWIR',
    badge: 'SWIR 7-6-4',
    filterClass: 'hue-rotate-190 saturate-125 contrast-120',
    description: 'Shortwave infrared penetrating atmospheric haze for mineral exploration.'
  },
  {
    id: 'cyber',
    name: 'EarthWatch Radar',
    badge: 'SAR MATRIX',
    filterClass: 'hue-rotate-160 saturate-200 contrast-125 brightness-105',
    description: 'Synthetic aperture radar false-color telemetry with electric cyan highlights.'
  }
];

// Helper to deduce natural feature type from location name
function inferFeatureType(name: string): { label: string; icon: typeof Mountain; color: string } {
  const n = name.toLowerCase();
  if (n.includes('river') || n.includes('delta') || n.includes('lake') || n.includes('fjord') || n.includes('sea') || n.includes('water') || n.includes('bend')) {
    return { label: 'River / Water Body', icon: Waves, color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30' };
  }
  if (n.includes('glacier') || n.includes('ice') || n.includes('snow') || n.includes('firn')) {
    return { label: 'Glacier / Ice Field', icon: Mountain, color: 'text-sky-300 bg-sky-950/60 border-sky-500/30' };
  }
  if (n.includes('forest') || n.includes('island') || n.includes('national park') || n.includes('brazil') || n.includes('mato')) {
    return { label: 'Forest / Bio-Canopy', icon: Trees, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30' };
  }
  if (n.includes('desert') || n.includes('dune') || n.includes('canyon') || n.includes('rock') || n.includes('crater')) {
    return { label: 'Geological Formation', icon: Mountain, color: 'text-amber-400 bg-amber-950/60 border-amber-500/30' };
  }
  return { label: 'Planetary Landform', icon: Globe2, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-500/30' };
}

// AI Geological Analysis generation based on location
function generateGeologicalInsight(item: OfficialLandsatItem): string {
  const name = item.location_name;
  if (name.includes('Araguaia') || name.includes('Brazil')) {
    return `Linear clearings and access roads cut through the Brazilian Cerrado-Amazon transition zone create bold diagonal boundaries. The contrast between primary canopy reflectance and cleared arable soil outlines a distinct letter geometry when imaged from a 705 km sun-synchronous orbit.`;
  }
  if (name.includes('River') || name.includes('Bend') || name.includes('Delta')) {
    return `Centuries of hydrodynamic meander evolution carved tight hairpin oxbow curves into sediment plains. Low water velocities deposit silt bars along the inner loop while high shear stress erodes outer banks, forming geometric capital arcs visible across multispectral bands.`;
  }
  if (name.includes('Glacier') || name.includes('Fjord') || name.includes('Ice')) {
    return `Sub-zero glacial carving gouges steep U-shaped valleys through bedrock. Melting firn feeds glacial meltwater lakes enriched with rock flour sediment, reflecting vivid cyan wavelengths into Landsat’s Operational Land Imager.`;
  }
  if (name.includes('Island') || name.includes('Reef') || name.includes('Atoll')) {
    return `Volcanic subsidence ringed by calcium carbonate coral reef accretions produces curved ocean atolls. Wave dynamics and tidal currents sweep sandbars into distinctive arcs that trace clean alphabetic lines in the open ocean.`;
  }
  return `Tectonic uplift combined with wind abrasion and differential surface weathering exposes folded sedimentary strata. Satellite radiometers capture natural reflectance variances that naturally mirror alphabetical characters.`;
}

export const YourNameInLandsatModal: React.FC<YourNameInLandsatModalProps> = ({
  onClose,
  onFlyToLocation,
}) => {
  // Input word state (default: 'alwin')
  const [inputValue, setInputValue] = useState<string>('alwin');
  const [activeWord, setActiveWord] = useState<string>('alwin');

  // Variant overrides per letter index
  const [variantOverrides, setVariantOverrides] = useState<Record<number, number>>({
    4: 2 // For 'alwin', letter 4 ('n') defaults to São Miguel do Araguaia, Brazil
  });

  // Active selected tile index
  const [selectedTileIndex, setSelectedTileIndex] = useState<number>(4);

  // Active spectral filter
  const [spectralMode, setSpectralMode] = useState<SpectralFilter>('natural');

  // Gallery view toggle
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [galleryFilter, setGalleryFilter] = useState<string>('');
  const [galleryCategory, setGalleryCategory] = useState<string>('all');

  // Interaction feedback
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [showSpectralSelector, setShowSpectralSelector] = useState<boolean>(false);

  // Keyboard Escape listener to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isGalleryOpen) {
          setIsGalleryOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGalleryOpen, onClose]);

  // Clean characters array
  const cleanChars = activeWord.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 16).split('');

  // Assemble active items for each character
  const assembledTiles = useMemo(() => {
    return cleanChars.map((char, idx) => {
      const list = LANDSAT_MAP_BY_LETTER[char] || [];
      if (list.length === 0) return null;

      let variantIndex = variantOverrides[idx] ?? 0;
      // Default 'alwin' letter 'n' to variant 2 (São Miguel do Araguaia)
      if (activeWord.toLowerCase() === 'alwin' && idx === 4 && variantOverrides[idx] === undefined) {
        variantIndex = 2;
      }

      const item = list[variantIndex % list.length];
      return {
        char,
        index: idx,
        item,
        variantsCount: list.length,
        currentVariant: variantIndex % list.length,
        featureType: inferFeatureType(item.location_name)
      };
    }).filter(Boolean) as Array<{
      char: string;
      index: number;
      item: OfficialLandsatItem;
      variantsCount: number;
      currentVariant: number;
      featureType: ReturnType<typeof inferFeatureType>;
    }>;
  }, [cleanChars, variantOverrides, activeWord]);

  // Selected tile item for deep-dive telemetry
  const activeTile = assembledTiles[selectedTileIndex] || assembledTiles[assembledTiles.length - 1] || null;
  const activeItem = activeTile?.item;

  // Handle word apply
  const handleApplyWord = () => {
    const sanitized = inputValue.trim();
    if (!sanitized) return;
    setActiveWord(sanitized);
    if (sanitized.toLowerCase() === 'alwin') {
      setVariantOverrides({ 4: 2 });
      setSelectedTileIndex(4);
    } else {
      setVariantOverrides({});
      setSelectedTileIndex(sanitized.length - 1);
    }
  };

  // Cycle variant for a specific letter index
  const handleCycleVariant = (tileIndex: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tile = assembledTiles[tileIndex];
    if (!tile || tile.variantsCount <= 1) return;
    const nextVariant = (tile.currentVariant + 1) % tile.variantsCount;
    setVariantOverrides(prev => ({
      ...prev,
      [tileIndex]: nextVariant
    }));
  };

  // Shuffle all variants
  const handleShuffleAll = () => {
    const newOverrides: Record<number, number> = {};
    assembledTiles.forEach((tile) => {
      if (tile.variantsCount > 1) {
        newOverrides[tile.index] = Math.floor(Math.random() * tile.variantsCount);
      }
    });
    setVariantOverrides(newOverrides);
  };

  // Fly Cesium globe to location
  const handleFlyTo = (item: OfficialLandsatItem) => {
    const { lat, lon } = parseDMS(item.coordinates);
    if (lat !== 0 || lon !== 0) {
      onFlyToLocation(lat, lon, 220000);
      onClose();
    }
  };

  // Copy coordinates
  const handleCopyCoords = (coords: string) => {
    navigator.clipboard.writeText(coords);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  // Export high-resolution holographic poster card via native canvas
  const handleExportPoster = async () => {
    if (assembledTiles.length === 0 || isDownloading) return;
    setIsDownloading(true);

    try {
      const tileWidth = 260;
      const tileHeight = 620;
      const gap = 16;
      const paddingX = 60;
      const headerHeight = 160;
      const footerHeight = 180;

      const totalTilesWidth = assembledTiles.length * tileWidth + (assembledTiles.length - 1) * gap;
      const canvasWidth = Math.max(1200, totalTilesWidth + paddingX * 2);
      const canvasHeight = headerHeight + tileHeight + footerHeight;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D canvas context');

      // 1. Futuristic dark backdrop with gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#090d1a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Orbital scan lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.lineWidth = 1;
      for (let y = 0; y < canvasHeight; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }

      // 2. Header: EarthWatch AI Branding
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EARTHWATCH AI • SATELLITE LANDFORM LAB', canvasWidth / 2, 54);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
      ctx.fillText('FIND OUR NAME ON THE EARTH', canvasWidth / 2, 108);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillText(`SPELLOUT: "${activeWord.toUpperCase()}" • SPECTRAL MODE: ${spectralMode.toUpperCase()} • TELEMETRY: LANDSAT / SENTINEL`, canvasWidth / 2, 138);

      // 3. Load and draw tile imagery
      const loadedImages = await Promise.all(
        assembledTiles.map(tile => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load ' + tile.item.imageUrl));
            img.src = tile.item.imageUrl;
          });
        })
      );

      const startX = (canvasWidth - totalTilesWidth) / 2;
      const tilesY = headerHeight + 20;

      loadedImages.forEach((img, i) => {
        const x = startX + i * (tileWidth + gap);

        // Tile border & shadow
        ctx.save();
        ctx.shadowColor = 'rgba(6, 182, 212, 0.35)';
        ctx.shadowBlur = 24;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, tilesY, tileWidth, tileHeight);
        ctx.restore();

        // Image
        ctx.drawImage(img, x, tilesY, tileWidth, tileHeight);

        // Letter badge overlay at top
        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(x + 12, tilesY + 12, 42, 42);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 12, tilesY + 12, 42, 42);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(assembledTiles[i].char, x + 33, tilesY + 41);

        // Bottom label
        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(x, tilesY + tileHeight - 38, tileWidth, 38);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(assembledTiles[i].item.location_name.slice(0, 24), x + tileWidth / 2, tilesY + tileHeight - 16);
      });

      // 4. Footer: Coordinates & Geological Telemetry
      if (activeItem) {
        const footerY = tilesY + tileHeight + 45;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(activeItem.location_name, canvasWidth / 2, footerY);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '16px "JetBrains Mono", monospace';
        ctx.fillText(activeItem.coordinates, canvasWidth / 2, footerY + 28);

        ctx.fillStyle = '#64748b';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText('POWERED BY EARTHWATCH AI PLANETARY OBSERVATION SYSTEM • 50 YEARS OF EARTH OBSERVATORY DATA', canvasWidth / 2, footerY + 56);
      }

      // Download trigger
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `EarthWatch_NameOnEarth_${activeWord.toUpperCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export poster:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const currentSpectralFilter = SPECTRAL_OPTIONS.find(o => o.id === spectralMode) || SPECTRAL_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-200 text-slate-100 select-none overflow-hidden">
      
      {/* 1. EARTHWATCH AI MISSION CONTROL HEADER */}
      <header className="relative w-full bg-slate-950/90 border-b border-cyan-500/20 px-3 md:px-8 py-3 flex items-center justify-between z-30 shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        
        {/* Left: Back Button + EarthWatch AI Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-3 md:px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-400/60 flex items-center gap-2 text-xs font-mono font-bold transition-all shadow-md group shrink-0 active:scale-95 cursor-pointer"
            title="Back to EarthWatch 3D Globe (or press Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Back to Globe</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/25 flex items-center justify-center shrink-0">
              <Globe2 className="w-4 h-4 text-white animate-spin-slow" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs md:text-sm tracking-wider bg-gradient-to-r from-white via-cyan-100 to-sky-400 bg-clip-text text-transparent">
                  EARTHWATCH AI
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-[8px] font-mono text-cyan-300 font-bold tracking-widest uppercase hidden md:inline">
                  PLANETARY LAB
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden lg:block">
                Find Our Name on the Earth
              </p>
            </div>
          </div>
        </div>

        {/* Center: Title / Current Telemetry */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none hidden md:block">
          <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white flex items-center gap-2 justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>Find Our Name on the Earth</span>
          </h1>
          <div className="text-[10px] font-mono text-cyan-400/80 tracking-widest uppercase flex items-center gap-2 justify-center">
            <span>72 ORBITAL SENSORS</span>
            <span>•</span>
            <span>NATURAL SATELLITE FORMATIONS ACROSS PLANET EARTH</span>
          </div>
        </div>

        {/* Right: Spectral Mode, Gallery Drawer, Close */}
        <div className="flex items-center gap-2">
          
          {/* Spectral Filter Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setShowSpectralSelector(!showSpectralSelector)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-all shadow-sm"
              title="Change Multispectral Band Display"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-bold">{currentSpectralFilter.name}</span>
            </button>

            {/* Dropdown Menu */}
            {showSpectralSelector && (
              <div className="absolute right-0 top-full mt-2 w-72 p-2 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl z-50 backdrop-blur-xl">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-2 py-1 mb-1 border-b border-slate-800">
                  Multispectral Band Mode:
                </div>
                {SPECTRAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSpectralMode(opt.id);
                      setShowSpectralSelector(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all mb-1 ${
                      spectralMode === opt.id
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{opt.name}</span>
                      <span className="text-[9px] font-mono text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alphabet Archive Drawer Button */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-white border border-slate-800 hover:border-cyan-500/40 flex items-center gap-1.5 transition-all"
            title="Browse Complete Alphabet Archive (A-Z)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">A–Z Archive</span>
          </button>

          {/* Exit Modal Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Return to 3D Globe"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE / CANVAS */}
      <main className="flex-1 flex flex-col items-center justify-between p-3 sm:p-5 md:p-6 overflow-y-auto min-h-0 relative">
        
        {/* Subtle Background Orbital Grid Lines */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Preset Quick Chips */}
        <div className="w-full flex items-center justify-center gap-2 mb-2 z-10 shrink-0 flex-wrap">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
            PRESETS:
          </span>
          {PRESET_WORDS.map((w) => (
            <button
              key={w}
              onClick={() => {
                setInputValue(w.toLowerCase());
                setActiveWord(w.toLowerCase());
                if (w === 'ALWIN') {
                  setVariantOverrides({ 4: 2 });
                  setSelectedTileIndex(4);
                } else {
                  setVariantOverrides({});
                  setSelectedTileIndex(w.length - 1);
                }
              }}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-mono tracking-wider transition-all border ${
                activeWord.toUpperCase() === w
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* 3. TALL PORTRAIT SATELLITE LETTER TILES (The Core Feature) */}
        <div className="w-full flex-1 flex items-center justify-center my-auto min-h-[280px] z-10">
          {assembledTiles.length === 0 ? (
            <div className="text-center p-8 rounded-2xl glass-panel border border-cyan-500/30 max-w-md">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-white mb-1">Type Any Name or Word</h3>
              <p className="text-xs text-slate-400 font-mono">
                Enter your text below to assemble natural Earth landforms into living letters from orbit.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 md:gap-3.5 flex-nowrap max-w-full overflow-x-auto px-4 py-3">
              {assembledTiles.map((tile, i) => {
                const isSelected = selectedTileIndex === i;
                const FeatureIcon = tile.featureType.icon;

                return (
                  <div
                    key={`${tile.char}-${i}`}
                    onClick={() => setSelectedTileIndex(i)}
                    className={`relative group cursor-pointer transition-all duration-300 shrink-0 select-none rounded-xl overflow-hidden border ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.03] shadow-[0_0_40px_rgba(6,182,212,0.4)] z-20'
                        : 'border-slate-800/90 hover:border-cyan-500/60 bg-slate-900/60 hover:scale-[1.015] shadow-lg'
                    }`}
                    style={{
                      // Slender vertical aspect ratio ~ 1:2.4
                      width: 'clamp(80px, 14vw, 155px)',
                      height: 'clamp(210px, 47vh, 380px)',
                    }}
                    title={`Letter ${tile.char} • ${tile.item.location_name}`}
                  >
                    {/* Real Landsat Satellite Imagery with Spectral Band Filter applied */}
                    <img
                      src={tile.item.imageUrl}
                      alt={`Landsat letter ${tile.char}`}
                      className={`w-full h-full object-cover transition-all duration-500 pointer-events-none ${currentSpectralFilter.filterClass} group-hover:scale-105`}
                    />

                    {/* Futuristic Corner Tech Accents */}
                    <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-cyan-400/60 pointer-events-none" />
                    <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-cyan-400/60 pointer-events-none" />
                    <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-cyan-400/60 pointer-events-none" />
                    <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-cyan-400/60 pointer-events-none" />

                    {/* Top Header on Tile: Big Letter & Orbit Badge */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      <div className="w-8 h-8 rounded-lg bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 flex items-center justify-center font-black font-mono text-white text-base shadow-lg shadow-black/80">
                        {tile.char}
                      </div>

                      {/* Variant Cycler Button (interactive) */}
                      {tile.variantsCount > 1 && (
                        <button
                          onClick={(e) => handleCycleVariant(i, e)}
                          className="pointer-events-auto px-1.5 py-0.5 rounded-md bg-slate-950/85 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-[10px] font-mono border border-cyan-500/40 transition-colors flex items-center gap-1 shadow-md"
                          title={`Switch scene (${tile.currentVariant + 1}/${tile.variantsCount})`}
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>{tile.currentVariant + 1}/{tile.variantsCount}</span>
                        </button>
                      )}
                    </div>

                    {/* Scanning Line Animation on Selected Tile */}
                    {isSelected && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 animate-scanline" />
                      </div>
                    )}

                    {/* Bottom Floating Bar on Tile */}
                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                      <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-200 truncate">
                        <FeatureIcon className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">{tile.item.location_name}</span>
                      </div>
                      <div className="text-[9px] font-mono text-cyan-400/80 truncate">
                        {tile.item.coordinates.split(' ')[0]}...
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. FLOATING CONTROL CAPSULE (EarthWatch AI Original Glassmorphic Bar) */}
        <div className="w-full flex flex-col items-center shrink-0 z-20 mt-2 mb-2">
          
          <div className="p-1.5 rounded-2xl glass-panel border border-cyan-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center gap-1.5 max-w-lg w-full bg-slate-950/90">
            
            {/* Input field */}
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                maxLength={16}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyWord()}
                placeholder="Type your name or secret phrase..."
                className="w-full px-4 py-2 bg-slate-900/80 text-white font-mono text-sm tracking-wider rounded-xl border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 outline-none uppercase placeholder-slate-500 shadow-inner"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
                {inputValue.length}/16
              </span>
            </div>

            {/* Enter Button */}
            <button
              onClick={handleApplyWord}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/25 shrink-0"
            >
              Generate
            </button>

            {/* Shuffle Variants Button */}
            <button
              onClick={handleShuffleAll}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors shrink-0"
              title="Shuffle alternate satellite scenes for each letter"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Export Poster Button */}
            <button
              onClick={handleExportPoster}
              disabled={isDownloading}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors shrink-0"
              title="Export High-Resolution Holographic Poster Card"
            >
              <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* 5. DEEP-DIVE GEOLOGICAL & SATELLITE INSPECTOR (For the currently selected letter) */}
          {activeItem && (
            <div className="w-full max-w-2xl mt-3 p-3.5 rounded-2xl glass-panel border border-cyan-500/25 bg-slate-950/80 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-left animate-in fade-in duration-150">
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/40">
                    LETTER {activeTile?.char}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${activeTile?.featureType.color}`}>
                    {activeTile?.featureType.label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Scene #{activeItem.variant + 1}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white truncate">
                  {activeItem.location_name}
                </h3>

                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-cyan-400">
                    {activeItem.coordinates}
                  </span>
                  <button
                    onClick={() => handleCopyCoords(activeItem.coordinates)}
                    className="p-1 text-slate-500 hover:text-white transition-colors"
                    title="Copy exact coordinates"
                  >
                    {copiedCoords ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed mt-1 line-clamp-2">
                  {generateGeologicalInsight(activeItem)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex md:flex-col items-center gap-2 shrink-0 w-full md:w-auto">
                <button
                  onClick={() => handleFlyTo(activeItem)}
                  className="flex-1 md:flex-none w-full px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
                  title="Fly EarthWatch 3D Cesium viewer to this landform"
                >
                  <Compass className="w-4 h-4 text-slate-950" />
                  <span>FLY 3D GLOBE</span>
                </button>

                {activeItem.google_maps_url && (
                  <a
                    href={activeItem.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none w-full px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 border border-slate-800 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                    <span>Google Maps</span>
                  </a>
                )}
              </div>

            </div>
          )}

        </div>

      </main>

      {/* 6. A–Z PLANETARY ARCHIVE DRAWER (All 72 Scenes with Category Filters) */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-150">
          <div className="w-full max-w-5xl max-h-[90vh] bg-slate-950 border border-cyan-500/30 rounded-3xl flex flex-col overflow-hidden text-slate-100 shadow-[0_0_80px_rgba(6,182,212,0.2)]">
            
            {/* Header */}
            <div className="p-4 md:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-white">
                    EarthWatch Planetary Alphabet Archive (A–Z)
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    72 natural satellite features cataloged across 54 countries and oceans
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsGalleryOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 text-xs font-mono font-bold transition-all shadow-sm group cursor-pointer"
                  title="Back to Name Speller"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to Speller</span>
                </button>

                <button
                  onClick={() => setIsGalleryOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Close Archive"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3 md:px-6 bg-slate-900/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={galleryFilter}
                  onChange={(e) => setGalleryFilter(e.target.value.toLowerCase())}
                  placeholder="Search letter, location, coordinates..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                {['all', 'rivers', 'glaciers', 'forests', 'geology'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setGalleryCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                      galleryCategory === cat
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of 72 Scenes */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {OFFICIAL_LANDSAT_ITEMS.filter((item) => {
                const matchQuery = !galleryFilter ||
                  item.letter.toLowerCase().includes(galleryFilter) ||
                  item.location_name.toLowerCase().includes(galleryFilter) ||
                  item.coordinates.toLowerCase().includes(galleryFilter);

                if (!matchQuery) return false;

                if (galleryCategory === 'rivers') {
                  return inferFeatureType(item.location_name).label.includes('River');
                }
                if (galleryCategory === 'glaciers') {
                  return inferFeatureType(item.location_name).label.includes('Glacier');
                }
                if (galleryCategory === 'forests') {
                  return inferFeatureType(item.location_name).label.includes('Forest');
                }
                if (galleryCategory === 'geology') {
                  return inferFeatureType(item.location_name).label.includes('Geological');
                }
                return true;
              }).map((item) => (
                <div
                  key={item.image_id}
                  onClick={() => {
                    setInputValue(prev => prev + item.letter.toLowerCase());
                    setActiveWord(prev => prev + item.letter.toLowerCase());
                    setIsGalleryOpen(false);
                  }}
                  className="group relative flex flex-col bg-slate-900 border border-slate-800 hover:border-cyan-400 rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-cyan-500/20"
                >
                  <div className="w-full aspect-[1/2.2] relative bg-slate-950 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.letter}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-slate-950/85 backdrop-blur-md border border-cyan-400/40 flex items-center justify-center font-bold text-white text-sm font-mono shadow-md">
                      {item.letter}
                    </div>
                  </div>

                  <div className="p-2">
                    <div className="font-bold text-xs text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                      {item.location_name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                      {item.coordinates}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
