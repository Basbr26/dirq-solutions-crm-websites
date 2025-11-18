// Extended types for verzuim document signing integration

export type DocumentType = 
  | 'algemeen'
  | 'reintegratie_plan'
  | 'plan_van_aanpak'
  | 'probleemanalyse'
  | 'evaluatie_42_weken'
  | 'evaluatie_1_jaar'
  | 'evaluatie_2_jaar'
  | 'toestemming_bedrijfsarts'
  | 'toestemming_arbeidsdeskundige'
  | 'medische_informatie'
  | 'werk_aanpassing'
  | 'correspondentie'
  | 'overig';

export type SignatureRole = 'employee' | 'manager' | 'hr' | 'bedrijfsarts';

export interface VerzuimDocument {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string;
  status: 'pending' | 'completed';
  created_at: string;
  // Nieuwe velden voor verzuim integratie
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
  algemeen: 'Algemeen Document',
  reintegratie_plan: 'Re-integratieplan',
  plan_van_aanpak: 'Plan van Aanpak',
  probleemanalyse: 'Probleemanalyse',
  evaluatie_42_weken: 'Evaluatie 42 weken',
  evaluatie_1_jaar: 'Evaluatie 1 jaar',
  evaluatie_2_jaar: 'Evaluatie 2 jaar',
  toestemming_bedrijfsarts: 'Toestemming Bedrijfsarts',
  toestemming_arbeidsdeskundige: 'Toestemming Arbeidsdeskundige',
  medische_informatie: 'Medische Informatie',
  werk_aanpassing: 'Werk Aanpassing',
  correspondentie: 'Correspondentie',
  overig: 'Overig',
};

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
    case 'reintegratie_plan':
      // Binnen 6 weken
      return new Date(start.getTime() + (6 * 7 * 24 * 60 * 60 * 1000));
    
    case 'plan_van_aanpak':
      // Week 6-8
      return new Date(start.getTime() + (8 * 7 * 24 * 60 * 60 * 1000));
    
    case 'evaluatie_42_weken':
      // 42 weken
      return new Date(start.getTime() + (42 * 7 * 24 * 60 * 60 * 1000));
    
    case 'evaluatie_1_jaar':
      // 1 jaar
      return new Date(start.getTime() + (365 * 24 * 60 * 60 * 1000));
    
    case 'evaluatie_2_jaar':
      // 2 jaar
      return new Date(start.getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
    
    default:
      // Standaard 14 dagen
      return new Date(start.getTime() + (14 * 24 * 60 * 60 * 1000));
  }
}
