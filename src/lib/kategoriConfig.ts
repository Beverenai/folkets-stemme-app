// Kategori configuration with gradients and images for Stem page backgrounds

export interface KategoriConfig {
  navn: string;
  gradient: string;
  bildeUrl: string;
}

// Norwegian parliament and nature images for different categories
export const KATEGORI_CONFIG: Record<string, KategoriConfig> = {
  'Justis': {
    navn: 'Justis',
    gradient: 'from-slate-900 via-blue-900 to-slate-950',
    bildeUrl: '/kategori-bilder/stortinget-1.jpg',
  },
  'Helse': {
    navn: 'Helse',
    gradient: 'from-emerald-900 via-teal-800 to-slate-950',
    bildeUrl: '/kategori-bilder/natur-1.jpg',
  },
  'Økonomi': {
    navn: 'Økonomi',
    gradient: 'from-amber-900 via-yellow-800 to-slate-950',
    bildeUrl: '/kategori-bilder/stortinget-2.jpg',
  },
  'Budsjett': {
    navn: 'Budsjett',
    gradient: 'from-indigo-900 via-purple-800 to-slate-950',
    bildeUrl: '/kategori-bilder/slottet-1.jpg',
  },
  'Miljø': {
    navn: 'Miljø',
    gradient: 'from-green-900 via-emerald-800 to-slate-950',
    bildeUrl: '/kategori-bilder/fjord-1.jpg',
  },
  'Arbeid': {
    navn: 'Arbeid',
    gradient: 'from-orange-900 via-red-800 to-slate-950',
    bildeUrl: '/kategori-bilder/natur-2.jpg',
  },
  'Sikkerhet': {
    navn: 'Sikkerhet',
    gradient: 'from-slate-900 via-zinc-800 to-slate-950',
    bildeUrl: '/kategori-bilder/stortinget-3.jpg',
  },
  'Innvandring': {
    navn: 'Innvandring',
    gradient: 'from-rose-900 via-pink-800 to-slate-950',
    bildeUrl: '/kategori-bilder/natur-3.jpg',
  },
  'Lovendring': {
    navn: 'Lovendring',
    gradient: 'from-blue-900 via-indigo-800 to-slate-950',
    bildeUrl: '/kategori-bilder/stortinget-1.jpg',
  },
  'Grunnlovsendring': {
    navn: 'Grunnlovsendring',
    gradient: 'from-red-900 via-amber-800 to-slate-950',
    bildeUrl: '/kategori-bilder/slottet-1.jpg',
  },
  'Telekommunikasjon': {
    navn: 'Telekommunikasjon',
    gradient: 'from-cyan-900 via-blue-800 to-slate-950',
    bildeUrl: '/kategori-bilder/natur-4.jpg',
  },
  'Skatt': {
    navn: 'Skatt',
    gradient: 'from-green-900 via-emerald-700 to-slate-950',
    bildeUrl: '/kategori-bilder/stortinget-2.jpg',
  },
  'Helse og arbeid': {
    navn: 'Helse og arbeid',
    gradient: 'from-teal-900 via-cyan-800 to-slate-950',
    bildeUrl: '/kategori-bilder/natur-1.jpg',
  },
  'Kommunal forvaltning': {
    navn: 'Kommunal forvaltning',
    gradient: 'from-violet-900 via-purple-800 to-slate-950',
    bildeUrl: '/kategori-bilder/stortinget-3.jpg',
  },
};

// Default/fallback images for categories without specific images
const DEFAULT_IMAGES = [
  '/kategori-bilder/stortinget-1.jpg',
  '/kategori-bilder/stortinget-2.jpg',
  '/kategori-bilder/stortinget-3.jpg',
  '/kategori-bilder/slottet-1.jpg',
  '/kategori-bilder/fjord-1.jpg',
  '/kategori-bilder/natur-1.jpg',
  '/kategori-bilder/natur-2.jpg',
  '/kategori-bilder/natur-3.jpg',
  '/kategori-bilder/natur-4.jpg',
  '/kategori-bilder/nordlys-1.jpg',
];

const DEFAULT_CONFIG: KategoriConfig = {
  navn: 'Politikk',
  gradient: 'from-slate-900 via-slate-800 to-slate-950',
  bildeUrl: '/kategori-bilder/stortinget-1.jpg',
};

/**
 * Get category config for a given category name
 * Falls back to default if category not found
 */
export function getKategoriConfig(kategori: string | null): KategoriConfig {
  if (!kategori) return DEFAULT_CONFIG;
  return KATEGORI_CONFIG[kategori] || DEFAULT_CONFIG;
}

/**
 * Get a random default image for variety
 * Uses sak ID to ensure consistent image per sak
 */
export function getRandomDefaultImage(sakId?: string): string {
  if (sakId) {
    // Use sak ID to get consistent image
    const hash = sakId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return DEFAULT_IMAGES[hash % DEFAULT_IMAGES.length];
  }
  return DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)];
}

/**
 * Get image URL for a sak - uses category image or random default
 */
export function getSakBildeUrl(kategori: string | null, sakId?: string): string {
  const config = getKategoriConfig(kategori);
  // For 'annet' category or unknown, use random default based on sakId
  if (!kategori || kategori === 'annet') {
    return getRandomDefaultImage(sakId);
  }
  return config.bildeUrl;
}
