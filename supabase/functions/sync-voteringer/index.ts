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
// Stortinget API appears to use: 1 = mot, 2 = for, 3 = ikke_tilstede
function normalizeVote(voteData: any, shouldLog: boolean = false): string {
  if (voteData === null || voteData === undefined) return 'ikke_tilstede';
  
  // Log first few votes to debug
  if (shouldLog) {
    console.log(`Raw vote value: ${JSON.stringify(voteData)} (type: ${typeof voteData})`);
  }
  
  // Handle numeric vote codes from Stortinget API
  // SWAPPED: Based on data analysis, 1 appears to be MOT and 2 appears to be FOR
  if (typeof voteData === 'number') {
    if (voteData === 1) return 'mot';  // Changed from 'for'
    if (voteData === 2) return 'for';  // Changed from 'mot'
    if (voteData === 3) return 'ikke_tilstede';
    return 'ikke_tilstede';
  }
  
  // Handle string votes (these are explicit and don't need swapping)
  if (typeof voteData === 'string') {
    const v = voteData.toLowerCase().trim();
    if (v === 'for') return 'for';
    if (v === 'mot' || v === 'imot') return 'mot';
    if (v === 'avholdende' || v === 'ikke_avgitt_stemme' || v === 'ikke avgitt stemme') return 'avholdende';
    // Numeric strings - apply same swap
    if (v === '1') return 'mot';
    if (v === '2') return 'for';
    if (v === '3') return 'ikke_tilstede';
    return 'ikke_tilstede';
  }
  
  // Handle object with value
  if (typeof voteData === 'object') {
    const value = voteData['$value'] || voteData.tekst || voteData.value || voteData.vote;
    return normalizeVote(value, shouldLog);
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
  // Check if there are any vote counts at all (indicates voting happened)
  const antallFor = parseInt(votering?.antall_for) || 0;
  const antallMot = parseInt(votering?.antall_mot) || 0;
  // If there were any votes recorded, try to get individual records
  return antallFor > 0 || antallMot > 0;
}

// Find the FINAL votering for a sak (the decisive vote)
// Returns TWO voteringer: one for totals, one for party breakdown
function findFinalVotering(voteringListe: any[]): { forTotals: any | null, forPartyVotes: any | null } {
  if (!voteringListe || voteringListe.length === 0) {
    return { forTotals: null, forPartyVotes: null };
  }
  
  // Find votering for totals (the actual final decision)
  let forTotals: any = null;
  
  // First: Look for explicit final vote patterns
  for (const votering of voteringListe) {
    const tema = votering?.votering_tema || '';
    if (isFinalVote(tema)) {
      forTotals = votering;
      break;
    }
  }
  
  // If no final pattern found, use the last votering
  if (!forTotals) {
    forTotals = voteringListe[voteringListe.length - 1];
  }
  
  // Find votering for party breakdown (must have individual votes)
  // Prefer the final votering if it has individual votes, otherwise use any that does
  let forPartyVotes: any = null;
  
  if (forTotals && hasIndividualVotes(forTotals)) {
    forPartyVotes = forTotals;
  } else {
    // Find any votering with individual votes - prefer ones with dissent
    const voteringerWithVotes = voteringListe.filter(hasIndividualVotes);
    
    if (voteringerWithVotes.length > 0) {
      // Prefer votering with most dissent (antall_mot > 0)
      const withDissent = voteringerWithVotes.filter(v => parseInt(v?.antall_mot) > 0);
      forPartyVotes = withDissent.length > 0 ? withDissent[0] : voteringerWithVotes[0];
    }
  }
  
  return { forTotals, forPartyVotes };
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
  
  // Log first 3 raw vote values for debugging
  for (let i = 0; i < Math.min(3, representantList.length); i++) {
    const rv = representantList[i];
    console.log(`Sample vote ${i}: votering=${JSON.stringify(rv?.votering)}, representant=${rv?.representant?.fornavn} ${rv?.representant?.etternavn}`);
  }

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

        // Get the FINAL votering for totals and the votering to use for party breakdown
        const { forTotals: totalsVotering, forPartyVotes: partyVotering } = findFinalVotering(voteringListe);
        
        // Party votes should ONLY come from one votering, not aggregated across all
        let finalPartiVotes: Record<string, { for: number; mot: number; avholdende: number; navn: string }> = {};
        let sakVoteringerCreated = 0;
        let sakRepVotesInserted = 0;

        // Process the votering that has party-level data
        if (partyVotering) {
          const partyVoteringId = partyVotering?.votering_id;
          console.log(`Processing PARTY votering ${partyVoteringId}: "${partyVotering?.votering_tema?.substring(0, 50)}..."`);

          const result = await processVoteringVotes(supabase, partyVotering, sak.id, repMap);
          
          if (result) {
            if (result.votesInserted > 0) {
              sakVoteringerCreated++;
              sakRepVotesInserted += result.votesInserted;
            }
            finalPartiVotes = result.partiVotes;
          }
        }

        // Also process other voteringer for rep vote history (but don't use for party stats)
        const partyVoteringId = partyVotering?.votering_id;
        const voteringerWithIndividualVotes = voteringListe.filter((v: any) => 
          hasIndividualVotes(v) && v?.votering_id !== partyVoteringId
        );
        
        for (const votering of voteringerWithIndividualVotes) {
          const voteringId = votering?.votering_id;
          console.log(`Processing secondary votering ${voteringId}`);

          const result = await processVoteringVotes(supabase, votering, sak.id, repMap);
          if (result && result.votesInserted > 0) {
            sakVoteringerCreated++;
            sakRepVotesInserted += result.votesInserted;
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Use totalsVotering for the final counts (stortinget_votering_for/mot)
        let finalFor = 0, finalMot = 0, finalAvholdende = 0;

        if (totalsVotering) {
          finalFor = parseInt(totalsVotering?.antall_for) || 0;
          finalMot = parseInt(totalsVotering?.antall_mot) || 0;
          finalAvholdende = parseInt(totalsVotering?.antall_ikke_tilstede) || 0;

          // If totals votering wasn't processed yet, ensure it exists in voteringer table
          const totalsVoteringId = totalsVotering?.votering_id;
          if (totalsVoteringId) {
            const { data: existingFinal } = await supabase
              .from('voteringer')
              .select('id')
              .eq('stortinget_votering_id', String(totalsVoteringId))
              .maybeSingle();

            if (!existingFinal) {
              // Create the votering record
              await supabase
                .from('voteringer')
                .insert({
                  stortinget_votering_id: String(totalsVoteringId),
                  sak_id: sak.id,
                  forslag_tekst: totalsVotering?.votering_tema || sak.tittel,
                  votering_dato: safeParseDate(totalsVotering?.votering_tid),
                  status: 'avsluttet',
                  vedtatt: totalsVotering?.vedtatt === true || totalsVotering?.vedtatt === 'true',
                  resultat_for: finalFor,
                  resultat_mot: finalMot,
                  resultat_avholdende: finalAvholdende,
                });
              sakVoteringerCreated++;
            }
          }
        }

        // FALLBACK: If API totals are 0 but we have partiVotes, calculate from them
        if (finalFor === 0 && finalMot === 0 && Object.keys(finalPartiVotes).length > 0) {
          finalFor = Object.values(finalPartiVotes).reduce((sum, p) => sum + p.for, 0);
          finalMot = Object.values(finalPartiVotes).reduce((sum, p) => sum + p.mot, 0);
          finalAvholdende = Object.values(finalPartiVotes).reduce((sum, p) => sum + p.avholdende, 0);
          console.log(`Calculated totals from partiVotes: for=${finalFor}, mot=${finalMot}, avholdende=${finalAvholdende}`);
        }

        // Delete old party votes and insert fresh ones from FINAL votering only
        await supabase
          .from('parti_voteringer')
          .delete()
          .eq('sak_id', sak.id);

        const partiVotesToInsert = Object.entries(finalPartiVotes).map(([partiForkortelse, votes]) => ({
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
