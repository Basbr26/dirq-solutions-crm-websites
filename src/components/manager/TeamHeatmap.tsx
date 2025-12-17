import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTeamCalendar } from '@/hooks/useTeamCalendar';

interface TeamHeatmapProps {
  managerId: string;
  onDaySelect?: (date: Date) => void;
}

export default function TeamHeatmap({ managerId, onDaySelect }: TeamHeatmapProps) {
  const { calendar, isLoading, getCapacityStatus, getNextMonth, getPreviousMonth } =
    useTeamCalendar(managerId);

  const monthName = useMemo(() => {
    if (!calendar) return '';
    return new Date(calendar.year, calendar.month).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [calendar]);

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 80) return 'bg-green-200 hover:bg-green-300';
    if (capacity >= 60) return 'bg-yellow-200 hover:bg-yellow-300';
    if (capacity >= 40) return 'bg-orange-200 hover:bg-orange-300';
    return 'bg-red-200 hover:bg-red-300';
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!calendar) return null;

  // Get starting day of week (0 = Sunday, adjust to Monday = 0)
  const firstDayOfMonth = new Date(calendar.year, calendar.month, 1).getDay();
  const startingSlots = (firstDayOfMonth + 6) % 7; // Adjust for Monday start

  return (
    <div className="w-full max-w-2xl bg-card rounded-xl border border-border p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <motion.button
          className="p-2 hover:bg-muted rounded-lg"
          onClick={getPreviousMonth}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Prev
        </motion.button>
        <h2 className="text-lg font-bold">{monthName}</h2>
        <motion.button
          className="p-2 hover:bg-muted rounded-lg"
          onClick={getNextMonth}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          Next →
        </motion.button>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-4 gap-2 mb-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-200"></div>
          <span>Healthy (80%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-200"></div>
          <span>Caution (60%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-200"></div>
          <span>Warning (40%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-200"></div>
          <span>Critical (&lt;40%)</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-muted/50 rounded-lg overflow-hidden">
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-0 border-b border-border">
          {dayLabels.map((day) => (
            <div key={day} className="p-3 text-center text-xs font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-0">
          {/* Empty slots for days before month starts */}
          {Array.from({ length: startingSlots }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square border border-border/50 bg-muted/30" />
          ))}

          {/* Calendar days */}
          {calendar.days.map((day, idx) => {
            const isToday =
              day.date.toDateString() === new Date().toDateString();
            const capacityColor = getCapacityColor(day.capacity);

            return (
              <motion.button
                key={`day-${idx}`}
                className={`aspect-square border border-border/50 p-1 flex flex-col items-center justify-center text-xs relative rounded ${capacityColor} transition-colors ${
                  isToday ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onDaySelect?.(day.date)}
                whileHover={{ scale: 1.1, zIndex: 10 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Date number */}
                <span className="font-bold">{day.date.getDate()}</span>

                {/* Capacity percentage */}
                <span className="text-xs opacity-75 mt-0.5">{day.capacity}%</span>

                {/* Indicators */}
                {(day.onLeave > 0 || day.sick > 0) && (
                  <div className="flex gap-0.5 mt-1">
                    {day.onLeave > 0 && (
                      <span title={`${day.onLeave} on leave`} className="text-xs">
                        📅
                      </span>
                    )}
                    {day.sick > 0 && (
                      <span title={`${day.sick} sick`} className="text-xs">
                        🤒
                      </span>
                    )}
                  </div>
                )}

                {/* Tooltip */}
                <motion.div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg p-2 text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100"
                  initial={{ opacity: 0, y: 4 }}
                  whileHover={{ opacity: 1, y: 0 }}
                >
                  <p className="font-semibold">{day.capacity}% capacity</p>
                  <p className="text-muted-foreground">{day.teamSize - day.onLeave - day.sick}/{day.teamSize} available</p>
                </motion.div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Stats footer */}
      <div className="mt-4 pt-4 border-t border-border flex justify-around text-sm">
        <div>
          <p className="text-muted-foreground">Team Size</p>
          <p className="font-bold">{calendar.days[0]?.teamSize || 0}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Avg Capacity</p>
          <p className="font-bold">
            {Math.round(
              calendar.days.reduce((sum, day) => sum + day.capacity, 0) /
                calendar.days.length
            )}
            %
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Total Leave Days</p>
          <p className="font-bold">
            {calendar.days.reduce((sum, day) => sum + day.onLeave, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
