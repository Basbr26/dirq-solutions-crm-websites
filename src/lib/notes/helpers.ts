import { format, differenceInDays, isPast } from 'date-fns';
import { nl } from 'date-fns/locale';

export const CATEGORIES = [
  { value: '1-on-1', label: '1-on-1 Gesprek', icon: '💬', variant: 'default' as const },
  { value: 'performance', label: 'Performance', icon: '📊', variant: 'secondary' as const },
  { value: 'feedback', label: 'Feedback', icon: '💭', variant: 'outline' as const },
  { value: 'concern', label: 'Concern', icon: '⚠️', variant: 'destructive' as const },
  { value: 'achievement', label: 'Achievement', icon: '🏆', variant: 'default' as const },
  { value: 'general', label: 'Algemeen', icon: '📝', variant: 'secondary' as const },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: 'private', label: '🔒 Privé (alleen ik)', description: 'Alleen jij kunt deze notitie zien' },
  { value: 'team', label: '👥 Team', description: 'Zichtbaar voor je team' },
  { value: 'manager_shared', label: '👔 Gedeeld met manager', description: 'Zichtbaar voor managers en admins' },
] as const;

export function getCategoryVariant(category: string) {
  return CATEGORIES.find(c => c.value === category)?.variant || 'default';
}

export function getCategoryIcon(category: string) {
  return CATEGORIES.find(c => c.value === category)?.icon || '📝';
}

export function getCategoryLabel(category: string) {
  return CATEGORIES.find(c => c.value === category)?.label || category;
}

export function getVisibilityLabel(visibility: string) {
  return VISIBILITY_OPTIONS.find(v => v.value === visibility)?.label || visibility;
}

export function formatNoteDate(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: nl });
}

export function formatFollowUpDate(date: string | Date) {
  return format(new Date(date), 'dd MMMM yyyy', { locale: nl });
}

export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  return isPast(new Date(date));
}

export function getDaysOverdue(date: string | Date): number {
  const diff = differenceInDays(new Date(), new Date(date));
  return Math.max(0, diff);
}

export function getFollowUpStatus(
  followUpRequired: boolean,
  followUpCompleted: boolean,
  followUpDate: string | Date | null
) {
  if (!followUpRequired) return null;
  
  if (followUpCompleted) {
    return { status: 'completed', variant: 'default' as const, label: 'Voltooid' };
  }
  
  if (!followUpDate) {
    return { status: 'pending', variant: 'secondary' as const, label: 'Open' };
  }
  
  if (isOverdue(followUpDate)) {
    const days = getDaysOverdue(followUpDate);
    return { 
      status: 'overdue', 
      variant: 'destructive' as const, 
      label: `Verlopen (${days} ${days === 1 ? 'dag' : 'dagen'})` 
    };
  }
  
  return { status: 'upcoming', variant: 'secondary' as const, label: 'Gepland' };
}

export function filterNotes<T extends {
  title: string;
  content: string;
  category: string;
  follow_up_required: boolean;
  follow_up_completed: boolean;
  is_pinned: boolean;
  tags?: string[] | null;
}>(
  notes: T[],
  filters: {
    search?: string;
    category?: string;
    showFollowUpsOnly?: boolean;
    showPinnedOnly?: boolean;
  }
): T[] {
  let filtered = [...notes];
  
  // Search filter
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(note =>
      note.title.toLowerCase().includes(search) ||
      note.content.toLowerCase().includes(search) ||
      note.tags?.some(tag => tag.toLowerCase().includes(search))
    );
  }
  
  // Category filter
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(note => note.category === filters.category);
  }
  
  // Follow-ups only filter
  if (filters.showFollowUpsOnly) {
    filtered = filtered.filter(note =>
      note.follow_up_required && !note.follow_up_completed
    );
  }
  
  // Pinned only filter
  if (filters.showPinnedOnly) {
    filtered = filtered.filter(note => note.is_pinned);
  }
  
  return filtered;
}

export function sortNotes<T extends {
  is_pinned: boolean;
  created_at: string;
}>(notes: T[]): T[] {
  return [...notes].sort((a, b) => {
    // Pinned notes first
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    
    // Then by date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function calculateNoteStats<T extends {
  created_at: string;
  follow_up_required: boolean;
  follow_up_completed: boolean;
  category: string;
}>(notes: T[]) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return {
    total: notes.length,
    pendingFollowUps: notes.filter(n => n.follow_up_required && !n.follow_up_completed).length,
    last30Days: notes.filter(n => new Date(n.created_at) >= thirtyDaysAgo).length,
    byCategory: CATEGORIES.reduce((acc, cat) => {
      acc[cat.value] = notes.filter(n => n.category === cat.value).length;
      return acc;
    }, {} as Record<string, number>),
  };
}
