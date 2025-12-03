import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse .NET JSON date format like /Date(208044000000+0200)/
function parseNetDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\/Date\((-?\d+)([+-]\d{4})?\)\//);
  if (match) {
    const timestamp = parseInt(match[1], 10);
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }
  // Already ISO format
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting representanter sync...');

    // Fetch current representatives from Stortinget API
    const response = await fetch('https://data.stortinget.no/eksport/dagensrepresentanter?format=json');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch representanter: ${response.status}`);
    }

    const data = await response.json();
    const representanter = data.dagensrepresentanter_liste || [];
    
    console.log(`Fetched ${representanter.length} representanter from Stortinget`);

    let inserted = 0;
    let updated = 0;

    for (const rep of representanter) {
      const personId = rep.id || rep.person?.id;
      if (!personId) continue;

      // Build image URL
      const bildeUrl = `https://data.stortinget.no/eksport/personbilde?personid=${personId}&storession=stor`;

      const representantData = {
        stortinget_id: personId,
        fornavn: rep.fornavn || rep.person?.fornavn || '',
        etternavn: rep.etternavn || rep.person?.etternavn || '',
        parti: rep.parti?.navn || rep.parti_navn || null,
        parti_forkortelse: rep.parti?.id || rep.parti_id || null,
        fylke: rep.fylke?.navn || rep.fylke_navn || null,
        kjonn: rep.kjoenn || rep.kjonn || null,
        fodt: parseNetDate(rep.foedselsdato),
        bilde_url: bildeUrl,
        epost: rep.epost || null,
        komite: rep.komite?.navn || null,
        er_aktiv: true,
        updated_at: new Date().toISOString(),
      };

      // Upsert representant
      const { error } = await supabase
        .from('representanter')
        .upsert(representantData, { onConflict: 'stortinget_id' });

      if (error) {
        console.error(`Error upserting ${representantData.fornavn} ${representantData.etternavn}:`, error);
      } else {
        // Check if it was insert or update by querying
        const { data: existing } = await supabase
          .from('representanter')
          .select('created_at, updated_at')
          .eq('stortinget_id', personId)
          .single();
        
        if (existing && existing.created_at === existing.updated_at) {
          inserted++;
        } else {
          updated++;
        }
      }
    }

    console.log(`Sync complete: ${inserted} inserted, ${updated} updated`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synkronisert ${representanter.length} representanter`,
        inserted,
        updated,
        total: representanter.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-representanter:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
