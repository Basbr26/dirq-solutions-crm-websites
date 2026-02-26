/**
 * Dashboard Statistics Hooks
 * Real-time metrics for CRM dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format, startOfWeek, endOfWeek } from 'date-fns';

interface MonthlyRevenue {
  month: string;
  revenue: number;
  target: number;
}

interface QuoteAcceptance {
  month: string;
  rate: number;
  accepted: number;
  total: number;
}

interface TrendData {
  current: number;
  previous: number;
  percentage: number;
}

/**
 * Fetch monthly revenue from completed projects (last 6 months)
 */
export function useMonthlyRevenue() {
  return useQuery({
    queryKey: ['dashboard', 'monthly-revenue'],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = startOfMonth(date).toISOString();
        const endDate = startOfMonth(subMonths(new Date(), i - 1)).toISOString();

        const { data, error } = await supabase
          .from('projects')
          .select('value')
          .eq('stage', 'live')
          .gte('updated_at', startDate)
          .lt('updated_at', endDate);

        if (error) throw error;

        const revenue = data?.reduce((sum, p) => sum + (p.value || 0), 0) || 0;
        
        months.push({
          month: format(date, 'MMM'),
          revenue,
          target: revenue * 1.15, // Target is 15% higher
        });
      }

      return months as MonthlyRevenue[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Fetch quote acceptance rates (last 6 months)
 */
export function useQuoteAcceptanceTrend() {
  return useQuery({
    queryKey: ['dashboard', 'quote-acceptance-trend'],
    queryFn: async () => {
      const months = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = startOfMonth(date).toISOString();
        const endDate = startOfMonth(subMonths(new Date(), i - 1)).toISOString();

        const { data, error } = await supabase
          .from('quotes')
          .select('status')
          .gte('created_at', startDate)
          .lt('created_at', endDate);

        if (error) throw error;

        const total = data?.length || 0;
        const accepted = data?.filter(q => q.status === 'accepted').length || 0;
        const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;

        months.push({
          month: format(date, 'MMM'),
          rate,
          accepted,
          total,
        });
      }

      return months as QuoteAcceptance[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Calculate pipeline value trend (current month vs previous month)
 */
export function usePipelineTrend() {
  return useQuery({
    queryKey: ['dashboard', 'pipeline-trend'],
    queryFn: async () => {
      const thisMonthStart = startOfMonth(new Date()).toISOString();
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
      const lastMonthEnd = thisMonthStart;

      // Current month active projects
      const { data: currentData, error: currentError } = await supabase
        .from('projects')
        .select('value')
        .in('stage', ['lead', 'quote_requested', 'quote_sent', 'negotiation', 'quote_signed', 'in_development', 'review'])
        .gte('created_at', thisMonthStart);

      if (currentError) throw currentError;

      // Previous month snapshot (projects that were active then)
      const { data: previousData, error: previousError } = await supabase
        .from('projects')
        .select('value')
        .in('stage', ['lead', 'quote_requested', 'quote_sent', 'negotiation', 'quote_signed', 'in_development', 'review'])
        .gte('created_at', lastMonthStart)
        .lt('created_at', lastMonthEnd);

      if (previousError) throw previousError;

      const current = currentData?.reduce((sum, p) => sum + (p.value || 0), 0) || 0;
      const previous = previousData?.reduce((sum, p) => sum + (p.value || 0), 0) || 0;
      const percentage = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

      return { current, previous, percentage } as TrendData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Calculate weighted pipeline trend (current vs previous month)
 */
export function useWeightedPipelineTrend() {
  return useQuery({
    queryKey: ['dashboard', 'weighted-pipeline-trend'],
    queryFn: async () => {
      const thisMonthStart = startOfMonth(new Date()).toISOString();
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
      const lastMonthEnd = thisMonthStart;

      // Current month
      const { data: currentData, error: currentError } = await supabase
        .from('projects')
        .select('value, probability')
        .in('stage', ['lead', 'quote_requested', 'quote_sent', 'negotiation', 'quote_signed', 'in_development', 'review'])
        .gte('created_at', thisMonthStart);

      if (currentError) throw currentError;

      // Previous month
      const { data: previousData, error: previousError } = await supabase
        .from('projects')
        .select('value, probability')
        .in('stage', ['lead', 'quote_requested', 'quote_sent', 'negotiation', 'quote_signed', 'in_development', 'review'])
        .gte('created_at', lastMonthStart)
        .lt('created_at', lastMonthEnd);

      if (previousError) throw previousError;

      const current = currentData?.reduce((sum, p) => sum + (p.value || 0) * (p.probability || 0) / 100, 0) || 0;
      const previous = previousData?.reduce((sum, p) => sum + (p.value || 0) * (p.probability || 0) / 100, 0) || 0;
      const percentage = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

      return { current, previous, percentage } as TrendData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Calculate quote acceptance rate trend
 */
export function useQuoteAcceptanceRateTrend() {
  return useQuery({
    queryKey: ['dashboard', 'quote-acceptance-rate-trend'],
    queryFn: async () => {
      const thisMonthStart = startOfMonth(new Date()).toISOString();
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
      const lastMonthEnd = thisMonthStart;

      // Current month
      const { data: currentData, error: currentError } = await supabase
        .from('quotes')
        .select('status')
        .gte('created_at', thisMonthStart);

      if (currentError) throw currentError;

      // Previous month
      const { data: previousData, error: previousError } = await supabase
        .from('quotes')
        .select('status')
        .gte('created_at', lastMonthStart)
        .lt('created_at', lastMonthEnd);

      if (previousError) throw previousError;

      const currentTotal = currentData?.length || 0;
      const currentAccepted = currentData?.filter(q => q.status === 'accepted').length || 0;
      const current = currentTotal > 0 ? Math.round((currentAccepted / currentTotal) * 100) : 0;

      const previousTotal = previousData?.length || 0;
      const previousAccepted = previousData?.filter(q => q.status === 'accepted').length || 0;
      const previous = previousTotal > 0 ? Math.round((previousAccepted / previousTotal) * 100) : 0;

      const percentage = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

      return { current, previous, percentage } as TrendData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Count deals closed this week
 */
export function useDealsThisWeek() {
  return useQuery({
    queryKey: ['dashboard', 'deals-this-week'],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

      const { data, error } = await supabase
        .from('projects')
        .select('id, title, value')
        .eq('stage', 'live')
        .gte('updated_at', weekStart)
        .lte('updated_at', weekEnd);

      if (error) throw error;

      return {
        count: data?.length || 0,
        deals: data || [],
        totalValue: data?.reduce((sum, d) => sum + (d.value || 0), 0) || 0,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get company and contact counts
 */
export function useEntityCounts() {
  return useQuery({
    queryKey: ['dashboard', 'entity-counts'],
    queryFn: async () => {
      const [companiesResult, contactsResult] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
      ]);

      if (companiesResult.error) throw companiesResult.error;
      if (contactsResult.error) throw contactsResult.error;

      return {
        companies: companiesResult.count || 0,
        contacts: contactsResult.count || 0,
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
