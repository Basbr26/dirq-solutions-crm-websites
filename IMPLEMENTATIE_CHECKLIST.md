# Implementatie Checklist - Verzuimbeheer Applicatie

## ✅ Wat is al geïmplementeerd in de frontend

### Authenticatie & Routing
- ✅ `useAuth` hook met volledige Supabase integratie
- ✅ `ProtectedRoute` component met role-based access control
- ✅ `RoleGate` component voor conditionale UI rendering
- ✅ Role-based redirect op homepage (naar correct dashboard)
- ✅ Auth pagina met login & signup

### Helper Functions
- ✅ `supabaseHelpers.ts` met alle backend operaties:
  - `generateInitialTasks()` - Automatische taakgeneratie bij nieuwe case
  - `calculateDeadline()` - Deadline berekening
  - `createTimelineEvent()` - Timeline events aanmaken
  - `getManagerCases()` - Cases ophalen voor manager
  - `getManagerTasks()` - Taken ophalen voor manager
  - `getEmployeeCase()` - Case ophalen voor medewerker
  - `getCaseDocuments()` - Documenten ophalen (met role filtering)
  - `getCaseTimeline()` - Timeline ophalen
  - `updateTaskStatus()` - Taak status updaten + timeline event
  - `updateCaseStatus()` - Case status updaten + timeline event

### Bestaande Components
- ✅ HR Dashboard (volledig functioneel met mock data)
- ✅ Manager Dashboard (basis layout, moet nog data fetching krijgen)
- ✅ Medewerker Dashboard (basis layout, moet nog data fetching krijgen)
- ✅ Case Detail pagina
- ✅ Ziekmelding Dialog met task preview
- ✅ Task Dialog met template dropdown
- ✅ Wet Poortwachter Info component

## 🔨 Wat jij nu moet doen

### 1. Supabase Setup (EERSTE STAP!)
- [ ] Voer **ALLE** SQL uit `SUPABASE_SETUP.md` uit in je Supabase SQL editor
- [ ] Controleer of alle tabellen zijn aangemaakt
- [ ] Controleer of RLS is enabled op alle tabellen
- [ ] Check of alle policies werken

### 2. Environment Setup
- [ ] Kopieer `.env.example` naar `.env`
- [ ] Vul `VITE_SUPABASE_URL` in
- [ ] Vul `VITE_SUPABASE_ANON_KEY` in

### 3. Eerste Gebruiker Aanmaken
- [ ] Start de applicatie
- [ ] Ga naar `/auth`
- [ ] Maak een account aan
- [ ] Noteer je user ID (te vinden in Supabase > Authentication > Users)
- [ ] Voer deze SQL uit om jezelf een rol te geven:
```sql
-- Vervang YOUR_USER_ID met je eigen ID
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'hr');  -- of 'manager' of 'medewerker'
```

### 4. Testing
- [ ] Log in met je account
- [ ] Check of je naar het juiste dashboard wordt gestuurd
- [ ] Probeer een nieuwe ziekmelding aan te maken (alleen als HR)
- [ ] Check of automatische taken worden aangemaakt
- [ ] Test de verschillende rollen door je rol in de database te wijzigen

## 📋 Volgende Stappen na Basis Setup

### Manager Dashboard Verbeteren
De manager dashboard moet nog worden aangepast om echte data te fetchen:

1. **Update `src/pages/DashboardManager.tsx`**:
   - Gebruik `getManagerCases()` om team cases op te halen
   - Gebruik `getManagerTasks()` om taken op te halen
   - Toon alleen niet-medische informatie
   - Filter op cases waar de manager de `manager_id` is

2. **Wat managers MOGEN zien**:
   - ✅ Cases van hun teamleden
   - ✅ Taken van hun teamleden
   - ✅ Timeline events
   - ✅ Documenten (behalve medische)
   - ✅ Functionele beperkingen
   - ✅ Afspraken

3. **Wat managers NIET mogen zien**:
   - ❌ Medische documenten
   - ❌ Cases van andere teams
   - ❌ Interne HR notities

### Medewerker Dashboard Verbeteren
De medewerker dashboard moet worden aangepast:

1. **Update `src/pages/DashboardMedewerker.tsx`**:
   - Gebruik `getEmployeeCase()` om eigen case op te halen
   - Toon "Wat gebeurt er nu?" sectie met automatische timeline
   - Toon eigen documenten (niet-medisch)
   - Toon afspraken en taken

2. **Wat medewerkers MOGEN zien**:
   - ✅ Eigen case informatie
   - ✅ Eigen documenten (niet-medisch)
   - ✅ Tijdlijn van eigen case (read-only)
   - ✅ Afspraken
   - ✅ Rechten & plichten informatie

3. **Wat medewerkers NIET mogen zien**:
   - ❌ Medische documenten
   - ❌ Taken van manager/HR
   - ❌ Interne HR notities
   - ❌ Cases van anderen

### Automatisering Implementeren

1. **Bij nieuwe ziekmelding** (`ZiekmeldingDialog.tsx`):
```typescript
// Na succesvolle case creation:
await generateInitialTasks(newCase.id, newCase.start_datum);
await createTimelineEvent(
  newCase.id,
  'ziekmelding',
  `Ziekmelding aangemaakt door ${user.profile.voornaam}`,
  user.id
);
```

2. **Bij document upload**:
```typescript
// Na succesvolle upload:
await createTimelineEvent(
  caseId,
  'document_upload',
  `Document toegevoegd: ${fileName}`,
  userId
);
```

3. **Bij taak voltooien**:
```typescript
await updateTaskStatus(taskId, 'completed', caseId, userId, taskTitle);
```

4. **Bij status wijziging**:
```typescript
await updateCaseStatus(caseId, newStatus, userId);
```

## 🔒 Belangrijke Security Notes

### RLS is CRUCIAAL
- Alle tabellen MOETEN RLS hebben
- Test altijd met verschillende rollen
- Gebruik NOOIT `service_role` key in frontend
- Alleen `anon` key in frontend

### Role Checking
- Gebruik ALTIJD `RoleGate` voor UI elementen
- Gebruik ALTIJD `ProtectedRoute` voor pagina's
- Check roles ALTIJD in Supabase policies (backend)
- Trust NOOIT alleen frontend checks

### Document Access
- Medische documenten ALLEEN voor HR
- Implementeer filtering in queries
- Test met verschillende rollen

## 🐛 Troubleshooting

### "Cannot read property 'role' of null"
→ Je hebt nog geen rol toegewezen in de database

### "Row level security policy violation"
→ Check of je RLS policies correct zijn
→ Check of je de security definer functions hebt aangemaakt

### "User not found"
→ Check of de trigger voor profile creation werkt
→ Check of je profile is aangemaakt na signup

### Queries werken niet
→ Check of indexes zijn aangemaakt
→ Check RLS policies
→ Gebruik browser DevTools → Network tab voor errors

## 📚 Handige Resources

- `SUPABASE_SETUP.md` - Volledige database setup
- `PROJECT_STATUS.md` - Overzicht van alle features
- `src/lib/supabaseHelpers.ts` - Alle helper functions
- `src/lib/taskTemplates.ts` - Wet Poortwachter templates

## ⚡ Quick Commands

```bash
# Start development server
npm run dev

# Check Supabase connection
# Open browser console en type:
supabase.auth.getUser()
```

## 🎯 Prioriteit

1. **EERST**: Voer alle SQL uit (`SUPABASE_SETUP.md`)
2. **DAN**: Setup environment variables
3. **DAN**: Maak eerste gebruiker + rol
4. **DAN**: Test basis functionaliteit
5. **DAARNA**: Implement manager dashboard data fetching
6. **DAARNA**: Implement medewerker dashboard data fetching
7. **LAATSTE**: Implement automatisering triggers

---

**Succes met de implementatie! 🚀**

Als je vastloopt, check eerst:
1. Console logs in browser
2. Network tab voor API errors
3. Supabase logs in dashboard
4. RLS policies in Supabase SQL editor
