import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import {
  Button,
  Card,
  Screen,
  Text,
  colors,
  formatGenericEnumLabel,
  formatGoalType,
} from '@elev9/ui';

import { mobileApiClient } from '../api/client';
import {
  getOnboardingErrorCategory,
  trackOnboardingEvent,
} from '../analytics/onboarding-analytics';
import type { RootStackParamList } from '../navigation/app-navigator';
import { OnboardingProgress } from '../components/onboarding-progress';

export function CreateTrainingPlanScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateTrainingPlan'>>();
  const { fitnessProfileId, goal, activityLevel } = route.params;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateTrainingPlan() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await mobileApiClient.training.createPlan({ fitnessProfileId });
      trackOnboardingEvent('plan_created');
      navigation.replace('HomeResolver');
    } catch (error) {
      trackOnboardingEvent('onboarding_error', {
        stage: 'training_plan',
        errorCategory: getOnboardingErrorCategory(error),
      });
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to generate your training plan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.content} scroll>
      <View style={styles.stack}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Onboarding</Text>
          <Text variant="headline" style={styles.title}>
            Build your first training plan
          </Text>
          <Text style={styles.subtitle}>
            Elev9 will build a plan based on your goal and training setup.
          </Text>
        </View>
        <OnboardingProgress stage="training_plan" />

        <Card style={styles.card}>
          <Text variant="title">Ready to train</Text>
          <Text style={styles.subtitle}>
            Your plan is built from your goal and training rhythm, so you can
            start quickly and refine later.
          </Text>

          {goal || activityLevel ? (
            <View style={styles.summaryBox}>
              {goal ? (
                <Text style={styles.summaryText}>
                  Goal: {formatGoalType(goal)}
                </Text>
              ) : null}
              {activityLevel ? (
                <Text style={styles.summaryText}>
                  Activity: {formatGenericEnumLabel(activityLevel)}
                </Text>
              ) : null}
            </View>
          ) : null}

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          <Button
            label="Generate my plan"
            onPress={handleCreateTrainingPlan}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.fullButton}
          />
        </Card>
      </View>
    </Screen>
  );
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
    gap: 18,
  },
  summaryBox: {
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0b1220',
    padding: 14,
  },
  summaryText: {
    color: colors.text,
    fontWeight: '600',
  },
  error: {
    color: '#fca5a5',
  },
  fullButton: {
    width: '100%',
  },
});
