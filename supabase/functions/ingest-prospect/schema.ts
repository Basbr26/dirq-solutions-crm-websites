/**
 * Zod Validation Schemas for Prospect Ingestion
 * Ensures data integrity before database insertion
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const ProspectSchema = z.object({
  company_name: z.string()
    .min(1, 'Company name is required')
    .max(255, 'Company name too long')
    .trim(),
    
  kvk_number: z.string()
    .regex(/^\d{8}$/, 'KVK number must be exactly 8 digits')
    .transform((val: string) => val.trim()),
    
  email: z.string()
    .email('Invalid email format')
    .optional()
    .nullable(),
    
  phone: z.string()
    .max(20, 'Phone number too long')
    .optional()
    .nullable(),
    
  city: z.string()
    .max(100, 'City name too long')
    .optional()
    .nullable(),
    
  linkedin_url: z.string()
    .url('Invalid URL format')
    .regex(/linkedin\.com/, 'Must be a LinkedIn URL')
    .optional()
    .nullable(),
    
  website_url: z.string()
    .url('Invalid website URL')
    .refine(
      (url: string) => !url?.includes('linkedin.com'), 
      'Use linkedin_url field for LinkedIn profiles'
    )
    .optional()
    .nullable(),
    
  source: z.enum([
    'n8n_automation', 
    'Apollo', 
    'KVK', 
    'Manual', 
    'Manus', 
    'Website'
  ]),
  
  tech_stack: z.array(z.string())
    .optional(),
    
  ai_audit_summary: z.string()
    .max(5000, 'AI summary too long')
    .optional()
});

export type ValidatedProspect = z.infer<typeof ProspectSchema>;
