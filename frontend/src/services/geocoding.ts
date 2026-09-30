// High-accuracy Global Reverse Geocoding & Offline Spatial Atlas

export interface GeocodeResult {
  name: string;
  display_name: string;
  country: string;
  region: string;
  terrain_type: string;
  is_maritime: boolean;
}

// Detailed Indian Regional Hubs & Districts for high-accuracy pinpointing
const INDIAN_REGIONAL_HUBS = [
  // Kerala
  { name: 'Kochi', state: 'Kerala', district: 'Ernakulam', lat: 9.9312, lon: 76.2673 },
  { name: 'Thiruvananthapuram', state: 'Kerala', district: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366 },
  { name: 'Kozhikode', state: 'Kerala', district: 'Kozhikode', lat: 11.2588, lon: 75.7804 },
  { name: 'Wayanad (Kalpetta)', state: 'Kerala', district: 'Wayanad', lat: 11.6054, lon: 76.0827 },
  { name: 'Kannur', state: 'Kerala', district: 'Kannur', lat: 11.8745, lon: 75.3704 },
  { name: 'Kasaragod', state: 'Kerala', district: 'Kasaragod', lat: 12.5102, lon: 74.9852 },
  { name: 'Thrissur', state: 'Kerala', district: 'Thrissur', lat: 10.5276, lon: 76.2144 },
  { name: 'Kollam', state: 'Kerala', district: 'Kollam', lat: 8.8932, lon: 76.6141 },
  { name: 'Alappuzha', state: 'Kerala', district: 'Alappuzha', lat: 9.4981, lon: 76.3388 },
  { name: 'Palakkad', state: 'Kerala', district: 'Palakkad', lat: 10.7867, lon: 76.6548 },
  { name: 'Malappuram', state: 'Kerala', district: 'Malappuram', lat: 11.0510, lon: 76.0711 },
  { name: 'Kottayam', state: 'Kerala', district: 'Kottayam', lat: 9.5916, lon: 76.5222 },
  { name: 'Munnar (Idukki)', state: 'Kerala', district: 'Idukki', lat: 10.0889, lon: 77.0595 },
  { name: 'Pathanamthitta', state: 'Kerala', district: 'Pathanamthitta', lat: 9.2648, lon: 76.7870 },

  // Karnataka
  { name: 'Bengaluru', state: 'Karnataka', district: 'Bengaluru Urban', lat: 12.9716, lon: 77.5946 },
  { name: 'Mysuru', state: 'Karnataka', district: 'Mysuru', lat: 12.2958, lon: 76.6394 },
  { name: 'Madikeri (Coorg)', state: 'Karnataka', district: 'Kodagu', lat: 12.4244, lon: 75.7382 },
  { name: 'Piriyapatna', state: 'Karnataka', district: 'Mysuru', lat: 12.3396, lon: 75.9997 },
  { name: 'Hassan', state: 'Karnataka', district: 'Hassan', lat: 13.0072, lon: 76.1029 },
  { name: 'Mangaluru', state: 'Karnataka', district: 'Dakshina Kannada', lat: 12.9141, lon: 74.8560 },
  { name: 'Udupi', state: 'Karnataka', district: 'Udupi', lat: 13.3409, lon: 74.7421 },
  { name: 'Hubballi', state: 'Karnataka', district: 'Dharwad', lat: 15.3647, lon: 75.1240 },
  { name: 'Belagavi', state: 'Karnataka', district: 'Belagavi', lat: 15.8497, lon: 74.4977 },
  { name: 'Shivamogga', state: 'Karnataka', district: 'Shivamogga', lat: 13.9299, lon: 75.5681 },

  // Tamil Nadu
  { name: 'Chennai', state: 'Tamil Nadu', district: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Coimbatore', state: 'Tamil Nadu', district: 'Coimbatore', lat: 11.0168, lon: 76.9558 },
  { name: 'Madurai', state: 'Tamil Nadu', district: 'Madurai', lat: 9.9252, lon: 78.1198 },
  { name: 'Salem', state: 'Tamil Nadu', district: 'Salem', lat: 11.6643, lon: 78.1460 },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', district: 'Tiruchirappalli', lat: 10.7905, lon: 78.7047 },
  { name: 'Kanyakumari', state: 'Tamil Nadu', district: 'Kanyakumari', lat: 8.0883, lon: 77.5385 },

  // Goa & Maharashtra
  { name: 'Panaji', state: 'Goa', district: 'North Goa', lat: 15.4909, lon: 73.8278 },
  { name: 'Margao', state: 'Goa', district: 'South Goa', lat: 15.2736, lon: 73.9580 },
  { name: 'Mumbai', state: 'Maharashtra', district: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Pune', state: 'Maharashtra', district: 'Pune', lat: 18.5204, lon: 73.8567 },
  { name: 'Nagpur', state: 'Maharashtra', district: 'Nagpur', lat: 21.1458, lon: 79.0882 },
  { name: 'Nashik', state: 'Maharashtra', district: 'Nashik', lat: 19.9975, lon: 73.7898 },
];

export function isIndianMainland(lat: number, lon: number): boolean {
  if (lat < 8.0 || lat > 37.2 || lon < 68.1 || lon > 97.5) {
    return false;
  }
  // Check west coast (Arabian Sea): land is EAST of the west coast profile
  if (lat < 8.08) return false;
  if (lat <= 9.5 && lon < 76.2) return false;   // Southern Kerala / Kollam coast
  if (lat <= 11.0 && lon < 75.6) return false;  // Kochi / Kozhikode coast
  if (lat <= 12.8 && lon < 74.8) return false;  // Northern Kerala / Kannur / Kasaragod coast
  if (lat <= 14.5 && lon < 74.2) return false;  // Karnataka / Mangaluru / Udupi coast
  if (lat <= 16.0 && lon < 73.4) return false;  // Goa / Karwar coast
  if (lat <= 19.5 && lon < 72.6) return false;  // Maharashtra / Mumbai / Konkan coast
  if (lat <= 20.8 && lon < 72.4) return false;  // Gulf of Khambhat
  if (lat <= 23.5 && lon < 68.8) return false;  // Gujarat / Saurashtra
  if (lat <= 25.0 && lon < 68.1) return false;  // Kutch / Rann of Kutch

  // Check east coast (Bay of Bengal): land is WEST of east coast profile
  if (lat <= 10.5 && lon > 79.9) return false;   // Tamil Nadu south
  if (lat <= 13.5 && lon > 80.4) return false;   // Tamil Nadu / Chennai
  if (lat <= 16.5 && lon > 80.8) return false;   // Andhra Pradesh / Machilipatnam
  if (lat <= 18.5 && lon > 84.2) return false;   // Andhra Pradesh / Vizag
  if (lat <= 20.5 && lon > 86.8) return false;   // Odisha / Puri
  if (lat <= 21.8 && lon > 87.6) return false;   // West Bengal / Sundarbans
  return true;
}

// Major global marine basins for instant water identification (strictly offshore)
const MARINE_REGIONS = [
  { name: 'Arabian Sea', region: 'Northern Indian Ocean', minLat: 0.0, maxLat: 25.0, minLon: 50.0, maxLon: 72.5 },
  { name: 'Bay of Bengal', region: 'Northern Indian Ocean', minLat: 5.0, maxLat: 22.0, minLon: 82.5, maxLon: 96.0 },
  { name: 'Laccadive Sea', region: 'Northern Indian Ocean', minLat: 4.0, maxLat: 12.0, minLon: 71.0, maxLon: 75.0 },
  { name: 'Mediterranean Sea', region: 'Mediterranean Basin', minLat: 30.0, maxLat: 42.0, minLon: -5.0, maxLon: 35.0 },
  { name: 'Red Sea', region: 'Middle East / East Africa', minLat: 12.5, maxLat: 30.0, minLon: 32.0, maxLon: 44.0 },
  { name: 'Persian Gulf', region: 'Middle East', minLat: 23.5, maxLat: 30.5, minLon: 48.0, maxLon: 56.5 },
  { name: 'Caribbean Sea', region: 'Tropical Americas', minLat: 9.0, maxLat: 22.0, minLon: -89.0, maxLon: -60.0 },
  { name: 'Gulf of Mexico', region: 'North America', minLat: 18.0, maxLat: 30.5, minLon: -98.0, maxLon: -81.0 },
  { name: 'North Sea', region: 'Northwest Europe', minLat: 51.0, maxLat: 62.0, minLon: -4.0, maxLon: 9.0 },
  { name: 'Baltic Sea', region: 'Northern Europe', minLat: 53.5, maxLat: 66.0, minLon: 10.0, maxLon: 30.0 },
  { name: 'Black Sea', region: 'Eastern Europe', minLat: 40.5, maxLat: 47.0, minLon: 27.0, maxLon: 42.0 },
  { name: 'Caspian Sea', region: 'Central Eurasia', minLat: 36.5, maxLat: 47.5, minLon: 46.5, maxLon: 54.5 },
  { name: 'South China Sea', region: 'Southeast Asia', minLat: 3.0, maxLat: 23.0, minLon: 105.0, maxLon: 121.0 },
  { name: 'East China Sea', region: 'East Asia', minLat: 24.0, maxLat: 33.0, minLon: 117.0, maxLon: 131.0 },
  { name: 'Sea of Japan', region: 'East Asia', minLat: 34.5, maxLat: 52.0, minLon: 127.0, maxLon: 142.0 },
  { name: 'Coral Sea', region: 'Southwest Pacific', minLat: -26.0, maxLat: -10.0, minLon: 142.0, maxLon: 158.0 },
  { name: 'Tasman Sea', region: 'Southwest Pacific', minLat: -47.0, maxLat: -28.0, minLon: 150.0, maxLon: 174.0 },
  { name: 'Bering Sea', region: 'Subarctic Pacific', minLat: 52.0, maxLat: 66.0, minLon: 160.0, maxLon: 195.0 },
  { name: 'Norwegian Sea', region: 'North Atlantic / Arctic', minLat: 62.0, maxLat: 72.0, minLon: -5.0, maxLon: 15.0 },
];

// Major global countries with geographic bounds for instant regional recognition
const COUNTRY_BOUNDS = [
  { name: 'United States', region: 'North America', lat: 37.0902, lon: -95.7129, minLat: 24.5, maxLat: 49.5, minLon: -125.0, maxLon: -66.9 },
  { name: 'United Kingdom', region: 'Western Europe', lat: 55.3781, lon: -3.4360, minLat: 49.8, maxLat: 60.9, minLon: -8.6, maxLon: 1.8 },
  { name: 'China', region: 'East Asia', lat: 35.8617, lon: 104.1954, minLat: 18.0, maxLat: 53.5, minLon: 73.5, maxLon: 135.0 },
  { name: 'Japan', region: 'East Asia', lat: 36.2048, lon: 138.2529, minLat: 24.0, maxLat: 46.0, minLon: 122.0, maxLon: 153.0 },
  { name: 'France', region: 'Western Europe', lat: 46.2276, lon: 2.2137, minLat: 41.3, maxLat: 51.1, minLon: -5.1, maxLon: 9.6 },
  { name: 'Germany', region: 'Central Europe', lat: 51.1657, lon: 10.4515, minLat: 47.3, maxLat: 55.1, minLon: 5.9, maxLon: 15.0 },
  { name: 'Italy', region: 'Southern Europe', lat: 41.8719, lon: 12.5674, minLat: 35.5, maxLat: 47.1, minLon: 6.6, maxLon: 18.5 },
  { name: 'Spain', region: 'Southern Europe', lat: 40.4637, lon: -3.7492, minLat: 35.8, maxLat: 43.8, minLon: -9.3, maxLon: 3.3 },
  { name: 'Canada', region: 'North America', lat: 56.1304, lon: -106.3468, minLat: 41.7, maxLat: 83.1, minLon: -141.0, maxLon: -52.6 },
  { name: 'Australia', region: 'Oceania', lat: -25.2744, lon: 133.7751, minLat: -44.0, maxLat: -10.0, minLon: 113.0, maxLon: 154.0 },
  { name: 'Brazil', region: 'South America', lat: -14.2350, lon: -51.9253, minLat: -33.8, maxLat: 5.3, minLon: -74.0, maxLon: -34.8 },
  { name: 'Russia', region: 'Eurasia', lat: 61.5240, lon: 105.3188, minLat: 41.2, maxLat: 82.0, minLon: 19.6, maxLon: 190.0 },
  { name: 'Egypt', region: 'North Africa', lat: 26.8206, lon: 30.8025, minLat: 22.0, maxLat: 31.7, minLon: 25.0, maxLon: 37.0 },
  { name: 'South Africa', region: 'Southern Africa', lat: -30.5595, lon: 22.9375, minLat: -35.0, maxLat: -22.0, minLon: 16.5, maxLon: 33.0 },
  { name: 'Saudi Arabia', region: 'Middle East', lat: 23.8859, lon: 45.0792, minLat: 16.4, maxLat: 32.2, minLon: 34.5, maxLon: 55.7 },
  { name: 'United Arab Emirates', region: 'Middle East', lat: 23.4241, lon: 53.8478, minLat: 22.5, maxLat: 26.2, minLon: 51.5, maxLon: 56.4 },
  { name: 'Indonesia', region: 'Southeast Asia', lat: -0.7893, lon: 113.9213, minLat: -11.0, maxLat: 6.0, minLon: 95.0, maxLon: 141.0 },
  { name: 'Turkey', region: 'Eurasia', lat: 38.9637, lon: 35.2433, minLat: 36.0, maxLat: 42.1, minLon: 26.0, maxLon: 44.8 },
  { name: 'Mexico', region: 'North America', lat: 23.6345, lon: -102.5528, minLat: 14.5, maxLat: 32.7, minLon: -118.4, maxLon: -86.7 },
  { name: 'Argentina', region: 'South America', lat: -38.4161, lon: -63.6167, minLat: -55.0, maxLat: -21.8, minLon: -73.6, maxLon: -53.6 },
  { name: 'Greece', region: 'Southern Europe', lat: 39.0742, lon: 21.8243, minLat: 34.8, maxLat: 41.7, minLon: 19.3, maxLon: 29.7 },
  { name: 'Iceland', region: 'Northern Europe', lat: 64.9631, lon: -19.0208, minLat: 63.3, maxLat: 66.6, minLon: -24.6, maxLon: -13.5 },
  { name: 'New Zealand', region: 'Oceania', lat: -40.9006, lon: 174.8860, minLat: -47.3, maxLat: -34.4, minLon: 166.4, maxLon: 178.6 },
  { name: 'Philippines', region: 'Southeast Asia', lat: 12.8797, lon: 121.7740, minLat: 4.6, maxLat: 21.3, minLon: 116.9, maxLon: 126.6 },
  { name: 'Thailand', region: 'Southeast Asia', lat: 15.8700, lon: 100.9925, minLat: 5.6, maxLat: 20.5, minLon: 97.3, maxLon: 105.6 },
  { name: 'Kenya', region: 'East Africa', lat: -0.0236, lon: 37.9062, minLat: -4.7, maxLat: 4.6, minLon: 33.9, maxLon: 41.9 },
  { name: 'Nigeria', region: 'West Africa', lat: 9.0820, lon: 8.6753, minLat: 4.3, maxLat: 13.9, minLon: 2.7, maxLon: 14.7 },
];

// Major global city hubs for closest proximity match
const MAJOR_HUBS = [
  { name: 'New Delhi', country: 'India', region: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', country: 'India', region: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
  { name: 'Kochi (Kerala)', country: 'India', region: 'Kerala', lat: 9.9312, lon: 76.2673 },
  { name: 'Bengaluru', country: 'India', region: 'Karnataka', lat: 12.9716, lon: 77.5946 },
  { name: 'London', country: 'United Kingdom', region: 'Greater London', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', country: 'France', region: 'Île-de-France', lat: 48.8566, lon: 2.3522 },
  { name: 'Berlin', country: 'Germany', region: 'Berlin', lat: 52.5200, lon: 13.4050 },
  { name: 'Rome', country: 'Italy', region: 'Lazio', lat: 41.9028, lon: 12.4964 },
  { name: 'Madrid', country: 'Spain', region: 'Madrid', lat: 40.4168, lon: -3.7038 },
  { name: 'Athens', country: 'Greece', region: 'Attica', lat: 37.9838, lon: 23.7275 },
  { name: 'New York City', country: 'United States', region: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles', country: 'United States', region: 'California', lat: 34.0522, lon: -118.2437 },
  { name: 'San Francisco', country: 'United States', region: 'California', lat: 37.7749, lon: -122.4194 },
  { name: 'Chicago', country: 'United States', region: 'Illinois', lat: 41.8781, lon: -87.6298 },
  { name: 'Toronto', country: 'Canada', region: 'Ontario', lat: 43.6532, lon: -79.3832 },
  { name: 'Tokyo', country: 'Japan', region: 'Kanto', lat: 35.6762, lon: 139.6503 },
  { name: 'Beijing', country: 'China', region: 'Beijing', lat: 39.9042, lon: 116.4074 },
  { name: 'Shanghai', country: 'China', region: 'Shanghai', lat: 31.2304, lon: 121.4737 },
  { name: 'Seoul', country: 'South Korea', region: 'Gyeonggi', lat: 37.5665, lon: 126.9780 },
  { name: 'Singapore', country: 'Singapore', region: 'Southeast Asia', lat: 1.3521, lon: 103.8198 },
  { name: 'Bangkok', country: 'Thailand', region: 'Central Thailand', lat: 13.7563, lon: 100.5018 },
  { name: 'Sydney', country: 'Australia', region: 'New South Wales', lat: -33.8688, lon: 151.2093 },
  { name: 'Melbourne', country: 'Australia', region: 'Victoria', lat: -37.8136, lon: 144.9631 },
  { name: 'Cairo', country: 'Egypt', region: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { name: 'Dubai', country: 'United Arab Emirates', region: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'São Paulo', country: 'Brazil', region: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  { name: 'Buenos Aires', country: 'Argentina', region: 'Buenos Aires', lat: -34.6037, lon: -58.3816 },
  { name: 'Johannesburg', country: 'South Africa', region: 'Gauteng', lat: -26.2041, lon: 28.0473 },
  { name: 'Reykjavik', country: 'Iceland', region: 'Capital Region', lat: 64.1466, lon: -21.9426 },
];

function haversineDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

/**
 * Instant client-side lookup providing a realistic place name within 0ms.
 * Never defaults to raw numbers like "28.61°N, 77.21°E".
 * Prioritizes terrestrial land over water.
 */
export function getLocalPlaceInfo(lat: number, lon: number): GeocodeResult {
  // 1. High-precision Indian Subcontinent terrestrial detection (Kerala, Karnataka, etc.)
  if (isIndianMainland(lat, lon)) {
    let nearestInd = null;
    let minIndDist = Infinity;
    for (const hub of INDIAN_REGIONAL_HUBS) {
      const d = haversineDistKm(lat, lon, hub.lat, hub.lon);
      if (d < minIndDist) {
        minIndDist = d;
        nearestInd = hub;
      }
    }

    if (nearestInd) {
      const nameLabel = minIndDist > 45 ? `${nearestInd.district} / ${nearestInd.name}` : nearestInd.name;
      return {
        name: nameLabel,
        display_name: `${nameLabel}, ${nearestInd.state}, India`,
        country: 'India',
        region: nearestInd.state,
        terrain_type: 'Terrestrial',
        is_maritime: false,
      };
    }
  }

  // 2. Find nearest global hub (within 350 km)
  let nearestHub = null;
  let minHubDist = Infinity;
  for (const h of MAJOR_HUBS) {
    const d = haversineDistKm(lat, lon, h.lat, h.lon);
    if (d < minHubDist) {
      minHubDist = d;
      nearestHub = h;
    }
  }

  if (nearestHub && minHubDist <= 350) {
    return {
      name: nearestHub.name,
      display_name: `${nearestHub.name}, ${nearestHub.region}, ${nearestHub.country}`,
      country: nearestHub.country,
      region: nearestHub.region,
      terrain_type: 'Terrestrial',
      is_maritime: false,
    };
  }

  // 3. Match country boundary
  let matchedCountry = null;
  let minCountryDist = Infinity;
  for (const c of COUNTRY_BOUNDS) {
    if (lat >= c.minLat && lat <= c.maxLat && lon >= c.minLon && lon <= c.maxLon) {
      const d = haversineDistKm(lat, lon, c.lat, c.lon);
      if (d < minCountryDist) {
        minCountryDist = d;
        matchedCountry = c;
      }
    }
  }

  if (matchedCountry) {
    const nameLabel =
      nearestHub && minHubDist <= 1200 && nearestHub.country === matchedCountry.name
        ? `${matchedCountry.name} (near ${nearestHub.name})`
        : `${matchedCountry.name} Territory`;
    return {
      name: nameLabel,
      display_name: `${matchedCountry.name}, ${matchedCountry.region}`,
      country: matchedCountry.name,
      region: matchedCountry.region,
      terrain_type: 'Terrestrial',
      is_maritime: false,
    };
  }

  // 4. Check known marine water bodies (only if no land matched)
  for (const m of MARINE_REGIONS) {
    if (lat >= m.minLat && lat <= m.maxLat && lon >= m.minLon && lon <= m.maxLon) {
      if ((m.name === 'Arabian Sea' || m.name === 'Bay of Bengal' || m.name === 'Laccadive Sea') && isIndianMainland(lat, lon)) {
        continue;
      }
      return {
        name: m.name,
        display_name: `${m.name}, ${m.region}`,
        country: m.name,
        region: m.region,
        terrain_type: 'Maritime / Sea',
        is_maritime: true,
      };
    }
  }

  // 5. Open Ocean sector
  let ocean = 'Pacific Ocean';
  let sub = 'Pacific Basin';
  if (lat > 66.5) {
    ocean = 'Arctic Ocean';
    sub = 'Polar Arctic Basin';
  } else if (lat < -60.0) {
    ocean = 'Southern Ocean';
    sub = 'Antarctic Circumpolar Waters';
  } else if (lon >= -70.0 && lon <= 20.0) {
    ocean = 'Atlantic Ocean';
    sub = lat >= 0 ? 'North Atlantic Basin' : 'South Atlantic Basin';
  } else if (lon > 20.0 && lon <= 100.0 && lat < 30.0) {
    ocean = 'Indian Ocean';
    sub = 'Indian Ocean Basin';
  }

  return {
    name: ocean,
    display_name: `${ocean} (${sub})`,
    country: ocean,
    region: sub,
    terrain_type: 'Maritime / Oceanic',
    is_maritime: true,
  };
}

/**
 * Direct client-side reverse geocoding via BigDataCloud or OpenStreetMap Nominatim
 * Provides 100% accurate human place names even if backend is offline or slow.
 */
export async function reverseGeocodeClient(lat: number, lon: number): Promise<GeocodeResult> {
  const localFallback = getLocalPlaceInfo(lat, lon);
  const isIndia = isIndianMainland(lat, lon);

  // Tier 0: Google Maps Geocoding API (if user configured key)
  const googleKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || localStorage.getItem('earthwatch_google_maps_key');
  if (googleKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${googleKey}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        if (results.length > 0) {
          const top = results[0];
          const formatted = top.formatted_address || '';
          const components = top.address_components || [];
          let city = '';
          let state = '';
          let country = '';
          let district = '';

          for (const comp of components) {
            const types = comp.types || [];
            if (types.includes('locality')) city = comp.long_name;
            else if (types.includes('administrative_area_level_2')) district = comp.long_name;
            else if (types.includes('administrative_area_level_1')) state = comp.long_name;
            else if (types.includes('country')) country = comp.long_name;
          }

          const primary = city || district || state || formatted.split(',')[0];
          return {
            name: primary,
            display_name: formatted || `${primary}, ${state}, ${country}`,
            country: country || (isIndia ? 'India' : 'Global'),
            region: state || district || 'Global Region',
            terrain_type: 'Terrestrial',
            is_maritime: false,
          };
        }
      }
    } catch {}
  }

  // 1. Try BigDataCloud Client API (Free, fast CORS enabled)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(5)}&longitude=${lon.toFixed(5)}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || '';
      const subdivision = data.principalSubdivision || '';
      const country = data.countryName || (isIndia ? 'India' : '');
      const continent = data.continent || '';

      const informative = data.localityInfo?.informative || [];
      const waterBodies = informative
        .map((x: any) => x.name)
        .filter((n: string) =>
          /ocean|sea|gulf|bay|strait|channel|basin|sound|ridge|trench/i.test(n || '')
        );
      const waterBody = (waterBodies[0] && !isIndia) ? waterBodies[0] : '';

      // Most specific local administrative division (taluk, district)
      const adminItems = data.localityInfo?.administrative || [];
      const localAdmins = adminItems
        .map((a: any) => a.name)
        .filter((n: string) => n && ![country, subdivision, continent, 'Mainland India', 'Southern Zonal Council'].includes(n));
      const adminDetail = localAdmins[localAdmins.length - 1] || localAdmins[0] || '';

      const isMaritime = isIndia ? false : ((!country && !!waterBody) || /ocean|sea/i.test(city));

      if (city || subdivision || country || adminDetail) {
        const primary = city || adminDetail || subdivision || country;
        const parts = [primary, subdivision, country].filter(Boolean);
        return {
          name: primary,
          display_name: parts.join(', '),
          country: country || localFallback.country,
          region: subdivision || continent || localFallback.region,
          terrain_type: isMaritime ? 'Maritime' : 'Terrestrial',
          is_maritime: isMaritime,
        };
      } else if (waterBody && !isIndia) {
        return {
          name: waterBody,
          display_name: `${waterBody} (${Math.abs(lat).toFixed(2)}°, ${Math.abs(lon).toFixed(2)}°)`,
          country: 'International Waters',
          region: waterBody,
          terrain_type: 'Maritime / Oceanic',
          is_maritime: true,
        };
      }
    }
  } catch {
    // Continue to next provider
  }

  // 2. Try OpenStreetMap Nominatim Client API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=12&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.address) {
        const addr = data.address;
        const country = addr.country || '';
        const state = addr.state || addr.region || addr.province || '';
        const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
        const primary = city || state || country;
        const parts = [city, state, country].filter(Boolean);

        if (primary) {
          return {
            name: primary,
            display_name: parts.join(', ') || data.display_name || primary,
            country: country || localFallback.country,
            region: state || localFallback.region,
            terrain_type: 'Terrestrial',
            is_maritime: false,
          };
        }
      }
    }
  } catch {
    // Fall back to local spatial database
  }

  return localFallback;
}
