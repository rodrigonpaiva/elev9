import { CoachFeedback } from "../entities/coach-feedback.entity";

export interface CreateCoachFeedbackRepositoryInput {
  userProfileId: string;
  message: string;
  insights: string[];
  recommendations: string[];
}

export interface CoachFeedbackRepository {
  create(input: CreateCoachFeedbackRepositoryInput): Promise<CoachFeedback>;
  findByUserProfileId(input: {
    userProfileId: string;
    limit: number;
  }): Promise<CoachFeedback[]>;
}

export const COACH_FEEDBACK_REPOSITORY = Symbol("COACH_FEEDBACK_REPOSITORY");
