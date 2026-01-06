import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Separator } from '@/components/ui/separator';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

export function AppearanceSettings() {
  const { theme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weergave Instellingen</CardTitle>
        <CardDescription>
          Pas het uiterlijk van de applicatie aan naar jouw voorkeur
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Thema</Label>
            <p className="text-sm text-muted-foreground">
              Kies tussen lichte en donkere modus
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sun className="h-4 w-4" />
              <span className="capitalize">{theme === 'dark' ? 'Donker' : 'Licht'}</span>
              <Moon className="h-4 w-4" />
            </div>
            <ThemeToggle />
          </div>
        </div>

        <Separator />

        {/* Future: Compact Mode */}
        <div className="space-y-2 opacity-50">
          <Label>Compacte weergave</Label>
          <p className="text-sm text-muted-foreground">
            Toon meer informatie in minder ruimte (Binnenkort beschikbaar)
          </p>
        </div>

        <Separator />

        {/* Future: Font Size */}
        <div className="space-y-2 opacity-50">
          <Label>Lettergrootte</Label>
          <p className="text-sm text-muted-foreground">
            Pas de tekstgrootte aan voor betere leesbaarheid (Binnenkort beschikbaar)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
