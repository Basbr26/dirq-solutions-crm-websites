import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: 'Navigatie',
    items: [
      { keys: ['g', 'h'], description: 'Dashboard' },
      { keys: ['g', 'c'], description: 'Bedrijven' },
      { keys: ['g', 'n'], description: 'Contacten' },
      { keys: ['g', 'p'], description: 'Projecten' },
      { keys: ['g', 'q'], description: 'Offertes' },
      { keys: ['g', 'a'], description: 'Agenda' },
    ],
  },
  {
    category: 'Acties',
    items: [
      { keys: ['/'], description: 'Zoeken' },
      { keys: ['n'], description: 'Nieuw item' },
      { keys: ['Esc'], description: 'Sluiten' },
      { keys: ['?'], description: 'Sneltoetsen tonen' },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
      {children}
    </kbd>
  );
}

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Sneltoetsen
          </DialogTitle>
          <DialogDescription>
            Gebruik deze sneltoetsen om sneller door de applicatie te navigeren
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                          <Kbd>{key}</Kbd>
                          {idx < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">then</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
          <p>
            💡 <strong>Tip:</strong> Druk op <Kbd>?</Kbd> op elk moment om deze sneltoetsen te zien
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
