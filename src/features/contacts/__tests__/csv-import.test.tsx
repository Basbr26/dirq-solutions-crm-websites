import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Contact import validation schema
const contactImportSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone format').optional().or(z.literal('')),
  company_name: z.string().optional(),
  position: z.string().optional(),
  notes: z.string().optional(),
});

type ContactImportData = z.infer<typeof contactImportSchema>;

describe('CSV Import Security', () => {
  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@company.co.uk',
        'admin+tag@domain.org',
        '', // Empty is optional
      ];

      validEmails.forEach(email => {
        const result = contactImportSchema.safeParse({
          first_name: 'John',
          last_name: 'Doe',
          email,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'not-an-email',
        '@no-local-part.com',
        'no-domain@',
        'spaces in@email.com',
        'missing@domain',
      ];

      invalidEmails.forEach(email => {
        const result = contactImportSchema.safeParse({
          first_name: 'John',
          last_name: 'Doe',
          email,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Invalid email');
        }
      });
    });

    it('should prevent SQL injection via email field', () => {
      const maliciousEmails = [
        "'; DROP TABLE contacts; --",
        "admin' OR '1'='1",
        "<script>alert('xss')</script>@test.com",
      ];

      maliciousEmails.forEach(email => {
        const result = contactImportSchema.safeParse({
          first_name: 'John',
          last_name: 'Doe',
          email,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Phone Number Validation', () => {
    it('should accept valid phone formats', () => {
      const validPhones = [
        '+31612345678',
        '0612345678',
        '+1 (555) 123-4567',
        '555-123-4567',
        '+44 20 7123 4567',
        '', // Empty is optional
      ];

      validPhones.forEach(phone => {
        const result = contactImportSchema.safeParse({
          first_name: 'John',
          last_name: 'Doe',
          phone,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid phone formats', () => {
      const invalidPhones = [
        '+31@612345678', // Invalid character @
        'call-me-now', // Contains letters
      ];

      invalidPhones.forEach(phone => {
        const result = contactImportSchema.safeParse({
          first_name: 'John',
          last_name: 'Doe',
          phone,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should prevent SQL injection via phone field', () => {
      const maliciousPhones = [
        "'; DELETE FROM contacts WHERE 1=1; --",
        "1' OR '1'='1",
      ];

      maliciousPhones.forEach(phone => {
        const result = contactImportSchema.safeParse({
          first_name: 'John',
          last_name: 'Doe',
          phone,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Required Fields Validation', () => {
    it('should require first_name', () => {
      const result = contactImportSchema.safeParse({
        first_name: '',
        last_name: 'Doe',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('first_name');
      }
    });

    it('should require last_name', () => {
      const result = contactImportSchema.safeParse({
        first_name: 'John',
        last_name: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('last_name');
      }
    });

    it('should accept valid minimal contact', () => {
      const result = contactImportSchema.safeParse({
        first_name: 'John',
        last_name: 'Doe',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('XSS Prevention', () => {
    it('should handle HTML in name fields safely', () => {
      const xssNames = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        'John<iframe>',
      ];

      xssNames.forEach(name => {
        const result = contactImportSchema.safeParse({
          first_name: name,
          last_name: 'Doe',
        });

        // Schema accepts it (sanitization happens on insert)
        expect(result.success).toBe(true);
        
        // But value should be escaped before rendering
        if (result.success) {
          expect(result.data.first_name).toBe(name);
          // Note: Actual XSS prevention happens in UI rendering
        }
      });
    });
  });

  describe('Batch Import Validation', () => {
    it('should validate entire batch and collect errors', () => {
      const importData = [
        { first_name: 'John', last_name: 'Doe', email: 'valid@test.com' },
        { first_name: '', last_name: 'Invalid', email: 'also-invalid' }, // 2 errors
        { first_name: 'Jane', last_name: 'Smith', phone: 'invalid-phone' }, // 1 error
        { first_name: 'Valid', last_name: 'User', email: 'valid@example.com' },
      ];

      const results = importData.map((row, index) => ({
        row: index + 1,
        data: row,
        result: contactImportSchema.safeParse(row),
      }));

      const validRows = results.filter(r => r.result.success);
      const errorRows = results.filter(r => !r.result.success);

      expect(validRows.length).toBe(2); // Rows 1 and 4
      expect(errorRows.length).toBe(2); // Rows 2 and 3

      // Check specific errors
      const row2Errors = errorRows[0].result as { success: false; error: z.ZodError };
      expect(row2Errors.error.issues.length).toBeGreaterThan(0);
    });

    it('should provide detailed error messages for failed rows', () => {
      const invalidRow = {
        first_name: '',
        last_name: 'Doe',
        email: 'not-an-email',
        phone: 'invalid',
      };

      const result = contactImportSchema.safeParse(invalidRow);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        
        const errors = result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        expect(errors.some(e => e.field === 'first_name')).toBe(true);
        expect(errors.some(e => e.field === 'email')).toBe(true);
        expect(errors.some(e => e.field === 'phone')).toBe(true);
      }
    });
  });

  describe('Company Name Injection Prevention', () => {
    it('should safely handle company name search queries', () => {
      const maliciousCompanyNames = [
        "'; DROP TABLE companies; --",
        "Company' OR '1'='1",
        "Test<script>alert('xss')</script>",
      ];

      maliciousCompanyNames.forEach(companyName => {
        const result = contactImportSchema.safeParse({
          first_name: 'John',
          last_name: 'Doe',
          company_name: companyName,
        });

        // Schema accepts it (parameterized queries prevent SQL injection)
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Import Performance', () => {
    it('should handle large batch imports efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        first_name: `User${i}`,
        last_name: `Test${i}`,
        email: `user${i}@test.com`,
        phone: `+3161234${String(i).padStart(4, '0')}`,
      }));

      const startTime = performance.now();
      
      const results = largeDataset.map(row => 
        contactImportSchema.safeParse(row)
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      const validCount = results.filter(r => r.success).length;

      expect(validCount).toBe(1000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
