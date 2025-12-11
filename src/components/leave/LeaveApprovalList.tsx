import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Calendar, User } from 'lucide-react';

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  created_at: string;
  employee?: {
    voornaam: string;
    achternaam: string;
  };
}

interface LeaveApprovalListProps {
  requests: LeaveRequest[];
  onUpdate: () => void;
  getLeaveTypeLabel: (type: string) => string;
}

export function LeaveApprovalList({ requests, onUpdate, getLeaveTypeLabel }: LeaveApprovalListProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    
    setLoading(requestId);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Verlofaanvraag goedgekeurd');
      onUpdate();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Fout bij goedkeuren');
    } finally {
      setLoading(null);
    }
  };

  const openRejectDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!user || !selectedRequest) return;

    setLoading(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Verlofaanvraag afgewezen');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      onUpdate();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Fout bij afwijzen');
    } finally {
      setLoading(null);
    }
  };

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
          <p className="text-lg font-medium">Geen openstaande aanvragen</p>
          <p className="text-muted-foreground">Alle verlofaanvragen zijn afgehandeld</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Te beoordelen aanvragen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border rounded-lg bg-card"
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {request.employee?.voornaam?.[0]}{request.employee?.achternaam?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {request.employee?.voornaam} {request.employee?.achternaam}
                    </span>
                    <Badge variant="outline">{getLeaveTypeLabel(request.leave_type)}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(request.start_date), 'd MMM', { locale: nl })} - {format(new Date(request.end_date), 'd MMM yyyy', { locale: nl })}
                    </span>
                    <span className="font-medium text-foreground">
                      {request.days} {request.days === 1 ? 'dag' : 'dagen'}
                    </span>
                  </div>
                  {request.reason && (
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 ml-14 lg:ml-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openRejectDialog(request)}
                  disabled={loading === request.id}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  Afwijzen
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={loading === request.id}
                  className="gap-1 bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading === request.id ? 'Bezig...' : 'Goedkeuren'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verlofaanvraag afwijzen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Je staat op het punt de verlofaanvraag van{' '}
              <strong>{selectedRequest?.employee?.voornaam} {selectedRequest?.employee?.achternaam}</strong> af te wijzen.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reden voor afwijzing (optioneel)</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Geef een reden op voor de afwijzing..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading !== null}>
              {loading ? 'Bezig...' : 'Afwijzen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
