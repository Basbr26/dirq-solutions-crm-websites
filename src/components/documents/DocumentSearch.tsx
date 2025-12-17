/**
 * Document Search Component
 * Full-text and semantic search through documents
 */

import { useState } from 'react';
import { Search, Filter, FileText, Calendar, User, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchResult {
  document_id: string;
  title: string;
  extracted_text: string;
  category: string;
  rank: number;
  created_at: string;
  uploaded_by_name?: string;
}

interface DocumentSearchProps {
  onDocumentSelect?: (documentId: string) => void;
}

export function DocumentSearch({ onDocumentSelect }: DocumentSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchMode, setSearchMode] = useState<'fulltext' | 'semantic'>('fulltext');

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['document-search', searchQuery, selectedCategory, searchMode],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      if (searchMode === 'fulltext') {
        const { data, error } = await supabase.rpc('search_documents_fulltext', {
          search_query: searchQuery,
          doc_category: selectedCategory === 'all' ? null : selectedCategory,
        });

        if (error) throw error;
        return data ? ((data as unknown) as SearchResult[]) : [];
      } else {
        // Semantic search would require generating embeddings first
        // For now, fallback to fulltext
        const { data, error } = await supabase.rpc('search_documents_fulltext', {
          search_query: searchQuery,
          doc_category: selectedCategory === 'all' ? null : selectedCategory,
        });

        if (error) throw error;
        return (data as unknown) as SearchResult[];
      }
    },
    enabled: searchQuery.trim().length > 0,
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      refetch();
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      arbeidscontract: 'bg-blue-500',
      medisch: 'bg-red-500',
      training: 'bg-green-500',
      persoonlijk: 'bg-purple-500',
      factuur: 'bg-yellow-500',
      overig: 'bg-gray-500',
    };
    return colors[category] || colors.overig;
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Documenten Zoeken</CardTitle>
          <CardDescription>
            Zoek door alle documenten met full-text of semantische zoekfunctie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek in documenten... (bijv. 'contract met proeftijd' of 'rugklachten')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Zoeken</Button>
          </div>

          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle categorieën</SelectItem>
                <SelectItem value="arbeidscontract">Arbeidscontracten</SelectItem>
                <SelectItem value="medisch">Medische documenten</SelectItem>
                <SelectItem value="training">Training certificaten</SelectItem>
                <SelectItem value="persoonlijk">Persoonlijke documenten</SelectItem>
                <SelectItem value="factuur">Facturen</SelectItem>
                <SelectItem value="overig">Overig</SelectItem>
              </SelectContent>
            </Select>

            <Select value={searchMode} onValueChange={(v) => setSearchMode(v as 'fulltext' | 'semantic')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fulltext">Full-text zoeken</SelectItem>
                <SelectItem value="semantic">Semantisch zoeken</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {searchResults && searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultaten ({searchResults.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {searchResults.map((result) => (
              <Card
                key={result.document_id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onDocumentSelect?.(result.document_id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">
                        {highlightText(result.title, searchQuery)}
                      </CardTitle>
                    </div>
                    <Badge className={getCategoryColor(result.category)}>
                      {result.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {result.extracted_text
                      ? highlightText(
                          result.extracted_text.substring(0, 200) + '...',
                          searchQuery
                        )
                      : 'Geen tekst beschikbaar'}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(result.created_at).toLocaleDateString('nl-NL')}
                    </div>
                    {result.uploaded_by_name && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {result.uploaded_by_name}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Relevantie: {Math.round(result.rank * 100)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {searchQuery && searchResults && searchResults.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Geen resultaten gevonden</p>
            <p className="text-sm text-muted-foreground mt-2">
              Probeer een andere zoekterm of wijzig de filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
