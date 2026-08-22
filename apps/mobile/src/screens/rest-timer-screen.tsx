import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Text } from '@elev9/ui';

import type { RootStackParamList } from '../navigation/app-navigator';
import { getRestTimerRemaining } from '../storage/active-workout-session-helpers';
import { updateActiveWorkoutSession } from '../storage/active-workout-session-storage';
import { getSessionMode } from '../storage/session-mode-storage';
import { getSessionOwnerKey } from '../storage/session-owner-storage';

type HapticEvent = 'rest_start' | 'ten_seconds' | 'rest_complete';

const ADD_REST_SECONDS = 30;

const tokens = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  surface: '#f8fafc',
  skeleton: '#e9eef5',
  skeletonSoft: '#f5f7fb',
} as const;

async function clearPersistedTimer(): Promise<void> {
  const ownerKey = await getSessionOwnerKey();
  const mode = await getSessionMode();
  if (!ownerKey || !mode) return;

  await updateActiveWorkoutSession(ownerKey, mode, (current) => ({
    ...current,
    timer: null,
  }));
}

export function RestTimerScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RestTimer'>>();
  const {
    exerciseName,
    isWorkoutComplete,
    nextExerciseName,
    nextSetNumber,
    reps,
    restSeconds,
    totalSets,
    workoutSessionId,
  } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [targetEndAt, setTargetEndAt] = useState(
    () => Date.now() + restSeconds * 1000,
  );
  const [remainingSeconds, setRemainingSeconds] = useState(restSeconds);
  const tenSecondHapticFired = useRef(false);
  const completionHandled = useRef(false);
  const timerHydrationStarted = useRef(false);
  const timerHydrated = useRef(false);

  useEffect(() => {
    if (!workoutSessionId || timerHydrationStarted.current) return;
    timerHydrationStarted.current = true;

    void (async () => {
      try {
        const ownerKey = await getSessionOwnerKey();
        const mode = await getSessionMode();
        if (!ownerKey || !mode) return;

        const { loadActiveWorkoutSession } =
          await import('../storage/active-workout-session-storage');
        const snapshot = await loadActiveWorkoutSession(ownerKey, mode);
        const timer = snapshot?.timer;
        if (!timer || snapshot.workoutSessionId !== workoutSessionId) return;

        const remaining = getRestTimerRemaining(timer, Date.now());
        setIsPaused(timer.status === 'paused');
        setRemainingSeconds(remaining);
        setTargetEndAt(
          timer.status === 'running' && timer.targetEndAt !== null
            ? timer.targetEndAt
            : Date.now() + remaining * 1000,
        );
      } finally {
        timerHydrated.current = true;
      }
    })();
  }, [workoutSessionId]);

  useEffect(() => {
    if (!workoutSessionId || !timerHydrated.current) return;

    void (async () => {
      const ownerKey = await getSessionOwnerKey();
      const mode = await getSessionMode();
      if (!ownerKey || !mode) return;

      await updateActiveWorkoutSession(ownerKey, mode, (current) => ({
        ...current,
        timer: {
          exerciseName,
          nextExerciseName,
          nextSetNumber,
          totalSets,
          reps,
          restSeconds,
          isWorkoutComplete,
          targetEndAt: isPaused ? null : targetEndAt,
          remainingSeconds,
          status: isPaused ? 'paused' : 'running',
        },
      }));
    })();
  }, [
    exerciseName,
    isPaused,
    isWorkoutComplete,
    nextExerciseName,
    nextSetNumber,
    remainingSeconds,
    reps,
    restSeconds,
    targetEndAt,
    totalSets,
    workoutSessionId,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
      triggerHaptic('rest_start');
    }, 180);

    return () => clearTimeout(timeout);
  }, []);

  const completeRest = useCallback(() => {
    if (completionHandled.current) {
      return;
    }

    completionHandled.current = true;
    triggerHaptic('rest_complete');
    void clearPersistedTimer();
    navigation.goBack();
  }, [navigation]);

  const syncRemaining = useCallback(() => {
    if (isPaused) {
      return;
    }

    const nextRemaining = Math.max(
      0,
      Math.ceil((targetEndAt - Date.now()) / 1000),
    );

    setRemainingSeconds(nextRemaining);

    if (nextRemaining <= 10 && !tenSecondHapticFired.current) {
      tenSecondHapticFired.current = true;
      triggerHaptic('ten_seconds');
    }

    if (nextRemaining <= 0) {
      completeRest();
    }
  }, [completeRest, isPaused, targetEndAt]);

  useEffect(() => {
    syncRemaining();

    if (isPaused) {
      return undefined;
    }

    const interval = setInterval(syncRemaining, 1000);

    return () => clearInterval(interval);
  }, [isPaused, syncRemaining]);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') {
        syncRemaining();
      }
    }

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => subscription.remove();
  }, [syncRemaining]);

  const tip = useMemo(
    () => getCoachTip(exerciseName, nextExerciseName, nextSetNumber),
    [exerciseName, nextExerciseName, nextSetNumber],
  );
  const formattedTime = useMemo(
    () => formatTimer(remainingSeconds),
    [remainingSeconds],
  );
  const accessibilityLabel = useMemo(
    () =>
      isWorkoutComplete
        ? `Rest timer. ${remainingSeconds} seconds remaining. Up next: finish workout.`
        : `Rest timer. ${remainingSeconds} seconds remaining. Next set: ${nextExerciseName}, set ${nextSetNumber} of ${totalSets}.`,
    [
      isWorkoutComplete,
      nextExerciseName,
      nextSetNumber,
      remainingSeconds,
      totalSets,
    ],
  );

  const handleSkipRest = useCallback(() => {
    completeRest();
  }, [completeRest]);

  const handleAddRest = useCallback(() => {
    const addedMilliseconds = ADD_REST_SECONDS * 1000;
    tenSecondHapticFired.current = false;
    setRemainingSeconds((current) => current + ADD_REST_SECONDS);
    setTargetEndAt((current) =>
      isPaused
        ? Date.now() + (remainingSeconds + ADD_REST_SECONDS) * 1000
        : current + addedMilliseconds,
    );
  }, [isPaused, remainingSeconds]);

  const handleTogglePause = useCallback(() => {
    setIsPaused((current) => {
      if (current) {
        setTargetEndAt(Date.now() + remainingSeconds * 1000);
        return false;
      }

      return true;
    });
  }, [remainingSeconds]);

  if (isLoading) {
    return <RestTimerSkeleton />;
  }

  if (restSeconds <= 0) {
    return (
      <RestTimerStateView
        title="Unable to start rest timer."
        actionLabel="Return to Workout"
        onAction={handleSkipRest}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel={accessibilityLabel} style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.label}>RECOVERY</Text>
          <Pressable
            accessibilityLabel={
              isPaused ? 'Resume rest timer' : 'Pause rest timer'
            }
            accessibilityRole="button"
            hitSlop={10}
            onPress={handleTogglePause}
            style={styles.pauseButton}
          >
            <Text style={styles.pauseText}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.countdown}>{formattedTime}</Text>

        <CoachTipCard tip={tip} />

        <UpcomingSet
          isWorkoutComplete={isWorkoutComplete}
          nextExerciseName={nextExerciseName}
          nextSetNumber={nextSetNumber}
          reps={reps}
          totalSets={totalSets}
        />

        <View style={styles.actions}>
          <Button label="Skip Rest" onPress={handleSkipRest} />
          <Button
            label="Add 30 Seconds"
            onPress={handleAddRest}
            variant="ghost"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const CoachTipCard = memo(function CoachTipCard({ tip }: { tip: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>COACH TIP</Text>
      <Text style={styles.tipText}>{tip}</Text>
    </View>
  );
});

const UpcomingSet = memo(function UpcomingSet({
  isWorkoutComplete,
  nextExerciseName,
  nextSetNumber,
  reps,
  totalSets,
}: {
  isWorkoutComplete: boolean;
  nextExerciseName: string;
  nextSetNumber: number;
  totalSets: number;
  reps: string;
}) {
  return (
    <View style={styles.upcoming}>
      <Text style={styles.cardLabel}>
        {isWorkoutComplete ? 'UP NEXT' : 'NEXT SET'}
      </Text>
      <Text style={styles.upcomingTitle}>
        {isWorkoutComplete ? 'Finish workout' : nextExerciseName}
      </Text>
      {isWorkoutComplete ? (
        <Text style={styles.upcomingMeta}>Review and save your session.</Text>
      ) : (
        <Text style={styles.upcomingMeta}>
          Set {nextSetNumber} of {totalSets}
        </Text>
      )}
      {!isWorkoutComplete ? (
        <Text style={styles.upcomingReps}>{reps} reps</Text>
      ) : null}
    </View>
  );
});

function RestTimerSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel="Loading rest timer" style={styles.content}>
        <View style={styles.skeletonLabel} />
        <View style={styles.skeletonTimer} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonUpcoming} />
      </View>
    </SafeAreaView>
  );
}

function RestTimerStateView({
  actionLabel,
  onAction,
  title,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel={title} style={styles.content}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Button label={actionLabel} onPress={onAction} />
      </View>
    </SafeAreaView>
  );
}

function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(
    2,
    '0',
  )}`;
}

function getCoachTip(
  completedExerciseName: string,
  nextExerciseName: string,
  nextSetNumber: number,
): string {
  const descriptor =
    `${completedExerciseName} ${nextExerciseName}`.toLowerCase();
  const tips = [
    'Control your breathing.',
    'Stay focused on technique.',
    'Prepare for the next working set.',
    'Hydrate if needed.',
  ];

  if (descriptor.includes('press') || descriptor.includes('bench')) {
    tips.unshift('Keep your shoulders stable.');
  }

  if (descriptor.includes('squat') || descriptor.includes('deadlift')) {
    tips.unshift('Brace before the next rep.');
  }

  if (descriptor.includes('pull') || descriptor.includes('row')) {
    tips.unshift('Keep your shoulder blades controlled.');
  }

  return tips[nextSetNumber % tips.length];
}

function triggerHaptic(_event: HapticEvent) {
  // Extension point for expo-haptics or native haptic integration.
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 30,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  header: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  pauseButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  pauseText: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  countdown: {
    color: tokens.text,
    fontSize: 76,
    lineHeight: 84,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  card: {
    gap: 9,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  cardLabel: {
    color: tokens.tertiaryText,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  tipText: {
    color: tokens.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
  },
  upcoming: {
    gap: 7,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.surface,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  upcomingTitle: {
    color: tokens.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  upcomingMeta: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  upcomingReps: {
    color: tokens.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  actions: {
    gap: 12,
  },
  stateTitle: {
    color: tokens.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
  },
  skeletonLabel: {
    width: 92,
    height: 14,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonTimer: {
    width: '70%',
    height: 76,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonCard: {
    height: 112,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonUpcoming: {
    height: 132,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
});
