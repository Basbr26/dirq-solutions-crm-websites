import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Pencil, Trash2, FileText, Laptop, Users, Shield, Briefcase, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  category: string;
  due_days: number;
  is_required: boolean;
  assigned_to_role: string;
  sort_order: number;
}

interface SortableTaskItemProps {
  item: TemplateItem;
  onEdit: (item: TemplateItem) => void;
  onDelete: (item: TemplateItem) => void;
}

const categoryOptions = [
  { value: 'administratie', label: 'Administratie', icon: FileText },
  { value: 'it', label: 'IT & Systemen', icon: Laptop },
  { value: 'sociaal', label: 'Kennismaking', icon: Users },
  { value: 'compliance', label: 'Compliance', icon: Shield },
  { value: 'werk', label: 'Werkzaamheden', icon: Briefcase },
  { value: 'algemeen', label: 'Algemeen', icon: ClipboardCheck },
];

const roleOptions = [
  { value: 'employee', label: 'Medewerker' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
];

export function SortableTaskItem({ item, onEdit, onDelete }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getCategoryIcon = (category: string) => {
    const cat = categoryOptions.find(c => c.value === category);
    if (cat) {
      const Icon = cat.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <ClipboardCheck className="h-4 w-4" />;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border bg-card transition-all',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div className="p-2 rounded-lg bg-muted text-muted-foreground">
        {getCategoryIcon(item.category)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.title}</span>
          {item.is_required && (
            <Badge variant="outline" className="text-xs">Verplicht</Badge>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
          <span>
            Categorie: {categoryOptions.find(c => c.value === item.category)?.label || item.category}
          </span>
          <span>•</span>
          <span>Deadline: {item.due_days} dagen</span>
          <span>•</span>
          <span>
            Toegewezen aan: {roleOptions.find(r => r.value === item.assigned_to_role)?.label || item.assigned_to_role}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(item)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
