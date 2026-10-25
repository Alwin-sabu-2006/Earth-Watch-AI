import { DisasterEvent } from '../types';

export interface HazardLifecycleInfo {
  timeAgoLabel: string;
  shortTimeAgo: string;
  formattedDate: string;
  lifecycleStage: string;
  operationalBadge: string;
  badgeColorClass: string;
  whyMonitoredRationale: string;
  ongoingSensors: string;
}

export function getHazardLifecycleInfo(event: DisasterEvent): HazardLifecycleInfo {
  // Compute approximate elapsed hours
  let elapsedHours = 36; // realistic baseline (1.5 days ago)

  if (event.detected_at) {
    const parsed = new Date(event.detected_at).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      const diffMs = Date.now() - parsed;
      if (diffMs > 0) {
        elapsedHours = Math.max(2, Math.round(diffMs / (1000 * 60 * 60)));
      }
    }
  }

  // Consistent deterministic offset for static seeded events if detected_at is missing/identical
  if (!event.is_live && event.id) {
    const charCodeSum = event.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    elapsedHours = 12 + (charCodeSum % 72); // spans between 12 hours and 3.5 days ago
  }

  // Format relative time strings
  let timeAgoLabel = '';
  let shortTimeAgo = '';
  if (elapsedHours < 24) {
    timeAgoLabel = `${elapsedHours} hours ago`;
    shortTimeAgo = `${elapsedHours}h ago`;
  } else {
    const days = Math.round(elapsedHours / 24);
    timeAgoLabel = days === 1 ? '1 day ago' : `${days} days ago`;
    shortTimeAgo = `${days}d ago`;
  }

  // Generate realistic historical calendar date
  const eventDate = new Date(Date.now() - elapsedHours * 3600 * 1000);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const type = (event.type || 'other').toLowerCase();

  // Determine realistic post-disaster operational lifecycle stage
  let lifecycleStage = '';
  let operationalBadge = '';
  let badgeColorClass = '';
  let whyMonitoredRationale = '';
  let ongoingSensors = '';

  switch (type) {
    case 'earthquake':
      if (elapsedHours < 24) {
        lifecycleStage = 'Main Shock Recorded • Rapid Aftershock Window Active';
        operationalBadge = 'AFTERSHOCK WATCH';
        badgeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      } else if (elapsedHours <= 72) {
        lifecycleStage = 'Post-Seismic Displacement • Ongoing Aftershock Surveillance';
        operationalBadge = 'SEISMIC SURVEY';
        badgeColorClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      } else {
        lifecycleStage = 'Coseismic Fault Rupture Mapping & Structural Assessment';
        operationalBadge = 'POST-EVENT AUDIT';
        badgeColorClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      }
      whyMonitoredRationale =
        'The main seismic shock occurred days prior. Continuous satellite SAR interferometry (Sentinel-1) and regional seismograph arrays actively monitor this epicenter to detect secondary fault slippage, micro-tremor migration, and coseismic ground displacement.';
      ongoingSensors = 'USGS Global Seismograph Network • Sentinel-1 InSAR • JMA Accel Sensors';
      break;

    case 'wildfire':
      if (elapsedHours < 18) {
        lifecycleStage = 'Thermal Perimeter Contained • Mop-Up Operations Underway';
        operationalBadge = 'CONTAINED 85%';
        badgeColorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      } else if (elapsedHours <= 72) {
        lifecycleStage = 'Post-Fire Smoldering Mop-Up • Burn Scar Severity Mapping';
        operationalBadge = 'BURN SCAR MAPPING';
        badgeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      } else {
        lifecycleStage = 'Thermal Cooldown Complete • Watershed Ash Runoff Monitoring';
        operationalBadge = 'RECOVERY PHASE';
        badgeColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      }
      whyMonitoredRationale =
        'Major flaming front has passed. Infrared radiometers (VIIRS / MODIS) and Landsat short-wave infrared remain targeted on this sector to scan for residual subsurface smoldering, spot rekindling along ridgelines, and vegetation burn severity indices.';
      ongoingSensors = 'NASA FIRMS VIIRS • Landsat 9 SWIR Band 7 • CAL FIRE Telemetry';
      break;

    case 'flood':
      if (elapsedHours < 24) {
        lifecycleStage = 'River Crest Crested • Saturated Catchment Inundation';
        operationalBadge = 'CREST PASSED';
        badgeColorClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      } else if (elapsedHours <= 72) {
        lifecycleStage = 'Post-Crest Runoff Drainage • Receding Waterline Tracking';
        operationalBadge = 'RECEDING WATERS';
        badgeColorClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      } else {
        lifecycleStage = 'Overland Water Evacuated • Alluvial Silt Deposit Assessment';
        operationalBadge = 'POST-FLOOD AUDIT';
        badgeColorClass = 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      }
      whyMonitoredRationale =
        'Peak torrential rainfall has ceased and river crest has moved downstream. Radar altimetry and optical sensors track receding floodplain waterlines, standing water pooling in agricultural depressions, and silt deposition along key transport bridges.';
      ongoingSensors = 'Copernicus Sentinel-1 SAR • GPM IMERG Rainfall • Local Catchment Gauges';
      break;

    case 'cyclone':
      if (elapsedHours < 24) {
        lifecycleStage = 'Post-Landfall Remnants • Inland Gale & Squall Precipitation';
        operationalBadge = 'LANDFALL PASSED';
        badgeColorClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      } else if (elapsedHours <= 72) {
        lifecycleStage = 'Dissipating Low Pressure System • Residual Floodwater Drainage';
        operationalBadge = 'DISSIPATING';
        badgeColorClass = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      } else {
        lifecycleStage = 'Storm Vortex Dissolved • Coastal Storm Surge Damage Inventory';
        operationalBadge = 'DAMAGE INVENTORY';
        badgeColorClass = 'bg-slate-500/20 text-slate-300 border-slate-500/40';
      }
      whyMonitoredRationale =
        'The cyclone made landfall days ago and its oceanic eyewall has dissipated into an inland depression. Orbital tracking remains active to map localized flash flooding from trailing rain bands, storm surge retreat along coastlines, and power grid restoration.';
      ongoingSensors = 'INSAT-3DR Thermal • Himawari-9 Multispectral • IMD Coastal Radar';
      break;

    case 'volcano':
      if (elapsedHours < 48) {
        lifecycleStage = 'Effusive Fissure Solidification • Continuous Degassing Plume';
        operationalBadge = 'DEGASSING PHASE';
        badgeColorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      } else {
        lifecycleStage = 'Post-Eruptive Decompression • Basaltic Thermal Cooling';
        operationalBadge = 'COOLING PHASE';
        badgeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      }
      whyMonitoredRationale =
        'Major eruptive fountains have stabilized into cooling basalt crust. Airborne and satellite ultraviolet spectrometers (Sentinel-5P TROPOMI) track atmospheric sulfur dioxide (SO2) dispersion and caldera magma recharge cycles.';
      ongoingSensors = 'Sentinel-5P TROPOMI • Sentinel-2 MSI Infrared • Local Borehole Tiltmeters';
      break;

    case 'heatwave':
      lifecycleStage = 'Persistent Anticyclonic Heat Dome • Thermal Stress Phase';
      operationalBadge = 'THERMAL ANOMALY';
      badgeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      whyMonitoredRationale =
        'A high-pressure ridge has trapped warm air masses over the territory over consecutive days. Sentinel-3 radiometers record surface temperature anomalies to quantify urban heat island effects and agricultural moisture deficit.';
      ongoingSensors = 'Copernicus Sentinel-3 SLSTR • Open-Meteo Synoptic Grid';
      break;

    default:
      lifecycleStage = 'Post-Incident Surveillance & Damage Inventory';
      operationalBadge = 'MONITORING';
      badgeColorClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      whyMonitoredRationale =
        'Incident occurred days prior. Environmental sensors maintain continuous observation to assess recovery progress, secondary hazards, and regional infrastructure stabilization.';
      ongoingSensors = 'EarthWatch Integrated Sensor Network';
      break;
  }

  return {
    timeAgoLabel,
    shortTimeAgo,
    formattedDate,
    lifecycleStage,
    operationalBadge,
    badgeColorClass,
    whyMonitoredRationale,
    ongoingSensors,
  };
}
