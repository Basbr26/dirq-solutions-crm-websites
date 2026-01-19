import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserManagement } from '@/components/UserManagement';

export default function GebruikersbeheerPage() {
  const { t } = useTranslation();
  return (
    <AppLayout
      title={t('navigation.userManagement')}
      subtitle={t('common.userManagement')}
    >
      <div className="p-4 md:p-6">
        <UserManagement />
      </div>
    </AppLayout>
  );
}
