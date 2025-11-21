import { z } from 'zod';

/**
 * Zod schema for book form validation
 * Supports both creating and updating books
 */
export const bookSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters'),
  description: z.string().optional(),
  genre: z
    .string()
    .max(100, 'Genre must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  isbn13: z
    .string()
    .max(13, 'ISBN-13 must be at most 13 characters')
    .refine(
      (val) => !val || /^[0-9]{13}$/.test(val),
      'ISBN-13 must be exactly 13 digits',
    )
    .optional()
    .or(z.literal('')),
  isbn10: z
    .string()
    .max(10, 'ISBN-10 must be at most 10 characters')
    .refine(
      (val) => !val || /^[0-9X]{10}$/.test(val),
      'ISBN-10 must be 10 digits or X',
    )
    .optional()
    .or(z.literal('')),
  publicationDate: z.string().optional().or(z.literal('')),
  authorIds: z.array(z.number()).optional(),
  coverImageUrl: z
    .string()
    .refine(
      (val) => !val || z.string().url().safeParse(val).success,
      'Must be a valid URL',
    )
    .optional()
    .or(z.literal('')),
});

/**
 * TypeScript types inferred from the schema
 */
export type BookFormData = z.infer<typeof bookSchema>;
