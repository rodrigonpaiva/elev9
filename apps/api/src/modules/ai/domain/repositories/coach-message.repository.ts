import {
  CoachMessage,
  CoachMessageMetadata,
  CoachMessageRole,
} from '../entities/coach-message.entity';

export interface CreateCoachMessageRepositoryInput {
  conversationId: string;
  role: CoachMessageRole;
  content: string;
  metadata?: CoachMessageMetadata;
}

export interface CoachMessageRepository {
  create(input: CreateCoachMessageRepositoryInput): Promise<CoachMessage>;
  findByConversationId(input: {
    conversationId: string;
    limit: number;
  }): Promise<CoachMessage[]>;
}

export const COACH_MESSAGE_REPOSITORY = Symbol('COACH_MESSAGE_REPOSITORY');
