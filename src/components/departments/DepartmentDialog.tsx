import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Department, useManagers } from '@/hooks/useDepartments';

const departmentSchema = z.object({
  name: z.string().min(2, 'Naam moet minimaal 2 karakters zijn').max(100, 'Naam mag maximaal 100 karakters zijn'),
  description: z.string().max(500, 'Beschrijving mag maximaal 500 karakters zijn').optional(),
  manager_id: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
  onSubmit: (data: DepartmentFormValues) => Promise<void>;
}

export function DepartmentDialog({
  open,
  onOpenChange,
  department,
  onSubmit,
}: DepartmentDialogProps) {
  const { data: managers, isLoading: managersLoading } = useManagers();
  const isEdit = !!department;

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
      manager_id: '',
    },
  });

  useEffect(() => {
    if (department) {
      form.reset({
        name: department.name,
        description: department.description || '',
        manager_id: department.manager_id || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        manager_id: '',
      });
    }
  }, [department, form]);

  const handleSubmit = async (data: DepartmentFormValues) => {
    try {
      console.log('📝 Submitting department data:', data);
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Error submitting department:', error);
      // Error will be handled by parent component
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Afdeling bewerken' : 'Nieuwe afdeling'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Pas de gegevens van de afdeling aan.'
              : 'Maak een nieuwe afdeling aan voor je organisatie.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Naam */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Afdelingsnaam <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="bijv. Sales, Engineering, HR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Beschrijving */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschrijving</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optionele beschrijving van de afdeling"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Manager */}
            <FormField
              control={form.control}
              name="manager_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manager</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={managersLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer manager (optioneel)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Geen manager</SelectItem>
                      {managers?.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.voornaam} {manager.achternaam}
                          {manager.functie && ` - ${manager.functie}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Bezig...'
                  : isEdit
                  ? 'Opslaan'
                  : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
