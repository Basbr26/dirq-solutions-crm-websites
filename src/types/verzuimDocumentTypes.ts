// Extended types for document generation and signing

// Document Types - Verzuim + HR
export type DocumentType = 
  // Verzuim (Wet Poortwachter)
  | 'probleemanalyse'
  | 'plan_van_aanpak'
  | 'evaluatie_3_maanden'
  | 'evaluatie_6_maanden'
  | 'evaluatie_1_jaar'
  | 'herstelmelding'
  | 'uwv_melding'
  | 'gespreksverslag'
  // HR Documents
  | 'arbeidsovereenkomst'
  | 'nda'
  | 'onboarding_checklist'
  | 'bewijs_van_indiensttreding'
  | 'referentie_brief'
  | 'contract_verlenging'
  // HR Rapporten (gegenereerd uit notities)
  | 'hr_rapport'
  | 'overig';

export type SignatureRole = 'employee' | 'manager' | 'hr' | 'bedrijfsarts';

export interface VerzuimDocument {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string;
  status: 'pending' | 'completed';
  created_at: string;
  case_id?: string;
  document_type?: DocumentType;
  requires_signatures?: SignatureRole[];
  owner_signed?: boolean;
  owner_signature_data?: string;
  owner_signed_at?: string;
  signed_file_path?: string;
}

export interface DocumentInvitation {
  id: string;
  document_id: string;
  email: string;
  verification_code: string;
  signed: boolean;
  signature_data?: string;
  signed_document_path?: string;
  signed_at?: string;
  created_at: string;
}

export interface SickLeaveCase {
  id: string;
  employee_id: string;
  start_date: string;
  end_date?: string;
  functional_limitations: string;
  case_status: 'actief' | 'herstel_gemeld' | 'gesloten' | 'archief';
  created_by: string;
  created_at: string;
  expected_duration?: string;
  expected_recovery_date?: string;
  availability_notes?: string;
  can_work_partial?: boolean;
  partial_work_description?: string;
  employee?: {
    voornaam: string;
    achternaam: string;
    email: string;
  };
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  // Verzuim
  probleemanalyse: 'Probleemanalyse',
  plan_van_aanpak: 'Plan van Aanpak',
  evaluatie_3_maanden: 'Evaluatie 3 maanden',
  evaluatie_6_maanden: 'Evaluatie 6 maanden (42 weken)',
  evaluatie_1_jaar: 'Evaluatie 1 jaar',
  herstelmelding: 'Herstelmelding',
  uwv_melding: 'UWV 42-weken melding',
  gespreksverslag: 'Gespreksverslag',
  // HR
  arbeidsovereenkomst: 'Arbeidsovereenkomst',
  nda: 'Geheimhoudingsverklaring (NDA)',
  onboarding_checklist: 'Onboarding Checklist',
  bewijs_van_indiensttreding: 'Bewijs van Indiensttreding',
  referentie_brief: 'Referentiebrief',
  contract_verlenging: 'Contract Verlenging',
  hr_rapport: 'HR Rapport (uit notities)',
  overig: 'Overig',
};

export const DOCUMENT_TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  // Verzuim
  probleemanalyse: 'Verplicht binnen 6 weken - Analyse van verzuimoorzaak en belemmeringen',
  plan_van_aanpak: 'Week 6-8 - Concrete stappen en doelstellingen voor re-integratie',
  evaluatie_3_maanden: '3 maanden - Voortgangsevaluatie re-integratie',
  evaluatie_6_maanden: '42 weken - Verplichte evaluatie en UWV voorbereiding',
  evaluatie_1_jaar: '1 jaar - Uitgebreide evaluatie en bijstelling plan',
  herstelmelding: 'Bij (gedeeltelijk) herstel - Officiële herstelmelding',
  uwv_melding: '42 weken - Verplichte ziekmelding aan UWV',
  gespreksverslag: 'Vastleggen van afspraken uit gesprekken met handtekeningen',
  // HR
  arbeidsovereenkomst: 'Contract tussen werkgever en werknemer',
  nda: 'Geheimhoudingsverklaring voor vertrouwelijke informatie',
  onboarding_checklist: 'Checklist met alle onboarding stappen',
  bewijs_van_indiensttreding: 'Officieel document voor gemeente/instanties',
  referentie_brief: 'Referentie voor voormalige medewerker',
  contract_verlenging: 'Verlenging van bestaand contract',
  hr_rapport: 'Performance review, feedback rapport of PIP gegenereerd uit HR notities',
  overig: 'Overige documentatie',
};

// Helper to categorize document types
export const DOCUMENT_CATEGORIES = {
  verzuim: ['probleemanalyse', 'plan_van_aanpak', 'evaluatie_3_maanden', 'evaluatie_6_maanden', 'evaluatie_1_jaar', 'herstelmelding', 'uwv_melding', 'gespreksverslag'] as DocumentType[],
  hr: ['arbeidsovereenkomst', 'nda', 'onboarding_checklist', 'bewijs_van_indiensttreding', 'referentie_brief', 'contract_verlenging', 'hr_rapport'] as DocumentType[],
} as const;

export const SIGNATURE_ROLE_LABELS: Record<SignatureRole, string> = {
  employee: 'Medewerker',
  manager: 'Manager',
  hr: 'HR',
  bedrijfsarts: 'Bedrijfsarts',
};

// Wet Poortwachter deadlines helper
export function getDocumentDeadline(documentType: DocumentType, startDate: string): Date {
  const start = new Date(startDate);
  
  switch (documentType) {
    case 'probleemanalyse':
      // Binnen 6 weken
      return new Date(start.getTime() + (6 * 7 * 24 * 60 * 60 * 1000));
    
    case 'plan_van_aanpak':
      // Week 6-8
      return new Date(start.getTime() + (8 * 7 * 24 * 60 * 60 * 1000));
    
    case 'evaluatie_3_maanden':
      // 3 maanden
      return new Date(start.getTime() + (13 * 7 * 24 * 60 * 60 * 1000));
    
    case 'evaluatie_6_maanden':
    case 'uwv_melding':
      // 42 weken
      return new Date(start.getTime() + (42 * 7 * 24 * 60 * 60 * 1000));
    
    case 'evaluatie_1_jaar':
      // 1 jaar
      return new Date(start.getTime() + (365 * 24 * 60 * 60 * 1000));
    
    case 'herstelmelding':
      // Binnen 1 week na herstel
      return new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
    
    default:
      // Standaard 14 dagen
      return new Date(start.getTime() + (14 * 24 * 60 * 60 * 1000));
  }
}

// Bepaal welke documenten relevant zijn op basis van verzuimduur
export function getRelevantDocumentTypes(startDate: string): DocumentType[] {
  const start = new Date(startDate);
  const now = new Date();
  const weeksSinceStart = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  
  const relevant: DocumentType[] = [];
  
  // Altijd beschikbaar
  relevant.push('overig');
  relevant.push('herstelmelding');
  relevant.push('gespreksverslag');
  
  // Probleemanalyse: relevant vanaf week 1
  if (weeksSinceStart >= 0) {
    relevant.unshift('probleemanalyse');
  }
  
  // Plan van Aanpak: relevant vanaf week 6
  if (weeksSinceStart >= 6) {
    relevant.unshift('plan_van_aanpak');
  }
  
  // Evaluatie 3 maanden: relevant vanaf week 10
  if (weeksSinceStart >= 10) {
    relevant.unshift('evaluatie_3_maanden');
  }
  
  // Evaluatie 42 weken + UWV: relevant vanaf week 38
  if (weeksSinceStart >= 38) {
    relevant.unshift('evaluatie_6_maanden');
    relevant.unshift('uwv_melding');
  }
  
  // Evaluatie 1 jaar: relevant vanaf week 48
  if (weeksSinceStart >= 48) {
    relevant.unshift('evaluatie_1_jaar');
  }
  
  return relevant;
}