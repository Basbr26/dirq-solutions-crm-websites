# Dirq Solutions - CRM voor Website Ontwikkeling

Een modern CRM-systeem specifiek gebouwd voor website ontwikkeling en verkoop, met pipeline management, offertes, projectbeheer en klantrelaties.

## 🚀 Technologie Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui componenten
- **Database:** Supabase (PostgreSQL)
- **Authenticatie:** Supabase Auth met RBAC
- **Data Fetching:** TanStack React Query v5
- **Formulieren:** React Hook Form met Zod validatie
- **Grafieken:** Recharts
- **Drag & Drop:** Native HTML5 (Pipeline Kanban)
- **Animations:** Framer Motion
- **Icons:** Lucide React

## 📋 Functionaliteiten

### 🔐 Authenticatie & Autorisatie

- **Gebruikersrollen:** Super Admin, Admin, Sales, Manager, Support
- **Role-based Access Control (RBAC):** Verschillende toegangsniveaus per rol
- **Row Level Security (RLS):** Database-niveau beveiliging op alle tabellen
- **Dashboard per rol:** Specifieke dashboards voor elke rol

### 🏢 CRM Modules

#### Bedrijvenbeheer
- **Bedrijfsoverzicht:** Zoeken, filteren en statistieken
- **Bedrijf aanmaken:** Uitgebreid formulier met bedrijfsgegevens
- **Bedrijfsprofiel:** Detail view met contacten, projecten en interacties
- **Industrieën:** Categorisatie per branche

#### Contactenbeheer
- **Contactpersonen:** Gekoppeld aan bedrijven
- **Contact details:** Naam, functie, email, telefoon
- **Interactiehistorie:** Track alle communicatie
- **Zoek & Filter:** Snel contacten vinden

#### Pipeline Management
- **10-Fase Sales Pipeline:**
  - 👋 Lead (10% kans)
  - 📋 Offerte Aangevraagd (20%)
  - 📨 Offerte Verstuurd (40%)
  - 🤝 Onderhandeling (60%)
  - ✅ Offerte Getekend (90%)
  - 🔨 In Ontwikkeling (95%)
  - 👀 Review (98%)
  - 🚀 Live (100%)
  - 🔧 Onderhoud (100%)
  - ❌ Verloren (0%)
- **Kanban Board:** Drag-and-drop tussen fases
- **Automatische Probability:** Kans berekening per fase
- **Gewogen Waarde:** Realistische pipeline forecast
- **Stage Analytics:** Conversie ratio's per fase

#### Offertes
- **Offerte Generator:** Automatisch offerte nummer (Q-2026-001)
- **Line Items:** Meerdere producten/diensten per offerte
- **Prijs Berekening:** Subtotaal, BTW (21%), totaal
- **Status Tracking:** Draft, Sent, Accepted, Declined, Expired
- **Bedrijf Koppeling:** Link naar klant
- **Statistieken:** Total value, acceptance rate, gemiddelde waarde

#### Projecten
- **Project Types:** Landing Page, Portfolio, E-commerce, Blog, Custom, Corporate, SaaS
- **Website Specifieke Velden:**
  - URL, aantal pagina's
  - Features (responsive, SEO, CMS, analytics, etc.)
  - Hosting & onderhoud contracten
  - Launch datum
- **Project Value:** Deal size tracking
- **Expected Close Date:** Sales forecasting
- **Owner Assignment:** Verantwoordelijke per project

### 📊 Dashboards

#### CRM Dashboard (Sales/Manager)
- **Pipeline KPI's:**
  - Total Pipeline Value
  - Gewogen Waarde (op basis van probability)
  - Actieve Projecten
  - Gemiddelde Deal Size
- **Charts:**
  - Omzet ontwikkeling (6 maanden)
  - Pipeline distributie per fase (pie chart)
  - Offerte acceptatie trend (bar chart)
- **Quick Stats:** Bedrijven, contacten, gesloten deals

#### Executive Dashboard (Admin)
- **Business Metrics:** Revenue, profit, costs
- **Team Performance:** Sales per persoon
- **Forecast:** Predictive analytics

#### Super Admin Dashboard
- **Gebruikersbeheer:** Accounts aanmaken en beheren
- **Systeeminstellingen:** Configuratie en onderhoud
- **Audit Logs:** Complete activity tracking

### 🎨 Design System

- **Primaire Kleur:** Teal (#06BDC7)
- **Dark Mode:** Volledig ondersteund
- **Responsive:** Mobile-first design
- **Consistent:** shadcn/ui component library
- **Animations:** Smooth page transitions met Framer Motion

## 🗄️ Database Schema

### Core Tables
- `companies` - Bedrijfsgegevens
- `contacts` - Contactpersonen
- `projects` - Website projecten (pipeline)
- `quotes` - Offertes met line items
- `quote_items` - Offerte regels
- `interactions` - Activiteiten (calls, emails, meetings)
- `industries` - Branche categorieën

### Authentication
- `profiles` - Gebruikersprofielen
- `user_roles` - Role assignments

### RLS Policies
Elke tabel heeft specifieke policies per rol:
- `super_admin` - Volledige toegang
- `ADMIN` - Management functies
- `SALES` - CRM operaties
- `MANAGER` - Team oversight
- `SUPPORT` - Beperkte toegang

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Supabase account
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/dirq-solutions-crm.git
cd dirq-solutions-crm

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Add your Supabase URL and anon key

# Run database migrations
# Go to Supabase Dashboard → SQL Editor
# Run: supabase/migrations/20260103_website_sales_crm.sql

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # AppLayout, AppSidebar
│   └── ui/             # shadcn/ui components
├── features/           # Feature modules
│   ├── companies/      # Bedrijven module
│   ├── contacts/       # Contacten module
│   ├── projects/       # Pipeline module
│   └── quotes/         # Offertes module
├── hooks/              # Custom React hooks
├── integrations/       # Supabase client
├── lib/                # Utilities
├── pages/              # Page components
├── types/              # TypeScript types
└── App.tsx             # Root component

supabase/
└── migrations/         # Database migrations
```

## 🔑 User Roles & Permissions

| Feature | super_admin | ADMIN | SALES | MANAGER | SUPPORT |
|---------|-------------|-------|-------|---------|---------|
| Dashboard | ✅ All | ✅ Executive | ✅ CRM | ✅ CRM | ❌ |
| Companies | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contacts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pipeline | ✅ | ✅ | ✅ | ✅ | ❌ |
| Quotes | ✅ | ✅ | ✅ | ✅ | ❌ |
| Projects | ✅ | ✅ | ✅ | ✅ | ❌ |
| Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ |

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Netlify/Vercel
# Configured via netlify.toml / vercel.json
```

## 🎯 Roadmap

- [x] Companies Module
- [x] Contacts Module
- [x] Pipeline Kanban Board
- [x] Quotes Module
- [x] CRM Dashboard
- [ ] Quote Detail Page met PDF export
- [ ] Project Detail Page
- [ ] Interaction Logging (calls, emails, meetings)
- [ ] Email Integration (Gmail/Outlook sync)
- [ ] Calendar Integration
- [ ] Document Management
- [ ] Workflow Automation
- [ ] Reporting & Analytics

## 📝 License

Proprietary - Dirq Solutions

## 👨‍💻 Author

**Dirq Solutions**  
Website: [dirqsolutions.nl](https://dirqsolutions.nl)  
CRM: Website Ontwikkeling & Verkoop

---

Built with ❤️ for modern web development agencies
