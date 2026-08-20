import { ApiClientError, type HttpClient } from './http-client';
import { createProgressApi } from './progress-api';

describe('createProgressApi', () => {
  it('completes and re-reads a workout session through the public contract', async () => {
    const response = { workoutSession: buildWorkoutSession('completed') };
    const request = jest.fn().mockResolvedValue(response);
    const api = createProgressApi(buildHttpClient(request));

    await expect(
      api.completeWorkout('507f1f77bcf86cd799439011'),
    ).resolves.toEqual(response);
    await expect(
      api.getWorkoutSession('507f1f77bcf86cd799439011'),
    ).resolves.toEqual(response);
    expect(request).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      path: '/progress/workout-sessions/507f1f77bcf86cd799439011/complete',
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: '/progress/workout-sessions/507f1f77bcf86cd799439011',
    });
  });
  it('starts the explicit workout session through the public contract', async () => {
    const response = {
      workoutSession: buildWorkoutSession(),
    };
    const request = jest.fn().mockResolvedValue(response);
    const api = createProgressApi(buildHttpClient(request));

    await expect(
      api.startWorkout({
        trainingPlanId: '507f1f77bcf86cd799439011',
        workoutDayIndex: 1,
      }),
    ).resolves.toEqual(response);
    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/progress/workout-sessions/start',
      body: {
        trainingPlanId: '507f1f77bcf86cd799439011',
        workoutDayIndex: 1,
      },
    });
  });
  it('submits only the public daily check-in signals', async () => {
    const request = jest.fn().mockResolvedValue({
      dailyCheckIn: buildDailyCheckIn(),
    });
    const api = createProgressApi(buildHttpClient(request));

    await api.submitDailyCheckIn({
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    });

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/progress/daily-check-in',
      body: {
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
      },
    });
  });

  it('keeps createDailyCheckIn as a compatibility alias', async () => {
    const request = jest.fn().mockResolvedValue({
      dailyCheckIn: buildDailyCheckIn(),
    });
    const api = createProgressApi(buildHttpClient(request));

    await api.createDailyCheckIn({
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    });

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/progress/daily-check-in',
      body: {
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
      },
    });
  });

  it('gets the canonical today state', async () => {
    const response = {
      completedToday: false,
      dailyCheckIn: null,
    };
    const request = jest.fn().mockResolvedValue(response);
    const api = createProgressApi(buildHttpClient(request));

    await expect(api.getTodayDailyCheckIn()).resolves.toEqual(response);
    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/progress/daily-check-in/today',
    });
  });

  it('returns a completed today state without interpreting the payload locally', async () => {
    const response = {
      completedToday: true,
      dailyCheckIn: buildDailyCheckIn(),
    };
    const request = jest.fn().mockResolvedValue(response);
    const api = createProgressApi(buildHttpClient(request));

    await expect(api.getTodayDailyCheckIn()).resolves.toEqual(response);
  });

  it('gets history with the backend-owned limit query', async () => {
    const request = jest.fn().mockResolvedValue({ dailyCheckIns: [] });
    const api = createProgressApi(buildHttpClient(request));

    await api.getDailyCheckInHistory({ limit: 30 });

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/progress/daily-check-ins?limit=30',
    });
  });

  it('propagates typed API errors, including Recovery failures', async () => {
    const error = new ApiClientError({
      code: 'RECOVERY_RECALCULATION_FAILED',
      message: 'Recovery recalculation failed.',
      status: 409,
    });
    const request = jest.fn().mockRejectedValue(error);
    const api = createProgressApi(buildHttpClient(request));

    await expect(
      api.submitDailyCheckIn({
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
      }),
    ).rejects.toBe(error);
  });
});

function buildHttpClient(request: jest.Mock): HttpClient {
  return { request } as unknown as HttpClient;
}

function buildDailyCheckIn() {
  return {
    id: 'checkin_123',
    energyLevel: 4,
    sleepQuality: 3,
    muscleSoreness: 2,
    motivationLevel: 5,
    localDate: '2026-07-27',
    timezone: 'UTC',
    createdAt: '2026-07-27T08:00:00.000Z',
    updatedAt: '2026-07-27T08:00:00.000Z',
  };
}

function buildWorkoutSession(status: 'active' | 'completed' = 'active') {
  return {
    id: 'session_123',
    userProfileId: 'user_123',
    trainingPlanId: '507f1f77bcf86cd799439011',
    workoutDayIndex: 1,
    date: '2026-08-20',
    status,
    startedAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    ...(status === 'completed'
      ? { completedAt: '2026-08-20T08:45:00.000Z' }
      : {}),
  };
}
