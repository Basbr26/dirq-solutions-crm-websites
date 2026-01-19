/**
 * QuotePDFDocument
 * PDF template for quote export using @react-pdf/renderer
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Quote } from '@/types/quotes';

// Register fonts if needed (optional)
// Font.register({ family: 'Roboto', src: 'path/to/Roboto.ttf' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '30%',
    fontSize: 9,
    color: '#6b7280',
  },
  value: {
    width: '70%',
    fontSize: 10,
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  colDescription: {
    width: '40%',
  },
  colQuantity: {
    width: '15%',
    textAlign: 'center',
  },
  colPrice: {
    width: '20%',
    textAlign: 'right',
  },
  colTotal: {
    width: '25%',
    textAlign: 'right',
  },
  itemTitle: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 8,
    color: '#6b7280',
  },
  totals: {
    marginTop: 20,
    alignSelf: 'flex-end',
    width: '50%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#d1d5db',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    color: '#4b5563',
  },
  badge: {
    padding: '2 6',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontSize: 8,
    borderRadius: 3,
    marginLeft: 5,
  },
});

interface QuotePDFDocumentProps {
  quote: Quote & {
    companies?: { name: string; email?: string; phone?: string };
    contacts?: { first_name: string; last_name: string; email?: string };
  };
  items?: Array<{
    id: string;
    title: string;
    description?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    category?: string;
  }>;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);

export const QuotePDFDocument = ({ quote, items = [] }: QuotePDFDocumentProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>Dirq Solutions</Text>
          <Text style={styles.companyInfo}>info@dirq.nl | +31 6 12345678</Text>
          <Text style={styles.companyInfo}>www.dirq.nl</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Offerte {quote.quote_number}</Text>

        {/* Quote Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offerte gegevens</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Titel:</Text>
            <Text style={styles.value}>{quote.title}</Text>
          </View>

          {(quote.company || quote.companies) && (
            <View style={styles.row}>
              <Text style={styles.label}>Bedrijf:</Text>
              <Text style={styles.value}>{quote.company?.name || quote.companies?.name}</Text>
            </View>
          )}

          {(quote.contact || quote.contacts) && (
            <View style={styles.row}>
              <Text style={styles.label}>Contactpersoon:</Text>
              <Text style={styles.value}>
                {quote.contact?.first_name || quote.contacts?.first_name} {quote.contact?.last_name || quote.contacts?.last_name}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Datum:</Text>
            <Text style={styles.value}>
              {format(new Date(quote.created_at), 'dd MMMM yyyy', { locale: nl })}
            </Text>
          </View>

          {quote.valid_until && (
            <View style={styles.row}>
              <Text style={styles.label}>Geldig tot:</Text>
              <Text style={styles.value}>
                {format(new Date(quote.valid_until), 'dd MMMM yyyy', { locale: nl })}
              </Text>
            </View>
          )}

          {quote.payment_terms && (
            <View style={styles.row}>
              <Text style={styles.label}>Betalingsvoorwaarden:</Text>
              <Text style={styles.value}>{quote.payment_terms}</Text>
            </View>
          )}

          {quote.delivery_time && (
            <View style={styles.row}>
              <Text style={styles.label}>Levertijd:</Text>
              <Text style={styles.value}>{quote.delivery_time}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {quote.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Beschrijving</Text>
            <Text style={{ fontSize: 9, color: '#4b5563' }}>{quote.description}</Text>
          </View>
        )}

        {/* Line Items */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Regel items</Text>
            
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.colDescription}>Omschrijving</Text>
                <Text style={styles.colQuantity}>Aantal</Text>
                <Text style={styles.colPrice}>Prijs</Text>
                <Text style={styles.colTotal}>Totaal</Text>
              </View>

              {/* Table Rows */}
              {items.map((item, index) => (
                <View key={item.id} style={styles.tableRow}>
                  <View style={styles.colDescription}>
                    <Text style={styles.itemTitle}>
                      {item.title}
                      {item.category && (
                        <Text style={styles.badge}> {item.category}</Text>
                      )}
                    </Text>
                    {item.description && (
                      <Text style={styles.itemDescription}>{item.description}</Text>
                    )}
                  </View>
                  <Text style={styles.colQuantity}>{item.quantity}</Text>
                  <Text style={styles.colPrice}>{formatCurrency(item.unit_price)}</Text>
                  <Text style={styles.colTotal}>{formatCurrency(item.total_price)}</Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={styles.totals}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotaal:</Text>
                <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>BTW ({quote.tax_rate}%):</Text>
                <Text style={styles.totalValue}>{formatCurrency(quote.tax_amount)}</Text>
              </View>
              <View style={styles.grandTotal}>
                <Text style={styles.grandTotalLabel}>Totaal:</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(quote.total_amount)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Internal Notes (optional - only for internal use) */}
        {quote.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Interne notities</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Dirq Solutions • KvK: 12345678 • BTW: NL123456789B01
          </Text>
          <Text>
            Deze offerte is geldig tot {quote.valid_until 
              ? format(new Date(quote.valid_until), 'dd-MM-yyyy', { locale: nl })
              : '30 dagen na offertedatum'}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
