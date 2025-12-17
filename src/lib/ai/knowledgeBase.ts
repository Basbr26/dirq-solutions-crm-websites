/**
 * Knowledge Base voor AI HR Assistant
 * Bevat bedrijfsbeleid, procedures, en veelgestelde vragen
 */

export interface KnowledgeBaseEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  url?: string;
}

export const knowledgeBase: KnowledgeBaseEntry[] = [
  // Ziekmelding & Verzuim
  {
    id: 'sick-leave-procedure',
    category: 'Verzuim',
    question: 'Wat zijn de stappen bij ziekmelding?',
    answer: `Bij ziekmelding moet je de volgende stappen volgen:
1. Meld je direct op de eerste dag voor 9:00 uur ziek bij je leidinggevende (telefonisch of via app)
2. Je leidinggevende registreert de ziekmelding in het systeem
3. Binnen 1 week neemt de bedrijfsarts contact met je op
4. Blijf in contact met je leidinggevende over je herstel
5. Bij beter melden: meld herstel direct via de app of bij je leidinggevende
6. Na terugkeer: voer een terugkomgesprek met je leidinggevende

Bij langdurig verzuim (>6 weken) gelden aanvullende procedures volgens de Wet Poortwachter.`,
    keywords: ['ziek', 'ziekmelding', 'ziekmelden', 'verzuim', 'beter', 'herstel'],
    url: '/dashboard/medewerker',
  },
  {
    id: 'wet-poortwachter',
    category: 'Verzuim',
    question: 'Wat is de Wet Poortwachter?',
    answer: `De Wet Poortwachter (Wet verbetering Poortwachter) regelt de verplichtingen bij ziekte en re-integratie:

**Belangrijke mijlpalen:**
- Week 6: Probleemanalyse door werkgever en werknemer
- Week 8: Plan van Aanpak opstellen (re-integratieplan)
- Week 42: Eerste ziektejaar bijna om, intensievere begeleiding
- Week 88: Einde tweede ziektejaar, WIA-aanmelding

**Verplichtingen werknemer:**
- Meewerken aan re-integratie
- Afspraken met bedrijfsarts en re-integratiedeskundige nakomen
- Niet weigeren aangepast of ander werk (tenzij onredelijk)

**Verplichtingen werkgever:**
- Loon doorbetalen (min. 70% gedurende 2 jaar)
- Re-integratie inspanningen leveren
- Bedrijfsarts en deskundige inschakelen
- Plan van Aanpak opstellen en uitvoeren`,
    keywords: ['poortwachter', 'wet', 'loondoorbetaling', 'reintegratie', 're-integratie', 'wia'],
  },
  
  // Verlof
  {
    id: 'vacation-days',
    category: 'Verlof',
    question: 'Hoeveel verlofdagen heb ik?',
    answer: `Het aantal verlofdagen hangt af van je contract:
- Fulltime (40 uur): 25 dagen per jaar (wettelijk minimum: 20 dagen)
- Parttime: Naar rato van je contract
- Extra vrije dagen: 
  * Anciënniteitsdagen: +1 dag per 5 jaar dienst (max 3 extra dagen)
  * Levensfasedagen: Voor 55+ (1-6 dagen extra)

Je kunt je huidige saldo bekijken in je persoonlijke dashboard. Verlofdagen vervallen na 6 maanden in het nieuwe jaar.`,
    keywords: ['verlof', 'vakantie', 'vrij', 'verlofdagen', 'vakantiedagen', 'dagen'],
  },
  {
    id: 'leave-request',
    category: 'Verlof',
    question: 'Hoe vraag ik verlof aan?',
    answer: `Verlof aanvragen gaat als volgt:
1. Ga naar je dashboard → "Verlof Aanvragen"
2. Kies de periode en type verlof (vakantie, bijzonder verlof, etc.)
3. Voeg eventueel een notitie toe
4. Verstuur de aanvraag
5. Je leidinggevende ontvangt een notificatie
6. Je krijgt binnen 5 werkdagen een reactie

**Tips:**
- Vraag minstens 2 weken van tevoren aan (bij voorkeur 4 weken)
- Check met collega's of het niet te druk is
- Voor langere periodes (>2 weken): bespreek eerst met je leidinggevende`,
    keywords: ['verlof aanvragen', 'vakantie aanvragen', 'vrij vragen', 'verlof indienen'],
  },

  // Functioneren & Ontwikkeling
  {
    id: 'performance-review',
    category: 'Ontwikkeling',
    question: 'Wanneer is mijn functioneringsgesprek?',
    answer: `Functioneringsgesprekken vinden plaats volgens de volgende cyclus:
- Planningsgesprek: Begin van het jaar (januari/februari)
- Tussenevaluatie: Halverwege het jaar (juni/juli)
- Jaargesprek: Eind van het jaar (december)

Je leidinggevende plant deze gesprekken en nodigt je uit. Je kunt de datum zien in:
1. Je persoonlijke dashboard onder "Aankomende Afspraken"
2. Je e-mail (uitnodiging wordt verstuurd)
3. De gedeelde teamkalender

**Voorbereiding:**
- Bekijk je doelstellingen van het planningsgesprek
- Reflecteer op je prestaties en ontwikkeling
- Noteer punten die je wilt bespreken`,
    keywords: ['functioneren', 'functioneringsgesprek', 'beoordeling', 'evaluatie', 'jaargesprek'],
  },

  // Organisatie
  {
    id: 'team-structure',
    category: 'Organisatie',
    question: 'Wie is de manager van afdeling X?',
    answer: `Je kunt de organisatiestructuur bekijken via:
- Dashboard → "Teamoverzicht"
- HR Portal → "Organisatie" → "Teams"

Voor specifieke vragen over managers:
- Verkoop: Jan de Vries (j.devries@dirq.nl)
- Productie: Maria Jansen (m.jansen@dirq.nl)
- IT: Piet Bakker (p.bakker@dirq.nl)
- HR: Lisa van Dam (l.vandam@dirq.nl)
- Finance: Tom Visser (t.visser@dirq.nl)

Neem bij vragen direct contact op via e-mail of Teams.`,
    keywords: ['manager', 'leidinggevende', 'afdeling', 'team', 'hoofd', 'directeur'],
  },

  // Onkosten
  {
    id: 'expenses',
    category: 'Administratie',
    question: 'Hoe declareer ik onkosten?',
    answer: `Onkosten declareren:
1. Bewaar alle bonnetjes/facturen (digitaal of fysiek)
2. Ga naar Dashboard → "Onkosten Declareren"
3. Upload bonnetjes en vul het formulier in:
   - Datum van uitgave
   - Bedrag (incl. BTW)
   - Categorie (reiskosten, catering, materialen, etc.)
   - Korte beschrijving
4. Verstuur de declaratie
5. Goedkeuring door leidinggevende (binnen 1 week)
6. Uitbetaling volgende maand bij salarisrun

**Limieten:**
- Maaltijden: max €25 p.p.
- Zakelijke reizen: volgens NS-business tarief
- Parkeren: max €15 per dag
- Overnachting: max €150 per nacht

Voor uitzonderingen: overleg eerst met je leidinggevende.`,
    keywords: ['onkosten', 'declareren', 'declaratie', 'reiskosten', 'bonnetjes', 'terugbetaling'],
  },

  // Thuiswerken
  {
    id: 'remote-work',
    category: 'Arbeidsvoorwaarden',
    question: 'Wat is het thuiswerkbeleid?',
    answer: `Thuiswerk (hybride werken) beleid:
- 3 dagen op kantoor, 2 dagen thuis (standaard)
- Flexibel in te delen in overleg met team en leidinggevende
- Verplichte kantoordagen: dinsdag en donderdag (teamsessies)

**Voorwaarden:**
- Geschikte thuiswerkplek (ergonomisch)
- Stabiele internetverbinding
- Beschikbaar via Teams tijdens werkuren
- Aanwezig bij belangrijke meetings

**Faciliteiten:**
- Laptop en randapparatuur
- Thuiswerkvergoeding: €2,50 per dag
- Budget voor thuiswerkplek: eenmalig €500

Aanvragen via HR portal, goedkeuring door leidinggevende vereist.`,
    keywords: ['thuiswerken', 'hybride', 'remote', 'thuis', 'kantoor', 'flex'],
  },

  // Arbeidsvoorwaarden
  {
    id: 'salary-info',
    category: 'Arbeidsvoorwaarden',
    question: 'Wanneer krijg ik mijn salaris?',
    answer: `Salaris wordt uitbetaald:
- Datum: 25e van elke maand
- Als dit een weekend is: vrijdag ervoor
- Bij feestdagen: werkdag ervoor

**Salarisstrook:**
- Digitaal beschikbaar via HR portal
- E-mail notificatie bij nieuwe strook
- Bevat: bruto, netto, inhoudingen, vakantiegeld

**Vakantiegeld:**
- Uitbetaling in mei
- 8% van je jaarsalaris
- Automatisch mee in salarisrun mei

Voor vragen over salaris: neem contact op met Finance (finance@dirq.nl).`,
    keywords: ['salaris', 'loon', 'betaling', 'uitbetaling', 'vakantiegeld', 'strook'],
  },

  // Contact
  {
    id: 'hr-contact',
    category: 'Contact',
    question: 'Hoe kan ik HR bereiken?',
    answer: `HR is bereikbaar via:
- E-mail: hr@dirq.nl (response binnen 24 uur)
- Telefoon: 020-1234567 (werkdagen 09:00-17:00)
- Teams: Direct message naar HR team
- Spreekuur: Dinsdag en donderdag 13:00-15:00 (walk-in)
- HR portal: Voor aanvragen en vragen

**Voor urgente zaken:**
- Ziekmelding: Altijd eerst je leidinggevende
- Arbeidsconflict: Vertrouwenspersoon (vertrouwenspersoon@dirq.nl)
- Noodsituaties: Bedrijfshulpverlener (BHV@dirq.nl)

HR kantoor: Hoofdkantoor, 2e verdieping, kamer 2.12`,
    keywords: ['hr', 'contact', 'bereiken', 'hulp', 'vraag', 'spreekuur'],
  },
];

/**
 * Zoek relevante knowledge base entries op basis van query
 */
export function searchKnowledgeBase(query: string, limit = 3): KnowledgeBaseEntry[] {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(' ').filter(w => w.length > 2);

  // Score each entry based on keyword matches
  const scored = knowledgeBase.map(entry => {
    let score = 0;

    // Check if query contains any keywords
    entry.keywords.forEach(keyword => {
      if (queryLower.includes(keyword.toLowerCase())) {
        score += 10;
      }
    });

    // Check if individual words match
    words.forEach(word => {
      if (entry.question.toLowerCase().includes(word)) {
        score += 3;
      }
      if (entry.answer.toLowerCase().includes(word)) {
        score += 1;
      }
      entry.keywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(word)) {
          score += 2;
        }
      });
    });

    return { entry, score };
  });

  // Sort by score and return top results
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}

/**
 * Get category-specific knowledge
 */
export function getKnowledgeByCategory(category: string): KnowledgeBaseEntry[] {
  return knowledgeBase.filter(entry => entry.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(knowledgeBase.map(entry => entry.category));
  return Array.from(categories).sort();
}
