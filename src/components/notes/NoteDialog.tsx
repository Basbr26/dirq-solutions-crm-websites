import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagInput } from './TagInput';
import { CATEGORIES, VISIBILITY_OPTIONS } from '@/lib/notes/helpers';
import { HRNote, useCreateNote, useUpdateNote, CreateNoteInput } from '@/hooks/useEmployeeNotes';
import { format } from 'date-fns';

const noteSchema = z.object({
  title: z.string().min(1, 'Titel is verplicht').max(200, 'Titel mag maximaal 200 tekens zijn'),
  content: z.string().min(1, 'Notitie is verplicht'),
  category: z.string().min(1, 'Categorie is verplicht'),
  visibility: z.string().default('private'),
  follow_up_required: z.boolean().default(false),
  follow_up_date: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  is_pinned: z.boolean().default(false),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  note?: HRNote;
}

export function NoteDialog({ open, onOpenChange, employeeId, note }: NoteDialogProps) {
  const isEdit = !!note;
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: '',
      content: '',
      category: 'general',
      visibility: 'private',
      follow_up_required: false,
      follow_up_date: null,
      tags: [],
      is_pinned: false,
    },
  });

  // Reset form when dialog opens/closes or note changes
  useEffect(() => {
    if (open) {
      if (note) {
        form.reset({
          title: note.title,
          content: note.content,
          category: note.category,
          visibility: note.visibility,
          follow_up_required: note.follow_up_required,
          follow_up_date: note.follow_up_date || null,
          tags: note.tags || [],
          is_pinned: note.is_pinned,
        });
      } else {
        form.reset({
          title: '',
          content: '',
          category: 'general',
          visibility: 'private',
          follow_up_required: false,
          follow_up_date: null,
          tags: [],
          is_pinned: false,
        });
      }
    }
  }, [open, note, form]);

  const onSubmit = async (data: NoteFormData) => {
    try {
      if (isEdit) {
        await updateNote.mutateAsync({
          id: note.id,
          ...data,
        });
      } else {
        await createNote.mutateAsync({
          ...data,
          employee_id: employeeId,
        } as CreateNoteInput);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Submit note error:', error);
    }
  };

  const followUpRequired = form.watch('follow_up_required');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Notitie bewerken' : 'Nieuwe notitie'}</DialogTitle>
          <DialogDescription>
            Deze notitie is alleen zichtbaar voor HR en management
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel *</FormLabel>
                  <FormControl>
                    <Input placeholder="Bijv. 1-on-1 gesprek december 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorie *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notitie *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Beschrijf de notitie in detail..."
                      rows={8}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Beschrijf het gesprek, de observatie of feedback in detail
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visibility */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zichtbaarheid</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VISIBILITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col items-start">
                            <span>{opt.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {opt.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (optioneel)</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Typ en druk Enter om tag toe te voegen"
                    />
                  </FormControl>
                  <FormDescription>
                    Tags helpen bij het organiseren en zoeken van notities
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow-up */}
            <FormField
              control={form.control}
              name="follow_up_required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Follow-up actie vereist</FormLabel>
                    <FormDescription>
                      Stel een deadline in voor vervolgactie op deze notitie
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Follow-up date (conditional) */}
            {followUpRequired && (
              <FormField
                control={form.control}
                name="follow_up_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up deadline *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormDescription>Wanneer moet deze actie worden uitgevoerd?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Pin */}
            <FormField
              control={form.control}
              name="is_pinned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      <Pin className="inline h-4 w-4 mr-1" />
                      Pin deze notitie bovenaan
                    </FormLabel>
                    <FormDescription>
                      Gepinde notities worden bovenaan de lijst getoond
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createNote.isPending || updateNote.isPending}
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={createNote.isPending || updateNote.isPending}
              >
                {isEdit ? 'Opslaan' : 'Notitie toevoegen'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
