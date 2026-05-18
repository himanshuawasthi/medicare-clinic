import { z } from 'zod';

export const PatientSearchSchema = z.object({
  query: z.string().min(2, 'Enter at least 2 characters to search'),
});

export const PatientCreateSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200),
  mobile: z
    .string()
    .regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  gender: z.enum(['M', 'F', 'O'], { required_error: 'Gender is required' }),
  dob: z.string().optional(),
  age_years: z.number().int().min(1).max(120).optional(),
  address: z.string().optional(),
  allergies: z.string().optional(),
}).refine(
  (d) => d.dob !== undefined || d.age_years !== undefined,
  { message: 'Either date of birth or age is required', path: ['dob'] },
);

export type PatientSearch = z.infer<typeof PatientSearchSchema>;
export type PatientCreate = z.infer<typeof PatientCreateSchema>;