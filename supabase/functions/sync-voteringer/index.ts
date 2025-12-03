import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get saker that need voting data (not yet synced)
    const { data: saker, error: sakerError } = await supabase
      .from('stortinget_saker')
      .select('id, stortinget_id, tittel, status')
      .is('voteringer_synced_at', null)
      .limit(20);

    if (sakerError) throw sakerError;

    console.log(`Found ${saker?.length || 0} saker to process`);

    let totalInserted = 0;
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
        let voteringListe = voteringerData?.sak_votering_liste || voteringerData?.voteringer_liste;
        if (voteringListe && !Array.isArray(voteringListe)) {
          voteringListe = voteringListe.sak_votering || [voteringListe];
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

        let totalFor = 0;
        let totalMot = 0;
        let totalAvholdende = 0;

        // Track party votes for this sak
        const partiVotes: Record<string, { for: number; mot: number; avholdende: number; navn: string }> = {};

        // Process first votering
        const votering = voteringListe[0];
        const voteringId = votering?.votering_id;
        
        if (voteringId) {
          console.log(`Processing votering ${voteringId}`);

          const resultatUrl = `https://data.stortinget.no/eksport/voteringsresultat?voteringid=${voteringId}&format=json`;
          const resultatRes = await fetch(resultatUrl);
          
          if (resultatRes.ok) {
            const resultatData = await resultatRes.json();
            let representantList = resultatData?.voteringsresultat_liste?.representant_voteringsresultat 
              || resultatData?.voteringsresultat_liste;
            
            if (!Array.isArray(representantList)) {
              representantList = representantList ? [representantList] : [];
            }

            console.log(`Found ${representantList.length} votes`);

            // Insert votes
            for (const repVote of representantList) {
              const repStortingetId = repVote?.representant?.id;
              const vote = repVote?.votering?.toLowerCase();

              if (!repStortingetId || !vote) continue;

              // Count totals
              if (vote === 'for') totalFor++;
              else if (vote === 'mot') totalMot++;
              else totalAvholdende++;

              const repInfo = repMap.get(repStortingetId);
              if (!repInfo) continue;

              // Count party votes
              const partiForkortelse = repInfo.parti_forkortelse || 'IND';
              const partiNavn = repInfo.parti || 'Uavhengig';
              
              if (!partiVotes[partiForkortelse]) {
                partiVotes[partiForkortelse] = { for: 0, mot: 0, avholdende: 0, navn: partiNavn };
              }

              let stemme = 'ikke_tilstede';
              if (vote === 'for') {
                stemme = 'for';
                partiVotes[partiForkortelse].for++;
              } else if (vote === 'mot') {
                stemme = 'mot';
                partiVotes[partiForkortelse].mot++;
              } else if (vote === 'avholdende' || vote === 'ikke_avgitt_stemme') {
                stemme = 'avholdende';
                partiVotes[partiForkortelse].avholdende++;
              }

              const { data: existing } = await supabase
                .from('representant_voteringer')
                .select('id')
                .eq('representant_id', repInfo.id)
                .eq('sak_id', sak.id)
                .eq('votering_id', String(voteringId))
                .maybeSingle();

              if (!existing) {
                const { error: insertError } = await supabase
                  .from('representant_voteringer')
                  .insert({
                    representant_id: repInfo.id,
                    sak_id: sak.id,
                    votering_id: String(voteringId),
                    stemme,
                  });

                if (!insertError) totalInserted++;
              }
            }
          }
        }

        // Insert/update parti_voteringer
        for (const [partiForkortelse, votes] of Object.entries(partiVotes)) {
          const { data: existingPartiVote } = await supabase
            .from('parti_voteringer')
            .select('id')
            .eq('sak_id', sak.id)
            .eq('parti_forkortelse', partiForkortelse)
            .maybeSingle();

          if (existingPartiVote) {
            await supabase
              .from('parti_voteringer')
              .update({
                stemmer_for: votes.for,
                stemmer_mot: votes.mot,
                stemmer_avholdende: votes.avholdende,
              })
              .eq('id', existingPartiVote.id);
          } else {
            await supabase
              .from('parti_voteringer')
              .insert({
                sak_id: sak.id,
                parti_forkortelse: partiForkortelse,
                parti_navn: votes.navn,
                stemmer_for: votes.for,
                stemmer_mot: votes.mot,
                stemmer_avholdende: votes.avholdende,
              });
          }
        }

        console.log(`Inserted/updated ${Object.keys(partiVotes).length} parti_voteringer`);

        // Determine vedtak result
        let vedtakResultat = null;
        if (totalFor > 0 || totalMot > 0) {
          if (totalFor > totalMot) {
            vedtakResultat = 'vedtatt';
          } else if (totalMot > totalFor) {
            vedtakResultat = 'ikke_vedtatt';
          } else {
            vedtakResultat = 'uavgjort';
          }
        }

        // Update sak with voting totals and mark as synced
        await supabase
          .from('stortinget_saker')
          .update({
            stortinget_votering_for: totalFor,
            stortinget_votering_mot: totalMot,
            stortinget_votering_avholdende: totalAvholdende,
            vedtak_resultat: vedtakResultat,
            voteringer_synced_at: new Date().toISOString(),
          })
          .eq('id', sak.id);

        console.log(`Updated sak: For=${totalFor}, Mot=${totalMot}, Partier=${Object.keys(partiVotes).length}`);
        sakerProcessed++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (sakError: any) {
        console.error(`Error processing sak ${sak.stortinget_id}:`, sakError);
        // Mark as synced to avoid infinite retry
        await supabase
          .from('stortinget_saker')
          .update({ voteringer_synced_at: new Date().toISOString() })
          .eq('id', sak.id);
      }
    }

    const message = `Synkronisert ${totalInserted} voteringer fra ${sakerProcessed} saker`;
    console.log(message);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message, 
        votesInserted: totalInserted, 
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
