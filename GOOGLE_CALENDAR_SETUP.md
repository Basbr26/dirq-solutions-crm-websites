# Google Calendar Synchronisatie Setup

Deze guide helpt je bij het opzetten van Google Calendar synchronisatie voor het CRM systeem.

## 1. Google Cloud Console Setup

### Stap 1: Project aanmaken
1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Klik op "Select a project" → "NEW PROJECT"
3. Geef je project een naam (bijv. "DIRQ CRM")
4. Klik op "Create"

### Stap 2: Google Calendar API activeren
1. In je project, ga naar "APIs & Services" → "Library"
2. Zoek naar "Google Calendar API"
3. Klik erop en klik op "ENABLE"

### Stap 3: OAuth Consent Screen configureren
1. Ga naar "APIs & Services" → "OAuth consent screen"
2. Kies "External" (tenzij je een Google Workspace organisatie hebt)
3. Klik op "CREATE"
4. Vul de verplichte velden in:
   - **App name**: DIRQ CRM
   - **User support email**: je email adres
   - **Developer contact information**: je email adres
5. Klik op "SAVE AND CONTINUE"
6. Bij "Scopes", klik "ADD OR REMOVE SCOPES" en voeg toe:
   - `https://www.googleapis.com/auth/calendar` (Zie, bewerk, deel en verwijder permanent alle agenda's)
   - `https://www.googleapis.com/auth/calendar.events` (Bekijk en bewerk events)
7. Klik op "SAVE AND CONTINUE"
8. Bij "Test users", voeg je eigen email toe als test user
9. Klik op "SAVE AND CONTINUE"

### Stap 4: OAuth 2.0 Credentials aanmaken
1. Ga naar "APIs & Services" → "Credentials"
2. Klik op "CREATE CREDENTIALS" → "OAuth client ID"
3. Kies "Web application"
4. Geef een naam (bijv. "DIRQ CRM Web Client")
5. Voeg Authorized JavaScript origins toe:
   - Development: `http://localhost:5173`
   - Production: `https://jouw-domein.nl`
6. Voeg Authorized redirect URIs toe:
   - Development: `http://localhost:5173`
   - Production: `https://jouw-domein.nl`
7. Klik op "CREATE"
8. **Kopieer de Client ID** - je hebt deze nodig voor je `.env` bestand

### Stap 5: API Key aanmaken
1. Klik op "CREATE CREDENTIALS" → "API key"
2. **Kopieer de API key** - je hebt deze nodig voor je `.env` bestand
3. Klik op "RESTRICT KEY" (aanbevolen voor productie)
4. Bij "API restrictions", kies "Restrict key" en selecteer "Google Calendar API"
5. Klik op "SAVE"

## 2. Lokale Setup

### Environment Variables
1. Kopieer `.env.example` naar `.env`:
   ```bash
   cp .env.example .env
   ```

2. Vul je Google credentials in:
   ```env
   VITE_GOOGLE_CLIENT_ID=jouw-client-id.apps.googleusercontent.com
   VITE_GOOGLE_API_KEY=jouw-api-key
   ```

### Database Migratie
Run de Google Calendar sync migratie:
```bash
# Via Supabase CLI
supabase db push

# Of handmatig via Supabase Dashboard
# Kopieer de inhoud van supabase/migrations/20260108_google_calendar_sync.sql
# en voer uit in SQL Editor
```

## 3. Gebruikershandleiding

### Voor gebruikers: Google Calendar koppelen

1. **Open de Agenda pagina**
   - Klik op "Activiteiten Agenda" in de sidebar

2. **Klik op "Google Calendar" knop**
   - Bovenaan de pagina vind je de "Google Calendar" knop
   - Een zijpaneel opent met synchronisatie opties

3. **Verbinding maken**
   - Klik op "Verbind met Google"
   - Je wordt doorgestuurd naar Google login
   - Accepteer de gevraagde rechten (lees en schrijf toegang tot je agenda)
   - Je wordt teruggestuurd naar het CRM

4. **Automatische synchronisatie instellen**
   - Schakel "Automatische synchronisatie" in
   - Het CRM synchroniseert nu automatisch elke 15 minuten
   - Of klik handmatig op "Nu synchroniseren"

5. **Synchronisatie gedrag**
   - **Van CRM naar Google**: Alle CRM events worden naar je primaire Google Calendar gekopieerd
   - **Van Google naar CRM**: Google Calendar events worden geïmporteerd naar het CRM
   - **Synchronisatie venster**: 3 maanden terug tot 3 maanden vooruit
   - **Duplicaten**: Events met hetzelfde Google Event ID worden niet dubbel gesynchroniseerd

### Synchronisatie status
- **Laatste sync**: Zie wanneer de laatste synchronisatie plaatsvond
- **Status**: "Verbonden" = koppeling actief, "Niet verbonden" = koppeling maken nodig
- **Foutmeldingen**: Verschijnen als toast notificatie rechtsonder in beeld

## 4. Troubleshooting

### "Access blocked: Authorization Error"
**Oorzaak**: Je app is nog in "Testing" mode en de gebruiker staat niet op de test users lijst.

**Oplossing**:
1. Ga naar Google Cloud Console → OAuth consent screen
2. Voeg de gebruiker toe bij "Test users"
3. OF: Publiceer je app (klik "PUBLISH APP") - hiervoor moet je app mogelijk geverifieerd worden door Google

### "Invalid client ID"
**Oorzaak**: De `VITE_GOOGLE_CLIENT_ID` in je `.env` bestand klopt niet.

**Oplossing**:
1. Controleer of je de juiste Client ID hebt gekopieerd (eindigt op `.apps.googleusercontent.com`)
2. Controleer of er geen extra spaties zijn in het `.env` bestand
3. Herstart de development server na het wijzigen van `.env`

### "API key not valid"
**Oorzaak**: De `VITE_GOOGLE_API_KEY` is onjuist of restricted voor de verkeerde API.

**Oplossing**:
1. Controleer de API key in Google Cloud Console
2. Zorg dat Google Calendar API is toegestaan bij "API restrictions"
3. Herstart de development server

### Synchronisatie werkt niet
**Mogelijke oorzaken**:
1. **Database permissies**: Controleer of de `user_settings` tabel de nieuwe kolommen heeft
2. **Auto-sync uitgeschakeld**: Schakel "Automatische synchronisatie" in
3. **Token verlopen**: Klik "Verbinding verbreken" en maak opnieuw verbinding
4. **Geen events in bereik**: Synchronisatie synchroniseert alleen events binnen 3 maanden

### Events worden dubbel aangemaakt
**Oorzaak**: De `google_event_id` kolom bestaat niet in de database.

**Oplossing**:
1. Run de database migratie opnieuw
2. Verwijder handmatig dubbele events in de database:
   ```sql
   -- Bekijk dubbele events
   SELECT title, start_time, COUNT(*) 
   FROM calendar_events 
   GROUP BY title, start_time 
   HAVING COUNT(*) > 1;
   
   -- Verwijder oudere duplicaten (voorzichtig!)
   DELETE FROM calendar_events a
   USING calendar_events b
   WHERE a.id < b.id
   AND a.title = b.title
   AND a.start_time = b.start_time;
   ```

## 5. Productie Deployment

### Netlify / Vercel
1. Voeg environment variables toe in de hosting platform:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_API_KEY`

2. Update Google Cloud Console:
   - Voeg je productie domein toe bij "Authorized JavaScript origins"
   - Voeg je productie domein toe bij "Authorized redirect URIs"

3. Voor productie: Publiceer je OAuth consent screen of vraag verificatie aan bij Google

### Security Best Practices
- ✅ API key restrictions: Beperk tot Google Calendar API only
- ✅ Domain restrictions: Voeg alleen je eigen domeinen toe als authorized origins
- ✅ HTTPS: Gebruik altijd HTTPS in productie
- ✅ Token opslag: Tokens worden opgeslagen in `window.gapi.auth2.getAuthInstance()` - niet in localStorage
- ✅ RLS policies: User settings zijn protected via Supabase RLS

## 6. Beperkingen

- **Sync venster**: Alleen events tussen -3 en +3 maanden worden gesynchroniseerd
- **Batch grootte**: Maximaal 250 events per sync operatie (Google Calendar API limiet)
- **Rate limiting**: 10,000 requests per dag (gratis tier) - meer dan voldoende voor kleine teams
- **Test users**: Maximaal 100 test users tijdens "Testing" fase
- **Recurring events**: Worden gesynchroniseerd als individuele event instanties

## Support

Voor vragen of problemen, open een issue in de repository of contact support@dirq.nl
