import i18n from './i18n';

/**
 * Format date according to user's language
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'medium' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = 
    format === 'short'
      ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : format === 'medium'
      ? { year: 'numeric', month: 'short', day: 'numeric' }
      : { year: 'numeric', month: 'long', day: 'numeric' };
  
  return new Intl.DateTimeFormat(i18n.language, options).format(dateObj);
}

/**
 * Format date and time according to user's language
 */
export function formatDateTime(date: Date | string, includeSeconds = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' })
  };
  
  return new Intl.DateTimeFormat(i18n.language, options).format(dateObj);
}

/**
 * Format time according to user's language
 */
export function formatTime(date: Date | string, includeSeconds = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' })
  };
  
  return new Intl.DateTimeFormat(i18n.language, options).format(dateObj);
}

/**
 * Format currency according to user's language
 */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Format number with locale-specific separators
 */
export function formatNumber(num: number, decimals?: number): string {
  const options: Intl.NumberFormatOptions = decimals !== undefined 
    ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
    : {};
    
  return new Intl.NumberFormat(i18n.language, options).format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 0): string {
  return new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
  
  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
}

/**
 * Get current language
 */
export function getCurrentLanguage(): string {
  return i18n.language;
}

/**
 * Change language
 */
export async function changeLanguage(lng: string): Promise<void> {
  await i18n.changeLanguage(lng);
}

/**
 * Get available languages
 */
export const languages = [
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
] as const;

export type Language = typeof languages[number];
