import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      // Try XML format as fallback
      return await fetchStortingetSakerXML(sesjonId);
    }
    
    const data = await response.json();
    console.log(`Got response, parsing data...`);
    
    const saker: StortingetSak[] = [];
    const sakerListe = data.saker_liste || [];
    
    for (const sak of sakerListe) {
      if (!sak.id || !sak.tittel) continue;
      
      saker.push({
        stortinget_id: String(sak.id),
        tittel: sak.tittel || 'Ukjent tittel',
        kort_tittel: sak.korttittel || sak.tittel?.substring(0, 100) || null,
        beskrivelse: sak.innstilling_sammendrag || sak.kortvedtak || null,
        tema: sak.hovedemne?.navn || sak.emne?.navn || null,
        status: sak.status === 'behandlet' ? 'avsluttet' : 'pågående',
        dokumentgruppe: sak.dokumentgruppe?.navn || null,
        behandlet_sesjon: sak.sesjon_id || sesjonId,
      });
    }
    
    console.log(`Parsed ${saker.length} saker from JSON`);
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
    
    saker.push({
      stortinget_id: id,
      tittel: tittel,
      kort_tittel: getTextContent(sakXml, 'korttittel'),
      beskrivelse: getTextContent(sakXml, 'innstilling_sammendrag') || getTextContent(sakXml, 'kortvedtak'),
      tema: getTextContent(sakXml, 'hovedemne_navn'),
      status: statusText.toLowerCase().includes('behandlet') ? 'avsluttet' : 'pågående',
      dokumentgruppe: getTextContent(sakXml, 'dokumentgruppe_navn'),
      behandlet_sesjon: getTextContent(sakXml, 'sesjon_id') || sesjonId,
    });
  }
  
  console.log(`Parsed ${saker.length} valid saker from XML`);
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

    // Get current session (2024-2025) and previous
    const currentYear = new Date().getFullYear();
    const sessions = [
      `${currentYear - 1}-${currentYear}`,
      `${currentYear}-${currentYear + 1}`,
    ];

    let totalInserted = 0;
    let totalUpdated = 0;
    let errors: string[] = [];

    for (const sesjonId of sessions) {
      try {
        console.log(`Processing session: ${sesjonId}`);
        const saker = await fetchStortingetSaker(sesjonId);
        
        for (const sak of saker) {
          // Check if sak already exists
          const { data: existing } = await supabase
            .from('stortinget_saker')
            .select('id, status')
            .eq('stortinget_id', sak.stortinget_id)
            .maybeSingle();

          if (existing) {
            // Update if status changed
            if (existing.status !== sak.status) {
              const { error } = await supabase
                .from('stortinget_saker')
                .update({
                  status: sak.status,
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
                sist_oppdatert_fra_stortinget: new Date().toISOString(),
              });

            if (error) {
              console.error(`Error inserting sak ${sak.stortinget_id}:`, error);
              errors.push(`${sak.stortinget_id}: ${error.message}`);
            } else {
              totalInserted++;
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
