import { useState } from 'react';
import { useMutation } from '@tantml:parameter>
<invoke name="create_file">
<parameter name="content">import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface CalendarFiltersProps {
  filters: {
    meeting: boolean;
    task: boolean;
    leave: boolean;
    birthday: boolean;
    training: boolean;
    review: boolean;
    deadline: boolean;
    other: boolean;
  };
  onChange: (filters: any) => void;
  onClose: () => void;
}

const eventTypes = [
  { key: 'meeting', label: 'Meetings', color: '#3B82F6' },
  { key: 'task', label: 'Taken', color: '#F59E0B' },
  { key: 'leave', label: 'Verlof', color: '#10B981' },
  { key: 'birthday', label: 'Verjaardagen', color: '#EC4899' },
  { key: 'training', label: 'Training', color: '#8B5CF6' },
  { key: 'review', label: 'Reviews', color: '#6366F1' },
  { key: 'deadline', label: 'Deadlines', color: '#EF4444' },
  { key: 'other', label: 'Overig', color: '#6B7280' },
];

export function CalendarFilters({ filters, onChange, onClose }: CalendarFiltersProps) {
  const toggleFilter = (key: string) => {
    onChange({
      ...filters,
      [key]: !filters[key as keyof typeof filters]
    });
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Event Filters ({activeCount}/{eventTypes.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {eventTypes.map(type => (
            <Badge
              key={type.key}
              variant={filters[type.key as keyof typeof filters] ? 'default' : 'outline'}
              className="cursor-pointer"
              style={{
                backgroundColor: filters[type.key as keyof typeof filters] 
                  ? type.color 
                  : 'transparent',
                borderColor: type.color,
                color: filters[type.key as keyof typeof filters] 
                  ? 'white' 
                  : type.color
              }}
              onClick={() => toggleFilter(type.key)}
            >
              {type.label}
            </Badge>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allTrue = Object.keys(filters).reduce((acc, key) => ({
                ...acc,
                [key]: true
              }), {});
              onChange(allTrue);
            }}
          >
            Alles selecteren
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allFalse = Object.keys(filters).reduce((acc, key) => ({
                ...acc,
                [key]: false
              }), {});
              onChange(allFalse);
            }}
          >
            Alles deselecteren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
