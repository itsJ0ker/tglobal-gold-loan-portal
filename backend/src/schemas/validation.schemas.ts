import { z } from 'zod';

export const nameRegex = /^[a-zA-Z\s]{2,60}$/;
export const indianMobileRegex = /^[6-9]\d{9}$/;

export const QuoteRequestSchema = z
  .object({
    grossWeightGrams: z
      .number({ invalid_type_error: 'Gross weight must be a number' })
      .positive('Gross weight must be greater than 0')
      .max(1000, 'Gross weight cannot exceed 1000g'),
    netWeightGrams: z
      .number({ invalid_type_error: 'Net weight must be a number' })
      .positive('Net weight must be greater than 0')
      .max(1000, 'Net weight cannot exceed 1000g'),
    karat: z.union([z.literal(18), z.literal(22), z.literal(24)], {
      errorMap: () => ({ message: 'Karat must be one of 18, 22, or 24' }),
    }),
  })
  .refine((data) => data.netWeightGrams <= data.grossWeightGrams, {
    message: 'Net weight cannot exceed gross weight',
    path: ['netWeightGrams'],
  });

export const LeadCreateSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name must not exceed 60 characters')
      .regex(nameRegex, 'Name must contain letters and spaces only'),
    mobileNumber: z
      .string()
      .trim()
      .regex(indianMobileRegex, 'Mobile number must be a valid 10-digit Indian number starting with 6-9'),
    grossWeightGrams: z
      .number({ invalid_type_error: 'Gross weight must be a number' })
      .positive('Gross weight must be greater than 0')
      .max(1000, 'Gross weight cannot exceed 1000g'),
    netWeightGrams: z
      .number({ invalid_type_error: 'Net weight must be a number' })
      .positive('Net weight must be greater than 0')
      .max(1000, 'Net weight cannot exceed 1000g'),
    karat: z.union([z.literal(18), z.literal(22), z.literal(24)], {
      errorMap: () => ({ message: 'Karat must be one of 18, 22, or 24' }),
    }),
    planId: z.string().min(1, 'Loan plan ID is required'),
  })
  .refine((data) => data.netWeightGrams <= data.grossWeightGrams, {
    message: 'Net weight cannot exceed gross weight',
    path: ['netWeightGrams'],
  });

export type QuoteRequestInput = z.infer<typeof QuoteRequestSchema>;
export type LeadCreateInput = z.infer<typeof LeadCreateSchema>;
