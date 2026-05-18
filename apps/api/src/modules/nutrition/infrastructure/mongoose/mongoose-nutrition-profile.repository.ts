import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NutritionProfile } from '../../domain/entities/nutrition-profile.entity';
import {
  NutritionProfileRepository,
  UpsertNutritionProfileRepositoryInput,
} from '../../domain/repositories/nutrition-profile.repository';
import {
  NUTRITION_PROFILE_MODEL_NAME,
  NutritionProfileDocument,
  NutritionProfileSchemaClass,
} from './nutrition-profile.schema';

@Injectable()
export class MongooseNutritionProfileRepository implements NutritionProfileRepository {
  constructor(
    @InjectModel(NUTRITION_PROFILE_MODEL_NAME)
    private readonly nutritionProfileModel: Model<NutritionProfileSchemaClass>,
  ) {}

  async findActiveByUserProfileId(
    userProfileId: string,
  ): Promise<NutritionProfile | null> {
    const document = await this.nutritionProfileModel
      .findOne({
        userProfileId,
        status: 'active',
      })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as NutritionProfileDocument);
  }

  async upsertByUserProfileId(
    input: UpsertNutritionProfileRepositoryInput,
  ): Promise<NutritionProfile> {
    const document = await this.nutritionProfileModel
      .findOneAndUpdate(
        { userProfileId: input.userProfileId },
        {
          $set: {
            goal: input.goal,
            mealsPerDay: input.mealsPerDay,
            dietaryRestrictions: input.dietaryRestrictions,
            allergies: input.allergies,
            dislikedFoods: input.dislikedFoods,
            preferredFoods: input.preferredFoods,
            status: input.status,
          },
          $setOnInsert: {
            userProfileId: input.userProfileId,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    return this.toEntity(document as NutritionProfileDocument);
  }

  private toEntity(document: NutritionProfileDocument): NutritionProfile {
    return new NutritionProfile({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      goal: document.goal,
      mealsPerDay: document.mealsPerDay,
      dietaryRestrictions: [...document.dietaryRestrictions],
      allergies: [...document.allergies],
      dislikedFoods: [...document.dislikedFoods],
      preferredFoods: [...document.preferredFoods],
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
