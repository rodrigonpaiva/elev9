import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type { DashboardHomeResponse, TodayWorkout } from '@elev9/types';
import {
  Badge,
  Button,
  Card,
  colors,
  Screen,
  SectionHeader,
  Text,
} from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

export function CurrentWorkoutScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [dashboard, setDashboard] = useState<
    DashboardHomeResponse['dashboard'] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const load = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const response = await apiClient.dashboard.getHome();
      setDashboard(response.dashboard);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to load today’s workout.');
      }
    } finally {
      if (options?.refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!isLoading) {
      entrance.setValue(0);
      Animated.timing(entrance, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }).start();
    }
  }, [entrance, isLoading]);

  const trainingPlan = dashboard?.trainingPlan;
  const todayWorkout = trainingPlan?.todayWorkout;

  return (
    <Screen
      contentStyle={styles.content}
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={colors.primary}
          />
        ),
      }}
    >
      <Animated.View
        style={[
          styles.stack,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.hero}>
          <Badge variant="primary" label="Current Workout" />
          <Text variant="headline" style={styles.title}>
            Train with intention
          </Text>
          <Text style={styles.subtitle}>
            Focus on today’s session and log it when you’re done.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading workout...</Text>
          </View>
        ) : errorMessage ? (
          <Card style={styles.feedbackCard}>
            <Text variant="title">Workout unavailable</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button
              label="Retry"
              onPress={() => void load()}
              style={styles.fullButton}
            />
          </Card>
        ) : trainingPlan && todayWorkout ? (
          <>
            <Card style={styles.card}>
              <SectionHeader
                title={todayWorkout.title}
                subtitle={`${todayWorkout.focus} • ${todayWorkout.format}`}
                action={
                  <Badge label={todayWorkout.intensity} variant="muted" />
                }
              />
              <Text style={styles.bodyText}>
                {todayWorkout.exercises.length} exercises planned for today.
              </Text>
              <View style={styles.exerciseList}>
                {todayWorkout.exercises.map((exercise) => (
                  <View key={exercise.name} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.sets} sets • {exercise.reps} reps •{' '}
                      {exercise.restSeconds}s rest
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <Button
              label="Start Workout"
              onPress={() =>
                navigation.navigate('Workout', {
                  trainingPlanId: trainingPlan.id,
                  workout: todayWorkout as TodayWorkout,
                })
              }
              style={styles.fullButton}
            />
          </>
        ) : (
          <Card style={styles.feedbackCard}>
            <Text variant="title">No training today</Text>
            <Text style={styles.subtitle}>
              Your current plan does not include a session for today. Check back
              tomorrow or review your history.
            </Text>
            <Button
              label="Refresh"
              onPress={() => void load({ refresh: true })}
              variant="secondary"
              style={styles.fullButton}
            />
          </Card>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  stack: {
    gap: 18,
  },
  hero: {
    gap: 8,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.mutedText,
  },
  feedbackCard: {
    gap: 14,
  },
  errorText: {
    color: '#fca5a5',
  },
  card: {
    gap: 16,
  },
  bodyText: {
    color: colors.mutedText,
  },
  exerciseList: {
    gap: 10,
  },
  exerciseRow: {
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0b1220',
    padding: 14,
  },
  exerciseName: {
    color: colors.text,
    fontWeight: '700',
  },
  exerciseMeta: {
    color: colors.mutedText,
  },
  fullButton: {
    width: '100%',
  },
});
