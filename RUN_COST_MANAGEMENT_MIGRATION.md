# 🚀 Cost Management System Activeren

## Probleem
De Cost Analytics en Executive Dashboard pagina's tonen een grijs scherm omdat de benodigde database tabellen nog niet bestaan.

## Oplossing
De database migratie uitvoeren in Supabase.

## Stappen

### Optie 1: Via Supabase Dashboard (Aanbevolen)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecteer je project
3. Ga naar **SQL Editor**
4. Klik op **New Query**
5. Open het bestand: `supabase/migrations/20251218_company_cost_management.sql`
6. Kopieer de volledige inhoud (981 regels)
7. Plak in de SQL Editor
8. Klik op **Run** (of druk Ctrl+Enter)

### Optie 2: Via CLI

```bash
# Zorg dat je in de project directory bent
cd "c:\Dirq apps\dirq-solutions-verzuim-744bd0e8"

# Login in Supabase (als je dat nog niet hebt gedaan)
npx supabase login

# Link je project
npx supabase link --project-ref [je-project-ref]

# Push de migratie
npx supabase db push
```

## Wat wordt er aangemaakt?

### Database Tabellen
- ✅ `company_settings` - Bedrijfsprofiel en instellingen
- ✅ `job_levels` - Functieniveaus met salaris ranges
- ✅ `salary_scales` - Salarisschalen per niveau en afdeling
- ✅ `allowance_types` - Toeslagen (avond, nacht, weekend, etc.)
- ✅ `benefits` - Secundaire arbeidsvoorwaarden (pensioen, auto, etc.)
- ✅ `benefit_packages` - Vooraf gedefinieerde paketten
- ✅ `employee_contracts` - Arbeidscontracten met compensatie
- ✅ `employee_contract_allowances` - Toeslagen per contract
- ✅ `employee_benefits` - Benefits per medewerker
- ✅ `employee_cost_summary` - **Maandelijkse kosten berekeningen**
- ✅ `offer_letter_templates` - Aanbiedingsbrief templates

### Views
- ✅ `v_employee_total_compensation` - Totale compensatie overzicht

### Functions
- ✅ `calculate_employee_monthly_cost()` - Bereken maandelijkse werkgeverskosten
- ✅ `generate_offer_letter()` - Genereer aanbiedingsbrief met placeholders

### Standaard Data
- 11 voorgedefinieerde toeslagen (avond, nacht, weekend, overuren, etc.)
- 12 standaard benefits (pensioen, lease auto, verzekeringen, etc.)
- 1 standaard Nederlandse aanbiedingsbrief template

## Verificatie

Na het uitvoeren van de migratie, verifieer dat alles werkt:

1. Refresh de Cost Analytics pagina
2. Refresh de Executive Dashboard pagina
3. Je zou nu de dashboards met content moeten zien (of een melding dat er nog geen data is)

## Troubleshooting

### "relation does not exist" error
➜ De migratie is nog niet succesvol uitgevoerd. Probeer opnieuw.

### "permission denied" error
➜ Check of je super_admin of hr rol hebt in de profiles tabel.

### Pagina blijft leeg maar geen error
➜ Er is nog geen data. Dit is normaal voor een nieuwe installatie.
➜ Maak eerst medewerkers en contracten aan via de HR module.

## Volgende Stappen

Na het uitvoeren van de migratie kun je:
1. **Company Settings** configureren (CAO, vakantiegeld %, etc.)
2. **Job Levels** aanmaken (Junior, Medior, Senior, etc.)
3. **Salary Scales** definiëren per niveau
4. **Employee Contracts** aanmaken met salaris en benefits
5. Cost Analytics en Executive Dashboard gebruiken voor rapportage

## Support

Als je problemen ondervindt, check:
- Supabase Logs (Dashboard > Logs)
- Browser Console (F12 > Console tab)
- Network tab (F12 > Network) voor API errors

---

**Geschatte uitvoeringstijd:** 30 seconden  
**Database wijzigingen:** 11 tabellen, 1 view, 2 functions  
**Impact:** Geen impact op bestaande data
