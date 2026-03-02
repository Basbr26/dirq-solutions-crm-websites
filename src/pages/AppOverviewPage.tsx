import '@xyflow/react/dist/style.css';
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
  Building2,
  Users,
  FolderKanban,
  FileText,
  MessageSquare,
  Database,
  Zap,
  Brain,
  Calendar,
  Mail,
  Globe,
  User,
  BarChart3,
  TrendingUp,
  Map,
  Shield,
  Webhook,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ─── Custom Node Components ────────────────────────────────────────────────

function UserNode({ data }: NodeProps) {
  return (
    <div className="flex flex-col items-center gap-2 bg-white border-2 border-slate-300 rounded-2xl px-6 py-4 shadow-sm min-w-[140px]">
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
      <div className="p-3 bg-slate-100 rounded-full">
        <User className="h-6 w-6 text-slate-600" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-700 text-sm">{String(data.label)}</p>
        <p className="text-xs text-slate-500 mt-0.5">{String(data.sub || '')}</p>
      </div>
    </div>
  );
}

function CrmNode({ data }: NodeProps) {
  const Icon = data.icon as React.ElementType;
  return (
    <div className="flex flex-col items-center gap-2 bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-3 shadow-sm min-w-[160px]">
      <Handle type="target" position={Position.Top} className="!bg-blue-400" />
      <div className="flex items-center gap-2">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-blue-800 text-sm leading-tight">{String(data.label)}</p>
          <p className="text-xs text-blue-500">{String(data.sub || '')}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400" />
      <Handle type="source" id="webhook" position={Position.Right} className="!bg-blue-300" />
    </div>
  );
}

function BackendNode({ data }: NodeProps) {
  const features = data.features as string[];
  return (
    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl px-5 py-4 shadow-sm min-w-[580px]">
      <Handle type="target" position={Position.Top} className="!bg-emerald-400" />
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Database className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-emerald-800 text-base">{String(data.label)}</p>
          <p className="text-xs text-emerald-600">{String(data.sub || '')}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {features.map((f: string) => (
          <Badge key={f} variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
            {f}
          </Badge>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400" />
      <Handle type="source" id="realtime" position={Position.Top} className="!bg-emerald-300 opacity-0" />
    </div>
  );
}

function AutomationNode({ data }: NodeProps) {
  const sprints = data.sprints as { name: string; count: number; color: string }[];
  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl px-5 py-4 shadow-sm min-w-[480px]">
      <Handle type="target" position={Position.Top} className="!bg-purple-400" />
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Zap className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-purple-800 text-base">{String(data.label)}</p>
            <Badge className="bg-purple-600 text-white text-xs">{String(data.count)} workflows</Badge>
          </div>
          <p className="text-xs text-purple-500">{String(data.sub || '')}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sprints.map((s) => (
          <div key={s.name} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-purple-100">
            <p className="text-xs font-medium text-purple-700">{s.name}</p>
            <Badge variant="outline" className="text-xs border-purple-200 text-purple-600">{s.count}x</Badge>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-400" />
      <Handle type="target" id="webhook" position={Position.Left} className="!bg-purple-300" />
    </div>
  );
}

function ExternalNode({ data }: NodeProps) {
  const Icon = data.icon as React.ElementType;
  const isAI = data.isAI as boolean;
  return (
    <div className={`flex flex-col items-center gap-2 rounded-xl px-4 py-3 shadow-sm min-w-[140px] border-2 ${
      isAI
        ? 'bg-violet-50 border-violet-200'
        : 'bg-orange-50 border-orange-200'
    }`}>
      <Handle type="target" position={Position.Top} className={isAI ? '!bg-violet-400' : '!bg-orange-400'} />
      <div className={`p-2 rounded-lg ${isAI ? 'bg-violet-100' : 'bg-orange-100'}`}>
        <Icon className={`h-4 w-4 ${isAI ? 'text-violet-600' : 'text-orange-600'}`} />
      </div>
      <div className="text-center">
        <p className={`font-semibold text-sm ${isAI ? 'text-violet-800' : 'text-orange-800'}`}>{String(data.label)}</p>
        <p className={`text-xs mt-0.5 ${isAI ? 'text-violet-500' : 'text-orange-500'}`}>{String(data.sub || '')}</p>
      </div>
    </div>
  );
}

function WebhookNode({ data }: NodeProps) {
  return (
    <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 rounded-full px-3 py-1 shadow-sm">
      <Handle type="target" position={Position.Left} className="!bg-sky-300" />
      <Webhook className="h-3 w-3 text-sky-500" />
      <p className="text-xs font-medium text-sky-700">{String(data.label)}</p>
      <Handle type="source" position={Position.Right} className="!bg-sky-300" />
    </div>
  );
}

// ─── Node Types Registry ───────────────────────────────────────────────────

const nodeTypes = {
  userNode: UserNode,
  crmNode: CrmNode,
  backendNode: BackendNode,
  automationNode: AutomationNode,
  externalNode: ExternalNode,
  webhookNode: WebhookNode,
};

// ─── Nodes ─────────────────────────────────────────────────────────────────

const nodes: Node[] = [
  // Layer 0: Gebruiker
  {
    id: 'user',
    type: 'userNode',
    position: { x: 530, y: 0 },
    data: { label: 'Jij', sub: 'Dirq Solutions' },
  },

  // Layer 1: CRM Modules
  {
    id: 'crm-relaties',
    type: 'crmNode',
    position: { x: 30, y: 160 },
    data: { label: 'Relatiebeheer', sub: 'Bedrijven & Contacten', icon: Building2 },
  },
  {
    id: 'crm-pipeline',
    type: 'crmNode',
    position: { x: 225, y: 160 },
    data: { label: 'Pipeline', sub: 'Projecten & Deals', icon: TrendingUp },
  },
  {
    id: 'crm-offertes',
    type: 'crmNode',
    position: { x: 430, y: 160 },
    data: { label: 'Offertes', sub: 'PDF + E-Sign', icon: FileText },
  },
  {
    id: 'crm-activiteiten',
    type: 'crmNode',
    position: { x: 640, y: 160 },
    data: { label: 'Activiteiten', sub: 'Agenda & Meetings', icon: MessageSquare },
  },
  {
    id: 'crm-analytics',
    type: 'crmNode',
    position: { x: 850, y: 160 },
    data: { label: 'Analytics & AI', sub: 'Dashboards + Chatbot', icon: Brain },
  },

  // Layer 2: Backend
  {
    id: 'supabase',
    type: 'backendNode',
    position: { x: 160, y: 350 },
    data: {
      label: 'Supabase',
      sub: 'PostgreSQL · Auth · Realtime · Storage · RLS · Edge Functions',
      features: ['PostgreSQL 15', 'Auth (JWT)', 'Realtime', 'Storage', 'RLS Policies', 'Edge Functions', 'pgvector', 'Migraties'],
    },
  },

  // Layer 3: Automation
  {
    id: 'n8n',
    type: 'automationNode',
    position: { x: 210, y: 570 },
    data: {
      label: 'n8n Automatisering',
      sub: 'Cloud · Gemini AI · Resend · Supabase REST',
      count: 62,
      sprints: [
        { name: 'Sprint 1 — Omzetbescherming', count: 3 },
        { name: 'Sprint 2 — Klantbehoud', count: 3 },
        { name: 'Sprint 3 — Groei', count: 5 },
        { name: 'Sprint 4 — Lifecycle', count: 7 },
      ],
    },
  },

  // Webhook bridge nodes (small, pill-shaped)
  {
    id: 'wh-company',
    type: 'webhookNode',
    position: { x: 50, y: 465 },
    data: { label: '/company-created' },
  },
  {
    id: 'wh-milestone',
    type: 'webhookNode',
    position: { x: 240, y: 465 },
    data: { label: '/milestone-reached' },
  },
  {
    id: 'wh-noshow',
    type: 'webhookNode',
    position: { x: 700, y: 465 },
    data: { label: '/meeting-missed' },
  },

  // Layer 4: External & AI
  {
    id: 'ext-gemini',
    type: 'externalNode',
    position: { x: 60, y: 790 },
    data: { label: 'Gemini AI', sub: '2.0 Flash + RAG', icon: Brain, isAI: true },
  },
  {
    id: 'ext-vertexai',
    type: 'externalNode',
    position: { x: 240, y: 790 },
    data: { label: 'Vertex AI', sub: 'Chatbot (37 tools)', icon: Zap, isAI: true },
  },
  {
    id: 'ext-resend',
    type: 'externalNode',
    position: { x: 420, y: 790 },
    data: { label: 'Resend', sub: 'Transactionele email', icon: Mail, isAI: false },
  },
  {
    id: 'ext-gcal',
    type: 'externalNode',
    position: { x: 600, y: 790 },
    data: { label: 'Google Calendar', sub: 'Bi-directioneel sync', icon: Calendar, isAI: false },
  },
  {
    id: 'ext-kvk',
    type: 'externalNode',
    position: { x: 780, y: 790 },
    data: { label: 'KVK API', sub: 'Bedrijfsenrichment', icon: Globe, isAI: false },
  },
  {
    id: 'ext-apollo',
    type: 'externalNode',
    position: { x: 960, y: 790 },
    data: { label: 'Apollo.io', sub: 'Lead verrijking', icon: Users, isAI: false },
  },
];

// ─── Edges ─────────────────────────────────────────────────────────────────

const edges: Edge[] = [
  // User → CRM modules
  { id: 'u-rel', source: 'user', target: 'crm-relaties', animated: true, style: { stroke: '#93c5fd', strokeWidth: 2 } },
  { id: 'u-pip', source: 'user', target: 'crm-pipeline', animated: true, style: { stroke: '#93c5fd', strokeWidth: 2 } },
  { id: 'u-off', source: 'user', target: 'crm-offertes', animated: true, style: { stroke: '#93c5fd', strokeWidth: 2 } },
  { id: 'u-act', source: 'user', target: 'crm-activiteiten', animated: true, style: { stroke: '#93c5fd', strokeWidth: 2 } },
  { id: 'u-ana', source: 'user', target: 'crm-analytics', animated: true, style: { stroke: '#93c5fd', strokeWidth: 2 } },

  // CRM → Supabase
  { id: 'rel-db', source: 'crm-relaties', target: 'supabase', style: { stroke: '#6ee7b7', strokeWidth: 2 } },
  { id: 'pip-db', source: 'crm-pipeline', target: 'supabase', style: { stroke: '#6ee7b7', strokeWidth: 2 } },
  { id: 'off-db', source: 'crm-offertes', target: 'supabase', style: { stroke: '#6ee7b7', strokeWidth: 2 } },
  { id: 'act-db', source: 'crm-activiteiten', target: 'supabase', style: { stroke: '#6ee7b7', strokeWidth: 2 } },
  { id: 'ana-db', source: 'crm-analytics', target: 'supabase', style: { stroke: '#6ee7b7', strokeWidth: 2 } },

  // Supabase → Realtime → CRM (dashed back)
  { id: 'db-rel-rt', source: 'supabase', target: 'crm-relaties', style: { stroke: '#6ee7b7', strokeWidth: 1, strokeDasharray: '5,5' }, label: 'Realtime', labelStyle: { fontSize: 9, fill: '#059669' }, animated: false },

  // Webhooks: CRM → webhook pill → n8n
  { id: 'rel-wh', source: 'crm-relaties', sourceHandle: 'webhook', target: 'wh-company', style: { stroke: '#7dd3fc', strokeWidth: 1.5, strokeDasharray: '4,4' } },
  { id: 'pip-wh', source: 'crm-pipeline', sourceHandle: 'webhook', target: 'wh-milestone', style: { stroke: '#7dd3fc', strokeWidth: 1.5, strokeDasharray: '4,4' } },
  { id: 'act-wh', source: 'crm-activiteiten', sourceHandle: 'webhook', target: 'wh-noshow', style: { stroke: '#7dd3fc', strokeWidth: 1.5, strokeDasharray: '4,4' } },
  { id: 'wh-co-n8n', source: 'wh-company', target: 'n8n', targetHandle: 'webhook', style: { stroke: '#7dd3fc', strokeWidth: 1.5, strokeDasharray: '4,4' } },
  { id: 'wh-mi-n8n', source: 'wh-milestone', target: 'n8n', targetHandle: 'webhook', style: { stroke: '#7dd3fc', strokeWidth: 1.5, strokeDasharray: '4,4' } },
  { id: 'wh-ns-n8n', source: 'wh-noshow', target: 'n8n', targetHandle: 'webhook', style: { stroke: '#7dd3fc', strokeWidth: 1.5, strokeDasharray: '4,4' } },

  // Supabase → n8n (triggers via schedule)
  { id: 'db-n8n', source: 'supabase', target: 'n8n', animated: true, style: { stroke: '#c084fc', strokeWidth: 2 }, label: 'Data', labelStyle: { fontSize: 10, fill: '#7c3aed' } },

  // n8n → Supabase (schrijft terug)
  { id: 'n8n-db', source: 'n8n', target: 'supabase', style: { stroke: '#6ee7b7', strokeWidth: 1.5, strokeDasharray: '5,5' }, label: 'Schrijft terug', labelStyle: { fontSize: 9, fill: '#059669' } },

  // n8n → External services
  { id: 'n8n-gem', source: 'n8n', target: 'ext-gemini', animated: true, style: { stroke: '#c4b5fd', strokeWidth: 2 } },
  { id: 'n8n-ver', source: 'n8n', target: 'ext-vertexai', animated: true, style: { stroke: '#c4b5fd', strokeWidth: 2 } },
  { id: 'n8n-res', source: 'n8n', target: 'ext-resend', animated: true, style: { stroke: '#fdba74', strokeWidth: 2 } },
  { id: 'n8n-kvk', source: 'n8n', target: 'ext-kvk', animated: true, style: { stroke: '#fdba74', strokeWidth: 2 } },

  // CRM ↔ Google Calendar (bi-directioneel sync)
  { id: 'cal-gcal', source: 'crm-activiteiten', target: 'ext-gcal', animated: true, style: { stroke: '#fdba74', strokeWidth: 2 }, label: 'OAuth sync', labelStyle: { fontSize: 9, fill: '#d97706' } },
];

// ─── Page ──────────────────────────────────────────────────────────────────

const layerLegend = [
  { color: 'bg-slate-200 border-slate-300', label: 'Gebruiker' },
  { color: 'bg-blue-100 border-blue-200', label: 'CRM Modules' },
  { color: 'bg-emerald-100 border-emerald-200', label: 'Backend (Supabase)' },
  { color: 'bg-purple-100 border-purple-200', label: 'Automatisering (n8n)' },
  { color: 'bg-violet-100 border-violet-200', label: 'AI' },
  { color: 'bg-orange-100 border-orange-200', label: 'Externe diensten' },
];

export default function AppOverviewPage() {
  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Map className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">App Overzicht</h1>
            <p className="text-xs text-muted-foreground">Hoe alle onderdelen samenhangen · v3.4.0 · 62 n8n workflows</p>
          </div>
        </div>
        {/* Legend */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {layerLegend.map((l) => (
            <div key={l.label} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium ${l.color}`}>
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          proOptions={{ hideAttribution: true }}
          colorMode="light"
          minZoom={0.3}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            position="bottom-left"
            zoomable
            pannable
            nodeColor={(node) => {
              if (node.type === 'userNode') return '#94a3b8';
              if (node.type === 'crmNode') return '#93c5fd';
              if (node.type === 'backendNode') return '#6ee7b7';
              if (node.type === 'automationNode') return '#c084fc';
              if (node.type === 'externalNode') return (node.data?.isAI ? '#c4b5fd' : '#fdba74');
              return '#e2e8f0';
            }}
            maskColor="rgba(248,250,252,0.7)"
            style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
