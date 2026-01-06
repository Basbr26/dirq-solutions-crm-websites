import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { AlertTriangle, Shield, Key, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function AccountSettings() {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account Beveiliging</CardTitle>
          <CardDescription>
            Beheer je wachtwoord en beveiligingsinstellingen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password Change */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Wachtwoord</p>
                <p className="text-sm text-muted-foreground">
                  Wijzig je wachtwoord om je account veilig te houden
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowPasswordDialog(true)}
            >
              Wijzig wachtwoord
            </Button>
          </div>

          <Separator />

          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Twee-factor authenticatie</p>
                  <Badge variant="outline" className="text-xs">Binnenkort</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Extra beveiligingslaag voor je account
                </p>
              </div>
            </div>
            <Button variant="outline" disabled>
              Inschakelen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Gevaarlijke Zone
          </CardTitle>
          <CardDescription>
            Onomkeerbare acties voor je account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Account verwijderen</p>
                <p className="text-sm text-muted-foreground">
                  Permanent verwijderen van je account en alle data
                </p>
              </div>
            </div>
            <Button variant="destructive" disabled>
              Account verwijderen
            </Button>
          </div>
          <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            <strong>Let op:</strong> Account verwijdering is momenteel uitgeschakeld. 
            Neem contact op met een administrator als je je account wilt verwijderen.
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
