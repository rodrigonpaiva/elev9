import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TodayWorkout } from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

import { resolveWorkoutAvailabilityState } from '../../screens/workout-activation-helpers';

type TodaysWorkoutCardProps = {
  workout: TodayWorkout | null;
  isLoading: boolean;
  errorMessage?: string | null;
  recoveryStatus?: RecoveryStatus | null;
  onRetry: () => void;
  onStartWorkout: () => void;
  onViewPlan: () => void;
};

type BadgeVariant = 'primary' | 'muted' | 'danger';
type DifficultyLabel = 'Easy' | 'Moderate' | 'Hard';
export type RecoveryStatus = 'ready' | 'moderate' | 'recovery_needed';

const tokens = {
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  softBorder: '#f1f5f9',
  surface: '#f8fafc',
  skeleton: '#eef2f7',
  skeletonSoft: '#f7f9fc',
} as const;

export const TodaysWorkoutCard = memo(function TodaysWorkoutCard({
  errorMessage,
  isLoading,
  onRetry,
  onStartWorkout,
  onViewPlan,
  recoveryStatus,
  workout,
}: TodaysWorkoutCardProps) {
  const model = useMemo(() => {
    if (!workout) {
      return null;
    }

    return buildWorkoutCardModel(workout, recoveryStatus);
  }, [recoveryStatus, workout]);

  const availabilityState = resolveWorkoutAvailabilityState({
    errorMessage,
    hasWorkout: Boolean(model),
    isLoading,
  });

  if (availabilityState === 'loading') {
    return <TodaysWorkoutSkeleton />;
  }

  if (availabilityState === 'error') {
    return (
      <View accessibilityLabel="Workout unavailable." style={styles.card}>
        <View style={styles.errorContent}>
          <Text style={styles.label}>WORKOUT</Text>
          <Text style={styles.errorTitle}>Workout unavailable.</Text>
          <Button
            accessibilityLabel="Retry loading today's workout"
            label="Retry"
            onPress={onRetry}
            style={styles.primaryButton}
          />
        </View>
      </View>
    );
  }

  if (!model) {
    return (
      <View
        accessibilityLabel="No workout scheduled today. Your next training session will appear here."
        style={styles.card}
      >
        <View style={styles.emptyContent}>
          <Text style={styles.label}>WORKOUT</Text>
          <Text style={styles.emptyTitle}>No workout scheduled today.</Text>
          <Text style={styles.emptyMessage}>
            Your next training session will appear here.
          </Text>
          <Button
            accessibilityLabel="View training plan"
            label="View Training Plan"
            onPress={onViewPlan}
            style={styles.primaryButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View accessibilityLabel={model.accessibilityLabel} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>WORKOUT</Text>
        <Badge
          label={model.difficulty.label}
          variant={model.difficulty.badgeVariant}
          style={styles.difficultyBadge}
        />
      </View>

      <View style={styles.mainContent}>
        <Text style={styles.title}>{model.title}</Text>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={styles.metadataRow}
        >
          <Text style={styles.metadataValue}>{model.durationLabel}</Text>
          <View style={styles.metadataDivider} />
          <Text style={styles.metadataValue}>{model.exerciseLabel}</Text>
        </View>

        <Text numberOfLines={2} style={styles.description}>
          {model.description}
        </Text>
      </View>

      {model.recoveryMessage ? (
        <View style={styles.readinessBanner}>
          <Text style={styles.readinessText}>{model.recoveryMessage}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          accessibilityLabel={`Start workout. ${model.title}`}
          label="Start Workout"
          onPress={onStartWorkout}
          style={styles.primaryButton}
        />
        <Button
          accessibilityLabel="View training plan"
          label="View Plan"
          onPress={onViewPlan}
          variant="ghost"
          style={styles.textButton}
        />
      </View>
    </View>
  );
});

function TodaysWorkoutSkeleton() {
  return (
    <View accessibilityLabel="Loading today's workout" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.skeletonLabel} />
        <View style={styles.skeletonBadge} />
      </View>
      <View style={styles.mainContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonMetadata} />
        <View style={styles.skeletonDescription} />
        <View style={styles.skeletonDescriptionShort} />
      </View>
      <View style={styles.skeletonButton} />
    </View>
  );
}

function buildWorkoutCardModel(
  workout: TodayWorkout,
  recoveryStatus?: RecoveryStatus | null,
) {
  const difficulty = getDifficulty(workout.intensity);
  const exerciseCount = workout.exercises.length;
  const durationMinutes = getEstimatedDurationMinutes(exerciseCount);
  const durationLabel = `${durationMinutes} min`;
  const exerciseLabel = `${exerciseCount} ${
    exerciseCount === 1 ? 'exercise' : 'exercises'
  }`;
  const description = getDescription(workout);
  const recoveryMessage = getRecoveryMessage(recoveryStatus);

  return {
    title: workout.title,
    durationLabel,
    exerciseLabel,
    description,
    difficulty,
    recoveryMessage,
    accessibilityLabel: `Today's workout. ${workout.title}. Duration ${durationMinutes} minutes. ${exerciseCount} ${
      exerciseCount === 1 ? 'exercise' : 'exercises'
    }.`,
  };
}

function getDifficulty(intensity: TodayWorkout['intensity']): {
  label: DifficultyLabel;
  badgeVariant: BadgeVariant;
} {
  switch (intensity) {
    case 'high':
      return { label: 'Hard', badgeVariant: 'danger' };
    case 'moderate':
      return { label: 'Moderate', badgeVariant: 'muted' };
    case 'low':
    default:
      return { label: 'Easy', badgeVariant: 'primary' };
  }
}

function getEstimatedDurationMinutes(exerciseCount: number): number {
  return Math.max(20, exerciseCount * 12);
}

function getDescription(workout: TodayWorkout): string {
  if (workout.focus.trim().length > 0 && workout.format.trim().length > 0) {
    return `${workout.focus}. ${workout.format}.`;
  }

  if (workout.focus.trim().length > 0) {
    return workout.focus;
  }

  return 'A focused session selected for today.';
}

function getRecoveryMessage(
  recoveryStatus?: RecoveryStatus | null,
): string | null {
  switch (recoveryStatus) {
    case 'recovery_needed':
      return "Today's workout has been adjusted for recovery.";
    case 'moderate':
      return 'Moderate intensity recommended.';
    case 'ready':
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  card: {
    gap: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  headerRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  label: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  difficultyBadge: {
    flexShrink: 0,
  },
  mainContent: {
    gap: 12,
  },
  title: {
    color: tokens.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  metadataValue: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  metadataDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.border,
  },
  description: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
  },
  readinessBanner: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readinessText: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    width: '100%',
  },
  textButton: {
    width: '100%',
    borderColor: 'transparent',
    backgroundColor: tokens.card,
  },
  errorContent: {
    gap: 16,
  },
  errorTitle: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  emptyContent: {
    gap: 12,
  },
  emptyTitle: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  emptyMessage: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
  },
  skeletonLabel: {
    width: 72,
    height: 13,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonBadge: {
    width: 92,
    height: 30,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonTitle: {
    width: '76%',
    height: 30,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonMetadata: {
    width: '48%',
    height: 15,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonDescription: {
    width: '88%',
    height: 14,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonDescriptionShort: {
    width: '58%',
    height: 14,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: tokens.skeleton,
  },
});
