import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Category image mappings
const KATEGORI_IMAGES: Record<string, string> = {
  'telekommunikasjon': '/kategori-bilder/natur-4.jpg',
  'helse': '/kategori-bilder/natur-1.jpg',
  'utdanning': '/kategori-bilder/stortinget-1.jpg',
  'miljø': '/kategori-bilder/natur-2.jpg',
  'økonomi': '/kategori-bilder/stortinget-2.jpg',
  'samferdsel': '/kategori-bilder/fjord-1.jpg',
  'forsvar': '/kategori-bilder/nordlys-1.jpg',
  'justis': '/kategori-bilder/stortinget-3.jpg',
  'arbeid': '/kategori-bilder/slottet-1.jpg',
  'kultur': '/kategori-bilder/natur-3.jpg',
};

const DEFAULT_IMAGES = [
  '/kategori-bilder/stortinget-1.jpg',
  '/kategori-bilder/stortinget-2.jpg',
  '/kategori-bilder/stortinget-3.jpg',
  '/kategori-bilder/natur-1.jpg',
];

function getKategoriBadgeColor(kategori: string | null): string {
  const colors: Record<string, string> = {
    'helse': '#10B981',
    'utdanning': '#3B82F6',
    'miljø': '#22C55E',
    'økonomi': '#F59E0B',
    'forsvar': '#6366F1',
    'justis': '#EF4444',
    'samferdsel': '#8B5CF6',
    'arbeid': '#EC4899',
    'kultur': '#14B8A6',
    'telekommunikasjon': '#06B6D4',
  };
  return colors[kategori?.toLowerCase() || ''] || '#6B7280';
}

function getImageForKategori(kategori: string | null, id: string): string {
  if (kategori) {
    const key = kategori.toLowerCase();
    for (const [k, v] of Object.entries(KATEGORI_IMAGES)) {
      if (key.includes(k) || k.includes(key)) {
        return v;
      }
    }
  }
  // Use ID to pick a consistent default
  const idx = Math.abs(id.charCodeAt(0)) % DEFAULT_IMAGES.length;
  return DEFAULT_IMAGES[idx];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sakId = url.searchParams.get('id');
    const type = url.searchParams.get('type') || 'sak';
    const kategoriParam = url.searchParams.get('kategori');

    if (!sakId) {
      return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let title = '';
    let kategori = kategoriParam || '';
    let forCount = 0;
    let motCount = 0;
    let stortingetFor = 0;
    let stortingetMot = 0;
    let vedtatt = false;

    if (type === 'votering') {
      const { data: votering } = await supabase
        .from('voteringer')
        .select(`
          id,
          oppsummering,
          resultat_for,
          resultat_mot,
          vedtatt,
          stortinget_saker!inner(kort_tittel, tittel, kategori)
        `)
        .eq('id', sakId)
        .single();

      if (votering) {
        const sak = votering.stortinget_saker as any;
        title = sak?.kort_tittel || sak?.tittel || 'Votering';
        kategori = kategoriParam || sak?.kategori || '';
        stortingetFor = votering.resultat_for || 0;
        stortingetMot = votering.resultat_mot || 0;
        vedtatt = votering.vedtatt || false;

        const { count: forVotes } = await supabase
          .from('folke_stemmer')
          .select('*', { count: 'exact', head: true })
          .eq('votering_id', sakId)
          .eq('stemme', 'for');

        const { count: motVotes } = await supabase
          .from('folke_stemmer')
          .select('*', { count: 'exact', head: true })
          .eq('votering_id', sakId)
          .eq('stemme', 'mot');

        forCount = forVotes || 0;
        motCount = motVotes || 0;
      }
    } else {
      const { data: sak } = await supabase
        .from('stortinget_saker')
        .select('*')
        .eq('id', sakId)
        .single();

      if (sak) {
        title = sak.kort_tittel || sak.tittel;
        kategori = kategoriParam || sak.kategori || '';
        stortingetFor = sak.stortinget_votering_for || 0;
        stortingetMot = sak.stortinget_votering_mot || 0;
        vedtatt = stortingetFor > stortingetMot;

        const { count: forVotes } = await supabase
          .from('folke_stemmer')
          .select('*', { count: 'exact', head: true })
          .eq('sak_id', sakId)
          .eq('stemme', 'for');

        const { count: motVotes } = await supabase
          .from('folke_stemmer')
          .select('*', { count: 'exact', head: true })
          .eq('sak_id', sakId)
          .eq('stemme', 'mot');

        forCount = forVotes || 0;
        motCount = motVotes || 0;
      }
    }

    if (!title) {
      return new Response(JSON.stringify({ error: 'Case not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate percentages
    const folkTotal = forCount + motCount;
    const folkForPercent = folkTotal > 0 ? Math.round((forCount / folkTotal) * 100) : 50;
    const folkMotPercent = folkTotal > 0 ? Math.round((motCount / folkTotal) * 100) : 50;

    const stortingetTotal = stortingetFor + stortingetMot;
    const stortingetForPercent = stortingetTotal > 0 ? Math.round((stortingetFor / stortingetTotal) * 100) : 0;
    const stortingetMotPercent = stortingetTotal > 0 ? Math.round((stortingetMot / stortingetTotal) * 100) : 0;

    // Check agreement
    const hasStortingetVotes = stortingetTotal > 0;
    const hasFolkeVotes = folkTotal > 0;
    const stortingetMajority = stortingetFor > stortingetMot;
    const folkMajority = forCount >= motCount;
    const isAgreement = hasStortingetVotes && hasFolkeVotes && (stortingetMajority === folkMajority);

    // Truncate title
    const maxTitleLength = 90;
    const displayTitle = title.length > maxTitleLength 
      ? title.substring(0, maxTitleLength) + '...' 
      : title;

    // Get background image URL
    const imagePath = getImageForKategori(kategori, sakId);
    const appDomain = 'https://folketinget.lovable.app';
    const bgImageUrl = `${appDomain}${imagePath}`;

    // Badge color
    const badgeColor = getKategoriBadgeColor(kategori);

    // Agreement styling
    const agreementColor = isAgreement ? '#10B981' : '#EF4444';
    const agreementBg = isAgreement ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
    const agreementText = isAgreement ? 'ENIG' : 'UENIG';
    const agreementIcon = isAgreement ? '✓' : '⚠️';

    // Generate SVG with card-like design and background image
    const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(0,0,0,0.2)"/>
      <stop offset="40%" style="stop-color:rgba(0,0,0,0.4)"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.85)"/>
    </linearGradient>
    <clipPath id="cardClip">
      <rect x="40" y="30" width="1120" height="570" rx="28"/>
    </clipPath>
  </defs>
  
  <!-- Dark background -->
  <rect width="1200" height="630" fill="#0f0f0f"/>
  
  <!-- Card with background image -->
  <g clip-path="url(#cardClip)">
    <image href="${bgImageUrl}" x="40" y="30" width="1120" height="570" preserveAspectRatio="xMidYMid slice"/>
    <rect x="40" y="30" width="1120" height="570" fill="url(#cardOverlay)"/>
  </g>
  
  <!-- Card border -->
  <rect x="40" y="30" width="1120" height="570" rx="28" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
  
  <!-- Header badges -->
  <g transform="translate(80, 70)">
    <!-- Stortinget badge -->
    <rect x="0" y="0" width="150" height="38" rx="19" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="20" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="white">🏛️ Stortinget</text>
    
    ${hasStortingetVotes ? `
    <!-- Status badge -->
    <rect x="165" y="0" width="${vedtatt ? 110 : 125}" height="38" rx="19" fill="${vedtatt ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}"/>
    <text x="${vedtatt ? 195 : 200}" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600" fill="${vedtatt ? '#10B981' : '#EF4444'}">${vedtatt ? '✓ Vedtatt' : '✗ Forkastet'}</text>
    ` : `
    <rect x="165" y="0" width="155" height="38" rx="19" fill="rgba(59, 130, 246, 0.3)"/>
    <text x="185" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600" fill="#3B82F6">🗳️ Åpen for stemming</text>
    `}
  </g>
  
  <!-- Category badge -->
  ${kategori ? `
  <g transform="translate(80, 125)">
    <rect x="0" y="0" width="${Math.max(kategori.length * 11 + 28, 100)}" height="34" rx="17" fill="${badgeColor}"/>
    <text x="14" y="23" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="white">${kategori}</text>
  </g>
  ` : ''}
  
  <!-- Title -->
  <foreignObject x="80" y="${kategori ? '175' : '145'}" width="1040" height="130">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: 34px; font-weight: 700; color: white; line-height: 1.25; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
      ${displayTitle}
    </div>
  </foreignObject>
  
  <!-- Vote results section -->
  <g transform="translate(80, 340)">
    ${hasStortingetVotes ? `
    <!-- Stortinget votes -->
    <g>
      <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="500" fill="rgba(255,255,255,0.7)">🏛️ Stortinget</text>
      <rect x="0" y="15" width="480" height="22" rx="11" fill="rgba(255,255,255,0.15)"/>
      ${stortingetForPercent > 0 ? `<rect x="0" y="15" width="${stortingetForPercent * 4.8}" height="22" rx="11" fill="#10B981"/>` : ''}
      <text x="0" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#10B981">For ${stortingetForPercent}%</text>
      <text x="460" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#EF4444" text-anchor="end">Mot ${stortingetMotPercent}%</text>
    </g>
    ` : ''}
    
    <!-- Folket votes -->
    <g transform="translate(${hasStortingetVotes ? '560' : '0'}, 0)">
      <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="500" fill="rgba(255,255,255,0.7)">👥 Folket</text>
      <rect x="0" y="15" width="480" height="22" rx="11" fill="rgba(255,255,255,0.15)"/>
      ${folkForPercent > 0 ? `<rect x="0" y="15" width="${folkForPercent * 4.8}" height="22" rx="11" fill="#10B981"/>` : ''}
      <text x="0" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#10B981">For ${folkForPercent}%</text>
      <text x="460" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#EF4444" text-anchor="end">Mot ${folkMotPercent}%</text>
    </g>
  </g>
  
  <!-- Agreement indicator -->
  ${hasStortingetVotes && hasFolkeVotes ? `
  <g transform="translate(80, 460)">
    <rect x="0" y="0" width="340" height="44" rx="22" fill="${agreementBg}"/>
    <text x="22" y="29" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="${agreementColor}">${agreementIcon} Folket er ${agreementText} med Stortinget</text>
  </g>
  ` : ''}
  
  <!-- CTA Button -->
  <g transform="translate(880, 460)">
    <rect x="0" y="0" width="240" height="50" rx="25" fill="#3B82F6"/>
    <text x="120" y="33" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="white" text-anchor="middle">Stem på Folketinget</text>
  </g>
  
  <!-- Logo footer -->
  <g transform="translate(80, 535)">
    <rect x="0" y="0" width="36" height="36" rx="10" fill="#3B82F6"/>
    <text x="10" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="white">FT</text>
    <text x="46" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="white">Folketinget</text>
  </g>
  
  <!-- URL -->
  <text x="1120" y="555" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)" text-anchor="end">folketinget.lovable.app</text>
</svg>`;

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating OG image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
