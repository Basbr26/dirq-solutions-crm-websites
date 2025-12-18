import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, AlertTriangle, Plus, Clock } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function PlanningPage() {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Fetch shifts
  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('is_active', true)
        .order('start_time');
      
      if (error) throw error;
      return data;
    }
  });
  
  // Fetch conflicts
  const { data: conflicts } = useQuery({
    queryKey: ['schedule-conflicts', weekStart],
    queryFn: async () => {
      const endOfWeek = addDays(weekStart, 6);
      
      const { data, error } = await supabase
        .from('schedule_conflicts')
        .select('*')
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
        .eq('resolved', false)
        .order('severity', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
  
  // Fetch schedules for week
  const { data: schedules } = useQuery({
    queryKey: ['employee-schedules', weekStart],
    queryFn: async () => {
      const endOfWeek = addDays(weekStart, 6);
      
      const { data, error } = await supabase
        .from('employee_schedules')
        .select(`
          *,
          employee:profiles(voornaam, achternaam),
          shift:shifts(name, color, start_time, end_time)
        `)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
        .order('date');
      
      if (error) throw error;
      return data;
    }
  });

  const scheduledCount = schedules?.filter(s => s.status === 'scheduled').length || 0;
  const totalSlots = days.length * (shifts?.length || 0) * 3; // Estimate
  const fillRate = totalSlots > 0 ? Math.round((scheduledCount / totalSlots) * 100) : 0;

  return (
    <AppLayout
      title="Bezetting & Planning"
      subtitle="Beheer shifts en medewerker roosters"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Exporteer
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nieuw Shift
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Shifts Deze Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {shifts?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Actieve diensten
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bezetting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {fillRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {scheduledCount} ingepland
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Openstaand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {totalSlots - scheduledCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Te vullen slots
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Conflicten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {conflicts?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Vereist actie
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="schedule">
          <TabsList>
            <TabsTrigger value="schedule">Rooster</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
            <TabsTrigger value="conflicts">
              Conflicten
              {conflicts && conflicts.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {conflicts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Week {format(weekStart, 'w')} - {format(weekStart, 'MMMM yyyy', { locale: nl })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shiftsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Roosters laden...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Week Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {days.map(day => (
                        <div key={day.toISOString()} className="text-center">
                          <div className="font-semibold text-sm">
                            {format(day, 'EEE', { locale: nl })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(day, 'd MMM', { locale: nl })}
                          </div>
                          <div className="mt-2 space-y-1">
                            {schedules?.filter(s => 
                              s.date === format(day, 'yyyy-MM-dd')
                            ).map(schedule => (
                              <div
                                key={schedule.id}
                                className="text-xs p-1 rounded text-white truncate"
                                style={{ backgroundColor: schedule.shift.color }}
                                title={`${schedule.employee.voornaam} ${schedule.employee.achternaam} - ${schedule.shift.name}`}
                              >
                                {schedule.employee.voornaam.charAt(0)}. {schedule.employee.achternaam}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t">
                      {shifts?.map(shift => (
                        <div key={shift.id} className="flex items-center gap-2 text-sm">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: shift.color }}
                          />
                          <span>
                            {shift.name} ({shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shifts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Beschikbare Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {shifts?.map(shift => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: shift.color }}
                        />
                        <div>
                          <div className="font-medium">{shift.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                            {shift.break_minutes > 0 && ` (${shift.break_minutes}min pauze)`}
                          </div>
                        </div>
                      </div>
                      <Badge variant={shift.is_active ? 'default' : 'secondary'}>
                        {shift.is_active ? 'Actief' : 'Inactief'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="conflicts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Planningsconflicten</CardTitle>
              </CardHeader>
              <CardContent>
                {!conflicts || conflicts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Geen conflicten gevonden</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conflicts.map(conflict => (
                      <div
                        key={conflict.id}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <AlertTriangle 
                          className={`h-5 w-5 mt-0.5 ${
                            conflict.severity === 'critical' ? 'text-destructive' :
                            conflict.severity === 'warning' ? 'text-orange-500' :
                            'text-blue-500'
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={
                              conflict.severity === 'critical' ? 'destructive' :
                              conflict.severity === 'warning' ? 'default' :
                              'secondary'
                            }>
                              {conflict.severity}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(conflict.date), 'dd MMM yyyy', { locale: nl })}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{conflict.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Type: {conflict.conflict_type}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Oplossen
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
