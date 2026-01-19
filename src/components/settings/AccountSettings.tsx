import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { AlertTriangle, Shield, Key, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function AccountSettings() {
  const { t } = useTranslation();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.account.security')}</CardTitle>
          <CardDescription>
            {t('settings.account.securityDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password Change */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{t('settings.account.password')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('settings.account.passwordDescription')}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowPasswordDialog(true)}
            >
              {t('settings.account.changePassword')}
            </Button>
          </div>

          <Separator />

          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t('settings.account.twoFactor')}</p>
                  <Badge variant="outline" className="text-xs">{t('common.comingSoon')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('settings.account.twoFactorDescription')}
                </p>
              </div>
            </div>
            <Button variant="outline" disabled>
              {t('settings.account.enable')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('settings.account.dangerZone')}
          </CardTitle>
          <CardDescription>
            {t('settings.account.dangerZoneDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">{t('settings.account.deleteAccount')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('settings.account.deleteAccountDescription')}
                </p>
              </div>
            </div>
            <Button variant="destructive" disabled>
              {t('settings.account.deleteAccount')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            <strong>{t('common.warning')}:</strong> {t('settings.account.deleteAccountWarning')}
          </p>
        </CardContent>
      </Card>

      <ChangePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog}
      />
    </>
  );
}
