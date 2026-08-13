import { memo, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@elev9/ui';

import {
  CoachActionGrid,
  CoachCenteredState,
  CoachHeroCard,
  CoachEvidenceList,
  CoachPriorityBanner,
  CoachSection,
} from '../components/coach';
import type {
  CoachGoalGuidanceAction,
  CoachGoalGuidanceBarrierCard,
  CoachGoalGuidanceHelpingCard,
  CoachGoalGuidanceMilestone,
  CoachGoalGuidanceModel,
} from '../hooks/use-coach-goal-guidance';
import {
  trackCoachGoalGuidanceEvent,
  useCoachGoalGuidance,
} from '../hooks/use-coach-goal-guidance';
import type { RootStackParamList } from '../navigation/app-navigator';

const goalTokens = {
  background: '#ffffff',
  card: '#ffffff',
  surface: '#f8fafc',
  text: '#111827',
  secondaryText: '#5b6472',
  tertiaryText: '#8a94a6',
  border: '#e5e7eb',
  borderSoft: '#eef2f7',
  accent: '#111827',
  green: '#16a34a',
  amber: '#b45309',
} as const;

type GoalSection =
  | { id: 'summary'; type: 'summary'; model: CoachGoalGuidanceModel }
  | { id: 'helping'; type: 'helping'; helping: CoachGoalGuidanceHelpingCard[] }
  | {
      id: 'barriers';
      type: 'barriers';
      barriers: CoachGoalGuidanceBarrierCard[];
    }
  | { id: 'strategy'; type: 'strategy'; model: CoachGoalGuidanceModel }
  | { id: 'forecast'; type: 'forecast'; model: CoachGoalGuidanceModel }
  | { id: 'actions'; type: 'actions'; model: CoachGoalGuidanceModel };

export function CoachGoalGuidanceScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const guidance = useCoachGoalGuidance();
  const refreshGuidance = guidance.refresh;

  useFocusEffect(
    useCallback(() => {
      trackCoachGoalGuidanceEvent('coach_goal_guidance_opened');
      void refreshGuidance();
    }, [refreshGuidance]),
  );

  const handleAction = useCallback(
    (action: CoachGoalGuidanceAction) => {
      if (!action.isEnabled) {
        return;
      }

      trackCoachGoalGuidanceEvent('coach_goal_action_selected', {
        action: action.id,
      });

      switch (action.target) {
        case 'workout':
          if (guidance.trainingPlanId && guidance.workout) {
            navigation.navigate('WorkoutOverview', {
              trainingPlanId: guidance.trainingPlanId,
              workout: guidance.workout,
            });
            return;
          }

          navigation.navigate('MainTabs', { initialTab: 'workout' });
          return;
        case 'nutrition':
          navigation.navigate('NutritionOverview');
          return;
        case 'conversation':
          navigation.navigate('CoachChat');
          return;
        case 'weekly-review':
          navigation.navigate('CoachWeeklyReview');
          return;
        case 'dashboard':
          navigation.navigate('MainTabs', { initialTab: 'home' });
          return;
      }
    },
    [guidance.trainingPlanId, guidance.workout, navigation],
  );

  const handleMilestone = useCallback(
    (milestone: CoachGoalGuidanceMilestone) => {
      if (!milestone.isEnabled) {
        return;
      }

      trackCoachGoalGuidanceEvent('coach_goal_milestone_selected', {
        milestone: milestone.id,
      });

      switch (milestone.target) {
        case 'workout':
          navigation.navigate('MainTabs', { initialTab: 'workout' });
          return;
        case 'nutrition':
          navigation.navigate('NutritionOverview');
          return;
        case 'recovery':
          navigation.navigate('DailyCheckInHistory');
          return;
        case 'history':
          navigation.navigate('MainTabs', { initialTab: 'history' });
          return;
        case 'progress':
          navigation.navigate('MainTabs', { initialTab: 'progress' });
          return;
      }
    },
    [navigation],
  );

  const renderSection = useCallback(
    ({ item }: { item: GoalSection }) => {
      switch (item.type) {
        case 'summary':
          return <CurrentProgress model={item.model} />;
        case 'helping':
          return <HelpingCards helping={item.helping} />;
        case 'barriers':
          return <BarrierCards barriers={item.barriers} />;
        case 'strategy':
          return <CoachStrategy model={item.model} />;
        case 'forecast':
          return <Forecast model={item.model} />;
        case 'actions':
          return <QuickActions model={item.model} onAction={handleAction} />;
      }
    },
    [handleAction],
  );

  const keyExtractor = useCallback((item: GoalSection) => item.id, []);

  if (guidance.isLoading) {
    return <GoalGuidanceSkeleton />;
  }

  if (guidance.errorMessage && !guidance.model) {
    return (
      <GoalGuidanceState
        buttonLabel="Retry"
        message="Unable to prepare your goal guidance."
        onPress={() => void guidance.refresh()}
      />
    );
  }

  if (guidance.isEmpty || !guidance.model) {
    return (
      <GoalGuidanceState
        buttonLabel="Return to Dashboard"
        message="Your coach is preparing your goal strategy."
        onPress={() => navigation.navigate('MainTabs', { initialTab: 'home' })}
        secondaryText="Complete more activities to unlock personalized goal guidance."
      />
    );
  }

  const sections = buildSections(guidance.model);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={guidance.model.milestones}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MilestoneRow item={item} onPress={handleMilestone} />
        )}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={guidance.isRefreshing}
            onRefresh={() => void guidance.refresh()}
            tintColor={goalTokens.accent}
          />
        }
        ListHeaderComponent={
          <View
            accessibilityLabel={guidance.model.accessibilityLabel}
            style={styles.content}
          >
            <GoalHero model={guidance.model} />
            <GoalPriority model={guidance.model} />
            {sections.map((section) => renderSection({ item: section }))}
            <GoalEvidence model={guidance.model} />
            <SectionTitle title="Milestones" />
          </View>
        }
        ListFooterComponent={
          <GoalFooter model={guidance.model} onAction={handleAction} />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={80}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function buildSections(model: CoachGoalGuidanceModel): GoalSection[] {
  return [
    { id: 'summary', type: 'summary', model },
    { id: 'helping', type: 'helping', helping: model.helping },
    { id: 'barriers', type: 'barriers', barriers: model.barriers },
    { id: 'strategy', type: 'strategy', model },
    { id: 'forecast', type: 'forecast', model },
    { id: 'actions', type: 'actions', model },
  ];
}

const GoalHero = memo(function GoalHero({
  model,
}: {
  model: CoachGoalGuidanceModel;
}) {
  return (
    <CoachHeroCard
      accessibilityLabel={model.accessibilityLabel}
      containerStyle={styles.hero}
      iconColor={goalTokens.text}
      iconContainerStyle={styles.heroIcon}
      iconName="flag-outline"
      subtitle={model.subtitle}
      subtitleTextProps={{ maxFontSizeMultiplier: 1.35 }}
      subtitleStyle={styles.heroSubtitle}
      title={model.goalTitle}
      titleTextProps={{ maxFontSizeMultiplier: 1.25 }}
      titleStyle={styles.heroTitle}
    />
  );
});

const GoalPriority = memo(function GoalPriority({
  model,
}: {
  model: CoachGoalGuidanceModel;
}) {
  return (
    <CoachPriorityBanner
      confidenceLevel={model.confidenceLevel}
      detail={model.supportingEvidenceSummary || model.strategy}
      focus={model.focus}
      riskLevel={model.riskLevel}
      title={model.topRecommendation}
    />
  );
});

const GoalEvidence = memo(function GoalEvidence({
  model,
}: {
  model: CoachGoalGuidanceModel;
}) {
  return (
    <CoachSection title="Supporting Evidence" style={styles.section}>
      <CoachEvidenceList evidence={model.evidence} maxItems={3} />
    </CoachSection>
  );
});

const CurrentProgress = memo(function CurrentProgress({
  model,
}: {
  model: CoachGoalGuidanceModel;
}) {
  return (
    <CoachSection title="Current Progress" style={styles.section}>
      <View
        accessibilityLabel={`Current progress. ${model.currentProgress}`}
        style={styles.summaryCard}
      >
        <Text
          maxFontSizeMultiplier={1.35}
          numberOfLines={3}
          style={styles.summaryText}
        >
          {model.currentProgress}
        </Text>
      </View>
    </CoachSection>
  );
});

const HelpingCards = memo(function HelpingCards({
  helping,
}: {
  helping: CoachGoalGuidanceHelpingCard[];
}) {
  return (
    <CoachSection title="What's Helping" style={styles.section}>
      <View style={styles.stack}>
        {helping.map((item) => (
          <View
            accessibilityLabel={`${item.title}. ${item.detail}`}
            key={item.id}
            style={styles.helpingCard}
          >
            <Ionicons
              name="trending-up-outline"
              size={18}
              color={goalTokens.green}
            />
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDetail}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </CoachSection>
  );
});

const BarrierCards = memo(function BarrierCards({
  barriers,
}: {
  barriers: CoachGoalGuidanceBarrierCard[];
}) {
  return (
    <CoachSection title="What's Holding You Back" style={styles.section}>
      <View style={styles.stack}>
        {barriers.map((item) => (
          <View
            accessibilityLabel={`${item.title}. ${item.detail}`}
            key={item.id}
            style={styles.barrierCard}
          >
            <Ionicons
              name="warning-outline"
              size={18}
              color={goalTokens.amber}
            />
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDetail}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </CoachSection>
  );
});

const CoachStrategy = memo(function CoachStrategy({
  model,
}: {
  model: CoachGoalGuidanceModel;
}) {
  return (
    <CoachSection title="Coach Strategy" style={styles.section}>
      <View
        accessibilityLabel={`Coach strategy. ${model.strategy}`}
        style={styles.strategyCard}
      >
        {model.strategy.split(/\n+/).map((line) => (
          <Text
            key={line}
            maxFontSizeMultiplier={1.35}
            style={styles.strategyText}
          >
            {line}
          </Text>
        ))}
      </View>
    </CoachSection>
  );
});

const Forecast = memo(function Forecast({
  model,
}: {
  model: CoachGoalGuidanceModel;
}) {
  return (
    <CoachSection title="Forecast" style={styles.section}>
      <View
        accessibilityLabel={`Forecast. ${model.forecast}`}
        style={styles.forecastCard}
      >
        <Ionicons name="analytics-outline" size={18} color={goalTokens.text} />
        <Text maxFontSizeMultiplier={1.35} style={styles.forecastText}>
          {model.forecast}
        </Text>
      </View>
    </CoachSection>
  );
});

const MilestoneRow = memo(function MilestoneRow({
  item,
  onPress,
}: {
  item: CoachGoalGuidanceMilestone;
  onPress: (milestone: CoachGoalGuidanceMilestone) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${item.statusLabel}. ${item.title}. ${item.detail}`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.milestoneCard,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.milestoneStatus}>
        <Text style={styles.milestoneStatusText}>{item.statusLabel}</Text>
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDetail}>{item.detail}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={goalTokens.tertiaryText}
      />
    </Pressable>
  );
});

const GoalFooter = memo(function GoalFooter({
  model,
  onAction,
}: {
  model: CoachGoalGuidanceModel;
  onAction: (action: CoachGoalGuidanceAction) => void;
}) {
  return (
    <View style={styles.footer}>
      <CoachSection title="Quick Actions" style={styles.section}>
        <CoachActionGrid
          actions={model.quickActions}
          actionStyle={styles.actionButton}
          containerStyle={styles.actionGridContainer}
          disabledActionStyle={styles.disabled}
          onAction={onAction}
          textStyle={styles.actionText}
        />
      </CoachSection>
    </View>
  );
});

const SectionTitle = memo(function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
});

function GoalGuidanceSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonSummary} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonStrategy} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonMilestone} />
      </View>
    </SafeAreaView>
  );
}

function GoalGuidanceState({
  buttonLabel,
  message,
  onPress,
  secondaryText,
}: {
  buttonLabel: string;
  message: string;
  onPress: () => void;
  secondaryText?: string;
}) {
  return (
    <CoachCenteredState
      action={
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [
            styles.stateButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.stateButtonText}>{buttonLabel}</Text>
        </Pressable>
      }
      contentStyle={styles.stateContent}
      message={message}
      safeAreaStyle={styles.safeArea}
      secondaryText={secondaryText}
      secondaryTextProps={{ maxFontSizeMultiplier: 1.35 }}
      secondaryTextStyle={styles.stateCopy}
      titleStyle={styles.stateTitle}
      titleTextProps={{ maxFontSizeMultiplier: 1.25 }}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: goalTokens.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  content: {
    gap: 22,
  },
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: goalTokens.border,
    backgroundColor: goalTokens.card,
    padding: 22,
    gap: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: goalTokens.surface,
  },
  heroTitle: {
    color: goalTokens.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: goalTokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: goalTokens.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: goalTokens.border,
    backgroundColor: goalTokens.surface,
    padding: 18,
  },
  summaryText: {
    color: goalTokens.text,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '800',
  },
  stack: {
    gap: 12,
  },
  helpingCard: {
    minHeight: 74,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: goalTokens.border,
    backgroundColor: goalTokens.card,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  barrierCard: {
    minHeight: 74,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: goalTokens.border,
    backgroundColor: goalTokens.card,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: goalTokens.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  cardDetail: {
    color: goalTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  strategyCard: {
    borderRadius: 24,
    backgroundColor: goalTokens.text,
    padding: 20,
    gap: 10,
  },
  strategyText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  forecastCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: goalTokens.border,
    backgroundColor: goalTokens.surface,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  forecastText: {
    flex: 1,
    color: goalTokens.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  milestoneCard: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: goalTokens.border,
    backgroundColor: goalTokens.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestoneStatus: {
    minWidth: 78,
    borderRadius: 999,
    backgroundColor: goalTokens.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  milestoneStatusText: {
    color: goalTokens.text,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  footer: {
    paddingTop: 22,
  },
  actionGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: goalTokens.border,
    backgroundColor: goalTokens.card,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: goalTokens.text,
    fontSize: 13,
    fontWeight: '800',
  },
  stateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
  },
  stateTitle: {
    color: goalTokens.text,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '800',
  },
  stateCopy: {
    color: goalTokens.secondaryText,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  stateButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: goalTokens.text,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  skeletonContent: {
    padding: 20,
    gap: 14,
  },
  skeletonHero: {
    height: 170,
    borderRadius: 28,
    backgroundColor: '#eef2f7',
  },
  skeletonSummary: {
    height: 92,
    borderRadius: 22,
    backgroundColor: '#f5f7fb',
  },
  skeletonCard: {
    height: 76,
    borderRadius: 20,
    backgroundColor: '#eef2f7',
  },
  skeletonStrategy: {
    height: 156,
    borderRadius: 24,
    backgroundColor: '#f5f7fb',
  },
  skeletonMilestone: {
    height: 74,
    borderRadius: 20,
    backgroundColor: '#eef2f7',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
