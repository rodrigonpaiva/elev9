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
export type NutritionProgress = {
    consumedCalories: number;
    consumedProteinGrams: number;
    consumedCarbsGrams: number;
    consumedFatGrams: number;
    targetCalories: number;
    targetProteinGrams: number;
    targetCarbsGrams: number;
    targetFatGrams: number;
    adherencePercentage: number;
};
export type NutritionLog = {
    id: string;
    userProfileId: string;
    nutritionPlanId: string;
    mealId: string;
    date: string;
    mealType: MealType;
    status: MealLogStatus;
    actualMacros?: MacroTargets;
    createdAt: string;
    updatedAt: string;
};
export type TodayNutrition = {
    date: string;
    macroTargets: MacroTargets;
    meals: Meal[];
    progress: NutritionProgress;
    nextMeal: Meal | null;
    nutritionFocus: string;
};
export type NutritionInfluence = 'LOW_CALORIE_ADHERENCE' | 'PROTEIN_TARGET_MISSED' | 'SKIPPED_MEALS' | 'PARTIAL_MEALS' | 'MUSCLE_GAIN_SURPLUS_FOCUS' | 'FAT_LOSS_DEFICIT_FOCUS' | 'MAINTENANCE_CONSISTENCY_FOCUS' | 'NO_LOGS_YET';
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
    id?: string;
    userProfileId?: string;
    message: string;
    recommendations: string[];
    influences: NutritionInfluence[];
    generatorVersion: string;
    contextSnapshot: NutritionContextSnapshot;
    createdAt?: string;
};
export type CreateNutritionProfileRequest = {
    goal: NutritionGoal;
    mealsPerDay: number;
    dietaryRestrictions?: string[];
    allergies?: string[];
    dislikedFoods?: string[];
    preferredFoods?: string[];
};
export type CreateNutritionProfileResponse = {
    nutritionProfile: {
        id: string;
        userProfileId: string;
        goal: NutritionGoal;
        mealsPerDay: number;
        dietaryRestrictions: string[];
        allergies: string[];
        dislikedFoods: string[];
        preferredFoods: string[];
        status: 'active';
        createdAt: string;
        updatedAt: string;
    };
};
export type GetNutritionProfileResponse = CreateNutritionProfileResponse;
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
    date?: string;
    status: MealLogStatus;
    actualMacros?: MacroTargets;
};
export type LogMealResponse = {
    nutritionLog: NutritionLog;
};
export type GenerateNutritionRecommendationResponse = {
    nutritionRecommendation: NutritionRecommendation;
};
export type GetNutritionRecommendationsResponse = {
    recommendations: NutritionRecommendation[];
};
