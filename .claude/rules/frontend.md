# Frontend Rules - Dirq Solutions CRM

> Regels voor React, TypeScript en UI development.

---

## Component Structuur

### Functionele Componenten
```typescript
interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export function Component({ title, onAction }: ComponentProps) {
  // 1. Hooks eerst
  const { t } = useTranslation();
  const [state, setState] = useState(false);

  // 2. Early returns
  if (!title) return null;

  // 3. Render
  return <div>{title}</div>;
}
```

### Feature Module Structuur
```
src/features/[module]/
├── components/          # UI componenten
│   ├── [Module]Card.tsx
│   ├── [Module]Form.tsx
│   └── [Module]List.tsx
├── hooks/               # Data hooks
│   ├── use[Module].ts
│   └── use[Module]Mutations.ts
├── __tests__/           # Unit tests
├── [Module]Page.tsx     # Main page
└── README.md            # Module docs
```

## Data Fetching

### Query Pattern
```typescript
export const useCompanies = (filters?: CompanyFilters) => {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*', { count: 'exact' });
      if (error) throw error;
      return data;
    },
  });
};
```

### Mutation Pattern
```typescript
export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (company: CreateCompanyInput) => {
      const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(t('companies.created'));
    },
    onError: (error) => {
      toast.error(t('errors.createFailed'));
      logger.error(error, { context: 'create_company' });
    },
  });
};
```

## Styling

### Tailwind + cn()
```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-classes'
)} />
```

### shadcn/ui Componenten
- Gebruik `@/components/ui/` als basis
- Pas aan via className, niet door component te kopiëren
- Volg Radix UI patterns

## i18n

### Translations
```typescript
const { t } = useTranslation();

// Simpele key
<Button>{t('common.save')}</Button>

// Met interpolatie
<p>{t('quotes.statusChangedTo', { status: newStatus })}</p>

// Pluralisatie
<span>{t('items.count', { count: items.length })}</span>
```

### Bestanden
```
src/lib/locales/
├── nl/
│   ├── common.json
│   ├── companies.json
│   └── quotes.json
└── en/
    └── ...
```

## Error Handling

```typescript
try {
  await mutation.mutateAsync(data);
} catch (error) {
  logger.error(error, { context: 'action_name', ...metadata });
  toast.error(t('errors.genericError'));
}
```

---

*Laatste update: 30 januari 2026*
