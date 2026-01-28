# Contacts Module

CRM module voor contactpersonenbeheer met company linking, filtering, en CSV import/export.

## 📁 Structure

```
contacts/
├── components/
│   ├── ContactCard.tsx         # Card component voor contactweergave
│   ├── ContactForm.tsx          # Formulier voor create/edit
│   └── ContactFilters.tsx       # Filterbalk
├── hooks/
│   ├── useContacts.ts           # Query hook voor contactenlijst
│   └── useContactMutations.ts   # Mutations (create, update, delete)
├── ContactsPage.tsx             # Hoofdpagina met lijst
├── ContactDetailPage.tsx        # Detail pagina
└── README.md
```

## 🎯 Features

- ✅ **Contactbeheer**: Create, Read, Update, Delete operaties
- ✅ **Company Linking**: Koppel contacts aan bedrijven
- ✅ **Filtering**: Company, primary contact, decision maker filters
- ✅ **Zoeken**: Real-time search op naam, email, positie
- ✅ **CSV Import/Export**: Bulk import met Zod validatie + company lookup
- ✅ **Paginering**: Pagination met instelbare page size
- ✅ **Flags**: Primary contact & decision maker indicators
- ✅ **RBAC**: Role-based access control

## 🔧 Hooks

### useContacts(params?)

Fetches paginated lijst van contacts met filtering.

**Parameters:**
- `search` - Zoek op naam, email, of positie
- `companyId` - Filter op specific bedrijf
- `isPrimary` - Filter voor primary contacts only
- `isDecisionMaker` - Filter voor decision makers only

**Returns:**
- `contacts` - Array van Contact objecten
- `totalCount` - Totaal aantal results
- `isLoading` - Loading state
- `pagination` - Pagination controls

**Example:**
```tsx
// All contacts
const { contacts } = useContacts();

// Company's decision makers
const { contacts } = useContacts({ 
  companyId: 'company-123',
  isDecisionMaker: true 
});

// Search contacts
const { contacts } = useContacts({ search: 'john' });
```

### useContactMutations()

Combined hook met alle contact mutations.

**Returns:**
- `createContact` - Mutation voor nieuwe contact
- `updateContact` - Mutation voor update
- `deleteContact` - Mutation voor delete

**Example:**
```tsx
const { createContact, updateContact, deleteContact } = useContactMutations();

// Create
createContact.mutate({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  company_id: 'company-123',
  is_primary: true,
  is_decision_maker: true
});

// Update
updateContact.mutate({
  id: 'contact-123',
  data: { position: 'CTO' }
});

// Delete
deleteContact.mutate('contact-123');
```

## 📊 Types

```typescript
interface Contact {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  position?: string;
  department?: string;
  is_primary: boolean;           // Hoofdcontact voor bedrijf
  is_decision_maker: boolean;    // Kan contracten tekenen
  notes?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  // Joined data
  company?: {
    id: string;
    name: string;
    status: string;
  };
}

interface UseContactsParams {
  search?: string;
  companyId?: string;
  isPrimary?: boolean;
  isDecisionMaker?: boolean;
}
```

## 🎨 Components

### ContactCard

Toont contactinformatie in card format.

**Props:**
```typescript
interface ContactCardProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (id: string) => void;
}
```

**Features:**
- Primary contact badge (⭐)
- Decision maker badge (✓)
- Company link
- Email/phone met click-to-call/email
- Quick actions (permission-aware)

### ContactForm

Formulier voor create/edit van contacts.

**Props:**
```typescript
interface ContactFormProps {
  contact?: Contact;                    // Voor edit mode
  defaultCompanyId?: string;           // Pre-fill company
  onSubmit: (data: ContactFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}
```

**Features:**
- Company dropdown met zoeken
- Email validation
- Phone format validation
- Primary/decision maker toggles
- Auto-complete voor known emails

## 🔐 Security

### Row Level Security (RLS)

Database policies:
- Users zien contacts van toegankelijke companies
- SALES: Alleen eigen company contacts
- ADMIN/MANAGER: Alle contacts

### CSV Import with Company Lookup

**Unique Feature:** Automatische company matching

```typescript
// CSV rij: { first_name: 'John', company: 'Acme Corp' }
// Systeem zoekt automatisch company_id op basis van naam
const companyMap = new Map(
  companies?.map(c => [c.name.toLowerCase(), c.id])
);
```

**Validation Schema:**
```typescript
const contactImportSchema = z.object({
  first_name: z.string().min(1).max(100).trim(),
  last_name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(255).optional(),
  phone: z.string().regex(/^\+?[0-9\s\-()]+$/).max(50).optional(),
  mobile: z.string().regex(/^\+?[0-9\s\-()]+$/).max(50).optional(),
  company_name: z.string().max(200).optional(),
  is_primary: z.boolean().optional(),
  is_decision_maker: z.boolean().optional(),
});
```

## 📝 Usage Examples

### Display Company's Contacts

```tsx
import { useContacts } from '@/features/contacts/hooks/useContacts';
import { ContactCard } from '@/features/contacts/components/ContactCard';

function CompanyContacts({ companyId }: { companyId: string }) {
  const { contacts, isLoading } = useContacts({ companyId });

  return (
    <div className="space-y-4">
      {contacts.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </div>
  );
}
```

### Create Contact with Pre-filled Company

```tsx
const { createContact } = useContactMutations();

<Dialog>
  <ContactForm
    defaultCompanyId="company-123"
    onSubmit={(data) => {
      createContact.mutate(data, {
        onSuccess: () => toast.success('Contact aangemaakt')
      });
    }}
  />
</Dialog>
```

### Find Decision Makers

```tsx
const { contacts: decisionMakers } = useContacts({
  companyId: 'company-123',
  isDecisionMaker: true
});

// Use voor quote approvals, contract signing, etc.
```

### CSV Import with Company Matching

```tsx
const handleImport = async (data: any[]) => {
  // Fetch all companies for lookup
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name');

  const companyMap = new Map(
    companies?.map(c => [c.name.toLowerCase(), c.id])
  );

  for (const row of data) {
    const companyId = companyMap.get(row.company?.toLowerCase());
    
    if (companyId) {
      await createContact.mutate({
        ...row,
        company_id: companyId
      });
    }
  }
};
```

## 🎯 Business Logic

### Primary Contact Rules

- Één primary contact per bedrijf (recommended)
- Primary contact gebruikt voor default:
  - Quote recipient
  - Project contact
  - Email notifications

### Decision Maker Rules

- Multiple decision makers mogelijk per bedrijf
- Decision maker kan:
  - Quotes accepteren/tekenen
  - Contracten goedkeuren
  - Facturen autoriseren
- Badge: ✓ (groene check)

## 🚀 Best Practices

1. **Always link to company** - Contact zonder company is invalid
2. **Set primary contact** - Elk bedrijf moet primary hebben
3. **Mark decision makers** - Cruciaal voor sales proces
4. **Validate emails** - Check format before save
5. **Company lookup in CSV** - Gebruik exacte bedrijfsnamen

## 🐛 Troubleshooting

**Contact niet zichtbaar:**
- Check of user toegang heeft tot parent company
- Verify RLS policies
- Check owner_id assignment

**CSV import company matching faalt:**
- Company namen moeten exact matchen (case-insensitive)
- Creëer companies eerst, dan contacts
- Check spelling in CSV file

**Email/phone validation errors:**
- Email moet valid format zijn (name@domain.com)
- Phone accepteert: +31, +, (), -, spaties
- Gebruik internationale formats (+31612345678)

**Primary contact conflicts:**
- System staat multiple primary contacts toe
- Best practice: Slechts één primary per bedrijf
- Update oude primary contact bij nieuwe aanwijzing

## 📚 Related Modules

- [Companies](../companies/README.md) - Parent bedrijven
- [Interactions](../interactions/README.md) - Communicatie met contacts
- [Projects](../projects/README.md) - Projects met contact person
- [Quotes](../quotes/README.md) - Quotes addressed to contacts

## 🔗 Integration Points

### Met Companies Module

```tsx
// In CompanyDetailPage
const { contacts } = useContacts({ companyId: company.id });

// Toon contacts tab met:
// - Primary contact highlighted
// - Decision makers badged
// - Quick add contact button
```

### Met Projects Module

```tsx
// Project form - select contact
const { contacts } = useContacts({ 
  companyId: selectedCompanyId,
  isPrimary: true 
});

// Auto-select primary contact als default
```

### Met Quotes Module

```tsx
// Quote creation - recipient
const { contacts: decisionMakers } = useContacts({
  companyId: company.id,
  isDecisionMaker: true
});

// Quote sent to decision maker
```
