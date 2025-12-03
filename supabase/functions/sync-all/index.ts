import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const errors: string[] = [];
  let sakerSynced = 0;
  let voteringerSynced = 0;
  let aiGenerated = 0;

  // Create log entry
  const { data: logEntry } = await supabase
    .from('sync_log')
    .insert({ source: 'cron' })
    .select('id')
    .single();

  const logId = logEntry?.id;

  try {
    console.log('Starting scheduled sync...');

    // 1. Sync saker fra Stortinget
    console.log('Step 1: Syncing Stortinget saker...');
    try {
      const stortingetResponse = await fetch(`${supabaseUrl}/functions/v1/sync-stortinget`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });
      const stortingetData = await stortingetResponse.json();
      sakerSynced = (stortingetData.inserted || 0) + (stortingetData.updated || 0);
      console.log(`Stortinget sync completed: ${sakerSynced} saker`);
    } catch (e: unknown) {
      const msg = `Stortinget sync failed: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      errors.push(msg);
    }

    // 2. Sync representanter
    console.log('Step 2: Syncing representanter...');
    try {
      const repResponse = await fetch(`${supabaseUrl}/functions/v1/sync-representanter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });
      const repData = await repResponse.json();
      console.log(`Representanter sync completed: ${repData.message || 'OK'}`);
    } catch (e: unknown) {
      const msg = `Representanter sync failed: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      errors.push(msg);
    }

    // 3. Sync voteringer for viktige saker
    console.log('Step 3: Syncing voteringer...');
    try {
      const voteringerResponse = await fetch(`${supabaseUrl}/functions/v1/sync-voteringer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });
      const voteringerData = await voteringerResponse.json();
      voteringerSynced = voteringerData.votesInserted || 0;
      console.log(`Voteringer sync completed: ${voteringerSynced} votes`);
    } catch (e: unknown) {
      const msg = `Voteringer sync failed: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      errors.push(msg);
    }

    // 4. Generate AI content for new important saker without summaries
    console.log('Step 4: Generating AI content...');
    try {
      const { data: sakerUtenAI } = await supabase
        .from('stortinget_saker')
        .select('id, tittel')
        .eq('er_viktig', true)
        .is('oppsummering', null)
        .limit(5);

      if (sakerUtenAI && sakerUtenAI.length > 0) {
        console.log(`Found ${sakerUtenAI.length} saker needing AI content`);
        
        for (const sak of sakerUtenAI) {
          try {
            console.log(`Generating AI for: ${sak.tittel?.substring(0, 50)}...`);
            const aiResponse = await fetch(`${supabaseUrl}/functions/v1/generate-sak-ai`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sakId: sak.id }),
            });
            
            if (aiResponse.ok) {
              aiGenerated++;
              console.log(`AI generated for sak ${sak.id}`);
            } else {
              const errorText = await aiResponse.text();
              console.error(`AI generation failed for sak ${sak.id}: ${errorText}`);
            }
            
            // Rate limit - wait 2 seconds between AI calls
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (e: unknown) {
            console.error(`AI generation error for sak ${sak.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } else {
        console.log('No saker need AI content');
      }
    } catch (e: unknown) {
      const msg = `AI generation failed: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      errors.push(msg);
    }

    const durationMs = Date.now() - startTime;
    console.log(`Sync completed in ${durationMs}ms`);

    // Update log entry
    if (logId) {
      await supabase
        .from('sync_log')
        .update({
          completed_at: new Date().toISOString(),
          saker_synced: sakerSynced,
          voteringer_synced: voteringerSynced,
          ai_generated: aiGenerated,
          errors: errors.length > 0 ? errors : null,
          duration_ms: durationMs,
        })
        .eq('id', logId);
    }

    return new Response(JSON.stringify({
      success: true,
      sakerSynced,
      voteringerSynced,
      aiGenerated,
      errors: errors.length > 0 ? errors : null,
      durationMs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Sync-all error:', errorMsg);
    
    if (logId) {
      await supabase
        .from('sync_log')
        .update({
          completed_at: new Date().toISOString(),
          errors: [...errors, errorMsg],
          duration_ms: Date.now() - startTime,
        })
        .eq('id', logId);
    }

    return new Response(JSON.stringify({ 
      error: errorMsg,
      errors 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
