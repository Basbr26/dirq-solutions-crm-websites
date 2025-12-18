import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Plus, Calendar, Clock, CheckCircle, XCircle, List } from 'lucide-react';
import { LeaveRequestDialog } from '@/components/leave/LeaveRequestDialog';
import { LeaveCalendar } from '@/components/leave/LeaveCalendar';
import { LeaveApprovalList } from '@/components/leave/LeaveApprovalList';
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard';

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
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  employee?: {
    voornaam: string;
    achternaam: string;
  };
  approver?: {
    voornaam: string;
    achternaam: string;
  } | null;
}

export default function LeavePage() {
  const { user, role } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isManager = role === 'manager' || role === 'hr' || role === 'super_admin';

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Build query with role-based filtering
      let requestsQuery = supabase
        .from('leave_requests')
        .select(`
          *,
          employee:profiles!leave_requests_employee_id_fkey(voornaam, achternaam, manager_id),
          approver:profiles!leave_requests_approved_by_fkey(voornaam, achternaam)
        `);
      
      // Managers can only see leave requests from their team
      if (role === 'manager') {
        const { data: teamEmployees } = await supabase
          .from('profiles')
          .select('id')
          .eq('manager_id', user.id);
        
        if (teamEmployees) {
          const employeeIds = teamEmployees.map(e => e.id);
          requestsQuery = requestsQuery.in('employee_id', employeeIds);
        }
      }
      // Medewerkers see only their own requests (handled by RLS but explicit for clarity)
      else if (role === 'medewerker') {
        requestsQuery = requestsQuery.eq('employee_id', user.id);
      }
      
      requestsQuery = requestsQuery.order('created_at', { ascending: false });
      const { data: allRequests, error: requestsError } = await requestsQuery;

      if (requestsError) throw requestsError;

      setRequests(allRequests || []);
      setPendingRequests((allRequests || []).filter(r => r.status === 'pending'));
    } catch (error) {
      console.error('Error loading leave data:', error);
      toast.error('Fout bij laden van verlofgegevens');
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  const handleRequestSubmitted = () => {
    setDialogOpen(false);
    loadData();
    toast.success('Verlofaanvraag ingediend');
  };

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vakantie: 'Vakantie',
      adv: 'ADV',
      bijzonder: 'Bijzonder verlof',
      onbetaald: 'Onbetaald verlof',
      ouderschaps: 'Ouderschapsverlof',
      zwangerschaps: 'Zwangerschapsverlof',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />In behandeling</Badge>;
      case 'approved':
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle className="h-3 w-3" />Goedgekeurd</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Afgewezen</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="gap-1">Geannuleerd</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout
      title="Verlofbeheer"
      subtitle="Beheer verlofaanvragen en bekijk de verlofkalender"
      actions={
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Verlof aanvragen</span>
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In behandeling</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Goedgekeurd</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Afgewezen</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={isManager && stats.pending > 0 ? 'goedkeuren' : 'overzicht'} className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            {isManager && (
              <TabsTrigger value="goedkeuren" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Goedkeuren
                {stats.pending > 0 && (
                  <Badge variant="secondary" className="ml-1">{stats.pending}</Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="overzicht" className="gap-2">
              <List className="h-4 w-4" />
              Overzicht
            </TabsTrigger>
            <TabsTrigger value="kalender" className="gap-2">
              <Calendar className="h-4 w-4" />
              Kalender
            </TabsTrigger>
          </TabsList>

          {isManager && (
            <TabsContent value="goedkeuren">
              <LeaveApprovalList 
                requests={pendingRequests} 
                onUpdate={loadData}
                getLeaveTypeLabel={getLeaveTypeLabel}
              />
            </TabsContent>
          )}

          <TabsContent value="overzicht" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mijn verlofaanvragen</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : requests.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Geen verlofaanvragen gevonden
                  </p>
                ) : (
                  <div className="space-y-3">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{getLeaveTypeLabel(request.leave_type)}</span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.start_date), 'd MMM yyyy', { locale: nl })} - {format(new Date(request.end_date), 'd MMM yyyy', { locale: nl })}
                            <span className="mx-2">•</span>
                            {request.days} {request.days === 1 ? 'dag' : 'dagen'}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-muted-foreground">{request.reason}</p>
                          )}
                          {request.employee && isManager && (
                            <p className="text-sm text-primary">
                              {request.employee.voornaam} {request.employee.achternaam}
                            </p>
                          )}
                        </div>
                        {request.status === 'approved' && request.approver && (
                          <p className="text-xs text-muted-foreground">
                            Goedgekeurd door {request.approver.voornaam} {request.approver.achternaam}
                          </p>
                        )}
                        {request.status === 'rejected' && request.rejection_reason && (
                          <p className="text-xs text-destructive">
                            Reden: {request.rejection_reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kalender">
            <LeaveCalendar 
              requests={requests.filter(r => r.status === 'approved')} 
              getLeaveTypeLabel={getLeaveTypeLabel}
            />
          </TabsContent>
        </Tabs>
      </div>

      <LeaveRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleRequestSubmitted}
      />
    </AppLayout>
  );
}
