# Quotes Module

CRM module voor offertes met electronic signing (customer + provider), status tracking, en PDF generation.

## 📁 Structure

```
quotes/
├── components/
│   ├── QuoteCard.tsx             # Card voor quote overzicht
│   ├── QuoteForm.tsx             # Quote creation/edit
│   ├── QuoteItemsTable.tsx       # Line items management
│   ├── QuoteStatusBadge.tsx      # Visual status indicator
│   ├── QuoteSigningSection.tsx   # Dual signature workflow
│   └── QuotePDFPreview.tsx       # PDF preview component
├── hooks/
│   ├── useQuotes.ts              # Query hook met filters
│   ├── useQuoteMutations.ts      # CRUD mutations
│   ├── useQuoteStatusConfig.ts   # Status colors/labels
│   └── useQuoteSigning.ts        # Electronic signing logic
├── utils/
│   └── calculateQuoteTotals.ts   # Price calculations
├── QuotesPage.tsx                # Lijst view
├── QuoteDetailPage.tsx           # Detail view met signing
└── README.md
```

## 🎯 Features

- ✅ **Quote Generation**: Auto-generate from projects
- ✅ **Line Items**: Multiple items met quantities/prices
- ✅ **Dual Signing**: Customer + provider signatures required
- ✅ **Status Tracking**: 7-state workflow (draft → rejected/completed)
- ✅ **PDF Export**: Professional PDF generation
- ✅ **Version Control**: Track quote revisions
- ✅ **Validity Period**: Expiration date tracking
- ✅ **Tax Calculation**: BTW/VAT support
- ✅ **Quote Templates**: Reusable quote templates
- ✅ **Rejection Handling**: Rejection reasons met notes

## 🔧 Hooks

### useQuotes(filters?)

Fetches quotes met optional filtering.

**Parameters:**
```typescript
interface QuoteFilters {
  company_id?: string;
  contact_id?: string;
  project_id?: string;
  status?: QuoteStatus;
  statuses?: QuoteStatus[];     // Multiple statuses
  created_after?: string;
  created_before?: string;
  valid_until_after?: string;
  valid_until_before?: string;
  search?: string;              // Quote number or title
}
```

**Returns:**
- `quotes` - Array van Quote objecten
- `totalCount` - Totaal aantal
- `isLoading` - Loading state
- `pagination` - Pagination controls

**Example:**
```tsx
// Pending signatures
const { quotes } = useQuotes({
  statuses: ['sent', 'customer_signed']
});

// Quotes for specific company
const { quotes } = useQuotes({
  company_id: 'company-123'
});
```

### useQuoteMutations

**useCreateQuote()**
Creates nieuwe quote met auto quote number generation.

**useUpdateQuote(id)**
Updates quote fields (only when status = 'draft').

**useDuplicateQuote(id)**
Duplicates existing quote als new draft.

**useDeleteQuote(id)**
Soft delete quote.

**Example:**
```tsx
const createQuote = useCreateQuote();
const duplicateQuote = useDuplicateQuote('quote-123');

// Create from project
createQuote.mutate({
  project_id: 'project-123',
  company_id: 'company-123',
  contact_id: 'contact-123',
  quote_number: 'Q-2026-001',
  title: 'Website Development',
  valid_until: addDays(new Date(), 30),
  items: [
    {
      description: 'Frontend Development',
      quantity: 1,
      unit_price: 5000,
      tax_percentage: 21
    }
  ]
});

// Duplicate for revision
duplicateQuote.mutate();
```

### useQuoteSigning(quoteId)

**🔐 CRITICAL: Electronic Signing Workflow**

Manages dual-signature process:
1. **Customer Signs** → Status: `customer_signed`
2. **Provider Signs** → Status: `signed` + 🎉 Trigger lead conversion

**Methods:**
- `signAsCustomer()` - Customer signature
- `signAsProvider()` - Provider signature (ADMIN/MANAGER only)
- `rejectQuote(reason, notes)` - Reject met reason

**Business Logic:**
```typescript
// Customer signature
if (status === 'sent') {
  await signAsCustomer({
    signature_customer: base64Image,
    customer_ip: ipAddress,
    customer_signed_at: new Date()
  });
  // Status → 'customer_signed'
}

// Provider signature (completes deal)
if (status === 'customer_signed') {
  await signAsProvider({
    signature_provider: base64Image,
    provider_ip: ipAddress,
    provider_signed_at: new Date()
  });
  // Status → 'signed'
  // Trigger: convert_lead_to_customer()
  // UI: 🎉 Confetti celebration
}
```

**Example:**
```tsx
const { signAsCustomer, signAsProvider, rejectQuote } = useQuoteSigning(quote.id);

// Customer signs
<SignaturePad
  onSign={(signature) => {
    signAsCustomer.mutate({
      signature_customer: signature,
      customer_ip: '192.168.1.1'
    });
  }}
/>

// Provider signs (completes deal)
<SignaturePad
  onSign={(signature) => {
    signAsProvider.mutate({
      signature_provider: signature,
      provider_ip: '192.168.1.100'
    }, {
      onSuccess: () => {
        // Auto triggers lead conversion
        // Shows confetti
        // Navigates to company
      }
    });
  }}
/>

// Reject
<RejectButton
  onClick={() => {
    rejectQuote.mutate({
      rejection_reason: 'price_too_high',
      rejection_notes: 'Budget constraints'
    });
  }}
/>
```

## 📊 Types

```typescript
type QuoteStatus =
  | 'draft'             // Being created
  | 'sent'              // Sent to customer, awaiting customer signature
  | 'customer_signed'   // Customer signed, awaiting provider signature
  | 'signed'            // Both signed, deal won! 🎉
  | 'rejected'          // Customer rejected
  | 'expired'           // Validity period passed
  | 'completed';        // Archived/completed

type RejectionReason =
  | 'price_too_high'
  | 'timeline_too_long'
  | 'scope_mismatch'
  | 'found_alternative'
  | 'budget_unavailable'
  | 'project_cancelled'
  | 'other';

interface Quote {
  id: string;
  quote_number: string;           // Q-2026-001
  company_id: string;
  contact_id: string;
  project_id?: string;
  title: string;
  description?: string;
  status: QuoteStatus;
  valid_until: string;
  
  // Items
  items: QuoteItem[];
  
  // Totals (calculated)
  subtotal: number;
  tax_amount: number;
  total: number;
  
  // Customer signature
  signature_customer?: string;    // Base64 image
  customer_signed_at?: string;
  customer_ip?: string;
  
  // Provider signature
  signature_provider?: string;    // Base64 image
  provider_signed_at?: string;
  provider_ip?: string;
  
  // Rejection
  rejection_reason?: RejectionReason;
  rejection_notes?: string;
  rejected_at?: string;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface QuoteItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_percentage: number;         // 21 for NL BTW
  total: number;                  // quantity * unit_price
  sort_order: number;
}
```

## 🎨 Components

### QuoteForm

Quote creation/edit formulier.

**Features:**
- Company/contact/project selection
- Valid until date picker
- Line items table met add/remove
- Real-time total calculation
- Tax percentage per item
- Terms & conditions editor

**Disabled when:** Status ≠ 'draft'

### QuoteItemsTable

Editable table voor line items.

**Features:**
- Add/remove rows
- Quantity/price inputs
- Tax percentage selector (0%, 9%, 21%)
- Subtotal/tax/total calculation
- Drag-to-reorder (sort_order)

### QuoteSigningSection

Dual signature workflow component.

**UI Flow:**
```
┌─────────────────────────────────────────┐
│ Status: 'sent'                          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   Customer Signature Required       │ │
│ │   [Signature Pad]                   │ │
│ │   [Sign as Customer] button         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Provider signature: Waiting...          │
└─────────────────────────────────────────┘

        ↓ Customer signs ↓

┌─────────────────────────────────────────┐
│ Status: 'customer_signed'               │
│                                         │
│ Customer: ✅ Signed 2026-01-15 10:30   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   Provider Signature Required       │ │
│ │   [Signature Pad]                   │ │
│ │   [Sign as Provider] button         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

        ↓ Provider signs ↓

┌─────────────────────────────────────────┐
│ Status: 'signed' 🎉                     │
│                                         │
│ Customer: ✅ Signed 2026-01-15 10:30   │
│ Provider: ✅ Signed 2026-01-15 14:45   │
│                                         │
│ 🎉 Deal Won! Converting to customer... │
└─────────────────────────────────────────┘
```

### QuoteStatusBadge

Visual status indicator met colors.

**Status Colors:**
- `draft`: gray
- `sent`: blue
- `customer_signed`: yellow
- `signed`: green
- `rejected`: red
- `expired`: orange
- `completed`: gray

## 🔐 Security

### RLS Policies

```sql
-- Select: User's company quotes only
CREATE POLICY "Users can view their company quotes"
ON quotes FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_access WHERE user_id = auth.uid()
  )
);

-- Insert: SALES+ can create
CREATE POLICY "SALES+ can create quotes"
ON quotes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('SALES', 'MANAGER', 'ADMIN')
  )
);

-- Update: Only draft quotes, or signing
CREATE POLICY "Can update draft quotes or sign"
ON quotes FOR UPDATE
USING (
  status = 'draft' OR
  (status = 'sent' AND signature_customer IS NULL) OR
  (status = 'customer_signed' AND signature_provider IS NULL)
);
```

### Electronic Signature Security

1. **IP Address Logging**: Both signatures include IP
2. **Timestamp**: Exact signing time recorded
3. **Immutable**: Once signed, cannot be edited
4. **Audit Trail**: All changes logged in audit_log
5. **Base64 Images**: Signatures stored as PNG base64

## 💼 Business Logic

### Quote Lifecycle

```
DRAFT → SENT → CUSTOMER_SIGNED → SIGNED → COMPLETED
  ↓       ↓           ↓              ↓
  └→ [EXPIRED if past valid_until]  ↓
          └→ [REJECTED if customer rejects]
                                     ↓
                        ⚡ Triggers convert_lead_to_customer()
```

### Signing Rules

1. **Customer must sign first** (status: 'sent' → 'customer_signed')
2. **Provider signs last** (status: 'customer_signed' → 'signed')
3. **Both required** for deal completion
4. **ADMIN/MANAGER only** can sign as provider
5. **Any user** can sign as customer (if they have access to company)

### Total Calculation

```typescript
// Per item
item.total = item.quantity * item.unit_price;
item.tax_amount = item.total * (item.tax_percentage / 100);
item.total_with_tax = item.total + item.tax_amount;

// Quote totals
quote.subtotal = sum(items.total);
quote.tax_amount = sum(items.tax_amount);
quote.total = quote.subtotal + quote.tax_amount;
```

### Lead Conversion Trigger

When provider signs (status → 'signed'):
1. Call `convert_lead_to_customer()` RPC
2. Update project stage → 'quote_signed'
3. Update company status → 'active'
4. Send notification → deal_won
5. Show confetti celebration 🎉

## 📝 Usage Examples

### Generate Quote from Project

```tsx
import { generateQuoteFromProject } from '@/features/projects/utils/generateQuoteFromProject';

const quote = await generateQuoteFromProject({
  project,
  company,
  contact,
  quoteNumber: await getNextQuoteNumber()
});

createQuote.mutate(quote);
```

### Track Pending Signatures

```tsx
const { quotes: pendingCustomer } = useQuotes({
  status: 'sent'
});

const { quotes: pendingProvider } = useQuotes({
  status: 'customer_signed'
});

// Show in dashboard
<PendingSignaturesWidget
  customerPending={pendingCustomer.length}
  providerPending={pendingProvider.length}
/>
```

### Handle Rejection

```tsx
const { rejectQuote } = useQuoteSigning(quote.id);

<RejectDialog
  onReject={({ reason, notes }) => {
    rejectQuote.mutate({
      rejection_reason: reason,
      rejection_notes: notes
    }, {
      onSuccess: () => {
        // Log interaction
        logInteraction({
          type: 'note',
          description: `Quote ${quote.quote_number} rejected: ${reason}`,
          company_id: quote.company_id
        });
      }
    });
  }}
/>
```

### PDF Export

```tsx
import { generateQuotePDF } from '@/lib/pdf';

const handleDownloadPDF = async () => {
  const pdf = await generateQuotePDF(quote);
  downloadFile(pdf, `${quote.quote_number}.pdf`);
};
```

## 🚀 Best Practices

1. **Set realistic validity periods** - 30 days default
2. **Add detailed descriptions** - Clear scope per item
3. **Use standard tax percentages** - 21% for NL services
4. **Sign promptly** - Don't delay provider signatures
5. **Document rejections** - Log why quotes were rejected
6. **Version control** - Duplicate quote for revisions instead of editing
7. **Auto-generate numbers** - Use `getNextQuoteNumber()` utility

## 🐛 Troubleshooting

**Cannot edit quote:**
- Check status (only 'draft' can be edited)
- For revisions, duplicate quote instead

**Signing button disabled:**
- Verify status ('sent' for customer, 'customer_signed' for provider)
- Check user role (ADMIN/MANAGER for provider signature)

**Total calculation incorrect:**
- Verify tax_percentage format (21, not 0.21)
- Check quantity and unit_price are numbers
- Use calculateQuoteTotals() utility

**Lead conversion not triggered:**
- Verify quote has project_id
- Check project is in 'quote_sent' or 'negotiation' stage
- Review RPC function logs

## 📚 Related Modules

- [Projects](../projects/README.md) - Source projects
- [Companies](../companies/README.md) - Quote recipients
- [Contacts](../contacts/README.md) - Decision makers
- [Interactions](../interactions/README.md) - Quote-related communications

## 🎓 Quote Workflow Example

```
1. Project in 'quote_requested' stage
2. Generate quote from project
3. Add line items
4. Set valid_until date
5. Review and send → status: 'sent'
6. Customer receives quote
7. Customer signs → status: 'customer_signed'
8. Provider reviews and signs → status: 'signed'
9. 🎉 Automatic lead conversion triggered
10. Project → 'quote_signed' stage
11. Company → 'active' status
12. Quote → 'completed' (archived)
```

## 🔄 Status Transitions

```typescript
// Valid transitions
const transitions = {
  draft: ['sent', 'rejected'],
  sent: ['customer_signed', 'rejected', 'expired'],
  customer_signed: ['signed', 'rejected'],
  signed: ['completed'],
  rejected: [],  // Terminal state
  expired: ['sent'],  // Can resend
  completed: []  // Terminal state
};
```
