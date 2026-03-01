import { TestBed } from '@angular/core/testing';
import { GetMessagesUseCase } from './get-messages.use-case';
import { MessageGateway } from '../gateways/message.gateway';
import { MessageBuilder } from '../../test-utils/message.builder';

describe('GetMessagesUseCase', () => {
  it.each([
    {
      label: 'une liste de messages',
      messages: [
        MessageBuilder.default().with('id', 'msg-001').with('senderName', 'Jean Martin'),
        MessageBuilder.default().with('id', 'msg-002').with('senderName', 'Sophie Lefèvre'),
      ],
    },
    {
      label: 'une autre liste de messages',
      messages: [MessageBuilder.default().with('id', 'msg-003').with('subject', 'equine')],
    },
  ])('should return $label from the gateway', async ({ messages }) => {
    // Given
    const expected = messages.map((b) => b.build());
    const gatewayStub: Partial<MessageGateway> = {
      getAll: vi.fn().mockResolvedValue(expected),
    };

    TestBed.configureTestingModule({
      providers: [GetMessagesUseCase, { provide: MessageGateway, useValue: gatewayStub }],
    });

    const useCase = TestBed.inject(GetMessagesUseCase);

    // When
    const result = await useCase.execute();

    // Then
    expect(result).toEqual(expected);
  });
});
