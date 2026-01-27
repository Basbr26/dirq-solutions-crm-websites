# Netlify Deployment Fix

## Problem
After removing Workflow Builder, the app shows: 
```
Cannot read properties of undefined (reading 'createContext')
```

## Root Cause
Netlify's build cache contains old `node_modules` with removed dependencies (@xyflow/react, cron-parser).

## Solution

### Option 1: Clear Netlify Cache (RECOMMENDED)
1. Go to Netlify Dashboard → Site Settings → Build & Deploy
2. Click "Clear cache and retry deploy"
3. Or trigger a new deploy with the button

### Option 2: Manual Cache Clear
In Netlify UI:
```
Site settings → Build & deploy → Environment → Clear cache
```

### Option 3: Via CLI
```bash
netlify build --clear-cache
```

## What This Commit Does
- Changed build command to `npm ci` (clean install) instead of `npm install`
- `npm ci` removes node_modules and reinstalls from package-lock.json
- This ensures no old/removed packages are present

## Files Changed
- `netlify.toml` - Updated build command to use `npm ci`
- `.netlify-cache-bust` - Cache buster file to force rebuild
- `package-lock.json` - Already updated (removed @xyflow/react, cron-parser)

## Verification
After deploy, check browser console for:
```
✅ All startup diagnostics passed
```

If you still see errors, check console for detailed diagnostics.
