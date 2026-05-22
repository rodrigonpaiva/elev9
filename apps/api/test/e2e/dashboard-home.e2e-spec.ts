import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { DashboardModule } from '../../src/modules/dashboard/dashboard.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import {
  Clock,
  CLOCK,
} from '../../src/modules/progress/domain/services/clock.service';
import { ProgressModule } from '../../src/modules/progress/progress.module';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { closeTestApp } from './helpers/close-test-app';
import { createAuthSession } from './helpers/create-auth-session';
import { createTestApp, TestAppContext } from './helpers/create-test-app';

describe('Dashboard Home E2E', () => {
  let app: INestApplication;
  let testApp: TestAppContext;
  let currentNow: Date;

  beforeAll(async () => {
    currentNow = new Date('2026-04-30T10:00:00.000Z');

    const testClock: Clock = {
      now: () => currentNow,
      todayUtcDateString: () => currentNow.toISOString().slice(0, 10),
    };

    testApp = await createTestApp({
      imports: [
        AuthModule,
        UsersModule,
        FitnessModule,
        TrainingModule,
        ProgressModule,
        DashboardModule,
      ],
      configureTestingModule: (moduleBuilder) => {
        moduleBuilder.overrideProvider(CLOCK).useValue(testClock);
      },
    });
    app = testApp.app;
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  it('full flow', async () => {
    currentNow = new Date('2026-04-30T10:00:00.000Z');
    const { token } = await createDashboardFlow(
      'dashboard-home-success@email.com',
      {
        createFitnessProfile: true,
        createTrainingPlan: true,
        activityLevel: 'high',
        logWorkout: true,
      },
    );

    const response = await request(app.getHttpServer())
      .get('/dashboard/home')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.dashboard.user).toEqual({
      name: 'Rodrigo Paiva',
    });
    expect(response.body.dashboard.fitnessProfile).toEqual({
      id: expect.any(String),
      goal: 'gain_muscle',
      activityLevel: 'high',
    });
    expect(response.body.dashboard.trainingPlan).toEqual({
      id: expect.any(String),
      todayWorkout: {
        dayIndex: 4,
        title: expect.any(String),
        focus: expect.any(String),
        format: expect.any(String),
        intensity: expect.any(String),
        exercises: expect.any(Array),
      },
    });
    expect(response.body.dashboard.progressSummary).toEqual({
      period: 'week',
      workoutsCompleted: 1,
      totalDurationMinutes: 45,
      averageDurationMinutes: 45,
      lastWorkoutDate: '2026-04-30',
    });
  });

  it('returns null fitnessProfile and trainingPlan when no active fitness profile exists', async () => {
    const { token } = await createDashboardFlow(
      'dashboard-home-no-fitness@email.com',
      {
        createFitnessProfile: false,
        createTrainingPlan: false,
      },
    );

    const response = await request(app.getHttpServer())
      .get('/dashboard/home')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.dashboard.fitnessProfile).toBeNull();
    expect(response.body.dashboard.trainingPlan).toBeNull();
    expect(response.body.dashboard.progressSummary).toEqual({
      period: 'week',
      workoutsCompleted: 0,
      totalDurationMinutes: 0,
      averageDurationMinutes: 0,
      lastWorkoutDate: null,
    });
  });

  it('returns null trainingPlan when no active training plan exists', async () => {
    const { token } = await createDashboardFlow(
      'dashboard-home-no-plan@email.com',
      {
        createFitnessProfile: true,
        createTrainingPlan: false,
      },
    );

    const response = await request(app.getHttpServer())
      .get('/dashboard/home')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.dashboard.fitnessProfile).not.toBeNull();
    expect(response.body.dashboard.trainingPlan).toBeNull();
  });

  it('returns todayWorkout as null when weeklySchedule does not contain the current UTC day', async () => {
    currentNow = new Date('2026-04-30T10:00:00.000Z');
    const { token } = await createDashboardFlow(
      'dashboard-home-today-null@email.com',
      {
        createFitnessProfile: true,
        createTrainingPlan: true,
        activityLevel: 'medium',
      },
    );

    const response = await request(app.getHttpServer())
      .get('/dashboard/home')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.dashboard.trainingPlan).toEqual({
      id: expect.any(String),
      todayWorkout: null,
    });
  });

  it("returns weekly summary based on current user's logs only", async () => {
    currentNow = new Date('2026-04-30T10:00:00.000Z');
    const { token } = await createDashboardFlow(
      'dashboard-home-summary@email.com',
      {
        createFitnessProfile: true,
        createTrainingPlan: true,
        activityLevel: 'high',
        logWorkout: true,
      },
    );

    await createDashboardFlow('dashboard-home-other-user@email.com', {
      createFitnessProfile: true,
      createTrainingPlan: true,
      activityLevel: 'high',
      logWorkout: true,
    });

    const response = await request(app.getHttpServer())
      .get('/dashboard/home')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.dashboard.progressSummary).toEqual({
      period: 'week',
      workoutsCompleted: 1,
      totalDurationMinutes: 45,
      averageDurationMinutes: 45,
      lastWorkoutDate: '2026-04-30',
    });
  });

  async function createDashboardFlow(
    email: string,
    options: {
      createFitnessProfile: boolean;
      createTrainingPlan: boolean;
      activityLevel?: 'low' | 'medium' | 'high';
      logWorkout?: boolean;
    },
  ): Promise<{ token: string }> {
    const { token } = await createAuthSession({ app, email });

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Rodrigo Paiva' })
      .expect(201);

    if (!options.createFitnessProfile) {
      return { token };
    }

    const fitnessResponse = await request(app.getHttpServer())
      .post('/fitness/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        heightCm: 180,
        weightKg: 82.5,
        goal: 'gain_muscle',
        activityLevel: options.activityLevel ?? 'high',
        trainingAvailability: {
          daysPerWeek: options.activityLevel === 'medium' ? 3 : 4,
          minutesPerSession: 60,
        },
      })
      .expect(201);

    if (!options.createTrainingPlan) {
      return { token };
    }

    const trainingResponse = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(201);

    if (options.logWorkout) {
      await request(app.getHttpServer())
        .post('/progress/workout-logs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          trainingPlanId: trainingResponse.body.trainingPlan.id,
          workoutDayIndex: 4,
          durationMinutes: 45,
          completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
        })
        .expect(201);
    }

    return { token };
  }
});
