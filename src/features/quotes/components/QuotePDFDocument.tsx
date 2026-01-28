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
  Image,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Quote } from '@/types/quotes';

// Register fonts if needed (optional)
// Font.register({ family: 'Roboto', src: 'path/to/Roboto.ttf' });

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  // Professional Header with logo
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#06BDC7', // Brand purple/blue
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#06BDC7',
    marginBottom: 8,
  },
  companyInfo: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 3,
  },
  // Document title
  documentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 30,
    marginBottom: 5,
  },
  quoteNumber: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 25,
  },
  // Two column layout for quote details
  detailsGrid: {
    flexDirection: 'row',
    marginBottom: 25,
    gap: 20,
  },
  detailColumn: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#06BDC7',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 9,
    color: '#64748b',
    width: '40%',
  },
  value: {
    fontSize: 9,
    color: '#1e293b',
    fontWeight: 'bold',
    width: '60%',
  },
  // Description section
  descriptionSection: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  descriptionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 9,
    color: '#78350f',
    lineHeight: 1.5,
  },
  // Table styling
  table: {
    marginTop: 10,
    marginBottom: 25,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#06BDC7',
    padding: 10,
    fontWeight: 'bold',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 10,
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  colDescription: {
    width: '45%',
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
    width: '20%',
    textAlign: 'right',
  },
  itemTitle: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#1e293b',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 8,
    color: '#06BDC7',
    backgroundColor: '#e0e7ff',
    padding: '2 6',
    borderRadius: 3,
    marginLeft: 6,
  },
  bulletList: {
    fontSize: 8,
    color: '#475569',
    marginLeft: 5,
    marginTop: 4,
    lineHeight: 1.6,
  },
  bulletItem: {
    marginBottom: 3,
  },
  // Totals section
  totalsSection: {
    marginTop: 20,
    alignSelf: 'flex-end',
    width: '45%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '8 0',
  },
  totalLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#06BDC7',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#06BDC7',
  },
  // Notes sections
  notesSection: {
    marginTop: 25,
    padding: 15,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#06BDC7',
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.6,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 3,
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
  logoUrl?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);

export const QuotePDFDocument = ({ quote, items = [], logoUrl }: QuotePDFDocumentProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Professional Header with Logo */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>Dirq Solutions</Text>
            <Text style={styles.companyInfo}>info@dirqsolutions.nl • +31 6 12345678 • www.dirqsolutions.nl</Text>
            <Text style={styles.companyInfo}>KvK: 12345678 • BTW: NL123456789B01</Text>
          </View>
          {logoUrl && <Image style={styles.logo} src={logoUrl} />}
        </View>

        {/* Document Title */}
        <Text style={styles.documentTitle}>Offerte</Text>
        <Text style={styles.quoteNumber}>Nummer: {quote.quote_number}</Text>

        {/* Quote Details in Two Columns */}
        <View style={styles.detailsGrid}>
          {/* Left Column - Client Info */}
          <View style={styles.detailColumn}>
            <Text style={styles.sectionTitle}>Klantgegevens</Text>
            {(quote.company || quote.companies) && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Bedrijf:</Text>
                <Text style={styles.value}>{quote.company?.name || quote.companies?.name}</Text>
              </View>
            )}
            {(quote.contact || quote.contacts) && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Contactpersoon:</Text>
                <Text style={styles.value}>
                  {quote.contact?.first_name || quote.contacts?.first_name} {quote.contact?.last_name || quote.contacts?.last_name}
                </Text>
              </View>
            )}
            {(quote.contact?.email || quote.contacts?.email) && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>E-mail:</Text>
                <Text style={styles.value}>{quote.contact?.email || quote.contacts?.email}</Text>
              </View>
            )}
          </View>

          {/* Right Column - Quote Info */}
          <View style={styles.detailColumn}>
            <Text style={styles.sectionTitle}>Offerte Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Datum:</Text>
              <Text style={styles.value}>
                {format(new Date(quote.created_at), 'dd MMMM yyyy', { locale: nl })}
              </Text>
            </View>
            {quote.valid_until && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Geldig tot:</Text>
                <Text style={styles.value}>
                  {format(new Date(quote.valid_until), 'dd MMMM yyyy', { locale: nl })}
                </Text>
              </View>
            )}
            {quote.payment_terms && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Betaling:</Text>
                <Text style={styles.value}>{quote.payment_terms}</Text>
              </View>
            )}
            {quote.delivery_time && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Levertijd:</Text>
                <Text style={styles.value}>{quote.delivery_time}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Title */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>{quote.title}</Text>
        </View>

        {/* Description with special styling */}
        {quote.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>BETAALVOORWAARDEN:</Text>
            <Text style={styles.descriptionText}>{quote.description}</Text>
          </View>
        )}

        {/* Line Items Table */}
        {items.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Regel Items</Text>
            
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colDescription]}>Omschrijving</Text>
                <Text style={[styles.tableHeaderText, styles.colQuantity]}>Aantal</Text>
                <Text style={[styles.tableHeaderText, styles.colPrice]}>Prijs</Text>
                <Text style={[styles.tableHeaderText, styles.colTotal]}>Totaal</Text>
              </View>

              {/* Table Rows */}
              {items.map((item, index) => (
                <View key={item.id} style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
                  <View style={styles.colDescription}>
                    <Text style={styles.itemTitle}>
                      {item.title}
                      {item.category && (
                        <Text style={styles.itemCategory}> {item.category}</Text>
                      )}
                    </Text>
                    {item.description && (
                      <View style={styles.bulletList}>
                        {item.description.split('\n').map((line, i) => {
                          const trimmed = line.trim();
                          if (!trimmed) return null;
                          if (trimmed.startsWith('•')) {
                            return (
                              <Text key={i} style={styles.bulletItem}>
                                • {trimmed.substring(1).trim()}
                              </Text>
                            );
                          }
                          return (
                            <Text key={i} style={styles.bulletItem}>
                              {trimmed}
                            </Text>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  <Text style={[styles.colQuantity, { fontSize: 9, color: '#1e293b' }]}>{item.quantity}</Text>
                  <Text style={[styles.colPrice, { fontSize: 9, color: '#1e293b' }]}>{formatCurrency(item.unit_price)}</Text>
                  <Text style={[styles.colTotal, { fontSize: 10, fontWeight: 'bold', color: '#1e293b' }]}>{formatCurrency(item.total_price)}</Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotaal:</Text>
                <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>BTW ({quote.tax_rate}%):</Text>
                <Text style={styles.totalValue}>{formatCurrency(quote.tax_amount)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Totaal:</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(quote.total_amount)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Client Notes */}
        {quote.client_notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Bericht aan klant</Text>
            <View style={styles.bulletList}>
              {quote.client_notes.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                if (trimmed.startsWith('•')) {
                  return (
                    <Text key={i} style={styles.bulletItem}>
                      • {trimmed.substring(1).trim()}
                    </Text>
                  );
                }
                return <Text key={i} style={styles.notesText}>{trimmed}</Text>;
              })}
            </View>
          </View>
        )}

        {/* Internal Notes */}
        {quote.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Interne notities</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* Professional Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Dirq Solutions • KvK: 12345678 • BTW: NL123456789B01</Text>
          <Text style={styles.footerText}>
            Deze offerte is geldig tot {quote.valid_until 
              ? format(new Date(quote.valid_until), 'dd MMMM yyyy', { locale: nl })
              : '30 dagen na offertedatum'}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

