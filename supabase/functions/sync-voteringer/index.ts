import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Safe date parsing to handle invalid dates from API
function safeParseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const netMatch = dateStr.match(/\/Date\((-?\d+)([+-]\d{4})?\)\//);
    if (netMatch) {
      const timestamp = parseInt(netMatch[1], 10);
      return new Date(timestamp).toISOString();
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

// Map vote value to standard format
// Stortinget API uses: 1 = for, 2 = mot, 3 = ikke_tilstede
function normalizeVote(voteData: any): string {
  if (voteData === null || voteData === undefined) return 'ikke_tilstede';
  
  // Handle numeric vote codes from Stortinget API
  if (typeof voteData === 'number') {
    if (voteData === 1) return 'for';
    if (voteData === 2) return 'mot';
    if (voteData === 3) return 'ikke_tilstede';
    return 'ikke_tilstede';
  }
  
  // Handle string votes
  if (typeof voteData === 'string') {
    const v = voteData.toLowerCase().trim();
    if (v === 'for' || v === '1') return 'for';
    if (v === 'mot' || v === 'imot' || v === '2') return 'mot';
    if (v === 'avholdende' || v === 'ikke_avgitt_stemme' || v === 'ikke avgitt stemme' || v === '3') return 'avholdende';
    return 'ikke_tilstede';
  }
  
  // Handle object with value
  if (typeof voteData === 'object') {
    const value = voteData['$value'] || voteData.tekst || voteData.value || voteData.vote;
    return normalizeVote(value);
  }
  
  return 'ikke_tilstede';
}

// === Final vote patterns - used to identify THE DECISIVE vote ===
const FINAL_VOTE_PATTERNS = [
  'lovens overskrift og loven i sin helhet',
  'loven i sin helhet',
  'hele loven',
  'lovforslaget i sin helhet',
  'forslaget i sin helhet',
  'innstillingens tilråding',
  'innstillingen i sin helhet',
  'vedtas',
  'bifalles',
  'romertall i'
];

function isFinalVote(voteringTema: string | null | undefined): boolean {
  if (!voteringTema) return false;
  const tema = voteringTema.toLowerCase();
  return FINAL_VOTE_PATTERNS.some(pattern => tema.includes(pattern));
}

// Check if a votering has individual votes available
function hasIndividualVotes(votering: any): boolean {
  // personlig_votering = true means individual votes are recorded
  if (votering?.personlig_votering === true || votering?.personlig_votering === 'true') {
    return true;
  }
  // Also check if there are actual vote counts (indicates real voting happened)
  const antallFor = parseInt(votering?.antall_for) || 0;
  const antallMot = parseInt(votering?.antall_mot) || 0;
  // If there were any dissenting votes, individual records should exist
  return antallFor > 0 && antallMot > 0;
}

// Find the FINAL votering for a sak (the decisive vote)
function findFinalVotering(voteringListe: any[]): any | null {
  if (!voteringListe || voteringListe.length === 0) return null;
  
  // First: Look for explicit final vote patterns
  for (const votering of voteringListe) {
    const tema = votering?.votering_tema || '';
    if (isFinalVote(tema)) {
      return votering;
    }
  }
  
  // Second: If only one votering, use it (it's the final decision)
  if (voteringListe.length === 1) {
    return voteringListe[0];
  }
  
  // Third: Use the last votering as fallback (typically the final)
  return voteringListe[voteringListe.length - 1];
}

// Process individual votes for a single votering
async function processVoteringVotes(
  supabase: any,
  votering: any,
  sakId: string,
  repMap: Map<string, { id: string; parti_forkortelse: string; parti: string }>
): Promise<{ voteringDbId: string; votesInserted: number; partiVotes: Record<string, any> } | null> {
  const voteringId = votering?.votering_id;
  if (!voteringId) return null;

  const forslagTekst = votering?.votering_tema || '';
  const voteringDato = votering?.votering_tid;
  const vedtatt = votering?.vedtatt === true || votering?.vedtatt === 'true';
  
  const apiAntallFor = parseInt(votering?.antall_for) || 0;
  const apiAntallMot = parseInt(votering?.antall_mot) || 0;
  const apiAntallIkkeTilstede = parseInt(votering?.antall_ikke_tilstede) || 0;

  // Check if this votering already exists
  const { data: existingVotering } = await supabase
    .from('voteringer')
    .select('id')
    .eq('stortinget_votering_id', String(voteringId))
    .maybeSingle();

  let voteringDbId: string;

  if (existingVotering) {
    voteringDbId = existingVotering.id;
  } else {
    const { data: newVotering, error: voteringError } = await supabase
      .from('voteringer')
      .insert({
        stortinget_votering_id: String(voteringId),
        sak_id: sakId,
        forslag_tekst: forslagTekst,
        votering_dato: safeParseDate(voteringDato),
        status: 'avsluttet',
        vedtatt: vedtatt,
        resultat_for: apiAntallFor,
        resultat_mot: apiAntallMot,
        resultat_avholdende: apiAntallIkkeTilstede,
      })
      .select('id')
      .single();

    if (voteringError) {
      console.error('Error creating votering:', voteringError);
      return null;
    }
    voteringDbId = newVotering.id;
  }

  // Get individual votes for this votering
  const resultatUrl = `https://data.stortinget.no/eksport/voteringsresultat?voteringid=${voteringId}&format=json`;
  const resultatRes = await fetch(resultatUrl);
  
  if (!resultatRes.ok) {
    console.log(`No individual votes available for votering ${voteringId}`);
    return { voteringDbId, votesInserted: 0, partiVotes: {} };
  }

  const resultatData = await resultatRes.json();
  
  let representantList = resultatData?.voteringsresultat_liste?.representant_voteringsresultat 
    || resultatData?.voteringsresultat_liste;
  
  if (!Array.isArray(representantList)) {
    representantList = representantList ? [representantList] : [];
  }

  if (representantList.length === 0) {
    console.log(`No individual votes in response for votering ${voteringId}`);
    return { voteringDbId, votesInserted: 0, partiVotes: {} };
  }

  console.log(`Processing ${representantList.length} individual votes for votering ${voteringId}`);

  let countFor = 0, countMot = 0, countAvh = 0;
  const votesToInsert: any[] = [];
  const partiVotes: Record<string, { for: number; mot: number; avholdende: number; navn: string }> = {};

  for (const repVote of representantList) {
    const repStortingetId = repVote?.representant?.id;
    const stemme = normalizeVote(repVote?.votering);

    if (!repStortingetId) continue;

    // Count totals
    if (stemme === 'for') countFor++;
    else if (stemme === 'mot') countMot++;
    else if (stemme === 'avholdende') countAvh++;

    const repInfo = repMap.get(repStortingetId);
    const partiForkortelse = repInfo?.parti_forkortelse || repVote?.representant?.parti?.id || 'IND';
    const partiNavn = repInfo?.parti || repVote?.representant?.parti?.navn || 'Uavhengig';
    
    // Track party votes
    if (!partiVotes[partiForkortelse]) {
      partiVotes[partiForkortelse] = { for: 0, mot: 0, avholdende: 0, navn: partiNavn };
    }

    if (stemme === 'for') partiVotes[partiForkortelse].for++;
    else if (stemme === 'mot') partiVotes[partiForkortelse].mot++;
    else if (stemme === 'avholdende') partiVotes[partiForkortelse].avholdende++;

    // Insert rep vote if rep exists in our database
    if (repInfo) {
      votesToInsert.push({
        representant_id: repInfo.id,
        sak_id: sakId,
        votering_id: String(voteringId),
        votering_uuid: voteringDbId,
        stemme,
      });
    }
  }

  // Update votering with actual counts
  const finalFor = countFor > 0 ? countFor : apiAntallFor;
  const finalMot = countMot > 0 ? countMot : apiAntallMot;
  const finalAvholdende = countAvh > 0 ? countAvh : apiAntallIkkeTilstede;

  await supabase
    .from('voteringer')
    .update({
      resultat_for: finalFor,
      resultat_mot: finalMot,
      resultat_avholdende: finalAvholdende,
      vedtatt: finalFor > finalMot,
      status: 'avsluttet',
    })
    .eq('id', voteringDbId);

  // Batch insert rep votes
  let votesInserted = 0;
  if (votesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('representant_voteringer')
      .upsert(votesToInsert, { 
        onConflict: 'representant_id,votering_uuid',
        ignoreDuplicates: true 
      });

    if (!insertError) {
      votesInserted = votesToInsert.length;
    } else {
      console.error('Batch insert error:', insertError);
    }
  }

  return { voteringDbId, votesInserted, partiVotes };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting COMPLETE voting sync (all voteringer with individual votes)...');

    // Get all representanter with their party info
    const { data: representanter, error: repError } = await supabase
      .from('representanter')
      .select('id, stortinget_id, parti_forkortelse, parti');

    if (repError) throw repError;

    const repMap = new Map(representanter?.map(r => [r.stortinget_id, { id: r.id, parti_forkortelse: r.parti_forkortelse, parti: r.parti }]) || []);
    console.log(`Loaded ${repMap.size} representanter`);

    // Get IMPORTANT saker that need voting data
    const { data: saker, error: sakerError } = await supabase
      .from('stortinget_saker')
      .select('id, stortinget_id, tittel, status, kategori')
      .eq('er_viktig', true)
      .is('voteringer_synced_at', null)
      .limit(20);

    if (sakerError) throw sakerError;

    console.log(`Found ${saker?.length || 0} saker to process`);

    let totalVoteringerCreated = 0;
    let totalRepVotesInserted = 0;
    let sakerProcessed = 0;

    for (const sak of saker || []) {
      try {
        console.log(`\n=== Processing sak ${sak.stortinget_id}: ${sak.tittel?.substring(0, 50)}... ===`);

        // Get ALL voteringer for this sak
        const voteringerUrl = `https://data.stortinget.no/eksport/voteringer?sakid=${sak.stortinget_id}&format=json`;
        
        const voteringerRes = await fetch(voteringerUrl);
        if (!voteringerRes.ok) {
          console.log(`No voteringer for sak ${sak.stortinget_id}, marking as synced`);
          await supabase
            .from('stortinget_saker')
            .update({ voteringer_synced_at: new Date().toISOString() })
            .eq('id', sak.id);
          sakerProcessed++;
          continue;
        }

        const voteringerData = await voteringerRes.json();
        
        let voteringListe = voteringerData?.sak_votering_liste?.sak_votering 
          || voteringerData?.sak_votering_liste 
          || voteringerData?.voteringer_liste;
        
        if (voteringListe && !Array.isArray(voteringListe)) {
          voteringListe = [voteringListe];
        }
        if (!voteringListe || !Array.isArray(voteringListe)) {
          voteringListe = [];
        }
        
        if (voteringListe.length === 0) {
          console.log(`No voteringer for sak ${sak.stortinget_id}`);
          await supabase
            .from('stortinget_saker')
            .update({ voteringer_synced_at: new Date().toISOString() })
            .eq('id', sak.id);
          sakerProcessed++;
          continue;
        }

        console.log(`Found ${voteringListe.length} total voteringer`);

        // === NEW: Process ALL voteringer that have individual votes ===
        const voteringerWithIndividualVotes = voteringListe.filter(hasIndividualVotes);
        console.log(`${voteringerWithIndividualVotes.length} voteringer have individual votes available`);

        // Aggregate party votes across all voteringer for this sak
        const aggregatePartiVotes: Record<string, { for: number; mot: number; avholdende: number; navn: string }> = {};
        let sakVoteringerCreated = 0;
        let sakRepVotesInserted = 0;

        // Process each votering with individual votes
        for (const votering of voteringerWithIndividualVotes) {
          const voteringId = votering?.votering_id;
          console.log(`Processing votering ${voteringId}: "${votering?.votering_tema?.substring(0, 50)}..."`);

          const result = await processVoteringVotes(supabase, votering, sak.id, repMap);
          
          if (result) {
            if (result.votesInserted > 0) {
              sakVoteringerCreated++;
              sakRepVotesInserted += result.votesInserted;
            }

            // Aggregate party votes
            for (const [parti, votes] of Object.entries(result.partiVotes)) {
              if (!aggregatePartiVotes[parti]) {
                aggregatePartiVotes[parti] = { for: 0, mot: 0, avholdende: 0, navn: votes.navn };
              }
              aggregatePartiVotes[parti].for += votes.for;
              aggregatePartiVotes[parti].mot += votes.mot;
              aggregatePartiVotes[parti].avholdende += votes.avholdende;
            }
          }

          // Small delay between API calls
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Also get the FINAL votering for the sak's overall result
        const finalVotering = findFinalVotering(voteringListe);
        let finalFor = 0, finalMot = 0, finalAvholdende = 0;

        if (finalVotering) {
          finalFor = parseInt(finalVotering?.antall_for) || 0;
          finalMot = parseInt(finalVotering?.antall_mot) || 0;
          finalAvholdende = parseInt(finalVotering?.antall_ikke_tilstede) || 0;

          // If final votering wasn't processed yet (enstemmig), ensure it exists in voteringer table
          const finalVoteringId = finalVotering?.votering_id;
          if (finalVoteringId) {
            const { data: existingFinal } = await supabase
              .from('voteringer')
              .select('id')
              .eq('stortinget_votering_id', String(finalVoteringId))
              .maybeSingle();

            if (!existingFinal) {
              // Create the final votering record
              await supabase
                .from('voteringer')
                .insert({
                  stortinget_votering_id: String(finalVoteringId),
                  sak_id: sak.id,
                  forslag_tekst: finalVotering?.votering_tema || sak.tittel,
                  votering_dato: safeParseDate(finalVotering?.votering_tid),
                  status: 'avsluttet',
                  vedtatt: finalVotering?.vedtatt === true || finalVotering?.vedtatt === 'true',
                  resultat_for: finalFor,
                  resultat_mot: finalMot,
                  resultat_avholdende: finalAvholdende,
                });
              sakVoteringerCreated++;
            }
          }
        }

        // Delete old party votes and insert fresh aggregated ones
        await supabase
          .from('parti_voteringer')
          .delete()
          .eq('sak_id', sak.id);

        const partiVotesToInsert = Object.entries(aggregatePartiVotes).map(([partiForkortelse, votes]) => ({
          sak_id: sak.id,
          parti_forkortelse: partiForkortelse,
          parti_navn: votes.navn,
          stemmer_for: votes.for,
          stemmer_mot: votes.mot,
          stemmer_avholdende: votes.avholdende,
        }));

        if (partiVotesToInsert.length > 0) {
          await supabase
            .from('parti_voteringer')
            .insert(partiVotesToInsert);
          console.log(`Inserted ${partiVotesToInsert.length} parti_voteringer`);
        }

        // Update sak with final voting results
        const vedtakResultat = finalFor > finalMot ? 'vedtatt' : finalMot > finalFor ? 'ikke_vedtatt' : null;

        await supabase
          .from('stortinget_saker')
          .update({
            stortinget_votering_for: finalFor,
            stortinget_votering_mot: finalMot,
            stortinget_votering_avholdende: finalAvholdende,
            vedtak_resultat: vedtakResultat,
            voteringer_synced_at: new Date().toISOString(),
          })
          .eq('id', sak.id);

        totalVoteringerCreated += sakVoteringerCreated;
        totalRepVotesInserted += sakRepVotesInserted;
        sakerProcessed++;
        
        console.log(`✓ Completed sak ${sak.stortinget_id}: ${sakVoteringerCreated} voteringer, ${sakRepVotesInserted} rep votes`);

        // Rate limit between saker
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (sakError: any) {
        console.error(`Error processing sak ${sak.stortinget_id}:`, sakError.message);
      }
    }

    const result = {
      success: true,
      message: 'Complete voting sync finished',
      sakerProcessed,
      voteringerCreated: totalVoteringerCreated,
      repVotesInserted: totalRepVotesInserted,
    };

    console.log('\nSync result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in sync-voteringer:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
