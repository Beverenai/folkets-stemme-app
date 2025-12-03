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

    // Fetch alle voteringer (no session filter)
    const url = `https://data.stortinget.no/eksport/voteringer?format=json`;
    console.log('Fetching all voteringer...');
    
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`API returned ${res.status}`);
      return new Response(
        JSON.stringify({ success: true, message: 'API unavailable, try later', inserted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    const voteringListe = data?.votering_liste?.votering || [];
    console.log(`Found ${voteringListe.length} voteringer`);

    // Process up to 5 voteringer
    for (const votering of voteringListe.slice(0, 5)) {
      const voteringId = votering?.votering_id;
      const sakId = votering?.sak_id;
      if (!voteringId || !sakId) continue;

      // Get or create sak
      let { data: sak } = await supabase
        .from('stortinget_saker')
        .select('id')
        .eq('stortinget_id', sakId)
        .maybeSingle();

      if (!sak) {
        const { data: nySak } = await supabase
          .from('stortinget_saker')
          .insert({ stortinget_id: sakId, tittel: `Sak ${sakId}`, status: 'behandlet' })
          .select('id')
          .single();
        if (!nySak) continue;
        sak = nySak;
      }

      // Get votes
      const resultatRes = await fetch(`https://data.stortinget.no/eksport/voteringsresultat?voteringid=${voteringId}&format=json`);
      if (!resultatRes.ok) continue;

      const resultatData = await resultatRes.json();
      const votes = resultatData?.voteringsresultat_liste?.representant_voteringsresultat || [];

      for (const v of votes) {
        const repId = v?.representant?.id;
        const vote = v?.votering?.toLowerCase();
        const repUuid = repMap.get(repId);
        if (!repUuid) continue;

        const stemme = vote === 'for' ? 'for' : vote === 'mot' ? 'mot' : 'avholdende';
        
        const { error } = await supabase
          .from('representant_voteringer')
          .insert({ representant_id: repUuid, sak_id: sak.id, votering_id: voteringId, stemme });
        
        if (!error) totalInserted++;
      }
      sakerProcessed++;
    }

    return new Response(
      JSON.stringify({ success: true, message: `Synkronisert ${totalInserted} voteringer fra ${sakerProcessed} saker`, inserted: totalInserted }),
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
