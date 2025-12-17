# Executive Dashboard - Documentatie

## Overzicht
Het Executive Dashboard is een geavanceerd analytics dashboard voor HR management met real-time KPI's, predictive analytics, en AI-gedreven inzichten.

## Features

### 1. Real-time KPI Cards
- **Total FTE**: Totaal aantal actieve medewerkers met trend indicator
- **Verzuimpercentage**: Actueel verzuimpercentage inclusief Bradford Factor
- **Gemiddelde Kosten per Verzuimgeval**: Totale kosten inclusief directe en indirecte kosten
- **Open Vacancies**: Aantal openstaande vacatures met gemiddelde time-to-hire
- **Employee Turnover Rate**: Personeelsverloop over rolling 12 maanden periode

### 2. Predictive Verzuim Analytics
Machine learning model dat verzuimrisico voorspelt per medewerker:
- **Risk Scoring**: 0-100 score met categorieën (Laag/Gemiddeld/Hoog)
- **Confidence Level**: Betrouwbaarheid van voorspelling (0-100%)
- **Risk Factors**: Gedetailleerde analyse van risicofactoren
  - Bradford Factor score
  - Verzuimfrequentie
  - Seizoensinvloeden
  - Leeftijdscategorieën
  - Dienstverbandsduur
- **Actionable Recommendations**: Concrete actiepunten per medewerker

#### Bradford Factor
De Bradford Factor wordt berekend als: **S² × D**
- S = Aantal verzuimgevallen
- D = Totaal aantal verzuimdagen

Drempelwaarden:
- < 50: Geen actie
- 50-200: Let op
- 200-500: Gesprek noodzakelijk
- > 500: Formele waarschuwing

### 3. Interactive Charts (Recharts)

#### Verzuimtrend met Forecast
- **Line chart**: Historische data laatste 12 maanden
- **Dotted line**: AI-voorspelling voor komende 3 maanden
- **Y-axis**: Verzuimpercentage
- **X-axis**: Maanden

#### Departement Vergelijking
- **Bar chart**: Verzuimpercentage per afdeling
- **Benchmark bars**: Industrie/organisatie benchmarks
- **Kleuren**: Blauw (actueel), Groen (benchmark)

#### Kosten Breakdown
- **Pie chart**: Verdeling verzuimkosten
  - Directe loonkosten (45%)
  - Vervangingskosten (22%)
  - Productiviteitsverlies (15%)
  - Administratie (6%)
  - Overige (12%)

### 4. Smart Alerts Section
Real-time waarschuwingen met severity levels:

#### Alert Types
1. **Deadline Alerts** ⏰
   - Wet Poortwachter deadlines (< 3 dagen)
   - Plan van Aanpak vervaldatum
   - WIA-aanmelding termijn

2. **Budget Warnings** 💰
   - Verzuimkosten boven threshold
   - Budget overschrijding per afdeling
   - Kostenstijging > 10% vs vorige periode

3. **Compliance Risks** ⚠️
   - Missing documents (Plan van Aanpak, re-integratie verslag)
   - Late evaluations
   - Ontbrekende bedrijfsarts consultaties

4. **Team Capacity Issues** 👥
   - > 15% verzuim in één team
   - Kritieke functies niet bezet
   - Overbelasting waarschuwingen

#### Severity Levels
- **Critical** (rood): Directe actie vereist binnen 24 uur
- **Warning** (oranje): Actie vereist deze week
- **Info** (blauw): Ter informatie, monitoring

### 5. Quick Actions
Snelle toegang tot veelgebruikte acties:
- **Start Re-integratie Gesprek**: Voor high-risk cases
- **Generate Maandrapport**: Auto PDF export
- **Plan Preventie Actie**: Voor teams met hoog verzuim
- **Benchmark Analyse**: Vergelijking met industrie

## Technische Implementatie

### Tech Stack
```typescript
- React 18 + TypeScript
- TanStack Query (data fetching & caching)
- Recharts (data visualisatie)
- Supabase (database & realtime)
- shadcn/ui (UI componenten)
- TailwindCSS (styling)
```

### File Structure
```
src/
├── pages/
│   └── DashboardExecutive.tsx          # Hoofdpagina
├── components/
│   └── executive/
│       ├── PredictiveAnalytics.tsx     # ML predictions UI
│       └── SmartAlerts.tsx             # Alerts component
└── lib/
    └── analytics/
        └── verzuimPredictor.ts         # ML model & algoritmes
```

### ML Model Features
Het predictive model gebruikt de volgende features:

```typescript
interface EmployeeFeatures {
  verzuimHistory: {
    totalDays: number;      // Totaal verzuimdagen
    frequency: number;      // Aantal keer verzuimd
    avgDuration: number;    // Gemiddelde duur
  };
  bradfordFactor: number;   // Bradford Factor score
  demographics: {
    age: number;
    tenure: number;         // Maanden in dienst
  };
  seasonal: {
    currentMonth: number;
    isWinter: boolean;      // Hoger risico
  };
  currentStatus: {
    isAbsent: boolean;      // Nu ziek?
  };
}
```

### Algoritme Weights
```typescript
- Verzuimfrequentie: 40%
- Bradford Factor: 30%
- Gemiddelde duur: 20%
- Huidig verzuim: 10%

Multipliers:
- Seizoen (winter): 1.2x
- Leeftijd (<25 of >55): 1.3x
- Tenure (<12 maanden): 1.2x
```

## Data Sources

### Supabase Tables
```sql
-- Medewerkers
profiles (id, voornaam, achternaam, geboortedatum, functie)

-- Verzuimgevallen
sick_leave_cases (
  id, 
  employee_id, 
  start_date, 
  expected_end_date,
  case_status,
  reason
)

-- Taken
tasks (
  id,
  case_id,
  title,
  status,
  due_date,
  assigned_to
)
```

## Toegang & Permissies

### Rollen met Toegang
- ✅ **Super Admin**: Volledige toegang
- ✅ **HR**: Volledige toegang
- ❌ **Manager**: Geen toegang
- ❌ **Medewerker**: Geen toegang

### Route
```
/dashboard/executive
```

### Navigatie
- Desktop: Button in DashboardHeader ("Executive" met BarChart3 icon)
- Mobile: Dropdown menu item

## Performance

### Optimalisaties
- Data caching met TanStack Query
- Lazy loading van charts
- Memoization van berekeningen
- Debounced API calls

### Laadtijden (targets)
- Initial load: < 2 seconden
- Chart render: < 500ms
- Real-time updates: < 1 seconde

## Toekomstige Verbeteringen

### Phase 2 Features
1. **Geavanceerd ML Model**
   - TensorFlow.js integratie
   - Deep learning voor betere voorspellingen
   - Training op historische bedrijfsdata

2. **Export Functionaliteit**
   - PDF rapporten met branding
   - Excel export van ruwe data
   - Email scheduling voor maandrapportages

3. **Drilldown Analyses**
   - Klikbare charts → detail views
   - Cohort analyses
   - Departement deep-dives

4. **Realtime Dashboard**
   - Supabase Realtime subscriptions
   - Live KPI updates
   - Push notificaties voor critical alerts

5. **Benchmark Database**
   - Industrie benchmarks per sector
   - Organisatie grootte vergelijking
   - Regionale data

## Troubleshooting

### Common Issues

**Charts niet zichtbaar**
- Check of Recharts correct geïnstalleerd is: `npm install recharts`
- Verify dat data in correct formaat is

**Predictions leeg**
- Minimaal 3 verzuimgevallen nodig in history
- Check of employee data correct wordt opgehaald

**Errors in console**
```typescript
// Fix: Ensure proper types
interface VerzuimTrendPoint {
  month: string;
  verzuim: number;
  isForecast: boolean;
}
```

## Support
Voor vragen of issues, neem contact op met het dev team.

## Changelog

### v1.0.0 (December 2025)
- ✨ Initial release
- 📊 5 KPI cards met trend indicators
- 🤖 Predictive analytics met ML model
- 📈 3 interactive charts (Line, Bar, Pie)
- 🔔 Smart alerts systeem
- ⚡ Quick actions menu
