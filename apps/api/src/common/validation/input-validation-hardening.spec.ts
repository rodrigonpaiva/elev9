import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateCoachChatRequestDto } from '../../modules/ai/presentation/http/dto/create-coach-chat.request.dto';
import { RegisterUserRequestDto } from '../../modules/auth/presentation/http/dto/register-user.request.dto';
import { CreateNutritionProfileRequestDto } from '../../modules/nutrition/presentation/http/dto/create-nutrition-profile.request.dto';
import { LogMealRequestDto } from '../../modules/nutrition/presentation/http/dto/log-meal.request.dto';
import { LogWorkoutRequestDto } from '../../modules/progress/presentation/http/dto/log-workout.request.dto';
import { CreateTrainingPlanRequestDto } from '../../modules/training/presentation/http/dto/create-training-plan.request.dto';

async function validateRequest<T>(type: new () => T, payload: unknown) {
  return validate(plainToInstance(type, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('sensitive input validation', () => {
  it('rejects unknown and internal ownership fields', async () => {
    const errors = await validateRequest(RegisterUserRequestDto, {
      name: 'Valid User',
      email: 'valid@example.com',
      password: 'StrongPassword123',
      authUserId: 'attacker-controlled',
      userProfileId: 'attacker-controlled',
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['authUserId', 'userProfileId']),
    );
  });

  it('rejects oversized credentials and Coach messages', async () => {
    const passwordErrors = await validateRequest(RegisterUserRequestDto, {
      name: 'Valid User',
      email: 'valid@example.com',
      password: 'A'.repeat(129),
    });
    const messageErrors = await validateRequest(CreateCoachChatRequestDto, {
      message: 'x'.repeat(1001),
    });

    expect(passwordErrors.map((error) => error.property)).toContain('password');
    expect(messageErrors.map((error) => error.property)).toContain('message');
  });

  it('bounds nutrition collections and macro values', async () => {
    const profileErrors = await validateRequest(
      CreateNutritionProfileRequestDto,
      {
        goal: 'maintenance',
        mealsPerDay: 3,
        allergies: Array.from({ length: 21 }, () => 'food'),
      },
    );
    const mealErrors = await validateRequest(LogMealRequestDto, {
      mealId: 'meal-1',
      status: 'consumed',
      actualMacros: {
        calories: 100001,
        proteinGrams: 20,
        carbsGrams: 30,
        fatGrams: 10,
      },
    });

    expect(profileErrors.map((error) => error.property)).toContain('allergies');
    expect(mealErrors).toHaveLength(1);
    expect(mealErrors[0].property).toBe('actualMacros');
  });

  it('rejects invalid resource identifiers and out-of-range workout values', async () => {
    const planErrors = await validateRequest(CreateTrainingPlanRequestDto, {
      fitnessProfileId: 'not-a-mongo-id',
    });
    const workoutErrors = await validateRequest(LogWorkoutRequestDto, {
      trainingPlanId: 'not-a-mongo-id',
      workoutDayIndex: 1001,
      durationMinutes: 30,
      completedExercises: [{ name: '', setsDone: 1, repsDone: 10 }],
    });

    expect(planErrors.map((error) => error.property)).toContain(
      'fitnessProfileId',
    );
    expect(workoutErrors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['trainingPlanId', 'workoutDayIndex']),
    );
    expect(
      workoutErrors.find((error) => error.property === 'completedExercises'),
    ).toBeDefined();
  });
});
