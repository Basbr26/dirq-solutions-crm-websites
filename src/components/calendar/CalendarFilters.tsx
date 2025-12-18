import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface CalendarFiltersProps {
  filters: {
    meeting: boolean;
    personal: boolean;
    absence: boolean;
    leave: boolean;
    training: boolean;
    birthday: boolean;
    company: boolean;
    teamLeave: boolean;
  };
  onChange: (filters: any) => void;
}

export function CalendarFilters({ filters, onChange }: CalendarFiltersProps) {
  const handleFilterChange = (key: string, checked: boolean) => {
    onChange({ ...filters, [key]: checked });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="meeting"
            checked={filters.meeting}
            onCheckedChange={(checked) => handleFilterChange('meeting', checked as boolean)}
          />
          <Label htmlFor="meeting" className="text-sm cursor-pointer">
            Afspraken
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="personal"
            checked={filters.personal}
            onCheckedChange={(checked) => handleFilterChange('personal', checked as boolean)}
          />
          <Label htmlFor="personal" className="text-sm cursor-pointer">
            Persoonlijk
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="absence"
            checked={filters.absence}
            onCheckedChange={(checked) => handleFilterChange('absence', checked as boolean)}
          />
          <Label htmlFor="absence" className="text-sm cursor-pointer">
            Verzuim
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="leave"
            checked={filters.leave}
            onCheckedChange={(checked) => handleFilterChange('leave', checked as boolean)}
          />
          <Label htmlFor="leave" className="text-sm cursor-pointer">
            Mijn Verlof
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="teamLeave"
            checked={filters.teamLeave}
            onCheckedChange={(checked) => handleFilterChange('teamLeave', checked as boolean)}
          />
          <Label htmlFor="teamLeave" className="text-sm cursor-pointer">
            Team Verlof
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="training"
            checked={filters.training}
            onCheckedChange={(checked) => handleFilterChange('training', checked as boolean)}
          />
          <Label htmlFor="training" className="text-sm cursor-pointer">
            Trainingen
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="birthday"
            checked={filters.birthday}
            onCheckedChange={(checked) => handleFilterChange('birthday', checked as boolean)}
          />
          <Label htmlFor="birthday" className="text-sm cursor-pointer">
            Verjaardagen
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="company"
            checked={filters.company}
            onCheckedChange={(checked) => handleFilterChange('company', checked as boolean)}
          />
          <Label htmlFor="company" className="text-sm cursor-pointer">
            Bedrijfsevents
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
