import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { TodayWorkout } from '@elev9/types';
import { Button, Text } from '@elev9/ui';

import type { RootStackParamList } from '../navigation/app-navigator';

type Exercise = TodayWorkout['exercises'][number];
type ReplacementReason =
  | 'no_equipment'
  | 'too_difficult'
  | 'too_easy'
  | 'discomfort'
  | 'preference';

type Alternative = {
  exercise: Exercise;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  equipment: string;
  muscleMatch: number;
  explanation: string;
};

const REASONS: Array<{
  value: ReplacementReason;
  label: string;
  description: string;
}> = [
  {
    value: 'no_equipment',
    label: 'No Equipment',
    description: 'The setup or machine is not available.',
  },
  {
    value: 'too_difficult',
    label: 'Too Difficult',
    description: 'Scale the movement while keeping the intent.',
  },
  {
    value: 'too_easy',
    label: 'Too Easy',
    description: 'Choose a more useful challenge today.',
  },
  {
    value: 'discomfort',
    label: 'Discomfort',
    description: 'Adapt around pain or irritation.',
  },
  {
    value: 'preference',
    label: 'Preference',
    description: 'Use a better fit for this session.',
  },
];

const tokens = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  selectedBorder: '#111827',
  softBorder: '#eef2f7',
  surface: '#f8fafc',
  skeleton: '#e9eef5',
  skeletonSoft: '#f5f7fb',
} as const;

export function ExerciseReplacementScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'ExerciseReplacement'>>();
  const { exerciseIndex, progress, startedAt, trainingPlanId, workout } =
    route.params;
  const currentExercise = workout.exercises[exerciseIndex];
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedReason, setSelectedReason] =
    useState<ReplacementReason | null>(null);
  const [selectedAlternativeName, setSelectedAlternativeName] = useState<
    string | null
  >(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHasError(!currentExercise);
      setIsLoading(false);
    }, 180);

    return () => clearTimeout(timeout);
  }, [currentExercise]);

  const alternatives = useMemo(() => {
    if (!currentExercise || !selectedReason) {
      return [];
    }

    return buildReplacementAlternatives({
      exercise: currentExercise,
      reason: selectedReason,
      workout,
    });
  }, [currentExercise, selectedReason, workout]);

  const selectedAlternative = useMemo(
    () =>
      alternatives.find(
        (alternative) => alternative.exercise.name === selectedAlternativeName,
      ) ??
      alternatives[0] ??
      null,
    [alternatives, selectedAlternativeName],
  );

  useEffect(() => {
    setSelectedAlternativeName(null);
  }, [selectedReason]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);

    setTimeout(() => {
      setHasError(!currentExercise);
      setIsLoading(false);
    }, 180);
  }, [currentExercise]);

  const handleKeepOriginal = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(() => {
    if (!selectedAlternative) {
      return;
    }

    const updatedWorkout: TodayWorkout = {
      ...workout,
      exercises: workout.exercises.map((exercise, index) =>
        index === exerciseIndex ? selectedAlternative.exercise : exercise,
      ),
    };
    const updatedProgress = progress.map((item, index) =>
      index === exerciseIndex
        ? {
            completedSets: Array.from(
              { length: selectedAlternative.exercise.sets },
              () => false,
            ),
          }
        : item,
    );

    navigation.navigate('ActiveWorkout', {
      trainingPlanId,
      workout: updatedWorkout,
      initialProgress: updatedProgress,
      replacementBanner: 'Workout updated successfully.',
      replacementToken: `${Date.now()}-${selectedAlternative.exercise.name}`,
      startedAt,
    });
  }, [
    exerciseIndex,
    navigation,
    progress,
    selectedAlternative,
    startedAt,
    trainingPlanId,
    workout,
  ]);

  if (isLoading) {
    return <ExerciseReplacementSkeleton />;
  }

  if (hasError || !currentExercise) {
    return (
      <ExerciseReplacementStateView
        title="Unable to load exercise alternatives."
        actionLabel="Try Again"
        onAction={handleRetry}
      />
    );
  }

  if (selectedReason && alternatives.length === 0) {
    return (
      <ExerciseReplacementStateView
        title="No replacement available."
        message="Continue with the original exercise."
        actionLabel="Return to Workout"
        onAction={handleKeepOriginal}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.stack}>
          <CurrentExerciseCard exercise={currentExercise} workout={workout} />
          <ReasonSelector
            selectedReason={selectedReason}
            onSelectReason={setSelectedReason}
          />
          {selectedReason ? (
            <>
              <AlternativesList
                alternatives={alternatives}
                selectedAlternative={selectedAlternative}
                onSelectAlternative={setSelectedAlternativeName}
              />
              <CoachExplanation alternative={selectedAlternative} />
            </>
          ) : null}
          <View style={styles.actions}>
            <Button
              accessibilityLabel="Use this exercise"
              disabled={!selectedAlternative}
              label="Use This Exercise"
              onPress={handleConfirm}
            />
            <Button
              accessibilityLabel="Keep original exercise"
              label="Keep Original Exercise"
              onPress={handleKeepOriginal}
              variant="ghost"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CurrentExerciseCard = memo(function CurrentExerciseCard({
  exercise,
  workout,
}: {
  exercise: Exercise;
  workout: TodayWorkout;
}) {
  return (
    <View
      accessibilityLabel={`Current exercise. ${exercise.name}. ${exercise.sets} sets. ${exercise.reps} reps.`}
      style={styles.heroCard}
    >
      <Text style={styles.eyebrow}>CURRENT EXERCISE</Text>
      <Text style={styles.heroTitle}>{exercise.name}</Text>
      <View style={styles.metaRow}>
        <MetaPill label={`${exercise.sets} sets`} />
        <MetaPill label={`${exercise.reps} reps`} />
        <MetaPill label={getCategory(workout)} />
      </View>
    </View>
  );
});

const MetaPill = memo(function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
});

const ReasonSelector = memo(function ReasonSelector({
  onSelectReason,
  selectedReason,
}: {
  selectedReason: ReplacementReason | null;
  onSelectReason: (reason: ReplacementReason) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>WHY REPLACE?</Text>
      <View style={styles.reasonGrid}>
        {REASONS.map((reason) => {
          const isSelected = selectedReason === reason.value;

          return (
            <Pressable
              accessibilityLabel={`${reason.label}. ${reason.description}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={reason.value}
              onPress={() => onSelectReason(reason.value)}
              style={[
                styles.reasonCard,
                isSelected ? styles.reasonCardSelected : null,
              ]}
            >
              <Text style={styles.reasonTitle}>{reason.label}</Text>
              <Text style={styles.reasonDescription}>{reason.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const AlternativesList = memo(function AlternativesList({
  alternatives,
  onSelectAlternative,
  selectedAlternative,
}: {
  alternatives: Alternative[];
  selectedAlternative: Alternative | null;
  onSelectAlternative: (name: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>RECOMMENDED ALTERNATIVES</Text>
      <View style={styles.alternativeList}>
        {alternatives.map((alternative) => {
          const isSelected =
            alternative.exercise.name === selectedAlternative?.exercise.name;

          return (
            <Pressable
              accessibilityLabel={`${alternative.exercise.name}. ${alternative.muscleMatch} percent muscle match. ${alternative.difficulty} difficulty.`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={alternative.exercise.name}
              onPress={() => onSelectAlternative(alternative.exercise.name)}
              style={[
                styles.alternativeCard,
                isSelected ? styles.alternativeCardSelected : null,
              ]}
            >
              <View style={styles.alternativeHeader}>
                <Text style={styles.alternativeTitle}>
                  {alternative.exercise.name}
                </Text>
                <Text style={styles.matchText}>{alternative.muscleMatch}%</Text>
              </View>
              <Text style={styles.alternativeMeta}>
                Difficulty: {alternative.difficulty}
              </Text>
              <Text style={styles.alternativeMeta}>
                Equipment: {alternative.equipment}
              </Text>
              <Text style={styles.alternativeMeta}>
                Muscle Match: {alternative.muscleMatch}%
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const CoachExplanation = memo(function CoachExplanation({
  alternative,
}: {
  alternative: Alternative | null;
}) {
  if (!alternative) {
    return null;
  }

  return (
    <View style={styles.coachCard}>
      <Text style={styles.sectionLabel}>COACH EXPLANATION</Text>
      <Text style={styles.coachText}>{alternative.explanation}</Text>
    </View>
  );
});

function ExerciseReplacementSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading exercise alternatives"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCoach} />
      </View>
    </SafeAreaView>
  );
}

function ExerciseReplacementStateView({
  actionLabel,
  message,
  onAction,
  title,
}: {
  title: string;
  message?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel={`${title} ${message ?? ''}`}
        style={styles.state}
      >
        <Text style={styles.stateTitle}>{title}</Text>
        {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
        <Button
          label={actionLabel}
          onPress={onAction}
          style={styles.stateButton}
        />
      </View>
    </SafeAreaView>
  );
}

function buildReplacementAlternatives({
  exercise,
  reason,
  workout,
}: {
  exercise: Exercise;
  reason: ReplacementReason;
  workout: TodayWorkout;
}): Alternative[] {
  return getAlternativeTemplates(exercise, workout)
    .map((alternative) => ({
      ...alternative,
      muscleMatch: scoreAlternative(alternative, reason),
      explanation: getCoachExplanation(alternative, reason),
    }))
    .sort((a, b) => b.muscleMatch - a.muscleMatch)
    .slice(0, 3);
}

function getAlternativeTemplates(
  exercise: Exercise,
  workout: TodayWorkout,
): Omit<Alternative, 'muscleMatch' | 'explanation'>[] {
  const descriptor = `${exercise.name} ${workout.focus} ${workout.format}`
    .toLowerCase()
    .trim();

  if (descriptor.includes('pull') || descriptor.includes('row')) {
    return [
      template('Lat Pulldown', exercise, 'Moderate', 'Cable Machine'),
      template('Assisted Pull Up', exercise, 'Easy', 'Assisted Machine'),
      template(
        'Resistance Band Pull Down',
        exercise,
        'Easy',
        'Resistance Band',
      ),
    ];
  }

  if (descriptor.includes('burpee')) {
    return [
      template('Mountain Climbers', exercise, 'Moderate', 'Bodyweight'),
      template('Squat Thrust', exercise, 'Moderate', 'Bodyweight'),
      template('Step Back Burpee', exercise, 'Easy', 'Bodyweight'),
    ];
  }

  if (descriptor.includes('squat')) {
    return [
      template('Goblet Squat', exercise, 'Moderate', 'Dumbbell'),
      template('Box Squat', exercise, 'Easy', 'Box'),
      template('Split Squat', exercise, 'Moderate', 'Bodyweight'),
    ];
  }

  if (descriptor.includes('press') || descriptor.includes('bench')) {
    return [
      template('Push Up', exercise, 'Moderate', 'Bodyweight'),
      template('Dumbbell Press', exercise, 'Moderate', 'Dumbbells'),
      template('Machine Chest Press', exercise, 'Easy', 'Machine'),
    ];
  }

  if (descriptor.includes('deadlift') || descriptor.includes('hinge')) {
    return [
      template('Romanian Deadlift', exercise, 'Moderate', 'Dumbbells'),
      template('Hip Thrust', exercise, 'Moderate', 'Bench'),
      template('Glute Bridge', exercise, 'Easy', 'Bodyweight'),
    ];
  }

  return [
    template('Modified Variation', exercise, 'Easy', 'Bodyweight'),
    template('Dumbbell Variation', exercise, 'Moderate', 'Dumbbells'),
    template('Machine Variation', exercise, 'Moderate', 'Machine'),
  ];
}

function template(
  name: string,
  source: Exercise,
  difficulty: Alternative['difficulty'],
  equipment: string,
): Omit<Alternative, 'muscleMatch' | 'explanation'> {
  return {
    exercise: {
      ...source,
      name,
    },
    difficulty,
    equipment,
  };
}

function scoreAlternative(
  alternative: Omit<Alternative, 'muscleMatch' | 'explanation'>,
  reason: ReplacementReason,
): number {
  let score = 88;

  if (reason === 'no_equipment' && alternative.equipment === 'Bodyweight') {
    score += 8;
  }

  if (reason === 'too_difficult' && alternative.difficulty === 'Easy') {
    score += 7;
  }

  if (reason === 'too_easy' && alternative.difficulty === 'Hard') {
    score += 7;
  }

  if (reason === 'discomfort' && alternative.difficulty !== 'Hard') {
    score += 6;
  }

  if (reason === 'preference' && alternative.difficulty === 'Moderate') {
    score += 5;
  }

  return Math.min(98, score);
}

function getCoachExplanation(
  alternative: Omit<Alternative, 'muscleMatch' | 'explanation'>,
  reason: ReplacementReason,
): string {
  if (reason === 'discomfort') {
    return `This replacement keeps the training intent while giving you a more controlled option today.`;
  }

  if (reason === 'no_equipment') {
    return `This option matches the same movement pattern with equipment that is easier to access.`;
  }

  if (reason === 'too_difficult') {
    return `This replacement targets similar muscles while reducing complexity so you can keep moving well.`;
  }

  if (reason === 'too_easy') {
    return `This option keeps the same focus and should create a more useful training stimulus.`;
  }

  return `${alternative.exercise.name} keeps today's training goal intact while fitting your preference.`;
}

function getCategory(workout: TodayWorkout): string {
  const descriptor = `${workout.focus} ${workout.format}`.toLowerCase();

  if (descriptor.includes('mobility')) {
    return 'Mobility';
  }

  if (descriptor.includes('conditioning') || descriptor.includes('hiit')) {
    return 'Conditioning';
  }

  if (descriptor.includes('recovery')) {
    return 'Recovery';
  }

  return 'Strength';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  stack: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 22,
  },
  heroCard: {
    gap: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  eyebrow: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: tokens.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillText: {
    color: tokens.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  card: {
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  sectionLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  reasonGrid: {
    gap: 10,
  },
  reasonCard: {
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  reasonCardSelected: {
    borderColor: tokens.selectedBorder,
    backgroundColor: tokens.card,
  },
  reasonTitle: {
    color: tokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  reasonDescription: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  alternativeList: {
    gap: 11,
  },
  alternativeCard: {
    gap: 7,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  alternativeCardSelected: {
    borderColor: tokens.selectedBorder,
    backgroundColor: tokens.card,
  },
  alternativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  alternativeTitle: {
    flex: 1,
    color: tokens.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  matchText: {
    color: tokens.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
  },
  alternativeMeta: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  coachCard: {
    gap: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  coachText: {
    color: tokens.text,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '800',
  },
  actions: {
    gap: 12,
  },
  state: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: tokens.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateMessage: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  stateButton: {
    marginTop: 6,
  },
  skeletonContent: {
    flex: 1,
    gap: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  skeletonHero: {
    height: 144,
    borderRadius: 30,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonCard: {
    height: 178,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonCoach: {
    height: 112,
    borderRadius: 30,
    backgroundColor: tokens.skeletonSoft,
  },
});
