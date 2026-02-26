# TODO - Dirq Solutions CRM

## Playwright E2E Tests activeren
> Infrastructuur is klaar. Alleen eenmalige setup nog nodig.

- [ ] Kopieer `.env.test.example` → `.env.test`
- [ ] Vul de waarden in `.env.test` in:
  - `VITE_SUPABASE_URL` (zelfde als `.env.local`)
  - `VITE_SUPABASE_ANON_KEY` (zelfde als `.env.local`)
  - `TEST_SUPABASE_SERVICE_KEY` → Supabase Dashboard > Project Settings > API > service_role key
  - `TEST_USER_EMAIL` + `TEST_USER_PASSWORD` → apart testaccount (niet het echte admin account!)
  - `VITE_GOOGLE_CLIENT_ID` + `VITE_GOOGLE_API_KEY` (zelfde als `.env.local`)
- [ ] Maak een testaccount aan in Supabase met SALES of ADMIN rol
- [ ] Run de tests: `npm run test:e2e`

### Handige commando's
```bash
npm run test:e2e           # alle tests (headless)
npm run test:e2e:headed    # zichtbaar in browser
npm run test:e2e:ui        # visuele Playwright UI
npm run test:e2e:report    # rapport bekijken na faling
```

---

## Mogelijke volgende stappen (ideeën)
- CI/CD pipeline: GitHub Actions workflow die bij elke push `test:e2e` draait
- Dashboard met realtime KPIs (Chart.js / Recharts uitbreiding)
- PDF generatie voor offertes (via puppeteer of server-side)
- E-mail notificaties via Supabase Edge Functions
- Mobile PWA verbetering (offline support, push notifications)
