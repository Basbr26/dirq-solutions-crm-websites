# 🔄 CRUD Operations Overzicht

**Complete lijst van alle Create, Read, Update, Delete operaties in de app**

---

## 👥 USERS & PROFILES

### Profiles (Medewerkers)
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | `GebruikersbeheerPage.tsx` | Super Admin | Nieuwe gebruiker aanmaken via Auth + Profile |
| **READ** | `EmployeesPage.tsx` | HR, Manager | Lijst van medewerkers (gefilterd op rol) |
| **READ** | `EmployeeDetailPage.tsx` | HR, Manager, Employee | Detail view van 1 medewerker |
| **UPDATE** | `UserManagement.tsx` | Super Admin | Rol toewijzen, activeren/deactiveren |
| **UPDATE** | `EmployeeForm` | HR | Medewerker gegevens bewerken |
| **DELETE** | `UserManagement.tsx` | Super Admin | User deactiveren (soft delete via `is_active`) |

**API Calls:**
```typescript
// CREATE
await supabase.auth.signUp({ email, password })
await supabase.from('profiles').insert({ ...data })

// READ
await supabase.from('profiles').select('*').eq('id', userId)
await supabase.from('profiles').select('*').eq('manager_id', currentUserId) // Manager filter

// UPDATE
await supabase.from('profiles').update({ role, is_active }).eq('id', userId)
await supabase.from('profiles').update({ ...data }).eq('id', employeeId)

// DELETE (soft)
await supabase.from('profiles').update({ is_active: false }).eq('id', userId)
```

---

## 🏢 DEPARTMENTS (Afdelingen)

### Departments
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | `DepartmentManagement.tsx` | Super Admin | Nieuwe afdeling aanmaken |
| **READ** | `DepartmentManagement.tsx` | Super Admin | Lijst van alle afdelingen |
| **UPDATE** | `DepartmentDialog.tsx` | Super Admin | Afdeling naam/budget bewerken |
| **DELETE** | `DepartmentManagement.tsx` | Super Admin | Afdeling verwijderen (cascade) |

**API Calls:**
```typescript
// CREATE
await supabase.from('departments').insert({
  name: 'IT',
  description: 'IT afdeling',
  budget_yearly: 500000
})

// READ
await supabase.from('departments').select('*')

// UPDATE
await supabase.from('departments').update({ name, budget_yearly }).eq('id', deptId)

// DELETE
await supabase.from('departments').delete().eq('id', deptId)
```

---

## 🤒 VERZUIM (Sickness Cases)

### Absence Cases
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | `ZiekmeldingWizard.tsx` | HR | Nieuwe ziekmelding registreren |
| **READ** | `DashboardHR.tsx` | HR, Manager | Lijst van verzuim cases (gefilterd) |
| **READ** | `AbsenceCasePage.tsx` | HR | Detail view van 1 case |
| **UPDATE** | `CaseCard.tsx` | HR | Status updaten, einddatum zetten |
| **UPDATE** | `ConversationNotesDialog.tsx` | HR | Gespreksnotities toevoegen |
| **DELETE** | - | - | ❌ Niet beschikbaar (audit trail) |

**API Calls:**
```typescript
// CREATE
await supabase.from('absence_cases').insert({
  employee_id,
  case_type: 'illness',
  start_date,
  reported_by,
  initial_notes
})

// READ (HR - alle cases)
await supabase.from('absence_cases').select('*, employee:profiles(*)')

// READ (Manager - alleen team)
await supabase.from('absence_cases')
  .select('*, employee:profiles!inner(*)')
  .eq('employee.manager_id', currentUserId)

// UPDATE
await supabase.from('absence_cases').update({
  end_date,
  status: 'recovered',
  expected_return_date
}).eq('id', caseId)
```

---

## 🏖️ VERLOF (Leave Requests)

### Leave Requests
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | `LeavePage.tsx` | Employee | Verlofaanvraag indienen |
| **READ** | `LeavePage.tsx` | HR, Manager, Employee | Lijst van verlofaanvragen (gefilterd) |
| **READ** | `LeaveDetailDialog.tsx` | HR, Manager, Employee | Detail view van aanvraag |
| **UPDATE** | `LeavePage.tsx` | Manager, HR | Aanvraag goedkeuren/afwijzen |
| **DELETE** | `LeavePage.tsx` | Employee | Aanvraag intrekken (alleen pending) |

**API Calls:**
```typescript
// CREATE
await supabase.from('leave_requests').insert({
  employee_id,
  leave_type: 'vacation',
  start_date,
  end_date,
  reason,
  status: 'pending'
})

// READ (Employee - alleen eigen)
await supabase.from('leave_requests')
  .select('*')
  .eq('employee_id', currentUserId)

// READ (Manager - alleen team)
await supabase.from('leave_requests')
  .select('*, employee:profiles!inner(*)')
  .eq('employee.manager_id', currentUserId)

// UPDATE (Approve/Reject)
await supabase.from('leave_requests').update({
  status: 'approved',
  approved_by: managerId,
  approved_at: new Date()
}).eq('id', requestId)

// DELETE (Withdraw)
await supabase.from('leave_requests').delete()
  .eq('id', requestId)
  .eq('status', 'pending')
```

---

## 📄 DOCUMENTS

### HR Documents
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | `DocumentUpload.tsx` | HR | Document uploaden naar Supabase Storage |
| **CREATE** | `GenerateTemplateDocument.tsx` | HR | Document genereren vanuit template |
| **READ** | `DocumentList.tsx` | HR | Lijst van alle documenten |
| **READ** | `MyDocuments.tsx` | Employee | Eigen documenten bekijken |
| **UPDATE** | - | - | ❌ Documents zijn immutable |
| **DELETE** | `DocumentList.tsx` | HR | Document verwijderen uit storage |

**API Calls:**
```typescript
// CREATE (Upload)
await supabase.storage.from('hr-documents')
  .upload(`${employeeId}/${fileName}`, file)

await supabase.from('hr_documents').insert({
  employee_id,
  document_type,
  file_path,
  file_name
})

// CREATE (Generate)
await supabase.rpc('generate_document_from_template', {
  p_template_id: templateId,
  p_employee_id: employeeId
})

// READ (HR - all docs)
await supabase.from('hr_documents')
  .select('*, employee:profiles(*), document_type:hr_document_types(*)')

// READ (Employee - own docs)
await supabase.from('hr_documents')
  .select('*')
  .eq('employee_id', currentUserId)

// DELETE
await supabase.storage.from('hr-documents').remove([filePath])
await supabase.from('hr_documents').delete().eq('id', docId)
```

---

## 💰 COST MANAGEMENT

### Company Settings
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | `CompanySettingsPage.tsx` | Super Admin | Initiële company settings |
| **READ** | `CompanySettingsPage.tsx` | Super Admin | Company settings ophalen |
| **UPDATE** | `CompanySettingsPage.tsx` | Super Admin | Settings wijzigen |
| **DELETE** | - | - | ❌ Niet toegestaan (single row table) |

**API Calls:**
```typescript
// CREATE/UPDATE (upsert pattern)
await supabase.from('company_settings').upsert({
  company_name,
  kvk_number,
  employer_social_charges_percentage,
  ...otherSettings
})

// READ
await supabase.from('company_settings').select('*').single()
```

### Job Levels
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | Database only | Super Admin | Via SQL (zie QUICK_DEPLOY_SQL.md) |
| **READ** | `EmployeeContractsPage.tsx` | HR | Voor contract formulier |
| **UPDATE** | Database only | Super Admin | Via SQL |
| **DELETE** | Database only | Super Admin | Soft delete (is_active = false) |

### Employee Contracts
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | `EmployeeContractsPage.tsx` | HR | Nieuw arbeidscontract aanmaken |
| **READ** | `EmployeeContractsPage.tsx` | HR | Lijst van alle contracten |
| **UPDATE** | `EmployeeContractsPage.tsx` | HR | Contract bewerken (salaris, status, etc) |
| **DELETE** | `EmployeeContractsPage.tsx` | HR | Contract verwijderen |

**API Calls:**
```typescript
// CREATE
await supabase.from('employee_contracts').insert({
  employee_id,
  contract_type: 'permanent',
  start_date,
  job_title,
  base_salary_monthly,
  fte,
  status: 'draft'
})

// READ (with relations)
await supabase.from('employee_contracts')
  .select(`
    *,
    employee:profiles(full_name, email),
    job_level:job_levels(level_name),
    department:departments(name)
  `)

// UPDATE
await supabase.from('employee_contracts').update({
  base_salary_monthly,
  status: 'active',
  ...otherFields
}).eq('id', contractId)

// DELETE
await supabase.from('employee_contracts').delete().eq('id', contractId)
```

### Offer Letters
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | `OfferLetterGenerator.tsx` | HR | Genereer offer letter vanuit contract |
| **READ** | `OfferLetterGenerator.tsx` | HR | Preview generated letter |
| **UPDATE** | - | - | ❌ Generated on-the-fly |
| **DELETE** | - | - | ❌ Niet van toepassing |

**API Calls:**
```typescript
// CREATE (RPC function)
const { data } = await supabase.rpc('generate_offer_letter', {
  p_employee_id: employeeId,
  p_contract_id: contractId,
  p_template_id: templateId
})
// Returns formatted Markdown content
```

---

## 📅 PLANNING TOOL

### Shifts
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | Planning interface (TBD) | HR, Manager | Nieuwe shift plannen |
| **READ** | Planning interface (TBD) | HR, Manager | Shifts ophalen per week/maand |
| **UPDATE** | Planning interface (TBD) | HR, Manager | Shift tijd/medewerker wijzigen |
| **DELETE** | Planning interface (TBD) | HR, Manager | Shift annuleren |

**API Calls:**
```typescript
// CREATE
await supabase.from('shifts').insert({
  department_id,
  shift_date,
  start_time,
  end_time,
  required_staff,
  shift_type: 'morning'
})

// READ (with cost calculation)
await supabase.from('shifts')
  .select(`
    *,
    shift_costs(*),
    schedules:employee_schedules(*, employee:profiles(*))
  `)
  .gte('shift_date', startDate)
  .lte('shift_date', endDate)

// UPDATE
await supabase.from('shifts').update({
  start_time,
  end_time,
  required_staff
}).eq('id', shiftId)

// DELETE
await supabase.from('shifts').delete().eq('id', shiftId)
```

### Employee Schedules
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | Planning interface (TBD) | HR, Manager | Medewerker aan shift toewijzen |
| **READ** | Planning interface (TBD) | HR, Manager, Employee | Roosters bekijken |
| **UPDATE** | Planning interface (TBD) | HR, Manager | Rooster wijzigen |
| **DELETE** | Planning interface (TBD) | HR, Manager | Medewerker van shift afhalen |

**API Calls:**
```typescript
// CREATE (with conflict checking)
const { data: conflicts } = await supabase.rpc('check_schedule_conflicts', {
  p_employee_id: employeeId,
  p_shift_id: shiftId,
  p_shift_date: shiftDate,
  p_start_time: startTime,
  p_end_time: endTime
})

if (!conflicts.length) {
  await supabase.from('employee_schedules').insert({
    employee_id,
    shift_id,
    status: 'scheduled'
  })
}

// READ
await supabase.from('employee_schedules')
  .select('*, shift:shifts(*), employee:profiles(*)')
  .eq('employee_id', employeeId)
  .gte('shift.shift_date', startDate)

// UPDATE (status workflow)
await supabase.from('employee_schedules').update({
  status: 'confirmed', // or 'in_progress', 'completed'
  actual_start_time,
  actual_end_time
}).eq('id', scheduleId)

// DELETE
await supabase.from('employee_schedules').delete().eq('id', scheduleId)
```

### Shift Swap Requests
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | Planning interface (TBD) | Employee | Shift swap aanvragen |
| **READ** | Planning interface (TBD) | Employee, Manager | Swap requests bekijken |
| **UPDATE** | Planning interface (TBD) | Manager | Swap goedkeuren/afwijzen |
| **DELETE** | Planning interface (TBD) | Employee | Swap request intrekken |

**API Calls:**
```typescript
// CREATE
await supabase.from('shift_swap_requests').insert({
  requester_schedule_id,
  swap_type: 'trade', // or 'give_away', 'coverage'
  target_employee_id, // optional
  reason,
  status: 'pending'
})

// READ
await supabase.from('shift_swap_requests')
  .select(`
    *,
    requester:requester_schedule_id(*, employee:profiles(*)),
    target:target_employee_id(*)
  `)
  .eq('status', 'pending')

// UPDATE (Approve)
await supabase.from('shift_swap_requests').update({
  status: 'approved',
  approved_by: managerId,
  approved_at: new Date()
}).eq('id', swapId)

// DELETE
await supabase.from('shift_swap_requests').delete().eq('id', swapId)
```

---

## 📊 ANALYTICS & REPORTS

### Cost Analytics (Read-Only)
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | - | - | ❌ Auto-calculated by triggers |
| **READ** | `CostAnalyticsDashboard.tsx` | HR, Super Admin | Cost summaries en trends |
| **UPDATE** | - | - | ❌ Auto-updated via triggers |
| **DELETE** | - | - | ❌ Audit data |

**API Calls:**
```typescript
// READ (aggregated data)
await supabase.from('employee_cost_summary')
  .select('*')
  .eq('year', 2025)
  .eq('department_id', deptId)

// READ (view)
await supabase.from('v_employee_total_compensation')
  .select('*')
  .order('total_annual_cost', { ascending: false })
```

---

## 🔔 NOTIFICATIONS

### Notifications
| Operatie | Locatie | Rol | Beschrijving |
|----------|---------|-----|--------------|
| **CREATE** | Database triggers | System | Auto-created bij events |
| **READ** | `NotificationBell.tsx` | All users | Notificaties ophalen |
| **UPDATE** | `NotificationBell.tsx` | All users | Als gelezen markeren |
| **DELETE** | `NotificationBell.tsx` | All users | Notificatie verwijderen |

**API Calls:**
```typescript
// CREATE (meestal via trigger, maar kan ook handmatig)
await supabase.from('notifications').insert({
  user_id,
  title: 'Nieuw verlofverzoek',
  message: `${employeeName} heeft verlof aangevraagd`,
  type: 'leave_request',
  related_id: leaveRequestId
})

// READ (unread)
await supabase.from('notifications')
  .select('*')
  .eq('user_id', currentUserId)
  .eq('is_read', false)
  .order('created_at', { ascending: false })

// UPDATE (mark as read)
await supabase.from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId)

// DELETE
await supabase.from('notifications').delete().eq('id', notificationId)
```

---

## 🔒 RLS POLICIES SAMENVATTING

Alle CRUD operaties worden beveiligd door Row Level Security:

### Profiles
- **SELECT:** Iedereen kan zichzelf zien; Managers zien team; HR/Admin zien alles
- **INSERT:** Alleen tijdens signup (via trigger)
- **UPDATE:** User kan zichzelf updaten; HR/Admin kunnen alles updaten
- **DELETE:** Alleen soft delete via `is_active`

### Departments
- **SELECT:** Iedereen kan lezen
- **INSERT/UPDATE/DELETE:** Alleen Super Admin

### Absence Cases
- **SELECT:** Employee eigen cases; Manager team cases; HR alle cases
- **INSERT:** HR
- **UPDATE:** HR
- **DELETE:** Niet toegestaan

### Leave Requests
- **SELECT:** Employee eigen requests; Manager team requests; HR alle requests
- **INSERT:** Employee (eigen), HR (voor iedereen)
- **UPDATE:** Manager/HR (approve/reject), Employee (eigen pending requests)
- **DELETE:** Employee (eigen pending requests)

### Documents
- **SELECT:** Employee eigen docs; HR alle docs
- **INSERT:** HR
- **UPDATE:** Niet toegestaan (immutable)
- **DELETE:** HR

### Employee Contracts
- **SELECT:** HR/Super Admin; Employee eigen contracts
- **INSERT:** HR
- **UPDATE:** HR
- **DELETE:** HR

### Shifts & Schedules
- **SELECT:** Employee eigen schedules; Manager team schedules; HR alle schedules
- **INSERT:** HR, Manager
- **UPDATE:** HR, Manager
- **DELETE:** HR, Manager

---

## 🚀 MISSING CRUD OPERATIONS (Feature Requests)

### Nog Te Implementeren:

1. **Skills Management**
   - CREATE/UPDATE/DELETE skills
   - Assign skills to employees
   - Skill-based shift assignment

2. **Templates Management**
   - CREATE/UPDATE/DELETE document templates
   - Template versioning

3. **Allowances & Benefits Assignment**
   - CREATE allowances per contract
   - CREATE benefits per employee
   - Manage lease car details

4. **Schedule Templates**
   - CREATE reusable schedule patterns
   - Apply templates to weeks/months

5. **Department Budgets**
   - UPDATE budget allocations
   - Track spending vs budget

6. **Performance Reviews**
   - CREATE review forms
   - Employee self-assessment
   - Manager evaluation

---

## 📞 API PATTERNS

### Standard Pattern
```typescript
// Query with error handling
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id)
  .single()

if (error) throw error
return data
```

### With React Query
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['entity', id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }
})
```

### Mutation Pattern
```typescript
const mutation = useMutation({
  mutationFn: async (values) => {
    const { error } = await supabase
      .from('table_name')
      .insert(values)
    if (error) throw error
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['entity'])
    toast({ title: 'Success' })
  }
})
```

---

## 🔍 TESTING CRUD OPERATIONS

### Checklist per Feature:

- [ ] **CREATE:** Test met valid data, test met invalid data (validation)
- [ ] **READ:** Test met filters, test pagination, test empty state
- [ ] **UPDATE:** Test met valid changes, test concurrent updates, test optimistic updates
- [ ] **DELETE:** Test cascade behavior, test soft delete, test permissions

### Role-Based Testing:

- [ ] Test als **Super Admin** (heeft meeste rechten)
- [ ] Test als **HR** (kan meeste HR data beheren)
- [ ] Test als **Manager** (alleen team data)
- [ ] Test als **Employee** (alleen eigen data)
- [ ] Test als **unauthenticated** (moet alles blocken)

---

## 📚 REFERENCES

- **Supabase Docs:** https://supabase.com/docs/reference/javascript
- **RLS Policies:** `supabase/migrations/*.sql`
- **Component Files:** `src/pages/` en `src/components/`
- **API Hooks:** `src/hooks/use*.ts`

---

**Last Updated:** 18 december 2025
