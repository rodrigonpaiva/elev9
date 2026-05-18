import { CoachConversation } from '../../../domain/entities/coach-conversation.entity';
import { CoachConversationMemory } from '../../../domain/entities/coach-conversation-memory.entity';
import { CoachConversationMemoryRepository } from '../../../domain/repositories/coach-conversation-memory.repository';
import { CoachConversationRepository } from '../../../domain/repositories/coach-conversation.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GetCoachChatMemoryDebugUseCase } from './get-coach-chat-memory-debug.use-case';

describe('GetCoachChatMemoryDebugUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachConversationRepository: jest.Mocked<CoachConversationRepository>;
  let coachConversationMemoryRepository: jest.Mocked<CoachConversationMemoryRepository>;
  let useCase: GetCoachChatMemoryDebugUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    coachConversationRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<CoachConversationRepository>;
    coachConversationMemoryRepository = {
      findByConversationId: jest.fn(),
      upsertByConversationId: jest.fn(),
    } as unknown as jest.Mocked<CoachConversationMemoryRepository>;

    useCase = new GetCoachChatMemoryDebugUseCase(
      userProfileRepository,
      coachConversationRepository,
      coachConversationMemoryRepository,
    );
  });

  it('returns a sanitized memory preview', async () => {
    mockUserProfile(userProfileRepository);
    const summary =
      'recovery=high; nutrition=consistent; workout_continuity=strong. User is focused on recovery after intense workouts and improving nutrition consistency. Workout continuity remains strong across the last several weeks, with a continued emphasis on recovery, sleep, soreness management, and consistency.';
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      new CoachConversationMemory({
        id: 'memory_123',
        conversationId: 'conversation_123',
        summary,
        metadata: {
          generatedFromMessageCount: 18,
          version: 'memory-v1',
        },
        createdAt: new Date('2026-05-18T10:05:00.000Z'),
        updatedAt: new Date('2026-05-18T10:10:00.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result).toEqual({
      memory: {
        version: 'memory-v1',
        generatedFromMessageCount: 18,
        summaryPreview: summary.slice(0, 160),
        metadata: {
          hasRecoveryContext: true,
          hasNutritionContext: true,
          hasWorkoutContinuity: true,
        },
        createdAt: '2026-05-18T10:05:00.000Z',
        updatedAt: '2026-05-18T10:10:00.000Z',
      },
    });
    expect(JSON.stringify(result)).not.toContain('auth_user_123');
    expect(JSON.stringify(result)).not.toContain('profile_123');
    expect(JSON.stringify(result)).not.toContain(summary);
  });

  it('returns empty payload when no memory exists', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      null,
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result).toEqual({});
  });

  it('returns empty payload when no conversation exists', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result).toEqual({});
    expect(
      coachConversationMemoryRepository.findByConversationId,
    ).not.toHaveBeenCalled();
  });

  it('rejects invalid sessions', async () => {
    await expect(useCase.execute({ authUserId: '' })).rejects.toThrow(
      'Invalid session.',
    );
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
