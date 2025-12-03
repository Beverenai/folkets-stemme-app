import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Historical sessions to sync (4 years of data)
const HISTORICAL_SESSIONS = [
  '2021-2022',
  '2022-2023',
  '2023-2024',
  '2024-2025',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🏛️ Starting historical sync for sessions:', HISTORICAL_SESSIONS);

    // Create sync log entry
    const startTime = Date.now();
    const { data: logEntry, error: logError } = await supabase
      .from('sync_log')
      .insert({
        source: 'sync-historikk',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create sync log:', logError);
    }

    const results = {
      sakerSynced: 0,
      voteringerSynced: 0,
      errors: [] as string[],
    };

    // Step 1: Sync saker for all historical sessions
    console.log('📋 Step 1: Syncing saker from Stortinget API...');
    
    for (const session of HISTORICAL_SESSIONS) {
      try {
        console.log(`Fetching saker for session: ${session}`);
        
        const response = await fetch(
          `https://simgnodjhnpvyqqhwykg.supabase.co/functions/v1/sync-stortinget`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({ session }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          results.sakerSynced += (data.inserted || 0) + (data.updated || 0);
          console.log(`Session ${session}: ${data.inserted} inserted, ${data.updated} updated`);
        } else {
          results.errors.push(`Failed to sync session ${session}: ${response.status}`);
        }
        
        // Rate limit between sessions
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error syncing session ${session}:`, error);
        results.errors.push(`Session ${session}: ${error}`);
      }
    }

    // Step 2: Sync voteringer for all important saker
    console.log('🗳️ Step 2: Syncing voteringer...');
    
    try {
      const voteringResponse = await fetch(
        `https://simgnodjhnpvyqqhwykg.supabase.co/functions/v1/sync-voteringer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
        }
      );

      if (voteringResponse.ok) {
        const voteringData = await voteringResponse.json();
        results.voteringerSynced = voteringData.voteringerSynced || 0;
        console.log(`Voteringer synced: ${results.voteringerSynced}`);
      }
    } catch (error) {
      console.error('Error syncing voteringer:', error);
      results.errors.push(`Voteringer: ${error}`);
    }

    // Update sync log
    const duration = Date.now() - startTime;
    if (logEntry) {
      await supabase
        .from('sync_log')
        .update({
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          saker_synced: results.sakerSynced,
          voteringer_synced: results.voteringerSynced,
          errors: results.errors.length > 0 ? results.errors : null,
        })
        .eq('id', logEntry.id);
    }

    console.log('✅ Historical sync completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Historisk synkronisering fullført',
        ...results,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-historikk:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
