// Email Drafts Review Page
// Review and send AI-generated email drafts from automation workflows

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, Send, X, Edit2, Clock } from 'lucide-react';

interface EmailDraft {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'failed' | 'cancelled';
  type: string;
  project_id?: string;
  company_id?: string;
  created_at: string;
  company?: {
    name: string;
  };
  project?: {
    title: string;
  };
}

export default function EmailDraftsPage() {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [sending, setSending] = useState(false);
  const [editedDraft, setEditedDraft] = useState<EmailDraft | null>(null);

  // Fetch drafts from Supabase
  async function fetchDrafts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_drafts')
      .select(`
        *,
        company:companies(name),
        project:projects(title)
      `)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load drafts');
      console.error(error);
    } else {
      setDrafts(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDrafts();
  }, []);

  // When selecting a draft, initialize edited version
  useEffect(() => {
    if (selectedDraft) {
      setEditedDraft({ ...selectedDraft });
    } else {
      setEditedDraft(null);
    }
  }, [selectedDraft]);

  // Send draft via Resend (call API route)
  async function handleSend(draft: EmailDraft) {
    setSending(true);
    
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: draft.to_email,
          subject: draft.subject,
          html: draft.body,
          draftId: draft.id
        })
      });

      if (!response.ok) throw new Error('Failed to send');

      // Update draft status
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('email_drafts')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_by: user?.id
        })
        .eq('id', draft.id);

      toast.success('Email sent successfully!');
      fetchDrafts(); // Refresh list
      setSelectedDraft(null);
    } catch (error) {
      toast.error('Failed to send email');
      console.error(error);
    } finally {
      setSending(false);
    }
  }

  // Save edited draft
  async function handleSaveEdits() {
    if (!editedDraft || !selectedDraft) return;

    const { error } = await supabase
      .from('email_drafts')
      .update({
        to_email: editedDraft.to_email,
        subject: editedDraft.subject,
        body: editedDraft.body
      })
      .eq('id', editedDraft.id);

    if (error) {
      toast.error('Failed to save changes');
      console.error(error);
    } else {
      toast.success('Draft updated');
      setSelectedDraft(editedDraft);
      fetchDrafts();
    }
  }

  // Cancel/delete draft
  async function handleCancel(draftId: string) {
    const { error } = await supabase
      .from('email_drafts')
      .update({ status: 'cancelled' })
      .eq('id', draftId);

    if (error) {
      toast.error('Failed to cancel draft');
    } else {
      toast.success('Draft cancelled');
      setSelectedDraft(null);
      fetchDrafts();
    }
  }

  // Check if draft has been edited
  const hasEdits = !!(editedDraft && selectedDraft && (
    editedDraft.to_email !== selectedDraft.to_email ||
    editedDraft.subject !== selectedDraft.subject ||
    editedDraft.body !== selectedDraft.body
  ));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Loading drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-7 h-7" />
          Email Drafts
        </h1>
        <p className="text-gray-600 mt-1">
          Review and send AI-generated emails • {drafts.length} pending
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drafts List */}
        <div className="space-y-4">
          {drafts.map(draft => (
            <Card 
              key={draft.id} 
              className={`p-4 cursor-pointer transition-colors ${
                selectedDraft?.id === draft.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedDraft(draft)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="font-semibold">{draft.company?.name || 'Unknown Company'}</p>
                  <p className="text-sm text-gray-600">{draft.to_email}</p>
                </div>
                <Badge variant="outline" className="ml-2">
                  {draft.type}
                </Badge>
              </div>
              <p className="text-sm font-medium text-gray-900 line-clamp-2">{draft.subject}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {new Date(draft.created_at).toLocaleString('nl-NL')}
              </div>
            </Card>
          ))}
          
          {drafts.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No drafts pending review</p>
                <p className="text-sm mt-1">AI-generated emails will appear here</p>
              </div>
            </Card>
          )}
        </div>

        {/* Draft Preview & Editor */}
        {selectedDraft && editedDraft && (
          <Card className="p-6 sticky top-6 self-start">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                Review & Edit
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedDraft(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  To:
                </label>
                <input 
                  type="email"
                  value={editedDraft.to_email}
                  onChange={(e) => setEditedDraft({ ...editedDraft, to_email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Subject:
                </label>
                <input 
                  type="text"
                  value={editedDraft.subject}
                  onChange={(e) => setEditedDraft({ ...editedDraft, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Body:
                </label>
                <textarea 
                  value={editedDraft.body}
                  onChange={(e) => setEditedDraft({ ...editedDraft, body: e.target.value })}
                  rows={12}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {hasEdits && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-800">
                    You have unsaved changes
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {hasEdits ? (
                  <Button 
                    onClick={handleSaveEdits}
                    variant="outline"
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                ) : null}
                
                <Button 
                  onClick={() => handleSend(editedDraft)}
                  disabled={sending || hasEdits}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Email'}
                </Button>
                
                <Button 
                  variant="destructive"
                  onClick={() => handleCancel(selectedDraft.id)}
                  disabled={sending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {hasEdits && (
                <p className="text-xs text-gray-500 text-center">
                  Save changes before sending
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
