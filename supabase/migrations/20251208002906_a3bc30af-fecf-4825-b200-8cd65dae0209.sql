-- Add manager_id to departments table
ALTER TABLE public.departments ADD COLUMN manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_departments_manager_id ON public.departments(manager_id);