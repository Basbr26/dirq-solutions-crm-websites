# Projects Module

CRM module voor sales pipeline management met kanban board, stage tracking, en lead-to-customer conversion.

## 📁 Structure

```
projects/
├── components/
│   ├── ProjectCard.tsx          # Card component voor projectweergave
│   ├── ProjectForm.tsx          # Formulier voor create/edit
│   ├── PipelineBoard.tsx        # Kanban board voor pipeline
│   └── ProjectStageSelect.tsx   # Stage selector dropdown
├── hooks/
│   ├── useProjects.ts           # Query hook met advanced filtering
│   ├── useProjectMutations.ts   # CRUD mutations
│   └── useConvertLead.ts        # Lead-to-customer conversion
├── utils/
│   └── generateQuoteFromProject.ts  # Quote generation
├── ProjectsPage.tsx             # Lijst view met filters
├── ProjectDetailPage.tsx        # Detail view met quotes/docs
├── PipelinePage.tsx             # Kanban board view
└── README.md
```

## 🎯 Features

- ✅ **Pipeline Management**: 9-stage sales pipeline (lead → live)
- ✅ **Kanban Board**: Drag-and-drop stage management
- ✅ **Advanced Filtering**: Multi-dimensional filters (stage, value, dates, probability)
- ✅ **Lead Conversion**: One-click convert lead to customer with confetti 🎉
- ✅ **Quote Generation**: Auto-generate quotes from projects
- ✅ **Value Tracking**: Project value met probability calculation
- ✅ **CSV Export**: Export pipeline data
- ✅ **Statistics**: Pipeline stats (conversion rates, win rates)
- ✅ **Notifications**: Deal won notifications met celebratie

## 🔧 Hooks

### useProjects(filters?)

Fetches projects met advanced multi-dimensional filtering.

**Parameters:**
```typescript
interface AdvancedProjectFilters {
  // Basic filters (backward compatible)
  stage?: ProjectStage;
  project_type?: ProjectType;
  owner_id?: string;
  company_id?: string;
  search?: string;
  
  // Advanced filters
  stages?: ProjectStage[];              // Multiple stages
  value_min?: number;                   // Min deal value
  value_max?: number;                   // Max deal value
  created_after?: string;               // Date range
  created_before?: string;
  expected_close_after?: string;
  expected_close_before?: string;
  probability_min?: number;             // 0-100
  probability_max?: number;
  project_types?: ProjectType[];        // Multiple types
  owner_ids?: string[];                 // Multiple owners
}
```

**Returns:**
- `projects` - Array van Project objecten
- `totalCount` - Totaal aantal results
- `isLoading` - Loading state
- `pagination` - Pagination controls

**Example:**
```tsx
// High-value deals in negotiation
const { projects } = useProjects({
  stages: ['negotiation', 'quote_sent'],
  value_min: 10000,
  probability_min: 60
});

// All projects for specific company
const { projects } = useProjects({
  company_id: 'company-123'
});
```

### useProjectMutations

**useCreateProject()**
Creates nieuw project met auto stage assignment.

**useUpdateProject(id)**
Updates project fields.

**useUpdateProjectStage(id)**
Updates stage met automatic probability mapping:
- `lead`: 10%
- `quote_requested`: 20%
- `quote_sent`: 40%
- `negotiation`: 60%
- `quote_signed`: 90%
- `in_development`: 95%
- `live`: 100%
- `lost`: 0%

**useDeleteProject(id)**
Soft delete project.

**Example:**
```tsx
const createProject = useCreateProject();
const updateStage = useUpdateProjectStage('project-123');

// Create
createProject.mutate({
  title: 'Website Redesign',
  company_id: 'company-123',
  value: 15000,
  project_type: 'corporate_website'
});

// Move to quote_sent (probability → 40%)
updateStage.mutate('quote_sent');
```

### useConvertLead()

**🎉 CRITICAL HOOK: Lead-to-Customer Conversion**

Dit is het happy-path endpoint van de sales funnel.

**Business Logic:**
1. Company status: `prospect` → `active`
2. Project stage: → `quote_signed`
3. Project probability: → 90%
4. Notification: `deal_won` to owner
5. UI: 3-second confetti celebration

**Parameters:**
```typescript
interface ConvertLeadParams {
  projectId: string;
  companyId: string;
  projectTitle: string;
  companyName: string;
  ownerId: string;
  projectValue: number;
}
```

**Example:**
```tsx
const convertLead = useConvertLead();

// Triggered when quote signed
convertLead.mutate({
  projectId: project.id,
  companyId: project.company_id,
  projectTitle: project.title,
  companyName: project.companies.name,
  ownerId: project.owner_id,
  projectValue: project.value
}, {
  onSuccess: () => {
    // Confetti automatically triggered
    // Toast: "🎉 Lead succesvol omgezet naar klant!"
    navigate(`/companies/${project.company_id}`);
  }
});
```

**AI Webhook Trigger:**
```typescript
// Via Supabase RPC
await supabase.rpc('convert_lead_to_customer', {
  p_project_id: 'uuid-here',
  p_company_id: 'uuid-here'
});
```

## 📊 Types

```typescript
type ProjectStage =
  | 'lead'              // Initial lead (10%)
  | 'quote_requested'   // Client requested quote (20%)
  | 'quote_sent'        // Quote delivered (40%)
  | 'negotiation'       // In negotiation (60%)
  | 'quote_signed'      // Won! (90%)
  | 'in_development'    // Development phase (95%)
  | 'review'            // Client review (98%)
  | 'live'              // Live in production (100%)
  | 'maintenance'       // Ongoing support (100%)
  | 'lost';             // Deal lost (0%)

type ProjectType =
  | 'landing_page'
  | 'portfolio'
  | 'ecommerce'
  | 'blog'
  | 'corporate_website'
  | 'web_app'
  | 'ai_automation'
  | 'custom';

interface Project {
  id: string;
  company_id: string;
  contact_id?: string;
  title: string;
  description?: string;
  stage: ProjectStage;
  project_type: ProjectType;
  value: number;                    // Deal value in EUR
  probability: number;              // 0-100, auto-set per stage
  expected_close_date?: string;
  hosting_included: boolean;
  maintenance_contract: boolean;
  package_id?: string;              // Finance package
  owner_id: string;
  created_at: string;
  updated_at: string;
}
```

## 🎨 Components

### PipelineBoard

Kanban board voor visuele pipeline management.

**Features:**
- Drag-and-drop stage changes
- Real-time updates
- Column totals (count + value)
- Probability indicators
- Quick actions per card

**Example:**
```tsx
<PipelineBoard
  projects={projects}
  onStageChange={(projectId, newStage) => {
    updateStage.mutate(newStage);
  }}
/>
```

### ProjectCard

Compact project card voor lijst/kanban views.

**Features:**
- Company name met link
- Value formatting (€15.000)
- Stage badge met color
- Probability bar
- Expected close date
- Quick actions

### ProjectForm

Project creation/edit formulier.

**Features:**
- Company dropdown
- Contact selection (filtered by company)
- Project type selector
- Value input met formatting
- Date pickers
- Package selection (finance packages)
- Hosting/maintenance toggles

## 🎯 Business Logic

### Sales Pipeline Stages

```
┌─────────┐  ┌───────────────┐  ┌────────────┐  ┌─────────────┐
│  Lead   │→→│ Quote Requested│→→│ Quote Sent │→→│ Negotiation │
│  (10%)  │  │     (20%)     │  │   (40%)    │  │    (60%)    │
└─────────┘  └───────────────┘  └────────────┘  └─────────────┘
                                                         ↓
                    ┌──────────────┐                   ↓
                    │   LOST (0%)  │←←←←←←←←←←←←←←←←←←←←
                    └──────────────┘
                                                         ↓
┌─────────────┐  ┌────────────────┐  ┌────────┐  ┌────────────┐
│Quote Signed │→→│ In Development │→→│ Review │→→│    Live    │
│   (90%)     │  │     (95%)      │  │ (98%)  │  │   (100%)   │
└─────────────┘  └────────────────┘  └────────┘  └────────────┘
       ↓
       ↓ ⚡ CONVERT TO CUSTOMER (useConvertLead)
       ↓
┌──────────────┐
│ Maintenance  │
│   (100%)     │
└──────────────┘
```

### Probability Calculation

Probability wordt automatisch gezet per stage:
- **Manual override**: Users kunnen probability aanpassen
- **Stage change**: Probability updates automatisch
- **Weighted value**: `value * (probability / 100)` voor forecasting

### Deal Won Celebration

Bij lead conversion:
1. ✅ Company → `active` status
2. ✅ Project → `quote_signed` stage
3. ✅ Notification → deal_won type
4. 🎉 Confetti animation (3 seconden)
5. 📢 Toast: "🎉 Lead succesvol omgezet naar klant!"

## 📝 Usage Examples

### Pipeline Dashboard

```tsx
import { usePipelineStats } from '@/features/projects/hooks/useProjects';

function PipelineDashboard() {
  const { data: stats } = usePipelineStats();

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        title="Total Pipeline Value"
        value={formatCurrency(stats.totalValue)}
      />
      <StatCard
        title="Weighted Value"
        value={formatCurrency(stats.weightedValue)}
      />
      <StatCard
        title="Win Rate"
        value={`${stats.winRate}%`}
      />
      <StatCard
        title="Avg Deal Size"
        value={formatCurrency(stats.avgDealSize)}
      />
    </div>
  );
}
```

### High-Value Deals Filter

```tsx
const { projects } = useProjects({
  stages: ['negotiation', 'quote_sent'],
  value_min: 10000,
  probability_min: 50,
  expected_close_before: endOfMonth
});

// Focus op belangrijke deals die binnenkort sluiten
```

### Quote Generation

```tsx
import { generateQuoteFromProject } from '@/features/projects/utils/generateQuoteFromProject';

const quote = await generateQuoteFromProject({
  project,
  company,
  contact,
  quoteNumber: 'Q-2026-001'
});

// Auto-generated quote based on project specs
```

## 🚀 Best Practices

1. **Set realistic probabilities** - Gebruik stage probabilities als guide
2. **Update expected close dates** - Keep forecasting accurate
3. **Convert at quote_signed** - Trigger lead conversion immediately
4. **Track maintenance** - Move to maintenance stage post-launch
5. **Lost = lessons** - Document why deals were lost

## 🐛 Troubleshooting

**Projects niet in pipeline:**
- Check stage filter
- Verify user has access to company
- Check RLS policies

**Conversion fails:**
- Verify project is in 'negotiation' or 'quote_sent' stage
- Check user has permission to update company
- Review database constraints

**Probability niet updating:**
- useUpdateProjectStage required (not useUpdateProject)
- Check stage is valid ProjectStage type

## 📚 Related Modules

- [Companies](../companies/README.md) - Parent companies
- [Contacts](../contacts/README.md) - Project contacts
- [Quotes](../quotes/README.md) - Generated quotes
- [Interactions](../interactions/README.md) - Sales activities

## 🎓 Sales Process Flow

```
1. Lead Capture → Create project (stage: 'lead')
2. Initial Contact → Log interaction
3. Quote Request → Update stage: 'quote_requested'
4. Send Quote → Create quote + stage: 'quote_sent'
5. Follow-up → Log interactions
6. Negotiation → Update stage: 'negotiation'
7. Quote Signed → useConvertLead() 🎉
8. Development → Update stage: 'in_development'
9. Launch → Update stage: 'live'
10. Support → Update stage: 'maintenance'
```
