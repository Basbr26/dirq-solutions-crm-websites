/**
 * Generate Quote from Project
 * Utility to automatically generate a quote from a project with Finance template
 */

import { 
  generateFinanceStarterQuote, 
  generateFinanceGrowthQuote,
  type QuoteTemplateData 
} from '@/features/quotes/templates/financeQuoteTemplates';
import type { CreateQuoteInput } from '@/types/quotes';
import { format, addDays } from 'date-fns';

interface CompanyData {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  kvk_number?: string;
  vat_number?: string;
}

interface ContactData {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

interface ProjectData {
  company_id: string;
  contact_id?: string;
  package_id?: 'finance_starter' | 'finance_growth';
  title: string;
}

export interface GenerateQuoteParams {
  project: ProjectData;
  company: CompanyData;
  contact?: ContactData;
  quoteNumber?: string;
}

/**
 * Generate a complete quote input from project and template data
 */
export const generateQuoteFromProject = async (
  params: GenerateQuoteParams
): Promise<CreateQuoteInput> => {
  const { project, company, contact, quoteNumber } = params;

  // Generate quote number if not provided
  const finalQuoteNumber = quoteNumber || `OFF-${Date.now()}`;
  
  // Set dates
  const quoteDate = format(new Date(), 'yyyy-MM-dd');
  const validUntil = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  // Prepare template data from CRM
  const templateData: QuoteTemplateData = {
    companyName: company.name,
    companyAddress: company.address,
    companyCity: company.city,
    companyPostalCode: company.postal_code,
    companyKvk: company.kvk_number,
    companyVat: company.vat_number,
    contactFirstName: contact?.first_name || '',
    contactLastName: contact?.last_name || '',
    contactEmail: contact?.email,
    contactPhone: contact?.phone,
    quoteNumber: finalQuoteNumber,
    quoteDate,
    validUntil,
  };

  // Generate quote based on package type
  let template;
  if (project.package_id === 'finance_starter') {
    template = generateFinanceStarterQuote(templateData);
  } else if (project.package_id === 'finance_growth') {
    template = generateFinanceGrowthQuote(templateData);
  } else {
    throw new Error('Geen geldig Finance pakket geselecteerd');
  }

  // Convert template to CreateQuoteInput
  const quoteInput: CreateQuoteInput = {
    company_id: company.id,
    contact_id: contact?.id,
    quote_number: finalQuoteNumber,
    title: template.title,
    description: template.description,
    subtotal: template.subtotal,
    tax_rate: template.tax_rate,
    tax_amount: template.tax_amount,
    total_amount: template.total_amount,
    currency: 'EUR',
    valid_until: validUntil,
    payment_terms: template.payment_terms,
    delivery_time: template.delivery_time,
    notes: template.notes,
    client_notes: template.client_notes,
    items: template.items.map(item => ({
      title: item.title,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      category: item.category,
    })),
  };

  return quoteInput;
};

/**
 * Check if a project has a Finance package that can generate a quote
 */
export const canGenerateQuote = (packageId?: string): boolean => {
  return packageId === 'finance_starter' || packageId === 'finance_growth';
};

/**
 * Get the template name for display
 */
export const getTemplateDisplayName = (packageId?: string): string => {
  if (packageId === 'finance_starter') return 'Finance Starter Offerte';
  if (packageId === 'finance_growth') return 'Finance Growth Offerte';
  return 'Standaard Offerte';
};
