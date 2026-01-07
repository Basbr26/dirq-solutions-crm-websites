# 🚀 Dirq Solutions CRM

**Modern CRM speciaal gebouwd voor website ontwikkelaars**

[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.7-blue)]()
[![React](https://img.shields.io/badge/react-18.3-blue)]()

---

## 📋 Quick Links

- **📊 [Current Status](STATUS.md)** - Features, bugs, production readiness
- **📝 [Changelog](CHANGELOG.md)** - Alle updates chronologisch
- **🏗️ [Setup Guides](./docs/)** - Google Calendar, Supabase, deployment
- **📦 [Archived Audits](./archive/)** - Historische audit documenten

---

## 🎯 What is This?

Dirq Solutions CRM is een volledig functioneel Customer Relationship Management systeem, speciaal ontworpen voor website ontwikkelaars. Van lead tot live website - alles in één platform.

### Key Features

✅ **Sales Pipeline** - 10-stage Kanban board (Lead → Live)  
✅ **Company Management** - Volledige klantendatabase  
✅ **Contact Management** - Met interaction history  
✅ **Quote Generator** - PDF export met BTW berekeningen  
✅ **Project Tracking** - Hosting, pages, features specifiek voor websites  
✅ **Task Management** - Met calendar integration  
✅ **Google Calendar Sync** - Bidirectional synchronization  
✅ **Document Generation** - 5 professional templates  
✅ **CSV Import/Export** - Bulk operations  
✅ **Mobile Optimized** - Native app experience  
✅ **Role-Based Access** - 5 gebruikersrollen  

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm of bun
- Supabase account

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/dirq-solutions-crm.git
cd dirq-solutions-crm

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env met je Supabase credentials

# Run database migrations
# Ga naar Supabase SQL Editor en run de migrations in /supabase/migrations/

# Start development server
npm run dev
```

### First Login

Default super admin account:
- Email: [je supabase user]
- Password: [je supabase password]

---

## 📱 Usage

### For Sales Team

1. **Add Company** - Klik op "Nieuwe Organisatie" 
2. **Add Contact** - Voeg contactpersoon toe bij company
3. **Create Quote** - Genereer offerte met PDF export
4. **Track Project** - Sleep door pipeline stages
5. **Log Interactions** - Noteer gesprekken, emails, meetings

### For Managers

- View full pipeline in Kanban board
- Monitor team performance in Analytics
- Assign leads to team members
- Export reports (CSV)

### For Admins

- User management
- Company settings
- Role assignments
- System configuration

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 6
- **UI Library:** shadcn/ui + Tailwind CSS
- **State:** React Query (TanStack Query v5)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **PDF:** @react-pdf/renderer
- **Calendar:** react-big-calendar
- **CSV:** papaparse

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Real-time:** Supabase Realtime (subscriptions)

### Deployment
- **Hosting:** Netlify
- **CDN:** Netlify Edge Network
- **Environment:** Production

---

## 📁 Project Structure

```
dirq-solutions-crm/
├── src/
│   ├── features/              # Feature modules
│   │   ├── companies/
│   │   ├── contacts/
│   │   ├── projects/
│   │   ├── quotes/
│   │   └── interactions/
│   ├── components/            # Shared UI components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/           # Layout components
│   │   ├── calendar/         # Calendar components
│   │   └── documents/        # Document generation
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities & helpers
│   ├── pages/                # Route pages
│   ├── types/                # TypeScript types
│   └── integrations/         # External integrations
│       └── supabase/
├── supabase/
│   └── migrations/           # Database migrations
├── public/                   # Static assets
├── STATUS.md                 # Current status & features
├── CHANGELOG.md              # Version history
└── archive/                  # Historical documents
```

---

## 🔐 Security

### Authentication
- Supabase Auth met email/password
- JWT tokens voor API calls
- Automatic token refresh

### Authorization
- Row Level Security (RLS) op alle tabellen
- 5 gebruikersrollen: super_admin, ADMIN, MANAGER, SALES, SUPPORT
- Role-based route protection
- Data visibility based op ownership

### Data Protection
- HTTPS only (enforced)
- CORS configured
- SQL injection protected (prepared statements)
- XSS protected (React escape by default)

---

## 📊 Current Status

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** 7 Januari 2026

**Completion:** 95%

| Category | Status |
|----------|--------|
| Core Features | ✅ 100% |
| Mobile UX | ✅ 100% |
| Performance | ✅ 95% |
| Security | ✅ 100% |
| Testing | ⚠️ 20% |
| Documentation | ✅ 80% |

Zie [STATUS.md](STATUS.md) voor details.

---

## 📝 Contributing

1. Fork het project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Style
- TypeScript strict mode
- ESLint + Prettier configured
- Conventional Commits
- Component naming: PascalCase
- Hook naming: useCamelCase

---

## 🐛 Bug Reports

Found a bug? [Open an issue](https://github.com/yourusername/dirq-solutions-crm/issues)

Please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Browser/device info

---

## 📄 License

Private/Proprietary - Dirq Solutions B.V.

---

## 👥 Team

**Development:** Dirq Solutions Development Team  
**Product Owner:** [Name]  
**Support:** [email protected]

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Supabase](https://supabase.com/) - Backend infrastructure
- [React Query](https://tanstack.com/query/) - Data fetching
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Recharts](https://recharts.org/) - Charts

---

**Built with ❤️ by Dirq Solutions**
