import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, parseISO, addMonths, subMonths } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  employee?: {
    voornaam: string;
    achternaam: string;
  };
}

interface LeaveCalendarProps {
  requests: LeaveRequest[];
  getLeaveTypeLabel: (type: string) => string;
}

const leaveTypeColors: Record<string, string> = {
  vakantie: 'bg-blue-500',
  adv: 'bg-purple-500',
  bijzonder: 'bg-amber-500',
  onbetaald: 'bg-gray-500',
  ouderschaps: 'bg-pink-500',
  zwangerschaps: 'bg-rose-500',
};

export function LeaveCalendar({ requests, getLeaveTypeLabel }: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the first day of the week (Monday = 0)
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;

  const getLeaveForDay = (date: Date) => {
    return requests.filter(request => {
      const start = parseISO(request.start_date);
      const end = parseISO(request.end_date);
      return isWithinInterval(date, { start, end });
    });
  };

  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">
          {format(currentMonth, 'MMMM yyyy', { locale: nl })}
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Vandaag
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b">
          {Object.entries(leaveTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 text-sm">
              <div className={cn('w-3 h-3 rounded', color)} />
              <span className="text-muted-foreground">{getLeaveTypeLabel(type)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {/* Padding days */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`padding-${i}`} className="aspect-square" />
          ))}

          {/* Calendar days */}
          {days.map((day) => {
            const leaveForDay = getLeaveForDay(day);
            const isToday = isSameDay(day, new Date());
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'aspect-square p-1 border rounded-lg transition-colors min-h-[80px]',
                  isToday && 'border-primary bg-primary/5',
                  isWeekend && 'bg-muted/30',
                  !isToday && !isWeekend && 'hover:bg-muted/50'
                )}
              >
                <div className={cn(
                  'text-sm font-medium mb-1',
                  isToday && 'text-primary',
                  isWeekend && 'text-muted-foreground'
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {leaveForDay.slice(0, 3).map((leave) => (
                    <div
                      key={leave.id}
                      className={cn(
                        'text-xs px-1 py-0.5 rounded text-white truncate',
                        leaveTypeColors[leave.leave_type] || 'bg-gray-500'
                      )}
                      title={`${leave.employee?.voornaam} ${leave.employee?.achternaam} - ${getLeaveTypeLabel(leave.leave_type)}`}
                    >
                      {leave.employee?.voornaam?.charAt(0)}{leave.employee?.achternaam?.charAt(0)}
                    </div>
                  ))}
                  {leaveForDay.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{leaveForDay.length - 3} meer
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
