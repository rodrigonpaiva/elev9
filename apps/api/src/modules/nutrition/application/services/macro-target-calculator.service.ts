import { MacroTargetsProps } from '../../domain/value-objects/macro-targets.value-object';

export type MacroNutritionGoal = 'fat_loss' | 'maintenance' | 'muscle_gain';
export type MacroActivityLevel = 'low' | 'medium' | 'high';
export type MacroGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type CalculateMacroTargetsPureInput = {
  birthDate?: Date;
  gender?: MacroGender;
  heightCm?: number;
  weightKg?: number;
  goal: MacroNutritionGoal;
  activityLevel?: MacroActivityLevel;
  now?: Date;
};

export type CalculateMacroTargetsPureOutput = {
  macroTargets: MacroTargetsProps;
  calculation: {
    method: 'mifflin_st_jeor';
    activityMultiplier: number;
    calorieAdjustment: number;
    fallbackUsed: boolean;
    fallbackReasons: string[];
    source: {
      age?: number;
      gender?: MacroGender;
      heightCm?: number;
      weightKg?: number;
      goal: MacroNutritionGoal;
      activityLevel?: MacroActivityLevel;
    };
  };
};

const FALLBACK_AGE = 30;
const FALLBACK_HEIGHT_CM = 170;
const FALLBACK_WEIGHT_KG = 70;

const ACTIVITY_MULTIPLIERS: Record<MacroActivityLevel, number> = {
  low: 1.375,
  medium: 1.55,
  high: 1.725,
};

const CALORIE_ADJUSTMENTS: Record<MacroNutritionGoal, number> = {
  fat_loss: -400,
  maintenance: 0,
  muscle_gain: 250,
};

const PROTEIN_FACTORS: Record<MacroNutritionGoal, number> = {
  fat_loss: 2,
  maintenance: 1.6,
  muscle_gain: 2,
};

const FAT_RATIOS: Record<MacroNutritionGoal, number> = {
  fat_loss: 0.25,
  maintenance: 0.3,
  muscle_gain: 0.25,
};

export function calculateMacroTargets(
  input: CalculateMacroTargetsPureInput,
): CalculateMacroTargetsPureOutput {
  const fallbackReasons: string[] = [];
  const now = input.now ?? new Date();
  const age = resolveAge(input.birthDate, now, fallbackReasons);
  const gender = resolveGender(input.gender, fallbackReasons);
  const heightCm = resolvePositiveNumber(
    input.heightCm,
    FALLBACK_HEIGHT_CM,
    'heightCm_missing',
    fallbackReasons,
  );
  const weightKg = resolvePositiveNumber(
    input.weightKg,
    FALLBACK_WEIGHT_KG,
    'weightKg_missing',
    fallbackReasons,
  );
  const activityLevel = input.activityLevel ?? 'medium';

  if (!input.activityLevel) {
    fallbackReasons.push('activityLevel_missing');
  }

  const bmr = calculateBmr({
    age,
    gender,
    heightCm,
    weightKg,
  });
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const calorieAdjustment = CALORIE_ADJUSTMENTS[input.goal];
  const calories = Math.round(bmr * activityMultiplier + calorieAdjustment);
  const proteinGrams = Math.round(weightKg * PROTEIN_FACTORS[input.goal]);
  const fatGrams = Math.round((calories * FAT_RATIOS[input.goal]) / 9);
  const carbsGrams = Math.max(
    0,
    Math.round((calories - proteinGrams * 4 - fatGrams * 9) / 4),
  );

  return {
    macroTargets: {
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
    },
    calculation: {
      method: 'mifflin_st_jeor',
      activityMultiplier,
      calorieAdjustment,
      fallbackUsed: fallbackReasons.length > 0,
      fallbackReasons,
      source: {
        age,
        gender: input.gender,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        goal: input.goal,
        activityLevel: input.activityLevel,
      },
    },
  };
}

function resolveAge(
  birthDate: Date | undefined,
  now: Date,
  fallbackReasons: string[],
): number {
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) {
    fallbackReasons.push('birthDate_missing');
    return FALLBACK_AGE;
  }

  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasBirthdayPassed =
    now.getUTCMonth() > birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() &&
      now.getUTCDate() >= birthDate.getUTCDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  if (age <= 0) {
    fallbackReasons.push('birthDate_invalid');
    return FALLBACK_AGE;
  }

  return age;
}

function resolveGender(
  gender: MacroGender | undefined,
  fallbackReasons: string[],
): 'male' | 'female' | 'neutral' {
  if (gender === 'male' || gender === 'female') {
    return gender;
  }

  fallbackReasons.push('gender_missing');
  return 'neutral';
}

function resolvePositiveNumber(
  value: number | undefined,
  fallback: number,
  reason: string,
  fallbackReasons: string[],
): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  fallbackReasons.push(reason);
  return fallback;
}

function calculateBmr(input: {
  age: number;
  gender: 'male' | 'female' | 'neutral';
  heightCm: number;
  weightKg: number;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;

  switch (input.gender) {
    case 'male':
      return base + 5;
    case 'female':
      return base - 161;
    case 'neutral':
    default:
      return base - 78;
  }
}
