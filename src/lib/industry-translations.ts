/**
 * Industry Name Translations
 * Maps English industry names to Dutch translations
 */

export const industryTranslations: Record<string, string> = {
  'Technology': 'Technologie',
  'Finance': 'Financiën',
  'Healthcare': 'Gezondheidszorg',
  'Retail': 'Detailhandel',
  'Manufacturing': 'Productie',
  'Real Estate': 'Vastgoed',
  'Education': 'Onderwijs',
  'Consulting': 'Consultancy',
  'Marketing': 'Marketing',
  'Legal': 'Juridisch',
};

/**
 * Get translated industry name
 * Falls back to original name if translation not found
 */
export function getIndustryName(englishName: string, currentLanguage: string = 'nl'): string {
  if (currentLanguage === 'en') {
    return englishName;
  }
  
  return industryTranslations[englishName] || englishName;
}
