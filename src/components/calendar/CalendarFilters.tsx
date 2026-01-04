import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface CalendarFiltersProps {
  filters: {
    meeting: boolean;
    call: boolean;
    demo: boolean;
    followup: boolean;
    deadline: boolean;
    training: boolean;
    company: boolean;
    personal: boolean;
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
            Sales Meetings
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="call"
            checked={filters.call}
            onCheckedChange={(checked) => handleFilterChange('call', checked as boolean)}
          />
          <Label htmlFor="call" className="text-sm cursor-pointer">
            Sales Calls
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="demo"
            checked={filters.demo}
            onCheckedChange={(checked) => handleFilterChange('demo', checked as boolean)}
          />
          <Label htmlFor="demo" className="text-sm cursor-pointer">
            Product Demos
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="followup"
            checked={filters.followup}
            onCheckedChange={(checked) => handleFilterChange('followup', checked as boolean)}
          />
          <Label htmlFor="followup" className="text-sm cursor-pointer">
            Follow-ups
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="deadline"
            checked={filters.deadline}
            onCheckedChange={(checked) => handleFilterChange('deadline', checked as boolean)}
          />
          <Label htmlFor="deadline" className="text-sm cursor-pointer">
            Project Deadlines
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
            id="company"
            checked={filters.company}
            onCheckedChange={(checked) => handleFilterChange('company', checked as boolean)}
          />
          <Label htmlFor="company" className="text-sm cursor-pointer">
            Bedrijfsevents
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
      </CardContent>
    </Card>
  );
}
