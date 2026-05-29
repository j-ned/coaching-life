import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpAppointmentGateway } from './http-appointment.gateway';
import type { AppointmentRow, DisabledDateRow } from './appointment.adapter';
import { toAppointment, toDisabledDate, toInsert } from './appointment.adapter';
import { AppointmentFormDataBuilder } from '../test-utils/appointment.builder';

const APPOINTMENT_ROW: AppointmentRow = {
  id: 'apt-001',
  created_at: '2026-03-01T09:00:00.000Z',
  client_name: 'Marie Dupont',
  client_email: 'marie.dupont@email.fr',
  client_phone: '06 12 34 56 78',
  coaching_type: 'life-coaching',
  appointment_date: '2026-03-15',
  appointment_time: '10:00',
  duration: 60,
  message: 'Je souhaite travailler sur ma confiance en soi.',
  status: 'pending',
};

const DISABLED_DATE_ROW: DisabledDateRow = {
  id: 'dd-001',
  date: '2026-03-20',
  reason: 'Jour férié',
};

describe('HttpAppointmentGateway', () => {
  let gateway: HttpAppointmentGateway;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        HttpAppointmentGateway,
      ],
    });
    gateway = TestBed.inject(HttpAppointmentGateway);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getBookedSlots', () => {
    it('should GET booked slots for a month and map rows to domain', async () => {
      const promise = gateway.getBookedSlots('2026-03');

      const req = httpMock.expectOne('/api/appointments/booked?month=2026-03');
      expect(req.request.method).toBe('GET');
      req.flush([APPOINTMENT_ROW]);

      await expect(promise).resolves.toEqual([toAppointment(APPOINTMENT_ROW)]);
    });

    it('should return an empty array when the request fails', async () => {
      const promise = gateway.getBookedSlots('2026-03');

      httpMock
        .expectOne('/api/appointments/booked?month=2026-03')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).resolves.toEqual([]);
    });
  });

  describe('submitAppointment', () => {
    it('should POST the insert payload and return a success Result', async () => {
      const data = AppointmentFormDataBuilder.default().build();

      const promise = gateway.submitAppointment(data);

      const req = httpMock.expectOne('/api/appointments');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(toInsert(data));
      req.flush({});

      await expect(promise).resolves.toEqual({
        success: true,
        message: 'Votre rendez-vous a été réservé avec succès !',
      });
    });

    it('should return a failure Result when the request errors', async () => {
      const data = AppointmentFormDataBuilder.default().build();

      const promise = gateway.submitAppointment(data);

      httpMock
        .expectOne('/api/appointments')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).resolves.toEqual({
        success: false,
        message: 'Une erreur est survenue lors de la réservation. Veuillez réessayer.',
      });
    });
  });

  describe('getDisabledDates', () => {
    it('should GET disabled dates and map rows to domain', async () => {
      const promise = gateway.getDisabledDates();

      const req = httpMock.expectOne('/api/appointments/disabled-dates');
      expect(req.request.method).toBe('GET');
      req.flush([DISABLED_DATE_ROW]);

      await expect(promise).resolves.toEqual([toDisabledDate(DISABLED_DATE_ROW)]);
    });

    it('should return an empty array on network error', async () => {
      const promise = gateway.getDisabledDates();

      httpMock.expectOne('/api/appointments/disabled-dates').error(new ProgressEvent('error'));

      await expect(promise).resolves.toEqual([]);
    });
  });

  describe('getAllAppointments', () => {
    it('should GET all appointments with credentials and map rows', async () => {
      const promise = gateway.getAllAppointments();

      const req = httpMock.expectOne('/api/appointments');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush([APPOINTMENT_ROW]);

      await expect(promise).resolves.toEqual([toAppointment(APPOINTMENT_ROW)]);
    });

    it('should return an empty array when unauthorized', async () => {
      const promise = gateway.getAllAppointments();

      httpMock
        .expectOne('/api/appointments')
        .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

      await expect(promise).resolves.toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should PATCH the status with credentials and map the response', async () => {
      const updated: AppointmentRow = { ...APPOINTMENT_ROW, status: 'confirmed' };

      const promise = gateway.updateStatus('apt-001', 'confirmed');

      const req = httpMock.expectOne('/api/appointments/apt-001/status');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'confirmed' });
      expect(req.request.withCredentials).toBe(true);
      req.flush(updated);

      await expect(promise).resolves.toEqual(toAppointment(updated));
    });
  });

  describe('deleteAppointment', () => {
    it('should DELETE the appointment with credentials', async () => {
      const promise = gateway.deleteAppointment('apt-001');

      const req = httpMock.expectOne('/api/appointments/apt-001');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('addDisabledDate', () => {
    it('should POST the disabled date with credentials and map the response', async () => {
      const promise = gateway.addDisabledDate({ date: '2026-03-20', reason: 'Jour férié' });

      const req = httpMock.expectOne('/api/appointments/disabled-dates');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ date: '2026-03-20', reason: 'Jour férié' });
      expect(req.request.withCredentials).toBe(true);
      req.flush(DISABLED_DATE_ROW);

      await expect(promise).resolves.toEqual(toDisabledDate(DISABLED_DATE_ROW));
    });
  });

  describe('removeDisabledDate', () => {
    it('should DELETE the disabled date with credentials', async () => {
      const promise = gateway.removeDisabledDate('dd-001');

      const req = httpMock.expectOne('/api/appointments/disabled-dates/dd-001');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);

      await expect(promise).resolves.toBeUndefined();
    });
  });
});
