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
  onPopupOpenChange?: (isOpen: boolean) => void;
}

export function CompanySearchDialog({ open, onOpenChange, onPopupOpenChange }: CompanySearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    const query = encodeURIComponent(searchQuery.trim());
    const url = `https://www.kvk.nl/zoeken/?q=${query}`;
    
    // Open in smaller popup window positioned on the right
    const width = 800;
    const height = 900;
    const left = window.screen.width - width - 50; // 50px from right edge
    const top = 50;
    
    const popup = window.open(
      url,
      'kvk-search',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    // Notify parent that popup is open
    if (popup && onPopupOpenChange) {
      onPopupOpenChange(true);
      
      // Poll to detect when popup closes
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          onPopupOpenChange(false);
        }
      }, 500);
    }

    // Close the dialog
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bedrijf opzoeken</DialogTitle>
          <DialogDescription>
            Zoek bedrijfsinformatie op KVK.nl
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

          {/* KVK.nl Info */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-orange-500/10 p-2">
                  <Building2 className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">KVK.nl</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Officiële Nederlandse bedrijfsgegevens van de Kamer van Koophandel
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
            <p className="font-medium">💡 Tip:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Klik "Zoeken" om KVK.nl te openen</li>
              <li>Kopieer de bedrijfsgegevens van het profiel</li>
              <li>Plak in het "Quick Fill" veld hieronder</li>
              <li>Klik "Gegevens Invullen" voor auto-fill</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
