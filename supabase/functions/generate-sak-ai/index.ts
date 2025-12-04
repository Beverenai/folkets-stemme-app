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
    const { sakId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the sak
    const { data: sak, error: sakError } = await supabase
      .from('stortinget_saker')
      .select('*')
      .eq('id', sakId)
      .single();

    if (sakError || !sak) {
      throw new Error(`Could not find sak: ${sakError?.message || 'Not found'}`);
    }

    console.log(`Generating AI content for sak: ${sak.tittel}`);

    const prompt = `Du er en norsk politisk kommunikatør. Analyser følgende stortingssak og generer innhold på norsk.

SAKTITTEL: ${sak.tittel}

BESKRIVELSE: ${sak.beskrivelse || 'Ingen beskrivelse tilgjengelig'}

TEMA: ${sak.tema || 'Ikke spesifisert'}

Generer følgende i JSON-format:

1. "spoersmaal": Et enkelt ja/nei-spørsmål som vanlige folk kan svare på. 
   - Start med "Bør", "Skal", "Er det riktig at" eller lignende
   - Maks 12-15 ord
   - Må kunne besvares med Ja eller Nei
   - Unngå juridisk/politisk sjargong
   - Eksempler: "Bør minstepensjonen heves til over fattigdomsgrensen?", "Skal det bli lettere å få erstatning etter vold?"

2. "oppsummering": En kort, lettfattelig oppsummering på 2-3 setninger som forklarer saken for vanlige borgere. Unngå politisk sjargong.

3. "kategori": En kort kategori (1-2 ord) som beskriver saksområdet. Eksempler: "Bolig", "Helse", "Miljø", "Skatt", "Utdanning", "Forsvar", "Arbeid", "Samferdsel", "Justis", "Kultur".

4. "argumenter_for": En liste med 3-4 argumenter FOR forslaget. Hver argument skal være en kort setning.

5. "argumenter_mot": En liste med 3-4 argumenter MOT forslaget. Hver argument skal være en kort setning.

Svar KUN med gyldig JSON i dette formatet:
{
  "spoersmaal": "...",
  "oppsummering": "...",
  "kategori": "...",
  "argumenter_for": ["...", "...", "..."],
  "argumenter_mot": ["...", "...", "..."]
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
          { role: "system", content: "Du er en politisk kommunikatør som gjør kompliserte stortingssaker forståelige for vanlige folk. Du formulerer saker som enkle ja/nei-spørsmål. Svar alltid med gyldig JSON." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit nådd. Prøv igjen senere." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Betalingspåkrevet. Legg til kreditter i din Lovable-konto." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No content in AI response");
    }

    console.log("AI response:", aiContent);

    // Parse the JSON response
    let parsed;
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Could not parse AI response as JSON");
    }

    // Update the sak with AI-generated content
    const { error: updateError } = await supabase
      .from('stortinget_saker')
      .update({
        spoersmaal: parsed.spoersmaal,
        oppsummering: parsed.oppsummering,
        kategori: parsed.kategori,
        argumenter_for: parsed.argumenter_for,
        argumenter_mot: parsed.argumenter_mot,
      })
      .eq('id', sakId);

    if (updateError) {
      console.error("Failed to update sak:", updateError);
      throw new Error(`Failed to update sak: ${updateError.message}`);
    }

    console.log(`Successfully generated AI content for sak: ${sak.tittel}`);

    return new Response(JSON.stringify({ 
      success: true, 
      sakId,
      generated: {
        spoersmaal: parsed.spoersmaal,
        oppsummering: parsed.oppsummering,
        kategori: parsed.kategori,
        argumenter_for: parsed.argumenter_for,
        argumenter_mot: parsed.argumenter_mot,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-sak-ai:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
