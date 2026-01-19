import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Separator } from '@/components/ui/separator';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

export function AppearanceSettings() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.appearance.title')}</CardTitle>
        <CardDescription>
          {t('settings.appearance.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>{t('settings.appearance.theme')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('settings.appearance.themeDescription')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sun className="h-4 w-4" />
              <span className="capitalize">{theme === 'dark' ? t('settings.appearance.dark') : t('settings.appearance.light')}</span>
              <Moon className="h-4 w-4" />
            </div>
            <ThemeToggle />
          </div>
        </div>

        <Separator />

        {/* Future: Compact Mode */}
        <div className="space-y-2 opacity-50">
          <Label>{t('settings.appearance.compactMode')}</Label>
          <p className="text-sm text-muted-foreground">
            {t('settings.appearance.compactModeDescription')}
          </p>
        </div>

        <Separator />

        {/* Future: Font Size */}
        <div className="space-y-2 opacity-50">
          <Label>{t('settings.appearance.fontSize')}</Label>
          <p className="text-sm text-muted-foreground">
            {t('settings.appearance.fontSizeDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
