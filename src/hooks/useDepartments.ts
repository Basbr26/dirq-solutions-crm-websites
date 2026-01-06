import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

export function useDepartments() {
  const queryClient = useQueryClient();

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      console.log('🔍 Fetching departments...');
      
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
        console.error('❌ Error fetching departments:', error);
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

      console.log('✅ Departments loaded:', departmentsWithCounts.length);
      return departmentsWithCounts as Department[];
    },
  });

  const createDepartment = useMutation({
    mutationFn: async (department: DepartmentForm) => {
      console.log('➕ Creating department:', department);
      
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
        console.error('❌ Error creating department:', error);
        throw error;
      }

      console.log('✅ Department created:', data);
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
      console.log('📝 Updating department:', id, updates);
      
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
        console.error('❌ Error updating department:', error);
        throw error;
      }

      console.log('✅ Department updated:', data);
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
      console.log('🗑️ Deleting department:', id);
      
      // First, unlink employees
      const { error: unlinkError } = await supabase
        .from('profiles')
        .update({ department_id: null })
        .eq('department_id', id);

      if (unlinkError) {
        console.error('❌ Error unlinking employees:', unlinkError);
        throw unlinkError;
      }

      // Then delete department
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting department:', error);
        throw error;
      }

      console.log('✅ Department deleted');
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
      console.log('🔍 Fetching managers...');
      
      // Get users with manager, hr or super_admin roles
      const { data: roleData, error: roleError } = await supabase
        .from('profiles')
        .select('id, role')
        .in('role', ['MANAGER', 'ADMIN', 'super_admin']);

      if (roleError) {
        console.error('❌ Error fetching roles:', roleError);
        throw roleError;
      }

      const managerIds = roleData?.map((r) => r.id) || [];

      if (managerIds.length === 0) {
        console.log('⚠️ No managers found');
        return [];
      }

      // Get profiles for these users
      const { data, error } = await supabase
        .from('profiles')
        .select('id, voornaam, achternaam, functie, email')
        .in('id', managerIds)
        .order('voornaam');

      if (error) {
        console.error('❌ Error fetching manager profiles:', error);
        throw error;
      }

      console.log('✅ Managers loaded:', data?.length || 0);
      return data || [];
    },
  });
}
