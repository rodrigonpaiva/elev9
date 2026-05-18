import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  FitnessProfileActivityLevel,
  FitnessProfileGoal,
} from '@elev9/types';
import { Button, Card, Input, Screen, Text, colors } from '@elev9/ui';

import { mobileApiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

export function CreateFitnessProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [goal, setGoal] = useState<FitnessProfileGoal>('gain_muscle');
  const [activityLevel, setActivityLevel] =
    useState<FitnessProfileActivityLevel>('medium');
  const [heightCm, setHeightCm] = useState('175');
  const [weightKg, setWeightKg] = useState('75');
  const [daysPerWeek, setDaysPerWeek] = useState('3');
  const [minutesPerSession, setMinutesPerSession] = useState('45');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validation = useMemo(() => {
    const height = Number(heightCm);
    const weight = Number(weightKg);
    const days = Number(daysPerWeek);
    const minutes = Number(minutesPerSession);

    return {
      height,
      weight,
      days,
      minutes,
      heightError:
        heightCm.length === 0
          ? null
          : !Number.isInteger(height) || height < 100 || height > 250
            ? 'Use an integer between 100 and 250.'
            : null,
      weightError:
        weightKg.length === 0
          ? null
          : Number.isNaN(weight) || weight < 30 || weight > 300
            ? 'Use a value between 30 and 300.'
            : null,
      daysError:
        daysPerWeek.length === 0
          ? null
          : !Number.isInteger(days) || days < 1 || days > 7
            ? 'Choose between 1 and 7 days.'
            : null,
      minutesError:
        minutesPerSession.length === 0
          ? null
          : !Number.isInteger(minutes) || minutes < 10 || minutes > 180
            ? 'Choose between 10 and 180 minutes.'
            : null,
      isValid:
        Number.isInteger(height) &&
        height >= 100 &&
        height <= 250 &&
        !Number.isNaN(weight) &&
        weight >= 30 &&
        weight <= 300 &&
        Number.isInteger(days) &&
        days >= 1 &&
        days <= 7 &&
        Number.isInteger(minutes) &&
        minutes >= 10 &&
        minutes <= 180,
    };
  }, [daysPerWeek, heightCm, minutesPerSession, weightKg]);

  async function handleCreateFitnessProfile() {
    if (!validation.isValid) {
      setErrorMessage('Check your body metrics and training availability.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await mobileApiClient.fitness.createProfile({
        heightCm: validation.height,
        weightKg: validation.weight,
        goal,
        activityLevel,
        trainingAvailability: {
          daysPerWeek: validation.days,
          minutesPerSession: validation.minutes,
        },
      });

      navigation.replace('CreateTrainingPlan', {
        fitnessProfileId: response.fitnessProfile.id,
        goal,
        activityLevel,
      });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to create your fitness profile.');
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
            Define your fitness goal
          </Text>
          <Text style={styles.subtitle}>
            Add just enough context for Elev9 to generate a first training plan.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text variant="title">Body metrics</Text>
            <Text style={styles.sectionSubtitle}>
              Use simple estimates if needed. You can refine these later.
            </Text>
          </View>

          <View style={styles.row}>
            <Input
              label="Height (cm)"
              keyboardType="number-pad"
              value={heightCm}
              onChangeText={setHeightCm}
              containerStyle={styles.halfField}
              errorMessage={validation.heightError}
            />
            <Input
              label="Weight (kg)"
              keyboardType="decimal-pad"
              value={weightKg}
              onChangeText={setWeightKg}
              containerStyle={styles.halfField}
              errorMessage={validation.weightError}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text variant="title">Goal</Text>
            <Text style={styles.sectionSubtitle}>
              Pick the outcome you want to prioritize first.
            </Text>
          </View>
          <View style={styles.optionsGroup}>
            {(
              ['gain_muscle', 'lose_weight', 'maintain'] as FitnessProfileGoal[]
            ).map((option) => (
              <Button
                key={option}
                label={formatLabel(option)}
                variant={goal === option ? 'primary' : 'secondary'}
                onPress={() => setGoal(option)}
                style={styles.optionButton}
              />
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text variant="title">Activity</Text>
            <Text style={styles.sectionSubtitle}>
              This helps balance your training volume and weekly structure.
            </Text>
          </View>
          <View style={styles.optionsGroup}>
            {(['low', 'medium', 'high'] as FitnessProfileActivityLevel[]).map(
              (option) => (
                <Button
                  key={option}
                  label={formatLabel(option)}
                  variant={activityLevel === option ? 'primary' : 'secondary'}
                  onPress={() => setActivityLevel(option)}
                  style={styles.optionButton}
                />
              ),
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text variant="title">Training availability</Text>
            <Text style={styles.sectionSubtitle}>
              Define how often and how long you can realistically train.
            </Text>
          </View>

          <View style={styles.row}>
            <Input
              label="Days / week"
              keyboardType="number-pad"
              value={daysPerWeek}
              onChangeText={setDaysPerWeek}
              containerStyle={styles.halfField}
              errorMessage={validation.daysError}
            />
            <Input
              label="Minutes / session"
              keyboardType="number-pad"
              value={minutesPerSession}
              onChangeText={setMinutesPerSession}
              containerStyle={styles.halfField}
              errorMessage={validation.minutesError}
            />
          </View>

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          <Button
            label="Continue"
            onPress={handleCreateFitnessProfile}
            loading={isSubmitting}
            disabled={!validation.isValid}
            style={styles.fullButton}
          />
        </Card>
      </View>
    </Screen>
  );
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  content: {
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
    gap: 16,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionSubtitle: {
    color: colors.mutedText,
  },
  optionsGroup: {
    gap: 10,
  },
  optionButton: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  error: {
    color: '#fca5a5',
  },
  fullButton: {
    width: '100%',
  },
});
