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

// Sessions to fetch historical representatives from
const SESSIONS = ['2021-2022', '2022-2023', '2023-2024', '2024-2025'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting representanter sync (including historical)...');

    // Track all representanter we process
    const processedIds = new Set<string>();
    let inserted = 0;
    let updated = 0;

    // First: Fetch current (active) representatives
    console.log('Fetching active representatives...');
    const activeResponse = await fetch('https://data.stortinget.no/eksport/dagensrepresentanter?format=json');
    
    if (activeResponse.ok) {
      const activeData = await activeResponse.json();
      const activeRepresentanter = activeData.dagensrepresentanter_liste || [];
      
      console.log(`Found ${activeRepresentanter.length} active representanter`);

      for (const rep of activeRepresentanter) {
        const personId = rep.id || rep.person?.id;
        if (!personId) continue;
        
        processedIds.add(personId);
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

        const { data: existing } = await supabase
          .from('representanter')
          .select('id')
          .eq('stortinget_id', personId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('representanter')
            .update(representantData)
            .eq('stortinget_id', personId);
          updated++;
        } else {
          await supabase
            .from('representanter')
            .insert(representantData);
          inserted++;
        }
      }
    }

    // Second: Fetch historical representatives from each session
    for (const sesjonId of SESSIONS) {
      console.log(`Fetching historical representatives from ${sesjonId}...`);
      
      try {
        const url = `https://data.stortinget.no/eksport/representanter?sesjonid=${sesjonId}&format=json`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.log(`Failed to fetch representanter for ${sesjonId}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const representanter = data.representanter_liste || [];
        
        console.log(`Found ${representanter.length} representanter from ${sesjonId}`);
        let sessionInserted = 0;

        for (const rep of representanter) {
          const personId = rep.id || rep.person?.id;
          if (!personId || processedIds.has(personId)) continue;
          
          processedIds.add(personId);
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
            er_aktiv: false, // Historical representatives are NOT active
            updated_at: new Date().toISOString(),
          };

          const { data: existing } = await supabase
            .from('representanter')
            .select('id')
            .eq('stortinget_id', personId)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('representanter')
              .insert(representantData);
            
            if (!error) {
              inserted++;
              sessionInserted++;
            }
          }
        }
        
        console.log(`Inserted ${sessionInserted} new historical reps from ${sesjonId}`);
        
        // Small delay between sessions
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (sessionError) {
        console.error(`Error processing session ${sesjonId}:`, sessionError);
      }
    }

    console.log(`Sync complete: ${inserted} inserted, ${updated} updated, ${processedIds.size} total`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synkronisert ${processedIds.size} representanter (inkl. historiske)`,
        inserted,
        updated,
        total: processedIds.size
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