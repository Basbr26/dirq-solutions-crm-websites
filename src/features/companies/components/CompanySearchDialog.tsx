/**
 * CompanySearchDialog
 * Search for company information from CompanyInfo.nl
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
import { Search, ExternalLink, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CompanySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanySearchDialog({ open, onOpenChange }: CompanySearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    const query = encodeURIComponent(searchQuery.trim());
    const url = `https://companyinfo.nl/zoeken?query=${query}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bedrijf Opzoeken</DialogTitle>
          <DialogDescription>
            Zoek bedrijfsinformatie op CompanyInfo.nl
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
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
                autoFocus
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Zoeken
            </Button>
          </div>

          {/* CompanyInfo.nl Info */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-orange-500/10 p-2">
                  <Building2 className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">CompanyInfo.nl</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete Nederlandse bedrijfsprofielen met KVK, adres, telefoon en contactgegevens
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
            <p className="font-medium">💡 Tip:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Klik "Zoeken" om CompanyInfo.nl te openen</li>
              <li>Kopieer de bedrijfsgegevens van de pagina</li>
              <li>Plak in het "Quick Fill" veld hieronder</li>
              <li>Klik "Gegevens Invullen" voor auto-fill</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
