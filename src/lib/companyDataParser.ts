/**
 * Company Data Parser
 * Parse company data from various sources (Drimble, Apollo, KVK)
 */

interface ParsedCompanyData {
  name?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  kvk_number?: string;
  linkedin_url?: string;
  company_size?: string;
}

/**
 * Parse company data from Drimble-style text
 * Expected format: company info from Drimble page copy-paste
 */
export function parseDrimbleText(text: string): ParsedCompanyData {
  const result: ParsedCompanyData = {};
  
  // Extract email (multiple formats)
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.[\w]+/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }
  
  // Extract phone (Dutch formats)
  const phoneMatch = text.match(/(?:\+31|0031|0)[\s-]?[1-9](?:[\s-]?\d){8}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0].replace(/[\s-]/g, '');
  }
  
  // Extract website (http/https URLs)
  const websiteMatch = text.match(/https?:\/\/(?:www\.)?[\w.-]+\.\w{2,}(?:\/[^\s]*)?/);
  if (websiteMatch) {
    result.website = websiteMatch[0];
  }
  
  // Extract KVK number (8 digits)
  const kvkMatch = text.match(/\bKVK[:\s]*(\d{8})\b/i) || text.match(/\b(\d{8})\b/);
  if (kvkMatch) {
    result.kvk_number = kvkMatch[1];
  }
  
  // Extract LinkedIn URL
  const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[\w-]+/);
  if (linkedinMatch) {
    result.linkedin_url = linkedinMatch[0];
  }
  
  // Extract address (Dutch format: street number, postcode city)
  const addressMatch = text.match(/([A-Za-z\s]+\s\d+[a-zA-Z]?),?\s*(\d{4}\s?[A-Z]{2})\s+([A-Za-z\s]+)/);
  if (addressMatch) {
    result.address = {
      street: addressMatch[1].trim(),
      postal_code: addressMatch[2].replace(/\s/g, ''),
      city: addressMatch[3].trim(),
      country: 'Nederland',
    };
  }
  
  // Extract company name (first line, typically)
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length > 0 && !result.email?.includes(lines[0]) && !result.website?.includes(lines[0])) {
    // Take first line that's not email/website/phone as company name
    const firstLine = lines[0].trim();
    if (firstLine.length > 2 && firstLine.length < 100) {
      result.name = firstLine;
    }
  }
  
  return result;
}

/**
 * Parse company size from various formats
 */
export function parseCompanySize(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('1-10') || lowerText.includes('1 tot 10')) return '1-10';
  if (lowerText.includes('11-50') || lowerText.includes('11 tot 50')) return '11-50';
  if (lowerText.includes('51-200') || lowerText.includes('51 tot 200')) return '51-200';
  if (lowerText.includes('201-500') || lowerText.includes('201 tot 500')) return '201-500';
  if (lowerText.includes('500+') || lowerText.includes('501+')) return '501+';
  
  return undefined;
}

/**
 * Validate and clean phone number
 */
export function cleanPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Convert international format to national
  if (cleaned.startsWith('31')) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.startsWith('0031')) {
    cleaned = '0' + cleaned.substring(4);
  }
  
  return cleaned;
}

/**
 * Format KVK number
 */
export function formatKVKNumber(kvk: string): string {
  const cleaned = kvk.replace(/\D/g, '');
  return cleaned.substring(0, 8);
}
