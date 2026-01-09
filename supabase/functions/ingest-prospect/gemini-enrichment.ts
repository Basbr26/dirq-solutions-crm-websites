/**
 * ============================================================
 * GEMINI AI ENRICHMENT MODULE
 * ============================================================
 * 
 * Generates AI-powered company audits and tech stack detection
 * using Google Gemini API.
 * 
 * Features:
 * - Company audit generation (250 words)
 * - Tech stack extraction from website
 * - Error handling with fallbacks
 * - Structured logging
 * 
 * Usage:
 * ```typescript
 * const audit = await generateCompanyAudit("Dirq Solutions", "https://dirq.nl", "Software");
 * const techStack = await extractTechStack("https://dirq.nl");
 * ```
 * 
 * @author Code Analyst AI
 * @date 9 januari 2026
 */

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[]
    }
    finishReason: string
  }[]
  promptFeedback?: {
    blockReason?: string
  }
}

/**
 * Generate professional company audit using Gemini AI
 * 
 * @param companyName - Name of the company
 * @param websiteUrl - Company website URL (optional)
 * @param industry - Industry/sector (optional)
 * @returns Audit summary or null if failed
 */
export async function generateCompanyAudit(
  companyName: string,
  websiteUrl?: string,
  industry?: string
): Promise<string | null> {
  try {
    console.log(`[Gemini] Generating audit for: ${companyName}`);

    const prompt = `
Je bent een senior business consultant gespecialiseerd in digitale transformatie.

Genereer een professionele bedrijfsanalyse voor:
**Bedrijf:** ${companyName}
**Website:** ${websiteUrl || 'Onbekend'}
**Sector:** ${industry || 'Algemeen'}

Structureer je analyse als volgt:

## 📊 Bedrijfsoverzicht
[2-3 zinnen over het bedrijf en wat ze doen]

## ✅ Sterke Punten
1. [Eerste sterke punt]
2. [Tweede sterke punt]
3. [Derde sterke punt]

## 🎯 Verbeterkansen
1. [Eerste verbeterpunt]
2. [Tweede verbeterpunt]
3. [Derde verbeterpunt]

## 💡 Conversie Optimalisatie
- [Tip 1]
- [Tip 2]
- [Tip 3]

## 💰 Geschatte Omzet
[Range in euro's, bijv. €500K - €2M]

**Belangrijke regels:**
- Maximaal 250 woorden
- Wees specifiek en actionable
- Gebruik Nederlandse taal
- Baseer je op algemene branche kennis
- Geen speculatie als je geen website hebt
`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600,
          topP: 0.9,
          topK: 40
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] API error:', response.status, errorText);
      return null;
    }

    const data: GeminiResponse = await response.json();
    
    // Check for content filtering
    if (data.promptFeedback?.blockReason) {
      console.warn('[Gemini] Content blocked:', data.promptFeedback.blockReason);
      return null;
    }

    const auditText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!auditText) {
      console.error('[Gemini] No text in response');
      return null;
    }

    console.log(`[Gemini] ✅ Audit generated (${auditText.length} chars)`);
    return auditText;

  } catch (error) {
    console.error('[Gemini] Enrichment error:', error);
    return null;
  }
}

/**
 * Extract technology stack from website using Gemini
 * 
 * @param websiteUrl - Website URL to analyze
 * @returns Array of technology names
 */
export async function extractTechStack(websiteUrl: string): Promise<string[]> {
  try {
    console.log(`[Gemini] Extracting tech stack for: ${websiteUrl}`);

    const prompt = `
Analyseer de volgende website en identificeer de technologie stack:

**Website:** ${websiteUrl}

Geef een JSON array terug met technologienamen.
Voorbeelden: ["WordPress", "WooCommerce", "React", "Tailwind CSS", "Google Analytics"]

**Regels:**
- Maximaal 8 items
- Alleen betrouwbare technologieën (geen speculatie)
- Output: Pure JSON array, geen extra tekst
- Als je niet zeker bent, geef een lege array terug

Format: ["Tech1", "Tech2", "Tech3"]
`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        generationConfig: {
          temperature: 0.3, // Lower temp for more consistent JSON
          maxOutputTokens: 200,
          topP: 0.8
        }
      })
    });

    if (!response.ok) {
      console.error('[Gemini] Tech stack API error:', response.status);
      return [];
    }

    const data: GeminiResponse = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Extract JSON array from response (handles markdown code blocks)
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate array
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        console.log(`[Gemini] ✅ Extracted ${parsed.length} technologies`);
        return parsed.slice(0, 8); // Max 8 items
      }
    }

    console.warn('[Gemini] No valid JSON array in response');
    return [];

  } catch (error) {
    console.error('[Gemini] Tech stack extraction error:', error);
    return [];
  }
}

/**
 * Generate lead scoring based on company data
 * 
 * @param companyName - Company name
 * @param companySize - Number of employees
 * @param industry - Industry sector
 * @param websiteQuality - Website quality (1-10)
 * @returns Lead score (0-100) or null if failed
 */
export async function generateLeadScore(
  companyName: string,
  companySize?: number,
  industry?: string,
  websiteQuality?: number
): Promise<number | null> {
  try {
    console.log(`[Gemini] Calculating lead score for: ${companyName}`);

    const prompt = `
Je bent een sales intelligence analyst. Bereken een lead score (0-100) voor:

**Bedrijf:** ${companyName}
**Medewerkers:** ${companySize || 'Onbekend'}
**Sector:** ${industry || 'Onbekend'}
**Website Kwaliteit:** ${websiteQuality ? `${websiteQuality}/10` : 'Onbekend'}

**Scoring criteria:**
- Bedrijfsgrootte: Hoe groter, hoe hoger (max 30 punten)
- Sector: Tech/Finance/Healthcare = hoog, Retail = gemiddeld (max 25 punten)
- Website Kwaliteit: Directe correlatie (max 25 punten)
- Digitale Maturity: Geschat op basis van sector (max 20 punten)

**Output:**
Geef ALLEEN een getal tussen 0-100 terug. Geen tekst, geen uitleg.
Voorbeeld: 75
`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Very low for consistent scoring
          maxOutputTokens: 10
        }
      })
    });

    if (!response.ok) return null;

    const data: GeminiResponse = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '0';
    
    // Extract number
    const scoreMatch = text.match(/\d+/);
    if (scoreMatch) {
      const score = parseInt(scoreMatch[0]);
      
      // Clamp between 0-100
      const clampedScore = Math.max(0, Math.min(100, score));
      
      console.log(`[Gemini] ✅ Lead score: ${clampedScore}`);
      return clampedScore;
    }

    return null;

  } catch (error) {
    console.error('[Gemini] Lead scoring error:', error);
    return null;
  }
}

/**
 * Health check - verify Gemini API is accessible
 * 
 * @returns true if API is working
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say OK" }] }],
        generationConfig: { maxOutputTokens: 5 }
      })
    });

    return response.ok;
  } catch {
    return false;
  }
}
