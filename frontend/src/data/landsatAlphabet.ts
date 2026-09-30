export interface LandsatLetter {
  letter: string;
  name: string;
  location: string;
  country: string;
  latitude: number;
  longitude: number;
  satellite: string;
  instrument: string;
  feature_type: 'River' | 'Glacier' | 'Atoll / Reef' | 'Crater' | 'Dune / Desert' | 'Clouds / Atmospheric' | 'Volcanic' | 'Coastal';
  description: string;
  date_acquired: string;
  colors: {
    bgGradient: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  };
}

export const LANDSAT_ALPHABET: Record<string, LandsatLetter> = {
  A: {
    letter: 'A',
    name: 'Bowknot Bend on the Green River',
    location: 'Canyonlands, Utah',
    country: 'United States',
    latitude: 38.62,
    longitude: -110.02,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'River',
    description: 'The Green River loops tightly back on itself, forming a nearly complete hairpin circle connected by a narrow rock ridge that creates a natural capital letter A.',
    date_acquired: 'January 22, 2014',
    colors: {
      bgGradient: 'from-amber-950/80 via-slate-900/90 to-red-950/70',
      border: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300'
    }
  },
  B: {
    letter: 'B',
    name: 'Holla Bend Wildlife Refuge',
    location: 'Arkansas River, Arkansas',
    country: 'United States',
    latitude: 35.15,
    longitude: -93.07,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'River',
    description: 'An oxbow bend cut off from the main channel of the Arkansas River forms the twin bulbous loops of the letter B.',
    date_acquired: 'August 4, 2014',
    colors: {
      bgGradient: 'from-emerald-950/80 via-slate-900/90 to-cyan-950/70',
      border: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300'
    }
  },
  C: {
    letter: 'C',
    name: 'Curving Coral Atoll',
    location: 'Tuamotu Archipelago',
    country: 'French Polynesia',
    latitude: -14.05,
    longitude: -143.51,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Atoll / Reef',
    description: 'A crescent-shaped coral reef and sandy motu ringed by deep blue South Pacific waters forms an unmistakable curved letter C.',
    date_acquired: 'March 15, 2015',
    colors: {
      bgGradient: 'from-cyan-950/80 via-slate-900/90 to-blue-950/70',
      border: 'border-cyan-500/40',
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-300'
    }
  },
  D: {
    letter: 'D',
    name: 'Akimiski Island',
    location: 'James Bay, Nunavut',
    country: 'Canada',
    latitude: 53.02,
    longitude: -81.33,
    satellite: 'Landsat 7',
    instrument: 'Enhanced Thematic Mapper Plus (ETM+)',
    feature_type: 'Coastal',
    description: 'The eastern coast of Akimiski Island in James Bay traces a sweeping semi-circular shoreline, forming a natural capital letter D.',
    date_acquired: 'August 9, 2000',
    colors: {
      bgGradient: 'from-blue-950/80 via-slate-900/90 to-teal-950/70',
      border: 'border-blue-500/40',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-300'
    }
  },
  E: {
    letter: 'E',
    name: 'Phytoplankton Bloom',
    location: 'Chatham Rise, Pacific Ocean',
    country: 'New Zealand',
    latitude: -44.25,
    longitude: 174.12,
    satellite: 'Aqua',
    instrument: 'Moderate Resolution Imaging Spectroradiometer (MODIS)',
    feature_type: 'Coastal',
    description: 'Swirling oceanic currents draw microscopic algae and coccolithophores into three parallel horizontal marine ribbons, mimicking the letter E.',
    date_acquired: 'October 25, 2009',
    colors: {
      bgGradient: 'from-teal-950/80 via-slate-900/90 to-emerald-950/70',
      border: 'border-teal-500/40',
      badgeBg: 'bg-teal-500/20',
      badgeText: 'text-teal-300'
    }
  },
  F: {
    letter: 'F',
    name: 'Glacial Fjords of Southeastern Greenland',
    location: 'Sermersooq',
    country: 'Greenland',
    latitude: 63.85,
    longitude: -41.25,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Glacier',
    description: 'Two snow-covered lateral valleys branch off perpendicular to a primary coastal fjord, outlining the stem and crossbars of the letter F.',
    date_acquired: 'August 4, 2014',
    colors: {
      bgGradient: 'from-sky-950/80 via-slate-900/90 to-indigo-950/70',
      border: 'border-sky-500/40',
      badgeBg: 'bg-sky-500/20',
      badgeText: 'text-sky-300'
    }
  },
  G: {
    letter: 'G',
    name: 'Pinaki Atoll',
    location: 'Tuamotu Archipelago',
    country: 'French Polynesia',
    latitude: -19.39,
    longitude: -138.67,
    satellite: 'Astronaut Photography / Landsat 8',
    instrument: 'Nikon D4 / Landsat OLI',
    feature_type: 'Atoll / Reef',
    description: 'A circular coral atoll with an inward channel and reef spur creates the distinctive spur of a capital letter G.',
    date_acquired: 'April 20, 2001',
    colors: {
      bgGradient: 'from-cyan-950/80 via-slate-900/90 to-emerald-950/70',
      border: 'border-cyan-500/40',
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-300'
    }
  },
  H: {
    letter: 'H',
    name: 'Tian Shan Mountain Glaciers',
    location: 'Ysyk-Köl Region',
    country: 'Kyrgyzstan',
    latitude: 42.12,
    longitude: 79.88,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Glacier',
    description: 'Twin alpine valley glaciers running side-by-side are bridged by a transverse mountain saddle, producing a towering icy letter H.',
    date_acquired: 'August 30, 2014',
    colors: {
      bgGradient: 'from-indigo-950/80 via-slate-900/90 to-blue-950/70',
      border: 'border-indigo-500/40',
      badgeBg: 'bg-indigo-500/20',
      badgeText: 'text-indigo-300'
    }
  },
  I: {
    letter: 'I',
    name: 'Andaman Islands Coastal Barrier',
    location: 'Andaman Sea',
    country: 'India',
    latitude: 12.28,
    longitude: 93.85,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Coastal',
    description: 'A long, narrow north-south strip of coral reef and coastal barrier sand stretches straight as an arrow across the bay, looking like an I.',
    date_acquired: 'February 10, 2015',
    colors: {
      bgGradient: 'from-blue-950/80 via-slate-900/90 to-sky-950/70',
      border: 'border-blue-500/40',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-300'
    }
  },
  J: {
    letter: 'J',
    name: 'Trunk Reef Coral Hook',
    location: 'Great Barrier Reef, Queensland',
    country: 'Australia',
    latitude: -18.35,
    longitude: 146.85,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Atoll / Reef',
    description: 'A tropical reef curved at the southern end into a hooked crest rises above the Pacific coral platform, creating the letter J.',
    date_acquired: 'July 17, 2015',
    colors: {
      bgGradient: 'from-teal-950/80 via-slate-900/90 to-cyan-950/70',
      border: 'border-teal-500/40',
      badgeBg: 'bg-teal-500/20',
      badgeText: 'text-teal-300'
    }
  },
  K: {
    letter: 'K',
    name: 'Sirmilik Glacier Confluence',
    location: 'Baffin Island, Nunavut',
    country: 'Canada',
    latitude: 73.15,
    longitude: -80.05,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Glacier',
    description: 'Glacial tributaries converge into a main trunk at sharp angles, creating the unmistakable diagonal branches of the letter K.',
    date_acquired: 'August 3, 2015',
    colors: {
      bgGradient: 'from-slate-950 via-slate-900 to-indigo-950/70',
      border: 'border-slate-500/40',
      badgeBg: 'bg-slate-500/20',
      badgeText: 'text-slate-300'
    }
  },
  L: {
    letter: 'L',
    name: 'Snowpack on the St. Lawrence Lowlands',
    location: 'Quebec and New York State',
    country: 'Canada / USA',
    latitude: 45.32,
    longitude: -73.55,
    satellite: 'Aqua',
    instrument: 'Moderate Resolution Imaging Spectroradiometer (MODIS)',
    feature_type: 'Clouds / Atmospheric',
    description: 'Winter snow blankets two agricultural valleys at a clean 90-degree right angle along the international border, forming an L.',
    date_acquired: 'January 10, 2004',
    colors: {
      bgGradient: 'from-sky-950/80 via-slate-900/90 to-blue-950/70',
      border: 'border-sky-500/40',
      badgeBg: 'bg-sky-500/20',
      badgeText: 'text-sky-300'
    }
  },
  M: {
    letter: 'M',
    name: 'Tian Shan Mountain Glacial Peaks',
    location: 'Border of Kyrgyzstan & Xinjiang',
    country: 'Kyrgyzstan / China',
    latitude: 42.08,
    longitude: 80.12,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Glacier',
    description: 'Glaciers weaving through the glaciated jagged peaks of the Tian Shan mountain range delineate the double peaks of an M.',
    date_acquired: 'August 14, 2015',
    colors: {
      bgGradient: 'from-indigo-950/80 via-slate-900/90 to-purple-950/70',
      border: 'border-indigo-500/40',
      badgeBg: 'bg-indigo-500/20',
      badgeText: 'text-indigo-300'
    }
  },
  N: {
    letter: 'N',
    name: 'Pacific Ship Tracks',
    location: 'Northeastern Pacific Ocean',
    country: 'International Waters',
    latitude: 34.50,
    longitude: -125.20,
    satellite: 'Terra',
    instrument: 'Moderate Resolution Imaging Spectroradiometer (MODIS)',
    feature_type: 'Clouds / Atmospheric',
    description: 'Exhaust particles from trans-Pacific container vessels condense cloud droplets into narrow reflective ribbons crossing into an N.',
    date_acquired: 'March 4, 2009',
    colors: {
      bgGradient: 'from-blue-950/80 via-slate-900/90 to-slate-950',
      border: 'border-blue-500/40',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-300'
    }
  },
  O: {
    letter: 'O',
    name: 'Tenoumer Meteorite Impact Crater',
    location: 'Sahara Desert',
    country: 'Mauritania',
    latitude: 22.92,
    longitude: -6.18,
    satellite: 'Terra / Landsat 8',
    instrument: 'ASTER / OLI',
    feature_type: 'Crater',
    description: 'An ancient meteorite strike produced this 1.9-kilometer-wide, nearly circular crater rim rising 100 meters above the flat desert sand, forming a pristine O.',
    date_acquired: 'January 24, 2008',
    colors: {
      bgGradient: 'from-amber-950/90 via-slate-900/90 to-orange-950/70',
      border: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300'
    }
  },
  P: {
    letter: 'P',
    name: 'Mackenzie River Delta Loops',
    location: 'Northwest Territories',
    country: 'Canada',
    latitude: 68.90,
    longitude: -134.80,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'River',
    description: 'An Arctic river meander on the Arctic Ocean delta forms a straight channel stem crowned by a sweeping circular loop, creating a P.',
    date_acquired: 'August 4, 2015',
    colors: {
      bgGradient: 'from-emerald-950/80 via-slate-900/90 to-teal-950/70',
      border: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300'
    }
  },
  Q: {
    letter: 'Q',
    name: 'Lonar Meteorite Impact Crater',
    location: 'Buldhana District, Maharashtra',
    country: 'India',
    latitude: 19.98,
    longitude: 76.51,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Crater',
    description: 'A hypersaline meteorite impact crater lake in basaltic rock has a small stream cut through the southwestern lip, forming the tail of the letter Q.',
    date_acquired: 'November 29, 2014',
    colors: {
      bgGradient: 'from-emerald-950/80 via-slate-900/90 to-amber-950/70',
      border: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300'
    }
  },
  R: {
    letter: 'R',
    name: 'Lago Menendez Glacial Bay',
    location: 'Los Alerces National Park',
    country: 'Argentina',
    latitude: -42.72,
    longitude: -71.85,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Glacier',
    description: 'A glacier-fed Andean lake surrounded by temperate rainforests wraps around a forested peninsula, mimicking the loop and leg of the letter R.',
    date_acquired: 'January 20, 2015',
    colors: {
      bgGradient: 'from-teal-950/80 via-slate-900/90 to-cyan-950/70',
      border: 'border-teal-500/40',
      badgeBg: 'bg-teal-500/20',
      badgeText: 'text-teal-300'
    }
  },
  S: {
    letter: 'S',
    name: 'Swirling Atlantic Cloud Vortices',
    location: 'South Atlantic Ocean',
    country: 'International Waters',
    latitude: -20.10,
    longitude: -10.50,
    satellite: 'Terra',
    instrument: 'Moderate Resolution Imaging Spectroradiometer (MODIS)',
    feature_type: 'Clouds / Atmospheric',
    description: 'Marine stratocumulus clouds rolling over cooler ocean waters form clockwise and counter-clockwise gyres that trace a sinuous letter S.',
    date_acquired: 'April 29, 2009',
    colors: {
      bgGradient: 'from-sky-950/80 via-slate-900/90 to-blue-950/70',
      border: 'border-sky-500/40',
      badgeBg: 'bg-sky-500/20',
      badgeText: 'text-sky-300'
    }
  },
  T: {
    letter: 'T',
    name: 'Desert Highway Crossing',
    location: 'Abu Dhabi Desert',
    country: 'United Arab Emirates',
    latitude: 24.25,
    longitude: 55.45,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Dune / Desert',
    description: 'Linear development and agricultural strips along two perpendicular desert highways cut through golden dunes, forming a crisp letter T.',
    date_acquired: 'March 9, 2015',
    colors: {
      bgGradient: 'from-amber-950/80 via-slate-900/90 to-yellow-950/70',
      border: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300'
    }
  },
  U: {
    letter: 'U',
    name: 'Goosenecks of the San Juan River',
    location: 'Goosenecks State Park, Utah',
    country: 'United States',
    latitude: 37.17,
    longitude: -109.92,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'River',
    description: 'Over millions of years, the San Juan River carved a canyon 300 meters deep into the Colorado Plateau in a series of sweeping U-turns.',
    date_acquired: 'May 9, 2014',
    colors: {
      bgGradient: 'from-orange-950/80 via-slate-900/90 to-red-950/70',
      border: 'border-orange-500/40',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-300'
    }
  },
  V: {
    letter: 'V',
    name: 'Ash Plumes on Shiveluch Volcano',
    location: 'Kamchatka Peninsula',
    country: 'Russia',
    latitude: 56.65,
    longitude: 161.36,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Volcanic',
    description: 'Dark volcanic ash deposits over pristine Siberian snowfields spread down two divergent mountain ridges, etching a sharp V across the white peaks.',
    date_acquired: 'March 23, 2015',
    colors: {
      bgGradient: 'from-rose-950/80 via-slate-900/90 to-slate-950',
      border: 'border-rose-500/40',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-300'
    }
  },
  W: {
    letter: 'W',
    name: 'Red Sea Dust Plumes',
    location: 'Red Sea Coast',
    country: 'Saudi Arabia / Sudan',
    latitude: 19.20,
    longitude: 39.50,
    satellite: 'Terra',
    instrument: 'Moderate Resolution Imaging Spectroradiometer (MODIS)',
    feature_type: 'Clouds / Atmospheric',
    description: 'Strong desert winds blow multiple parallel streamers of Saharan mineral dust across the Red Sea, converging into a billowing letter W.',
    date_acquired: 'July 15, 2009',
    colors: {
      bgGradient: 'from-amber-950/80 via-slate-900/90 to-cyan-950/70',
      border: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300'
    }
  },
  X: {
    letter: 'X',
    name: 'Glacial Confluence on Leidy Glacier',
    location: 'Northwest Greenland',
    country: 'Greenland',
    latitude: 77.10,
    longitude: -66.80,
    satellite: 'Landsat 8',
    instrument: 'Operational Land Imager (OLI)',
    feature_type: 'Glacier',
    description: 'Lateral moraines and ice flow lines from two crossing ice streams create a stark white and blue letter X against the Arctic Nunataks.',
    date_acquired: 'August 7, 2015',
    colors: {
      bgGradient: 'from-blue-950/80 via-slate-900/90 to-sky-950/70',
      border: 'border-blue-500/40',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-300'
    }
  },
  Y: {
    letter: 'Y',
    name: 'Ugab River Folded Carbonates',
    location: 'Damaraland, Kunene',
    country: 'Namibia',
    latitude: -20.95,
    longitude: 14.15,
    satellite: 'Terra',
    instrument: 'ASTER (Advanced Spaceborne Thermal Emission and Reflection Radiometer)',
    feature_type: 'River',
    description: 'The ephemeral Ugab River cuts deeply through folded Neoproterozoic rock layers in the Namib Desert, carving a textbook letter Y.',
    date_acquired: 'December 25, 2000',
    colors: {
      bgGradient: 'from-yellow-950/80 via-slate-900/90 to-amber-950/70',
      border: 'border-yellow-500/40',
      badgeBg: 'bg-yellow-500/20',
      badgeText: 'text-yellow-300'
    }
  },
  Z: {
    letter: 'Z',
    name: 'Wildfire Smoke Vortex',
    location: 'Northwest Territories',
    country: 'Canada',
    latitude: 64.20,
    longitude: -118.50,
    satellite: 'Aqua',
    instrument: 'Moderate Resolution Imaging Spectroradiometer (MODIS)',
    feature_type: 'Clouds / Atmospheric',
    description: 'Thick smoke plumes from summer boreal forest fires drift into an atmospheric wind shear, creating a sharp zig-zag letter Z across Great Bear Lake.',
    date_acquired: 'July 11, 2012',
    colors: {
      bgGradient: 'from-rose-950/80 via-slate-900/90 to-orange-950/70',
      border: 'border-rose-500/40',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-300'
    }
  }
};
