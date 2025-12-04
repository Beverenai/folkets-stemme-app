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

// === ESSENTIAL ONLY: Only process FINAL voteringer ===
// These are the only patterns we care about - when the law is voted on "in its entirety"
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting ESSENTIAL ONLY voting sync...');

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

    let voteringerCreated = 0;
    let repVotesInserted = 0;
    let sakerProcessed = 0;

    for (const sak of saker || []) {
      try {
        console.log(`Processing sak ${sak.stortinget_id}: ${sak.tittel?.substring(0, 50)}...`);

        // Get voteringer for this sak
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

        console.log(`Found ${voteringListe.length} voteringer, looking for FINAL vote...`);

        // === ESSENTIAL ONLY: Only get the FINAL votering ===
        const finalVotering = findFinalVotering(voteringListe);
        
        if (!finalVotering) {
          console.log(`No final votering found for sak ${sak.stortinget_id}`);
          await supabase
            .from('stortinget_saker')
            .update({ voteringer_synced_at: new Date().toISOString() })
            .eq('id', sak.id);
          sakerProcessed++;
          continue;
        }

        const voteringId = finalVotering?.votering_id;
        const forslagTekst = finalVotering?.votering_tema || sak.tittel;
        const voteringDato = finalVotering?.votering_tid;
        const vedtatt = finalVotering?.vedtatt === true || finalVotering?.vedtatt === 'true';
        
        const apiAntallFor = parseInt(finalVotering?.antall_for) || 0;
        const apiAntallMot = parseInt(finalVotering?.antall_mot) || 0;
        const apiAntallIkkeTilstede = parseInt(finalVotering?.antall_ikke_tilstede) || 0;

        console.log(`Final votering: ${voteringId} - "${forslagTekst?.substring(0, 60)}..."`);
        console.log(`API counts: for=${apiAntallFor}, mot=${apiAntallMot}`);

        if (!voteringId) {
          console.log(`No votering ID for sak ${sak.stortinget_id}`);
          await supabase
            .from('stortinget_saker')
            .update({ voteringer_synced_at: new Date().toISOString() })
            .eq('id', sak.id);
          sakerProcessed++;
          continue;
        }

        // Check if this votering already exists
        const { data: existingVotering } = await supabase
          .from('voteringer')
          .select('id')
          .eq('stortinget_votering_id', String(voteringId))
          .maybeSingle();

        let voteringDbId: string;

        if (existingVotering) {
          voteringDbId = existingVotering.id;
          console.log(`Votering already exists: ${voteringDbId}`);
        } else {
          const { data: newVotering, error: voteringError } = await supabase
            .from('voteringer')
            .insert({
              stortinget_votering_id: String(voteringId),
              sak_id: sak.id,
              forslag_tekst: forslagTekst,
              votering_dato: safeParseDate(voteringDato),
              status: sak.status || 'pågående',
              vedtatt: vedtatt,
              resultat_for: apiAntallFor,
              resultat_mot: apiAntallMot,
              resultat_avholdende: apiAntallIkkeTilstede,
            })
            .select('id')
            .single();

          if (voteringError) {
            console.error('Error creating votering:', voteringError);
            continue;
          }
          voteringDbId = newVotering.id;
          voteringerCreated++;
          console.log(`Created new votering: ${voteringDbId}`);
        }

        // Get individual votes for this FINAL votering
        const resultatUrl = `https://data.stortinget.no/eksport/voteringsresultat?voteringid=${voteringId}&format=json`;
        const resultatRes = await fetch(resultatUrl);
        
        let finalFor = apiAntallFor;
        let finalMot = apiAntallMot;
        let finalAvholdende = apiAntallIkkeTilstede;

        const partiVotes: Record<string, { for: number; mot: number; avholdende: number; navn: string }> = {};
        
        if (resultatRes.ok) {
          const resultatData = await resultatRes.json();
          
          let representantList = resultatData?.voteringsresultat_liste?.representant_voteringsresultat 
            || resultatData?.voteringsresultat_liste;
          
          if (!Array.isArray(representantList)) {
            representantList = representantList ? [representantList] : [];
          }

          console.log(`Found ${representantList.length} individual votes`);

          let countFor = 0, countMot = 0, countAvh = 0;
          const votesToInsert: any[] = [];

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

            // Insert rep vote if rep exists
            if (repInfo) {
              votesToInsert.push({
                representant_id: repInfo.id,
                sak_id: sak.id,
                votering_id: String(voteringId),
                votering_uuid: voteringDbId,
                stemme,
              });
            }
          }

          // Use counted values if API values are 0
          if (countFor > 0 || countMot > 0) {
            finalFor = apiAntallFor > 0 ? apiAntallFor : countFor;
            finalMot = apiAntallMot > 0 ? apiAntallMot : countMot;
            finalAvholdende = apiAntallIkkeTilstede > 0 ? apiAntallIkkeTilstede : countAvh;
          }

          console.log(`Parsed: for=${countFor}, mot=${countMot}, avh=${countAvh}`);

          // Batch insert rep votes
          if (votesToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('representant_voteringer')
              .upsert(votesToInsert, { 
                onConflict: 'representant_id,votering_uuid',
                ignoreDuplicates: true 
              });

            if (!insertError) {
              repVotesInserted += votesToInsert.length;
            } else {
              console.error('Batch insert error:', insertError);
            }
          }
        }

        // Update votering with final results
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

        // Delete old party votes and insert fresh ones
        await supabase
          .from('parti_voteringer')
          .delete()
          .eq('sak_id', sak.id);

        const partiVotesToInsert = Object.entries(partiVotes).map(([partiForkortelse, votes]) => ({
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

        // Update sak with voting results
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

        sakerProcessed++;
        console.log(`✓ Completed sak ${sak.stortinget_id}: for=${finalFor}, mot=${finalMot}`);

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (sakError: any) {
        console.error(`Error processing sak ${sak.stortinget_id}:`, sakError.message);
      }
    }

    const result = {
      success: true,
      message: 'Essential voting sync completed',
      sakerProcessed,
      voteringerCreated,
      repVotesInserted,
    };

    console.log('Sync result:', result);

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
