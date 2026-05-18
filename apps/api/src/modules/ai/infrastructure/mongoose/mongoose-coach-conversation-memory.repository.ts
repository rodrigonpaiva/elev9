import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CoachConversationMemory } from "../../domain/entities/coach-conversation-memory.entity";
import {
  CoachConversationMemoryRepository,
  CreateCoachConversationMemoryRepositoryInput,
} from "../../domain/repositories/coach-conversation-memory.repository";
import {
  COACH_CONVERSATION_MEMORY_MODEL_NAME,
  CoachConversationMemoryDocument,
  CoachConversationMemorySchemaClass,
} from "./coach-conversation-memory.schema";

@Injectable()
export class MongooseCoachConversationMemoryRepository
  implements CoachConversationMemoryRepository
{
  constructor(
    @InjectModel(COACH_CONVERSATION_MEMORY_MODEL_NAME)
    private readonly coachConversationMemoryModel: Model<CoachConversationMemorySchemaClass>,
  ) {}

  async findByConversationId(
    conversationId: string,
  ): Promise<CoachConversationMemory | null> {
    const document = await this.coachConversationMemoryModel
      .findOne({ conversationId })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as CoachConversationMemoryDocument);
  }

  async upsertByConversationId(
    input: CreateCoachConversationMemoryRepositoryInput,
  ): Promise<CoachConversationMemory> {
    const document = await this.coachConversationMemoryModel
      .findOneAndUpdate(
        { conversationId: input.conversationId },
        {
          $set: {
            summary: input.summary,
            metadata: input.metadata,
          },
          $setOnInsert: {
            conversationId: input.conversationId,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    if (!document) {
      throw new Error("Unable to upsert coach conversation memory.");
    }

    return this.toEntity(document as CoachConversationMemoryDocument);
  }

  private toEntity(
    document: CoachConversationMemoryDocument,
  ): CoachConversationMemory {
    return new CoachConversationMemory({
      id: document._id.toString(),
      conversationId: document.conversationId,
      summary: document.summary,
      metadata: {
        generatedFromMessageCount:
          document.metadata.generatedFromMessageCount,
        version: document.metadata.version,
      },
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
