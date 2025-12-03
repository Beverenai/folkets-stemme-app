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

    // Get all representanter
    const { data: representanter, error: repError } = await supabase
      .from('representanter')
      .select('id, stortinget_id');

    if (repError) throw repError;

    const repMap = new Map(representanter?.map(r => [r.stortinget_id, r.id]) || []);
    console.log(`Loaded ${repMap.size} representanter`);

    let totalInserted = 0;
    let sakerProcessed = 0;

    // Step 1: Get saker from session (saker_liste is directly an array)
    const sesjonId = '2023-2024';
    const sakerUrl = `https://data.stortinget.no/eksport/saker?sesjonid=${sesjonId}&format=json`;
    console.log(`Fetching saker from ${sakerUrl}`);
    
    const sakerRes = await fetch(sakerUrl);
    if (!sakerRes.ok) {
      return new Response(
        JSON.stringify({ success: false, message: `API error: ${sakerRes.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sakerData = await sakerRes.json();
    // saker_liste is directly an array, not an object with a 'sak' property
    const sakerListe = sakerData?.saker_liste || [];
    console.log(`Found ${sakerListe.length} saker`);

    // Process saker, looking for ones with voteringer (skip first 100 which are often grunnlovsforslag)
    let sakIndex = 100;
    for (const sak of sakerListe.slice(100, 200)) {
      sakIndex++;
      const sakStortingetId = sak?.id;
      const sakTittel = sak?.tittel || sak?.kort_tittel || `Sak ${sakStortingetId}`;
      
      if (!sakStortingetId) continue;

      console.log(`Processing sak ${sakStortingetId}: ${sakTittel?.substring(0, 50)}...`);

      // Step 2: Get voteringer for this sak
      const voteringerUrl = `https://data.stortinget.no/eksport/voteringer?sakid=${sakStortingetId}&format=json`;
      
      const voteringerRes = await fetch(voteringerUrl);
      if (!voteringerRes.ok) {
        console.log(`No voteringer for sak ${sakStortingetId}`);
        continue;
      }

      const voteringerData = await voteringerRes.json();
      // sak_votering_liste can be array or object with sak_votering
      let voteringListe = voteringerData?.sak_votering_liste;
      if (voteringListe && !Array.isArray(voteringListe)) {
        voteringListe = voteringListe.sak_votering || [];
      }
      if (!voteringListe) voteringListe = [];
      if (!Array.isArray(voteringListe)) voteringListe = [voteringListe];
      
      if (voteringListe.length === 0) {
        console.log(`No voteringer for sak ${sakStortingetId}`);
        continue;
      }

      console.log(`Found ${voteringListe.length} voteringer for sak ${sakStortingetId}`);

      // Get or create sak in database
      let { data: eksisterendeSak } = await supabase
        .from('stortinget_saker')
        .select('id')
        .eq('stortinget_id', String(sakStortingetId))
        .maybeSingle();

      let sakUuid: string;
      
      if (!eksisterendeSak) {
        const { data: nySak, error: insertError } = await supabase
          .from('stortinget_saker')
          .insert({
            stortinget_id: String(sakStortingetId),
            tittel: sakTittel,
            kort_tittel: sakTittel.substring(0, 100),
            status: 'behandlet',
          })
          .select('id')
          .single();

        if (insertError || !nySak) {
          console.error(`Failed to insert sak ${sakStortingetId}:`, insertError);
          continue;
        }
        sakUuid = nySak.id;
        console.log(`Created new sak in DB`);
      } else {
        sakUuid = eksisterendeSak.id;
      }

      // Process first votering
      const votering = voteringListe[0];
      const voteringId = votering?.votering_id;
      if (!voteringId) {
        console.log(`No votering_id for sak ${sakStortingetId}`);
        continue;
      }

      console.log(`Processing votering ${voteringId}`);

      // Step 3: Get voteringsresultat
      const resultatUrl = `https://data.stortinget.no/eksport/voteringsresultat?voteringid=${voteringId}&format=json`;
      const resultatRes = await fetch(resultatUrl);
      
      if (!resultatRes.ok) {
        console.log(`Resultat API returned ${resultatRes.status}`);
        continue;
      }

      const resultatData = await resultatRes.json();
      let representantList = resultatData?.voteringsresultat_liste?.representant_voteringsresultat;
      if (!representantList) representantList = resultatData?.voteringsresultat_liste;
      if (!Array.isArray(representantList)) representantList = representantList ? [representantList] : [];

      console.log(`Found ${representantList.length} votes`);

      // Insert votes
      for (const repVote of representantList) {
        const repStortingetId = repVote?.representant?.id;
        const vote = repVote?.votering?.toLowerCase();

        if (!repStortingetId || !vote) continue;

        const repUuid = repMap.get(repStortingetId);
        if (!repUuid) continue;

        let stemme = 'ikke_tilstede';
        if (vote === 'for') stemme = 'for';
        else if (vote === 'mot') stemme = 'mot';
        else if (vote === 'avholdende' || vote === 'ikke_avgitt_stemme') stemme = 'avholdende';

        const { data: existing } = await supabase
          .from('representant_voteringer')
          .select('id')
          .eq('representant_id', repUuid)
          .eq('sak_id', sakUuid)
          .eq('votering_id', String(voteringId))
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabase
            .from('representant_voteringer')
            .insert({
              representant_id: repUuid,
              sak_id: sakUuid,
              votering_id: String(voteringId),
              stemme,
            });

          if (!insertError) totalInserted++;
        }
      }

      sakerProcessed++;
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const message = `Synkronisert ${totalInserted} voteringer fra ${sakerProcessed} saker`;
    console.log(message);

    return new Response(
      JSON.stringify({ success: true, message, inserted: totalInserted, sakerProcessed }),
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
