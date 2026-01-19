/**
 * Advanced Filter Popover Component
 * Multi-dimensional filtering UI for Projects
 * Syncs with URL parameters for shareable filtered views
 */

import { useState, useEffect } from 'react';
import { Filter, X, Calendar, DollarSign, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { projectStageConfig } from '@/types/projects';
import type { AdvancedProjectFilters, ProjectStage } from '@/types/projects';

interface AdvancedFilterPopoverProps {
  filters: AdvancedProjectFilters;
  onFiltersChange: (filters: AdvancedProjectFilters) => void;
  onClearFilters: () => void;
}

export function AdvancedFilterPopover({
  filters,
  onFiltersChange,
  onClearFilters,
}: AdvancedFilterPopoverProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedProjectFilters>(filters);
  const [isOpen, setIsOpen] = useState(false);

  // Sync local state with props when filters change externally
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Count active advanced filters
  const activeFilterCount = [
    filters.stages && filters.stages.length > 0,
    filters.value_min !== undefined,
    filters.value_max !== undefined,
    filters.created_after,
    filters.created_before,
    filters.probability_min !== undefined,
    filters.probability_max !== undefined,
  ].filter(Boolean).length;

  const handleStageToggle = (stage: ProjectStage) => {
    const currentStages = localFilters.stages || [];
    const newStages = currentStages.includes(stage)
      ? currentStages.filter(s => s !== stage)
      : [...currentStages, stage];
    
    setLocalFilters({
      ...localFilters,
      stages: newStages.length > 0 ? newStages : undefined,
    });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const clearedFilters: AdvancedProjectFilters = {
      search: filters.search, // Keep search
    };
    setLocalFilters(clearedFilters);
    onClearFilters();
    setIsOpen(false);
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant={hasActiveFilters ? "default" : "outline"} 
          size="sm" 
          className="gap-2 relative"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Geavanceerde filters</span>
          <span className="sm:hidden">Filters</span>
          {hasActiveFilters && (
            <Badge 
              variant="secondary" 
              className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] max-h-[600px] overflow-y-auto" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Geavanceerde Filters</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Wis alles
              </Button>
            )}
          </div>

          <Separator />

          {/* Multiple Stages Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Meerdere stages
            </Label>
            <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
              {Object.entries(projectStageConfig).map(([stage, config]) => {
                const isSelected = localFilters.stages?.includes(stage as ProjectStage) || false;
                return (
                  <div key={stage} className="flex items-center space-x-2">
                    <Checkbox
                      id={`stage-${stage}`}
                      checked={isSelected}
                      onCheckedChange={() => handleStageToggle(stage as ProjectStage)}
                    />
                    <label
                      htmlFor={`stage-${stage}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                    >
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${config.color}20`,
                          borderColor: config.color,
                          color: config.color,
                        }}
                      >
                        {config.label}
                      </Badge>
                    </label>
                  </div>
                );
              })}
            </div>
            {localFilters.stages && localFilters.stages.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('forms.itemsSelected', { count: localFilters.stages.length })}
              </p>
            )}
          </div>

          <Separator />

          {/* Deal Value Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Deal waarde (€)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="value_min" className="text-xs text-muted-foreground">
                  Minimum
                </Label>
                <Input
                  id="value_min"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="€ 0"
                  value={localFilters.value_min || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      value_min: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="value_max" className="text-xs text-muted-foreground">
                  Maximum
                </Label>
                <Input
                  id="value_max"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="€ 100.000"
                  value={localFilters.value_max || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      value_max: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Aangemaakt tussen
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="created_after" className="text-xs text-muted-foreground">
                  Van
                </Label>
                <Input
                  id="created_after"
                  type="date"
                  value={localFilters.created_after || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      created_after: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="created_before" className="text-xs text-muted-foreground">
                  Tot
                </Label>
                <Input
                  id="created_before"
                  type="date"
                  value={localFilters.created_before || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      created_before: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Probability Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Waarschijnlijkheid (%)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="probability_min" className="text-xs text-muted-foreground">
                  Minimum
                </Label>
                <Input
                  id="probability_min"
                  type="number"
                  min="0"
                  max="100"
                  step="10"
                  placeholder="0%"
                  value={localFilters.probability_min || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      probability_min: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="probability_max" className="text-xs text-muted-foreground">
                  Maximum
                </Label>
                <Input
                  id="probability_max"
                  type="number"
                  min="0"
                  max="100"
                  step="10"
                  placeholder="100%"
                  value={localFilters.probability_max || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      probability_max: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleApply} className="flex-1">
              Toepassen
            </Button>
            <Button onClick={() => setIsOpen(false)} variant="outline" className="flex-1">
              Annuleren
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
