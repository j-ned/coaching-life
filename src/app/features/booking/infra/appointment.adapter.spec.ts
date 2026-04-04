import { toAppointment, toDisabledDate, toInsert } from './appointment.adapter';
import type { AppointmentRow, DisabledDateRow } from './appointment.adapter';
import { AppointmentFormDataBuilder } from '../test-utils/appointment.builder';

describe('appointment.adapter', () => {
  describe('toAppointment', () => {
    it.each([
      {
        label: 'un rendez-vous complet',
        row: {
          id: 'apt-001',
          created_at: '2026-03-01T09:00:00.000Z',
          client_name: 'Marie Dupont',
          client_email: 'marie@email.fr',
          client_phone: '06 12 34 56 78',
          coaching_type: 'life-coaching',
          appointment_date: '2026-03-15',
          appointment_time: '10:00',
          duration: 60,
          message: 'Coaching de vie',
          status: 'pending',
        } satisfies AppointmentRow,
        expected: {
          id: 'apt-001',
          clientName: 'Marie Dupont',
          clientEmail: 'marie@email.fr',
          clientPhone: '06 12 34 56 78',
          coachingType: 'life-coaching',
          appointmentDate: '2026-03-15',
          appointmentTime: '10:00',
          duration: 60,
          message: 'Coaching de vie',
          status: 'pending',
          createdAt: '2026-03-01T09:00:00.000Z',
        },
      },
      {
        label: 'un rendez-vous avec message null',
        row: {
          id: 'apt-002',
          created_at: '2026-03-10T11:00:00.000Z',
          client_name: 'Jean Martin',
          client_email: 'jean@email.fr',
          client_phone: '07 98 76 54 32',
          coaching_type: 'equine-coaching',
          appointment_date: '2026-04-01',
          appointment_time: '14:00',
          duration: 90,
          message: null as unknown as string,
          status: 'confirmed',
        } satisfies AppointmentRow,
        expected: {
          id: 'apt-002',
          clientName: 'Jean Martin',
          clientEmail: 'jean@email.fr',
          clientPhone: '07 98 76 54 32',
          coachingType: 'equine-coaching',
          appointmentDate: '2026-04-01',
          appointmentTime: '14:00',
          duration: 90,
          message: '',
          status: 'confirmed',
          createdAt: '2026-03-10T11:00:00.000Z',
        },
      },
    ])('should convert $label from snake_case to camelCase', ({ row, expected }) => {
      expect(toAppointment(row)).toEqual(expected);
    });
  });

  describe('toDisabledDate', () => {
    it('should convert a disabled date with reason', () => {
      const row: DisabledDateRow = { id: 'dd-001', date: '2026-03-20', reason: 'Jour férié' };
      expect(toDisabledDate(row)).toEqual({
        id: 'dd-001',
        date: '2026-03-20',
        reason: 'Jour férié',
      });
    });

    it('should convert null reason to undefined', () => {
      const row: DisabledDateRow = { id: 'dd-002', date: '2026-12-25', reason: null };
      expect(toDisabledDate(row)).toEqual({ id: 'dd-002', date: '2026-12-25', reason: undefined });
    });
  });

  describe('toInsert', () => {
    it('should convert form data to snake_case', () => {
      const formData = AppointmentFormDataBuilder.default()
        .with('clientName', 'Sophie Lefèvre')
        .with('clientEmail', 'sophie@email.fr')
        .with('coachingType', 'personal-development')
        .with('appointmentDate', '2026-05-10')
        .with('appointmentTime', '09:00')
        .with('duration', 45)
        .build();

      expect(toInsert(formData)).toEqual({
        client_name: 'Sophie Lefèvre',
        client_email: 'sophie@email.fr',
        client_phone: '06 12 34 56 78',
        coaching_type: 'personal-development',
        appointment_date: '2026-05-10',
        appointment_time: '09:00',
        duration: 45,
        message: 'Je souhaite travailler sur ma confiance en soi.',
      });
    });
  });
});
