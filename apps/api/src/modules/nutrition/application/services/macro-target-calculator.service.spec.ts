import { calculateMacroTargets } from './macro-target-calculator.service';

describe('calculateMacroTargets', () => {
  const now = new Date('2026-06-02T10:00:00.000Z');

  it('calculates macro targets with complete data', () => {
    const result = calculateMacroTargets({
      birthDate: new Date('1994-05-20T00:00:00.000Z'),
      gender: 'male',
      heightCm: 178,
      weightKg: 76,
      goal: 'maintenance',
      activityLevel: 'medium',
      now,
    });

    expect(result.macroTargets).toEqual({
      calories: 2662,
      proteinGrams: 122,
      carbsGrams: 343,
      fatGrams: 89,
    });
    expect(result.calculation.fallbackUsed).toBe(false);
    expect(result.calculation.fallbackReasons).toEqual([]);
  });

  it('uses a fallback age when birthDate is missing', () => {
    const result = calculateMacroTargets({
      gender: 'male',
      heightCm: 178,
      weightKg: 76,
      goal: 'maintenance',
      activityLevel: 'medium',
      now,
    });

    expect(result.calculation.fallbackUsed).toBe(true);
    expect(result.calculation.fallbackReasons).toContain('birthDate_missing');
    expect(result.calculation.source.age).toBe(30);
  });

  it('uses a neutral fallback when gender is missing', () => {
    const result = calculateMacroTargets({
      birthDate: new Date('1994-05-20T00:00:00.000Z'),
      heightCm: 178,
      weightKg: 76,
      goal: 'maintenance',
      activityLevel: 'medium',
      now,
    });

    expect(result.calculation.fallbackUsed).toBe(true);
    expect(result.calculation.fallbackReasons).toContain('gender_missing');
  });

  it('uses fallback body metrics when height or weight is missing', () => {
    const result = calculateMacroTargets({
      birthDate: new Date('1994-05-20T00:00:00.000Z'),
      gender: 'female',
      goal: 'maintenance',
      activityLevel: 'medium',
      now,
    });

    expect(result.calculation.fallbackReasons).toEqual(
      expect.arrayContaining(['heightCm_missing', 'weightKg_missing']),
    );
    expect(result.macroTargets.calories).toBeGreaterThan(0);
  });

  it('applies different calorie adjustments for each nutrition goal', () => {
    const baseInput = {
      birthDate: new Date('1994-05-20T00:00:00.000Z'),
      gender: 'male' as const,
      heightCm: 178,
      weightKg: 76,
      activityLevel: 'medium' as const,
      now,
    };

    const fatLoss = calculateMacroTargets({
      ...baseInput,
      goal: 'fat_loss',
    });
    const maintenance = calculateMacroTargets({
      ...baseInput,
      goal: 'maintenance',
    });
    const muscleGain = calculateMacroTargets({
      ...baseInput,
      goal: 'muscle_gain',
    });

    expect(fatLoss.macroTargets.calories).toBeLessThan(
      maintenance.macroTargets.calories,
    );
    expect(muscleGain.macroTargets.calories).toBeGreaterThan(
      maintenance.macroTargets.calories,
    );
    expect(fatLoss.calculation.calorieAdjustment).toBe(-400);
    expect(maintenance.calculation.calorieAdjustment).toBe(0);
    expect(muscleGain.calculation.calorieAdjustment).toBe(250);
  });
});
