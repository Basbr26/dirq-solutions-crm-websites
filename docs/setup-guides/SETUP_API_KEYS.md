# 🔐 API Keys Setup - BELANGRIJK

**Datum:** 9 januari 2026  
**Status:** ✅ Security Fixed

---

## 🎯 HOW TO RUN AI_KEYS_SETUP.ps1

De API keys staan **NIET MEER** hardcoded in het script. Je moet ze nu opgeven via environment variables of interactief.

---

## 🚀 OPTIE 1: Environment Variables (Aanbevolen)

### PowerShell:
```powershell
# Set environment variables voor deze sessie
$env:GEMINI_API_KEY = "AIzaSyAAIsRRGzPnwKrzbt6DFxh2jfFC3DQVw5U"
$env:APOLLO_API_KEY = "jHMZ5q_DoSTES08dXvQT1w"
$env:MANUS_API_KEY = "sk-DVNSYhH9h7XSvSRwVXNC75FQfwqCC8CE8mvny-hAJ1DP1pfGzi3crEk2KSRvxHuAdjm0rtlDZbFcUuc4dbhO4GqGbymN"

# Run setup script
.\AI_KEYS_SETUP.ps1
```

### CMD (Command Prompt):
```cmd
set GEMINI_API_KEY=AIzaSyAAIsRRGzPnwKrzbt6DFxh2jfFC3DQVw5U
set APOLLO_API_KEY=jHMZ5q_DoSTES08dXvQT1w
set MANUS_API_KEY=sk-DVNSYhH9h7XSvSRwVXNC75FQfwqCC8CE8mvny-hAJ1DP1pfGzi3crEk2KSRvxHuAdjm0rtlDZbFcUuc4dbhO4GqGbymN
powershell -File .\AI_KEYS_SETUP.ps1
```

---

## 🚀 OPTIE 2: Interactive Prompt

```powershell
# Run zonder environment variables
.\AI_KEYS_SETUP.ps1

# Script zal vragen:
# "Enter GEMINI_API_KEY: "
# "Enter APOLLO_API_KEY: "
# "Enter MANUS_API_KEY (or press Enter to skip): "
```

**Voordeel:** Geen keys in shell history

---

## 🔐 JE API KEYS

### Google Gemini API
```
AIzaSyAAIsRRGzPnwKrzbt6DFxh2jfFC3DQVw5U
```
**Waar te vinden:** https://aistudio.google.com/app/apikey  
**Free tier:** 15 requests/minute

---

### Apollo.io API
```
jHMZ5q_DoSTES08dXvQT1w
```
**Waar te vinden:** https://app.apollo.io/settings/integrations/api  
**Free tier:** 100 credits/month

---

### Manus AI API (Optional)
```
sk-DVNSYhH9h7XSvSRwVXNC75FQfwqCC8CE8mvny-hAJ1DP1pfGzi3crEk2KSRvxHuAdjm0rtlDZbFcUuc4dbhO4GqGbymN
```
**Waar te vinden:** https://manus.im/settings/api  
**Status:** Private beta

---

## 📁 WAAR WORDEN KEYS OPGESLAGEN?

### 1. Supabase Secrets (Production)
```powershell
# Na het runnen van AI_KEYS_SETUP.ps1 staan keys hier:
supabase secrets list

# Zie:
# GEMINI_API_KEY
# APOLLO_API_KEY
# MANUS_API_KEY
```

**Encryptie:** ✅ AES-256 encrypted  
**Toegang:** ✅ Alleen Edge Functions (server-side)  
**In git:** ✅ Nee, veilig

---

### 2. Lokaal .env.ai Bestand (Development)
```
📁 c:\Dirq apps\dirq-solutions-crmwebsite\.env.ai

GEMINI_API_KEY=AIza...
APOLLO_API_KEY=jHMZ5q...
MANUS_API_KEY=sk-DVN...
```

**Status:** ✅ Aangemaakt door AI_KEYS_SETUP.ps1  
**Gitignore:** ✅ Excluded via .gitignore  
**Beveiliging:** ✅ Local only

---

## 🛡️ SECURITY CHECKLIST

- ✅ `.env.ai` in .gitignore
- ✅ Geen hardcoded keys in scripts
- ✅ Keys via environment variables
- ✅ Supabase secrets encrypted
- ✅ Geen keys in git history
- ✅ Security commit pushed (f06578e)

---

## 🚨 ALS KEYS GELEKT ZIJN

**Indien keys ooit public zijn gegaan:**

### 1. Reset Gemini API Key
```
1. Ga naar https://aistudio.google.com/app/apikey
2. Klik op "Create API Key"
3. Delete oude key
4. Kopieer nieuwe key
5. Update $env:GEMINI_API_KEY
6. Run .\AI_KEYS_SETUP.ps1 opnieuw
```

### 2. Reset Apollo API Key
```
1. Ga naar https://app.apollo.io/settings/integrations/api
2. Klik op "Regenerate API Key"
3. Kopieer nieuwe key
4. Update $env:APOLLO_API_KEY
5. Run .\AI_KEYS_SETUP.ps1 opnieuw
```

### 3. Reset Manus AI Key
```
1. Ga naar https://manus.im/settings/api
2. Revoke current key
3. Generate nieuwe key
4. Update $env:MANUS_API_KEY
5. Run .\AI_KEYS_SETUP.ps1 opnieuw
```

---

## 📋 COMPLETE FLOW

```powershell
# Stap 1: Set environment variables
$env:GEMINI_API_KEY = "AIzaSyAAIsRRGzPnwKrzbt6DFxh2jfFC3DQVw5U"
$env:APOLLO_API_KEY = "jHMZ5q_DoSTES08dXvQT1w"
$env:MANUS_API_KEY = "sk-DVNSYhH9h7XSvSRwVXNC75FQfwqCC8CE8mvny-hAJ1DP1pfGzi3crEk2KSRvxHuAdjm0rtlDZbFcUuc4dbhO4GqGbymN"

# Stap 2: Run setup
.\AI_KEYS_SETUP.ps1

# Stap 3: Deploy Edge Function
.\DEPLOY_AI_FUNCTION.ps1

# Stap 4: Test enrichment
.\TEST_AI_ENRICHMENT.ps1
```

**Totale tijd:** 15-20 minuten

---

## ⚠️ BELANGRIJK

**DIT BESTAND (SETUP_API_KEYS.md) BEVAT JE ECHTE API KEYS!**

- ✅ **NIET** committen naar git
- ✅ Alleen lokaal bewaren
- ✅ Of verwijderen na setup

**Add to .gitignore (optioneel):**
```
SETUP_API_KEYS.md
```

---

**NEXT STEP:** Run het setup script met je keys! 🚀
