/**
 * useFilterParams Hook
 * Synchronizes filter state with URL parameters
 * Enables shareable filtered views (e.g., ?stages=negotiation,quote_sent&min_value=5000)
 * Allows Manus AI to deep link to specific filtered lists
 */

import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import type { AdvancedProjectFilters, ProjectStage } from '@/types/projects';
import type { AdvancedCompanyFilters } from '@/types/crm';

/**
 * Hook for Projects filter URL sync
 */
export function useProjectFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL params into filter object
  const filters = useMemo((): AdvancedProjectFilters => {
    const params: AdvancedProjectFilters = {};

    // Basic search
    const search = searchParams.get('search');
    if (search) params.search = search;

    // Multiple stages (comma-separated: ?stages=negotiation,quote_sent)
    const stages = searchParams.get('stages');
    if (stages) {
      params.stages = stages.split(',') as ProjectStage[];
    }

    // Value range
    const value_min = searchParams.get('value_min');
    if (value_min) params.value_min = Number(value_min);
    
    const value_max = searchParams.get('value_max');
    if (value_max) params.value_max = Number(value_max);

    // Date range
    const created_after = searchParams.get('created_after');
    if (created_after) params.created_after = created_after;
    
    const created_before = searchParams.get('created_before');
    if (created_before) params.created_before = created_before;

    // Probability range
    const probability_min = searchParams.get('probability_min');
    if (probability_min) params.probability_min = Number(probability_min);
    
    const probability_max = searchParams.get('probability_max');
    if (probability_max) params.probability_max = Number(probability_max);

    // Single values (backward compatible)
    const stage = searchParams.get('stage');
    if (stage) params.stage = stage as ProjectStage;

    const owner_id = searchParams.get('owner_id');
    if (owner_id) params.owner_id = owner_id;

    const company_id = searchParams.get('company_id');
    if (company_id) params.company_id = company_id;

    return params;
  }, [searchParams]);

  // Update URL params when filters change
  const updateFilters = useCallback((newFilters: AdvancedProjectFilters) => {
    const params = new URLSearchParams();

    // Add non-empty filter values to URL
    if (newFilters.search) params.set('search', newFilters.search);
    
    // Multiple stages as comma-separated string
    if (newFilters.stages && newFilters.stages.length > 0) {
      params.set('stages', newFilters.stages.join(','));
    }
    
    if (newFilters.value_min !== undefined) {
      params.set('value_min', String(newFilters.value_min));
    }
    if (newFilters.value_max !== undefined) {
      params.set('value_max', String(newFilters.value_max));
    }
    
    if (newFilters.created_after) {
      params.set('created_after', newFilters.created_after);
    }
    if (newFilters.created_before) {
      params.set('created_before', newFilters.created_before);
    }
    
    if (newFilters.probability_min !== undefined) {
      params.set('probability_min', String(newFilters.probability_min));
    }
    if (newFilters.probability_max !== undefined) {
      params.set('probability_max', String(newFilters.probability_max));
    }

    // Backward compatible single values
    if (newFilters.stage) params.set('stage', newFilters.stage);
    if (newFilters.owner_id) params.set('owner_id', newFilters.owner_id);
    if (newFilters.company_id) params.set('company_id', newFilters.company_id);

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    filters,
    updateFilters,
    clearFilters,
  };
}

/**
 * Hook for Companies filter URL sync
 */
export function useCompanyFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo((): AdvancedCompanyFilters => {
    const params: AdvancedCompanyFilters = {};

    const search = searchParams.get('search');
    if (search) params.search = search;

    // Multiple statuses
    const status = searchParams.get('status');
    if (status) {
      params.status = status.split(',') as any[];
    }

    // Multiple priorities
    const priority = searchParams.get('priority');
    if (priority) {
      params.priority = priority.split(',') as any[];
    }

    // Date range
    const created_after = searchParams.get('created_after');
    if (created_after) params.created_after = created_after;
    
    const created_before = searchParams.get('created_before');
    if (created_before) params.created_before = created_before;

    // Revenue range
    const revenue_min = searchParams.get('revenue_min');
    if (revenue_min) params.revenue_min = Number(revenue_min);
    
    const revenue_max = searchParams.get('revenue_max');
    if (revenue_max) params.revenue_max = Number(revenue_max);

    return params;
  }, [searchParams]);

  const updateFilters = useCallback((newFilters: AdvancedCompanyFilters) => {
    const params = new URLSearchParams();

    if (newFilters.search) params.set('search', newFilters.search);
    
    if (newFilters.status && newFilters.status.length > 0) {
      params.set('status', newFilters.status.join(','));
    }
    
    if (newFilters.priority && newFilters.priority.length > 0) {
      params.set('priority', newFilters.priority.join(','));
    }
    
    if (newFilters.created_after) {
      params.set('created_after', newFilters.created_after);
    }
    if (newFilters.created_before) {
      params.set('created_before', newFilters.created_before);
    }
    
    if (newFilters.revenue_min !== undefined) {
      params.set('revenue_min', String(newFilters.revenue_min));
    }
    if (newFilters.revenue_max !== undefined) {
      params.set('revenue_max', String(newFilters.revenue_max));
    }

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    filters,
    updateFilters,
    clearFilters,
  };
}

/**
 * Generate shareable filter URL
 * Example usage:
 * const url = generateFilterUrl('/projects', { stages: ['negotiation', 'quote_sent'], value_min: 5000 });
 * // Returns: /projects?stages=negotiation,quote_sent&value_min=5000
 * 
 * Useful for:
 * - Sharing filtered views with team
 * - Manus AI deep linking to specific lists
 * - n8n workflows that need to link to filtered data
 */
export function generateFilterUrl(
  basePath: string,
  filters: AdvancedProjectFilters | AdvancedCompanyFilters
): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','));
      }
    } else {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
