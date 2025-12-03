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

// Find the main/final votering for a sak
// Priority: "Lovens overskrift og loven i sin helhet" > last votering with highest votes
function findMainVotering(voteringListe: any[]): any | null {
  if (!voteringListe || voteringListe.length === 0) return null;
  
  // Look for the main law votering first
  const mainKeywords = [
    'lovens overskrift og loven i sin helhet',
    'loven i sin helhet',
    'hele loven',
    'lovforslaget i sin helhet',
    'forslaget i sin helhet',
    'innstillingen i sin helhet',
    'romertall i'
  ];
  
  for (const keyword of mainKeywords) {
    const found = voteringListe.find(v => {
      const tema = (v?.votering_tema || '').toLowerCase();
      return tema.includes(keyword);
    });
    if (found) return found;
  }
  
  // Fallback: return the last votering (typically the final vote)
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

    console.log('Starting voting data sync...');

    // Get all representanter with their party info
    const { data: representanter, error: repError } = await supabase
      .from('representanter')
      .select('id, stortinget_id, parti_forkortelse, parti');

    if (repError) throw repError;

    const repMap = new Map(representanter?.map(r => [r.stortinget_id, { id: r.id, parti_forkortelse: r.parti_forkortelse, parti: r.parti }]) || []);
    console.log(`Loaded ${repMap.size} representanter`);

    // First: Get voteringer that have missing data (need re-sync)
    const { data: voteringerMissingData, error: voteringMissingError } = await supabase
      .from('voteringer')
      .select('id, stortinget_votering_id, sak_id, votering_dato, resultat_for, resultat_mot')
      .or('votering_dato.is.null,resultat_for.eq.0,resultat_mot.eq.0')
      .limit(50);

    if (voteringMissingError) {
      console.error('Error fetching voteringer with missing data:', voteringMissingError);
    }

    console.log(`Found ${voteringerMissingData?.length || 0} voteringer with missing data to re-sync`);

    // Re-sync voteringer with missing data - use voteringsresultat directly
    let voteringerUpdated = 0;
    for (const votering of voteringerMissingData || []) {
      try {
        const voteringId = votering.stortinget_votering_id;
        console.log(`Re-syncing votering ${voteringId}`);

        // Get individual votes from voteringsresultat API (most reliable)
        const resultatUrl = `https://data.stortinget.no/eksport/voteringsresultat?voteringid=${voteringId}&format=json`;
        const resultatRes = await fetch(resultatUrl);
        
        if (!resultatRes.ok) {
          console.log(`No voteringsresultat for ${voteringId}, skipping`);
          continue;
        }

        const resultatData = await resultatRes.json();
        let representantList = resultatData?.voteringsresultat_liste?.representant_voteringsresultat 
          || resultatData?.voteringsresultat_liste;
        
        if (!Array.isArray(representantList)) {
          representantList = representantList ? [representantList] : [];
        }

        if (representantList.length === 0) {
          console.log(`No votes found for votering ${voteringId}`);
          continue;
        }

        // Count votes from individual results
        let countFor = 0, countMot = 0, countAvh = 0;
        let voteringDato = null;
        
        for (const repVote of representantList) {
          const stemme = normalizeVote(repVote?.votering);
          if (stemme === 'for') countFor++;
          else if (stemme === 'mot') countMot++;
          else if (stemme === 'avholdende') countAvh++;
          
          // Get date from first vote
          if (!voteringDato && repVote?.votering_tid) {
            voteringDato = repVote.votering_tid;
          }
        }

        console.log(`Votering ${voteringId}: for=${countFor}, mot=${countMot}, avh=${countAvh}`);

        // Only update if we have actual votes
        if (countFor > 0 || countMot > 0) {
          const { error: updateErr } = await supabase
            .from('voteringer')
            .update({
              votering_dato: safeParseDate(voteringDato) || votering.votering_dato,
              resultat_for: countFor,
              resultat_mot: countMot,
              resultat_avholdende: countAvh,
              vedtatt: countFor > countMot,
              status: 'avsluttet',
            })
            .eq('id', votering.id);

          if (!updateErr) {
            voteringerUpdated++;
            console.log(`Updated votering ${voteringId}`);
          } else {
            console.error(`Error updating votering ${voteringId}:`, updateErr);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e: any) {
        console.error(`Error re-syncing votering ${votering.stortinget_votering_id}:`, e.message);
      }
    }

    console.log(`Re-synced ${voteringerUpdated} voteringer with missing data`);

    // Second: Get IMPORTANT saker that need voting data (not yet synced)
    const { data: saker, error: sakerError } = await supabase
      .from('stortinget_saker')
      .select('id, stortinget_id, tittel, status, kategori')
      .eq('er_viktig', true)
      .is('voteringer_synced_at', null)
      .limit(10);

    if (sakerError) throw sakerError;

    console.log(`Found ${saker?.length || 0} new saker to process`);

    let totalInserted = 0;
    let voteringerCreated = 0;
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
        
        console.log('Voteringer response keys:', Object.keys(voteringerData));
        
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

        console.log(`Found ${voteringListe.length} voteringer`);

        // Find the MAIN votering for this sak
        const mainVotering = findMainVotering(voteringListe);
        const mainVoteringId = mainVotering?.votering_id;
        console.log(`Main votering: ${mainVoteringId} - "${mainVotering?.votering_tema?.substring(0, 50)}..."`);

        // Process all voteringer but only use main one for sak-level stats
        let mainFor = 0;
        let mainMot = 0;
        let mainAvholdende = 0;
        let mainVedtatt = false;

        // Track party votes ONLY from main votering
        const partiVotes: Record<string, { for: number; mot: number; avholdende: number; navn: string }> = {};

        for (const votering of voteringListe) {
          const voteringId = votering?.votering_id;
          const forslagTekst = votering?.votering_tema || votering?.kommentar || sak.tittel;
          const voteringDato = votering?.votering_tid;
          const vedtatt = votering?.vedtatt === true || votering?.vedtatt === 'true';
          const isMainVotering = voteringId === mainVoteringId;
          
          // Use the counts directly from the API if available
          const apiAntallFor = parseInt(votering?.antall_for) || 0;
          const apiAntallMot = parseInt(votering?.antall_mot) || 0;
          const apiAntallIkkeTilstede = parseInt(votering?.antall_ikke_tilstede) || 0;
          
          if (!voteringId) continue;

          console.log(`Processing votering ${voteringId} (main: ${isMainVotering}) - API counts: for=${apiAntallFor}, mot=${apiAntallMot}`);

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
          }

          // Get individual votes for this votering
          const resultatUrl = `https://data.stortinget.no/eksport/voteringsresultat?voteringid=${voteringId}&format=json`;
          const resultatRes = await fetch(resultatUrl);
          
          if (resultatRes.ok) {
            const resultatData = await resultatRes.json();
            
            let representantList = resultatData?.voteringsresultat_liste?.representant_voteringsresultat 
              || resultatData?.voteringsresultat_liste;
            
            if (!Array.isArray(representantList)) {
              representantList = representantList ? [representantList] : [];
            }

            console.log(`Found ${representantList.length} individual votes for votering ${voteringId}`);

            let voteringFor = 0;
            let voteringMot = 0;
            let voteringAvholdende = 0;

            const votesToInsert: any[] = [];

            for (const repVote of representantList) {
              const repStortingetId = repVote?.representant?.id;
              const stemme = normalizeVote(repVote?.votering);

              if (!repStortingetId) continue;

              // Count totals from individual votes
              if (stemme === 'for') {
                voteringFor++;
              } else if (stemme === 'mot') {
                voteringMot++;
              } else if (stemme === 'avholdende') {
                voteringAvholdende++;
              }

              const repInfo = repMap.get(repStortingetId);
              const partiForkortelse = repInfo?.parti_forkortelse || repVote?.representant?.parti?.id || 'IND';
              const partiNavn = repInfo?.parti || repVote?.representant?.parti?.navn || 'Uavhengig';
              
              // ONLY track party votes from main votering
              if (isMainVotering) {
                if (!partiVotes[partiForkortelse]) {
                  partiVotes[partiForkortelse] = { for: 0, mot: 0, avholdende: 0, navn: partiNavn };
                }

                if (stemme === 'for') {
                  partiVotes[partiForkortelse].for++;
                } else if (stemme === 'mot') {
                  partiVotes[partiForkortelse].mot++;
                } else if (stemme === 'avholdende') {
                  partiVotes[partiForkortelse].avholdende++;
                }
              }

              // Only insert if rep exists in our DB
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

            console.log(`Parsed votes: for=${voteringFor}, mot=${voteringMot}, avholdende=${voteringAvholdende}`);

            // Batch insert votes
            if (votesToInsert.length > 0) {
              const { error: insertError } = await supabase
                .from('representant_voteringer')
                .upsert(votesToInsert, { 
                  onConflict: 'representant_id,votering_uuid',
                  ignoreDuplicates: true 
                });

              if (!insertError) {
                totalInserted += votesToInsert.length;
              } else {
                console.error('Batch insert error:', insertError);
              }
            }

            // Update votering with results
            const finalFor = apiAntallFor > 0 ? apiAntallFor : voteringFor;
            const finalMot = apiAntallMot > 0 ? apiAntallMot : voteringMot;
            const finalAvholdende = apiAntallIkkeTilstede > 0 ? apiAntallIkkeTilstede : voteringAvholdende;
            
            await supabase
              .from('voteringer')
              .update({
                resultat_for: finalFor,
                resultat_mot: finalMot,
                resultat_avholdende: finalAvholdende,
                vedtatt: finalFor > finalMot,
              })
              .eq('id', voteringDbId);

            // Store main votering stats for sak-level display
            if (isMainVotering) {
              mainFor = finalFor;
              mainMot = finalMot;
              mainAvholdende = finalAvholdende;
              mainVedtatt = finalFor > finalMot;
            }
          }
        }

        // Delete old party votes and insert fresh ones (only from main votering)
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
          console.log(`Inserted ${partiVotesToInsert.length} parti_voteringer from main votering`);
        }

        // Determine vedtak result from MAIN votering only
        let vedtakResultat = null;
        if (mainFor > 0 || mainMot > 0) {
          if (mainFor > mainMot) {
            vedtakResultat = 'vedtatt';
          } else if (mainMot > mainFor) {
            vedtakResultat = 'ikke_vedtatt';
          } else {
            vedtakResultat = 'uavgjort';
          }
        }

        // Update sak with MAIN votering totals (not aggregated)
        await supabase
          .from('stortinget_saker')
          .update({
            stortinget_votering_for: mainFor,
            stortinget_votering_mot: mainMot,
            stortinget_votering_avholdende: mainAvholdende,
            vedtak_resultat: vedtakResultat,
            status: 'avsluttet',
            voteringer_synced_at: new Date().toISOString(),
          })
          .eq('id', sak.id);

        console.log(`Updated sak with MAIN votering: For=${mainFor}, Mot=${mainMot}, Vedtatt=${mainVedtatt}`);
        sakerProcessed++;
        
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (sakError: any) {
        console.error(`Error processing sak ${sak.stortinget_id}:`, sakError);
      }
    }

    const message = `Synkronisert ${totalInserted} stemmer, ${voteringerCreated} nye voteringer, ${voteringerUpdated} oppdatert fra ${sakerProcessed} saker`;
    console.log(message);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message, 
        votesInserted: totalInserted, 
        voteringerCreated,
        voteringerUpdated,
        processedCount: sakerProcessed 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
