import { z } from 'zod';

export const VitalsSchema = z.object({
  sys_bp:     z.number().int().positive().optional(),
  dia_bp:     z.number().int().positive().optional(),
  pulse:      z.number().int().positive().optional(),
  temp_f:     z.number().positive().optional(),
  weight_kg:  z.number().positive().optional(),
  height_cm:  z.number().positive().optional(),
});

export const PrescriptionItemSchema = z.object({
  inventory_id:   z.string().uuid().optional(),
  medicine_name:  z.string().min(1, 'Medicine name is required'),
  dosage:         z.string().min(1, 'Dosage is required'),
  frequency:      z.string().min(1, 'Frequency is required'),
  duration_days:  z.number().int().positive().optional(),
  quantity:       z.number().int().positive('Quantity must be at least 1'),
});

export const PrescriptionCreateSchema = z.object({
  patient_id:         z.string().uuid(),
  symptoms:           z.string().min(1, 'Symptoms are required').max(2000),
  vitals:             VitalsSchema.optional(),
  items:              z.array(PrescriptionItemSchema).min(1, 'At least one medicine is required'),
  recommended_tests:  z.array(z.string()).optional(),
  doctor_notes:       z.string().max(1000).optional(),
});

export const PrescriptionEditPendingSchema = z.object({
  prescription_id: z.string().uuid(),
  changes: z.object({
    symptoms:           z.string().min(1).max(2000).optional(),
    vitals:             VitalsSchema.optional(),
    doctor_notes:       z.string().max(1000).optional(),
    recommended_tests:  z.array(z.string()).optional(),
    items:              z.array(PrescriptionItemSchema).min(1).optional(),
  }),
});

export type Vitals = z.infer<typeof VitalsSchema>;
export type PrescriptionItem = z.infer<typeof PrescriptionItemSchema>;
export type PrescriptionCreate = z.infer<typeof PrescriptionCreateSchema>;
export type PrescriptionEditPending = z.infer<typeof PrescriptionEditPendingSchema>;