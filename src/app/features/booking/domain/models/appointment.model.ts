export type CoachingType =
  | 'life-coaching'
  | 'personal-development'
  | 'equine-coaching'
  | 'neuroatypical-parents';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export const COACHING_TYPE_LABELS: Record<CoachingType, string> = {
  'life-coaching': 'Coaching de Vie',
  'personal-development': 'Développement Personnel',
  'equine-coaching': 'Coaching Équin',
  'neuroatypical-parents': 'Parents Neuroatypiques',
};

export type Appointment = {
  readonly id: string;
  readonly clientName: string;
  readonly clientEmail: string;
  readonly clientPhone: string;
  readonly coachingType: CoachingType;
  readonly appointmentDate: string;
  readonly appointmentTime: string;
  readonly duration: number;
  readonly message: string;
  readonly status: AppointmentStatus;
  readonly createdAt: string;
};

export type AppointmentFormData = {
  readonly clientName: string;
  readonly clientEmail: string;
  readonly clientPhone: string;
  readonly coachingType: CoachingType;
  readonly appointmentDate: string;
  readonly appointmentTime: string;
  readonly duration: number;
  readonly message: string;
};

export type AppointmentSubmission = {
  readonly success: boolean;
  readonly message: string;
};

export type DisabledDate = {
  readonly id: string;
  readonly date: string;
  readonly reason?: string;
};
