import {
  MealOptionProps,
  MealProps,
  MealType,
} from '../../domain/entities/meal.entity';
import {
  NutritionDayProps,
  NutritionPlanProps,
} from '../../domain/entities/nutrition-plan.entity';
import { FoodItemProps } from '../../domain/entities/food-item.entity';
import { MacroTargetsProps } from '../../domain/value-objects/macro-targets.value-object';
import { distributeMacrosByMealType } from './meal-macro-distribution.service';

export type GenerateNutritionPlanFoundationInput = {
  userProfileId: string;
  nutritionProfileId: string;
  fitnessProfileId: string;
  weekStartDate: string;
  macroTargets: MacroTargetsProps;
  mealsPerDay: number;
  goal: 'fat_loss' | 'maintenance' | 'muscle_gain';
  dietaryRestrictions?: string[];
  allergies?: string[];
  dislikedFoods?: string[];
  preferredFoods?: string[];
  createdAt?: Date;
};

type MealTemplate = {
  key: string;
  type: MealType;
  title: string;
  description: string;
  foodItems: FoodItemProps[];
};

const MEAL_TEMPLATES: MealTemplate[] = [
  {
    key: 'oats-yogurt',
    type: 'breakfast',
    title: 'Oats and yogurt bowl',
    description: 'Oats with yogurt, banana, and seeds.',
    foodItems: [
      { name: 'oats', quantity: '60', unit: 'g', tags: ['vegetarian'] },
      { name: 'yogurt', quantity: '180', unit: 'g', tags: ['dairy'] },
      { name: 'banana', quantity: '1', tags: ['fruit'] },
    ],
  },
  {
    key: 'tofu-breakfast',
    type: 'breakfast',
    title: 'Tofu breakfast plate',
    description: 'Tofu scramble with rice and fruit.',
    foodItems: [
      { name: 'tofu', quantity: '160', unit: 'g', tags: ['vegan', 'soy'] },
      { name: 'rice', quantity: '120', unit: 'g', tags: ['vegan'] },
      { name: 'berries', quantity: '80', unit: 'g', tags: ['fruit', 'vegan'] },
    ],
  },
  {
    key: 'chicken-rice',
    type: 'lunch',
    title: 'Chicken rice plate',
    description: 'Chicken breast with rice and vegetables.',
    foodItems: [
      { name: 'chicken', quantity: '160', unit: 'g', tags: ['meat'] },
      { name: 'rice', quantity: '180', unit: 'g', tags: ['grain'] },
      { name: 'zucchini', quantity: '120', unit: 'g', tags: ['vegetable'] },
    ],
  },
  {
    key: 'lentil-rice',
    type: 'lunch',
    title: 'Lentil rice bowl',
    description: 'Lentils, rice, and vegetables.',
    foodItems: [
      { name: 'lentils', quantity: '180', unit: 'g', tags: ['vegan'] },
      { name: 'rice', quantity: '160', unit: 'g', tags: ['vegan'] },
      { name: 'spinach', quantity: '80', unit: 'g', tags: ['vegan'] },
    ],
  },
  {
    key: 'salmon-potato',
    type: 'dinner',
    title: 'Salmon potato dinner',
    description: 'Salmon with potatoes and greens.',
    foodItems: [
      { name: 'salmon', quantity: '150', unit: 'g', tags: ['fish'] },
      { name: 'potato', quantity: '220', unit: 'g', tags: ['vegetable'] },
      { name: 'green beans', quantity: '100', unit: 'g', tags: ['vegetable'] },
    ],
  },
  {
    key: 'bean-pasta',
    type: 'dinner',
    title: 'Bean pasta dinner',
    description: 'Bean pasta with tomato sauce.',
    foodItems: [
      { name: 'bean pasta', quantity: '180', unit: 'g', tags: ['vegan'] },
      { name: 'tomato sauce', quantity: '120', unit: 'g', tags: ['vegan'] },
      { name: 'olive oil', quantity: '10', unit: 'g', tags: ['vegan'] },
    ],
  },
  {
    key: 'fruit-nuts',
    type: 'snack',
    title: 'Fruit and nuts',
    description: 'Fruit with mixed nuts.',
    foodItems: [
      { name: 'apple', quantity: '1', tags: ['fruit', 'vegan'] },
      { name: 'almonds', quantity: '25', unit: 'g', tags: ['nuts', 'vegan'] },
    ],
  },
  {
    key: 'hummus-toast',
    type: 'snack',
    title: 'Hummus toast',
    description: 'Toast with hummus and vegetables.',
    foodItems: [
      { name: 'hummus', quantity: '60', unit: 'g', tags: ['vegan'] },
      { name: 'toast', quantity: '1', tags: ['grain'] },
      { name: 'carrot', quantity: '80', unit: 'g', tags: ['vegetable'] },
    ],
  },
];

export function generateNutritionPlanFoundation(
  input: GenerateNutritionPlanFoundationInput,
): NutritionPlanProps {
  const weekStartDate = parseUtcDate(input.weekStartDate);
  const days = Array.from({ length: 7 }, (_, index) =>
    buildNutritionDay(input, weekStartDate, index),
  );
  const weekEndDate = toUtcDateString(addUtcDays(weekStartDate, 6));

  return {
    id: stableId('nutrition-plan', [
      input.userProfileId,
      input.nutritionProfileId,
      input.weekStartDate,
    ]),
    userProfileId: input.userProfileId,
    nutritionProfileId: input.nutritionProfileId,
    fitnessProfileId: input.fitnessProfileId,
    status: 'active',
    weekStartDate: input.weekStartDate,
    weekEndDate,
    macroTargets: input.macroTargets,
    days,
    generatedBy: 'deterministic',
    createdAt:
      input.createdAt ?? new Date(`${input.weekStartDate}T00:00:00.000Z`),
  };
}

function buildNutritionDay(
  input: GenerateNutritionPlanFoundationInput,
  weekStartDate: Date,
  dayIndex: number,
): NutritionDayProps {
  const date = toUtcDateString(addUtcDays(weekStartDate, dayIndex));
  const distributions = distributeMacrosByMealType({
    macroTargets: input.macroTargets,
    mealsPerDay: input.mealsPerDay,
  });

  return {
    date,
    dayIndex: dayIndex + 1,
    meals: distributions.map((distribution, mealIndex) =>
      buildMeal({
        input,
        date,
        dayIndex: dayIndex + 1,
        mealIndex: mealIndex + 1,
        type: distribution.type,
        macroTargets: distribution.macroTargets,
      }),
    ),
    dailyMacroTargets: input.macroTargets,
  };
}

function buildMeal(input: {
  input: GenerateNutritionPlanFoundationInput;
  date: string;
  dayIndex: number;
  mealIndex: number;
  type: MealType;
  macroTargets: MacroTargetsProps;
}): MealProps {
  const templates = safeTemplatesForType(input.type, input.input);
  const template = chooseTemplate(templates, {
    preferredFoods: input.input.preferredFoods ?? [],
    dayIndex: input.dayIndex,
    mealIndex: input.mealIndex,
  });
  const alternatives = templates
    .filter((candidate) => candidate.key !== template.key)
    .slice(0, 2)
    .map((candidate, index) =>
      buildMealOption({
        template: candidate,
        macroTargets: input.macroTargets,
        mealId: stableId('meal', [
          input.input.userProfileId,
          input.date,
          input.mealIndex.toString(),
          input.type,
        ]),
        index,
      }),
    );

  return {
    id: stableId('meal', [
      input.input.userProfileId,
      input.date,
      input.mealIndex.toString(),
      input.type,
    ]),
    type: input.type,
    title: template.title,
    description: template.description,
    foodItems: template.foodItems,
    estimatedMacros: input.macroTargets,
    alternatives,
    status: 'planned',
  };
}

function buildMealOption(input: {
  template: MealTemplate;
  macroTargets: MacroTargetsProps;
  mealId: string;
  index: number;
}): MealOptionProps {
  return {
    id: stableId('meal-option', [
      input.mealId,
      input.template.key,
      input.index.toString(),
    ]),
    title: input.template.title,
    foodItems: input.template.foodItems,
    estimatedMacros: input.macroTargets,
    reason: 'Compatible deterministic alternative',
  };
}

function safeTemplatesForType(
  mealType: MealType,
  input: GenerateNutritionPlanFoundationInput,
): MealTemplate[] {
  const allergies = normalizeTerms(input.allergies);
  const restrictions = normalizeTerms(input.dietaryRestrictions);
  const dislikedFoods = normalizeTerms(input.dislikedFoods);
  const safeTemplates = MEAL_TEMPLATES.filter(
    (template) =>
      template.type === mealType &&
      isTemplateSafe(template, allergies, restrictions) &&
      !containsAnyFoodName(template, dislikedFoods),
  );

  if (safeTemplates.length > 0) {
    return safeTemplates;
  }

  return MEAL_TEMPLATES.filter(
    (template) =>
      template.type === mealType &&
      isTemplateSafe(template, allergies, restrictions),
  );
}

function isTemplateSafe(
  template: MealTemplate,
  allergies: string[],
  restrictions: string[],
): boolean {
  const foodTerms = template.foodItems.flatMap((item) => [
    item.name.toLowerCase(),
    ...item.tags.map((tag) => tag.toLowerCase()),
  ]);

  if (allergies.some((allergy) => foodTerms.includes(allergy))) {
    return false;
  }

  if (restrictions.includes('vegan')) {
    return template.foodItems.every((item) => item.tags.includes('vegan'));
  }

  if (restrictions.includes('vegetarian')) {
    return template.foodItems.every(
      (item) => !item.tags.includes('meat') && !item.tags.includes('fish'),
    );
  }

  return true;
}

function containsAnyFoodName(template: MealTemplate, foods: string[]): boolean {
  return foods.some((food) =>
    template.foodItems.some((item) => item.name.toLowerCase() === food),
  );
}

function chooseTemplate(
  templates: MealTemplate[],
  input: {
    preferredFoods: string[];
    dayIndex: number;
    mealIndex: number;
  },
): MealTemplate {
  if (templates.length === 0) {
    throw new Error('No compatible meal template found.');
  }

  const preferredFoods = normalizeTerms(input.preferredFoods);
  const preferred = templates.find((template) =>
    preferredFoods.some((food) =>
      template.foodItems.some((item) => item.name.toLowerCase() === food),
    ),
  );

  if (preferred) {
    return preferred;
  }

  return templates[(input.dayIndex + input.mealIndex - 2) % templates.length];
}

function normalizeTerms(values?: string[]): string[] {
  return (values ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function parseUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function stableId(prefix: string, parts: string[]): string {
  return `${prefix}_${parts
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`;
}
