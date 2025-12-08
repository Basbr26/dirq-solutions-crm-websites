# Dirq Solutions Verzuim - Documentatie

## Overzicht

Dirq Solutions Verzuim is een verzuimbeheersysteem dat organisaties helpt bij het beheren van ziekteverzuim volgens de Wet Poortwachter. De applicatie ondersteunt het volledige verzuimproces van ziekmelding tot herstel of WIA-aanvraag.

---

## Gebruikersrollen

De applicatie kent vier verschillende gebruikersrollen, elk met specifieke rechten en verantwoordelijkheden.

### 1. Super Admin
**Toegang:** `/dashboard/super-admin`

**Verantwoordelijkheden:**
- Beheer van het volledige systeem
- Aanmaken en beheren van gebruikersaccounts
- Aanmaken en beheren van afdelingen
- Toewijzen van managers aan afdelingen
- Toewijzen van rollen aan gebruikers

**Rechten:**
- ✅ Gebruikers aanmaken, bewerken en verwijderen
- ✅ Afdelingen aanmaken, bewerken en verwijderen
- ✅ Alle rollen toewijzen (super_admin, hr, manager, medewerker)
- ✅ Toegang tot HR-dashboard via dashboardwisselaar
- ✅ Volledige toegang tot alle verzuimdossiers
- ✅ Alle documenten inzien en beheren

---

### 2. HR Medewerker
**Toegang:** `/dashboard/hr`

**Verantwoordelijkheden:**
- Overzicht en monitoring van alle verzuimdossiers
- Bewaking van Wet Poortwachter deadlines
- Ondersteuning van managers bij verzuimbegeleiding
- Documentbeheer en archivering
- Rapportage en analyse

**Rechten:**
- ✅ Alle verzuimdossiers inzien
- ✅ Verzuimdossiers aanmaken en bewerken
- ✅ Taken aanmaken en toewijzen
- ✅ Documenten uploaden en beheren
- ✅ Gesprekverslagen inzien en toevoegen
- ✅ Activiteitenlogboek inzien
- ✅ Analytics en rapportages bekijken
- ❌ Geen gebruikersbeheer (alleen super_admin)

---

### 3. Manager (Leidinggevende)
**Toegang:** `/dashboard/manager`

**Verantwoordelijkheden:**
- Dagelijkse verzuimbegeleiding van teamleden
- Voeren van verzuimgesprekken
- Uitvoeren van Wet Poortwachter taken
- Documenteren van afspraken en voortgang

**Rechten:**
- ✅ Verzuimdossiers van eigen teamleden inzien
- ✅ Ziekmeldingen registreren voor eigen team
- ✅ Eigen taken inzien en afronden
- ✅ Gesprekverslagen toevoegen
- ✅ Documenten uploaden en ondertekenen
- ✅ Gespreksnotities vastleggen
- ✅ Analytics van eigen team bekijken
- ❌ Geen toegang tot dossiers van andere teams
- ❌ Geen gebruikersbeheer

---

### 4. Medewerker (Werknemer)
**Toegang:** `/dashboard/medewerker`

**Verantwoordelijkheden:**
- Meewerken aan re-integratie
- Ondertekenen van documenten
- Bijhouden van eigen herstelproces

**Rechten:**
- ✅ Eigen verzuimdossier inzien
- ✅ Eigen documenten inzien
- ✅ Documenten ondertekenen
- ✅ Timeline/updates van eigen dossier bekijken
- ❌ Geen toegang tot dossiers van collega's
- ❌ Geen bewerkingsrechten op dossier

---

## Kernfunctionaliteiten

### Verzuimregistratie
- **Ziekmeldingswizard**: Stapsgewijze registratie met Wet Poortwachter compliance
- **Privacy-richtlijnen**: Ingebouwde guidance over toegestane en verboden vragen
- **Functionele beperkingen**: Gestructureerde vastlegging van beperkingen
- **Verwachte hersteldatum**: Planning en monitoring van hersteltraject

### Takenbeheer
- **Automatische taakgeneratie**: Wet Poortwachter taken worden automatisch aangemaakt
- **Deadline monitoring**: Waarschuwingen bij naderende deadlines
- **Taaktoewijzing**: Taken worden toegewezen aan de verantwoordelijke manager
- **Kalenderexport**: Export naar Google Calendar, Outlook of ICS-bestand

### Documentbeheer
- **Documentgeneratie**: Automatisch genereren van Wet Poortwachter documenten:
  - Probleemanalyse
  - Plan van Aanpak
  - Evaluatie (3, 6 en 12 maanden)
  - Herstelmelding
  - UWV 42-weken melding
  - Gespreksverslag
- **Digitale handtekeningen**: Documenten kunnen digitaal worden ondertekend
- **Preview functie**: Documenten bekijken voordat ze worden opgeslagen

### Gespreksnotities
- **Gesprekken documenteren**: Vastleggen van verzuimgesprekken
- **Afspraken bijhouden**: Registratie van gemaakte afspraken
- **Stemming werknemer**: Optionele registratie van stemming
- **Vervolgacties**: Planning van follow-up activiteiten

### Notificaties
- **In-app notificaties**: Realtime meldingen in de applicatie
- **E-mail notificaties**: Optionele e-mailmeldingen (Resend integratie)
- **Automatische triggers**:
  - Nieuwe ziekmelding
  - Statuswijziging dossier
  - Taak toegewezen
  - Taak afgerond
  - Document vereist handtekening
  - Document ondertekend

### Analytics & Rapportage
- **Verzuimoverzicht**: Dashboard met actuele verzuimcijfers
- **Trendanalyse**: Inzicht in verzuimpatronen
- **Afdelingsoverzicht**: Vergelijking tussen afdelingen

---

## Wet Poortwachter Tijdlijn

De applicatie ondersteunt de wettelijke deadlines:

| Week | Actie |
|------|-------|
| Week 1 | Ziekmelding bij Arbodienst/bedrijfsarts |
| Week 6 | Probleemanalyse door bedrijfsarts |
| Week 8 | Plan van Aanpak opstellen |
| Week 13 | Eerste evaluatie (3 maanden) |
| Week 26 | Evaluatie na 6 maanden |
| Week 42 | Melding bij UWV |
| Week 52 | Evaluatie na 1 jaar |
| Week 87 | Voorbereiden WIA-aanvraag |
| Week 91 | WIA-aanvraag indienen |

---

## Technische Specificaties

### Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **PDF Generatie**: pdf-lib

### Beveiliging
- **Row Level Security (RLS)**: Database-niveau toegangscontrole
- **Rolgebaseerde toegang**: Functies en data gefilterd per rol
- **Auditlogging**: Alle wijzigingen worden gelogd

---

## Veelgestelde Vragen

**Kan een manager dossiers van andere teams inzien?**
Nee, managers hebben alleen toegang tot dossiers van medewerkers die aan hen gekoppeld zijn.

**Wie kan gebruikersaccounts aanmaken?**
Alleen de Super Admin kan nieuwe gebruikersaccounts aanmaken en rollen toewijzen.

**Worden wijzigingen gelogd?**
Ja, alle wijzigingen aan dossiers, taken en documenten worden vastgelegd in het activiteitenlogboek.

**Kan ik taken exporteren naar mijn agenda?**
Ja, taken kunnen worden geëxporteerd naar Google Calendar, Outlook of als ICS-bestand.

---

## Support

Voor vragen of ondersteuning, neem contact op met de systeembeheerder (Super Admin) van uw organisatie.
