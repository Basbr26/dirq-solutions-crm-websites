# 💰 Kostenanalyse Module Activeren

## Probleem
De kostenanalyse page geeft deze fout:
```
Kostenanalyse niet beschikbaar
De kostenanalyse module vereist database migraties die nog niet zijn uitgevoerd.

Ontbrekende database componenten:
- Tabel: employee_cost_summary
- View: v_employee_total_compensation
```

## Oplossing

### Stap 1: Open Supabase SQL Editor
1. Ga naar [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecteer je project
3. Klik op **SQL Editor** in het linker menu
4. Klik op **New query**

### Stap 2: Voer de Migration Uit
1. Open het bestand: `supabase/migrations/20251218_company_cost_management.sql`
2. Kopieer de **volledige inhoud** (946 regels)
3. Plak in de Supabase SQL Editor
4. Klik op **Run** (of druk Ctrl+Enter)

### Stap 3: Verify
Na het runnen zou je moeten zien:
- ✅ Tabellen aangemaakt: `employee_cost_summary`, `company_settings`, `employee_contracts`, etc.
- ✅ View aangemaakt: `v_employee_total_compensation`
- ✅ Functies aangemaakt: `calculate_employee_monthly_cost`, `generate_offer_letter`

### Stap 4: Test
1. Refresh de HR platform pagina
2. Navigeer naar "Kosten" in het menu
3. De kostenanalyse dashboard zou nu moeten laden

## Wat wordt er geïnstalleerd?

Deze migration bevat:

### Tabellen
- `company_settings` - Bedrijfsinstellingen (CAO, fiscaal, payroll)
- `job_levels` - Functieniveaus met salarisschalen
- `salary_scales` - Gedetailleerde salarisschalen
- `allowance_types` - Toeslagen (shift, overtime, reiskosten)
- `benefits` - Secundaire arbeidsvoorwaarden (auto, pensioen, verzekeringen)
- `benefit_packages` - Arbeidsvoorwaardenpakketten
- `employee_contracts` - Complete arbeidscontracten
- `employee_contract_allowances` - Toeslagen per contract
- `employee_benefits` - Benefits per medewerker
- `employee_cost_summary` - Maandelijkse kostenberekeningen
- `offer_letter_templates` - Aanbiedingsbrief templates

### Views
- `v_employee_total_compensation` - Complete compensatie overzicht

### Functions
- `calculate_employee_monthly_cost()` - Bereken totale werkgeverskosten
- `generate_offer_letter()` - Genereer aanbiedingsbrief

### Standaard Data
- 11 standaard toeslagen (avond, nacht, weekend, etc.)
- 12 standaard benefits (pensioen, verzekeringen, lease auto, etc.)
- 1 standaard aanbiedingsbrief template (Nederlands)

## Alternatief: Via Supabase CLI

Als je Supabase CLI hebt geïnstalleerd:

```bash
cd "c:\Dirq apps\dirq-solutions-verzuim-744bd0e8"
supabase db push
```

## Troubleshooting

**Error: "relation already exists"**
- Migration is al uitgevoerd, page zou moeten werken
- Refresh de browser

**Error: "permission denied"**
- Je hebt geen admin rechten in Supabase
- Contact de Supabase project owner

**Error: "function update_updated_at_column() does not exist"**
- Deze functie moet eerst aangemaakt zijn
- Check of eerdere migrations zijn uitgevoerd

## Na Deployment

De kostenanalyse module ondersteunt:
- 📊 Real-time kostenanalyse per medewerker
- 💰 Budget forecasting
- 📈 Cost trends en analytics
- 📝 Complete contract management
- 🎁 Benefits & allowances tracking
- 📄 Automatische offer letter generatie

**Veel succes!** 🚀
