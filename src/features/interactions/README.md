# Interactions Module

CRM module voor communicatie tracking, task management, en activity timeline.

## 📁 Structure

```
interactions/
├── components/
│   ├── InteractionCard.tsx           # Card voor timeline
│   ├── InteractionForm.tsx           # Create/edit formulier
│   ├── InteractionTypeSelect.tsx     # Type dropdown
│   ├── TaskCheckbox.tsx              # Task completion toggle
│   ├── InteractionTimeline.tsx       # Chronological view
│   └── QuickAddInteraction.tsx       # Snelle notitie
├── hooks/
│   ├── useInteractions.ts            # Query hook met RBAC
│   ├── useInteractionMutations.ts    # CRUD mutations
│   └── useInteractionStats.ts        # Activity statistics
├── utils/
│   └── formatInteractionDate.ts      # Date/time formatting
├── InteractionsPage.tsx              # Lijst view
└── README.md
```

## 🎯 Features

- ✅ **Multi-Type Tracking**: Calls, emails, meetings, notes, tasks
- ✅ **Task Management**: To-do's met due dates en completion tracking
- ✅ **Timeline View**: Chronological activity feed per company/contact
- ✅ **Quick Add**: Snelle notitie tijdens gesprek
- ✅ **Email Integration**: Log emails met body content
- ✅ **Meeting Notes**: Uitgebreide meeting notes met attendees
- ✅ **RBAC Filtering**: SALES zien eigen, ADMIN/MANAGER zien alles
- ✅ **Task Reminders**: Overdue task highlights
- ✅ **Activity Stats**: Interaction counts per type/user
- ✅ **Search**: Full-text search in descriptions

## 🔧 Hooks

### useInteractions(filters?)

Fetches interactions met automatic RBAC filtering.

**CRITICAL: Role-Based Access Control**
- **SALES role**: Only see their own interactions (`owner_id = auth.uid()`)
- **MANAGER/ADMIN**: See all interactions

**Parameters:**
```typescript
interface InteractionFilters {
  company_id?: string;
  contact_id?: string;
  project_id?: string;
  type?: InteractionType;
  types?: InteractionType[];
  is_task?: boolean;
  task_status?: 'pending' | 'completed';
  due_after?: string;
  due_before?: string;
  created_after?: string;
  created_before?: string;
  search?: string;              // Search in description
  owner_id?: string;            // Specific user (MANAGER+ only)
}
```

**Returns:**
- `interactions` - Array van Interaction objecten (auto-filtered by role)
- `totalCount` - Totaal aantal
- `isLoading` - Loading state
- `pagination` - Pagination controls

**Example:**
```tsx
// All interactions for company (respects RBAC)
const { interactions } = useInteractions({
  company_id: 'company-123'
});

// Overdue tasks only
const { interactions: overdueTasks } = useInteractions({
  is_task: true,
  task_status: 'pending',
  due_before: new Date().toISOString()
});

// MANAGER viewing specific user's activities
const { interactions } = useInteractions({
  owner_id: 'user-123',  // Only works for MANAGER/ADMIN
  types: ['call', 'meeting']
});
```

### useInteractionMutations

**useCreateInteraction()**
Creates nieuwe interaction of task.

**useUpdateInteraction(id)**
Updates interaction (only owner or ADMIN).

**useCompleteTask(id)**
Marks task as completed.

**useDeleteInteraction(id)**
Soft delete interaction.

**Example:**
```tsx
const createInteraction = useCreateInteraction();
const completeTask = useCompleteTask('task-123');

// Log phone call
createInteraction.mutate({
  company_id: 'company-123',
  contact_id: 'contact-123',
  type: 'call',
  description: 'Discussed project timeline',
  duration_minutes: 30
});

// Create task with due date
createInteraction.mutate({
  company_id: 'company-123',
  type: 'note',
  is_task: true,
  description: 'Send follow-up proposal',
  due_date: addDays(new Date(), 3)
});

// Complete task
completeTask.mutate({
  completed_at: new Date()
});
```

### useInteractionStats(filters?)

Get activity statistics.

**Returns:**
```typescript
{
  totalInteractions: number;
  byType: {
    call: number;
    email: number;
    meeting: number;
    note: number;
  };
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  lastActivity: Date;
}
```

**Example:**
```tsx
const { data: stats } = useInteractionStats({
  created_after: startOfMonth(new Date())
});

// Show in dashboard
<ActivityStatsWidget stats={stats} />
```

## 📊 Types

```typescript
type InteractionType =
  | 'call'      // Phone call
  | 'email'     // Email communication
  | 'meeting'   // In-person or video meeting
  | 'note';     // General note/memo

interface Interaction {
  id: string;
  company_id: string;
  contact_id?: string;
  project_id?: string;
  type: InteractionType;
  description: string;           // Main content
  
  // Task fields
  is_task: boolean;
  task_status?: 'pending' | 'completed';
  due_date?: string;
  completed_at?: string;
  
  // Communication details
  duration_minutes?: number;     // For calls/meetings
  email_subject?: string;        // For emails
  email_body?: string;           // For emails
  
  // Metadata
  owner_id: string;              // Creator/responsible
  created_at: string;
  updated_at: string;
}
```

## 🎨 Components

### InteractionTimeline

Chronological activity feed.

**Features:**
- Grouped by date (Vandaag, Gisteren, Deze week, etc.)
- Type icons (📞 call, ✉️ email, 🤝 meeting, 📝 note)
- Task checkboxes
- Overdue task highlighting (red)
- Duration indicators
- Quick actions (edit, delete)

**Example:**
```tsx
<InteractionTimeline
  companyId="company-123"
  showTasks={true}
  groupByDate={true}
/>
```

### InteractionForm

Multi-type interaction formulier.

**Features:**
- Type selector (call/email/meeting/note)
- Company/contact/project dropdowns
- Description rich text editor
- Task toggle with due date picker
- Duration input (for calls/meetings)
- Email subject/body (for emails)

**Dynamic Fields:**
- **Call**: Duration required
- **Email**: Subject + body fields shown
- **Meeting**: Duration + attendees
- **Note**: Simple description
- **Task**: Due date picker appears

### TaskCheckbox

Interactive checkbox voor task completion.

**Features:**
- Click to toggle completed
- Optimistic update
- Completed_at timestamp
- Visual strikethrough on completion
- Confetti animation on first completion

### QuickAddInteraction

Floating button voor snelle notities.

**Features:**
- Global keyboard shortcut (Shift+N)
- Pre-filled company context
- Type quick-select
- One-click save
- Mobile-optimized

## 🔐 Security

### RLS Policies

```sql
-- Select: Role-based access
CREATE POLICY "Users can view interactions based on role"
ON interactions FOR SELECT
USING (
  -- SALES: Own interactions only
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'SALES'
    ) AND owner_id = auth.uid()
  )
  OR
  -- MANAGER/ADMIN: All interactions
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN')
    )
  )
);

-- Insert: All authenticated users
CREATE POLICY "Users can create interactions"
ON interactions FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  owner_id = auth.uid()
);

-- Update: Owner or ADMIN only
CREATE POLICY "Users can update own interactions or ADMIN all"
ON interactions FOR UPDATE
USING (
  owner_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);
```

### RBAC Implementation

```typescript
// In useInteractions hook
const { data: profile } = useProfile();

// Auto-filter for SALES role
if (profile?.role === 'SALES' && !filters.owner_id) {
  filters.owner_id = profile.id;
}

// MANAGER/ADMIN can override owner_id filter
```

## 💼 Business Logic

### Task Management Rules

1. **is_task = true**: Enables task features
2. **due_date**: Optional, maar recommended voor tasks
3. **task_status**: Auto-set to 'pending' on create
4. **completed_at**: Set when task completed (cannot be uncompleted)
5. **Overdue**: `due_date < now() AND task_status = 'pending'`

### Interaction Type Best Practices

**Call** 📞
- Log immediately after call
- Include duration_minutes
- Link to contact if known
- Note next steps in description

**Email** ✉️
- Save subject + full body
- Link to contact
- Track follow-up requirements
- Can create task for follow-up

**Meeting** 🤝
- Log agenda + outcomes
- Include duration_minutes
- Note attendees in description
- Create follow-up tasks if needed

**Note** 📝
- General observations
- Quick updates
- Internal notes
- Can be converted to task

### Activity Timeline Grouping

```
┌─────────────────────────────────────────┐
│ VANDAAG                                 │
├─────────────────────────────────────────┤
│ 📞 14:30 - Call with John (30 min)     │
│ ✅ 10:00 - Task: Send proposal         │
├─────────────────────────────────────────┤
│ GISTEREN                                │
├─────────────────────────────────────────┤
│ 🤝 15:00 - Meeting: Project kickoff    │
│ ✉️ 09:00 - Email: Quote follow-up      │
├─────────────────────────────────────────┤
│ DEZE WEEK                               │
├─────────────────────────────────────────┤
│ 📝 Ma - Note: Discussed requirements   │
│ 📞 Ma - Call with Sarah (15 min)       │
└─────────────────────────────────────────┘
```

## 📝 Usage Examples

### Company Activity Timeline

```tsx
import { InteractionTimeline } from '@/features/interactions/components/InteractionTimeline';

function CompanyDetailPage({ companyId }) {
  return (
    <div>
      <CompanyHeader />
      <InteractionTimeline
        companyId={companyId}
        showTasks={true}
      />
    </div>
  );
}
```

### Task Dashboard

```tsx
function TaskDashboard() {
  const { interactions: overdue } = useInteractions({
    is_task: true,
    task_status: 'pending',
    due_before: new Date().toISOString()
  });

  const { interactions: today } = useInteractions({
    is_task: true,
    task_status: 'pending',
    due_before: endOfDay(new Date()).toISOString()
  });

  return (
    <div>
      <TaskSection
        title="Overdue"
        tasks={overdue}
        variant="danger"
      />
      <TaskSection
        title="Due Today"
        tasks={today}
        variant="warning"
      />
    </div>
  );
}
```

### Quick Add During Call

```tsx
function QuickAddCall({ companyId, contactId }) {
  const createInteraction = useCreateInteraction();

  return (
    <QuickAddForm
      defaultValues={{
        company_id: companyId,
        contact_id: contactId,
        type: 'call'
      }}
      onSubmit={(data) => {
        createInteraction.mutate({
          ...data,
          duration_minutes: 30
        });
      }}
    />
  );
}
```

### Activity Statistics Dashboard

```tsx
function ActivityDashboard() {
  const { data: thisMonth } = useInteractionStats({
    created_after: startOfMonth(new Date())
  });

  const { data: lastMonth } = useInteractionStats({
    created_after: startOfMonth(subMonths(new Date(), 1)),
    created_before: startOfMonth(new Date())
  });

  return (
    <StatsGrid>
      <StatCard
        title="Total Interactions"
        value={thisMonth.totalInteractions}
        change={calculateChange(thisMonth, lastMonth)}
      />
      <StatCard
        title="Completed Tasks"
        value={thisMonth.completedTasks}
      />
      <StatCard
        title="Overdue Tasks"
        value={thisMonth.overdueTasks}
        variant="danger"
      />
    </StatsGrid>
  );
}
```

### Email Logging

```tsx
const logEmail = useCreateInteraction();

// After sending email
logEmail.mutate({
  company_id: company.id,
  contact_id: contact.id,
  type: 'email',
  email_subject: 'Quote Q-2026-001',
  email_body: emailContent,
  description: 'Sent quote with pricing details'
});
```

## 🚀 Best Practices

1. **Log immediately** - Don't wait, log interactions real-time
2. **Link to contacts** - Always link to contact when possible
3. **Descriptive notes** - Future-you will thank you
4. **Set due dates** - For all tasks, always add due dates
5. **Complete tasks** - Mark tasks done immediately after completion
6. **Duration tracking** - Log accurate call/meeting durations
7. **Email bodies** - Save full email content for context

## 🐛 Troubleshooting

**Cannot see other user's interactions:**
- Check your role (SALES can only see own)
- Verify you have MANAGER/ADMIN role
- Review RLS policies

**Task not appearing in overdue list:**
- Verify is_task = true
- Check task_status = 'pending'
- Confirm due_date is in the past

**Timeline not updating:**
- Check React Query cache
- Verify company_id filter is correct
- Review RBAC filtering logic

**Cannot complete task:**
- Verify you are the owner
- Check task is not already completed
- Review user permissions

## 📚 Related Modules

- [Companies](../companies/README.md) - Parent companies
- [Contacts](../contacts/README.md) - Communication contacts
- [Projects](../projects/README.md) - Project-related activities
- [Quotes](../quotes/README.md) - Quote-related communications

## 🎓 Interaction Workflow Examples

### Sales Call Workflow

```
1. Before call: Create task "Call John about project"
2. During call: Quick notes in description
3. After call: 
   - Mark task completed
   - Create new interaction (type: call)
   - Log duration + discussion points
   - Create follow-up task if needed
4. Email follow-up:
   - Create interaction (type: email)
   - Link to same company/contact
   - Reference call in description
```

### Meeting Workflow

```
1. Pre-meeting: Create task "Prepare agenda"
2. Create meeting interaction:
   - type: 'meeting'
   - description: Agenda + attendees
   - duration_minutes: 60
3. During meeting: Take notes
4. Post-meeting:
   - Update description with outcomes
   - Mark meeting task completed
   - Create follow-up tasks for action items
   - Link tasks to relevant projects
```

### Task Management Workflow

```
1. Create task with due_date
2. Task appears in dashboard (sorted by due date)
3. Work on task
4. Mark completed → completed_at timestamp
5. Task moves to "Completed" section
6. Create follow-up task if needed
```

## 🔔 Task Reminders

```typescript
// Overdue tasks (highlighted in red)
const overdue = interactions.filter(i => 
  i.is_task &&
  i.task_status === 'pending' &&
  new Date(i.due_date) < new Date()
);

// Due today (highlighted in yellow)
const dueToday = interactions.filter(i =>
  i.is_task &&
  i.task_status === 'pending' &&
  isToday(new Date(i.due_date))
);

// Due this week (normal)
const dueThisWeek = interactions.filter(i =>
  i.is_task &&
  i.task_status === 'pending' &&
  isThisWeek(new Date(i.due_date))
);
```

## 📊 Metrics & Analytics

### Key Metrics

- **Total Interactions**: All logged activities
- **Interactions per Type**: Breakdown by call/email/meeting/note
- **Task Completion Rate**: `completed / (completed + pending)`
- **Average Response Time**: Time between interactions
- **Activity Frequency**: Interactions per week/month
- **Overdue Tasks**: Current count (should be 0!)

### Performance Indicators

```typescript
// Sales activity health
const activityHealth = {
  excellent: totalInteractions > 50,  // per month
  good: totalInteractions > 30,
  needsImprovement: totalInteractions < 20
};

// Task management health
const taskHealth = {
  excellent: overdueTasks === 0,
  good: overdueTasks < 3,
  needsImprovement: overdueTasks > 5
};
```
