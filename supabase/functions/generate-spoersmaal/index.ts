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
    const { limit = 5 } = await req.json().catch(() => ({}));
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find saker that need spoersmaal generated
    const { data: saker, error: fetchError } = await supabase
      .from('stortinget_saker')
      .select('id, tittel, beskrivelse, tema, oppsummering')
      .eq('er_viktig', true)
      .is('spoersmaal', null)
      .not('oppsummering', 'is', null)
      .limit(limit);

    if (fetchError) {
      throw new Error(`Failed to fetch saker: ${fetchError.message}`);
    }

    if (!saker || saker.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No saker need spoersmaal generation",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating spoersmaal for ${saker.length} saker`);
    const results: any[] = [];

    for (const sak of saker) {
      try {
        const prompt = `Du skal formulere følgende stortingssak som et enkelt ja/nei-spørsmål.

SAKTITTEL: ${sak.tittel}
OPPSUMMERING: ${sak.oppsummering || 'Ingen'}
TEMA: ${sak.tema || 'Ikke spesifisert'}

Lag ETT spørsmål som:
- Starter med "Bør", "Skal", "Er det riktig at" eller lignende
- Er maks 12-15 ord
- Kan besvares med Ja eller Nei
- Er lett å forstå for vanlige folk (ikke politisk sjargong)

Eksempler på gode spørsmål:
- "Bør minstepensjonen heves til over fattigdomsgrensen?"
- "Skal det bli enklere å få erstatning etter voldshendelser?"
- "Bør myr forbys å graves opp for næringsformål?"

Svar BARE med spørsmålet, ingen annen tekst.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Du formulerer kompliserte stortingssaker som enkle ja/nei-spørsmål. Svar kun med spørsmålet." },
              { role: "user", content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI error for sak ${sak.id}:`, errorText);
          
          if (response.status === 429) {
            console.log("Rate limited, stopping batch");
            break;
          }
          continue;
        }

        const data = await response.json();
        let spoersmaal = data.choices?.[0]?.message?.content?.trim();

        if (!spoersmaal) {
          console.error(`No content for sak ${sak.id}`);
          continue;
        }

        // Clean up the response
        spoersmaal = spoersmaal.replace(/^["']|["']$/g, '').trim();
        
        // Ensure it ends with ?
        if (!spoersmaal.endsWith('?')) {
          spoersmaal += '?';
        }

        // Update the sak
        const { error: updateError } = await supabase
          .from('stortinget_saker')
          .update({ spoersmaal })
          .eq('id', sak.id);

        if (updateError) {
          console.error(`Failed to update sak ${sak.id}:`, updateError);
          continue;
        }

        console.log(`Generated for ${sak.id}: ${spoersmaal}`);
        results.push({ id: sak.id, spoersmaal });

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        console.error(`Error processing sak ${sak.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      remaining: saker.length - results.length,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-spoersmaal:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
