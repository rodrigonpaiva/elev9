import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NutritionPlan } from '../../domain/entities/nutrition-plan.entity';
import { MealProps } from '../../domain/entities/meal.entity';
import {
  CreateNutritionPlanRepositoryInput,
  NutritionPlanRepository,
} from '../../domain/repositories/nutrition-plan.repository';
import {
  NUTRITION_PLAN_MODEL_NAME,
  NutritionPlanDocument,
  NutritionPlanSchemaClass,
} from './nutrition-plan.schema';

@Injectable()
export class MongooseNutritionPlanRepository implements NutritionPlanRepository {
  constructor(
    @InjectModel(NUTRITION_PLAN_MODEL_NAME)
    private readonly nutritionPlanModel: Model<NutritionPlanSchemaClass>,
  ) {}

  async findById(nutritionPlanId: string): Promise<NutritionPlan | null> {
    const document = await this.nutritionPlanModel
      .findById(nutritionPlanId)
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as NutritionPlanDocument);
  }

  async findActiveByUserProfileId(
    userProfileId: string,
  ): Promise<NutritionPlan | null> {
    const document = await this.nutritionPlanModel
      .findOne({
        userProfileId,
        status: 'active',
      })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as NutritionPlanDocument);
  }

  async create(
    input: CreateNutritionPlanRepositoryInput,
  ): Promise<NutritionPlan> {
    const document = await this.nutritionPlanModel.create(input);

    return this.toEntity(document as NutritionPlanDocument);
  }

  async replaceActiveByUserProfileId(
    userProfileId: string,
    input: CreateNutritionPlanRepositoryInput,
  ): Promise<NutritionPlan> {
    const replacedAt = new Date();

    await this.nutritionPlanModel
      .updateMany(
        {
          userProfileId,
          status: 'active',
        },
        {
          $set: {
            status: 'replaced',
            replacedAt,
          },
        },
      )
      .exec();

    return this.create(input);
  }

  async replaceMeal(
    userProfileId: string,
    mealId: string,
    replacement: MealProps,
  ): Promise<NutritionPlan | null> {
    const document = await this.nutritionPlanModel
      .findOne({ userProfileId, status: 'active' })
      .exec();

    if (!document) {
      return null;
    }

    let replaced = false;

    document.days = document.days.map((day) => ({
      ...day,
      meals: day.meals.map((meal) => {
        if (meal.id !== mealId) {
          return meal;
        }

        replaced = true;
        return replacement;
      }),
    }));

    if (!replaced) {
      return null;
    }

    const saved = await document.save();

    return this.toEntity(saved as NutritionPlanDocument);
  }

  private toEntity(document: NutritionPlanDocument): NutritionPlan {
    return new NutritionPlan({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      nutritionProfileId: document.nutritionProfileId,
      fitnessProfileId: document.fitnessProfileId,
      status: document.status,
      weekStartDate: document.weekStartDate,
      weekEndDate: document.weekEndDate,
      macroTargets: {
        calories: document.macroTargets.calories,
        proteinGrams: document.macroTargets.proteinGrams,
        carbsGrams: document.macroTargets.carbsGrams,
        fatGrams: document.macroTargets.fatGrams,
      },
      days: document.days.map((day) => ({
        date: day.date,
        dayIndex: day.dayIndex,
        dailyMacroTargets: {
          calories: day.dailyMacroTargets.calories,
          proteinGrams: day.dailyMacroTargets.proteinGrams,
          carbsGrams: day.dailyMacroTargets.carbsGrams,
          fatGrams: day.dailyMacroTargets.fatGrams,
        },
        meals: day.meals.map((meal) => ({
          id: meal.id,
          type: meal.type,
          title: meal.title,
          description: meal.description,
          foodItems: meal.foodItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            estimatedMacros: item.estimatedMacros,
            tags: [...item.tags],
          })),
          estimatedMacros: {
            calories: meal.estimatedMacros.calories,
            proteinGrams: meal.estimatedMacros.proteinGrams,
            carbsGrams: meal.estimatedMacros.carbsGrams,
            fatGrams: meal.estimatedMacros.fatGrams,
          },
          alternatives: meal.alternatives.map((alternative) => ({
            id: alternative.id,
            title: alternative.title,
            foodItems: alternative.foodItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              estimatedMacros: item.estimatedMacros,
              tags: [...item.tags],
            })),
            estimatedMacros: {
              calories: alternative.estimatedMacros.calories,
              proteinGrams: alternative.estimatedMacros.proteinGrams,
              carbsGrams: alternative.estimatedMacros.carbsGrams,
              fatGrams: alternative.estimatedMacros.fatGrams,
            },
            reason: alternative.reason,
          })),
          status: meal.status,
        })),
      })),
      generatedBy: document.generatedBy,
      sourceContext: document.sourceContext,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      replacedAt: document.replacedAt,
    });
  }
}
