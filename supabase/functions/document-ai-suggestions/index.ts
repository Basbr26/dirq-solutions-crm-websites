import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentContext {
  documentType: string;
  employeeName: string;
  startDate: string;
  functionalLimitations: string;
  canWorkPartial: boolean;
  partialWorkDescription?: string;
  expectedDuration?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, suggestionType } = await req.json() as { 
      context: DocumentContext; 
      suggestionType: 'probleemanalyse' | 'doelstellingen' | 'acties' | 'belemmeringen';
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = `Je bent een HR-specialist gespecialiseerd in de Nederlandse Wet Poortwachter en re-integratie bij ziekteverzuim. 
Je geeft concrete, professionele suggesties in het Nederlands.
Houd antwoorden beknopt en praktisch.`;

    let userPrompt = "";

    switch (suggestionType) {
      case 'probleemanalyse':
        userPrompt = `Genereer een professionele probleemanalyse tekst voor een verzuimcase.

Context:
- Medewerker: ${context.employeeName}
- Startdatum verzuim: ${context.startDate}
- Functionele beperkingen: ${context.functionalLimitations}
${context.canWorkPartial ? `- Kan gedeeltelijk werken: ${context.partialWorkDescription}` : '- Kan niet gedeeltelijk werken'}

Geef een korte, professionele analyse van maximaal 3-4 zinnen die:
1. De verzuimsituatie samenvat
2. De belangrijkste belemmeringen benoemt
3. Neutraal en privacy-vriendelijk is (geen medische diagnoses)`;
        break;

      case 'doelstellingen':
        userPrompt = `Genereer 3-4 concrete re-integratie doelstellingen voor een verzuimcase.

Context:
- Medewerker: ${context.employeeName}
- Startdatum verzuim: ${context.startDate}
- Functionele beperkingen: ${context.functionalLimitations}
${context.expectedDuration ? `- Verwachte duur: ${context.expectedDuration}` : ''}
${context.canWorkPartial ? `- Mogelijkheden gedeeltelijk werk: ${context.partialWorkDescription}` : ''}

Geef SMART doelstellingen, elk op een nieuwe regel met een bullet point (•).`;
        break;

      case 'acties':
        userPrompt = `Genereer 4-5 concrete acties voor een Plan van Aanpak re-integratie.

Context:
- Medewerker: ${context.employeeName}
- Startdatum verzuim: ${context.startDate}
- Functionele beperkingen: ${context.functionalLimitations}
${context.canWorkPartial ? `- Mogelijkheden gedeeltelijk werk: ${context.partialWorkDescription}` : ''}

Geef praktische acties met tijdsindicaties, elk op een nieuwe regel met een bullet point (•).
Focus op: contactmomenten, werkplekaanpassingen, opbouwschema, evaluatiemomenten.`;
        break;

      case 'belemmeringen':
        userPrompt = `Genereer een lijst van mogelijke belemmeringen voor werkhervatting.

Context:
- Functionele beperkingen: ${context.functionalLimitations}
${context.canWorkPartial ? `- Kan gedeeltelijk werken: ${context.partialWorkDescription}` : '- Kan niet gedeeltelijk werken'}

Geef 3-4 realistische belemmeringen, elk op een nieuwe regel met een bullet point (•).
Wees concreet maar privacy-vriendelijk (geen medische details).`;
        break;
    }

    console.log(`Generating ${suggestionType} suggestions for ${context.employeeName}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits zijn op, voeg credits toe aan je workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || "";

    console.log(`Generated suggestion: ${suggestion.substring(0, 100)}...`);

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in document-ai-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
