import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string | null;
  manager?: {
    id: string;
    voornaam: string;
    achternaam: string;
    avatar_url?: string | null;
  } | null;
  employee_count?: number;
}

export interface DepartmentForm {
  name: string;
  description?: string;
  manager_id?: string;
}

/**
 * Departments Query Hook
 * Fetches all departments with manager information and employee counts.
 * Includes mutation functions for CRUD operations.
 * 
 * @returns Object with query data and mutation functions
 * @returns data - Array of departments with manager and employee_count
 * @returns isLoading - Loading state
 * @returns error - Error object if query failed
 * @returns createDepartment - Mutation to create new department
 * @returns updateDepartment - Mutation to update department
 * @returns deleteDepartment - Mutation to delete department
 * 
 * @example
 * ```tsx
 * const { 
 *   data: departments, 
 *   isLoading,
 *   createDepartment,
 *   updateDepartment 
 * } = useDepartments();
 * 
 * // Create department
 * createDepartment.mutate({
 *   name: 'Sales',
 *   description: 'Sales team',
 *   manager_id: 'user-123'
 * });
 * 
 * // Display departments
 * {departments?.map(dept => (
 *   <div key={dept.id}>
 *     {dept.name} - {dept.employee_count} employees
 *     Manager: {dept.manager?.voornaam}
 *   </div>
 * ))}
 * ```
 */
export function useDepartments() {
  const queryClient = useQueryClient();

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      logger.debug('Fetching departments list');
      
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          manager:profiles!departments_manager_id_fkey(
            id, 
            voornaam, 
            achternaam
          )
        `)
        .order('name');

      if (error) {
        logger.error('Failed to fetch departments', { error });
        throw error;
      }

      // Get employee counts for each department
      const departmentsWithCounts = await Promise.all(
        (data || []).map(async (dept) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id);

          return {
            ...dept,
            employee_count: count || 0,
          };
        })
      );

      logger.info('Departments loaded successfully', { count: departmentsWithCounts.length });
      return departmentsWithCounts as Department[];
    },
  });

  const createDepartment = useMutation({
    mutationFn: async (department: DepartmentForm) => {
      logger.info('Creating new department', { name: department.name });
      
      const { data, error } = await supabase
        .from('departments')
        .insert({
          name: department.name,
          description: department.description || null,
          manager_id: department.manager_id || null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create department', { department, error });
        throw error;
      }

      logger.info('Department created successfully', { departmentId: data.id, name: data.name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Afdeling aangemaakt');
    },
    onError: (error) => {
      toast.error(`Fout bij aanmaken: ${error.message}`);
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, ...updates }: DepartmentForm & { id: string }) => {
      logger.info('Updating department', { departmentId: id });
      
      const { data, error } = await supabase
        .from('departments')
        .update({
          name: updates.name,
          description: updates.description || null,
          manager_id: updates.manager_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update department', { departmentId: id, error });
        throw error;
      }

      logger.info('Department updated successfully', { departmentId: data.id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Afdeling bijgewerkt');
    },
    onError: (error) => {
      toast.error(`Fout bij bijwerken: ${error.message}`);
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      logger.info('Deleting department', { departmentId: id });
      
      // First, unlink employees
      const { error: unlinkError } = await supabase
        .from('profiles')
        .update({ department_id: null })
        .eq('department_id', id);

      if (unlinkError) {
        logger.error('Failed to unlink employees from department', { departmentId: id, error: unlinkError });
        throw unlinkError;
      }

      // Then delete department
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Failed to delete department', { departmentId: id, error });
        throw error;
      }

      logger.info('Department deleted successfully', { departmentId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Afdeling verwijderd');
    },
    onError: (error) => {
      toast.error(`Fout bij verwijderen: ${error.message}`);
    },
  });

  return {
    data: departmentsQuery.data || [],
    isLoading: departmentsQuery.isLoading,
    error: departmentsQuery.error,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}

export function useManagers() {
  return useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      logger.debug('Fetching managers list');
      
      // Get users with manager, hr or super_admin roles
      const { data: roleData, error: roleError } = await supabase
        .from('profiles')
        .select('id, role')
        .in('role', ['MANAGER', 'ADMIN', 'super_admin']);

      if (roleError) {
        logger.error('Failed to fetch manager roles', { error: roleError });
        throw roleError;
      }

      const managerIds = roleData?.map((r) => r.id) || [];

      if (managerIds.length === 0) {
        logger.warn('No managers found in system');
        return [];
      }

      // Get profiles for these users
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, functie, email')
        .in('id', managerIds)
        .order('voornaam');

      if (error) {
        logger.error('Failed to fetch manager profiles', { error });
        throw error;
      }

      logger.info('Managers loaded successfully', { count: data?.length || 0 });
      return data || [];
    },
  });
}
