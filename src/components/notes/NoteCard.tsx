import { useState } from 'react';
import { MoreVertical, Edit, Pin, PinOff, Trash, CheckCircle, User, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HRNote } from '@/hooks/useEmployeeNotes';
import {
  getCategoryVariant,
  getCategoryIcon,
  getCategoryLabel,
  getVisibilityLabel,
  formatNoteDate,
  formatFollowUpDate,
  getFollowUpStatus,
  isOverdue,
  getDaysOverdue,
} from '@/lib/notes/helpers';
import { cn } from '@/lib/utils';

interface NoteCardProps {
  note: HRNote;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onFollowUpComplete?: () => void;
}

export function NoteCard({ note, onEdit, onDelete, onPin, onFollowUpComplete }: NoteCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isPinned = note.is_pinned;
  
  const followUpStatus = note.follow_up_required
    ? getFollowUpStatus(note.follow_up_required, note.follow_up_completed, note.follow_up_date)
    : null;

  return (
    <>
      <Card className={cn(isPinned && 'border-yellow-500 border-2')}>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              {/* Title with category badge */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-semibold text-base">{note.title}</h4>
                <Badge variant={getCategoryVariant(note.category)}>
                  {getCategoryIcon(note.category)} {getCategoryLabel(note.category)}
                </Badge>

                {isPinned && (
                  <Badge variant="outline" className="gap-1">
                    <Pin className="h-3 w-3" />
                    Gepind
                  </Badge>
                )}

                {followUpStatus && !note.follow_up_completed && (
                  <Badge variant={followUpStatus.variant} className="gap-1">
                    <Clock className="h-3 w-3" />
                    {followUpStatus.label}
                  </Badge>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>
                    {note.created_by_profile?.voornaam} {note.created_by_profile?.achternaam}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatNoteDate(note.created_at)}</span>
                </div>
                {note.visibility !== 'private' && (
                  <Badge variant="outline" className="text-xs">
                    {getVisibilityLabel(note.visibility)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Bewerken
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPin}>
                  {isPinned ? (
                    <>
                      <PinOff className="mr-2 h-4 w-4" />
                      Losmaken
                    </>
                  ) : (
                    <>
                      <Pin className="mr-2 h-4 w-4" />
                      Vastpinnen
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Verwijderen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Content */}
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{note.content}</div>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Follow-up section */}
          {note.follow_up_required && (
            <Alert
              variant={note.follow_up_completed ? 'default' : (followUpStatus?.variant === 'secondary' ? 'default' : followUpStatus?.variant)}
              className={cn(
                note.follow_up_completed && 'border-green-500 bg-green-50',
                followUpStatus?.status === 'overdue' && 'border-destructive'
              )}
            >
              <Clock className="h-4 w-4" />
              <AlertTitle className="mb-2">
                {note.follow_up_completed ? '✓ Follow-up afgerond' : 'Follow-up vereist'}
              </AlertTitle>
              <AlertDescription>
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1">
                    {note.follow_up_date && (
                      <p className="text-sm">
                        <strong>Deadline:</strong> {formatFollowUpDate(note.follow_up_date)}
                      </p>
                    )}
                    {!note.follow_up_completed &&
                      note.follow_up_date &&
                      isOverdue(note.follow_up_date) && (
                        <p className="text-sm font-medium mt-1 text-destructive">
                          ⚠️ Verlopen sinds {getDaysOverdue(note.follow_up_date)} dag
                          {getDaysOverdue(note.follow_up_date) !== 1 ? 'en' : ''}
                        </p>
                      )}
                  </div>
                  {!note.follow_up_completed && onFollowUpComplete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onFollowUpComplete}
                      className="shrink-0"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Markeer als voltooid
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        {note.updated_at !== note.created_at && (
          <CardFooter className="pt-0">
            <p className="text-xs text-muted-foreground">
              Laatst bewerkt: {formatNoteDate(note.updated_at)}
            </p>
          </CardFooter>
        )}
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notitie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze notitie wilt verwijderen? Deze actie kan niet ongedaan
              worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
