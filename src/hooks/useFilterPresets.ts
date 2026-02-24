import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Persists named filter presets to localStorage, scoped per user and namespace.
 * Usage: const { presets, savePreset, deletePreset } = useFilterPresets<MyFilters>('companies');
 */
export function useFilterPresets<T>(namespace: string) {
  const { profile } = useAuth();
  const storageKey = `filter_presets_${namespace}_${profile?.id || 'guest'}`;

  const [presets, setPresets] = useState<Record<string, T>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(presets));
  }, [presets, storageKey]);

  const savePreset = (name: string, filters: T) => {
    setPresets(prev => ({ ...prev, [name]: filters }));
  };

  const deletePreset = (name: string) => {
    setPresets(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  return { presets, savePreset, deletePreset };
}
