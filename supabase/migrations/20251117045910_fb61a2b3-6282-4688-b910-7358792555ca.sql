-- Add expected_recovery_date column to sick_leave_cases table
ALTER TABLE public.sick_leave_cases 
ADD COLUMN expected_recovery_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN public.sick_leave_cases.expected_recovery_date IS 'Verwachte datum van betermelding/herstel';