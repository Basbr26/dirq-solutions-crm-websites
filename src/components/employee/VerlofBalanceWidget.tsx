import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VerlofBalanceWidgetProps {
  userId: string;
}

export const VerlofBalanceWidget = ({ userId }: VerlofBalanceWidgetProps) => {
  const navigate = useNavigate();
  
  // Fetch leave balance
  const { data: balance, isLoading, error } = useQuery({
    queryKey: ['leave-balance', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', userId)
        .eq('year', new Date().getFullYear())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // If no balance exists, create default
      if (!data) {
        const { data: newBalance, error: createError } = await supabase
          .from('leave_balances')
          .insert({
            employee_id: userId,
            year: new Date().getFullYear(),
            total_days: 25,
            used_days: 0,
            pending_days: 0,
            leave_type: 'vakantie'
          })
          .select()
          .single();
        
        if (createError) throw createError;
        return newBalance;
      }
      
      return data;
    }
  });
  
  // Fetch upcoming leave
  const { data: upcomingLeave } = useQuery({
    queryKey: ['upcoming-leave', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', userId)
        .eq('status', 'approved')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true })
        .limit(3);
      
      if (error) throw error;
      return data;
    }
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Fout bij laden verlofgegevens. Probeer het later opnieuw.
        </AlertDescription>
      </Alert>
    );
  }
  
  const available = balance ? balance.total_days - balance.used_days - balance.pending_days : 0;
  const usedPercentage = balance ? (balance.used_days / balance.total_days) * 100 : 0;
  const pendingPercentage = balance ? (balance.pending_days / balance.total_days) * 100 : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Verlofsaldo</span>
          <Button 
            size="sm" 
            onClick={() => navigate('/hr/verlof')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Aanvragen
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Balance Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{available}</div>
            <div className="text-sm text-muted-foreground">Beschikbaar</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{balance?.pending_days || 0}</div>
            <div className="text-sm text-muted-foreground">In afwachting</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">{balance?.used_days || 0}</div>
            <div className="text-sm text-muted-foreground">Opgenomen</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Verbruik</span>
            <span>{balance?.used_days || 0} / {balance?.total_days || 25} dagen</span>
          </div>
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-gray-600 transition-all"
              style={{ width: `${usedPercentage}%` }}
            />
            <div 
              className="absolute h-full bg-orange-400 transition-all"
              style={{ 
                left: `${usedPercentage}%`,
                width: `${pendingPercentage}%` 
              }}
            />
          </div>
        </div>
        
        {/* Upcoming Leave */}
        {upcomingLeave && upcomingLeave.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Aankomend verlof</div>
            {upcomingLeave.map(leave => (
              <div 
                key={leave.id}
                className="flex items-center gap-2 text-sm p-2 bg-muted rounded"
              >
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">
                    {new Date(leave.start_date).toLocaleDateString('nl-NL', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                    {' - '}
                    {new Date(leave.end_date).toLocaleDateString('nl-NL', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </div>
                  <div className="text-muted-foreground">
                    {leave.total_days} dagen
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* View All Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/hr/verlof')}
        >
          Alle verlofdagen bekijken
        </Button>
      </CardContent>
    </Card>
  );
};
