// App Overview Page — Interactieve systeemkaart
// 4 tabs: Architectuurkaart (graph + highlight) | CRM Modules | n8n Workflows | Integraties

import '@xyflow/react/dist/style.css';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
} from '@xyflow/react';
import {
  Building2, Users, FolderKanban, FileText, MessageSquare, Database,
  Zap, Brain, Calendar, CalendarDays, Mail, Globe, User, BarChart3, TrendingUp,
  ExternalLink, CheckCircle2, Clock4, Webhook, ArrowRight, CheckSquare, Bot, Bell,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// ─── Types ───────────────────────────────────────────────────────────────────
type TriggerType = 'schedule' | 'webhook' | 'chat' | 'sub-workflow';
type WorkflowCategory = 'atc' | 'email' | 'tools' | 'infra';

interface CrmModule {
  id: string; title: string; icon: React.ComponentType<{ className?: string }>;
  href: string; color: string; description: string; features: string[];
}
interface Workflow {
  id?: string; name: string; description: string;
  trigger: TriggerType; triggerLabel: string;
  status: 'active' | 'inactive'; category: WorkflowCategory;
}
interface Integration {
  id: string; name: string; description: string; uses: string[]; color: string;
}
interface NodeDetail {
  title: string; description: string; features: string[]; link?: string;
}

// ─── CRM Modules Data ─────────────────────────────────────────────────────────
const CRM_MODULES: CrmModule[] = [
  {
    id: 'companies', title: 'Bedrijven', icon: Building2, href: '/companies', color: 'blue',
    description: 'Centraal bedrijvenregister voor klanten, prospects en partners.',
    features: ['CRUD met duplicaatcontrole (naam + KVK)', 'Bulk selectie en verwijdering', 'Filter presets per gebruiker (localStorage)', 'KVK-verrijking via n8n bij aanmaken', 'Audit log — activiteitentijdlijn', 'Status: prospect / lead / klant / inactief'],
  },
  {
    id: 'contacts', title: 'Contacten', icon: Users, href: '/contacts', color: 'indigo',
    description: 'Beheer contactpersonen gekoppeld aan bedrijven.',
    features: ['CRUD met bedrijfskoppeling', 'CSV bulk import', 'Primaire contactpersoon markeren', 'Beslissingsmaker-vlag', 'LinkedIn URL opslaan', 'Zoek en filter op naam / bedrijf / functie'],
  },
  {
    id: 'projects', title: 'Projecten', icon: FolderKanban, href: '/projects', color: 'violet',
    description: 'Volledig projectbeheer van lead tot live.',
    features: ['10 fasen: lead → quote_requested → quote_sent → negotiation → quote_signed → in_development → review → live → maintenance → lost', 'Automatische kansberekening per fase (10–100%)', 'Waarde tracking (geschat + definitief)', 'Lead → klant conversie in één klik', 'Milestone-webhooks naar n8n automations', 'Koppeling aan bedrijf, contact en offertes'],
  },
  {
    id: 'pipeline', title: 'Pipeline', icon: TrendingUp, href: '/pipeline', color: 'emerald',
    description: 'Visueel kanban-bord voor de volledige sales-pipeline.',
    features: ['Kanban-bord per project-fase', 'Stage filters en zoekfunctie', 'Pipeline-waarde zichtbaar per kolom', 'Klik op kaart → project detail'],
  },
  {
    id: 'quotes', title: 'Offertes', icon: FileText, href: '/quotes', color: 'amber',
    description: 'Professionele offertes met PDF-generatie en digitale handtekening.',
    features: ['PDF genereren vanuit templates', 'E-sign: klant ondertekent online via unieke link', 'Status tracking: draft → sent → viewed → signed → rejected', 'Verloopdatum-alerts via n8n', 'Versiehistorie en koppeling aan project'],
  },
  {
    id: 'calendar', title: 'Agenda', icon: Calendar, href: '/calendar', color: 'sky',
    description: 'Volledige agenda met Google Calendar integratie.',
    features: ['Bidirectionele Google Calendar sync', 'Event types: vergadering, call, taak, herinnering, demo', '"No-show melden" knop → n8n herplanningsmail', 'Dag / week / maand weergave', 'Koppeling met bedrijf en contactpersoon per event'],
  },
  {
    id: 'interactions', title: 'Interacties', icon: MessageSquare, href: '/interactions', color: 'rose',
    description: 'Chronologische activiteiten-tijdlijn per klant.',
    features: ['Types: notitie, call, email, vergadering, demo', 'Zoeken en filteren op type en datum', 'Koppeling aan project en offerte', 'Automatische logging vanuit n8n workflows'],
  },
  {
    id: 'ai-chat', title: 'AI Chat', icon: Brain, href: '/ai-chat', color: 'violet',
    description: 'AI-assistent met volledige CRM-toegang en spraakondersteuning.',
    features: ['Gemini 2.0 Flash via Google Vertex AI', '37+ CRM-tools: zoeken, aanmaken, bewerken, analyseren', 'Sessiegeheugen via PostgreSQL (Postgres Chat Memory)', 'ElevenLabs spraakinterface (voice-to-AI)', 'RAG kennisbank met dagelijkse sync', 'Context-aware op basis van huidige pagina'],
  },
  {
    id: 'analytics', title: 'Analytics', icon: BarChart3, href: '/dashboard/crm', color: 'orange',
    description: 'Real-time dashboards voor sales en management.',
    features: ['CRM Dashboard: pipeline per fase, recente activiteit', 'Executive Dashboard: omzettrends, offerte-acceptatieratio', 'Cost Analytics: kosten- en margeoverzicht', 'Realtime updates via Supabase Realtime', 'Rol-gebaseerde weergave (Sales / Admin / Executive)'],
  },
  {
    id: 'email-drafts', title: 'Email Concepten', icon: Mail, href: '/email-drafts', color: 'teal',
    description: 'Review en verstuur AI-gegenereerde emailconcepten.',
    features: ['Concepten van alle n8n automations', 'Bewerken vóór versturen', 'Versturen via Resend (Edge Function)', 'Realtime badge-count in sidebar', 'Status: concept → verstuurd / geannuleerd'],
  },
  {
    id: 'documents', title: 'Documenten', icon: FileText, href: '/documents/templates', color: 'slate',
    description: 'Documenttemplates en OCR-verwerking.',
    features: ['Quote PDF templates beheren', 'OCR-verwerking van inkomende documenten', 'Template-editor voor hergebruik'],
  },
];

// ─── n8n Workflows Data ───────────────────────────────────────────────────────
const N8N_BASE = 'https://dirqsolutions.app.n8n.cloud/workflow';

const WORKFLOWS: Workflow[] = [
  // ATC
  { id: 'IGMxMoXs4v04waOb', name: 'ATC Orchestrator', description: 'Kern event-router: verwerkt alle CRM-events, genereert AI-notificaties en beheert Dead Letter Queue.', trigger: 'webhook', triggerLabel: 'webhook + schedule', status: 'active', category: 'atc' },
  { id: 'PJ07IHpOil3jskxP', name: 'ATC - Taak Overdue Alerter', description: 'Groepeert dagelijks verlopen taken per klant en stuurt direct intern Resend-alert.', trigger: 'schedule', triggerLabel: 'dagelijks 08:45', status: 'active', category: 'atc' },
  { id: 'w9Q19zF59ad9XgXm', name: 'ATC - Offerte Abandoned Follow-up', description: 'Offertes 5+ dagen oud en niet bekeken → Gemini schrijft urgency-email als concept.', trigger: 'schedule', triggerLabel: 'dagelijks 14:00', status: 'active', category: 'atc' },
  { id: 'pyeCMfeASQdrdYOF', name: 'ATC - Contract Renewal Tracker', description: 'Volgt contractvervaldatums (90/60/30 dagen) en genereert verlengingsvoorstel als concept.', trigger: 'schedule', triggerLabel: 'maandag 09:00', status: 'active', category: 'atc' },
  { id: '7mu3clzt9Se416Zn', name: 'ATC - Customer Health Score', description: 'Dagelijkse klantscore (0-100) op basis van recente activiteit. Score < 40 → intern alert + re-engagement concept.', trigger: 'schedule', triggerLabel: 'dagelijks 07:00', status: 'active', category: 'atc' },
  { id: 'BrRuaGQjeafJKlZB', name: 'ATC - Cross-sell Opportunity Finder', description: 'Live klanten zonder hosting/onderhoud → Gemini analyseert cross-sell kansen → concept-email.', trigger: 'schedule', triggerLabel: 'maandag 08:00', status: 'active', category: 'atc' },
  { id: '49PaQYI1JiLTuAns', name: 'ATC - Win-back Campaign', description: 'Churned/inactieve klanten (>90 dagen) → Gemini schrijft "we missen je" email als concept.', trigger: 'schedule', triggerLabel: '1e van de maand', status: 'active', category: 'atc' },
  { id: 'AnnCqjraP0NxiwCf', name: 'ATC - Weekly Pipeline Report', description: 'Weekoverzicht pipeline: gewonnen/verloren deals, stagnerende kansen, gewogen waarde → Resend.', trigger: 'schedule', triggerLabel: 'vrijdag 17:00', status: 'active', category: 'atc' },
  { id: 'HhfQ1TFNOuPR7o2c', name: 'ATC - Lead Velocity Alert', description: 'Vergelijkt nieuwe leads deze vs. vorige week. Bij daling >50% of 0 leads → waarschuwingsnotificatie.', trigger: 'schedule', triggerLabel: 'dagelijks 09:30', status: 'active', category: 'atc' },
  { id: 'w2o9UnbqpZ4QfbBF', name: 'ATC - Meeting No-Show Recovery', description: 'Bij no-show melding vanuit agenda: Gemini schrijft herplanningsvoorstel → concept in CRM.', trigger: 'webhook', triggerLabel: '/meeting-missed', status: 'active', category: 'atc' },
  { id: 'bmR4p665e2hkNXuK', name: 'ATC - Nieuwe Lead Enrichment', description: 'Bij aanmaken bedrijf: KVK API-lookup → adres, branche en grootte automatisch ingevuld.', trigger: 'webhook', triggerLabel: '/company-created', status: 'active', category: 'atc' },
  // Email sub-workflows
  { id: '7B8QQrrEcYSGSwGK', name: 'Email - Klanttevredenheid Check-in', description: 'Projecten 60-120 dagen live → Gemini schrijft "hoe gaat het?" check-in als concept.', trigger: 'schedule', triggerLabel: 'maandelijks 1e', status: 'active', category: 'email' },
  { id: 'UEQQdOTz4DhfBhCw', name: 'Email - Welkom Na Tekening', description: 'Direct na ondertekening offerte: onboarding-email "wat gebeurt er nu?" als concept.', trigger: 'webhook', triggerLabel: '/quote-signed', status: 'active', category: 'email' },
  { id: 'RdZJrOmirC7ewqzf', name: 'Email - Cross-sell Introductie', description: 'Sub-workflow: stuurt cross-sell email direct via Resend en logt interactie.', trigger: 'sub-workflow', triggerLabel: 'sub-workflow', status: 'active', category: 'email' },
  { id: 'vLpbhXokZlue9CAE', name: 'Email - Referral Uitnodiging', description: 'Actieve klanten (>90 dagen, MRR > 0) → Gemini schrijft referral-uitnodiging als concept.', trigger: 'schedule', triggerLabel: '1e maandag 09:00', status: 'active', category: 'email' },
  { id: 'xVh9tWUlSj85loWa', name: 'Email - Win-back Reactivatie', description: 'Sub-workflow: stuurt win-back email direct via Resend en logt interactie.', trigger: 'sub-workflow', triggerLabel: 'sub-workflow', status: 'active', category: 'email' },
  { id: 'FWusCpiCY4BhrD43', name: 'Email - Project Milestone Update', description: 'Bij milestone (50%/90%/live): Gemini schrijft enthousiaste update-email → direct via Resend.', trigger: 'webhook', triggerLabel: '/milestone-reached', status: 'active', category: 'email' },
  { id: 'PuJSmQ8t725FvNVX', name: 'Email - Maandelijkse Waarde Samenvatting', description: 'Per actieve klant: Gemini schrijft maandelijks overzicht van geleverde waarde → concept.', trigger: 'schedule', triggerLabel: '1e van de maand 09:00', status: 'active', category: 'email' },
  { id: 'XYPTmcLBlSzaPbfZ', name: 'Email - No-show Herplanning', description: 'Sub-workflow: stuurt vriendelijke herplannings-email via Resend en logt interactie.', trigger: 'sub-workflow', triggerLabel: 'sub-workflow', status: 'active', category: 'email' },
  // Tools (AI Chatbot sub-workflows)
  { id: '3WcnIawEzSfOKiss', name: 'Tool - Company Searcher', description: 'Zoekt bedrijven op naam (ilike) en geeft gedetailleerde resultaten terug aan de chatbot.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { id: 'rpbHzxjBd0OPQnh2', name: 'Tool - Project Searcher', description: 'Zoekt projecten/deals met company joins — kern-tool van de AI chatbot.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { id: 'fvCEfhk3lCGtAzFJ', name: 'Tool - Contact Searcher', description: 'Zoekt contactpersonen met bedrijfskoppeling.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { id: 'o2HhV82OXqHvF1oH', name: 'Tool - Quote Searcher', description: 'Zoekt offertes met project- en bedrijfsdetails.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { id: 'yO5DrnZuMuTWk2Be', name: 'Tool - Activity Searcher', description: 'Zoekt laatste 20 interacties gesorteerd op datum.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { id: '58WpdsvPp6r7nd73', name: 'Tool - Deal Manager', description: 'Haalt volledige dealdetails op inclusief bedrijfskoppeling.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { id: 'OXoHn2dPYWc1mPXm', name: 'Tool - Stage Transitioner', description: 'Wijzigt de pipeline-fase van een project en past kansberekening aan.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { id: 'gZvPPvNlvvXS6hOA', name: 'Tool - Note Logger', description: 'Maakt een interactie/notitie-record aan in het CRM.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { id: 'IH23dZsK4RRkBV49', name: 'Tool - Company Creator', description: 'Maakt nieuw bedrijf aan met eigenaar-koppeling en duplicaatcontrole.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { id: 'WXwNJALgFmRiAOdW', name: 'Tool - Contact Creator', description: 'Maakt nieuwe contactpersoon aan — accepteert volledige naam of voor/achternaam.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { id: '25zxnOwMBZ35WUVc', name: 'Tool - Lead Creator', description: 'Maakt nieuw project aan als lead (fase: lead, kans: 10%).', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Company Lister', description: 'Gepagineerde lijst van bedrijven — voor overzichtsvragen aan de chatbot.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Contact Lister', description: 'Gepagineerde lijst van contactpersonen.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Knowledge Retriever', description: 'RAG-zoekopdracht in de kennisbank (768-dim pgvector embeddings).', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Email Sender', description: 'Verstuurt email direct via Resend namens de chatbot.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Company Editor', description: 'Bewerkt bedrijfsgegevens op basis van AI-instructie.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Contact Editor', description: 'Bewerkt contactgegevens op basis van AI-instructie.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Project Creator', description: 'Maakt een nieuw project aan gekoppeld aan een bedrijf.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Quote Creator', description: 'Maakt een nieuwe offerte aan voor een project.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Task Creator', description: 'Maakt een taak aan met deadlines en prioriteit.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Quote Status Changer', description: 'Wijzigt de status van een offerte (bijv. sent → signed).', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - CRM Dashboard', description: 'Genereert real-time pipeline overzicht voor de chatbot.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Pipeline Overview', description: 'Geeft pipeline-waarde en deal-aantallen per fase.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Quote Status Checker', description: 'Controleert de huidige status van een specifieke offerte.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Follow-up Reminder', description: 'Maakt een herinneringstaken aan voor follow-up met een klant.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Inactive Client Finder', description: 'Vindt klanten zonder activiteit in de afgelopen X dagen.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Deal Deadline Tracker', description: 'Controleert deals met naderende sluitingsdatums.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Revenue Forecast', description: 'Berekent verwachte omzet op basis van gewogen pipeline.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Talking Points Generator', description: 'Genereert gespreksonderwerpen voor een meeting op basis van klantdata.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Quote Reminder Email', description: 'Stuurt herinneringsmail voor een specifieke openstaande offerte.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - KVK Lookup', description: 'Zoekt bedrijfsgegevens op via de KVK API op naam of nummer.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  { name: 'Tool - Apollo.io Enrichment', description: 'Zoekt contactgegevens van prospects via Apollo.io.', trigger: 'sub-workflow', triggerLabel: 'chatbot tool', status: 'active', category: 'tools' },
  // Infra
  { id: 'lo0RW5Sw4UHXnMpr', name: 'CRM AI Chatbot (Handler)', description: 'Hoofd AI-agent: Gemini 2.0 Flash, Postgres geheugen, 37+ tools, context-routing en ElevenLabs voice bridge.', trigger: 'chat', triggerLabel: 'chat webhook', status: 'active', category: 'infra' },
  { id: 'xlutoXX0IDvoW3UG', name: 'RAG Daily Sync', description: 'Dagelijkse kennisbank-update: embeddings (768-dim pgvector) vanuit CRM-data gesynchroniseerd.', trigger: 'schedule', triggerLabel: 'dagelijks', status: 'active', category: 'infra' },
  { id: 'pryo6BXKL2poichX', name: 'Error Alerter', description: 'Dead Letter Queue monitoring + auto-retry logica bij workflow-fouten.', trigger: 'webhook', triggerLabel: 'workflow error', status: 'active', category: 'infra' },
];

// ─── Integrations Data ────────────────────────────────────────────────────────
const INTEGRATIONS: Integration[] = [
  {
    id: 'supabase', name: 'Supabase', color: 'emerald',
    description: 'De volledige backend: database, authenticatie, realtime en opslag.',
    uses: ['PostgreSQL — alle CRM-tabellen (bedrijven, contacten, projecten, offertes…)', 'Auth — JWT-sessies, Row Level Security (RLS) per gebruiker', 'Realtime — live dashboards en badge-counts via WebSocket', 'Storage — document- en media-opslag', 'Edge Functions — send-email (Resend), e-sign logica'],
  },
  {
    id: 'gemini', name: 'Gemini AI / Vertex AI', color: 'violet',
    description: "Google's AI-platform voor de chatbot en alle n8n email-generatie.",
    uses: ['AI Chatbot agent (gemini-2.0-flash via Vertex AI)', 'Email teksten schrijven in 9 n8n workflow typen', 'Cross-sell en win-back analyse op klantdata', 'Wekelijks pipeline-narratief voor rapport', 'RAG: retrieval-augmented generation op kennisbank'],
  },
  {
    id: 'google-calendar', name: 'Google Calendar', color: 'blue',
    description: 'Bidirectionele agenda-sync tussen het CRM en Google Calendar.',
    uses: ['CRM events exporteren naar Google Calendar', 'Google afspraken importeren in CRM', 'OAuth2 met automatische token refresh', 'Meeting-koppeling aan bedrijf en contactpersoon'],
  },
  {
    id: 'resend', name: 'Resend', color: 'orange',
    description: 'Transactionele email service voor alle uitgaande berichten.',
    uses: ['Klantgerichte emails vanuit n8n workflows', 'Interne alerts (pipeline report, overdue taken)', 'E-sign ondertekeningslinks versturen', 'Email drafts versturen vanuit het CRM'],
  },
  {
    id: 'kvk', name: 'KVK API', color: 'teal',
    description: 'Officieel Nederlands Kamer van Koophandel bedrijfsregister.',
    uses: ['Bedrijfsadres, branche en grootte opvragen', 'KVK-nummer valideren bij aanmaken', 'Automatische verrijking via n8n bij nieuw bedrijf', 'Gratis, GDPR-compliant en officieel register'],
  },
  {
    id: 'apollo', name: 'Apollo.io', color: 'pink',
    description: 'Lead enrichment platform voor prospect outreach.',
    uses: ['Contactgegevens opvragen bij prospects', 'Email-adressen van beslissingsmakers', 'Integratie in Google Places prospect-pipeline'],
  },
];

// ─── Graph: Node Labels & Details ─────────────────────────────────────────────
const NODE_LABELS: Record<string, string> = {
  // Architecture view
  user: 'Jij (Dirq Solutions)',
  'crm-bedrijven':    'Bedrijven',
  'crm-contacten':    'Contactpersonen',
  'crm-pipeline':     'Pipeline & Projecten',
  'crm-offertes':     'Offertes',
  'crm-interacties':  'Contactmomenten',
  'crm-taken':        'Taken',
  'crm-agenda':       'Agenda',
  'crm-analytics':    'Analytics',
  'crm-ai-chat':      'AI Chat Agent',
  'crm-email-drafts': 'Email Concepten',
  'crm-notificaties': 'Notificaties',
  supabase: 'Supabase Backend',
  'wh-company':  'Webhook /company-created',
  'wh-milestone':'Webhook /milestone-reached',
  'wh-noshow':   'Webhook /meeting-missed',
  'n8n-atc':   'ATC / Omzet Automations',
  'n8n-email': 'Email Workflows',
  'n8n-ai':    'AI Chatbot Tools',
  'n8n-infra': 'Infra & Monitoring',
  'ext-gemini': 'Gemini AI',
  'ext-vertexai': 'Vertex AI Chatbot',
  'ext-resend': 'Resend',
  'ext-gcal': 'Google Calendar',
  'ext-kvk': 'KVK API',
  'ext-apollo': 'Apollo.io',
  // Data model view
  'dm-user':        'Gebruiker / Profiel',
  'dm-companies':   'Bedrijven',
  'dm-contacts':    'Contacten',
  'dm-projects':    'Projecten',
  'dm-quotes':      'Offertes',
  'dm-quote-items': 'Offerte-regels',
  'dm-interactions':'Interacties',
  'dm-calendar':    'Agenda Events',
};

const NODE_DETAILS: Record<string, NodeDetail> = {
  user: {
    title: 'Jij — Dirq Solutions',
    description: 'De gebruiker die het CRM bedient voor sales, projectbeheer en klantcommunicatie.',
    features: ['Rol-gebaseerde toegang (ADMIN / SALES / MANAGER / SUPPORT)', 'Persoonlijk dashboard op basis van rol', 'Google OAuth2 authenticatie', 'Sessiegeheugen per gebruiker in AI chatbot'],
  },
  'crm-bedrijven': {
    title: 'Bedrijven',
    description: 'Centraal bedrijvenregister voor klanten, prospects en partners.',
    features: ['CRUD met duplicaatcontrole (naam + KVK)', 'Bulk selectie en verwijdering', 'Filter presets per gebruiker (localStorage)', 'KVK-verrijking via n8n bij aanmaken', 'Audit log — activiteitentijdlijn', 'Status: prospect / lead / klant / inactief'],
    link: '/companies',
  },
  'crm-contacten': {
    title: 'Contacten',
    description: 'Contactpersonen gekoppeld aan bedrijven, met primaire contactmarkering.',
    features: ['CRUD met bedrijfskoppeling (company_id)', 'CSV bulk import', 'Primaire contactpersoon markeren', 'Beslissingsmaker-vlag', 'LinkedIn URL opslaan', 'Zoek en filter op naam / bedrijf / functie'],
    link: '/contacts',
  },
  'crm-pipeline': {
    title: 'Pipeline & Projecten',
    description: 'Volledig projectbeheer van lead tot live, inclusief kanban-bord.',
    features: ['10 project-fasen met automatische kansberekening (10–100%)', 'Kanban-bord met drag-and-drop', 'Lead → klant conversie in één klik', 'Milestone-webhooks sturen n8n email-automations'],
    link: '/pipeline',
  },
  'crm-offertes': {
    title: 'Offertes',
    description: 'Professionele offertes met PDF en digitale handtekening.',
    features: ['PDF genereren vanuit templates', 'E-sign: klant ondertekent via unieke link', 'Status tracking van draft tot signed', 'Verloopdatum-alerts via n8n', 'Webhook /quote-signed triggert welkomst-email'],
    link: '/quotes',
  },
  'crm-activiteiten': {
    title: 'Activiteiten & Agenda',
    description: 'Agenda, interacties en alle klantcommunicatie op één tijdlijn.',
    features: ['Bidirectionele Google Calendar sync', 'Event types: vergadering, call, taak, herinnering, demo', '"No-show melden" → webhook → herplanningsmail via n8n', 'Interactie-tijdlijn: notitie, call, email logging'],
    link: '/calendar',
  },
  'crm-analytics': {
    title: 'Analytics & Dashboards',
    description: 'Realtime inzicht in pipeline, omzet en klantactiviteit via rol-gebaseerde dashboards.',
    features: ['CRM Dashboard: pipeline per fase, recente activiteit', 'Executive Dashboard: omzettrends, offerte-acceptatieratio', 'Cost Analytics: kosten- en margeoverzicht', 'Realtime updates via Supabase Realtime', 'Rol-gebaseerde weergave (Sales / Admin / Executive)'],
    link: '/dashboard/crm',
  },
  'crm-interacties': {
    title: 'Contactmomenten',
    description: 'Alle communicatie en contactmomenten met klanten op een chronologische tijdlijn.',
    features: ['8 interactie-types: notitie, call, email, vergadering, demo, taak, brief, LinkedIn video audit', 'Richting: inbound / outbound', 'Koppelbaar aan bedrijf, contactpersoon én project', 'Duur bijhouden (minuten) voor calls en vergaderingen', 'Auto-gelogd vanuit n8n workflows (emails, milestones)', 'Zoek en filter op type, datum en bedrijf'],
    link: '/interactions',
  },
  'crm-taken': {
    title: 'Taken',
    description: 'Opvolgingstaken en to-dos gekoppeld aan bedrijven, contacten en projecten.',
    features: ['Aanmaken via AI Chat (Tool - Task Creator)', 'Status: pending / completed / cancelled', 'Deadline en prioriteit instellen', 'Gekoppeld aan bedrijf en contactpersoon', 'Overdue taken triggeren dagelijkse n8n alert (ATC - Taak Overdue Alerter)', 'Zichtbaar in interacties-tijdlijn'],
  },
  'crm-agenda': {
    title: 'Agenda',
    description: 'Volledige agenda met Google Calendar sync en no-show management.',
    features: ['Bidirectionele Google Calendar sync (OAuth2)', 'Event types: vergadering, call, taak, herinnering, demo', '"No-show melden" knop → webhook → herplanningsmail via n8n', 'Dag / week / maand weergave', 'Koppelbaar aan bedrijf en contactpersoon', 'Google event-ID voor dubbele-sync preventie'],
    link: '/calendar',
  },
  'crm-ai-chat': {
    title: 'AI Chat Agent',
    description: 'Volledige AI-assistent met 37+ CRM-tools, spraakinterface en sessiegeheugen.',
    features: ['Gemini 2.0 Flash via Google Vertex AI', '37+ tools: zoeken, aanmaken, bewerken, analyseren', 'Postgres Chat Memory (sessie-persistentie per gebruiker)', 'ElevenLabs spraakinterface (voice-to-AI)', 'RAG kennisbank met dagelijkse sync (768-dim pgvector)', 'Context-aware op basis van huidige CRM-pagina'],
    link: '/dashboard/crm',
  },
  'crm-email-drafts': {
    title: 'Email Concepten',
    description: 'AI-gegenereerde email-concepten vanuit n8n automations — bewerken en versturen vanuit het CRM.',
    features: ['Automatisch aangemaakt door n8n email workflows', 'Concept bewerken voor verzending', 'Versturen via Resend (Edge Function)', 'Realtime badge-count in sidebar', 'Status: concept → verzonden / geannuleerd', '9 workflow-types genereren concepten (follow-up, onboarding, referral, etc.)'],
    link: '/email-drafts',
  },
  'crm-notificaties': {
    title: 'Notificaties',
    description: 'Realtime meldingen voor CRM-events, deadlines en AI-acties — direct klikbaar.',
    features: ['Realtime via Supabase Realtime (WebSocket)', 'Types: deadline, goedkeuring, update, herinnering, escalatie, digest', 'Prioriteit: normaal / hoog / urgent', 'Deep links naar het relevante CRM-record', 'Markeer als gelezen / verwijder individueel of alles', 'Bell-icon in navbar met ongelezen-badge'],
  },
  supabase: {
    title: 'Supabase Backend',
    description: 'De volledige backend: PostgreSQL, Auth, Realtime, Storage en Edge Functions.',
    features: ['PostgreSQL — alle CRM-tabellen + RLS policies per gebruiker', 'Auth — JWT-sessies, Google OAuth2', 'Realtime — live dashboards en badge-counts', 'Edge Functions — send-email (Resend), e-sign logica', 'Storage — documenten en media'],
  },
  'wh-company': {
    title: 'Webhook /company-created',
    description: 'Getriggerd door het CRM bij aanmaken van elk nieuw bedrijf.',
    features: ['Bron: useCompanyMutations.ts → onSuccess', 'Fire-and-forget (UI wacht niet op respons)', 'Doel: ATC - Nieuwe Lead Enrichment', 'Actie: KVK-lookup → company adres/branche updaten'],
  },
  'wh-milestone': {
    title: 'Webhook /milestone-reached',
    description: 'Getriggerd bij project-milestones (Ontwikkeling gestart 50%, Review 90%, Live 100%).',
    features: ['Bron: useProjectMutations.ts → onSuccess stage change', 'Triggers op fasen: in_development, review, live', 'Doel: Email - Project Milestone Update', 'Actie: Gemini schrijft update-email → direct via Resend'],
  },
  'wh-noshow': {
    title: 'Webhook /meeting-missed',
    description: 'Getriggerd wanneer de "No-show melden" knop in de agenda wordt ingedrukt.',
    features: ['Bron: EventDetailDialog.tsx → handleNoShow()', 'Alleen zichtbaar voor verlopen meetings met bedrijfskoppeling', 'Doel: ATC - Meeting No-Show Recovery', 'Actie: Gemini schrijft herplanningsvoorstel → concept in CRM'],
  },
  'n8n-atc': {
    title: 'ATC / Omzet Automations — 11 Workflows',
    description: 'Geautomatiseerde omzetbescherming en klantbehoud via dagelijkse en wekelijkse triggers.',
    features: ['ATC Orchestrator: centrale event-router en DLQ', 'Taak Overdue Alerter: dagelijkse overdue-meldingen', 'Offerte Follow-up: 5+ dagen geen reactie → Gemini email-concept', 'Contract Renewal: 90/60/30 dagen voor verloopdatum', 'Customer Health Score: dagelijkse score 0-100 per klant', 'Cross-sell Opportunity Finder: klanten zonder hosting/maintenance', 'Win-back Campaign: inactieve klanten >90 dagen', 'Weekly Pipeline Report: vrijdag 17:00 via Resend', 'Lead Velocity Alert: dalende lead instroom detectie', 'Meeting No-Show Recovery: herplanningsvoorstel via Gemini', 'Nieuwe Lead Enrichment: KVK-verrijking bij bedrijfsaanmaak'],
  },
  'n8n-email': {
    title: 'Email Workflows — 8 Workflows',
    description: 'Klantgerichte email-automations voor onboarding, check-ins en opvolging.',
    features: ['Klanttevredenheid Check-in: 60-120 dagen na live gaan', 'Welkom Na Tekening: direct na offerte-ondertekening', 'Cross-sell Introductie: direct via Resend + interactie-log', 'Referral Uitnodiging: actieve klanten >90 dagen', 'Win-back Reactivatie: direct via Resend + interactie-log', 'Project Milestone Update: 50% / 90% / live status', 'Maandelijkse Waarde Samenvatting: 1e van de maand', 'No-show Herplanning: vriendelijke herplanningsmail'],
  },
  'n8n-ai': {
    title: 'AI Chatbot Tools — 37 Sub-workflows',
    description: 'De volledige toolset van de CRM AI-agent — elk CRM-actie is een afzonderlijke sub-workflow.',
    features: ['Zoeken: Company, Contact, Project, Quote, Activity, Deal', 'Aanmaken: Company, Contact, Lead, Project, Quote, Task, Note', 'Bewerken: Company Editor, Contact Editor, Stage Transitioner', 'Analyseren: CRM Dashboard, Pipeline Overview, Revenue Forecast', 'Communiceren: Email Sender, Quote Reminder, Follow-up Reminder', 'Verrijken: KVK Lookup, Apollo.io Enrichment', 'AI specifiek: Knowledge Retriever (RAG), Talking Points Generator', 'CRM AI Chatbot Handler: Gemini 2.0 Flash agent met Postgres geheugen'],
  },
  'n8n-infra': {
    title: 'Infra & Monitoring — 3 Workflows',
    description: 'Infrastructurele workflows voor kennisbank, chatbot en foutafhandeling.',
    features: ['CRM AI Chatbot Handler: hoofd-agent met voice interface (ElevenLabs)', 'RAG Daily Sync: dagelijkse kennisbank update (768-dim pgvector)', 'Error Alerter: Dead Letter Queue monitoring + auto-retry logica'],
  },
  'ext-gemini': {
    title: 'Gemini AI (via Vertex AI)',
    description: "Google's taalmodel voor alle AI-teksten in n8n workflows.",
    features: ['Model: gemini-2.0-flash', 'Email schrijven (9 workflow typen)', 'Pipeline narratieven (weekrapport)', 'Cross-sell en win-back analyse op klantdata'],
  },
  'ext-vertexai': {
    title: 'Vertex AI — AI Chat Agent',
    description: 'De AI chatbot agent met volledig CRM-geheugen en 37+ tools.',
    features: ['Gemini 2.0 Flash via Google Vertex AI', 'Postgres Chat Memory (sessie-persistentie)', 'Context-aware routing (pagina-bewust)', 'ElevenLabs voice bridge voor spraakinteractie'],
  },
  'ext-resend': {
    title: 'Resend',
    description: 'Transactionele email service voor alle uitgaande berichten.',
    features: ['Klantgerichte emails vanuit n8n', 'Interne alerts (pipeline report, taken)', 'E-sign ondertekeningslinks', 'Email drafts versturen vanuit CRM'],
  },
  'ext-gcal': {
    title: 'Google Calendar',
    description: 'Bidirectionele agenda-sync voor vergaderingen en events.',
    features: ['OAuth2 integratie met automatische token refresh', 'CRM → Google Calendar export', 'Google Calendar → CRM import', 'Koppeling meetings aan bedrijf en contactpersoon'],
  },
  'ext-kvk': {
    title: 'KVK API',
    description: 'Officieel Nederlands bedrijfsregister voor automatische verrijking.',
    features: ['Adres, branche en grootte opvragen op naam of nummer', 'Gratis, GDPR-compliant en officieel register', 'Automatische verrijking via n8n bij nieuw bedrijf'],
  },
  'ext-apollo': {
    title: 'Apollo.io',
    description: 'Lead enrichment platform voor prospect outreach pipeline.',
    features: ['Contactgegevens opvragen bij prospects', 'Email-adressen van beslissingsmakers', 'Integratie in de Google Places outreach pipeline'],
  },
  // Data model nodes
  'dm-user': {
    title: 'Gebruiker / Profiel',
    description: 'Systeemgebruikers (medewerkers Dirq) met rol-gebaseerde toegang.',
    features: ['id: uuid (primary key)', 'email: text (Google OAuth)', 'role: enum (admin / sales / manager / support)', 'full_name: text', 'Eigenaar van bedrijven, projecten, agenda-events en interacties'],
  },
  'dm-companies': {
    title: 'Bedrijven',
    description: 'Hub-entiteit: bijna alles in het CRM is gekoppeld aan een bedrijf.',
    features: ['id: uuid', 'name: text (required)', 'kvk_number: text', 'status: enum (prospect / lead / klant / inactief)', 'owner_id → profiles', 'industry_id → industries', 'Cascade delete naar contacten, projecten, offertes, interacties'],
    link: '/companies',
  },
  'dm-contacts': {
    title: 'Contacten',
    description: 'Contactpersonen bij bedrijven — optioneel, maar bijna altijd aanwezig.',
    features: ['id: uuid', 'first_name / last_name: text', 'email / phone: text', 'company_id → companies (FK, set NULL bij delete)', 'is_primary: boolean', 'is_decision_maker: boolean', 'Cascade set-null als bedrijf verwijderd wordt'],
    link: '/contacts',
  },
  'dm-projects': {
    title: 'Projecten (sales pipeline)',
    description: 'Website-projecten die de volledige sales lifecycle doorlopen.',
    features: ['id: uuid', 'title: text', 'stage: enum (10 fasen)', 'probability: int (10–100%)', 'company_id → companies (required)', 'contact_id → contacts (optional)', 'estimated_value / actual_value: decimal'],
    link: '/projects',
  },
  'dm-quotes': {
    title: 'Offertes',
    description: 'Offertes gekoppeld aan bedrijf, optioneel ook aan contactpersoon en project.',
    features: ['id: uuid', 'title: text', 'status: enum (draft / sent / viewed / signed / rejected)', 'company_id → companies (required)', 'contact_id → contacts (optional)', 'project_id → projects (optional)', 'valid_until: date', 'Bevat meerdere offerte-regels (cascade delete)'],
    link: '/quotes',
  },
  'dm-quote-items': {
    title: 'Offerte-regels',
    description: 'Individuele regels binnen een offerte (producten of diensten).',
    features: ['id: uuid', 'description: text', 'quantity: numeric', 'unit_price: decimal', 'total_price: decimal', 'quote_id → quotes (cascade delete)'],
  },
  'dm-interactions': {
    title: 'Interacties (contactmomenten)',
    description: 'Alle contactmomenten: notities, calls, emails, vergaderingen. Koppelbaar aan meerdere entiteiten tegelijk.',
    features: ['id: uuid', 'type: enum (note / call / email / meeting / demo)', 'company_id → companies', 'contact_id → contacts', 'project_id → projects (optional)', 'user_id → profiles', 'date: timestamptz', 'Kan aan bedrijf én contactpersoon én project tegelijk gelinkt zijn'],
    link: '/interactions',
  },
  'dm-calendar': {
    title: 'Agenda Events',
    description: 'Kalenderitems van medewerkers, gekoppeld aan CRM-entiteiten.',
    features: ['id: uuid', 'title: text', 'type: enum (meeting / call / task / demo / reminder)', 'user_id → profiles (required)', 'company_id → companies (optional)', 'contact_id → contacts (optional)', 'project_id → projects (optional)', 'google_event_id: text (voor sync)', '"No-show melden" knop triggert n8n webhook'],
    link: '/calendar',
  },
};

// ─── Graph: Architecture Nodes & Edges ────────────────────────────────────────
const BASE_NODES: Node[] = [
  { id: 'user', type: 'userNode', position: { x: 660, y: 0 }, data: { label: 'Jij', sub: 'Dirq Solutions' } },
  // CRM layer rij 1 — 6 modules
  { id: 'crm-bedrijven',   type: 'crmNode', position: { x: 0,    y: 190 }, data: { label: 'Bedrijven',     sub: 'CRUD · KVK · Audit log',   icon: 'Building2' } },
  { id: 'crm-contacten',   type: 'crmNode', position: { x: 210,  y: 190 }, data: { label: 'Contactpersonen', sub: 'CSV import · Primair',    icon: 'Users' } },
  { id: 'crm-pipeline',    type: 'crmNode', position: { x: 420,  y: 190 }, data: { label: 'Pipeline',      sub: 'Projecten · 10 fases',      icon: 'FolderKanban' } },
  { id: 'crm-offertes',    type: 'crmNode', position: { x: 630,  y: 190 }, data: { label: 'Offertes',      sub: 'PDF · E-Sign',              icon: 'FileText' } },
  { id: 'crm-interacties', type: 'crmNode', position: { x: 840,  y: 190 }, data: { label: 'Contactmomenten', sub: '8 typen · Timeline',      icon: 'MessageSquare' } },
  { id: 'crm-taken',       type: 'crmNode', position: { x: 1050, y: 190 }, data: { label: 'Taken',         sub: 'Deadlines · Prioriteit',    icon: 'CheckSquare' } },
  // CRM layer rij 2 — 5 modules
  { id: 'crm-agenda',       type: 'crmNode', position: { x: 100,  y: 360 }, data: { label: 'Agenda',        sub: 'Google Sync · No-show',     icon: 'CalendarDays' } },
  { id: 'crm-analytics',    type: 'crmNode', position: { x: 340,  y: 360 }, data: { label: 'Analytics',     sub: 'Dashboards · Realtime',     icon: 'BarChart3' } },
  { id: 'crm-ai-chat',      type: 'crmNode', position: { x: 580,  y: 360 }, data: { label: 'AI Chat Agent', sub: '37 tools · Gemini Flash',   icon: 'Bot' } },
  { id: 'crm-email-drafts', type: 'crmNode', position: { x: 820,  y: 360 }, data: { label: 'Email Concepten', sub: 'AI drafts · Resend',      icon: 'Mail' } },
  { id: 'crm-notificaties', type: 'crmNode', position: { x: 1060, y: 360 }, data: { label: 'Notificaties',  sub: 'Realtime · Deep links',     icon: 'Bell' } },
  // Backend
  { id: 'supabase', type: 'backendNode', position: { x: 100, y: 540 }, data: { label: 'Supabase', sub: 'PostgreSQL · Auth · Realtime · Storage · Edge Functions' } },
  // Webhooks (rechts van Supabase)
  { id: 'wh-company',   type: 'webhookNode', position: { x: 1220, y: 450 }, data: { label: '/company-created' } },
  { id: 'wh-milestone', type: 'webhookNode', position: { x: 1220, y: 540 }, data: { label: '/milestone-reached' } },
  { id: 'wh-noshow',    type: 'webhookNode', position: { x: 1220, y: 630 }, data: { label: '/meeting-missed' } },
  // n8n — 4 categorie-nodes
  { id: 'n8n-atc',   type: 'automationNode', position: { x: 0,   y: 700 }, data: { label: 'ATC / Omzet',      sub: '11 workflows · Triggers · Health', color: 'amber'  } },
  { id: 'n8n-email', type: 'automationNode', position: { x: 240, y: 700 }, data: { label: 'Email Flows',       sub: '8 workflows · Onboarding · Opvolging', color: 'sky'    } },
  { id: 'n8n-ai',    type: 'automationNode', position: { x: 480, y: 700 }, data: { label: 'AI Chatbot Tools',  sub: '37 tools · Vertex AI · Gemini', color: 'violet' } },
  { id: 'n8n-infra', type: 'automationNode', position: { x: 720, y: 700 }, data: { label: 'Infra & Monitoring',sub: '3 workflows · RAG sync · Errors', color: 'slate'  } },
  // External
  { id: 'ext-gemini',   type: 'externalNode', position: { x: 60,   y: 870 }, data: { label: 'Gemini AI',       sub: 'gemini-2.0-flash',  color: 'violet' } },
  { id: 'ext-vertexai', type: 'externalNode', position: { x: 250,  y: 870 }, data: { label: 'Vertex AI',       sub: 'AI Chatbot Agent',  color: 'violet' } },
  { id: 'ext-resend',   type: 'externalNode', position: { x: 440,  y: 870 }, data: { label: 'Resend',          sub: 'Email Service',     color: 'orange' } },
  { id: 'ext-gcal',     type: 'externalNode', position: { x: 630,  y: 870 }, data: { label: 'Google Calendar', sub: 'Bidirectioneel',    color: 'blue' } },
  { id: 'ext-kvk',      type: 'externalNode', position: { x: 820,  y: 870 }, data: { label: 'KVK API',         sub: 'Verrijking',        color: 'teal' } },
  { id: 'ext-apollo',   type: 'externalNode', position: { x: 1010, y: 870 }, data: { label: 'Apollo.io',       sub: 'Lead Enrichment',   color: 'pink' } },
];

const BASE_EDGES: Edge[] = [
  // User → CRM rij 1 (6 modules)
  { id: 'u-bed', source: 'user', target: 'crm-bedrijven',    type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  { id: 'u-con', source: 'user', target: 'crm-contacten',    type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  { id: 'u-pip', source: 'user', target: 'crm-pipeline',     type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  { id: 'u-off', source: 'user', target: 'crm-offertes',     type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  { id: 'u-int', source: 'user', target: 'crm-interacties',  type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  { id: 'u-tak', source: 'user', target: 'crm-taken',        type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  // User → CRM rij 2 (5 modules)
  { id: 'u-age', source: 'user', target: 'crm-agenda',       type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  { id: 'u-ana', source: 'user', target: 'crm-analytics',    type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  { id: 'u-ai',  source: 'user', target: 'crm-ai-chat',      type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  { id: 'u-ed',  source: 'user', target: 'crm-email-drafts', type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  { id: 'u-not', source: 'user', target: 'crm-notificaties', type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  // CRM → Supabase (alle 11 modules)
  { id: 'bed-sb', source: 'crm-bedrijven',    target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'con-sb', source: 'crm-contacten',    target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'pip-sb', source: 'crm-pipeline',     target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'off-sb', source: 'crm-offertes',     target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'int-sb', source: 'crm-interacties',  target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'tak-sb', source: 'crm-taken',        target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'age-sb', source: 'crm-agenda',       target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'ana-sb', source: 'crm-analytics',    target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'ai-sb',  source: 'crm-ai-chat',      target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'ed-sb',  source: 'crm-email-drafts', target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  { id: 'not-sb', source: 'crm-notificaties', target: 'supabase', style: { stroke: '#10b981', strokeWidth: 1.5 } },
  // Supabase → CRM (realtime)
  { id: 'sb-ana', source: 'supabase', target: 'crm-analytics',    type: 'smoothstep', animated: true, style: { stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5,5' } },
  { id: 'sb-not', source: 'supabase', target: 'crm-notificaties', type: 'smoothstep', animated: true, style: { stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5,5' } },
  // Agenda ↔ Google Calendar
  { id: 'age-gcal', source: 'crm-agenda', target: 'ext-gcal', type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 1.5 } },
  { id: 'gcal-age', source: 'ext-gcal', target: 'crm-agenda', type: 'smoothstep', style: { stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4,4' } },
  // Email Drafts → Resend (direct send)
  { id: 'ed-res', source: 'crm-email-drafts', target: 'ext-resend', type: 'smoothstep', animated: true, style: { stroke: '#f97316', strokeWidth: 1.5 } },
  // AI Chat response ← Vertex AI (antwoord terug naar chat UI)
  { id: 'vtx-ai', source: 'ext-vertexai', target: 'crm-ai-chat', type: 'smoothstep', style: { stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4,4' } },
  // CRM → Webhooks
  { id: 'bed-wh1', source: 'crm-bedrijven', target: 'wh-company',   type: 'smoothstep', style: { stroke: '#0ea5e9', strokeWidth: 1.5 } },
  { id: 'pip-wh2', source: 'crm-pipeline',  target: 'wh-milestone', type: 'smoothstep', style: { stroke: '#0ea5e9', strokeWidth: 1.5 } },
  { id: 'age-wh3', source: 'crm-agenda',    target: 'wh-noshow',    type: 'smoothstep', style: { stroke: '#0ea5e9', strokeWidth: 1.5 } },
  // Webhooks → n8n categorieën (gelabeld)
  { id: 'wh1-atc',   source: 'wh-company',   target: 'n8n-atc',   label: 'Lead Enrichment',  animated: true, type: 'smoothstep', style: { stroke: '#f59e0b', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#f59e0b', fontWeight: 600 }, labelBgStyle: { fill: '#fffbeb' } },
  { id: 'wh2-email', source: 'wh-milestone', target: 'n8n-email', label: 'Milestone Email',   animated: true, type: 'smoothstep', style: { stroke: '#0ea5e9', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#0ea5e9', fontWeight: 600 }, labelBgStyle: { fill: '#f0f9ff' } },
  { id: 'wh3-atc',   source: 'wh-noshow',    target: 'n8n-atc',   label: 'No-show Recovery', animated: true, type: 'smoothstep', style: { stroke: '#f59e0b', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#f59e0b', fontWeight: 600 }, labelBgStyle: { fill: '#fffbeb' } },
  // Supabase → n8n categorieën (scheduled triggers, gelabeld)
  { id: 'sb-atc',   source: 'supabase', target: 'n8n-atc',   label: 'Dagelijkse triggers', type: 'smoothstep', style: { stroke: '#f59e0b', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#f59e0b', fontWeight: 600 }, labelBgStyle: { fill: '#fffbeb' } },
  { id: 'sb-email', source: 'supabase', target: 'n8n-email', label: 'Maandelijkse mails',  type: 'smoothstep', style: { stroke: '#0ea5e9', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#0ea5e9', fontWeight: 600 }, labelBgStyle: { fill: '#f0f9ff' } },
  { id: 'sb-infra', source: 'supabase', target: 'n8n-infra', label: 'RAG sync',            type: 'smoothstep', style: { stroke: '#64748b', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#64748b', fontWeight: 600 }, labelBgStyle: { fill: '#f8fafc' } },
  // n8n → External services (gelabeld per categorie)
  { id: 'atc-gem',   source: 'n8n-atc',   target: 'ext-gemini',   label: 'Email schrijven', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#8b5cf6' }, labelBgStyle: { fill: '#faf5ff' } },
  { id: 'atc-res',   source: 'n8n-atc',   target: 'ext-resend',   label: 'Alerts',          animated: true, style: { stroke: '#f97316', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#f97316' }, labelBgStyle: { fill: '#fff7ed' } },
  { id: 'atc-kvk',   source: 'n8n-atc',   target: 'ext-kvk',      label: 'KVK verrijking',              style: { stroke: '#14b8a6', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#14b8a6' }, labelBgStyle: { fill: '#f0fdfa' } },
  { id: 'email-gem', source: 'n8n-email', target: 'ext-gemini',   label: 'Email content',   animated: true, style: { stroke: '#8b5cf6', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#8b5cf6' }, labelBgStyle: { fill: '#faf5ff' } },
  { id: 'email-res', source: 'n8n-email', target: 'ext-resend',   label: 'Versturen',       animated: true, style: { stroke: '#f97316', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#f97316' }, labelBgStyle: { fill: '#fff7ed' } },
  { id: 'ai-vtx',    source: 'n8n-ai',    target: 'ext-vertexai', label: '37 tools',        animated: true, style: { stroke: '#8b5cf6', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#8b5cf6' }, labelBgStyle: { fill: '#faf5ff' } },
  // n8n-infra schrijft terug naar Supabase (RAG, logs)
  { id: 'infra-sb',  source: 'n8n-infra', target: 'supabase', label: 'Write-back', type: 'smoothstep', style: { stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5,5' }, labelStyle: { fontSize: 10, fill: '#10b981' }, labelBgStyle: { fill: '#f0fdf4' } },
  // AI Chat → n8n-ai (tool aanroepen via Vertex AI)
  { id: 'ai-tools',  source: 'crm-ai-chat', target: 'n8n-ai', label: 'Tool aanroepen', type: 'smoothstep', style: { stroke: '#8b5cf6', strokeWidth: 1.5, strokeDasharray: '4,4' }, labelStyle: { fontSize: 10, fill: '#8b5cf6' }, labelBgStyle: { fill: '#faf5ff' } },
];

// ─── Custom Node Types ────────────────────────────────────────────────────────
function UserNode({ data }: NodeProps) {
  return (
    <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-xl px-5 py-3 shadow-lg text-center min-w-[140px]">
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center justify-center gap-2 mb-0.5">
        <User className="h-4 w-4 text-slate-300" />
        <span className="font-bold text-sm">{String(data.label)}</span>
      </div>
      <p className="text-xs text-slate-400">{String(data.sub)}</p>
    </div>
  );
}

function CrmNode({ data }: NodeProps) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Building2, Users, FolderKanban, TrendingUp, FileText, MessageSquare,
    CheckSquare, CalendarDays, BarChart3, Bot, Mail, Bell, Calendar, Brain,
  };
  const Icon = icons[String(data.icon)] || Building2;
  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl px-4 py-3 shadow-lg min-w-[160px] text-center">
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        <Icon className="h-4 w-4 opacity-90" />
        <span className="font-semibold text-sm">{String(data.label)}</span>
      </div>
      <p className="text-xs text-blue-200">{String(data.sub)}</p>
    </div>
  );
}

function BackendNode({ data }: NodeProps) {
  return (
    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-xl px-6 py-3 shadow-lg min-w-[600px] text-center">
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center justify-center gap-2 mb-0.5">
        <Database className="h-4 w-4" />
        <span className="font-bold text-sm">{String(data.label)}</span>
      </div>
      <p className="text-xs text-emerald-300">{String(data.sub)}</p>
    </div>
  );
}

function AutomationNode({ data }: NodeProps) {
  const colorMap: Record<string, string> = {
    amber:  'from-amber-500 to-amber-700',
    sky:    'from-sky-500 to-sky-700',
    violet: 'from-violet-600 to-violet-800',
    slate:  'from-slate-600 to-slate-800',
    purple: 'from-purple-600 to-purple-800',
  };
  const subColorMap: Record<string, string> = {
    amber: 'text-amber-200', sky: 'text-sky-200',
    violet: 'text-violet-200', slate: 'text-slate-300', purple: 'text-purple-300',
  };
  const gradient = colorMap[String(data.color)] ?? colorMap.purple;
  const subColor = subColorMap[String(data.color)] ?? subColorMap.purple;
  return (
    <div className={`bg-gradient-to-br ${gradient} text-white rounded-xl px-5 py-3 shadow-lg min-w-[200px] text-center`}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="flex items-center justify-center gap-2 mb-0.5">
        <Zap className="h-4 w-4" />
        <span className="font-bold text-sm">{String(data.label)}</span>
      </div>
      <p className={`text-xs ${subColor}`}>{String(data.sub)}</p>
    </div>
  );
}

function ExternalNode({ data }: NodeProps) {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-500 to-violet-700', orange: 'from-orange-400 to-orange-600',
    blue: 'from-blue-500 to-blue-700', teal: 'from-teal-500 to-teal-700',
    pink: 'from-pink-500 to-pink-700', green: 'from-green-500 to-green-700',
  };
  const gradient = colorMap[String(data.color)] || 'from-slate-500 to-slate-700';
  return (
    <div className={`bg-gradient-to-br ${gradient} text-white rounded-xl px-4 py-2.5 shadow-lg min-w-[130px] text-center`}>
      <Handle type="target" position={Position.Top} />
      <Globe className="h-3.5 w-3.5 mx-auto mb-0.5" />
      <p className="font-semibold text-xs">{String(data.label)}</p>
      <p className="text-xs opacity-75">{String(data.sub)}</p>
    </div>
  );
}

function WebhookNode({ data }: NodeProps) {
  return (
    <div className="bg-sky-500 text-white rounded-full px-3 py-1.5 shadow text-center">
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <p className="text-xs font-mono font-medium">{String(data.label)}</p>
    </div>
  );
}

function DatamodelNode({ data }: NodeProps) {
  const Icon = data.icon as React.ComponentType<{ className?: string }> | undefined;
  const gradientMap: Record<string, string> = {
    blue:   'from-blue-500 to-blue-700',   indigo: 'from-indigo-500 to-indigo-700',
    violet: 'from-violet-500 to-violet-700', amber: 'from-amber-500 to-amber-700',
    rose:   'from-rose-500 to-rose-700',   sky:    'from-sky-500 to-sky-700',
    slate:  'from-slate-600 to-slate-800', orange: 'from-orange-500 to-orange-700',
  };
  const gradient = gradientMap[String(data.color)] ?? gradientMap.slate;
  return (
    <div className={`bg-gradient-to-br ${gradient} text-white rounded-xl shadow-lg min-w-[190px] overflow-hidden`}>
      <Handle type="target" position={Position.Top} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" position={Position.Right} />
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/20">
        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-90" />}
        <span className="font-bold text-sm">{String(data.label)}</span>
      </div>
      {Array.isArray(data.fields) ? (
        <div className="px-3 py-1.5 space-y-0.5">
          {(data.fields as string[]).map((f, i) => (
            <div key={i} className="text-[10px] font-mono text-white/75 leading-relaxed">{f}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes = { userNode: UserNode, crmNode: CrmNode, backendNode: BackendNode, automationNode: AutomationNode, externalNode: ExternalNode, webhookNode: WebhookNode, datamodelNode: DatamodelNode };

// ─── Edge Descriptions ────────────────────────────────────────────────────────
const EDGE_DESCRIPTIONS: Record<string, string> = {
  // User → CRM
  'u-bed': 'Gebruiker beheert bedrijven direct via het CRM (aanmaken, bewerken, filteren, bulk-acties).',
  'u-con': 'Gebruiker beheert contactpersonen via het CRM, inclusief CSV bulk import.',
  'u-pip': 'Gebruiker beheer de sales pipeline: projecten aanmaken, fases doorlopen, kanban-bord.',
  'u-off': 'Gebruiker maakt offertes aan, stuurt ze op en volgt de status (draft → ondertekend).',
  'u-int': 'Gebruiker logt contactmomenten: notities, calls, emails, vergaderingen en demo\'s.',
  'u-tak': 'Gebruiker maakt taken aan met deadlines en prioriteit, gekoppeld aan klanten en projecten.',
  'u-age': 'Gebruiker beheert de agenda: events aanmaken, vergaderingen plannen en Google sync.',
  'u-ana': 'Gebruiker raadpleegt analytics dashboards: pipeline, omzet en klantactiviteit.',
  'u-ai':  'Gebruiker chat met de AI-assistent die 37+ CRM-acties kan uitvoeren via spraak of tekst.',
  'u-ed':  'Gebruiker beoordeelt en verstuurt AI-gegenereerde email-concepten vanuit n8n automations.',
  'u-not': 'Gebruiker ontvangt realtime meldingen over deadlines, goedkeuringen en CRM-events.',
  // CRM → Supabase
  'bed-sb': 'Bedrijfsgegevens worden opgeslagen in en geladen uit de Supabase PostgreSQL database.',
  'con-sb': 'Contactgegevens worden opgeslagen in en geladen uit de Supabase database.',
  'pip-sb': 'Pipeline-projecten en fase-updates worden gesynchroniseerd met de database.',
  'off-sb': 'Offertes (inclusief PDF-links en handtekeningen) worden opgeslagen in Supabase.',
  'int-sb': 'Alle contactmomenten (8 typen) worden persistent opgeslagen per bedrijf en contactpersoon.',
  'tak-sb': 'Taken worden opgeslagen als interactie-records met type=task, status en deadline.',
  'age-sb': 'Agenda-events worden opgeslagen inclusief Google event-ID voor sync-tracking.',
  'ana-sb': 'Analytics dashboards halen pipeline-, klant- en interactiedata op uit Supabase.',
  'ai-sb':  'AI Chat slaat sessiegeheugen op in Supabase (PostgreSQL Chat Memory) en leest CRM-data.',
  'ed-sb':  'Email-concepten worden aangemaakt en opgeslagen in Supabase via n8n Edge Function.',
  'not-sb': 'Notificaties worden opgeslagen in de notifications-tabel, gelezen via Supabase query.',
  // Supabase → CRM (realtime)
  'sb-ana': 'Supabase Realtime pusht live updates naar de Analytics-dashboards bij CRM-wijzigingen.',
  'sb-not': 'Supabase Realtime pusht nieuwe notificaties direct naar de bell-icon in de navigatie.',
  // Agenda ↔ Google Calendar
  'age-gcal': 'CRM agenda-events worden geëxporteerd naar Google Calendar bij aanmaken of wijzigen.',
  'gcal-age': 'Wijzigingen in Google Calendar worden teruggesynchroniseerd naar het CRM.',
  // Email Drafts → Resend
  'ed-res': 'Goedgekeurde email-concepten worden direct verstuurd via de Resend Edge Function in Supabase.',
  // AI Chat response
  'vtx-ai': 'Vertex AI AI-agent-antwoorden en tool-resultaten worden teruggegeven aan de chatinterface.',
  // CRM → Webhooks
  'bed-wh1': 'Nieuw bedrijf aangemaakt → webhook-trigger naar n8n voor KVK-verrijking en lead enrichment.',
  'pip-wh2': 'Project milestone bereikt (fase-wijziging) → webhook-trigger voor email automations.',
  'age-wh3': 'No-show gemeld via agenda-event → webhook-trigger voor herplanningsmail via n8n.',
  // Webhooks → n8n
  'wh1-n8n': 'Bedrijfsaanmakings-webhook start de "ATC - Nieuwe Lead Enrichment" workflow in n8n.',
  'wh2-n8n': 'Milestone-webhook start de "Email - Project Milestone Update" workflow in n8n.',
  'wh3-n8n': 'No-show-webhook start de "ATC - Meeting No-Show Recovery" workflow in n8n.',
  // Supabase ↔ n8n
  'sb-n8n': 'n8n scheduled workflows lezen dagelijks CRM-data uit Supabase voor analyse en alerts.',
  'n8n-sb': 'n8n schrijft resultaten terug naar Supabase: emailconcepten, health scores en logs.',
  // n8n → External
  'n8n-gem': 'n8n stuurt prompts naar Gemini 2.0 Flash voor het schrijven van emails en tekstanalyse.',
  'n8n-vtx': 'n8n roept Vertex AI aan voor de CRM chatbot (AI-agent met 37+ tools).',
  'n8n-res': 'n8n verstuurt klant- en interne emails via Resend (transactionele e-mail API).',
  'n8n-kvk': 'n8n verrijkt nieuwe bedrijven met KVK-gegevens: naam, adres en SBI-code.',
  // n8n categorie edges
  'wh1-atc':   'Nieuw bedrijf aangemaakt → ATC "Nieuwe Lead Enrichment" workflow: KVK lookup + bedrijf verrijken.',
  'wh2-email': 'Project milestone bereikt → "Email - Project Milestone Update": Gemini schrijft enthousiaste statusupdate → direct via Resend.',
  'wh3-atc':   'No-show gemeld → ATC "Meeting No-Show Recovery": Gemini schrijft herplanningsvoorstel → concept in CRM.',
  'sb-atc':    'Supabase triggert dagelijks de ATC-workflows: health score, lead velocity, pipeline report, overdue taken, win-back campagnes.',
  'sb-email':  'Supabase triggert maandelijkse email-workflows: klanttevredenheid check-in, referral uitnodiging, waarde samenvatting.',
  'sb-infra':  'Supabase triggert dagelijks de RAG Daily Sync: kennisbank updaten met verse CRM-data (768-dim pgvector embeddings).',
  'atc-gem':   'ATC workflows sturen prompts naar Gemini 2.0 Flash voor het schrijven van gepersonaliseerde email-concepten.',
  'atc-res':   'ATC workflows versturen interne alerts rechtstreeks via Resend: taak-overdue, pipeline report, lead velocity waarschuwingen.',
  'atc-kvk':   'ATC "Nieuwe Lead Enrichment" roept KVK API aan om naam, adres, branche en bedrijfsgrootte op te halen.',
  'email-gem': 'Email workflows sturen klant- en projectcontext naar Gemini voor het schrijven van gepersonaliseerde email-content.',
  'email-res': 'Email workflows versturen klantgerichte mails rechtstreeks via Resend: onboarding, milestone updates, check-ins.',
  'ai-vtx':    'n8n AI Chatbot Tools worden aangeroepen via de Vertex AI agent — elke tool is een aparte n8n sub-workflow.',
  'infra-sb':  'n8n schrijft resultaten terug naar Supabase: RAG embeddings, health scores, email-concept records en workflow-logs.',
  'ai-tools':  'Wanneer de gebruiker een actie vraagt aan de AI Chat (bijv. "maak offerte aan"), roept Vertex AI de bijbehorende n8n tool-workflow aan.',
  // Data model edges
  'dm-user-comp': 'Elke gebruiker is eigenaar (owner_id) van de bedrijven die hij/zij aanmaakt.',
  'dm-user-proj': 'Projecten worden toegewezen aan de medewerker die ze aanmaakt (owner_id).',
  'dm-user-int':  'Interacties worden gelogd door een specifieke medewerker (user_id).',
  'dm-user-cal':  'Agenda-events zijn eigendom van de medewerker die ze aanmaakt (user_id).',
  'dm-con-comp':  'Elke contactpersoon is (optioneel) gekoppeld aan één bedrijf via company_id. Bij verwijderen van het bedrijf wordt company_id op NULL gezet.',
  'dm-proj-comp': 'Elk project is verplicht gekoppeld aan een bedrijf (company_id required). Cascade delete als bedrijf verwijderd wordt.',
  'dm-proj-con':  'Een project kan optioneel gekoppeld zijn aan een primaire contactpersoon (contact_id optional).',
  'dm-quote-comp':'Elke offerte is verplicht gekoppeld aan een bedrijf (company_id required).',
  'dm-quote-con': 'Een offerte kan optioneel gericht zijn aan een specifieke contactpersoon (contact_id optional).',
  'dm-quote-proj':'Een offerte kan optioneel gekoppeld zijn aan een project (project_id optional).',
  'dm-qi-quote':  'Offerte-regels zijn altijd onderdeel van een offerte (quote_id). Cascade delete als offerte verwijderd wordt.',
  'dm-int-comp':  'Een interactie/contactmoment is gekoppeld aan een bedrijf (company_id). Zo is alle communicatie per bedrijf zichtbaar.',
  'dm-int-con':   'Een interactie kan ook gekoppeld zijn aan een specifieke contactpersoon (contact_id). Zo zijn contactmomenten per persoon zichtbaar.',
  'dm-int-proj':  'Een interactie kan optioneel gekoppeld zijn aan een project (project_id optional).',
  'dm-cal-comp':  'Een agenda-event kan optioneel gekoppeld zijn aan een bedrijf (company_id optional).',
  'dm-cal-con':   'Een agenda-event kan optioneel gekoppeld zijn aan een contactpersoon (contact_id optional).',
  'dm-cal-proj':  'Een agenda-event kan optioneel gekoppeld zijn aan een project (project_id optional).',
};

interface SelectedEdge { id: string; source: string; target: string; }

// ─── Graph: Data Model Nodes & Edges ──────────────────────────────────────────
const DM_NODES: Node[] = [
  { id: 'dm-user',        type: 'datamodelNode', position: { x: 360, y: 0   }, data: { label: 'Gebruiker / Profiel', icon: User,         color: 'slate',  fields: ['id: uuid', 'email: text', 'role: enum', 'full_name: text'] } },
  { id: 'dm-companies',   type: 'datamodelNode', position: { x: 60,  y: 200 }, data: { label: 'Bedrijven',           icon: Building2,    color: 'blue',   fields: ['id: uuid', 'name: text (req)', 'kvk_number: text', 'status: enum', 'owner_id → profiles'] } },
  { id: 'dm-contacts',    type: 'datamodelNode', position: { x: 500, y: 200 }, data: { label: 'Contacten',           icon: Users,        color: 'indigo', fields: ['id: uuid', 'first_name / last_name', 'email / phone', 'company_id → companies', 'is_primary: bool'] } },
  { id: 'dm-projects',    type: 'datamodelNode', position: { x: 0,   y: 450 }, data: { label: 'Projecten',           icon: FolderKanban, color: 'violet', fields: ['id: uuid', 'title: text', 'stage: enum (10)', 'company_id → companies (req)', 'contact_id → contacts (opt)'] } },
  { id: 'dm-quotes',      type: 'datamodelNode', position: { x: 270, y: 450 }, data: { label: 'Offertes',            icon: FileText,     color: 'amber',  fields: ['id: uuid', 'title: text', 'status: enum', 'company_id → companies (req)', 'contact_id → contacts (opt)', 'project_id → projects (opt)'] } },
  { id: 'dm-interactions',type: 'datamodelNode', position: { x: 560, y: 450 }, data: { label: 'Interacties',         icon: MessageSquare,color: 'rose',   fields: ['id: uuid', 'type: enum', 'company_id → companies', 'contact_id → contacts', 'project_id → projects (opt)', 'user_id → profiles'] } },
  { id: 'dm-calendar',    type: 'datamodelNode', position: { x: 840, y: 450 }, data: { label: 'Agenda Events',       icon: Calendar,     color: 'sky',    fields: ['id: uuid', 'title: text', 'user_id → profiles (req)', 'company_id (opt)', 'contact_id (opt)', 'project_id (opt)'] } },
  { id: 'dm-quote-items', type: 'datamodelNode', position: { x: 270, y: 680 }, data: { label: 'Offerte-regels',      icon: FileText,     color: 'orange', fields: ['id: uuid', 'description: text', 'quantity: num', 'unit_price: decimal', 'quote_id → quotes'] } },
];

const DM_EDGES: Edge[] = [
  // User → entities
  { id: 'dm-user-comp', source: 'dm-user', target: 'dm-companies',   type: 'smoothstep', label: 'owner_id',  style: { stroke: '#64748b', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#64748b' }, labelBgStyle: { fill: '#f8fafc' } },
  { id: 'dm-user-proj', source: 'dm-user', target: 'dm-projects',    type: 'smoothstep', label: 'owner_id',  style: { stroke: '#64748b', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#64748b' }, labelBgStyle: { fill: '#f8fafc' } },
  { id: 'dm-user-int',  source: 'dm-user', target: 'dm-interactions',type: 'smoothstep', label: 'user_id',   style: { stroke: '#64748b', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#64748b' }, labelBgStyle: { fill: '#f8fafc' } },
  { id: 'dm-user-cal',  source: 'dm-user', target: 'dm-calendar',    type: 'smoothstep', label: 'user_id',   style: { stroke: '#64748b', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#64748b' }, labelBgStyle: { fill: '#f8fafc' } },
  // Contacts → Companies
  { id: 'dm-con-comp',  source: 'dm-contacts', target: 'dm-companies', type: 'smoothstep', label: 'company_id',           style: { stroke: '#3b82f6', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#3b82f6' }, labelBgStyle: { fill: '#f8fafc' } },
  // Projects → Companies & Contacts
  { id: 'dm-proj-comp', source: 'dm-projects', target: 'dm-companies', type: 'smoothstep', label: 'company_id (req)',      style: { stroke: '#3b82f6', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#3b82f6' }, labelBgStyle: { fill: '#f8fafc' } },
  { id: 'dm-proj-con',  source: 'dm-projects', target: 'dm-contacts',  type: 'smoothstep', label: 'contact_id (opt)',      style: { stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '5,4' }, labelStyle: { fontSize: 10, fill: '#6366f1' }, labelBgStyle: { fill: '#f8fafc' } },
  // Quotes → Companies, Contacts, Projects
  { id: 'dm-quote-comp',source: 'dm-quotes',   target: 'dm-companies', type: 'smoothstep', label: 'company_id (req)',      style: { stroke: '#3b82f6', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#3b82f6' }, labelBgStyle: { fill: '#f8fafc' } },
  { id: 'dm-quote-con', source: 'dm-quotes',   target: 'dm-contacts',  type: 'smoothstep', label: 'contact_id (opt)',      style: { stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '5,4' }, labelStyle: { fontSize: 10, fill: '#6366f1' }, labelBgStyle: { fill: '#f8fafc' } },
  { id: 'dm-quote-proj',source: 'dm-quotes',   target: 'dm-projects',  type: 'smoothstep', label: 'project_id (opt)',      style: { stroke: '#8b5cf6', strokeWidth: 1.5, strokeDasharray: '5,4' }, labelStyle: { fontSize: 10, fill: '#8b5cf6' }, labelBgStyle: { fill: '#f8fafc' } },
  // Quote items → Quotes
  { id: 'dm-qi-quote',  source: 'dm-quote-items', target: 'dm-quotes', type: 'smoothstep', label: 'quote_id',              style: { stroke: '#f59e0b', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#f59e0b' }, labelBgStyle: { fill: '#f8fafc' } },
  // Interactions → Companies, Contacts, Projects
  { id: 'dm-int-comp',  source: 'dm-interactions', target: 'dm-companies', type: 'smoothstep', label: 'company_id',         style: { stroke: '#3b82f6', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#3b82f6' }, labelBgStyle: { fill: '#f8fafc' } },
  { id: 'dm-int-con',   source: 'dm-interactions', target: 'dm-contacts',  type: 'smoothstep', label: 'contact_id',         style: { stroke: '#6366f1', strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fill: '#6366f1' }, labelBgStyle: { fill: '#f8fafc' } },
  { id: 'dm-int-proj',  source: 'dm-interactions', target: 'dm-projects',  type: 'smoothstep', label: 'project_id (opt)',   style: { stroke: '#8b5cf6', strokeWidth: 1.5, strokeDasharray: '5,4' }, labelStyle: { fontSize: 10, fill: '#8b5cf6' }, labelBgStyle: { fill: '#f8fafc' } },
  // Calendar → Companies, Contacts, Projects
  { id: 'dm-cal-comp',  source: 'dm-calendar', target: 'dm-companies', type: 'smoothstep', label: 'company_id (opt)',       style: { stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '5,4' }, labelStyle: { fontSize: 10, fill: '#3b82f6' }, labelBgStyle: { fill: '#f8fafc' } },
  { id: 'dm-cal-con',   source: 'dm-calendar', target: 'dm-contacts',  type: 'smoothstep', label: 'contact_id (opt)',       style: { stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '5,4' }, labelStyle: { fontSize: 10, fill: '#6366f1' }, labelBgStyle: { fill: '#f8fafc' } },
  { id: 'dm-cal-proj',  source: 'dm-calendar', target: 'dm-projects',  type: 'smoothstep', label: 'project_id (opt)',       style: { stroke: '#8b5cf6', strokeWidth: 1.5, strokeDasharray: '5,4' }, labelStyle: { fontSize: 10, fill: '#8b5cf6' }, labelBgStyle: { fill: '#f8fafc' } },
];

// ─── Inline Detail Panel ──────────────────────────────────────────────────────
function DetailPanel({ selectedNodeId, selectedEdge, onClose, onNavigateToNode, activeEdges }: {
  selectedNodeId: string | null;
  selectedEdge: SelectedEdge | null;
  onClose: () => void;
  onNavigateToNode: (id: string) => void;
  activeEdges: Edge[];
}) {
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return [] as string[];
    const ids: string[] = [];
    activeEdges.forEach(e => {
      if (e.source === selectedNodeId && !ids.includes(e.target)) ids.push(e.target);
      if (e.target === selectedNodeId && !ids.includes(e.source)) ids.push(e.source);
    });
    return ids;
  }, [selectedNodeId, activeEdges]);

  const nodeDetail = selectedNodeId ? NODE_DETAILS[selectedNodeId] : null;

  return (
    <div className="w-[300px] xl:w-[340px] shrink-0 rounded-xl border border-border bg-card overflow-y-auto max-h-[640px]">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {selectedNodeId ? 'Node detail' : 'Verbinding'}
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm leading-none">✕</button>
        </div>

        {nodeDetail && (
          <>
            <h3 className="font-semibold text-sm leading-snug mb-1">{nodeDetail.title}</h3>
            <p className="text-xs text-muted-foreground mb-4">{nodeDetail.description}</p>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Kenmerken</p>
              <ul className="space-y-1.5">
                {nodeDetail.features.map((f, i) => (
                  <li key={i} className="text-xs flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            {connectedNodeIds.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Verbonden met</p>
                <div className="flex flex-wrap gap-1.5">
                  {connectedNodeIds.map(id => (
                    <Badge
                      key={id} variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                      onClick={() => onNavigateToNode(id)}
                    >
                      {NODE_LABELS[id] || id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {nodeDetail.link && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={nodeDetail.link}>
                  <ArrowRight className="h-4 w-4 mr-2" /> Open module
                </Link>
              </Button>
            )}
          </>
        )}

        {selectedEdge && !selectedNodeId && (
          <>
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <Badge variant="secondary" className="text-xs">{NODE_LABELS[selectedEdge.source] || selectedEdge.source}</Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Badge variant="secondary" className="text-xs">{NODE_LABELS[selectedEdge.target] || selectedEdge.target}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {EDGE_DESCRIPTIONS[selectedEdge.id] || `Verbinding van ${NODE_LABELS[selectedEdge.source] || selectedEdge.source} naar ${NODE_LABELS[selectedEdge.target] || selectedEdge.target}.`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onNavigateToNode(selectedEdge.source)}>
                {NODE_LABELS[selectedEdge.source] || selectedEdge.source}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onNavigateToNode(selectedEdge.target)}>
                {NODE_LABELS[selectedEdge.target] || selectedEdge.target}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Architectuurkaart ───────────────────────────────────────────────────
function ArchitectuurTab({ selectedNodeId, onSelectNode }: {
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const [graphView, setGraphView] = useState<'arch' | 'dm'>('arch');
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdge | null>(null);

  const activeNodes = graphView === 'arch' ? BASE_NODES : DM_NODES;
  const activeEdges = graphView === 'arch' ? BASE_EDGES : DM_EDGES;

  const handleClose = () => { onSelectNode(null); setSelectedEdge(null); };
  const handleNavigateToNode = (id: string) => { setSelectedEdge(null); onSelectNode(id); };
  const handleViewChange = (view: 'arch' | 'dm') => {
    setGraphView(view);
    onSelectNode(null);
    setSelectedEdge(null);
  };

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>();
    activeEdges.forEach(e => {
      if (e.source === selectedNodeId) ids.add(e.target);
      if (e.target === selectedNodeId) ids.add(e.source);
    });
    return ids;
  }, [selectedNodeId, activeEdges]);

  const edgeEndpoints = useMemo(() => {
    if (!selectedEdge || selectedNodeId) return new Set<string>();
    return new Set([selectedEdge.source, selectedEdge.target]);
  }, [selectedEdge, selectedNodeId]);

  const connectedEdgeIds = useMemo(() => {
    if (selectedNodeId) {
      const ids = new Set<string>();
      activeEdges.forEach(e => { if (e.source === selectedNodeId || e.target === selectedNodeId) ids.add(e.id); });
      return ids;
    }
    if (selectedEdge) return new Set([selectedEdge.id]);
    return new Set<string>();
  }, [selectedNodeId, selectedEdge, activeEdges]);

  const activeSelection = !!(selectedNodeId || selectedEdge);

  const displayNodes = useMemo(() =>
    activeNodes.map(n => {
      if (!activeSelection) return { ...n, style: { ...n.style, opacity: 1, boxShadow: 'none', transition: 'all 0.2s ease' } };
      const isSel = n.id === selectedNodeId;
      const isConn = connectedNodeIds.has(n.id) || edgeEndpoints.has(n.id);
      return {
        ...n,
        style: {
          ...n.style,
          opacity: isSel || isConn ? 1 : 0.12,
          boxShadow: isSel ? '0 0 0 3px #3b82f6, 0 0 24px rgba(59,130,246,0.35)' : 'none',
          transition: 'all 0.2s ease',
        },
      };
    }), [activeNodes, activeSelection, selectedNodeId, connectedNodeIds, edgeEndpoints]);

  const displayEdges = useMemo(() =>
    activeEdges.map(e => {
      const base = { ...e, style: { ...e.style, cursor: 'pointer' } };
      if (!activeSelection) return base;
      const isConn = connectedEdgeIds.has(e.id);
      return {
        ...base,
        style: { ...base.style, opacity: isConn ? 1 : 0.06, strokeWidth: isConn ? 3 : (e.style?.strokeWidth ?? 1.5), transition: 'all 0.2s ease' },
        animated: isConn ? (e.animated ?? true) : false,
      };
    }), [activeEdges, activeSelection, connectedEdgeIds]);

  const showPanel = !!(selectedNodeId || selectedEdge);

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          <button
            onClick={() => handleViewChange('arch')}
            className={`px-3 py-1.5 font-medium transition-colors ${graphView === 'arch' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
          >
            Systeemarchitectuur
          </button>
          <button
            onClick={() => handleViewChange('dm')}
            className={`px-3 py-1.5 font-medium transition-colors border-l border-border ${graphView === 'dm' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
          >
            Datamodel (ER)
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {graphView === 'arch'
            ? 'Hoe componenten samenhangen op infrastructuurniveau'
            : 'FK-relaties tussen database-entiteiten — klik nodes en lijnen voor details'}
        </span>
      </div>

      {/* Selection status bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground min-h-[24px]">
        {selectedNodeId && (
          <>
            <span>Geselecteerd: <strong className="text-foreground">{NODE_LABELS[selectedNodeId]}</strong></span>
            <button onClick={handleClose} className="ml-auto hover:text-foreground">✕ Deselecteer</button>
          </>
        )}
        {selectedEdge && !selectedNodeId && (
          <>
            <span>Lijn: <strong className="text-foreground">{NODE_LABELS[selectedEdge.source]} → {NODE_LABELS[selectedEdge.target]}</strong></span>
            <button onClick={handleClose} className="ml-auto hover:text-foreground">✕ Deselecteer</button>
          </>
        )}
        {!activeSelection && (
          <span>Klik op een <strong>node</strong> of <strong>lijn</strong> voor details. Klik verbonden nodes om verder te navigeren.</span>
        )}
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <div className="h-[640px] rounded-xl border border-border overflow-hidden">
            <ReactFlow
              nodes={displayNodes}
              edges={displayEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              proOptions={{ hideAttribution: true }}
              onNodeClick={(_, node) => { setSelectedEdge(null); onSelectNode(selectedNodeId === node.id ? null : node.id); }}
              onEdgeClick={(_, edge) => { onSelectNode(null); setSelectedEdge(prev => prev?.id === edge.id ? null : { id: edge.id, source: edge.source, target: edge.target }); }}
              onPaneClick={handleClose}
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
              <Controls />
              <MiniMap zoomable pannable />
            </ReactFlow>
          </div>
        </div>

        {showPanel && (
          <DetailPanel
            selectedNodeId={selectedNodeId}
            selectedEdge={selectedEdge}
            onClose={handleClose}
            onNavigateToNode={handleNavigateToNode}
            activeEdges={activeEdges}
          />
        )}
      </div>
    </div>
  );
}

// ─── Tab: CRM Modules ─────────────────────────────────────────────────────────
const MODULE_COLORS: Record<string, string> = {
  blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30',
  violet: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30',
  emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  amber: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  sky: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30',
  rose: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30',
  orange: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
  teal: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30',
  slate: 'text-slate-600 bg-slate-50 dark:bg-slate-950/30',
};

function CrmModulesTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {CRM_MODULES.map(mod => {
        const Icon = mod.icon;
        const colorClass = MODULE_COLORS[mod.color] || MODULE_COLORS.slate;
        return (
          <Card key={mod.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{mod.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mod.description}</p>
              </div>
            </div>
            <ul className="space-y-1 mb-3">
              {mod.features.map((f, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-green-500 mt-px shrink-0">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to={mod.href}>
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" /> Ga naar {mod.title}
              </Link>
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab: n8n Workflows ───────────────────────────────────────────────────────
const TRIGGER_STYLE: Record<TriggerType, string> = {
  schedule: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  webhook: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  chat: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300',
  'sub-workflow': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
};
const TRIGGER_ICON: Record<TriggerType, React.ReactNode> = {
  schedule: <Clock4 className="h-3 w-3" />,
  webhook: <Webhook className="h-3 w-3" />,
  chat: <MessageSquare className="h-3 w-3" />,
  'sub-workflow': <Zap className="h-3 w-3" />,
};
const CAT_LABELS: Record<WorkflowCategory, string> = { atc: 'ATC', email: 'Email', tools: 'Tools', infra: 'Infra' };

function WorkflowsTab() {
  const [filter, setFilter] = useState<'all' | WorkflowCategory>('all');
  const counts = useMemo(() => ({
    all: WORKFLOWS.length,
    atc: WORKFLOWS.filter(w => w.category === 'atc').length,
    email: WORKFLOWS.filter(w => w.category === 'email').length,
    tools: WORKFLOWS.filter(w => w.category === 'tools').length,
    infra: WORKFLOWS.filter(w => w.category === 'infra').length,
  }), []);
  const filtered = filter === 'all' ? WORKFLOWS : WORKFLOWS.filter(w => w.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['all', 'atc', 'email', 'tools', 'infra'] as const).map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f === 'all' ? `Alle (${counts.all})` : `${CAT_LABELS[f as WorkflowCategory]} (${counts[f as WorkflowCategory]})`}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((wf, i) => (
          <Card key={wf.id || i} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="font-medium text-sm leading-snug flex-1">{wf.name}</p>
              <Badge variant="outline" className={`text-xs shrink-0 px-1.5 py-0.5 flex items-center gap-1 border ${TRIGGER_STYLE[wf.trigger]}`}>
                {TRIGGER_ICON[wf.trigger]} {wf.triggerLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{wf.description}</p>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${wf.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                {wf.status === 'active' ? '● Actief' : '○ Inactief'}
              </span>
              {wf.id && (
                <a href={`${N8N_BASE}/${wf.id}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-mono">
                  {wf.id.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Integraties ─────────────────────────────────────────────────────────
const INT_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-500', violet: 'bg-violet-600', blue: 'bg-blue-600',
  orange: 'bg-orange-500', teal: 'bg-teal-600', pink: 'bg-pink-600',
};

function IntegratiesTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {INTEGRATIONS.map(int => (
        <Card key={int.id} className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`${INT_COLORS[int.color]} rounded-lg p-2.5`}>
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{int.name}</h3>
              <p className="text-xs text-muted-foreground">{int.description}</p>
            </div>
          </div>
          <ul className="space-y-1">
            {int.uses.map((u, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-green-500 mt-px shrink-0">✓</span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  const stats = [
    { label: `${CRM_MODULES.length} modules`, icon: '📦' },
    { label: `${WORKFLOWS.length}+ automations`, icon: '⚡' },
    { label: `${INTEGRATIONS.length} integraties`, icon: '🔗' },
    { label: 'Live', icon: '🟢' },
  ];
  const techs = ['React', 'TypeScript', 'Supabase', 'n8n', 'Gemini AI', 'Resend'];

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 md:p-8 mb-6 text-white shadow-xl">
      {/* Subtle dot-grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-1">
          <Zap className="h-6 w-6 text-yellow-300 shrink-0" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dirq CRM Platform</h1>
        </div>
        <p className="text-blue-100 mb-5 max-w-xl text-sm md:text-base leading-relaxed">
          Full-stack CRM & automation hub voor groeiende bureaus — van lead tot klant, inclusief AI-agents en realtime automations.
        </p>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {stats.map(stat => (
            <div
              key={stat.label}
              className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-medium border border-white/20"
            >
              <span>{stat.icon}</span>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Tech badges */}
        <div className="flex flex-wrap gap-1.5">
          {techs.map(tech => (
            <span
              key={tech}
              className="text-xs bg-white/10 border border-white/20 rounded-md px-2.5 py-1 font-mono tracking-wide hover:bg-white/20 transition-colors"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AppOverviewPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <AppLayout
      title="App Overzicht"
      subtitle="Interactieve systeemkaart — architectuur, modules, automations en integraties"
      hideQuickAction
    >
      <HeroSection />
      <Tabs defaultValue="architectuur" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="architectuur">Architectuurkaart</TabsTrigger>
          <TabsTrigger value="modules">CRM Modules ({CRM_MODULES.length})</TabsTrigger>
          <TabsTrigger value="workflows">n8n Workflows ({WORKFLOWS.length})</TabsTrigger>
          <TabsTrigger value="integraties">Integraties ({INTEGRATIONS.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="architectuur">
          <ArchitectuurTab selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
        </TabsContent>
        <TabsContent value="modules">
          <CrmModulesTab />
        </TabsContent>
        <TabsContent value="workflows">
          <WorkflowsTab />
        </TabsContent>
        <TabsContent value="integraties">
          <IntegratiesTab />
        </TabsContent>
      </Tabs>

    </AppLayout>
  );
}
