import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CoachMessage } from "../../domain/entities/coach-message.entity";
import {
  CoachMessageRepository,
  CreateCoachMessageRepositoryInput,
} from "../../domain/repositories/coach-message.repository";
import {
  COACH_MESSAGE_MODEL_NAME,
  CoachMessageDocument,
  CoachMessageSchemaClass,
} from "./coach-message.schema";

@Injectable()
export class MongooseCoachMessageRepository implements CoachMessageRepository {
  constructor(
    @InjectModel(COACH_MESSAGE_MODEL_NAME)
    private readonly coachMessageModel: Model<CoachMessageSchemaClass>,
  ) {}

  async create(
    input: CreateCoachMessageRepositoryInput,
  ): Promise<CoachMessage> {
    const document = await this.coachMessageModel.create(input);

    return this.toEntity(document as CoachMessageDocument);
  }

  async findByConversationId(input: {
    conversationId: string;
    limit: number;
  }): Promise<CoachMessage[]> {
    const documents = await this.coachMessageModel
      .find({ conversationId: input.conversationId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(input.limit)
      .exec();

    return documents.map((document) =>
      this.toEntity(document as CoachMessageDocument),
    );
  }

  private toEntity(document: CoachMessageDocument): CoachMessage {
    return new CoachMessage({
      id: document._id.toString(),
      conversationId: document.conversationId,
      role: document.role,
      content: document.content,
      createdAt: document.createdAt,
    });
  }
}
