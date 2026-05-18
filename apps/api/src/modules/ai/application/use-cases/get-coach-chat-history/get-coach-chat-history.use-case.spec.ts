import { CoachConversation } from '../../../domain/entities/coach-conversation.entity';
import { CoachConversationRepository } from '../../../domain/repositories/coach-conversation.repository';
import { CoachMessage } from '../../../domain/entities/coach-message.entity';
import { CoachMessageRepository } from '../../../domain/repositories/coach-message.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GET_COACH_CHAT_HISTORY_ERROR_CODES } from './get-coach-chat-history.errors';
import { GetCoachChatHistoryUseCase } from './get-coach-chat-history.use-case';

describe('GetCoachChatHistoryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachConversationRepository: jest.Mocked<CoachConversationRepository>;
  let coachMessageRepository: jest.Mocked<CoachMessageRepository>;
  let useCase: GetCoachChatHistoryUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };
    coachConversationRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
    };
    coachMessageRepository = {
      create: jest.fn(),
      findByConversationId: jest.fn(),
    };

    useCase = new GetCoachChatHistoryUseCase(
      userProfileRepository,
      coachConversationRepository,
      coachMessageRepository,
    );
  });

  it('returns ordered history from the latest conversation', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachMessageRepository.findByConversationId.mockResolvedValue([
      new CoachMessage({
        id: 'message_2',
        conversationId: 'conversation_123',
        role: 'assistant',
        content:
          "Your recovery signals suggest keeping today's session lighter.",
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      }),
      new CoachMessage({
        id: 'message_1',
        conversationId: 'conversation_123',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      }),
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 50,
    });

    expect(coachMessageRepository.findByConversationId).toHaveBeenCalledWith({
      conversationId: 'conversation_123',
      limit: 50,
    });
    expect(result).toEqual([
      {
        role: 'user',
        content: 'Should I train today?',
        createdAt: '2026-05-18T10:00:01.000Z',
      },
      {
        role: 'assistant',
        content:
          "Your recovery signals suggest keeping today's session lighter.",
        createdAt: '2026-05-18T10:00:02.000Z',
      },
    ]);
  });

  it('returns an empty history when no conversation exists', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result).toEqual([]);
    expect(coachMessageRepository.findByConversationId).not.toHaveBeenCalled();
  });

  it('applies the default limit', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachMessageRepository.findByConversationId.mockResolvedValue([]);

    await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(coachMessageRepository.findByConversationId).toHaveBeenCalledWith({
      conversationId: 'conversation_123',
      limit: 50,
    });
  });

  it('enforces a maximum limit', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        limit: 101,
      }),
    ).rejects.toMatchObject({
      code: GET_COACH_CHAT_HISTORY_ERROR_CODES.INVALID_INPUT,
    });
  });

  it('returns USER_PROFILE_NOT_FOUND when the profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GET_COACH_CHAT_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('returns invalid session when authUserId is blank', async () => {
    await expect(
      useCase.execute({
        authUserId: ' ',
      }),
    ).rejects.toMatchObject({
      code: GET_COACH_CHAT_HISTORY_ERROR_CODES.INVALID_SESSION,
    });
  });
});

function mockUserProfile(
  userProfileRepository: jest.Mocked<UserProfileRepository>,
): void {
  userProfileRepository.findByAuthUserId.mockResolvedValue(
    new UserProfile({
      id: 'profile_123',
      authUserId: 'auth_user_123',
      name: 'Rodrigo Paiva',
      language: 'en-US',
      timezone: 'UTC',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
}
