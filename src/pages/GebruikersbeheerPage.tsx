import { AppLayout } from '@/components/layout/AppLayout';
import { UserManagement } from '@/components/UserManagement';

export default function GebruikersbeheerPage() {
  return (
    <AppLayout
      title="Gebruikersbeheer"
      subtitle="Beheer gebruikers en hun rollen in het systeem"
    >
      <div className="p-4 md:p-6">
        <UserManagement />
      </div>
    </AppLayout>
  );
}
