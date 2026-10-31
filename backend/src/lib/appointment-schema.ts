import { z } from 'zod';

const coachingTypeSchema = z.enum([
  'life-coaching',
  'personal-development',
  'equine-coaching',
  'neuroatypical-parents',
]);

export const createAppointmentSchema = z.object({
  client_name: z.string().min(2).max(100),
  client_email: z.string().email(),
  client_phone: z.string().min(8).max(20),
  coaching_type: coachingTypeSchema,
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointment_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().int().positive(),
  message: z.string().max(2000).optional().default(''),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
