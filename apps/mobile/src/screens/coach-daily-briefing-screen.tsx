import { memo, useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@elev9/ui';

import {
  CoachCenteredState,
  CoachHeroCard,
  CoachEvidenceList,
  CoachPriorityBanner,
  CoachSection,
} from '../components/coach';
import type {
  CoachDailyBriefingModel,
  DailyBriefingPrimaryAction,
  DailyBriefingPriority,
  DailyBriefingReadinessItem,
  DailyBriefingScheduleItem,
} from '../hooks/use-coach-daily-briefing';
import {
  trackCoachDailyBriefingEvent,
  useCoachDailyBriefing,
} from '../hooks/use-coach-daily-briefing';
import type { RootStackParamList } from '../navigation/app-navigator';

const briefingTokens = {
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
} as const;

export function CoachDailyBriefingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const briefing = useCoachDailyBriefing();
  const refreshBriefing = briefing.refresh;

  useFocusEffect(
    useCallback(() => {
      trackCoachDailyBriefingEvent('coach_daily_briefing_opened');
      void refreshBriefing();
    }, [refreshBriefing]),
  );

  const handlePrimaryAction = useCallback(
    (action: DailyBriefingPrimaryAction) => {
      trackCoachDailyBriefingEvent('coach_daily_briefing_action_selected', {
        action: action.target,
      });

      switch (action.target) {
        case 'workout':
          if (briefing.trainingPlanId && briefing.workout) {
            navigation.navigate('WorkoutOverview', {
              trainingPlanId: briefing.trainingPlanId,
              workout: briefing.workout,
            });
            return;
          }

          navigation.navigate('MainTabs', { initialTab: 'workout' });
          return;
        case 'nutrition':
          navigation.navigate('NutritionOverview');
          return;
        case 'recovery':
          navigation.navigate('DailyCheckInHistory');
          return;
        case 'conversation':
          navigation.navigate('CoachChat');
          return;
      }
    },
    [briefing.trainingPlanId, briefing.workout, navigation],
  );

  if (briefing.isLoading) {
    return <DailyBriefingSkeleton />;
  }

  if (briefing.errorMessage && !briefing.model) {
    return (
      <BriefingState
        buttonLabel="Retry"
        message="Unable to prepare today's briefing."
        onPress={() => void briefing.refresh()}
      />
    );
  }

  if (briefing.isEmpty || !briefing.model) {
    return (
      <BriefingState
        buttonLabel="Go to Dashboard"
        message="Your coach is preparing today's briefing."
        onPress={() => navigation.navigate('MainTabs', { initialTab: 'home' })}
        secondaryText="Complete your first activities to unlock personalized coaching."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={briefing.isRefreshing}
            onRefresh={() => {
              trackCoachDailyBriefingEvent('coach_daily_briefing_refreshed');
              void briefing.refresh();
            }}
            tintColor={briefingTokens.accent}
          />
        }
      >
        <View
          accessibilityLabel={briefing.model.accessibilityLabel}
          style={styles.content}
        >
          <MorningGreeting model={briefing.model} />
          <SummaryHero model={briefing.model} />
          <PriorityBanner model={briefing.model} />
          <WhyButton onPress={() => navigation.navigate('CoachInsights')} />
          <NeedHelpButton onPress={() => navigation.navigate('AskCoach')} />
          <WeeklyReviewButton
            onPress={() => navigation.navigate('CoachWeeklyReview')}
          />
          <NotificationSettingsButton
            onPress={() => navigation.navigate('CoachNotifications')}
          />
          <CoachInterpretation model={briefing.model} />
          <Priorities priorities={briefing.model.priorities} />
          <ReadinessOverview items={briefing.model.readiness} />
          <EvidenceSection model={briefing.model} />
          {briefing.model.schedule.length > 0 ? (
            <TodaySchedule schedule={briefing.model.schedule} />
          ) : null}
          <Motivation message={briefing.model.motivation} />
          <PrimaryAction
            action={briefing.model.primaryAction}
            onPress={handlePrimaryAction}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const MorningGreeting = memo(function MorningGreeting({
  model,
}: {
  model: CoachDailyBriefingModel;
}) {
  return (
    <View style={styles.greeting}>
      <Text maxFontSizeMultiplier={1.3} style={styles.greetingTitle}>
        {model.greeting}
      </Text>
      <Text maxFontSizeMultiplier={1.4} style={styles.greetingSubtitle}>
        {model.subtitle}
      </Text>
    </View>
  );
});

const SummaryHero = memo(function SummaryHero({
  model,
}: {
  model: CoachDailyBriefingModel;
}) {
  return (
    <CoachHeroCard
      accessibilityLabel={`Today's summary. ${model.summary}. ${model.currentFocus}.`}
      containerStyle={styles.hero}
      iconColor={briefingTokens.text}
      iconContainerStyle={styles.heroIcon}
      iconName="sunny-outline"
      title={model.summary}
      titleTextProps={{ maxFontSizeMultiplier: 1.25, numberOfLines: 2 }}
      titleStyle={styles.heroText}
    />
  );
});

const PriorityBanner = memo(function PriorityBanner({
  model,
}: {
  model: CoachDailyBriefingModel;
}) {
  return (
    <CoachPriorityBanner
      confidenceLevel={model.confidenceLevel}
      detail={model.supportingEvidenceSummary || model.interpretation}
      focus={model.focus}
      riskLevel={model.riskLevel}
      title={model.topRecommendation}
    />
  );
});

const EvidenceSection = memo(function EvidenceSection({
  model,
}: {
  model: CoachDailyBriefingModel;
}) {
  return (
    <CoachSection title="Supporting Evidence" style={styles.section}>
      <CoachEvidenceList evidence={model.evidence} maxItems={3} />
    </CoachSection>
  );
});

const WhyButton = memo(function WhyButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="Why this recommendation"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.whyButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.whyButtonText}>Why?</Text>
    </Pressable>
  );
});

const NeedHelpButton = memo(function NeedHelpButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="Need help from your coach"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.whyButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.whyButtonText}>Need help?</Text>
    </Pressable>
  );
});

const WeeklyReviewButton = memo(function WeeklyReviewButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="See weekly review"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.whyButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.whyButtonText}>See Weekly Review</Text>
    </Pressable>
  );
});

const NotificationSettingsButton = memo(function NotificationSettingsButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="Notification settings"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.secondaryButtonText}>Notification Settings</Text>
    </Pressable>
  );
});

const CoachInterpretation = memo(function CoachInterpretation({
  model,
}: {
  model: CoachDailyBriefingModel;
}) {
  return (
    <CoachSection title="Coach Interpretation" style={styles.section}>
      <View
        accessibilityLabel={`Coach interpretation. ${model.interpretation}`}
        style={styles.interpretationCard}
      >
        <Text maxFontSizeMultiplier={1.35} style={styles.interpretationText}>
          {model.interpretation}
        </Text>
      </View>
    </CoachSection>
  );
});

const Priorities = memo(function Priorities({
  priorities,
}: {
  priorities: DailyBriefingPriority[];
}) {
  return (
    <CoachSection title="Priorities" style={styles.section}>
      <View style={styles.priorityStack}>
        {priorities.map((priority, index) => (
          <View
            accessibilityLabel={`${priority.title} Reason: ${priority.reason}. Expected benefit: ${priority.benefit}`}
            key={priority.id}
            style={styles.priorityCard}
          >
            <View style={styles.priorityIndex}>
              <Text style={styles.priorityIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.priorityCopy}>
              <Text maxFontSizeMultiplier={1.3} style={styles.priorityTitle}>
                {priority.title}
              </Text>
              <Text maxFontSizeMultiplier={1.35} style={styles.priorityReason}>
                {priority.reason}
              </Text>
              <Text maxFontSizeMultiplier={1.35} style={styles.priorityBenefit}>
                {priority.benefit}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </CoachSection>
  );
});

const ReadinessOverview = memo(function ReadinessOverview({
  items,
}: {
  items: DailyBriefingReadinessItem[];
}) {
  return (
    <CoachSection title="Readiness Overview" style={styles.section}>
      <View style={styles.readinessGrid}>
        {items.map((item) => (
          <View
            accessibilityLabel={`${item.label}. ${item.value}.`}
            key={item.id}
            style={styles.readinessCard}
          >
            <Text style={styles.readinessLabel}>{item.label}</Text>
            <Text maxFontSizeMultiplier={1.25} style={styles.readinessValue}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </CoachSection>
  );
});

const TodaySchedule = memo(function TodaySchedule({
  schedule,
}: {
  schedule: DailyBriefingScheduleItem[];
}) {
  return (
    <CoachSection title="Today's Schedule" style={styles.section}>
      <View style={styles.timeline}>
        {schedule.map((item, index) => (
          <View key={item.id} style={styles.timelineRow}>
            <View style={styles.timelineMarker}>
              <View style={styles.timelineDot} />
              {index < schedule.length - 1 ? (
                <View style={styles.timelineLine} />
              ) : null}
            </View>
            <View style={styles.timelineCopy}>
              <Text style={styles.timelineLabel}>{item.label}</Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.timelineDetail}>
                {item.detail}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </CoachSection>
  );
});

const Motivation = memo(function Motivation({ message }: { message: string }) {
  return (
    <View
      accessibilityLabel={`Motivation. ${message}`}
      style={styles.motivation}
    >
      <Text maxFontSizeMultiplier={1.35} style={styles.motivationText}>
        {message}
      </Text>
    </View>
  );
});

const PrimaryAction = memo(function PrimaryAction({
  action,
  onPress,
}: {
  action: DailyBriefingPrimaryAction;
  onPress: (action: DailyBriefingPrimaryAction) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={action.label}
      accessibilityRole="button"
      disabled={!action.isEnabled}
      onPress={() => onPress(action)}
      style={({ pressed }) => [
        styles.primaryAction,
        !action.isEnabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text maxFontSizeMultiplier={1.2} style={styles.primaryActionText}>
        {action.label}
      </Text>
    </Pressable>
  );
});

function DailyBriefingSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading daily briefing"
        accessibilityRole="progressbar"
        style={styles.skeletonContent}
      >
        <View style={[styles.skeletonLine, styles.skeletonGreeting]} />
        <View style={[styles.skeletonLine, styles.skeletonSubtitle]} />
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonCoachCard} />
        <View style={styles.skeletonPriority} />
        <View style={styles.skeletonPriority} />
        <View style={styles.skeletonSchedule} />
      </View>
    </SafeAreaView>
  );
}

function BriefingState({
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
          accessibilityLabel={buttonLabel}
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [
            styles.primaryAction,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.primaryActionText}>{buttonLabel}</Text>
        </Pressable>
      }
      contentStyle={styles.stateContent}
      message={message}
      safeAreaStyle={styles.safeArea}
      secondaryText={secondaryText}
      secondaryTextStyle={styles.stateSecondary}
      titleStyle={styles.stateTitle}
      titleTextProps={{ maxFontSizeMultiplier: 1.25 }}
      secondaryTextProps={{ maxFontSizeMultiplier: 1.35 }}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: briefingTokens.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 28,
  },
  greeting: {
    gap: 9,
    paddingTop: 10,
  },
  greetingTitle: {
    color: briefingTokens.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 0,
  },
  greetingSubtitle: {
    color: briefingTokens.secondaryText,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '500',
  },
  hero: {
    gap: 16,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: briefingTokens.border,
    backgroundColor: briefingTokens.card,
    padding: 24,
    shadowColor: briefingTokens.text,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: briefingTokens.surface,
    borderWidth: 1,
    borderColor: briefingTokens.border,
  },
  heroText: {
    color: briefingTokens.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: 0,
  },
  whyButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: briefingTokens.border,
    backgroundColor: briefingTokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  whyButtonText: {
    color: briefingTokens.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: briefingTokens.border,
    backgroundColor: briefingTokens.card,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: briefingTokens.secondaryText,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: briefingTokens.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  interpretationCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: briefingTokens.border,
    backgroundColor: briefingTokens.surface,
    padding: 20,
  },
  interpretationText: {
    color: briefingTokens.text,
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '700',
  },
  priorityStack: {
    gap: 12,
  },
  priorityCard: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: briefingTokens.border,
    backgroundColor: briefingTokens.card,
    padding: 16,
  },
  priorityIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: briefingTokens.accent,
  },
  priorityIndexText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  priorityCopy: {
    flex: 1,
    gap: 7,
  },
  priorityTitle: {
    color: briefingTokens.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  priorityReason: {
    color: briefingTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  priorityBenefit: {
    color: briefingTokens.green,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  readinessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  readinessCard: {
    width: '48.5%',
    minHeight: 86,
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: briefingTokens.border,
    backgroundColor: briefingTokens.surface,
    padding: 15,
  },
  readinessLabel: {
    color: briefingTokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  readinessValue: {
    color: briefingTokens.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  timeline: {
    gap: 0,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: briefingTokens.border,
    backgroundColor: briefingTokens.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
  },
  timelineMarker: {
    width: 16,
    alignItems: 'center',
  },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: briefingTokens.text,
    marginTop: 6,
  },
  timelineLine: {
    flex: 1,
    width: 1,
    backgroundColor: briefingTokens.border,
    marginTop: 5,
  },
  timelineCopy: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineLabel: {
    color: briefingTokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  timelineDetail: {
    color: briefingTokens.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    marginTop: 4,
  },
  motivation: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: briefingTokens.borderSoft,
    backgroundColor: briefingTokens.surface,
    padding: 18,
  },
  motivationText: {
    color: briefingTokens.text,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryAction: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: briefingTokens.accent,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  skeletonContent: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 34,
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: briefingTokens.surface,
  },
  skeletonGreeting: {
    width: '72%',
    height: 34,
  },
  skeletonSubtitle: {
    width: '88%',
    height: 18,
    marginBottom: 12,
  },
  skeletonHero: {
    height: 168,
    borderRadius: 26,
    backgroundColor: briefingTokens.surface,
  },
  skeletonCoachCard: {
    height: 132,
    borderRadius: 24,
    backgroundColor: briefingTokens.surface,
  },
  skeletonPriority: {
    height: 108,
    borderRadius: 20,
    backgroundColor: briefingTokens.surface,
  },
  skeletonSchedule: {
    height: 150,
    borderRadius: 22,
    backgroundColor: briefingTokens.surface,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: briefingTokens.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateSecondary: {
    color: briefingTokens.secondaryText,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
