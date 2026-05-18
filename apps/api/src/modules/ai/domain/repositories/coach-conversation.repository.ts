import { CoachConversation } from "../entities/coach-conversation.entity";

export interface CreateCoachConversationRepositoryInput {
  userProfileId: string;
}

export interface CoachConversationRepository {
  create(
    input: CreateCoachConversationRepositoryInput,
  ): Promise<CoachConversation>;
  findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<CoachConversation | null>;
}

export const COACH_CONVERSATION_REPOSITORY = Symbol(
  "COACH_CONVERSATION_REPOSITORY",
);
