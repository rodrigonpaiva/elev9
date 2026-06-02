import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NutritionLog } from '../../domain/entities/nutrition-log.entity';
import {
  CreateNutritionLogRepositoryInput,
  DuplicateNutritionLogError,
  NutritionLogRepository,
} from '../../domain/repositories/nutrition-log.repository';
import {
  NUTRITION_LOG_MODEL_NAME,
  NutritionLogDocument,
  NutritionLogSchemaClass,
} from './nutrition-log.schema';

@Injectable()
export class MongooseNutritionLogRepository implements NutritionLogRepository {
  constructor(
    @InjectModel(NUTRITION_LOG_MODEL_NAME)
    private readonly nutritionLogModel: Model<NutritionLogSchemaClass>,
  ) {}

  async create(
    input: CreateNutritionLogRepositoryInput,
  ): Promise<NutritionLog> {
    try {
      const document = await this.nutritionLogModel.create(input);

      return this.toEntity(document as NutritionLogDocument);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new DuplicateNutritionLogError();
      }

      throw error;
    }
  }

  async findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<NutritionLog[]> {
    const documents = await this.nutritionLogModel
      .find({ userProfileId, date })
      .sort({ createdAt: 1 })
      .exec();

    return documents.map((document) =>
      this.toEntity(document as NutritionLogDocument),
    );
  }

  async findByUserProfileIdAndDateRange(
    userProfileId: string,
    from: string,
    to: string,
  ): Promise<NutritionLog[]> {
    const documents = await this.nutritionLogModel
      .find({
        userProfileId,
        date: {
          $gte: from,
          $lte: to,
        },
      })
      .sort({ date: 1, createdAt: 1 })
      .exec();

    return documents.map((document) =>
      this.toEntity(document as NutritionLogDocument),
    );
  }

  async findByMealId(
    userProfileId: string,
    mealId: string,
    date: string,
  ): Promise<NutritionLog | null> {
    const document = await this.nutritionLogModel
      .findOne({ userProfileId, mealId, date })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as NutritionLogDocument);
  }

  private toEntity(document: NutritionLogDocument): NutritionLog {
    return new NutritionLog({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      nutritionPlanId: document.nutritionPlanId,
      mealId: document.mealId,
      date: document.date,
      mealType: document.mealType,
      status: document.status,
      actualMacros: document.actualMacros
        ? {
            calories: document.actualMacros.calories,
            proteinGrams: document.actualMacros.proteinGrams,
            carbsGrams: document.actualMacros.carbsGrams,
            fatGrams: document.actualMacros.fatGrams,
          }
        : undefined,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}
