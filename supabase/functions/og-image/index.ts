import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sakId = url.searchParams.get('id');
    const type = url.searchParams.get('type') || 'sak'; // 'sak' or 'votering'

    if (!sakId) {
      return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch case data
    let title = '';
    let kategori = '';
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
        kategori = sak?.kategori || '';
        stortingetFor = votering.resultat_for || 0;
        stortingetMot = votering.resultat_mot || 0;
        vedtatt = votering.vedtatt || false;

        // Get public votes for this votering
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
        kategori = sak.kategori || '';
        stortingetFor = sak.stortinget_votering_for || 0;
        stortingetMot = sak.stortinget_votering_mot || 0;
        vedtatt = stortingetFor > stortingetMot;

        // Get public votes
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
    const folkForPercent = folkTotal > 0 ? Math.round((forCount / folkTotal) * 100) : 0;
    const folkMotPercent = folkTotal > 0 ? Math.round((motCount / folkTotal) * 100) : 0;

    const stortingetTotal = stortingetFor + stortingetMot;
    const stortingetForPercent = stortingetTotal > 0 ? Math.round((stortingetFor / stortingetTotal) * 100) : 0;

    // Truncate title if too long
    const maxTitleLength = 80;
    const displayTitle = title.length > maxTitleLength 
      ? title.substring(0, maxTitleLength) + '...' 
      : title;

    // Category badge color
    const getCategoryColor = (kat: string) => {
      switch (kat?.toLowerCase()) {
        case 'helse': return '#ef4444';
        case 'justis': return '#3b82f6';
        case 'økonomi': return '#f59e0b';
        case 'miljø': return '#22c55e';
        case 'utdanning': return '#8b5cf6';
        default: return '#6b7280';
      }
    };

    // Generate SVG OG Image (1200x630)
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#000000"/>
            <stop offset="100%" style="stop-color:#1a1a1a"/>
          </linearGradient>
          <linearGradient id="forGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#22c55e"/>
            <stop offset="100%" style="stop-color:#16a34a"/>
          </linearGradient>
          <linearGradient id="motGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#ef4444"/>
            <stop offset="100%" style="stop-color:#dc2626"/>
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Top border accent -->
        <rect width="1200" height="4" fill="#00c7be"/>
        
        <!-- Logo and Brand -->
        <g transform="translate(60, 50)">
          <rect width="56" height="56" rx="14" fill="#00c7be"/>
          <text x="28" y="38" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="white" text-anchor="middle">FS</text>
          <text x="76" y="38" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" fill="white">Folkets Storting</text>
        </g>
        
        <!-- Category Badge -->
        ${kategori ? `
        <g transform="translate(60, 130)">
          <rect width="${kategori.length * 12 + 32}" height="32" rx="16" fill="${getCategoryColor(kategori)}20"/>
          <text x="16" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="${getCategoryColor(kategori)}">${kategori.toUpperCase()}</text>
        </g>
        ` : ''}
        
        <!-- Title -->
        <text x="60" y="${kategori ? '200' : '170'}" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="700" fill="white">
          ${displayTitle.split('').map((char, i) => {
            if (i < displayTitle.length && i % 45 === 0 && i > 0) {
              return `</text><text x="60" y="${(kategori ? 200 : 170) + (Math.floor(i/45) * 52)}" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="700" fill="white">${char}`;
            }
            return char;
          }).join('')}
        </text>
        
        <!-- Folket Section -->
        <g transform="translate(60, 340)">
          <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#9ca3af">👥 FOLKET</text>
          
          <!-- Progress bar background -->
          <rect x="0" y="20" width="500" height="32" rx="16" fill="#262626"/>
          
          <!-- For bar -->
          ${folkForPercent > 0 ? `<rect x="0" y="20" width="${folkForPercent * 5}" height="32" rx="16" fill="url(#forGrad)"/>` : ''}
          
          <!-- Labels -->
          <text x="0" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#22c55e">✓ For ${folkForPercent}%</text>
          <text x="200" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#ef4444">✗ Mot ${folkMotPercent}%</text>
          ${folkTotal === 0 ? `<text x="0" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="#6b7280">Ingen stemmer ennå - stem selv!</text>` : ''}
        </g>
        
        <!-- Stortinget Section -->
        ${stortingetTotal > 0 ? `
        <g transform="translate(620, 340)">
          <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#9ca3af">🏛️ STORTINGET</text>
          
          <!-- Progress bar background -->
          <rect x="0" y="20" width="500" height="32" rx="16" fill="#262626"/>
          
          <!-- For bar -->
          ${stortingetForPercent > 0 ? `<rect x="0" y="20" width="${stortingetForPercent * 5}" height="32" rx="16" fill="url(#forGrad)"/>` : ''}
          
          <!-- Labels -->
          <text x="0" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#22c55e">For ${stortingetFor}</text>
          <text x="120" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#ef4444">Mot ${stortingetMot}</text>
          
          <!-- Vedtatt badge -->
          <rect x="260" y="58" width="${vedtatt ? 100 : 120}" height="28" rx="14" fill="${vedtatt ? '#22c55e20' : '#ef444420'}"/>
          <text x="${vedtatt ? 310 : 320}" y="78" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="${vedtatt ? '#22c55e' : '#ef4444'}" text-anchor="middle">${vedtatt ? 'VEDTATT' : 'FORKASTET'}</text>
        </g>
        ` : ''}
        
        <!-- Agreement/Disagreement indicator -->
        ${stortingetTotal > 0 && folkTotal > 0 ? `
        <g transform="translate(60, 480)">
          ${(folkForPercent > 50 && vedtatt) || (folkForPercent < 50 && !vedtatt) ? `
            <rect width="400" height="48" rx="24" fill="#22c55e20"/>
            <text x="200" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#22c55e" text-anchor="middle">✓ Folket er ENIG med Stortinget</text>
          ` : `
            <rect width="400" height="48" rx="24" fill="#ef444420"/>
            <text x="200" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#ef4444" text-anchor="middle">⚠️ Folket er UENIG med Stortinget</text>
          `}
        </g>
        ` : ''}
        
        <!-- CTA -->
        <g transform="translate(60, 560)">
          <rect width="240" height="48" rx="24" fill="#00c7be"/>
          <text x="120" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="white" text-anchor="middle">Stem selv →</text>
        </g>
        
        <!-- URL -->
        <text x="1140" y="600" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#6b7280" text-anchor="end">folkets-storting.no</text>
      </svg>
    `;

    // Return SVG as image
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