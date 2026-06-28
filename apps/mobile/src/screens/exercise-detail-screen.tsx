import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { TodayWorkout } from '@elev9/types';
import { Button, Text } from '@elev9/ui';

import type { RootStackParamList } from '../navigation/app-navigator';

type Exercise = TodayWorkout['exercises'][number];

type ExerciseDetailModel = {
  name: string;
  category: string;
  focus: string;
  instructions: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  mistakes: string[];
  tips: string[];
  alternatives: string[];
  accessibilityLabel: string;
};

const tokens = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  softBorder: '#eef2f7',
  surface: '#f8fafc',
  skeleton: '#e9eef5',
  skeletonSoft: '#f5f7fb',
} as const;

export function ExerciseDetailScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ExerciseDetail'>>();
  const { exercise, replacementContext, workoutContext } = route.params;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 180);

    return () => clearTimeout(timeout);
  }, []);

  const model = useMemo(
    () => buildExerciseDetailModel(exercise, workoutContext),
    [exercise, workoutContext],
  );

  const handleReturn = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleReplaceExercise = useCallback(() => {
    if (!replacementContext) {
      return;
    }

    navigation.navigate('ExerciseReplacement', replacementContext);
  }, [navigation, replacementContext]);

  if (isLoading) {
    return <ExerciseDetailSkeleton />;
  }

  if (!model) {
    return (
      <ExerciseDetailStateView
        title="Exercise information unavailable."
        message="Training guidance will appear here when available."
        actionLabel="Return to Workout"
        onAction={handleReturn}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          accessibilityLabel={model.accessibilityLabel}
          style={styles.stack}
        >
          <ExerciseHero model={model} />
          <MediaPlaceholder />
          {replacementContext ? (
            <Button
              accessibilityLabel={`Replace ${model.name}`}
              label="Replace Exercise"
              onPress={handleReplaceExercise}
              variant="ghost"
            />
          ) : null}
          <CoachFocus focus={model.focus} />
          <InstructionSection instructions={model.instructions} />
          <MusclesSection
            primaryMuscles={model.primaryMuscles}
            secondaryMuscles={model.secondaryMuscles}
          />
          <MistakesSection mistakes={model.mistakes} />
          <TipsSection tips={model.tips} />
          <AlternativesSection alternatives={model.alternatives} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ExerciseHero = memo(function ExerciseHero({
  model,
}: {
  model: ExerciseDetailModel;
}) {
  return (
    <View style={styles.hero}>
      <Text style={styles.category}>{model.category}</Text>
      <Text style={styles.title}>{model.name}</Text>
    </View>
  );
});

const MediaPlaceholder = memo(function MediaPlaceholder() {
  return (
    <View style={styles.media}>
      <Text style={styles.mediaTitle}>Exercise Media</Text>
      <Text style={styles.mediaText}>Coming Soon</Text>
    </View>
  );
});

const CoachFocus = memo(function CoachFocus({ focus }: { focus: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>TODAY&apos;S FOCUS</Text>
      <Text numberOfLines={2} style={styles.focusText}>
        {focus}
      </Text>
    </View>
  );
});

const InstructionSection = memo(function InstructionSection({
  instructions,
}: {
  instructions: string[];
}) {
  return (
    <Section label="HOW TO PERFORM">
      <View style={styles.list}>
        {instructions.map((instruction, index) => (
          <View key={instruction} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{instruction}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
});

const MusclesSection = memo(function MusclesSection({
  primaryMuscles,
  secondaryMuscles,
}: {
  primaryMuscles: string[];
  secondaryMuscles: string[];
}) {
  return (
    <Section label="TARGET MUSCLES">
      <MuscleGroup label="Primary" muscles={primaryMuscles} />
      <MuscleGroup label="Secondary" muscles={secondaryMuscles} />
    </Section>
  );
});

const MuscleGroup = memo(function MuscleGroup({
  label,
  muscles,
}: {
  label: string;
  muscles: string[];
}) {
  return (
    <View style={styles.muscleGroup}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {muscles.map((muscle) => (
          <View key={muscle} style={styles.chip}>
            <Text style={styles.chipText}>{muscle}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const MistakesSection = memo(function MistakesSection({
  mistakes,
}: {
  mistakes: string[];
}) {
  return (
    <Section label="AVOID THESE MISTAKES">
      <View style={styles.list}>
        {mistakes.slice(0, 3).map((mistake) => (
          <Text key={mistake} style={styles.bulletText}>
            {mistake}
          </Text>
        ))}
      </View>
    </Section>
  );
});

const TipsSection = memo(function TipsSection({ tips }: { tips: string[] }) {
  return (
    <Section label="COACH TIPS">
      <View style={styles.tipList}>
        {tips.map((tip) => (
          <View key={tip} style={styles.tipCard}>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
});

const AlternativesSection = memo(function AlternativesSection({
  alternatives,
}: {
  alternatives: string[];
}) {
  return (
    <Section label="ALTERNATIVES">
      <View style={styles.list}>
        {alternatives.map((alternative) => (
          <View key={alternative} style={styles.alternativeRow}>
            <Text style={styles.alternativeText}>{alternative}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
});

const Section = memo(function Section({
  children,
  label,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
});

function ExerciseDetailSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          accessibilityLabel="Loading exercise details"
          style={styles.stack}
        >
          <View style={styles.hero}>
            <View style={styles.skeletonCategory} />
            <View style={styles.skeletonTitle} />
          </View>
          <View style={styles.skeletonMedia} />
          <View style={styles.card}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonFocus} />
          </View>
          <View style={styles.card}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonShortLine} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExerciseDetailStateView({
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

function buildExerciseDetailModel(
  exercise: Exercise,
  workoutContext: RootStackParamList['ExerciseDetail']['workoutContext'],
): ExerciseDetailModel | null {
  if (!exercise?.name.trim()) {
    return null;
  }

  const profile = getExerciseProfile(exercise, workoutContext);
  const category = getExerciseCategory(workoutContext);

  return {
    name: exercise.name,
    category,
    focus: profile.focus,
    instructions: profile.instructions,
    primaryMuscles: profile.primaryMuscles,
    secondaryMuscles: profile.secondaryMuscles,
    mistakes: profile.mistakes,
    tips: profile.tips,
    alternatives: profile.alternatives,
    accessibilityLabel: `${exercise.name}. ${category} exercise. ${profile.focus}`,
  };
}

function getExerciseProfile(
  exercise: Exercise,
  workoutContext: RootStackParamList['ExerciseDetail']['workoutContext'],
) {
  const descriptor =
    `${exercise.name} ${workoutContext.focus} ${workoutContext.format}`
      .toLowerCase()
      .trim();

  if (descriptor.includes('squat')) {
    return {
      focus: 'Maintain core stability and use your full available range.',
      instructions: [
        'Set your feet at a comfortable shoulder-width stance.',
        'Brace your core and keep your chest tall.',
        'Lower under control while tracking knees over toes.',
        'Drive through the floor to stand with control.',
      ],
      primaryMuscles: ['Quadriceps', 'Glutes'],
      secondaryMuscles: ['Core', 'Hamstrings'],
      mistakes: [
        'Letting the knees collapse inward',
        'Cutting the range of motion short',
        'Losing tension at the bottom',
      ],
      tips: [
        'Breathe in before you lower.',
        'Keep pressure through the whole foot.',
      ],
      alternatives: ['Goblet Squat', 'Box Squat'],
    };
  }

  if (descriptor.includes('deadlift') || descriptor.includes('hinge')) {
    return {
      focus: 'Brace first, then move from the hips with control.',
      instructions: [
        'Stand with the load close to your body.',
        'Brace your core and soften your knees.',
        'Hinge at the hips while keeping your back long.',
        'Drive the hips through to finish tall.',
      ],
      primaryMuscles: ['Hamstrings', 'Glutes'],
      secondaryMuscles: ['Back', 'Core'],
      mistakes: [
        'Rounding the lower back',
        'Letting the load drift forward',
        'Rushing the lowering phase',
      ],
      tips: [
        'Keep the load close throughout.',
        'Move smoothly before adding speed.',
      ],
      alternatives: ['Romanian Deadlift', 'Hip Thrust'],
    };
  }

  if (descriptor.includes('press') || descriptor.includes('bench')) {
    return {
      focus: 'Control the lowering phase and finish each rep with intent.',
      instructions: [
        'Set your shoulders and create a stable base.',
        'Lower the weight under control.',
        'Pause briefly without losing tension.',
        'Press with a smooth, strong finish.',
      ],
      primaryMuscles: ['Chest', 'Shoulders'],
      secondaryMuscles: ['Triceps', 'Core'],
      mistakes: [
        'Bouncing through the bottom position',
        'Shrugging the shoulders',
        'Losing control of the tempo',
      ],
      tips: ['Exhale as you press.', 'Keep your shoulders stable.'],
      alternatives: ['Push-Up', 'Dumbbell Press'],
    };
  }

  if (
    descriptor.includes('pull') ||
    descriptor.includes('row') ||
    descriptor.includes('pulldown')
  ) {
    return {
      focus: 'Lead with your back and keep your shoulders controlled.',
      instructions: [
        'Start with a stable torso and relaxed neck.',
        'Initiate the pull by setting your shoulder blades.',
        'Pull through a controlled range of motion.',
        'Return slowly without losing posture.',
      ],
      primaryMuscles: ['Back', 'Lats'],
      secondaryMuscles: ['Biceps', 'Core'],
      mistakes: [
        'Using momentum to start the rep',
        'Shrugging toward the ears',
        'Cutting the pull short',
      ],
      tips: [
        'Think elbows, not hands.',
        'Pause briefly at the strongest position.',
      ],
      alternatives: ['Lat Pulldown', 'Assisted Pull-Up'],
    };
  }

  if (descriptor.includes('lunge') || descriptor.includes('split')) {
    return {
      focus: 'Stay tall and keep each rep balanced.',
      instructions: [
        'Set your stance before starting the rep.',
        'Lower under control with a tall posture.',
        'Keep the front foot grounded.',
        'Drive back to the start without rushing.',
      ],
      primaryMuscles: ['Quadriceps', 'Glutes'],
      secondaryMuscles: ['Hamstrings', 'Core'],
      mistakes: [
        'Letting balance dictate the tempo',
        'Pushing mostly through the toes',
        'Collapsing the torso forward',
      ],
      tips: [
        'Own the bottom position.',
        'Use a slower tempo if balance is difficult.',
      ],
      alternatives: ['Reverse Lunge', 'Step-Up'],
    };
  }

  if (
    descriptor.includes('plank') ||
    descriptor.includes('core') ||
    descriptor.includes('carry')
  ) {
    return {
      focus: 'Create full-body tension and breathe steadily.',
      instructions: [
        'Set your ribs and pelvis in a strong position.',
        'Brace gently without holding your breath.',
        'Keep the body line stable.',
        'Stop the set before your position breaks down.',
      ],
      primaryMuscles: ['Core'],
      secondaryMuscles: ['Shoulders', 'Glutes'],
      mistakes: [
        'Holding your breath',
        'Letting the hips sag',
        'Chasing time after form changes',
      ],
      tips: [
        'Quality matters more than duration.',
        'Keep breathing quiet and controlled.',
      ],
      alternatives: ['Dead Bug', 'Side Plank'],
    };
  }

  return {
    focus: 'Move with intention and keep every rep controlled.',
    instructions: [
      'Set your starting position before the first rep.',
      'Move through a smooth, controlled range.',
      'Keep tension where the movement feels strongest.',
      'Finish each rep before starting the next one.',
    ],
    primaryMuscles: ['Full Body'],
    secondaryMuscles: ['Core'],
    mistakes: [
      'Rushing the movement',
      'Using momentum',
      'Letting technique change across reps',
    ],
    tips: ['Choose quality over speed.', 'Keep your breathing steady.'],
    alternatives: ['Modified Variation', 'Bodyweight Variation'],
  };
}

function getExerciseCategory(
  workoutContext: RootStackParamList['ExerciseDetail']['workoutContext'],
): string {
  const descriptor =
    `${workoutContext.focus} ${workoutContext.format}`.toLowerCase();

  if (descriptor.includes('mobility')) {
    return 'Mobility';
  }

  if (descriptor.includes('recovery')) {
    return 'Recovery';
  }

  if (descriptor.includes('conditioning') || descriptor.includes('hiit')) {
    return 'Conditioning';
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
    paddingTop: 14,
    paddingBottom: 36,
  },
  stack: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 22,
  },
  hero: {
    gap: 8,
    paddingTop: 8,
  },
  category: {
    color: tokens.tertiaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: tokens.text,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
  },
  media: {
    minHeight: 178,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.surface,
    paddingHorizontal: 24,
  },
  mediaTitle: {
    color: tokens.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  mediaText: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
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
  label: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  focusText: {
    color: tokens.text,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '800',
  },
  list: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: tokens.surface,
  },
  stepNumberText: {
    color: tokens.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    color: tokens.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  muscleGroup: {
    gap: 9,
  },
  groupLabel: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipText: {
    color: tokens.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  bulletText: {
    color: tokens.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  tipList: {
    gap: 10,
  },
  tipCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  tipText: {
    color: tokens.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  alternativeRow: {
    borderTopWidth: 1,
    borderTopColor: tokens.softBorder,
    paddingTop: 12,
  },
  alternativeText: {
    color: tokens.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
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
  skeletonCategory: {
    width: 104,
    height: 14,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonTitle: {
    width: '76%',
    height: 42,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonMedia: {
    height: 178,
    borderRadius: 30,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonLabel: {
    width: 124,
    height: 13,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonFocus: {
    width: '90%',
    height: 28,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonLine: {
    width: '100%',
    height: 18,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonShortLine: {
    width: '64%',
    height: 18,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
});
