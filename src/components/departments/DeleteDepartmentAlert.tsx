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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Department } from '@/hooks/useDepartments';

interface DeleteDepartmentAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
  onConfirm: () => void;
}

export function DeleteDepartmentAlert({
  open,
  onOpenChange,
  department,
  onConfirm,
}: DeleteDepartmentAlertProps) {
  if (!department) return null;

  const employeeCount = department.employee_count || 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Afdeling verwijderen?</AlertDialogTitle>
          <AlertDialogDescription>
            Weet je zeker dat je "{department.name}" wilt verwijderen?

            {employeeCount > 0 && (
              <Alert variant="default" className="mt-4 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Let op: {employeeCount} medewerker{employeeCount !== 1 ? 's' : ''} {employeeCount !== 1 ? 'zijn' : 'is'} gekoppeld aan deze afdeling.
                  {employeeCount !== 1 ? ' Ze worden' : ' Deze wordt'} niet verwijderd maar {employeeCount !== 1 ? 'hebben' : 'heeft'} geen afdeling meer.
                </AlertDescription>
              </Alert>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Verwijderen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
