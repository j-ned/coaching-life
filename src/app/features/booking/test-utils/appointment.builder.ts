import type {
  Appointment,
  AppointmentFormData,
  DisabledDate,
} from '../domain/models/appointment.model';

export class AppointmentBuilder {
  private entity: Appointment = {
    id: 'apt-001',
    clientName: 'Marie Dupont',
    clientEmail: 'marie.dupont@email.fr',
    clientPhone: '06 12 34 56 78',
    coachingType: 'life-coaching',
    appointmentDate: '2026-03-15',
    appointmentTime: '10:00',
    duration: 60,
    message: 'Je souhaite travailler sur ma confiance en soi.',
    status: 'pending',
    createdAt: '2026-03-01T09:00:00.000Z',
  };

  private constructor() {}

  static default(): AppointmentBuilder {
    return new AppointmentBuilder();
  }

  with<K extends keyof Appointment>(key: K, value: Appointment[K]): AppointmentBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): Appointment {
    return { ...this.entity };
  }
}

export class AppointmentFormDataBuilder {
  private entity: AppointmentFormData = {
    clientName: 'Marie Dupont',
    clientEmail: 'marie.dupont@email.fr',
    clientPhone: '06 12 34 56 78',
    coachingType: 'life-coaching',
    appointmentDate: '2026-03-15',
    appointmentTime: '10:00',
    duration: 60,
    message: 'Je souhaite travailler sur ma confiance en soi.',
  };

  private constructor() {}

  static default(): AppointmentFormDataBuilder {
    return new AppointmentFormDataBuilder();
  }

  with<K extends keyof AppointmentFormData>(
    key: K,
    value: AppointmentFormData[K],
  ): AppointmentFormDataBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): AppointmentFormData {
    return { ...this.entity };
  }
}

export class DisabledDateBuilder {
  private entity: DisabledDate = {
    id: 'dd-001',
    date: '2026-03-20',
    reason: 'Jour férié',
  };

  private constructor() {}

  static default(): DisabledDateBuilder {
    return new DisabledDateBuilder();
  }

  with<K extends keyof DisabledDate>(key: K, value: DisabledDate[K]): DisabledDateBuilder {
    this.entity = { ...this.entity, [key]: value };
    return this;
  }

  build(): DisabledDate {
    return { ...this.entity };
  }
}
