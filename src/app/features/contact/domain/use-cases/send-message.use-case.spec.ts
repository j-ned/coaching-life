import { TestBed } from '@angular/core/testing';
import { SendMessageUseCase } from './send-message.use-case';
import { MessageGateway } from '../gateways/message.gateway';
import { SendMessageDataBuilder } from '../../test-utils/message.builder';
import type { MessageSubmission } from '../models/message.model';

describe('SendMessageUseCase', () => {
  it.each([
    {
      label: 'succès',
      submission: { success: true, message: 'Message envoyé !' } satisfies MessageSubmission,
    },
    {
      label: 'échec',
      submission: {
        success: false,
        message: "Erreur lors de l'envoi.",
      } satisfies MessageSubmission,
    },
  ])('should return $label from the gateway', async ({ submission }) => {
    // Given
    const data = SendMessageDataBuilder.default()
      .with('name', 'Claire Petit')
      .with('subject', 'equine')
      .build();

    const gatewayStub: Partial<MessageGateway> = {
      send: vi.fn().mockResolvedValue(submission),
    };

    TestBed.configureTestingModule({
      providers: [SendMessageUseCase, { provide: MessageGateway, useValue: gatewayStub }],
    });

    const useCase = TestBed.inject(SendMessageUseCase);

    // When
    const result = await useCase.execute(data);

    // Then
    expect(result).toEqual(submission);
    expect(gatewayStub.send).toHaveBeenCalledWith(data);
  });
});
