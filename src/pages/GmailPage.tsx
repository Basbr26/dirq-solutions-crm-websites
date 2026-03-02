import { AppLayout } from '@/components/layout/AppLayout';
import { GmailInbox } from '@/components/gmail/GmailInbox';

export default function GmailPage() {
  return (
    <AppLayout title="Gmail" subtitle="Uw Gmail inbox in het CRM">
      <div className="py-4 h-[calc(100vh-160px)]">
        <GmailInbox />
      </div>
    </AppLayout>
  );
}
