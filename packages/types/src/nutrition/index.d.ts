export type NutritionGoal = 'fat_loss' | 'maintenance' | 'muscle_gain';
export type MacroTargets = {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
};
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealStatus = 'planned' | 'replaced';
export type MealLogStatus = 'consumed' | 'partial' | 'skipped';
export type FoodItem = {
    name: string;
    quantity: string;
    unit?: string;
    estimatedMacros?: MacroTargets;
    tags: string[];
};
export type MealOption = {
    id: string;
    title: string;
    foodItems: FoodItem[];
    estimatedMacros: MacroTargets;
    reason: string;
};
export type Meal = {
    id: string;
    type: MealType;
    title: string;
    description: string;
    foodItems: FoodItem[];
    estimatedMacros: MacroTargets;
    alternatives: MealOption[];
    status: MealStatus;
    replacementHistory?: Array<{
        previousMeal: Omit<Meal, 'replacementHistory'>;
        reason?: string;
        replacedAt: string;
    }>;
};
export type NutritionDay = {
    date: string;
    dayIndex: number;
    meals: Meal[];
    dailyMacroTargets: MacroTargets;
};
export type NutritionPlan = {
    id: string;
    userProfileId: string;
    nutritionProfileId: string;
    fitnessProfileId: string;
    status: 'active' | 'archived' | 'replaced';
    weekStartDate: string;
    weekEndDate: string;
    macroTargets: MacroTargets;
    days: NutritionDay[];
    generatedBy: 'deterministic';
    sourceContext?: {
        formulaVersion?: string;
        activityMultiplier?: number;
        goalAdjustment?: number;
    };
    createdAt: string;
    updatedAt?: string;
    replacedAt?: string;
};
export type MacroProgress = {
    target: number;
    actual: number;
    remaining: number;
    percent: number;
};
export type NutritionProgress = {
    calories: MacroProgress;
    protein: MacroProgress;
    carbs: MacroProgress;
    fats: MacroProgress;
    mealsLogged: number;
    totalMeals: number;
    adherenceScore: number;
};
export type NutritionLog = {
    id: string;
    userProfileId: string;
    nutritionPlanId: string;
    mealId: string;
    date: string;
    status: MealLogStatus;
    plannedMacros: MacroTargets;
    actualMacros: MacroTargets;
    createdAt: string;
    updatedAt: string;
};
export type TodayNutrition = {
    date: string;
    macroTargets: MacroTargets;
    meals: Meal[];
    logs: NutritionLog[];
    progress: NutritionProgress;
    nextMeal: Meal | null;
    nutritionFocus: {
        priority: 'recovery' | 'consistency' | 'performance';
        message: string;
        signals: string[];
    };
};
export type NutritionInfluence = 'goal:fat_loss' | 'goal:maintenance' | 'goal:muscle_gain' | 'adherence:low' | 'adherence:good' | 'training:today' | 'training:intensity_high' | 'recovery:high_fatigue' | 'nutrition:protein_low' | 'nutrition:meals_skipped';
export type NutritionContextSnapshot = {
    goal?: NutritionGoal;
    adherenceScore?: number;
    todayNutrition?: {
        mealsLogged: number;
        totalMeals: number;
        caloriesPercent: number;
        proteinPercent: number;
    };
    trainingDay?: {
        hasWorkoutToday: boolean;
        intensity?: 'low' | 'moderate' | 'high';
    };
    recovery?: {
        fatigueLevel?: 'LOW' | 'MODERATE' | 'HIGH';
        latestCheckIn?: {
            energyLevel: number;
            sleepQuality: number;
            muscleSoreness: number;
            motivationLevel: number;
        };
    };
};
export type NutritionRecommendation = {
    message: string;
    recommendations: string[];
    influences: NutritionInfluence[];
    generatorVersion: string;
    contextSnapshot: NutritionContextSnapshot;
};
export type CalculateMacroTargetsResponse = {
    macroTargets: MacroTargets & {
        formulaVersion: string;
        activityMultiplier: number;
        goalAdjustment: number;
        calculatedAt: string;
    };
};
export type CreateNutritionPlanResponse = {
    nutritionPlan: NutritionPlan;
};
export type GetCurrentNutritionPlanResponse = {
    nutritionPlan: NutritionPlan;
};
export type GetTodayNutritionResponse = {
    todayNutrition: TodayNutrition;
};
export type ReplaceMealRequest = {
    reason?: string;
};
export type ReplaceMealResponse = {
    meal: Meal;
    replacement: {
        previousMeal: Meal;
        reason?: string;
        replacedAt: string;
    };
};
export type LogMealRequest = {
    mealId: string;
    status: MealLogStatus;
    actualMacros?: MacroTargets;
};
export type LogMealResponse = {
    nutritionLog: NutritionLog;
};
export type GenerateNutritionRecommendationResponse = NutritionRecommendation;
