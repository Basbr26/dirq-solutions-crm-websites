/**
 * Finance Quote Templates
 * Professional quote templates for Finance Starter and Growth packages
 * 
 * ROLE: CODEUR + JURIST
 * - Juridisch correcte offertes met alle vereiste elementen
 * - Dynamische data uit CRM (bedrijfsinformatie, contactpersoon, etc.)
 * - Professionele structuur volgens Nederlandse standaarden
 */

export interface QuoteTemplateData {
  // Client information (from CRM)
  companyName: string;
  companyAddress?: string;
  companyCity?: string;
  companyPostalCode?: string;
  companyKvk?: string;
  companyVat?: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // Quote metadata
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
}

export interface QuoteTemplateItem {
  title: string;
  description: string;
  quantity: number;
  unit_price: number;
  category?: string;
}

export interface QuoteTemplate {
  title: string;
  description: string;
  items: QuoteTemplateItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  payment_terms: string;
  delivery_time: string;
  notes: string;
  client_notes: string;
}

/**
 * FINANCE STARTER PAKKET
 * €799,99 eenmalig + €99,00/maand
 * 
 * Juridische basis:
 * - Algemene Voorwaarden van toepassing
 * - Bedenktijd volgens artikel 6:230v BW
 * - Privacy volgens AVG/GDPR
 */
export const generateFinanceStarterQuote = (data: QuoteTemplateData): QuoteTemplate => {
  const setupFee = 799.99;
  const monthlyFee = 99.00;
  
  const items: QuoteTemplateItem[] = [
    {
      title: 'Finance Starter Website - Setup',
      description: `Eenmalige ontwikkeling en implementatie van uw Finance Starter website:

• Moderne, responsive website geoptimaliseerd voor alle apparaten
• Professioneel template specifiek voor de financiële dienstverlening
• SEO-geoptimaliseerde opzet voor vindbaarheid in zoekmachines
• SSL-certificaat voor veilige HTTPS-verbinding
• Basis contact- en aanvraagformulier met spam-bescherming
• Koppeling met Google Analytics voor bezoekersstatistieken
• Cookie-banner conform AVG/GDPR wetgeving
• Privacy statement en algemene voorwaarden pagina's
• 2 iteratierondes voor feedback en aanpassingen
• Technische documentatie en training

De website wordt opgeleverd binnen 14 werkdagen na akkoord op deze offerte en ontvangst van alle benodigde materialen (teksten, afbeeldingen, logo).`,
      quantity: 1,
      unit_price: setupFee,
      category: 'Setup',
    },
    {
      title: 'Finance Starter Website - Maandelijks Onderhoud',
      description: `Continue service en ondersteuning voor uw website:

• Technisch onderhoud en beveiligingsupdates
• Hosting op snelle en betrouwbare servers in Nederland/EU
• Dagelijkse back-ups met 30 dagen retentie
• SSL-certificaat verlenging en monitoring
• 99,9% uptime garantie met monitoring
• Ticket-based support via email (reactietijd: 48 uur werkdagen)
• Maandelijkse performance rapportage
• Maximum 1 uur kleine aanpassingen per maand (tekstwijzigingen, kleine updates)
• Domeinnaam registratie en beheer (excl. domeinkosten)

Maandelijkse kosten bedragen €${monthlyFee.toFixed(2)} en worden vooraf per kwartaal gefactureerd. Opzegging mogelijk met een opzegtermijn van 3 maanden.`,
      quantity: 12,
      unit_price: monthlyFee,
      category: 'Abonnement',
    },
  ];

  const subtotal = setupFee + (monthlyFee * 12);
  const tax_rate = 21;
  const tax_amount = (subtotal * tax_rate) / 100;
  const total_amount = subtotal + tax_amount;

  return {
    title: 'Finance Starter Website Pakket',
    description: `Professionele website voor ${data.companyName} met maandelijks onderhoud en support.`,
    items,
    subtotal,
    tax_rate,
    tax_amount,
    total_amount,
    
    payment_terms: `BETAALVOORWAARDEN:

Facturering vindt plaats volgens het volgende schema:
• Setup fee (€${setupFee.toFixed(2)} excl. BTW): Direct bij akkoord offerte, voor aanvang werkzaamheden
• Maandelijkse kosten jaar 1: Per kwartaal vooruitbetaald (€${(monthlyFee * 3).toFixed(2)} excl. BTW per kwartaal)
• Betalingstermijn: 14 dagen na factuurdatum
• Bij niet-tijdige betaling zijn wij gerechtigd wettelijke rente en incassokosten in rekening te brengen

De dienstverlening start pas na ontvangst van de betaling van de setup fee.`,

    delivery_time: `PLANNING & OPLEVERING:

• Aanvang: Direct na akkoord offerte en ontvangst setup fee
• Oplevering: Binnen 14 werkdagen na ontvangst alle benodigde materialen
• Materialen benodigd: Logo (vectorformaat), bedrijfskleuren, teksten, afbeeldingen, contactgegevens
• Feedback rondes: 2 iteraties inbegrepen voor aanpassingen
• Live datum: Na finale goedkeuring en DNS-koppeling (1-2 werkdagen)

Vertraging in aanlevering van materialen door opdrachtgever kan de opleveringsdatum beïnvloeden.`,

    notes: `JURIDISCHE INFORMATIE & VOORWAARDEN:

1. TOEPASSELIJKHEID
Op deze offerte en de daaruit voortvloeiende overeenkomst zijn onze Algemene Voorwaarden van toepassing. Deze zijn te raadplegen op onze website en worden bij akkoord meegezonden.

2. INTELLECTUEEL EIGENDOM
• Alle intellectuele eigendomsrechten van het geleverde werk worden overgedragen na volledige betaling
• Wij behouden het recht het werk te gebruiken in ons portfolio en voor marketingdoeleinden
• Gebruikte software, frameworks en standaard componenten blijven eigendom van de respectievelijke rechthebbenden

3. AANSPRAKELIJKHEID
• Onze aansprakelijkheid is beperkt tot het bedrag dat in het desbetreffende geval onder onze bedrijfsaansprakelijkheidsverzekering wordt uitbetaald
• Wij zijn niet aansprakelijk voor indirecte schade, gevolgschade of bedrijfsschade
• Opdrachtgever vrijwaart ons voor claims van derden met betrekking tot door opdrachtgever aangeleverd materiaal

4. PRIVACY & AVG/GDPR
• Wij verwerken persoonsgegevens conform de AVG/GDPR wetgeving
• Een verwerkersovereenkomst (DPA) wordt bij contractondertekening opgesteld
• Alle data wordt opgeslagen op servers binnen de EU

5. OPZEGGING & DUUR
• Het maandelijkse abonnement heeft een minimale looptijd van 12 maanden
• Na de initiële periode is opzegging mogelijk met inachtneming van 3 maanden opzegtermijn
• Bij opzegging vervallen alle hosting-, onderhoud- en supportdiensten per einddatum
• Opdrachtgever is verantwoordelijk voor het veiligstellen van eigen data voor opzegging

6. GELDIGHEID & AKKOORD
• Deze offerte is geldig tot ${data.validUntil}
• Door akkoord te geven verklaart u kennis te hebben genomen van en akkoord te gaan met onze Algemene Voorwaarden
• Akkoord kan worden gegeven per e-mail of door ondertekening van deze offerte`,

    client_notes: `Geachte heer/mevrouw ${data.contactLastName},

Hartelijk dank voor uw interesse in ons Finance Starter pakket. 

Dit pakket is speciaal ontwikkeld voor financiële dienstverleners die een professionele online aanwezigheid wensen zonder hoge initiële investeringen. Het pakket biedt een uitstekende basis voor lead generatie en client communicatie.

WAAROM FINANCE STARTER?
✓ Snel online: binnen 2 weken operationeel
✓ All-inclusive: geen verborgen kosten
✓ Professioneel: speciaal voor financial services
✓ Zorgeloos: volledig onderhoud inbegrepen
✓ Flexibel: opschaalbaar naar Growth pakket

VERVOLGSTAPPEN:
1. Akkoord geven op deze offerte
2. Ontvangst setup fee betaling
3. Kickoff meeting voor projectstart
4. Aanlevering materialen (logo, teksten, afbeeldingen)
5. Design goedkeuring (2 iteraties)
6. Live gang website

Heeft u nog vragen of wilt u aanvullende functionaliteit bespreken? Neem dan gerust contact met ons op. Wij denken graag met u mee over de beste oplossing voor uw organisatie.

Met vriendelijke groet,

Dirq Solutions
T: +31 (0)20 123 4567
E: info@dirqsolutions.nl
W: www.dirqsolutions.nl

KvK: 12345678
BTW: NL123456789B01`,
  };
};

/**
 * FINANCE GROWTH PAKKET
 * €1.299,99 eenmalig + €149,00/maand
 * 
 * Juridische basis:
 * - Algemene Voorwaarden van toepassing
 * - Bedenktijd volgens artikel 6:230v BW
 * - Privacy volgens AVG/GDPR
 * - SLA voor uptime en support
 */
export const generateFinanceGrowthQuote = (data: QuoteTemplateData): QuoteTemplate => {
  const setupFee = 1299.99;
  const monthlyFee = 149.00;
  
  const items: QuoteTemplateItem[] = [
    {
      title: 'Finance Growth Website - Setup',
      description: `Premium ontwikkeling en implementatie van uw Finance Growth website:

• Custom responsive website design specifiek voor uw branding
• Uitgebreide website met tot 10 pagina's (Home, Over Ons, Diensten, Blog, Contact, etc.)
• Geavanceerde SEO-optimalisatie inclusief keyword research en on-page SEO
• SSL-certificaat met Extended Validation (EV) voor maximaal vertrouwen
• Professionele contact- en lead capture formulieren met CRM-integratie
• Google Analytics & Google Search Console setup met custom dashboards
• Integratie Google Tag Manager voor marketing tracking
• Cookie consent management volgens AVG/GDPR
• Uitgebreide privacy statement en juridische pagina's
• Blog functionaliteit voor content marketing (WordPress/headless CMS)
• Nieuwsbrief aanmelding met Mailchimp/SendGrid integratie
• Social media integratie en share functies
• Performance optimalisatie (Page Speed 90+)
• 3 iteratierondes voor feedback en aanpassingen
• Uitgebreide documentatie en 2 uur persoonlijke training

De website wordt opgeleverd binnen 21 werkdagen na akkoord op deze offerte en ontvangst van alle benodigde materialen.`,
      quantity: 1,
      unit_price: setupFee,
      category: 'Setup',
    },
    {
      title: 'Finance Growth Website - Premium Onderhoud',
      description: `Uitgebreide service en proactieve ondersteuning:

• Premium technisch onderhoud en beveiligingsupdates
• High-performance hosting op dedicated servers in Nederland/EU
• Dagelijkse back-ups met 90 dagen retentie + off-site opslag
• SSL-certificaat EV verlenging en monitoring
• 99,95% uptime garantie met SLA en 24/7 monitoring
• Priority support via email en telefoon (reactietijd: 24 uur, maandag-vrijdag)
• Maandelijkse uitgebreide analytics en performance rapportage
• SEO monitoring en maandelijks advies rapport
• Security scanning en vulnerability monitoring
• CDN (Content Delivery Network) voor snellere laadtijden wereldwijd
• Maximum 2 uur aanpassingen per maand (content updates, kleine features)
• Kwartaaloverleg voor website optimalisatie en strategie
• Domeinnaam registratie en beheer (excl. domeinkosten)

Maandelijkse kosten bedragen €${monthlyFee.toFixed(2)} en worden vooraf per kwartaal gefactureerd. Opzegging mogelijk met een opzegtermijn van 3 maanden na de initiële contractperiode van 12 maanden.`,
      quantity: 12,
      unit_price: monthlyFee,
      category: 'Abonnement',
    },
  ];

  const subtotal = setupFee + (monthlyFee * 12);
  const tax_rate = 21;
  const tax_amount = (subtotal * tax_rate) / 100;
  const total_amount = subtotal + tax_amount;

  return {
    title: 'Finance Growth Website Pakket',
    description: `Premium custom website voor ${data.companyName} met uitgebreide functionaliteit en premium support.`,
    items,
    subtotal,
    tax_rate,
    tax_amount,
    total_amount,
    
    payment_terms: `BETAALVOORWAARDEN:

Facturering vindt plaats volgens het volgende schema:
• Setup fee (€${setupFee.toFixed(2)} excl. BTW): 50% bij akkoord offerte, 50% bij oplevering
• Maandelijkse kosten jaar 1: Per kwartaal vooruitbetaald (€${(monthlyFee * 3).toFixed(2)} excl. BTW per kwartaal)
• Betalingstermijn: 14 dagen na factuurdatum
• Bij niet-tijdige betaling zijn wij gerechtigd wettelijke rente (Wettelijke Handelsrente) en incassokosten conform artikel 6:96 lid 4 BW in rekening te brengen

De dienstverlening start na ontvangst van de eerste termijn van de setup fee. Oplevering vindt plaats na betaling van de tweede termijn.`,

    delivery_time: `PLANNING & OPLEVERING:

• Kickoff meeting: Binnen 3 werkdagen na akkoord en eerste betaling
• Design fase: Weken 1-2 (inclusief 2 design iteraties)
• Development fase: Weken 2-3 (inclusief 1 functionaliteit iteratie)
• Testing & QA: Week 4 (cross-browser, responsive, performance)
• Training & oplevering: Begin week 4
• Materialen benodigd: Logo (vector), style guide/huisstijlhandboek, content, afbeeldingen (high-res), contactgegevens, social media accounts
• Feedback rondes: 3 iteraties inbegrepen verspreid over design en development
• Live datum: Na finale goedkeuring en DNS-koppeling (1-2 werkdagen)

Een gedetailleerde projectplanning wordt tijdens de kickoff meeting opgesteld. Vertraging in aanlevering van materialen door opdrachtgever kan de opleveringsdatum evenredig beïnvloeden.`,

    notes: `JURIDISCHE INFORMATIE & VOORWAARDEN:

1. TOEPASSELIJKHEID
Op deze offerte en de daaruit voortvloeiende overeenkomst zijn onze Algemene Voorwaarden van toepassing. Deze worden bij akkoord in kopie meegezonden en zijn te allen tijde te raadplegen op www.dirqsolutions.nl/algemene-voorwaarden.

2. INTELLECTUEEL EIGENDOM
• Alle intellectuele eigendomsrechten van het specifiek voor u ontwikkelde maatwerk worden overgedragen na volledige betaling conform artikel 2 Auteurswet
• Wij behouden het recht het werk te gebruiken in ons portfolio en voor marketingdoeleinden, tenzij anders overeengekomen
• Gebruikte software, frameworks, libraries en standaard componenten blijven eigendom van de respectievelijke rechthebbenden en worden gelicenseerd conform hun licentievoorwaarden (veelal open source MIT/GPL)
• Source code wordt na volledige betaling beschikbaar gesteld via een privé Git repository

3. AANSPRAKELIJKHEID & VRIJWARING
• Onze aansprakelijkheid is beperkt tot het bedrag dat in het desbetreffende geval onder onze beroepsaansprakelijkheidsverzekering wordt uitbetaald (€1.000.000 per gebeurtenis, €2.000.000 per jaar)
• Voor diensten vallend onder het abonnement is de aansprakelijkheid beperkt tot het bedrag van de abonnementskosten over de voorafgaande 6 maanden
• Wij zijn niet aansprakelijk voor indirecte schade, gevolgschade, gederfde winst, gemiste besparingen of schade door bedrijfsstagnatie conform artikel 6:95 BW
• Opdrachtgever vrijwaart ons voor alle claims van derden met betrekking tot intellectuele eigendomsrechten of andere rechten op door opdrachtgever verstrekt materiaal

4. SERVICE LEVEL AGREEMENT (SLA)
• Uptime garantie: 99,95% per maand (gemeten uptime)
• Support reactietijd: 24 uur werkdagen voor priority support tickets
• Support beschikbaarheid: Maandag t/m vrijdag, 09:00-17:00 uur (Nederlandse feestdagen uitgezonderd)
• Geplande onderhoudswerkzaamheden: Aankondiging minimaal 48 uur van tevoren
• Bij niet-halen SLA: Creditering van 5% abonnementskosten per begonnen percentage onder garantie

5. PRIVACY & AVG/GDPR COMPLIANCE
• Wij verwerken persoonsgegevens strikt conform de Algemene Verordening Gegevensbescherming (AVG/GDPR)
• Een Verwerkersovereenkomst (Data Processing Agreement) conform artikel 28 AVG wordt bij contractondertekening opgesteld
• Alle data wordt opgeslagen op ISO 27001 gecertificeerde servers binnen de EU (primair Nederland)
• Dataportabiliteit: Op verzoek leveren wij alle data in machine-leesbaar formaat conform artikel 20 AVG
• Recht op vergetelheid: Wij hanteren procedures voor datasuppressie conform artikel 17 AVG

6. BACKUP & DISASTER RECOVERY
• Dagelijkse automatische backups met 90 dagen retentie
• Wekelijkse off-site backup naar geografisch gescheiden locatie
• Recovery Time Objective (RTO): 4 uur voor website restore
• Recovery Point Objective (RPO): Maximaal 24 uur data verlies
• Disaster recovery test: Jaarlijks uitgevoerd en gedocumenteerd

7. WIJZIGINGEN & MEERWERK
• Wijzigingen buiten de scope van deze offerte worden aangemerkt als meerwerk
• Meerwerk wordt vooraf schriftelijk gecommuniceerd met kostenspecificatie
• Ons standaard uurtarief voor meerwerk bedraagt €95,- excl. BTW
• Maandelijks inbegrepen uren zijn niet cumulatief en vervallen aan einde van de maand

8. OPZEGGING, DUUR & OVERGANG
• Het maandelijkse abonnement heeft een minimale looptijd van 12 maanden vanaf live gang website
• Na de initiële periode verlengt het contract automatisch met 12 maanden tenzij opgezegd
• Opzegging is mogelijk met inachtneming van 3 maanden opzegtermijn per aangetekende post of email met ontvangstbevestiging
• Bij opzegging blijft opdrachtgever verplicht tot betaling voor de gehele opzegtermijn
• Bij opzegging eindigen alle hosting-, onderhoud-, support- en backup-diensten per einddatum
• Opdrachtgever ontvangt 30 dagen voor einddatum een volledige data-export en heeft tot 30 dagen na einddatum toegang tot backups
• Bij opzegging wegens tekortkoming door ons vervallen alle betalingsverplichtingen na de datum van tekortkoming

9. FORCE MAJEURE
• Bij overmacht zijn beide partijen niet gehouden tot nakoming van verplichtingen
• Als overmacht geldt o.a.: oorlog, natuurrampen, terrorisme, pandemie, energiestoring, internetstoring, datacenterstoringen, handelingen overheid
• Bij overmacht langer dan 60 dagen kan de overeenkomst door beide partijen worden ontbonden zonder schadevergoedingsplicht

10. TOEPASSELIJK RECHT & GESCHILLEN
• Op deze overeenkomst is Nederlands recht van toepassing
• Geschillen worden bij uitsluiting voorgelegd aan de bevoegde rechter in het arrondissement Amsterdam
• Partijen zullen zich eerst inspannen geschillen in onderling overleg op te lossen alvorens een rechtsgang te starten

11. GELDIGHEID & AKKOORD
• Deze offerte is geldig tot ${data.validUntil}
• Na deze datum behouden wij ons het recht voor prijzen en voorwaarden aan te passen
• Door akkoord te geven verklaart u:
  - Kennis te hebben genomen van en akkoord te gaan met onze Algemene Voorwaarden
  - Te beschikken over de bevoegdheid namens ${data.companyName} deze overeenkomst aan te gaan
  - Alle verstrekte informatie naar waarheid en volledig te hebben verstrekt
• Akkoord kan worden gegeven per e-mail of door ondertekening en retourzending van deze offerte`,

    client_notes: `Geachte heer/mevrouw ${data.contactLastName},

Hartelijk dank voor uw interesse in ons Finance Growth pakket.

Dit premium pakket is speciaal ontwikkeld voor ambitieuze financiële dienstverleners die een krachtige online aanwezigheid willen opbouwen. Het pakket biedt geavanceerde functionaliteit, uitgebreide SEO-ondersteuning en premium support voor maximale online zichtbaarheid en conversie.

WAAROM FINANCE GROWTH?
✓ Custom design: Unieke website passend bij uw branding
✓ SEO powerhouse: Geavanceerde SEO voor hoge Google rankings
✓ Lead machine: Geoptimaliseerd voor conversie en lead generatie
✓ Blog functionaliteit: Content marketing voor thought leadership
✓ Premium support: Priority support met SLA-garanties
✓ Schaalbaar: Uitbreidbaar met custom features
✓ Analytics: Uitgebreide rapportage en maandelijks advies

HET VERSCHIL MET STARTER:
• Custom design vs. template design
• 10 pagina's vs. 5 pagina's
• Geavanceerde SEO vs. basis SEO
• Blog functionaliteit
• CRM integratie voor lead management
• 99,95% vs. 99,9% uptime SLA
• 24-uurs vs. 48-uurs support reactie
• 2 uur vs. 1 uur maandelijkse aanpassingen
• Kwartaaloverleg voor optimalisatie

IDEAAL VOOR:
• Groeiende financial advisory practices
• Hypotheekadviesbureaus met meerdere adviseurs
• Verzekeringskantoren met breed productaanbod
• Beleggingsadviseurs met content marketing strategie
• Financiële dienstverleners die online leads willen genereren

VERVOLGSTAPPEN:
1. Akkoord geven op deze offerte
2. Ontvangst eerste termijn setup fee (50%)
3. Kickoff meeting: kennismaking, planning, requirements
4. Design fase: Schetsen, wireframes, visual design (2 iteraties)
5. Aanlevering content en materialen
6. Development & bouw website
7. Review en feedback (1 iteratie)
8. Training en overdracht (2 uur persoonlijk)
9. Oplevering na betaling tweede termijn
10. Live gang en start premium support

EXTRA OPTIES (niet inbegrepen, op aanvraag):
• E-commerce functionaliteit voor online cursussen/producten
• Advanced CRM integratie (Salesforce, HubSpot)
• Custom calculator tools (hypotheek, pensioen, beleggingen)
• Klantportaal voor documentuitwisseling
• Multi-language ondersteuning
• Advanced marketing automation
• Video content productie
• Copywriting services voor alle website content

ROI PERSPECTIEF:
Een professionele website met goede SEO genereert gemiddeld 3-5 nieuwe leads per maand voor financial services. Bij een conversieratio van 20% en een gemiddelde klantwaarde van €2.000, verdient de website zichzelf binnen 6-12 maanden terug.

Heeft u vragen over de functionaliteit, wilt u een demo zien van vergelijkbare projecten, of wilt u aanvullende features bespreken? We nodigen u graag uit voor een vrijblijvend gesprek op ons kantoor of via videocall.

Met vriendelijke groet,

Dirq Solutions - Digital Transformation
T: +31 (0)20 123 4567
E: info@dirqsolutions.nl
W: www.dirqsolutions.nl

KvK: 12345678
BTW: NL123456789B01
IBAN: NL00RABO0123456789

"Uw digitale partner voor groei"`,
  };
};

/**
 * Helper function to format currency
 */
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Helper function to calculate first year total cost
 */
export const calculateFirstYearTotal = (setupFee: number, monthlyFee: number): number => {
  return setupFee + (monthlyFee * 12);
};
