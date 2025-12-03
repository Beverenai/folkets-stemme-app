import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Classify sak based on title - determines if it's important for citizens
function classifySak(tittel: string): { kategori: string; erViktig: boolean } {
  const t = tittel.toLowerCase();
  
  // Lovendringer - VIKTIG (lover påvirker folk direkte)
  if (
    (t.includes('endringer i') && (t.includes('loven') || t.includes('lova') || t.includes('lov ('))) ||
    t.startsWith('lov om') ||
    t.includes('lovvedtak')
  ) {
    return { kategori: 'lovendring', erViktig: true };
  }
  
  // Budsjett - VIKTIG (pengene til alt viktig)
  if (t.includes('statsbudsjettet') || t.includes('budsjettet') || t.includes('prop. 1 s')) {
    return { kategori: 'budsjett', erViktig: true };
  }
  
  // Grunnlovsforslag - VIKTIG (endrer fundamentet)
  if (t.includes('grunnlovsforslag') || t.includes('grunnlovsframlegg')) {
    return { kategori: 'grunnlov', erViktig: true };
  }
  
  // Stortingsmeldinger om viktige temaer - VIKTIG
  if (t.includes('meld. st.')) {
    return { kategori: 'melding', erViktig: true };
  }
  
  // EØS-samtykke - mindre viktig for folk flest
  if (t.includes('samtykke til') || t.includes('eøs-komiteens')) {
    return { kategori: 'samtykke', erViktig: false };
  }
  
  // Rapporter og beretninger - IKKE viktig
  if (t.includes('årsrapport') || t.includes('årsmelding') || t.includes('beretning') || t.includes('riksrevisjonens')) {
    return { kategori: 'rapport', erViktig: false };
  }
  
  // Interne prosedyrer - IKKE viktig
  if (t.includes('arbeidsordningen') || t.includes('valg av') || t.includes('suppleringsvalg')) {
    return { kategori: 'prosedyre', erViktig: false };
  }
  
  // Alt annet - sjekk for viktige ord
  if (t.includes('reform') || t.includes('endring') || t.includes('tiltak')) {
    return { kategori: 'politikk', erViktig: true };
  }
  
  return { kategori: 'annet', erViktig: false };
}

// Parse status from API - handles various formats
function parseStatus(statusField: any, sesjonId: string): string {
  // Historical sessions (before current) are always finished
  const currentSession = '2024-2025';
  if (sesjonId !== currentSession) {
    return 'avsluttet';
  }
  
  // Handle status as object with navn property
  if (typeof statusField === 'object' && statusField !== null) {
    const navn = statusField.navn || statusField.name || '';
    return parseStatusString(navn);
  }
  
  // Handle status as string
  if (typeof statusField === 'string') {
    return parseStatusString(statusField);
  }
  
  return 'pågående';
}

function parseStatusString(status: string): string {
  const s = status.toLowerCase();
  if (
    s.includes('behandlet') ||
    s.includes('vedtatt') ||
    s.includes('forkastet') ||
    s.includes('avsluttet') ||
    s.includes('ferdig') ||
    s.includes('bifalt') ||
    s.includes('ikke bifalt')
  ) {
    return 'avsluttet';
  }
  return 'pågående';
}

// Parse XML to extract text content
function getTextContent(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Parse multiple items from XML
function parseItems(xml: string, itemTag: string): string[] {
  const regex = new RegExp(`<${itemTag}[^>]*>([\\s\\S]*?)</${itemTag}>`, 'gi');
  const matches = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

interface StortingetSak {
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  beskrivelse: string | null;
  tema: string | null;
  status: string;
  dokumentgruppe: string | null;
  behandlet_sesjon: string | null;
  kategori: string;
  er_viktig: boolean;
}

async function fetchStortingetSaker(sesjonId: string): Promise<StortingetSak[]> {
  console.log(`Fetching saker for session: ${sesjonId}`);
  
  const url = `https://data.stortinget.no/eksport/saker?sesjonid=${sesjonId}&format=json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch saker: ${response.status}`);
      return await fetchStortingetSakerXML(sesjonId);
    }
    
    const data = await response.json();
    console.log(`Got response, parsing data...`);
    
    const saker: StortingetSak[] = [];
    const sakerListe = data.saker_liste || [];
    
    for (const sak of sakerListe) {
      if (!sak.id || !sak.tittel) continue;
      
      const classification = classifySak(sak.tittel);
      
      saker.push({
        stortinget_id: String(sak.id),
        tittel: sak.tittel || 'Ukjent tittel',
        kort_tittel: sak.korttittel || sak.tittel?.substring(0, 100) || null,
        beskrivelse: sak.innstilling_sammendrag || sak.kortvedtak || null,
        tema: sak.hovedemne?.navn || sak.emne?.navn || null,
        status: parseStatus(sak.status, sesjonId),
        dokumentgruppe: sak.dokumentgruppe?.navn || null,
        behandlet_sesjon: sak.sesjon_id || sesjonId,
        kategori: classification.kategori,
        er_viktig: classification.erViktig,
      });
    }
    
    const viktigCount = saker.filter(s => s.er_viktig).length;
    const avsluttetCount = saker.filter(s => s.status === 'avsluttet').length;
    console.log(`Parsed ${saker.length} saker from JSON (${viktigCount} viktige, ${avsluttetCount} avsluttet)`);
    return saker;
  } catch (error) {
    console.error('Error fetching JSON, trying XML:', error);
    return await fetchStortingetSakerXML(sesjonId);
  }
}

async function fetchStortingetSakerXML(sesjonId: string): Promise<StortingetSak[]> {
  console.log(`Fetching saker via XML for session: ${sesjonId}`);
  
  const url = `https://data.stortinget.no/eksport/saker?sesjonid=${sesjonId}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch saker XML: ${response.status}`);
  }
  
  const xml = await response.text();
  console.log(`Got XML response, length: ${xml.length}`);
  
  const sakerItems = parseItems(xml, 'sak');
  console.log(`Found ${sakerItems.length} saker in XML`);
  
  const saker: StortingetSak[] = [];
  
  for (const sakXml of sakerItems) {
    const id = getTextContent(sakXml, 'id');
    const tittel = getTextContent(sakXml, 'tittel');
    
    if (!id || !tittel) continue;
    
    const statusText = getTextContent(sakXml, 'status') || '';
    const classification = classifySak(tittel);
    
    saker.push({
      stortinget_id: id,
      tittel: tittel,
      kort_tittel: getTextContent(sakXml, 'korttittel'),
      beskrivelse: getTextContent(sakXml, 'innstilling_sammendrag') || getTextContent(sakXml, 'kortvedtak'),
      tema: getTextContent(sakXml, 'hovedemne_navn'),
      status: parseStatus(statusText, sesjonId),
      dokumentgruppe: getTextContent(sakXml, 'dokumentgruppe_navn'),
      behandlet_sesjon: getTextContent(sakXml, 'sesjon_id') || sesjonId,
      kategori: classification.kategori,
      er_viktig: classification.erViktig,
    });
  }
  
  const viktigCount = saker.filter(s => s.er_viktig).length;
  console.log(`Parsed ${saker.length} valid saker from XML (${viktigCount} viktige)`);
  return saker;
}

async function fetchVoteringForSak(sakId: string): Promise<{ for: number; mot: number; avholdende: number; vedtak: string | null } | null> {
  try {
    const url = `https://data.stortinget.no/eksport/voteringsakoverenskomst?sakid=${sakId}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const xml = await response.text();
    
    const forStemmer = parseInt(getTextContent(xml, 'antall_for') || '0');
    const motStemmer = parseInt(getTextContent(xml, 'antall_mot') || '0');
    const avholdende = parseInt(getTextContent(xml, 'antall_ikke_tilstede') || '0');
    const vedtak = getTextContent(xml, 'vedtak_tekst') || getTextContent(xml, 'votering_resultat');
    
    if (forStemmer === 0 && motStemmer === 0) return null;
    
    return {
      for: forStemmer,
      mot: motStemmer,
      avholdende: avholdende,
      vedtak: vedtak,
    };
  } catch (error) {
    console.error(`Error fetching votering for sak ${sakId}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for specific session, or use default 4-year range
    let requestedSession: string | null = null;
    try {
      const body = await req.json();
      requestedSession = body.session || null;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Get sessions to sync - either specific session or last 4 years
    const sessions = requestedSession 
      ? [requestedSession]
      : [
          '2021-2022',  // Start of current Storting period
          '2022-2023',
          '2023-2024',
          '2024-2025',
        ];

    let totalInserted = 0;
    let totalUpdated = 0;
    let viktigeInserted = 0;
    let errors: string[] = [];

    for (const sesjonId of sessions) {
      try {
        console.log(`Processing session: ${sesjonId}`);
        const saker = await fetchStortingetSaker(sesjonId);
        
        for (const sak of saker) {
          // Check if sak already exists
          const { data: existing } = await supabase
            .from('stortinget_saker')
            .select('id, status, kategori')
            .eq('stortinget_id', sak.stortinget_id)
            .maybeSingle();

          if (existing) {
            // Update if status changed or kategori not set
            if (existing.status !== sak.status || !existing.kategori) {
              const { error } = await supabase
                .from('stortinget_saker')
                .update({
                  status: sak.status,
                  kategori: sak.kategori,
                  er_viktig: sak.er_viktig,
                  sist_oppdatert_fra_stortinget: new Date().toISOString(),
                })
                .eq('id', existing.id);
              
              if (!error) totalUpdated++;
            }
          } else {
            // Insert new sak
            const { error } = await supabase
              .from('stortinget_saker')
              .insert({
                stortinget_id: sak.stortinget_id,
                tittel: sak.tittel,
                kort_tittel: sak.kort_tittel,
                beskrivelse: sak.beskrivelse,
                tema: sak.tema,
                status: sak.status,
                dokumentgruppe: sak.dokumentgruppe,
                behandlet_sesjon: sak.behandlet_sesjon,
                kategori: sak.kategori,
                er_viktig: sak.er_viktig,
                sist_oppdatert_fra_stortinget: new Date().toISOString(),
              });

            if (error) {
              console.error(`Error inserting sak ${sak.stortinget_id}:`, error);
              errors.push(`${sak.stortinget_id}: ${error.message}`);
            } else {
              totalInserted++;
              if (sak.er_viktig) viktigeInserted++;
            }
          }
        }
        
        // Small delay between sessions
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (sessionError) {
        console.error(`Error processing session ${sesjonId}:`, sessionError);
        errors.push(`Session ${sesjonId}: ${sessionError}`);
      }
    }

    // Try to fetch voting results for recent avsluttet saker
    const { data: avsluttedeSaker } = await supabase
      .from('stortinget_saker')
      .select('id, stortinget_id')
      .eq('status', 'avsluttet')
      .is('stortinget_votering_for', null)
      .limit(10);

    if (avsluttedeSaker) {
      for (const sak of avsluttedeSaker) {
        const votering = await fetchVoteringForSak(sak.stortinget_id);
        if (votering) {
          await supabase
            .from('stortinget_saker')
            .update({
              stortinget_votering_for: votering.for,
              stortinget_votering_mot: votering.mot,
              stortinget_votering_avholdende: votering.avholdende,
              stortinget_vedtak: votering.vedtak,
            })
            .eq('id', sak.id);
        }
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const result = {
      success: true,
      message: `Synkronisering fullført`,
      inserted: totalInserted,
      viktigeInserted: viktigeInserted,
      updated: totalUpdated,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    };

    console.log('Sync result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-stortinget function:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});