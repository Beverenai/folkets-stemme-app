import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Category priority for AI generation (lower = higher priority)
const CATEGORY_PRIORITY: Record<string, number> = {
  'lovendring': 1,
  'budsjett': 2,
  'grunnlov': 3,
  'melding': 4,
  'politikk': 5,
  'representantforslag': 6,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let count = 50;
  try {
    const body = await req.json();
    count = Math.min(body.count || 50, 100); // Max 100 per batch
  } catch {
    // Use default
  }

  console.log(`Starting batch AI generation for ${count} saker...`);

  // Create log entry
  const { data: logEntry } = await supabase
    .from('sync_log')
    .insert({ source: 'batch-ai' })
    .select('id')
    .single();
  const logId = logEntry?.id;

  let generated = 0;
  const errors: string[] = [];

  try {
    // Fetch saker without AI content, prioritized by category
    // Only 2024-2025 and 2025-2026 sessions
    const { data: sakerUtenAI, error: fetchError } = await supabase
      .from('stortinget_saker')
      .select('id, tittel, beskrivelse, tema, kategori')
      .eq('er_viktig', true)
      .is('oppsummering', null)
      .in('behandlet_sesjon', ['2024-2025', '2025-2026'])
      .order('created_at', { ascending: false })
      .limit(count);

    if (fetchError) {
      throw new Error(`Failed to fetch saker: ${fetchError.message}`);
    }

    if (!sakerUtenAI || sakerUtenAI.length === 0) {
      console.log('No saker need AI content');
      return new Response(JSON.stringify({
        success: true,
        generated: 0,
        message: 'Alle viktige saker har allerede AI-innhold',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sort by category priority
    const sortedSaker = sakerUtenAI.sort((a, b) => {
      const priorityA = CATEGORY_PRIORITY[a.kategori || ''] || 99;
      const priorityB = CATEGORY_PRIORITY[b.kategori || ''] || 99;
      return priorityA - priorityB;
    });

    console.log(`Found ${sortedSaker.length} saker needing AI content`);
    console.log(`Categories: ${sortedSaker.map(s => s.kategori).join(', ')}`);

    for (const sak of sortedSaker) {
      try {
        console.log(`Generating AI for: ${sak.tittel?.substring(0, 60)}...`);
        
        const prompt = `Du er en norsk politisk analytiker. Analyser følgende stortingssak og generer innhold på norsk.

SAKTITTEL: ${sak.tittel}

BESKRIVELSE: ${sak.beskrivelse || 'Ingen beskrivelse tilgjengelig'}

TEMA: ${sak.tema || 'Ikke spesifisert'}

Generer følgende i JSON-format:

1. "oppsummering": En kort, lettfattelig oppsummering på 2-3 setninger som forklarer saken for vanlige borgere. Unngå politisk sjargong. Forklar hvordan dette påvirker folk i hverdagen.

2. "kategori": En kort kategori (1-2 ord) som beskriver saksområdet. Eksempler: "Bolig", "Helse", "Miljø", "Skatt", "Utdanning", "Forsvar", "Arbeid", "Samferdsel", "Justis", "Kultur".

3. "argumenter_for": En liste med 3-4 argumenter FOR forslaget. Hver argument skal være en setning som forklarer hvorfor noen støtter dette.

4. "argumenter_mot": En liste med 3-4 argumenter MOT forslaget. Hver argument skal være en setning som forklarer hvorfor noen er imot dette.

Svar KUN med gyldig JSON i dette formatet:
{
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
              { role: "system", content: "Du er en politisk analytiker som genererer nøytrale, balanserte analyser av stortingssaker på norsk. Svar alltid med gyldig JSON." },
              { role: "user", content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log('Rate limited, stopping batch');
            errors.push('Rate limit nådd - stoppet tidlig');
            break;
          }
          if (response.status === 402) {
            console.log('Payment required, stopping batch');
            errors.push('Betalingspåkrevet - stoppet tidlig');
            break;
          }
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const data = await response.json();
        const aiContent = data.choices?.[0]?.message?.content;

        if (!aiContent) {
          throw new Error('No content in AI response');
        }

        // Parse the JSON response
        const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanedContent);

        // Update the sak
        const { error: updateError } = await supabase
          .from('stortinget_saker')
          .update({
            oppsummering: parsed.oppsummering,
            kategori: parsed.kategori,
            argumenter_for: parsed.argumenter_for,
            argumenter_mot: parsed.argumenter_mot,
          })
          .eq('id', sak.id);

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        generated++;
        console.log(`✓ Generated ${generated}/${sortedSaker.length}: ${sak.tittel?.substring(0, 40)}...`);

        // Rate limit delay - 1.5 seconds between calls
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (sakError) {
        const errorMsg = sakError instanceof Error ? sakError.message : String(sakError);
        console.error(`✗ Error for sak ${sak.id}: ${errorMsg}`);
        errors.push(`${sak.id}: ${errorMsg}`);
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`Batch completed: ${generated}/${sortedSaker.length} generated in ${durationMs}ms`);

    // Update log
    if (logId) {
      await supabase
        .from('sync_log')
        .update({
          completed_at: new Date().toISOString(),
          ai_generated: generated,
          errors: errors.length > 0 ? errors : null,
          duration_ms: durationMs,
        })
        .eq('id', logId);
    }

    return new Response(JSON.stringify({
      success: true,
      generated,
      requested: count,
      found: sortedSaker.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : null,
      durationMs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Batch generation error:', errorMsg);

    if (logId) {
      await supabase
        .from('sync_log')
        .update({
          completed_at: new Date().toISOString(),
          ai_generated: generated,
          errors: [...errors, errorMsg],
          duration_ms: Date.now() - startTime,
        })
        .eq('id', logId);
    }

    return new Response(JSON.stringify({
      error: errorMsg,
      generated,
      errors,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
