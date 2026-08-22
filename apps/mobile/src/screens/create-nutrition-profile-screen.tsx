import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type { NutritionGoal } from '@elev9/types';
import { Button, Card, Input, Screen, Text, colors } from '@elev9/ui';

import { apiClient } from '../api/client';
import {
  getOnboardingErrorCategory,
  trackOnboardingEvent,
} from '../analytics/onboarding-analytics';
import type { RootStackParamList } from '../navigation/app-navigator';

const NUTRITION_GOAL_OPTIONS = [
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
] as const satisfies ReadonlyArray<{
  value: NutritionGoal;
  label: string;
}>;

const MEALS_PER_DAY_OPTIONS = [3, 4, 5] as const;
const DIETARY_RESTRICTION_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Lactose-free',
  'Halal',
  'Kosher',
] as const;

export function CreateNutritionProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'CreateNutritionProfile'>>();

  const [selectedGoal, setSelectedGoal] = useState<NutritionGoal | null>(
    route.params?.prefillGoal ?? null,
  );
  const [mealsPerDay, setMealsPerDay] = useState<number | null>(null);
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(
    [],
  );
  const [allergiesText, setAllergiesText] = useState('');
  const [dislikedFoodsText, setDislikedFoodsText] = useState('');
  const [preferredFoodsText, setPreferredFoodsText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackOnboardingEvent('nutrition_started');
  }, []);

  const canSubmit = selectedGoal !== null && mealsPerDay !== null;

  const parsedFields = useMemo(
    () => ({
      allergies: parseCommaSeparatedList(allergiesText),
      dislikedFoods: parseCommaSeparatedList(dislikedFoodsText),
      preferredFoods: parseCommaSeparatedList(preferredFoodsText),
    }),
    [allergiesText, dislikedFoodsText, preferredFoodsText],
  );

  const handleSelectGoal = useCallback((goal: NutritionGoal) => {
    setSelectedGoal(goal);
    setErrorMessage(null);
  }, []);

  const handleSelectMealsPerDay = useCallback((value: number) => {
    setMealsPerDay(value);
    setErrorMessage(null);
  }, []);

  const handleToggleRestriction = useCallback((restriction: string) => {
    setSelectedRestrictions((current) => {
      const hasRestriction = current.includes(restriction);

      setErrorMessage(null);

      if (hasRestriction) {
        return current.filter((item) => item !== restriction);
      }

      return [...current, restriction];
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || selectedGoal === null || mealsPerDay === null) {
      setErrorMessage('Choose a goal and meals per day to continue.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await apiClient.nutrition.createNutritionProfile({
        goal: selectedGoal,
        mealsPerDay,
        dietaryRestrictions: selectedRestrictions,
        allergies: parsedFields.allergies,
        dislikedFoods: parsedFields.dislikedFoods,
        preferredFoods: parsedFields.preferredFoods,
      });

      await apiClient.nutrition.createNutritionPlan();
      trackOnboardingEvent('nutrition_completed');
      navigation.replace('HomeResolver');
    } catch (error) {
      trackOnboardingEvent('onboarding_error', {
        stage: 'nutrition',
        errorCategory: getOnboardingErrorCategory(error),
      });
      setErrorMessage(getNutritionSetupErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    mealsPerDay,
    navigation,
    parsedFields.allergies,
    parsedFields.dislikedFoods,
    parsedFields.preferredFoods,
    selectedGoal,
    selectedRestrictions,
  ]);

  return (
    <Screen contentStyle={styles.content} scroll scrollProps={scrollProps}>
      <View style={styles.stack}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Onboarding</Text>
          <Text variant="headline" style={styles.title}>
            Set up your nutrition
          </Text>
          <Text style={styles.subtitle}>
            Your coach will use this to personalize meals, macros and
            recommendations.
          </Text>
        </View>

        <Card style={styles.card}>
          <FormSection
            label="Goal"
            description="Choose the nutrition focus that best matches your current target."
          >
            <ChipRow>
              {NUTRITION_GOAL_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option.value}
                  label={option.label}
                  selected={selectedGoal === option.value}
                  onPress={() => handleSelectGoal(option.value)}
                />
              ))}
            </ChipRow>
          </FormSection>

          <FormSection
            label="Meals per day"
            description="Select the cadence that fits your current routine."
          >
            <ChipRow>
              {MEALS_PER_DAY_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option}
                  label={String(option)}
                  selected={mealsPerDay === option}
                  onPress={() => handleSelectMealsPerDay(option)}
                />
              ))}
            </ChipRow>
          </FormSection>

          <FormSection
            label="Restrictions"
            description="Select any dietary restrictions your coach should respect."
          >
            <ChipWrap>
              {DIETARY_RESTRICTION_OPTIONS.map((restriction) => (
                <ChoiceChip
                  key={restriction}
                  label={restriction}
                  selected={selectedRestrictions.includes(restriction)}
                  onPress={() => handleToggleRestriction(restriction)}
                />
              ))}
            </ChipWrap>
          </FormSection>

          <FormSection
            label="Allergies"
            description="List allergies separated by commas."
          >
            <Input
              autoCapitalize="words"
              autoCorrect={false}
              label="Allergies"
              placeholder="Peanuts, shellfish, soy"
              value={allergiesText}
              onChangeText={(value) => {
                setAllergiesText(value);
                setErrorMessage(null);
              }}
            />
          </FormSection>

          <FormSection
            label="Preferences"
            description="Add foods you prefer or want to avoid."
          >
            <View style={styles.preferenceStack}>
              <Input
                autoCapitalize="words"
                autoCorrect={false}
                label="Disliked foods"
                placeholder="Mushrooms, olives, spicy food"
                value={dislikedFoodsText}
                onChangeText={(value) => {
                  setDislikedFoodsText(value);
                  setErrorMessage(null);
                }}
              />
              <Input
                autoCapitalize="words"
                autoCorrect={false}
                label="Preferred foods"
                placeholder="Chicken, rice, oats, berries"
                value={preferredFoodsText}
                onChangeText={(value) => {
                  setPreferredFoodsText(value);
                  setErrorMessage(null);
                }}
              />
            </View>
          </FormSection>

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          <Button
            label={
              isSubmitting ? 'Creating your plan...' : 'Create Nutrition Plan'
            }
            onPress={() => void handleSubmit()}
            loading={isSubmitting}
            disabled={!canSubmit}
            style={styles.submitButton}
          />
        </Card>
      </View>
    </Screen>
  );
}

const scrollProps = {
  keyboardShouldPersistTaps: 'handled' as const,
};

function FormSection({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
      {children}
    </View>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : null,
        pressed ? styles.chipPressed : null,
      ]}
    >
      <Text
        style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

function ChipWrap({ children }: { children: ReactNode }) {
  return <View style={styles.chipWrap}>{children}</View>;
}

function parseCommaSeparatedList(input: string): string[] {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getNutritionSetupErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case 'USER_PROFILE_NOT_FOUND':
        return 'Create your profile before setting up nutrition.';
      case 'FITNESS_PROFILE_NOT_FOUND':
        return 'Create your fitness profile before generating a nutrition plan.';
      case 'NUTRITION_PROFILE_NOT_FOUND':
        return 'Unable to create your nutrition plan right now.';
      case 'NUTRITION_PLAN_HEIGHT_CM_MISSING':
      case 'NUTRITION_PLAN_WEIGHT_KG_MISSING':
        return 'Complete your fitness profile before generating a nutrition plan.';
      case 'AUTH_INVALID_SESSION':
        return 'Your session expired. Please sign in again.';
      default:
        return error.message || 'Unable to create your nutrition setup.';
    }
  }

  return 'Unable to create your nutrition setup.';
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 32,
  },
  stack: {
    gap: 24,
  },
  hero: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
  },
  card: {
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDescription: {
    color: colors.mutedText,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: colors.primary,
  },
  preferenceStack: {
    gap: 14,
  },
  error: {
    color: colors.danger,
  },
  submitButton: {
    width: '100%',
  },
});
