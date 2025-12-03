import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Safe date parsing to handle invalid dates from API
function safeParseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.log(`Invalid date: ${dateStr}`);
      return null;
    }
    return date.toISOString();
  } catch {
    console.log(`Error parsing date: ${dateStr}`);
    return null;
  }
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

    // Get IMPORTANT saker that need voting data (not yet synced)
    const { data: saker, error: sakerError } = await supabase
      .from('stortinget_saker')
      .select('id, stortinget_id, tittel, status, kategori')
      .eq('er_viktig', true)
      .is('voteringer_synced_at', null)
      .limit(50); // Increased from 20 for faster processing

    if (sakerError) throw sakerError;

    console.log(`Found ${saker?.length || 0} saker to process`);

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

        // Process each votering individually
        for (const votering of voteringListe) {
          const voteringId = votering?.votering_id;
          const forslagTekst = votering?.votering_tema || votering?.kommentar || sak.tittel;
          const voteringDato = votering?.votering_tid;
          const vedtatt = votering?.vedtatt === true || votering?.vedtatt === 'true';
          
          if (!voteringId) continue;

          console.log(`Processing votering ${voteringId}`);

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
            // Create new votering entry with safe date parsing
            const { data: newVotering, error: voteringError } = await supabase
              .from('voteringer')
              .insert({
                stortinget_votering_id: String(voteringId),
                sak_id: sak.id,
                forslag_tekst: forslagTekst,
                votering_dato: safeParseDate(voteringDato),
                status: vedtatt !== null ? 'avsluttet' : 'pågående',
                vedtatt: vedtatt,
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

          const resultatUrl = `https://data.stortinget.no/eksport/voteringsresultat?voteringid=${voteringId}&format=json`;
          const resultatRes = await fetch(resultatUrl);
          
          if (resultatRes.ok) {
            const resultatData = await resultatRes.json();
            let representantList = resultatData?.voteringsresultat_liste?.representant_voteringsresultat 
              || resultatData?.voteringsresultat_liste;
            
            if (!Array.isArray(representantList)) {
              representantList = representantList ? [representantList] : [];
            }

            console.log(`Found ${representantList.length} votes for votering ${voteringId}`);

            let voteringFor = 0;
            let voteringMot = 0;
            let voteringAvholdende = 0;

            // Insert votes
            for (const repVote of representantList) {
              const repStortingetId = repVote?.representant?.id;
              // Handle vote as string, object with text, or extract from various formats
              let voteRaw = repVote?.votering;
              if (typeof voteRaw === 'object' && voteRaw !== null) {
                voteRaw = voteRaw.tekst || voteRaw.value || voteRaw.vote || JSON.stringify(voteRaw);
              }
              const vote = typeof voteRaw === 'string' ? voteRaw.toLowerCase() : String(voteRaw || '').toLowerCase();

              if (!repStortingetId || !vote || vote === 'null' || vote === 'undefined') continue;

              // Count totals
              if (vote === 'for') {
                voteringFor++;
                totalFor++;
              } else if (vote === 'mot') {
                voteringMot++;
                totalMot++;
              } else {
                voteringAvholdende++;
                totalAvholdende++;
              }

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

            // Update votering with results
            await supabase
              .from('voteringer')
              .update({
                resultat_for: voteringFor,
                resultat_mot: voteringMot,
                resultat_avholdende: voteringAvholdende,
                status: 'avsluttet',
                vedtatt: voteringFor > voteringMot,
              })
              .eq('id', voteringDbId);
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

        console.log(`Updated sak: For=${totalFor}, Mot=${totalMot}, Voteringer=${voteringerCreated}`);
        sakerProcessed++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (sakError: any) {
        console.error(`Error processing sak ${sak.stortinget_id}:`, sakError);
        // DON'T mark as synced on error - allows retry on next run
      }
    }

    const message = `Synkronisert ${totalInserted} stemmer, ${voteringerCreated} nye voteringer fra ${sakerProcessed} saker`;
    console.log(message);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message, 
        votesInserted: totalInserted, 
        voteringerCreated,
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
