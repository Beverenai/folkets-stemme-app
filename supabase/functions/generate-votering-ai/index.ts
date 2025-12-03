import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get request body - optional limit parameter
    let limit = 10;
    try {
      const body = await req.json();
      if (body.limit) limit = Math.min(body.limit, 50);
    } catch {
      // No body provided, use defaults
    }

    // Find voteringer without oppsummering that have a linked sak
    const { data: voteringer, error: voteringerError } = await supabase
      .from('voteringer')
      .select(`
        id,
        forslag_tekst,
        stortinget_votering_id,
        resultat_for,
        resultat_mot,
        resultat_avholdende,
        vedtatt,
        stortinget_saker(tittel, beskrivelse, tema, kategori)
      `)
      .is('oppsummering', null)
      .not('sak_id', 'is', null)
      .limit(limit);

    if (voteringerError) {
      throw new Error(`Could not fetch voteringer: ${voteringerError.message}`);
    }

    if (!voteringer || voteringer.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Ingen voteringer trenger oppsummering",
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${voteringer.length} voteringer for AI summaries`);

    let processed = 0;
    let errors = 0;

    for (const votering of voteringer) {
      try {
        const sak = votering.stortinget_saker as any;
        const forslagTekst = votering.forslag_tekst || sak?.tittel || 'Ukjent forslag';

        console.log(`Generating AI for votering ${votering.id}: ${forslagTekst.substring(0, 50)}...`);

        const prompt = `Du er en norsk politisk analytiker. Analyser følgende stortingsvotering og generer innhold på norsk.

VOTERINGSTEMA: ${forslagTekst}

SAKSTITTEL: ${sak?.tittel || 'Ikke tilgjengelig'}

BESKRIVELSE: ${sak?.beskrivelse || 'Ingen beskrivelse'}

RESULTAT: ${votering.resultat_for || 0} for, ${votering.resultat_mot || 0} mot, ${votering.resultat_avholdende || 0} avholdende
VEDTATT: ${votering.vedtatt ? 'Ja' : 'Nei'}

Generer følgende i JSON-format:

1. "oppsummering": En kort, lettfattelig forklaring på 2-3 setninger som forklarer hva denne voteringen handler om for vanlige borgere. Start med "Dette forslaget handler om..." eller "Stortinget stemte over...". Unngå politisk sjargong.

2. "argumenter_for": En liste med 2-3 korte argumenter FOR forslaget. Hver argument skal være én setning.

3. "argumenter_mot": En liste med 2-3 korte argumenter MOT forslaget. Hver argument skal være én setning.

Svar KUN med gyldig JSON i dette formatet:
{
  "oppsummering": "...",
  "argumenter_for": ["...", "..."],
  "argumenter_mot": ["...", "..."]
}`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Du er en politisk analytiker som genererer nøytrale, balanserte forklaringer av stortingsvoteringer på norsk. Svar alltid med gyldig JSON." },
              { role: "user", content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI error for votering ${votering.id}:`, response.status, errorText);
          
          if (response.status === 429 || response.status === 402) {
            // Rate limit or payment required - stop processing
            console.log("Rate limit or payment required, stopping batch");
            break;
          }
          errors++;
          continue;
        }

        const data = await response.json();
        const aiContent = data.choices?.[0]?.message?.content;

        if (!aiContent) {
          console.error(`No AI content for votering ${votering.id}`);
          errors++;
          continue;
        }

        // Parse the JSON response
        let parsed;
        try {
          const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          parsed = JSON.parse(cleanedContent);
        } catch (parseError) {
          console.error(`Failed to parse AI response for votering ${votering.id}:`, parseError);
          errors++;
          continue;
        }

        // Update the votering with AI-generated content
        const { error: updateError } = await supabase
          .from('voteringer')
          .update({
            oppsummering: parsed.oppsummering,
            argumenter_for: parsed.argumenter_for || [],
            argumenter_mot: parsed.argumenter_mot || [],
          })
          .eq('id', votering.id);

        if (updateError) {
          console.error(`Failed to update votering ${votering.id}:`, updateError);
          errors++;
          continue;
        }

        processed++;
        console.log(`Successfully generated AI for votering ${votering.id}`);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (voteringError) {
        console.error(`Error processing votering ${votering.id}:`, voteringError);
        errors++;
      }
    }

    const message = `Genererte oppsummeringer for ${processed} voteringer (${errors} feil)`;
    console.log(message);

    return new Response(JSON.stringify({ 
      success: true, 
      message,
      processed,
      errors
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-votering-ai:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
