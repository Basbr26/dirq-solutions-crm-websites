# Companies Module

CRM module voor bedrijvenbeheer met volledige CRUD operaties, filtering, en CSV import/export.

## 📁 Structure

```
companies/
├── components/
│   ├── CompanyCard.tsx        # Card component voor bedrijfsweergave
│   ├── CompanyForm.tsx         # Formulier voor create/edit
│   └── CompanyFilters.tsx      # Geavanceerde filterbalk
├── hooks/
│   ├── useCompanies.ts         # Query hook voor bedrijvenlijst
│   └── useCompanyMutations.ts  # Mutations (create, update, delete)
├── CompaniesPage.tsx           # Hoofdpagina met lijst
├── CompanyDetailPage.tsx       # Detail pagina met tabs
└── README.md
```

## 🎯 Features

- ✅ **Bedrijvenbeheer**: Create, Read, Update, Delete operaties
- ✅ **Filtering**: Status, priority, industry, owner filters
- ✅ **Zoeken**: Real-time search op naam en email
- ✅ **CSV Import/Export**: Bulk import met Zod validatie
- ✅ **KVK Integratie**: Automatisch bedrijfsgegevens ophalen
- ✅ **Paginering**: Pagination met instelbare page size
- ✅ **Statistics**: Bedrijfsstatistieken (active, prospects, etc.)
- ✅ **RBAC**: Role-based access control (ADMIN, SALES, MANAGER)

## 🔧 Hooks

### useCompanies(filters?)

Fetches paginated lijst van bedrijven met filtering.

**Parameters:**
- `filters.search` - Zoek op naam of email
- `filters.status` - Filter op status (prospect, active, inactive, churned)
- `filters.industry_id` - Filter op industry IDs
- `filters.owner_id` - Filter op eigenaar
- `filters.priority` - Filter op priority (low, medium, high)

**Returns:**
- `companies` - Array van Company objecten
- `totalCount` - Totaal aantal results
- `isLoading` - Loading state
- `pagination` - Pagination controls

**Example:**
```tsx
const { companies, isLoading, pagination } = useCompanies({
  status: ['active'],
  search: 'Tech'
});
```

### useCreateCompany()

Creates een nieuw bedrijf met automatic owner assignment.

**Example:**
```tsx
const createCompany = useCreateCompany();

createCompany.mutate(
  {
    name: 'Acme Corp',
    email: 'info@acme.com',
    status: 'prospect',
    priority: 'high'
  },
  {
    onSuccess: (company) => navigate(`/companies/${company.id}`)
  }
);
```

### useUpdateCompany()

Updates existing bedrijf.

**Example:**
```tsx
const updateCompany = useUpdateCompany();

updateCompany.mutate({
  id: 'company-123',
  data: { status: 'active', priority: 'medium' }
});
```

### useDeleteCompany()

Verwijdert bedrijf (requires ADMIN role).

**Example:**
```tsx
const deleteCompany = useDeleteCompany();

deleteCompany.mutate('company-123', {
  onSuccess: () => navigate('/companies')
});
```

## 📊 Types

```typescript
interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  status: 'prospect' | 'active' | 'inactive' | 'churned';
  priority: 'low' | 'medium' | 'high';
  company_size?: string;
  kvk_number?: string;
  vat_number?: string;
  industry_id?: string;
  owner_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CompanyFilters {
  search?: string;
  status?: CompanyStatus[];
  industry_id?: string[];
  owner_id?: string[];
  priority?: CompanyPriority[];
}
```

## 🎨 Components

### CompanyCard

Toont bedrijfsinformatie in card format met quick actions.

**Props:**
```typescript
interface CompanyCardProps {
  company: Company;
  onEdit?: (company: Company) => void;
  onDelete?: (id: string) => void;
}
```

**Features:**
- Status badge met color coding
- Priority indicator
- Quick edit/delete acties (permission-aware)
- Click-through naar detail page
- Responsive layout

### CompanyForm

Formulier voor create/edit van bedrijven.

**Props:**
```typescript
interface CompanyFormProps {
  company?: Company;              // Voor edit mode
  onSubmit: (data: CompanyFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}
```

**Features:**
- Zod validation
- KVK lookup integratie
- Duplicate detection
- Auto-save draft (localStorage)
- Error handling per field

### CompanyFilters

Advanced filter component met multiple dimensions.

**Features:**
- Status multi-select
- Priority filter
- Industry filter
- Owner filter
- Date range filters
- Clear all filters button

## 🔐 Security

### Row Level Security (RLS)

Database policies zorgen voor:
- Users kunnen alleen eigen companies zien (SALES role)
- ADMIN/MANAGER kunnen alle companies zien
- ADMIN required voor delete operations

### CSV Import Validation

Zod schema voorkomt:
- ✅ SQL injection
- ✅ XSS attacks
- ✅ Invalid email formats
- ✅ Malformed phone numbers
- ✅ Invalid URLs
- ✅ Data corruption

**Validation Schema:**
```typescript
const companyImportSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().max(255).optional(),
  phone: z.string().regex(/^\+?[0-9\s\-()]+$/).max(50).optional(),
  website: z.string().url().max(255).optional(),
  status: z.enum(['prospect', 'active', 'inactive', 'churned']),
  priority: z.enum(['low', 'medium', 'high']),
});
```

## 📝 Usage Examples

### Basic Company List

```tsx
import { useCompanies } from '@/features/companies/hooks/useCompanies';
import { CompanyCard } from '@/features/companies/components/CompanyCard';

function CompanyList() {
  const { companies, isLoading } = useCompanies();

  if (isLoading) return <Skeleton />;

  return (
    <div className="grid grid-cols-3 gap-4">
      {companies.map(company => (
        <CompanyCard key={company.id} company={company} />
      ))}
    </div>
  );
}
```

### Filtered Company List

```tsx
const { companies } = useCompanies({
  status: ['active', 'prospect'],
  priority: ['high'],
  search: 'tech'
});
```

### Create New Company

```tsx
const createCompany = useCreateCompany();

const handleSubmit = (data: CompanyFormData) => {
  createCompany.mutate(data, {
    onSuccess: (company) => {
      toast.success('Bedrijf aangemaakt');
      navigate(`/companies/${company.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
};
```

### CSV Import

```tsx
import { CSVImportDialog } from '@/components/CSVImportDialog';

<CSVImportDialog
  open={importDialogOpen}
  onOpenChange={setImportDialogOpen}
  title="Bedrijven Importeren"
  requiredFields={['name']}
  optionalFields={['email', 'phone', 'website', 'status']}
  onImport={handleImport}
/>
```

## 🚀 Best Practices

1. **Always use hooks** - Gebruik `useCompanies` voor queries, niet direct Supabase
2. **Permission checks** - Check `role` voor edit/delete acties
3. **Error handling** - Gebruik onError callbacks voor user feedback
4. **Optimistic updates** - UI updates voor betere UX
5. **Query invalidation** - Invalidate relevante queries na mutations

## 🐛 Troubleshooting

**Companies niet zichtbaar:**
- Check RLS policies in Supabase
- Verify user role (SALES kan alleen eigen companies zien)
- Check owner_id assignment bij create

**CSV import faalt:**
- Validate CSV format (comma-separated)
- Check required fields (name is verplicht)
- Review error messages in toast notification
- Check browser console voor validation errors

**Duplicate KVK nummers:**
- Database constraint voorkomt duplicates
- Form toont duplicate dialog met opties
- Users kunnen duplicates forceren of annuleren

## 📚 Related Modules

- [Contacts](../contacts/README.md) - Contactpersonen bij bedrijven
- [Projects](../projects/README.md) - Projecten/deals per bedrijf
- [Interactions](../interactions/README.md) - Communicatie geschiedenis
- [Quotes](../quotes/README.md) - Offertes voor bedrijven
