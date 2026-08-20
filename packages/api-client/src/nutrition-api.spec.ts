import { type HttpClient } from './http-client';
import { createNutritionApi } from './nutrition-api';

describe('createNutritionApi', () => {
  it('maps the nutrition journey to the API contract', async () => {
    const request = jest.fn().mockResolvedValue({});
    const api = createNutritionApi(buildHttpClient(request));

    await api.createNutritionProfile({ goal: 'muscle_gain', mealsPerDay: 4 });
    await api.getNutritionProfile();
    await api.calculateMacroTargets();
    await api.createNutritionPlan();
    await api.getCurrentNutritionPlan();
    await api.getTodayNutrition();
    await api.logMeal({ mealId: 'meal_1', status: 'consumed' });
    await api.getHistory({ from: '2026-08-20', to: '2026-08-20', limit: 10 });
    await api.getHistoryDay('2026-08-20');
    await api.getTrends({ from: '2026-08-01', to: '2026-08-20' });
    await api.generateNutritionRecommendation();
    await api.getNutritionRecommendations({ limit: 3 });
    await api.replaceMeal('meal_1', { reason: 'Prefer another option.' });

    expect(request.mock.calls.map(([input]) => input)).toEqual([
      {
        method: 'POST',
        path: '/nutrition/profile',
        body: { goal: 'muscle_gain', mealsPerDay: 4 },
      },
      { method: 'GET', path: '/nutrition/profile' },
      { method: 'POST', path: '/nutrition/macro-targets/calculate' },
      { method: 'POST', path: '/nutrition/plans' },
      { method: 'GET', path: '/nutrition/plans/current' },
      { method: 'GET', path: '/nutrition/today' },
      {
        method: 'POST',
        path: '/nutrition/logs',
        body: { mealId: 'meal_1', status: 'consumed' },
      },
      {
        method: 'GET',
        path: '/nutrition/history?from=2026-08-20&to=2026-08-20&limit=10',
      },
      { method: 'GET', path: '/nutrition/history/2026-08-20' },
      {
        method: 'GET',
        path: '/nutrition/trends?from=2026-08-01&to=2026-08-20',
      },
      { method: 'POST', path: '/nutrition/recommendations' },
      { method: 'GET', path: '/nutrition/recommendations?limit=3' },
      {
        method: 'POST',
        path: '/nutrition/meals/meal_1/replace',
        body: { reason: 'Prefer another option.' },
      },
    ]);
  });
});

function buildHttpClient(request: jest.Mock): HttpClient {
  return { request };
}
