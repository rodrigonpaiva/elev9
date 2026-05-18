import { Inject, Injectable } from '@nestjs/common';

import { FitnessProfile } from '../../../../fitness/domain/entities/fitness-profile.entity';
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  TrainingPlanDay,
  TrainingPlanExercise,
} from '../../../domain/entities/training-plan.entity';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../domain/repositories/training-plan.repository';
import {
  CREATE_TRAINING_PLAN_ERROR_CODES,
  CreateTrainingPlanError,
} from './create-training-plan.errors';
import { CreateTrainingPlanInput } from './create-training-plan.input';
import { CreateTrainingPlanOutput } from './create-training-plan.output';

const ACTIVITY_LEVEL_DAYS = {
  low: 2,
  medium: 3,
  high: 4,
} as const;
const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

@Injectable()
export class CreateTrainingPlanUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
  ) {}

  async execute(
    input: CreateTrainingPlanInput,
  ): Promise<CreateTrainingPlanOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';
    const fitnessProfileId =
      typeof input.fitnessProfileId === 'string'
        ? input.fitnessProfileId.trim()
        : '';

    if (!authUserId) {
      throw new CreateTrainingPlanError(
        CREATE_TRAINING_PLAN_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    if (!fitnessProfileId) {
      throw new CreateTrainingPlanError(
        CREATE_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
        'Fitness profile not found.',
      );
    }

    if (!this.isValidObjectId(fitnessProfileId)) {
      throw new CreateTrainingPlanError(
        CREATE_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
        'Fitness profile not found.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new CreateTrainingPlanError(
          CREATE_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          'Fitness profile not found.',
        );
      }

      const fitnessProfile =
        await this.fitnessProfileRepository.findById(fitnessProfileId);

      if (!fitnessProfile) {
        throw new CreateTrainingPlanError(
          CREATE_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          'Fitness profile not found.',
        );
      }

      if (fitnessProfile.userProfileId !== userProfile.id) {
        throw new CreateTrainingPlanError(
          CREATE_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          'Fitness profile not found.',
        );
      }

      const existingPlan =
        await this.trainingPlanRepository.findActiveByFitnessProfileId(
          fitnessProfile.id,
        );

      if (existingPlan) {
        throw new CreateTrainingPlanError(
          CREATE_TRAINING_PLAN_ERROR_CODES.ALREADY_EXISTS,
          'Training plan already exists.',
        );
      }

      const weeklySchedule = this.generateWeeklySchedule(fitnessProfile);

      const trainingPlan = await this.trainingPlanRepository.create({
        fitnessProfileId: fitnessProfile.id,
        goal: fitnessProfile.goal,
        activityLevel: fitnessProfile.activityLevel,
        weeklySchedule,
        status: 'active',
      });

      return {
        trainingPlan: {
          id: trainingPlan.id,
          fitnessProfileId: trainingPlan.fitnessProfileId,
          goal: trainingPlan.goal,
          activityLevel: trainingPlan.activityLevel,
          weeklySchedule: trainingPlan.weeklySchedule,
          status: trainingPlan.status,
          createdAt: trainingPlan.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof CreateTrainingPlanError) {
        throw error;
      }

      throw new CreateTrainingPlanError(
        CREATE_TRAINING_PLAN_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private generateWeeklySchedule(
    fitnessProfile: FitnessProfile,
  ): TrainingPlanDay[] {
    const targetDays = ACTIVITY_LEVEL_DAYS[fitnessProfile.activityLevel];
    const totalDays = Math.min(
      targetDays,
      fitnessProfile.trainingAvailability.daysPerWeek,
    );

    const dayTemplates = this.getDayTemplates(fitnessProfile.goal);

    return Array.from({ length: totalDays }, (_, index) => {
      const template = dayTemplates[index % dayTemplates.length];

      return {
        dayIndex: index + 1,
        title: template.title,
        focus: template.focus,
        format: template.format,
        intensity: template.intensity,
        exercises: template.exercises,
      };
    });
  }

  private getDayTemplates(goal: FitnessProfile['goal']): Array<{
    title: string;
    focus: string;
    format: 'strength' | 'circuit';
    intensity: 'low' | 'moderate' | 'high';
    exercises: TrainingPlanExercise[];
  }> {
    switch (goal) {
      case 'gain_muscle':
        return [
          {
            title: 'Upper Body Strength',
            focus: 'upper_body_strength',
            format: 'strength',
            intensity: 'high',
            exercises: [
              { name: 'push_up', sets: 4, reps: '8-12', restSeconds: 90 },
              { name: 'dumbbell_row', sets: 4, reps: '8-12', restSeconds: 90 },
              {
                name: 'shoulder_press',
                sets: 3,
                reps: '6-10',
                restSeconds: 90,
              },
            ],
          },
          {
            title: 'Lower Body Strength',
            focus: 'lower_body_strength',
            format: 'strength',
            intensity: 'high',
            exercises: [
              { name: 'squat', sets: 5, reps: '6-10', restSeconds: 120 },
              {
                name: 'romanian_deadlift',
                sets: 4,
                reps: '8-12',
                restSeconds: 90,
              },
              {
                name: 'walking_lunge',
                sets: 3,
                reps: '10-12',
                restSeconds: 75,
              },
            ],
          },
          {
            title: 'Full Body Strength',
            focus: 'full_body_strength',
            format: 'strength',
            intensity: 'moderate',
            exercises: [
              {
                name: 'incline_push_up',
                sets: 3,
                reps: '10-12',
                restSeconds: 75,
              },
              { name: 'split_squat', sets: 3, reps: '8-12', restSeconds: 75 },
              { name: 'band_row', sets: 3, reps: '10-12', restSeconds: 75 },
            ],
          },
        ];
      case 'lose_weight':
        return [
          {
            title: 'Metabolic Circuit A',
            focus: 'full_body_circuit',
            format: 'circuit',
            intensity: 'moderate',
            exercises: [
              {
                name: 'bodyweight_squat',
                sets: 3,
                reps: '15-20',
                restSeconds: 30,
              },
              {
                name: 'mountain_climber',
                sets: 3,
                reps: '20-30',
                restSeconds: 20,
              },
              { name: 'push_up', sets: 3, reps: '12-15', restSeconds: 30 },
            ],
          },
          {
            title: 'Metabolic Circuit B',
            focus: 'lower_body_and_cardio',
            format: 'circuit',
            intensity: 'moderate',
            exercises: [
              {
                name: 'reverse_lunge',
                sets: 3,
                reps: '12-16',
                restSeconds: 30,
              },
              { name: 'jumping_jack', sets: 3, reps: '30-40', restSeconds: 20 },
              {
                name: 'plank_shoulder_tap',
                sets: 3,
                reps: '16-20',
                restSeconds: 20,
              },
            ],
          },
          {
            title: 'Conditioning Circuit',
            focus: 'cardio_endurance',
            format: 'circuit',
            intensity: 'moderate',
            exercises: [
              { name: 'step_up', sets: 3, reps: '15-20', restSeconds: 25 },
              { name: 'high_knees', sets: 3, reps: '30-40', restSeconds: 20 },
              { name: 'glute_bridge', sets: 3, reps: '15-20', restSeconds: 25 },
            ],
          },
        ];
      case 'maintain':
      default:
        return [
          {
            title: 'Balanced Strength',
            focus: 'strength_and_stability',
            format: 'strength',
            intensity: 'moderate',
            exercises: [
              { name: 'goblet_squat', sets: 3, reps: '8-12', restSeconds: 75 },
              { name: 'push_up', sets: 3, reps: '8-15', restSeconds: 60 },
              { name: 'band_row', sets: 2, reps: '10-15', restSeconds: 60 },
            ],
          },
          {
            title: 'Mobility and Core',
            focus: 'mobility_and_core',
            format: 'circuit',
            intensity: 'moderate',
            exercises: [
              {
                name: 'world_greatest_stretch',
                sets: 2,
                reps: '8-10',
                restSeconds: 30,
              },
              { name: 'dead_bug', sets: 3, reps: '10-15', restSeconds: 30 },
              { name: 'bird_dog', sets: 2, reps: '10-12', restSeconds: 30 },
            ],
          },
          {
            title: 'Light Cardio Blend',
            focus: 'cardio_and_movement',
            format: 'circuit',
            intensity: 'moderate',
            exercises: [
              { name: 'step_up', sets: 3, reps: '10-15', restSeconds: 30 },
              {
                name: 'bodyweight_lunge',
                sets: 3,
                reps: '10-12',
                restSeconds: 30,
              },
              {
                name: 'march_in_place',
                sets: 4,
                reps: '30-45',
                restSeconds: 20,
              },
            ],
          },
        ];
    }
  }

  private isValidObjectId(value: string): boolean {
    return MONGO_OBJECT_ID_REGEX.test(value);
  }
}
