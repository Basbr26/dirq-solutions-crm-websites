/**
 * Public Website Preview Page
 * Accessible via /preview/:token without authentication
 * Shows a branded wrapper around the prospect's website preview
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DirqLogo } from '@/components/DirqLogo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, MessageSquare, Clock, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';

interface WebsitePreview {
  id: string;
  title: string;
  preview_url: string;
  status: string;
  expires_at: string | null;
  viewed_at: string | null;
  project?: { title: string } | null;
  company?: { name: string } | null;
}

export default function PublicPreviewPage() {
  const { token } = useParams<{ token: string }>();
  const [preview, setPreview] = useState<WebsitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null);

  useEffect(() => {
    async function loadPreview() {
      if (!token) { setNotFound(true); setLoading(false); return; }

      const { data, error } = await supabase
        .from('website_previews')
        .select('*, project:projects(title), company:companies(name)')
        .eq('token', token)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      setPreview(data);

      // Mark as viewed on first visit
      if (!data.viewed_at) {
        await supabase
          .from('website_previews')
          .update({ viewed_at: new Date().toISOString(), status: 'viewed' })
          .eq('id', data.id);
      }

      setLoading(false);
    }

    loadPreview();
  }, [token]);

  async function handleApprove() {
    if (!preview) return;
    await supabase
      .from('website_previews')
      .update({ status: 'approved' })
      .eq('id', preview.id);
    setActionDone('approved');
  }

  async function handleSendFeedback() {
    if (!preview || !feedbackText.trim()) return;
    await supabase
      .from('website_previews')
      .update({ status: 'rejected', feedback: feedbackText })
      .eq('id', preview.id);
    setFeedbackSent(true);
    setFeedbackMode(false);
    setActionDone('rejected');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <AlertTriangle className="w-12 h-12 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-700">Preview niet gevonden</h1>
        <p className="text-gray-500 text-sm">Deze link bestaat niet of is verwijderd.</p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Clock className="w-12 h-12 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-700">Link verlopen</h1>
        <p className="text-gray-500 text-sm">Neem contact op voor een nieuwe link.</p>
      </div>
    );
  }

  if (actionDone === 'approved') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h1 className="text-2xl font-semibold text-gray-800">Bedankt voor je goedkeuring!</h1>
        <p className="text-gray-500">We gaan ermee aan de slag. Je hoort snel van ons.</p>
      </div>
    );
  }

  if (actionDone === 'rejected') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <MessageSquare className="w-16 h-16 text-blue-500" />
        <h1 className="text-2xl font-semibold text-gray-800">Bedankt voor je feedback!</h1>
        <p className="text-gray-500">We verwerken je opmerkingen en komen terug bij je.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Branded header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <DirqLogo size="sm" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-900">
              {preview?.title}
            </span>
            {preview?.company?.name && (
              <span className="text-xs text-gray-500">{preview.company.name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={preview?.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Openen in nieuw tabblad
          </a>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 relative">
        <iframe
          src={preview?.preview_url}
          className="w-full h-full border-0"
          title={preview?.title}
          allow="fullscreen"
        />
      </div>

      {/* Feedback bar */}
      {!feedbackMode ? (
        <div className="flex items-center justify-center gap-4 py-4 px-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <span className="text-sm text-gray-600 font-medium">Wat vind je ervan?</span>
          <Button
            onClick={handleApprove}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
            size="sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Ziet er goed uit!
          </Button>
          <Button
            variant="outline"
            onClick={() => setFeedbackMode(true)}
            size="sm"
            className="gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Ik heb opmerkingen
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-3 py-4 px-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <Textarea
            placeholder="Typ hier je opmerkingen..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="flex-1 min-h-[60px] resize-none text-sm"
            autoFocus
          />
          <div className="flex flex-col gap-2">
            <Button onClick={handleSendFeedback} disabled={!feedbackText.trim()} size="sm">
              Versturen
            </Button>
            <Button variant="ghost" onClick={() => setFeedbackMode(false)} size="sm">
              Annuleren
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
