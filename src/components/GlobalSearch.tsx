import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Users, FolderKanban, Search, Loader2 } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  companies: { id: string; name: string; status: string | null }[];
  contacts: { id: string; first_name: string; last_name: string; email: string | null }[];
  projects: { id: string; title: string; stage: string | null }[];
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ companies: [], contacts: [], projects: [] });
  const [isLoading, setIsLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ companies: [], contacts: [], projects: [] });
      return;
    }
    setIsLoading(true);
    try {
      const [companiesRes, contactsRes, projectsRes] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, status')
          .ilike('name', `%${q}%`)
          .limit(5),
        supabase
          .from('contacts')
          .select('id, first_name, last_name, email')
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(5),
        supabase
          .from('projects')
          .select('id, title, stage')
          .ilike('title', `%${q}%`)
          .limit(5),
      ]);
      setResults({
        companies: (companiesRes.data || []) as SearchResult['companies'],
        contacts: (contactsRes.data || []) as SearchResult['contacts'],
        projects: (projectsRes.data || []) as SearchResult['projects'],
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults({ companies: [], contacts: [], projects: [] });
    }
  }, [open]);

  // Ctrl+/ shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onOpenChange]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const hasResults =
    results.companies.length > 0 ||
    results.contacts.length > 0 ||
    results.projects.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t('common.searchPlaceholder', 'Zoek bedrijven, contacten, projecten...')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">{t('common.searching', 'Zoeken...')}</span>
          </div>
        )}

        {!isLoading && debouncedQuery.length >= 2 && !hasResults && (
          <CommandEmpty>
            {t('common.noResultsFor', 'Geen resultaten voor')} &ldquo;{debouncedQuery}&rdquo;
          </CommandEmpty>
        )}

        {!isLoading && debouncedQuery.length < 2 && (
          <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
            <Search className="h-4 w-4" />
            <span className="text-sm">{t('common.typeToSearch', 'Typ minimaal 2 tekens om te zoeken')}</span>
          </div>
        )}

        {results.companies.length > 0 && (
          <CommandGroup heading={t('navigation.companies', 'Bedrijven')}>
            {results.companies.map((c) => (
              <CommandItem
                key={c.id}
                value={`company-${c.id}-${c.name}`}
                onSelect={() => handleSelect(`/companies/${c.id}`)}
              >
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{c.name}</span>
                {c.status && (
                  <span className="ml-auto text-xs text-muted-foreground capitalize shrink-0">
                    {c.status}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.companies.length > 0 && results.contacts.length > 0 && <CommandSeparator />}

        {results.contacts.length > 0 && (
          <CommandGroup heading={t('navigation.contacts', 'Contacten')}>
            {results.contacts.map((c) => (
              <CommandItem
                key={c.id}
                value={`contact-${c.id}-${c.first_name}-${c.last_name}`}
                onSelect={() => handleSelect(`/contacts/${c.id}`)}
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {c.first_name} {c.last_name}
                </span>
                {c.email && (
                  <span className="ml-auto text-xs text-muted-foreground truncate max-w-[160px] shrink-0">
                    {c.email}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.contacts.length > 0 && results.projects.length > 0 && <CommandSeparator />}

        {results.projects.length > 0 && (
          <CommandGroup heading={t('navigation.projects', 'Projecten')}>
            {results.projects.map((p) => (
              <CommandItem
                key={p.id}
                value={`project-${p.id}-${p.title}`}
                onSelect={() => handleSelect(`/projects/${p.id}`)}
              >
                <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{p.title}</span>
                {p.stage && (
                  <span className="ml-auto text-xs text-muted-foreground capitalize shrink-0">
                    {p.stage.replace('_', ' ')}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
