import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CoachConversation } from "../../domain/entities/coach-conversation.entity";
import {
  CoachConversationRepository,
  CreateCoachConversationRepositoryInput,
} from "../../domain/repositories/coach-conversation.repository";
import {
  COACH_CONVERSATION_MODEL_NAME,
  CoachConversationDocument,
  CoachConversationSchemaClass,
} from "./coach-conversation.schema";

@Injectable()
export class MongooseCoachConversationRepository
  implements CoachConversationRepository
{
  constructor(
    @InjectModel(COACH_CONVERSATION_MODEL_NAME)
    private readonly coachConversationModel: Model<CoachConversationSchemaClass>,
  ) {}

  async create(
    input: CreateCoachConversationRepositoryInput,
  ): Promise<CoachConversation> {
    const document = await this.coachConversationModel.create(input);

    return this.toEntity(document as CoachConversationDocument);
  }

  async findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<CoachConversation | null> {
    const document = await this.coachConversationModel
      .findOne({ userProfileId })
      .sort({ createdAt: -1, _id: -1 })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as CoachConversationDocument);
  }

  private toEntity(document: CoachConversationDocument): CoachConversation {
    return new CoachConversation({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
