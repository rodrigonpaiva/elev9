import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  NutritionContextSnapshot,
  NutritionInfluence,
  NutritionRecommendation,
} from '../../domain/entities/nutrition-recommendation.entity';
import {
  CreateNutritionRecommendationRepositoryInput,
  NutritionRecommendationRepository,
} from '../../domain/repositories/nutrition-recommendation.repository';
import {
  NUTRITION_RECOMMENDATION_MODEL_NAME,
  NutritionRecommendationDocument,
  NutritionRecommendationSchemaClass,
} from './nutrition-recommendation.schema';

@Injectable()
export class MongooseNutritionRecommendationRepository implements NutritionRecommendationRepository {
  constructor(
    @InjectModel(NUTRITION_RECOMMENDATION_MODEL_NAME)
    private readonly model: Model<NutritionRecommendationSchemaClass>,
  ) {}

  async create(
    input: CreateNutritionRecommendationRepositoryInput,
  ): Promise<NutritionRecommendation> {
    const document = await this.model.create(input);

    return this.toEntity(document as NutritionRecommendationDocument);
  }

  async findManyByUserProfileId(
    userProfileId: string,
    limit: number,
  ): Promise<NutritionRecommendation[]> {
    const documents = await this.model
      .find({ userProfileId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return documents.map((document) =>
      this.toEntity(document as NutritionRecommendationDocument),
    );
  }

  private toEntity(
    document: NutritionRecommendationDocument,
  ): NutritionRecommendation {
    return new NutritionRecommendation({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      message: document.message,
      recommendations: [...document.recommendations],
      influences: document.influences as NutritionInfluence[],
      generatorVersion: document.generatorVersion,
      contextSnapshot:
        document.contextSnapshot as unknown as NutritionContextSnapshot,
      createdAt: document.createdAt,
    });
  }
}
