/**
 * CRM Document Templates
 * Professional document generation for CRM workflows
 * Using @react-pdf/renderer for high-quality PDFs
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

// Import Dirq logo
import dirqLogo from '@/assets/dirq-logo.png';

// Shared styles for all CRM documents
const sharedStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#0ea5e9',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0284c7',
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 15,
    color: '#0f172a',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e293b',
  },
  paragraph: {
    fontSize: 11,
    marginBottom: 10,
    textAlign: 'justify',
    lineHeight: 1.6,
  },
  label: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 3,
  },
  value: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
  },
});

// ============================================================================
// CONTRACT TEMPLATE
// ============================================================================

interface ContractData {
  contractNumber: string;
  companyName: string;
  companyAddress?: string;
  companyKvK?: string;
  clientName: string;
  clientAddress: string;
  clientKvK?: string;
  projectName: string;
  projectDescription: string;
  startDate: Date;
  endDate?: Date;
  totalAmount: number;
  paymentTerms: string;
  deliverables: string[];
  additionalTerms?: string;
}

export const ContractTemplate = ({ data }: { data: ContractData }) => (
  <Document>
    <Page size="A4" style={sharedStyles.page}>
      {/* Header */}
      <View style={sharedStyles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={sharedStyles.companyName}>{data.companyName}</Text>
            {data.companyAddress && (
              <Text style={sharedStyles.companyInfo}>{data.companyAddress}</Text>
            )}
            {data.companyKvK && (
              <Text style={sharedStyles.companyInfo}>KvK: {data.companyKvK}</Text>
            )}
          </View>
          <Image src={dirqLogo} style={{ width: 80, height: 'auto', objectFit: 'contain' }} />
        </View>
      </View>

      {/* Title */}
      <Text style={sharedStyles.documentTitle}>
        OVEREENKOMST VAN OPDRACHT
      </Text>

      {/* Contract Details */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.label}>Contractnummer</Text>
        <Text style={sharedStyles.value}>{data.contractNumber}</Text>
        
        <Text style={sharedStyles.label}>Datum</Text>
        <Text style={sharedStyles.value}>
          {format(new Date(), 'dd MMMM yyyy', { locale: nl })}
        </Text>
      </View>

      {/* Parties */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Partijen</Text>
        
        <Text style={sharedStyles.label}>Opdrachtnemer</Text>
        <Text style={sharedStyles.value}>{data.companyName}</Text>
        {data.companyAddress && <Text style={sharedStyles.paragraph}>{data.companyAddress}</Text>}
        {data.companyKvK && <Text style={sharedStyles.paragraph}>KvK-nummer: {data.companyKvK}</Text>}
        
        <Text style={[sharedStyles.label, { marginTop: 10 }]}>Opdrachtgever</Text>
        <Text style={sharedStyles.value}>{data.clientName}</Text>
        <Text style={sharedStyles.paragraph}>{data.clientAddress}</Text>
        {data.clientKvK && <Text style={sharedStyles.paragraph}>KvK-nummer: {data.clientKvK}</Text>}
      </View>

      {/* Project Details */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Artikel 1: Opdracht</Text>
        <Text style={sharedStyles.paragraph}>
          Opdrachtgever verstrekt hierbij aan opdrachtnemer de opdracht voor de realisatie van: {data.projectName}.
        </Text>
        <Text style={sharedStyles.paragraph}>
          {data.projectDescription}
        </Text>
      </View>

      {/* Deliverables */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Artikel 2: Te leveren diensten</Text>
        {data.deliverables.map((deliverable, index) => (
          <Text key={index} style={sharedStyles.paragraph}>
            • {deliverable}
          </Text>
        ))}
      </View>

      {/* Timeline */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Artikel 3: Looptijd</Text>
        <Text style={sharedStyles.paragraph}>
          Deze overeenkomst gaat in op {format(data.startDate, 'dd MMMM yyyy', { locale: nl })}
          {data.endDate && ` en loopt tot ${format(data.endDate, 'dd MMMM yyyy', { locale: nl })}`}.
        </Text>
      </View>

      {/* Payment */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Artikel 4: Vergoeding</Text>
        <Text style={sharedStyles.paragraph}>
          De totale vergoeding voor deze opdracht bedraagt €{data.totalAmount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} (exclusief BTW).
        </Text>
        <Text style={sharedStyles.paragraph}>
          Betalingstermijn: {data.paymentTerms}
        </Text>
      </View>

      {/* Additional Terms */}
      {data.additionalTerms && (
        <View style={sharedStyles.section}>
          <Text style={sharedStyles.sectionTitle}>Artikel 5: Aanvullende bepalingen</Text>
          <Text style={sharedStyles.paragraph}>{data.additionalTerms}</Text>
        </View>
      )}

      {/* Signature */}
      <View style={{ marginTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '45%' }}>
            <Text style={sharedStyles.label}>Opdrachtnemer</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: '#000', marginTop: 50, paddingTop: 5 }}>
              <Text style={{ fontSize: 10 }}>{data.companyName}</Text>
            </View>
          </View>
          <View style={{ width: '45%' }}>
            <Text style={sharedStyles.label}>Opdrachtgever</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: '#000', marginTop: 50, paddingTop: 5 }}>
              <Text style={{ fontSize: 10 }}>{data.clientName}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <Text style={sharedStyles.footer}>
        {data.companyName} • Contractnummer: {data.contractNumber}
      </Text>
    </Page>
  </Document>
);

// ============================================================================
// INVOICE/FACTUUR TEMPLATE
// ============================================================================

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  companyName: string;
  companyAddress?: string;
  companyKvK?: string;
  companyBtw?: string;
  companyIban?: string;
  clientName: string;
  clientAddress: string;
  clientKvK?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
}

export const InvoiceTemplate = ({ data }: { data: InvoiceData }) => (
  <Document>
    <Page size="A4" style={sharedStyles.page}>
      {/* Header */}
      <View style={sharedStyles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={sharedStyles.companyName}>{data.companyName}</Text>
            {data.companyAddress && (
              <Text style={sharedStyles.companyInfo}>{data.companyAddress}</Text>
            )}
            {data.companyKvK && (
              <Text style={sharedStyles.companyInfo}>KvK: {data.companyKvK}</Text>
            )}
            {data.companyBtw && (
              <Text style={sharedStyles.companyInfo}>BTW-nummer: {data.companyBtw}</Text>
            )}
          </View>
          <Image src={dirqLogo} style={{ width: 80, height: 'auto', objectFit: 'contain' }} />
        </View>
      </View>

      {/* Title and Invoice Details */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <View style={{ width: '50%' }}>
          <Text style={sharedStyles.documentTitle}>FACTUUR</Text>
        </View>
        <View style={{ width: '45%' }}>
          <Text style={sharedStyles.label}>Factuurnummer</Text>
          <Text style={sharedStyles.value}>{data.invoiceNumber}</Text>
          
          <Text style={sharedStyles.label}>Factuurdatum</Text>
          <Text style={sharedStyles.value}>
            {format(data.invoiceDate, 'dd MMMM yyyy', { locale: nl })}
          </Text>
          
          <Text style={sharedStyles.label}>Vervaldatum</Text>
          <Text style={sharedStyles.value}>
            {format(data.dueDate, 'dd MMMM yyyy', { locale: nl })}
          </Text>
        </View>
      </View>

      {/* Client Info */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.label}>Factuur aan</Text>
        <Text style={sharedStyles.value}>{data.clientName}</Text>
        <Text style={sharedStyles.paragraph}>{data.clientAddress}</Text>
        {data.clientKvK && (
          <Text style={sharedStyles.paragraph}>KvK-nummer: {data.clientKvK}</Text>
        )}
      </View>

      {/* Line Items Table */}
      <View style={sharedStyles.table}>
        <View style={sharedStyles.tableHeader}>
          <Text style={{ width: '50%' }}>Omschrijving</Text>
          <Text style={{ width: '15%', textAlign: 'center' }}>Aantal</Text>
          <Text style={{ width: '17.5%', textAlign: 'right' }}>Prijs</Text>
          <Text style={{ width: '17.5%', textAlign: 'right' }}>Bedrag</Text>
        </View>
        
        {data.lineItems.map((item, index) => (
          <View key={index} style={sharedStyles.tableRow}>
            <Text style={{ width: '50%' }}>{item.description}</Text>
            <Text style={{ width: '15%', textAlign: 'center' }}>{item.quantity}</Text>
            <Text style={{ width: '17.5%', textAlign: 'right' }}>
              €{item.unitPrice.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={{ width: '17.5%', textAlign: 'right' }}>
              €{item.amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={{ alignItems: 'flex-end', marginTop: 20 }}>
        <View style={{ width: '40%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 11 }}>Subtotaal</Text>
            <Text style={{ fontSize: 11 }}>
              €{data.subtotal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 11 }}>BTW ({data.taxRate}%)</Text>
            <Text style={{ fontSize: 11 }}>
              €{data.taxAmount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View 
            style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              borderTopWidth: 2,
              borderTopColor: '#0284c7',
              paddingTop: 10,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>Totaal</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
              €{data.total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      {/* Payment Details */}
      <View style={[sharedStyles.section, { marginTop: 30 }]}>
        <Text style={sharedStyles.sectionTitle}>Betaalgegevens</Text>
        {data.companyIban && (
          <Text style={sharedStyles.paragraph}>IBAN: {data.companyIban}</Text>
        )}
        <Text style={sharedStyles.paragraph}>
          Gelieve het bedrag binnen {Math.round((data.dueDate.getTime() - data.invoiceDate.getTime()) / (1000 * 60 * 60 * 24))} dagen over te maken onder vermelding van factuurnummer {data.invoiceNumber}.
        </Text>
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={sharedStyles.section}>
          <Text style={sharedStyles.sectionTitle}>Opmerkingen</Text>
          <Text style={sharedStyles.paragraph}>{data.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={sharedStyles.footer}>
        {data.companyName} • Factuurnummer: {data.invoiceNumber} • Pagina 1 van 1
      </Text>
    </Page>
  </Document>
);

// ============================================================================
// PROJECT PROPOSAL TEMPLATE
// ============================================================================

interface ProposalData {
  proposalNumber: string;
  proposalDate: Date;
  companyName: string;
  companyAddress?: string;
  clientName: string;
  clientAddress: string;
  projectName: string;
  executiveSummary: string;
  objectives: string[];
  approach: string;
  deliverables: string[];
  timeline: Array<{
    phase: string;
    duration: string;
    deliverable: string;
  }>;
  investment: number;
  validUntil: Date;
}

export const ProposalTemplate = ({ data }: { data: ProposalData }) => (
  <Document>
    <Page size="A4" style={sharedStyles.page}>
      {/* Header */}
      <View style={sharedStyles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={sharedStyles.companyName}>{data.companyName}</Text>
            {data.companyAddress && (
              <Text style={sharedStyles.companyInfo}>{data.companyAddress}</Text>
            )}
          </View>
          <Image src={dirqLogo} style={{ width: 80, height: 'auto', objectFit: 'contain' }} />
        </View>
      </View>

      {/* Title */}
      <Text style={sharedStyles.documentTitle}>PROJECTVOORSTEL</Text>
      <Text style={{ fontSize: 16, marginBottom: 20, color: '#475569' }}>
        {data.projectName}
      </Text>

      {/* Proposal Details */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <View style={{ width: '50%' }}>
          <Text style={sharedStyles.label}>Voorstel voor</Text>
          <Text style={sharedStyles.value}>{data.clientName}</Text>
          <Text style={{ fontSize: 10, marginBottom: 10 }}>{data.clientAddress}</Text>
        </View>
        <View style={{ width: '50%' }}>
          <Text style={sharedStyles.label}>Voorstelnummer</Text>
          <Text style={sharedStyles.value}>{data.proposalNumber}</Text>
          
          <Text style={sharedStyles.label}>Datum</Text>
          <Text style={sharedStyles.value}>
            {format(data.proposalDate, 'dd MMMM yyyy', { locale: nl })}
          </Text>
        </View>
      </View>

      {/* Executive Summary */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Samenvatting</Text>
        <Text style={sharedStyles.paragraph}>{data.executiveSummary}</Text>
      </View>

      {/* Objectives */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Doelstellingen</Text>
        {data.objectives.map((objective, index) => (
          <Text key={index} style={sharedStyles.paragraph}>
            • {objective}
          </Text>
        ))}
      </View>

      {/* Approach */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Aanpak</Text>
        <Text style={sharedStyles.paragraph}>{data.approach}</Text>
      </View>

      {/* Deliverables */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Oplevering</Text>
        {data.deliverables.map((deliverable, index) => (
          <Text key={index} style={sharedStyles.paragraph}>
            • {deliverable}
          </Text>
        ))}
      </View>
    </Page>

    {/* Page 2: Timeline and Investment */}
    <Page size="A4" style={sharedStyles.page}>
      {/* Timeline */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Planning</Text>
        <View style={sharedStyles.table}>
          <View style={sharedStyles.tableHeader}>
            <Text style={{ width: '30%' }}>Fase</Text>
            <Text style={{ width: '20%', textAlign: 'center' }}>Doorlooptijd</Text>
            <Text style={{ width: '50%' }}>Oplevering</Text>
          </View>
          {data.timeline.map((item, index) => (
            <View key={index} style={sharedStyles.tableRow}>
              <Text style={{ width: '30%', fontSize: 10 }}>{item.phase}</Text>
              <Text style={{ width: '20%', fontSize: 10, textAlign: 'center' }}>{item.duration}</Text>
              <Text style={{ width: '50%', fontSize: 10 }}>{item.deliverable}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Investment */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Investering</Text>
        <View style={{ 
          backgroundColor: '#f8fafc', 
          padding: 20, 
          borderRadius: 5,
          borderWidth: 1,
          borderColor: '#e2e8f0'
        }}>
          <Text style={{ fontSize: 14, marginBottom: 10 }}>Totale investering</Text>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0284c7' }}>
            €{data.investment.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={{ fontSize: 10, marginTop: 5, color: '#64748b' }}>
            Exclusief 21% BTW
          </Text>
        </View>
      </View>

      {/* Validity */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.paragraph}>
          Dit voorstel is geldig tot en met {format(data.validUntil, 'dd MMMM yyyy', { locale: nl })}.
        </Text>
      </View>

      {/* Call to Action */}
      <View style={{ 
        marginTop: 30, 
        padding: 20, 
        backgroundColor: '#eff6ff',
        borderRadius: 5
      }}>
        <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>
          Volgende stappen
        </Text>
        <Text style={{ fontSize: 10, lineHeight: 1.6 }}>
          Wij zijn enthousiast om met jullie aan dit project te werken. Bij akkoord sturen wij een formele offerte en overeenkomst ter ondertekening. 
          Neem gerust contact met ons op voor vragen of om dit voorstel te bespreken.
        </Text>
      </View>

      {/* Footer */}
      <Text style={sharedStyles.footer}>
        {data.companyName} • Voorstelnummer: {data.proposalNumber} • Pagina 2 van 2
      </Text>
    </Page>
  </Document>
);

// ============================================================================
// NDA TEMPLATE (CRM Version)
// ============================================================================

interface NDAData {
  ndaNumber: string;
  date: Date;
  companyName: string;
  companyAddress?: string;
  clientName: string;
  clientAddress: string;
  purpose: string;
  duration: number; // in years
}

export const NDATemplate = ({ data }: { data: NDAData }) => (
  <Document>
    <Page size="A4" style={sharedStyles.page}>
      {/* Header */}
      <View style={sharedStyles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={sharedStyles.companyName}>{data.companyName}</Text>
            {data.companyAddress && (
              <Text style={sharedStyles.companyInfo}>{data.companyAddress}</Text>
            )}
          </View>
          <Image src={dirqLogo} style={{ width: 80, height: 'auto', objectFit: 'contain' }} />
        </View>
      </View>

      {/* Title */}
      <Text style={sharedStyles.documentTitle}>
        GEHEIMHOUDINGSOVEREENKOMST
      </Text>
      <Text style={{ fontSize: 12, marginBottom: 20, fontStyle: 'italic' }}>
        (Non-Disclosure Agreement)
      </Text>

      {/* Reference */}
      <View style={{ marginBottom: 20 }}>
        <Text style={sharedStyles.label}>Referentienummer</Text>
        <Text style={sharedStyles.value}>{data.ndaNumber}</Text>
        
        <Text style={sharedStyles.label}>Datum</Text>
        <Text style={sharedStyles.value}>
          {format(data.date, 'dd MMMM yyyy', { locale: nl })}
        </Text>
      </View>

      {/* Parties */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Partijen</Text>
        
        <Text style={sharedStyles.label}>Partij A (Verstrekker)</Text>
        <Text style={sharedStyles.value}>{data.companyName}</Text>
        {data.companyAddress && <Text style={sharedStyles.paragraph}>{data.companyAddress}</Text>}
        
        <Text style={[sharedStyles.label, { marginTop: 10 }]}>Partij B (Ontvanger)</Text>
        <Text style={sharedStyles.value}>{data.clientName}</Text>
        <Text style={sharedStyles.paragraph}>{data.clientAddress}</Text>
      </View>

      {/* Purpose */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Artikel 1: Doel</Text>
        <Text style={sharedStyles.paragraph}>
          Deze geheimhoudingsovereenkomst wordt aangegaan in verband met: {data.purpose}.
        </Text>
      </View>

      {/* Definition */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Artikel 2: Vertrouwelijke Informatie</Text>
        <Text style={sharedStyles.paragraph}>
          Onder 'Vertrouwelijke Informatie' wordt verstaan alle informatie, in welke vorm dan ook, 
          die door Partij A aan Partij B wordt verstrekt, waaronder maar niet beperkt tot:
        </Text>
        <Text style={sharedStyles.paragraph}>• Technische specificaties en ontwerpen</Text>
        <Text style={sharedStyles.paragraph}>• Bedrijfsstrategieën en plannen</Text>
        <Text style={sharedStyles.paragraph}>• Klantgegevens en contactinformatie</Text>
        <Text style={sharedStyles.paragraph}>• Financiële informatie</Text>
        <Text style={sharedStyles.paragraph}>• Intellectueel eigendom</Text>
      </View>

      {/* Obligations */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Artikel 3: Verplichtingen</Text>
        <Text style={sharedStyles.paragraph}>
          Partij B verplicht zich om:
        </Text>
        <Text style={sharedStyles.paragraph}>
          a) De Vertrouwelijke Informatie strikt geheim te houden en niet aan derden te verstrekken;
        </Text>
        <Text style={sharedStyles.paragraph}>
          b) De Vertrouwelijke Informatie alleen te gebruiken voor het overeengekomen doel;
        </Text>
        <Text style={sharedStyles.paragraph}>
          c) Passende maatregelen te nemen om de Vertrouwelijke Informatie te beschermen;
        </Text>
        <Text style={sharedStyles.paragraph}>
          d) Werknemers en adviseurs die toegang hebben tot de informatie te binden aan dezelfde geheimhoudingsplicht.
        </Text>
      </View>

      {/* Duration */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Artikel 4: Duur</Text>
        <Text style={sharedStyles.paragraph}>
          Deze overeenkomst treedt in werking op de datum van ondertekening en blijft van kracht 
          gedurende een periode van {data.duration} jaar.
        </Text>
      </View>

      {/* Return */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Artikel 5: Teruggave</Text>
        <Text style={sharedStyles.paragraph}>
          Na afloop van deze overeenkomst of op eerste verzoek van Partij A, zal Partij B alle 
          Vertrouwelijke Informatie, inclusief kopieën, retourneren of vernietigen.
        </Text>
      </View>

      {/* Signature */}
      <View style={{ marginTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '45%' }}>
            <Text style={sharedStyles.label}>Partij A</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: '#000', marginTop: 50, paddingTop: 5 }}>
              <Text style={{ fontSize: 10 }}>{data.companyName}</Text>
              <Text style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>Naam en handtekening</Text>
            </View>
          </View>
          <View style={{ width: '45%' }}>
            <Text style={sharedStyles.label}>Partij B</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: '#000', marginTop: 50, paddingTop: 5 }}>
              <Text style={{ fontSize: 10 }}>{data.clientName}</Text>
              <Text style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>Naam en handtekening</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <Text style={sharedStyles.footer}>
        {data.companyName} • NDA Referentie: {data.ndaNumber}
      </Text>
    </Page>
  </Document>
);

// ============================================================================
// MEETING NOTES TEMPLATE
// ============================================================================

interface MeetingNotesData {
  meetingTitle: string;
  meetingDate: Date;
  location: string;
  attendees: string[];
  agenda: string[];
  notes: string;
  decisions: string[];
  actionItems: Array<{
    task: string;
    owner: string;
    deadline: Date;
  }>;
  nextMeeting?: Date;
  preparedBy: string;
}

export const MeetingNotesTemplate = ({ data }: { data: MeetingNotesData }) => (
  <Document>
    <Page size="A4" style={sharedStyles.page}>
      {/* Logo */}
      <View style={{ marginBottom: 20, alignItems: 'flex-end' }}>
        <Image src={dirqLogo} style={{ width: 80, height: 'auto', objectFit: 'contain' }} />
      </View>
      
      {/* Title */}
      <Text style={sharedStyles.documentTitle}>GESPREKSVERSLAG</Text>
      <Text style={{ fontSize: 14, marginBottom: 20, color: '#475569' }}>
        {data.meetingTitle}
      </Text>

      {/* Meeting Info */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <View style={{ width: '50%' }}>
          <Text style={sharedStyles.label}>Datum</Text>
          <Text style={sharedStyles.value}>
            {format(data.meetingDate, 'dd MMMM yyyy HH:mm', { locale: nl })} uur
          </Text>
          
          <Text style={sharedStyles.label}>Locatie</Text>
          <Text style={sharedStyles.value}>{data.location}</Text>
        </View>
        <View style={{ width: '50%' }}>
          <Text style={sharedStyles.label}>Aanwezig</Text>
          {data.attendees.map((attendee, index) => (
            <Text key={index} style={{ fontSize: 10, marginBottom: 2 }}>
              • {attendee}
            </Text>
          ))}
        </View>
      </View>

      {/* Agenda */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Agenda</Text>
        {data.agenda.map((item, index) => (
          <Text key={index} style={sharedStyles.paragraph}>
            {index + 1}. {item}
          </Text>
        ))}
      </View>

      {/* Notes */}
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>Besproken</Text>
        <Text style={sharedStyles.paragraph}>{data.notes}</Text>
      </View>

      {/* Decisions */}
      {data.decisions.length > 0 && (
        <View style={sharedStyles.section}>
          <Text style={sharedStyles.sectionTitle}>Besluiten</Text>
          {data.decisions.map((decision, index) => (
            <Text key={index} style={sharedStyles.paragraph}>
              • {decision}
            </Text>
          ))}
        </View>
      )}

      {/* Action Items */}
      {data.actionItems.length > 0 && (
        <View style={sharedStyles.section}>
          <Text style={sharedStyles.sectionTitle}>Actiepunten</Text>
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeader}>
              <Text style={{ width: '50%' }}>Actie</Text>
              <Text style={{ width: '25%' }}>Eigenaar</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>Deadline</Text>
            </View>
            {data.actionItems.map((item, index) => (
              <View key={index} style={sharedStyles.tableRow}>
                <Text style={{ width: '50%', fontSize: 10 }}>{item.task}</Text>
                <Text style={{ width: '25%', fontSize: 10 }}>{item.owner}</Text>
                <Text style={{ width: '25%', fontSize: 10, textAlign: 'right' }}>
                  {format(item.deadline, 'dd MMM yyyy', { locale: nl })}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Next Meeting */}
      {data.nextMeeting && (
        <View style={sharedStyles.section}>
          <Text style={sharedStyles.sectionTitle}>Volgende vergadering</Text>
          <Text style={sharedStyles.paragraph}>
            Gepland op {format(data.nextMeeting, 'dd MMMM yyyy HH:mm', { locale: nl })} uur
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={{ marginTop: 30 }}>
        <Text style={{ fontSize: 9, color: '#64748b' }}>
          Opgesteld door: {data.preparedBy}
        </Text>
        <Text style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>
          Datum: {format(new Date(), 'dd MMMM yyyy', { locale: nl })}
        </Text>
      </View>
    </Page>
  </Document>
);

// ============================================================================
// Export types for TypeScript
// ============================================================================

export type {
  ContractData,
  InvoiceData,
  ProposalData,
  NDAData,
  MeetingNotesData,
};
