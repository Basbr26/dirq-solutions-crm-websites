-- Update naam voor Bas Brouwer
UPDATE public.profiles
SET 
  voornaam = 'Bas',
  achternaam = 'Brouwer',
  updated_at = now()
WHERE email = 'bas@dirqsolutions.nl';