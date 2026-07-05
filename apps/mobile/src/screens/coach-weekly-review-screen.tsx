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
  CoachSection,
} from '../components/coach';
import type {
  CoachWeeklyReviewModel,
  WeeklyReviewAction,
  WeeklyReviewFocus,
  WeeklyReviewOpportunity,
  WeeklyReviewTrend,
  WeeklyReviewWin,
} from '../hooks/use-coach-weekly-review';
import {
  trackCoachWeeklyReviewEvent,
  useCoachWeeklyReview,
} from '../hooks/use-coach-weekly-review';
import type { RootStackParamList } from '../navigation/app-navigator';

const weeklyTokens = {
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

type ReviewSection =
  | { id: 'summary'; type: 'summary'; model: CoachWeeklyReviewModel }
  | { id: 'wins'; type: 'wins'; wins: WeeklyReviewWin[] }
  | {
      id: 'opportunities';
      type: 'opportunities';
      opportunities: WeeklyReviewOpportunity[];
    }
  | { id: 'trends'; type: 'trends'; trends: WeeklyReviewTrend[] }
  | { id: 'reflection'; type: 'reflection'; model: CoachWeeklyReviewModel }
  | { id: 'focus'; type: 'focus'; focus: WeeklyReviewFocus }
  | { id: 'actions'; type: 'actions'; actions: WeeklyReviewAction[] };

export function CoachWeeklyReviewScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const weeklyReview = useCoachWeeklyReview();
  const refreshWeeklyReview = weeklyReview.refresh;

  useFocusEffect(
    useCallback(() => {
      trackCoachWeeklyReviewEvent('coach_weekly_review_opened');
      void refreshWeeklyReview();
    }, [refreshWeeklyReview]),
  );

  const handleTarget = useCallback(
    (target: WeeklyReviewAction['target'] | WeeklyReviewFocus['target']) => {
      switch (target) {
        case 'training':
          if (weeklyReview.trainingPlanId && weeklyReview.todaysWorkout) {
            navigation.navigate('WorkoutOverview', {
              trainingPlanId: weeklyReview.trainingPlanId,
              workout: weeklyReview.todaysWorkout,
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
        case 'goals':
          navigation.navigate('CoachGoalGuidance');
          return;
        case 'notifications':
          navigation.navigate('CoachNotifications');
          return;
        case 'dashboard':
          navigation.navigate('MainTabs', { initialTab: 'home' });
          return;
      }
    },
    [navigation, weeklyReview.todaysWorkout, weeklyReview.trainingPlanId],
  );

  const handleFocus = useCallback(
    (focus: WeeklyReviewFocus) => {
      trackCoachWeeklyReviewEvent('coach_next_week_focus_selected', {
        focus: focus.title,
      });
      handleTarget(focus.target);
    },
    [handleTarget],
  );

  const handleAction = useCallback(
    (action: WeeklyReviewAction) => {
      if (!action.isEnabled) {
        return;
      }

      trackCoachWeeklyReviewEvent('coach_weekly_review_cta_selected', {
        action: action.id,
      });
      handleTarget(action.target);
    },
    [handleTarget],
  );

  const renderSection = useCallback(
    ({ item }: { item: ReviewSection }) => {
      switch (item.type) {
        case 'summary':
          return <WeekSummary model={item.model} />;
        case 'wins':
          return <Wins wins={item.wins} />;
        case 'opportunities':
          return <Opportunities opportunities={item.opportunities} />;
        case 'trends':
          return <BehavioralTrends trends={item.trends} />;
        case 'reflection':
          return <CoachReflection model={item.model} />;
        case 'focus':
          return <NextWeekFocus focus={item.focus} onPress={handleFocus} />;
        case 'actions':
          return (
            <QuickActions actions={item.actions} onAction={handleAction} />
          );
      }
    },
    [handleAction, handleFocus],
  );

  const keyExtractor = useCallback((item: ReviewSection) => item.id, []);

  if (weeklyReview.isLoading) {
    return <WeeklyReviewSkeleton />;
  }

  if (weeklyReview.errorMessage && !weeklyReview.model) {
    return (
      <WeeklyReviewState
        buttonLabel="Retry"
        message="Unable to prepare your weekly review."
        onPress={() => void weeklyReview.refresh()}
      />
    );
  }

  if (weeklyReview.isEmpty || !weeklyReview.model) {
    return (
      <WeeklyReviewState
        buttonLabel="Return to Dashboard"
        message="Your first weekly review will appear after you've completed more activities."
        onPress={() => navigation.navigate('MainTabs', { initialTab: 'home' })}
        secondaryText="Keep training, logging meals and checking in with your coach."
      />
    );
  }

  const sections = buildSections(weeklyReview.model);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={sections}
        keyExtractor={keyExtractor}
        renderItem={renderSection}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={weeklyReview.isRefreshing}
            onRefresh={() => void weeklyReview.refresh()}
            tintColor={weeklyTokens.accent}
          />
        }
        ListHeaderComponent={<WeeklyHero model={weeklyReview.model} />}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function buildSections(model: CoachWeeklyReviewModel): ReviewSection[] {
  return [
    { id: 'summary', type: 'summary', model },
    { id: 'wins', type: 'wins', wins: model.wins },
    {
      id: 'opportunities',
      type: 'opportunities',
      opportunities: model.opportunities,
    },
    { id: 'trends', type: 'trends', trends: model.trends },
    { id: 'reflection', type: 'reflection', model },
    { id: 'focus', type: 'focus', focus: model.nextFocus },
    { id: 'actions', type: 'actions', actions: model.quickActions },
  ];
}

const WeeklyHero = memo(function WeeklyHero({
  model,
}: {
  model: CoachWeeklyReviewModel;
}) {
  return (
    <CoachHeroCard
      accessibilityLabel={model.accessibilityLabel}
      containerStyle={styles.hero}
      iconColor={weeklyTokens.text}
      iconContainerStyle={styles.heroIcon}
      iconName="calendar-outline"
      subtitle={model.subtitle}
      subtitleTextProps={{ maxFontSizeMultiplier: 1.35 }}
      subtitleStyle={styles.heroSubtitle}
      title="Your Week"
      titleTextProps={{ maxFontSizeMultiplier: 1.25 }}
      titleStyle={styles.heroTitle}
    />
  );
});

const WeekSummary = memo(function WeekSummary({
  model,
}: {
  model: CoachWeeklyReviewModel;
}) {
  return (
    <CoachSection title="Week Summary" style={styles.section}>
      <View
        accessibilityLabel={`Week summary. ${model.weekSummary}`}
        style={styles.summaryCard}
      >
        <Text
          maxFontSizeMultiplier={1.35}
          numberOfLines={3}
          style={styles.summaryText}
        >
          {model.weekSummary}
        </Text>
      </View>
    </CoachSection>
  );
});

const Wins = memo(function Wins({ wins }: { wins: WeeklyReviewWin[] }) {
  return (
    <CoachSection title="Wins" style={styles.section}>
      <View style={styles.stack}>
        {wins.map((win) => (
          <Pressable
            accessibilityLabel={`Weekly win. ${win.title}. ${win.detail}`}
            accessibilityRole="button"
            key={win.id}
            onPress={() =>
              trackCoachWeeklyReviewEvent('coach_weekly_win_opened', {
                win: win.id,
              })
            }
            style={({ pressed }) => [
              styles.winCard,
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={weeklyTokens.green}
            />
            <View style={styles.cardCopy}>
              <Text maxFontSizeMultiplier={1.25} style={styles.cardTitle}>
                {win.title}
              </Text>
              <Text maxFontSizeMultiplier={1.35} style={styles.cardDetail}>
                {win.detail}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </CoachSection>
  );
});

const Opportunities = memo(function Opportunities({
  opportunities,
}: {
  opportunities: WeeklyReviewOpportunity[];
}) {
  return (
    <CoachSection title="Opportunities" style={styles.section}>
      <View style={styles.stack}>
        {opportunities.map((opportunity) => (
          <View
            accessibilityLabel={`Opportunity. ${opportunity.title}. ${opportunity.detail}`}
            key={opportunity.id}
            style={styles.opportunityCard}
          >
            <Ionicons
              name="leaf-outline"
              size={20}
              color={weeklyTokens.amber}
            />
            <View style={styles.cardCopy}>
              <Text maxFontSizeMultiplier={1.25} style={styles.cardTitle}>
                {opportunity.title}
              </Text>
              <Text maxFontSizeMultiplier={1.35} style={styles.cardDetail}>
                {opportunity.detail}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </CoachSection>
  );
});

const BehavioralTrends = memo(function BehavioralTrends({
  trends,
}: {
  trends: WeeklyReviewTrend[];
}) {
  if (trends.length === 0) {
    return null;
  }

  return (
    <CoachSection title="Behavioral Trends" style={styles.section}>
      <View style={styles.stack}>
        {trends.map((trend) => (
          <View
            accessibilityLabel={`Behavioral trend. ${trend.pattern}. ${trend.explanation}. ${trend.whyItMatters}`}
            key={trend.id}
            style={styles.trendCard}
          >
            <Text maxFontSizeMultiplier={1.25} style={styles.trendPattern}>
              {trend.pattern}
            </Text>
            <Text maxFontSizeMultiplier={1.35} style={styles.trendExplanation}>
              {trend.explanation}
            </Text>
            <View style={styles.whyRow}>
              <Ionicons
                name="sparkles"
                size={16}
                color={weeklyTokens.secondaryText}
              />
              <Text style={styles.whyText}>{trend.whyItMatters}</Text>
            </View>
          </View>
        ))}
      </View>
    </CoachSection>
  );
});

const CoachReflection = memo(function CoachReflection({
  model,
}: {
  model: CoachWeeklyReviewModel;
}) {
  return (
    <CoachSection title="Coach Reflection" style={styles.section}>
      <View
        accessibilityLabel={`Coach reflection. ${model.reflection}`}
        style={styles.reflectionCard}
      >
        {model.reflection.split(/\n\n+/).map((paragraph) => (
          <Text
            key={paragraph}
            maxFontSizeMultiplier={1.35}
            style={styles.reflectionText}
          >
            {paragraph}
          </Text>
        ))}
      </View>
    </CoachSection>
  );
});

const NextWeekFocus = memo(function NextWeekFocus({
  focus,
  onPress,
}: {
  focus: WeeklyReviewFocus;
  onPress: (focus: WeeklyReviewFocus) => void;
}) {
  return (
    <CoachSection title="Next Week Focus" style={styles.section}>
      <View
        accessibilityLabel={`Next week focus. ${focus.title}. ${focus.reason}`}
        style={styles.focusCard}
      >
        <Text maxFontSizeMultiplier={1.25} style={styles.focusTitle}>
          {focus.title}
        </Text>
        <Text maxFontSizeMultiplier={1.35} style={styles.focusReason}>
          {focus.reason}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => onPress(focus)}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>{focus.ctaLabel}</Text>
        </Pressable>
      </View>
    </CoachSection>
  );
});

const QuickActions = memo(function QuickActions({
  actions,
  onAction,
}: {
  actions: WeeklyReviewAction[];
  onAction: (action: WeeklyReviewAction) => void;
}) {
  return (
    <CoachSection title="Quick Actions" style={styles.section}>
      <CoachActionGrid
        actions={actions}
        actionStyle={styles.actionButton}
        containerStyle={styles.actionGridContainer}
        disabledActionStyle={styles.disabled}
        onAction={onAction}
        textStyle={styles.actionText}
      />
    </CoachSection>
  );
});

function WeeklyReviewSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonSummary} />
        {[0, 1, 2].map((item) => (
          <View key={item} style={styles.skeletonCard} />
        ))}
        <View style={styles.skeletonReflection} />
      </View>
    </SafeAreaView>
  );
}

function WeeklyReviewState({
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
    backgroundColor: weeklyTokens.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 22,
  },
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: weeklyTokens.border,
    backgroundColor: weeklyTokens.card,
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
    backgroundColor: weeklyTokens.surface,
  },
  heroTitle: {
    color: weeklyTokens.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: weeklyTokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: weeklyTokens.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: weeklyTokens.border,
    backgroundColor: weeklyTokens.surface,
    padding: 18,
  },
  summaryText: {
    color: weeklyTokens.text,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '800',
  },
  stack: {
    gap: 12,
  },
  winCard: {
    minHeight: 74,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: weeklyTokens.border,
    backgroundColor: weeklyTokens.card,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  opportunityCard: {
    minHeight: 74,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: weeklyTokens.border,
    backgroundColor: weeklyTokens.card,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: weeklyTokens.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  cardDetail: {
    color: weeklyTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  trendCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: weeklyTokens.border,
    backgroundColor: weeklyTokens.surface,
    padding: 18,
    gap: 8,
  },
  trendPattern: {
    color: weeklyTokens.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  trendExplanation: {
    color: weeklyTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 3,
  },
  whyText: {
    flex: 1,
    color: weeklyTokens.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  reflectionCard: {
    borderRadius: 24,
    backgroundColor: weeklyTokens.text,
    padding: 20,
    gap: 10,
  },
  reflectionText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  focusCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: weeklyTokens.border,
    backgroundColor: weeklyTokens.card,
    padding: 20,
    gap: 12,
  },
  focusTitle: {
    color: weeklyTokens.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  focusReason: {
    color: weeklyTokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: weeklyTokens.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
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
    borderColor: weeklyTokens.border,
    backgroundColor: weeklyTokens.card,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: weeklyTokens.text,
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
    color: weeklyTokens.text,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '800',
  },
  stateCopy: {
    color: weeklyTokens.secondaryText,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  stateButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: weeklyTokens.text,
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
  skeletonReflection: {
    height: 156,
    borderRadius: 24,
    backgroundColor: '#f5f7fb',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
