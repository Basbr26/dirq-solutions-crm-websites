/**
 * CompanySearchDialog
 * Search for company information from external sources
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ExternalLink, Building2, Linkedin, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CompanySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanySearchDialog({ open, onOpenChange }: CompanySearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (platform: 'drimble' | 'apollo' | 'linkedin' | 'google') => {
    if (!searchQuery.trim()) return;

    const query = encodeURIComponent(searchQuery.trim());
    let url = '';

    switch (platform) {
      case 'drimble':
        url = `https://www.drimble.nl/bedrijf/zoeken.html?q=${query}`;
        break;
      case 'apollo':
        url = `https://www.apollo.io/companies?q=${query}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/search/results/companies/?keywords=${query}`;
        break;
      case 'google':
        url = `https://www.google.com/search?q=${query}+bedrijfsgegevens`;
        break;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bedrijf Opzoeken</DialogTitle>
          <DialogDescription>
            Zoek bedrijfsinformatie via externe bronnen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Bedrijfsnaam of KVK nummer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch('drimble')}
                className="pl-9"
              />
            </div>
          </div>

          {/* Search Platforms */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Zoek op:</p>
            
            <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={() => handleSearch('drimble')}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Drimble</h4>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Nederlandse bedrijvendata (KVK, adres, contact)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={() => handleSearch('apollo')}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Apollo.io</h4>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Internationale B2B data en contacten
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={() => handleSearch('linkedin')}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-[#0A66C2]/10 p-2">
                    <Linkedin className="h-5 w-5 text-[#0A66C2]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">LinkedIn</h4>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Bedrijfspagina's en medewerkers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={() => handleSearch('google')}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-gray-500/10 p-2">
                    <Search className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Google</h4>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Algemene bedrijfsinformatie
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
            <p className="font-medium">💡 Tip:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Klik op een platform om te zoeken</li>
              <li>Kopieer de bedrijfsgegevens</li>
              <li>Plak in het "Quick Fill" veld</li>
              <li>Klik "Gegevens Invullen"</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
