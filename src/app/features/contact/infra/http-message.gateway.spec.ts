import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpMessageGateway } from './http-message.gateway';
import type { MessageRow } from './message.adapter';
import { toMessage, toMessageInsert } from './message.adapter';
import { SendMessageDataBuilder } from '../test-utils/message.builder';

const MESSAGE_ROW: MessageRow = {
  id: 'msg-001',
  created_at: '2026-03-01T14:30:00.000Z',
  sender_name: 'Jean Martin',
  sender_email: 'jean.martin@email.fr',
  subject: 'life_coach',
  content: 'Bonjour, je souhaite prendre rendez-vous pour un coaching de vie.',
  status: 'unread',
};

describe('HttpMessageGateway', () => {
  let gateway: HttpMessageGateway;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withFetch()), provideHttpClientTesting(), HttpMessageGateway],
    });
    gateway = TestBed.inject(HttpMessageGateway);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAll', () => {
    it('should GET all messages with credentials and map rows to domain', async () => {
      const promise = gateway.getAll();

      const req = httpMock.expectOne('/api/messages');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush([MESSAGE_ROW]);

      await expect(promise).resolves.toEqual([toMessage(MESSAGE_ROW)]);
    });

    it('should return an empty array when the request fails', async () => {
      const promise = gateway.getAll();

      httpMock
        .expectOne('/api/messages')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).resolves.toEqual([]);
    });
  });

  describe('send', () => {
    it('should POST the insert payload and return a success Result', async () => {
      const data = SendMessageDataBuilder.default().build();

      const promise = gateway.send(data);

      const req = httpMock.expectOne('/api/messages');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(toMessageInsert(data));
      req.flush({});

      await expect(promise).resolves.toEqual({
        success: true,
        message: 'Votre message a été envoyé avec succès !',
      });
    });

    it('should return a failure Result when the request errors', async () => {
      const data = SendMessageDataBuilder.default().build();

      const promise = gateway.send(data);

      httpMock.expectOne('/api/messages').error(new ProgressEvent('error'));

      await expect(promise).resolves.toEqual({
        success: false,
        message: "Une erreur est survenue lors de l'envoi. Veuillez réessayer.",
      });
    });
  });

  describe('updateStatus', () => {
    it.each([{ status: 'read' as const }, { status: 'archived' as const }])(
      'should PATCH status "$status" with credentials and map the response',
      async ({ status }) => {
        const updated: MessageRow = { ...MESSAGE_ROW, status };

        const promise = gateway.updateStatus('msg-001', status);

        const req = httpMock.expectOne('/api/messages/msg-001/status');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ status });
        expect(req.request.withCredentials).toBe(true);
        req.flush(updated);

        await expect(promise).resolves.toEqual(toMessage(updated));
      },
    );
  });

  describe('delete', () => {
    it('should DELETE the message with credentials', async () => {
      const promise = gateway.delete('msg-001');

      const req = httpMock.expectOne('/api/messages/msg-001');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);

      await expect(promise).resolves.toBeUndefined();
    });
  });
});
