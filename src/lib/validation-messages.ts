/**
 * Dutch Validation Messages for Zod
 * 
 * Provides Dutch error messages for all Zod validations.
 * Set globally at application start.
 */

import { z } from 'zod';

// Custom Dutch error map
const dutchErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === 'string') {
        return { message: 'Dit veld is verplicht' };
      }
      if (issue.expected === 'number') {
        return { message: 'Voer een geldig nummer in' };
      }
      if (issue.expected === 'boolean') {
        return { message: 'Dit veld moet waar of onwaar zijn' };
      }
      if (issue.expected === 'date') {
        return { message: 'Voer een geldige datum in' };
      }
      return { message: `Verwacht ${issue.expected}, maar kreeg ${issue.received}` };

    case z.ZodIssueCode.invalid_literal:
      return { message: `Ongeldige waarde: verwacht ${JSON.stringify(issue.expected)}` };

    case z.ZodIssueCode.unrecognized_keys:
      return {
        message: `Onbekende veld(en) in object: ${issue.keys.map((k) => `'${k}'`).join(', ')}`,
      };

    case z.ZodIssueCode.invalid_union:
      return { message: 'Ongeldige invoer' };

    case z.ZodIssueCode.invalid_union_discriminator:
      return {
        message: `Ongeldige discriminator waarde. Verwacht ${issue.options.map((o) => `'${String(o)}'`).join(' | ')}`,
      };

    case z.ZodIssueCode.invalid_enum_value:
      return {
        message: `Ongeldige waarde. Verwacht ${issue.options.map((o) => `'${o}'`).join(' | ')}`,
      };

    case z.ZodIssueCode.invalid_arguments:
      return { message: 'Ongeldige functie argumenten' };

    case z.ZodIssueCode.invalid_return_type:
      return { message: 'Ongeldig return type' };

    case z.ZodIssueCode.invalid_date:
      return { message: 'Ongeldige datum' };

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        return { message: 'Voer een geldig e-mailadres in' };
      }
      if (issue.validation === 'url') {
        return { message: 'Voer een geldige URL in' };
      }
      if (issue.validation === 'uuid') {
        return { message: 'Voer een geldige UUID in' };
      }
      if (issue.validation === 'regex') {
        return { message: 'Ongeldige indeling' };
      }
      if (issue.validation === 'cuid') {
        return { message: 'Voer een geldige CUID in' };
      }
      if (issue.validation === 'datetime') {
        return { message: 'Voer een geldige datum/tijd in' };
      }
      return { message: `Ongeldige ${issue.validation}` };

    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return {
          message: issue.exact
            ? `Dit veld moet exact ${issue.minimum} karakters zijn`
            : `Dit veld moet minimaal ${issue.minimum} karakters bevatten`,
        };
      }
      if (issue.type === 'number') {
        return {
          message: issue.exact
            ? `Waarde moet exact ${issue.minimum} zijn`
            : `Waarde moet minimaal ${issue.minimum} zijn`,
        };
      }
      if (issue.type === 'array') {
        return {
          message: issue.exact
            ? `Array moet exact ${issue.minimum} element(en) bevatten`
            : `Array moet minimaal ${issue.minimum} element(en) bevatten`,
        };
      }
      if (issue.type === 'date') {
        return { message: `Datum moet na ${new Date(issue.minimum as number).toLocaleDateString('nl-NL')} zijn` };
      }
      return { message: `Waarde is te klein` };

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return {
          message: issue.exact
            ? `Dit veld moet exact ${issue.maximum} karakters zijn`
            : `Dit veld mag maximaal ${issue.maximum} karakters bevatten`,
        };
      }
      if (issue.type === 'number') {
        return {
          message: issue.exact
            ? `Waarde moet exact ${issue.maximum} zijn`
            : `Waarde mag maximaal ${issue.maximum} zijn`,
        };
      }
      if (issue.type === 'array') {
        return {
          message: issue.exact
            ? `Array moet exact ${issue.maximum} element(en) bevatten`
            : `Array mag maximaal ${issue.maximum} element(en) bevatten`,
        };
      }
      if (issue.type === 'date') {
        return { message: `Datum moet voor ${new Date(issue.maximum as number).toLocaleDateString('nl-NL')} zijn` };
      }
      return { message: `Waarde is te groot` };

    case z.ZodIssueCode.custom:
      return { message: issue.message || 'Ongeldige invoer' };

    case z.ZodIssueCode.invalid_intersection_types:
      return { message: 'Intersectie types kunnen niet worden samengevoegd' };

    case z.ZodIssueCode.not_multiple_of:
      return { message: `Waarde moet een veelvoud zijn van ${issue.multipleOf}` };

    case z.ZodIssueCode.not_finite:
      return { message: 'Waarde moet eindig zijn' };

    default:
      return { message: ctx.defaultError };
  }
};

// Set as global default error map
z.setErrorMap(dutchErrorMap);

// Re-export z for use throughout the app
export { z };
