/**
 * useQuoteStatusConfig Hook
 * Provides localized status configuration for quotes
 * Centralizes status config to ensure consistent translations
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Send, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { QuoteStatus } from '@/types/quotes';

interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ElementType;
  color: string;
}

export function useQuoteStatusConfig(): Record<QuoteStatus | 'signed', StatusConfig> {
  const { t } = useTranslation();

  return useMemo(() => {
    return {
      draft: {
        label: t('quotes.statuses.draft'),
        variant: 'secondary',
        icon: FileText,
        color: 'bg-gray-500/10 text-gray-500'
      },
      sent: {
        label: t('quotes.statuses.sent'),
        variant: 'default',
        icon: Send,
        color: 'bg-blue-500/10 text-blue-500'
      },
      viewed: {
        label: t('quotes.statuses.viewed'),
        variant: 'outline',
        icon: Eye,
        color: 'bg-purple-500/10 text-purple-500'
      },
      accepted: {
        label: t('quotes.statuses.accepted'),
        variant: 'default',
        icon: CheckCircle2,
        color: 'bg-green-500/10 text-green-500'
      },
      rejected: {
        label: t('quotes.statuses.rejected'),
        variant: 'destructive',
        icon: XCircle,
        color: 'bg-red-500/10 text-red-500'
      },
      expired: {
        label: t('quotes.statuses.expired'),
        variant: 'outline',
        icon: Clock,
        color: 'bg-orange-500/10 text-orange-500'
      },
      signed: {
        label: t('quotes.statuses.signed'),
        variant: 'default',
        icon: CheckCircle2,
        color: 'bg-emerald-500/10 text-emerald-600'
      },
    };
  }, [t]);
}
