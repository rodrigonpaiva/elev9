import type { GetTodayDailyCheckInResponse } from '@elev9/types';

import { resolveDailyCheckInMode } from '../models/daily-check-in-integration';

describe('daily check-in integration decisions', () => {
  it('uses the API today response as the create/edit source of truth', () => {
    const emptyToday: GetTodayDailyCheckInResponse = {
      completedToday: false,
      dailyCheckIn: null,
    };
    const completedToday = {
      completedToday: true,
      dailyCheckIn: {
        id: 'check-in-1',
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
        localDate: '2026-07-27',
        timezone: 'UTC',
        createdAt: '2026-07-27T08:00:00.000Z',
        updatedAt: '2026-07-27T08:00:00.000Z',
      },
    } satisfies GetTodayDailyCheckInResponse;

    expect(resolveDailyCheckInMode(emptyToday)).toBe('create');
    expect(resolveDailyCheckInMode(completedToday)).toBe('edit');
  });
});
