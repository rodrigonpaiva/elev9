import { memo, useCallback } from 'react';
import type { ReactNode } from 'react';
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

import type {
  CoachHomeAction,
  CoachHomeContextItem,
  CoachHomeModel,
  CoachHomePriority,
} from '../hooks/use-coach-home';
import { useCoachHome } from '../hooks/use-coach-home';
import type { RootStackParamList } from '../navigation/app-navigator';

type CoachHomeScreenProps = {
  onOpenWorkoutTab?: () => void;
};

type CoachHomeEvent =
  | 'coach_home_opened'
  | 'coach_priority_selected'
  | 'coach_action_selected'
  | 'coach_conversation_opened';

const coachTokens = {
  background: '#ffffff',
  surface: '#f8fafc',
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#5b6472',
  tertiaryText: '#8a94a6',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  accent: '#111827',
  accentSoft: '#eef2ff',
  green: '#16a34a',
  blue: '#2563eb',
  amber: '#b45309',
  rose: '#e11d48',
} as const;

export function CoachHomeScreen({ onOpenWorkoutTab }: CoachHomeScreenProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const coachHome = useCoachHome();
  const refreshCoachHome = coachHome.refresh;

  useFocusEffect(
    useCallback(() => {
      trackCoachHomeEvent('coach_home_opened');
      void refreshCoachHome();
    }, [refreshCoachHome]),
  );

  const handleActionPress = useCallback(
    (action: CoachHomeAction) => {
      trackCoachHomeEvent(
        action.target === 'conversation'
          ? 'coach_conversation_opened'
          : 'coach_action_selected',
        { action: action.id },
      );

      switch (action.target) {
        case 'ask':
          navigation.navigate('AskCoach');
          return;
        case 'insight':
          navigation.navigate('CoachInsights');
          return;
        case 'goals':
          navigation.navigate('CoachGoalGuidance');
          return;
        case 'briefing':
          navigation.navigate('CoachDailyBriefing');
          return;
        case 'notifications':
          navigation.navigate('CoachNotifications');
          return;
        case 'weekly-review':
          navigation.navigate('CoachWeeklyReview');
          return;
        case 'memory':
          navigation.navigate('CoachMemoryTimeline');
          return;
        case 'conversation':
          navigation.navigate('CoachChat');
          return;
        case 'workout':
          if (coachHome.trainingPlanId && coachHome.workout) {
            navigation.navigate('WorkoutOverview', {
              trainingPlanId: coachHome.trainingPlanId,
              workout: coachHome.workout,
            });
            return;
          }

          onOpenWorkoutTab?.();
          return;
        case 'nutrition':
          navigation.navigate('NutritionOverview');
          return;
        case 'recovery':
          navigation.navigate('DailyCheckInHistory');
          return;
      }
    },
    [coachHome.trainingPlanId, coachHome.workout, navigation, onOpenWorkoutTab],
  );

  if (coachHome.isLoading) {
    return <CoachHomeSkeleton />;
  }

  if (coachHome.errorMessage && !coachHome.model) {
    return (
      <CoachState
        buttonLabel="Retry"
        message="Unable to load today's coaching."
        onPress={() => void coachHome.refresh()}
      />
    );
  }

  if (coachHome.isEmpty || !coachHome.model) {
    return (
      <CoachState
        buttonLabel="Go to Dashboard"
        message="Your coach is preparing today's guidance."
        onPress={() => navigation.navigate('MainTabs', { initialTab: 'home' })}
        secondaryText="Complete your first workout or nutrition check-in to unlock personalized coaching."
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
            refreshing={coachHome.isRefreshing}
            onRefresh={() => void coachHome.refresh()}
            tintColor={coachTokens.accent}
          />
        }
      >
        <View
          accessibilityLabel={coachHome.model.accessibilityLabel}
          style={styles.content}
        >
          <GreetingSection model={coachHome.model} />
          <MainInsightCard model={coachHome.model} />
          <ContextSection items={coachHome.model.contextItems} />
          <PrioritiesSection priorities={coachHome.model.priorities} />
          <ActionsSection
            actions={coachHome.model.actions}
            onActionPress={handleActionPress}
          />
          <ConversationPreview
            model={coachHome.model}
            onContinue={() => navigation.navigate('CoachChat')}
          />
          <CoachStatus model={coachHome.model} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const GreetingSection = memo(function GreetingSection({
  model,
}: {
  model: CoachHomeModel;
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

const MainInsightCard = memo(function MainInsightCard({
  model,
}: {
  model: CoachHomeModel;
}) {
  return (
    <View
      accessibilityLabel={`Today's main insight. ${model.mainInsight}. ${model.insightSummary}`}
      style={styles.heroCard}
    >
      <View style={styles.heroIcon}>
        <Ionicons name="sparkles" size={19} color={coachTokens.accent} />
      </View>
      <Text maxFontSizeMultiplier={1.25} style={styles.heroTitle}>
        {model.mainInsight}
      </Text>
      <Text maxFontSizeMultiplier={1.4} style={styles.heroSummary}>
        {model.insightSummary}
      </Text>
    </View>
  );
});

const ContextSection = memo(function ContextSection({
  items,
}: {
  items: CoachHomeContextItem[];
}) {
  return (
    <Section title="Your Current Context">
      <View style={styles.contextGrid}>
        {items.slice(0, 4).map((item) => (
          <View
            accessibilityLabel={`${item.label}. ${item.value}.`}
            key={item.id}
            style={styles.contextCard}
          >
            <Text style={styles.contextLabel}>{item.label}</Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.contextValue}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
});

const PrioritiesSection = memo(function PrioritiesSection({
  priorities,
}: {
  priorities: CoachHomePriority[];
}) {
  return (
    <Section title="Coach Priorities">
      <View style={styles.priorityList}>
        {priorities.map((priority, index) => (
          <Pressable
            accessibilityLabel={`${priority.title} Reason: ${priority.reason}. Expected benefit: ${priority.benefit}`}
            accessibilityRole="button"
            key={priority.id}
            onPress={() =>
              trackCoachHomeEvent('coach_priority_selected', {
                priority: priority.id,
              })
            }
            style={({ pressed }) => [
              styles.priorityCard,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.priorityIndex}>
              <Text style={styles.priorityIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.priorityBody}>
              <Text maxFontSizeMultiplier={1.35} style={styles.priorityTitle}>
                {priority.title}
              </Text>
              <Text maxFontSizeMultiplier={1.4} style={styles.priorityReason}>
                {priority.reason}
              </Text>
              <Text maxFontSizeMultiplier={1.4} style={styles.priorityBenefit}>
                {priority.benefit}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Section>
  );
});

const ActionsSection = memo(function ActionsSection({
  actions,
  onActionPress,
}: {
  actions: CoachHomeAction[];
  onActionPress: (action: CoachHomeAction) => void;
}) {
  const primaryAction = actions.find((action) => action.isPrimary);
  const secondaryActions = actions.filter((action) => !action.isPrimary);

  return (
    <Section title="Today's Actions">
      {primaryAction ? (
        <PrimaryButton
          accessibilityLabel={primaryAction.label}
          label={primaryAction.label}
          onPress={() => onActionPress(primaryAction)}
        />
      ) : null}
      <View style={styles.actionGrid}>
        {secondaryActions
          .filter((action) => action.isEnabled)
          .map((action) => (
            <Pressable
              accessibilityLabel={action.label}
              accessibilityRole="button"
              key={action.id}
              onPress={() => onActionPress(action)}
              style={({ pressed }) => [
                styles.actionPill,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.actionPillText}>{action.label}</Text>
            </Pressable>
          ))}
      </View>
    </Section>
  );
});

const ConversationPreview = memo(function ConversationPreview({
  model,
  onContinue,
}: {
  model: CoachHomeModel;
  onContinue: () => void;
}) {
  const message = model.latestMessage;
  const preview =
    message?.content.trim() ||
    "You're set for today. Open the conversation when you want more guidance.";

  return (
    <Section title="Conversation Preview">
      <View
        accessibilityLabel={`Latest coach message. ${preview}`}
        style={styles.previewCard}
      >
        <Text style={styles.previewTime}>
          {message ? formatMessageTime(message.createdAt) : 'Today'}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.previewText}>
          {preview}
        </Text>
        <Pressable
          accessibilityLabel="Continue conversation"
          accessibilityRole="button"
          onPress={onContinue}
          style={({ pressed }) => [
            styles.previewLink,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.previewLinkText}>Continue Conversation</Text>
          <Ionicons name="chevron-forward" size={16} color={coachTokens.text} />
        </Pressable>
      </View>
    </Section>
  );
});

const CoachStatus = memo(function CoachStatus({
  model,
}: {
  model: CoachHomeModel;
}) {
  return (
    <View
      accessibilityLabel={`${model.statusText} ${model.statusDetail}`}
      style={styles.statusCard}
    >
      <Ionicons name="checkmark-circle" size={18} color={coachTokens.green} />
      <View style={styles.statusTextWrap}>
        <Text style={styles.statusTitle}>{model.statusText}</Text>
        <Text style={styles.statusDetail}>{model.statusDetail}</Text>
      </View>
    </View>
  );
});

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function CoachHomeSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading coach home"
        accessibilityRole="progressbar"
        style={styles.skeletonContent}
      >
        <View style={[styles.skeletonLine, styles.skeletonGreeting]} />
        <View style={[styles.skeletonLine, styles.skeletonSubtitle]} />
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonGrid}>
          {['one', 'two', 'three', 'four'].map((item) => (
            <View key={item} style={styles.skeletonContext} />
          ))}
        </View>
        <View style={styles.skeletonPriority} />
        <View style={styles.skeletonPriority} />
        <View style={styles.skeletonPreview} />
      </View>
    </SafeAreaView>
  );
}

function CoachState({
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
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel={message} style={styles.stateContent}>
        <Text style={styles.stateTitle}>{message}</Text>
        {secondaryText ? (
          <Text style={styles.stateSecondary}>{secondaryText}</Text>
        ) : null}
        <PrimaryButton label={buttonLabel} onPress={onPress} />
      </View>
    </SafeAreaView>
  );
}

function PrimaryButton({
  accessibilityLabel,
  label,
  onPress,
}: {
  accessibilityLabel?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text maxFontSizeMultiplier={1.2} style={styles.primaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatMessageTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Today';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function trackCoachHomeEvent(
  eventName: CoachHomeEvent,
  metadata?: Record<string, string>,
) {
  void eventName;
  void metadata;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: coachTokens.background,
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
    color: coachTokens.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 0,
  },
  greetingSubtitle: {
    color: coachTokens.secondaryText,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '500',
  },
  heroCard: {
    gap: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: coachTokens.border,
    backgroundColor: coachTokens.card,
    padding: 24,
    shadowColor: coachTokens.text,
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
    backgroundColor: coachTokens.surface,
    borderWidth: 1,
    borderColor: coachTokens.border,
  },
  heroTitle: {
    color: coachTokens.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: 0,
  },
  heroSummary: {
    color: coachTokens.secondaryText,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: coachTokens.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  contextGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  contextCard: {
    width: '48.5%',
    minHeight: 92,
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: coachTokens.border,
    backgroundColor: coachTokens.surface,
    padding: 16,
  },
  contextLabel: {
    color: coachTokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  contextValue: {
    color: coachTokens.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
  },
  priorityList: {
    gap: 12,
  },
  priorityCard: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: coachTokens.border,
    backgroundColor: coachTokens.card,
    padding: 16,
  },
  priorityIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: coachTokens.accent,
  },
  priorityIndexText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  priorityBody: {
    flex: 1,
    gap: 7,
  },
  priorityTitle: {
    color: coachTokens.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  priorityReason: {
    color: coachTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  priorityBenefit: {
    color: coachTokens.green,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: coachTokens.accent,
    borderColor: coachTokens.accent,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionPill: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: coachTokens.border,
    backgroundColor: coachTokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionPillText: {
    color: coachTokens.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  previewCard: {
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: coachTokens.border,
    backgroundColor: coachTokens.surface,
    padding: 18,
  },
  previewTime: {
    color: coachTokens.tertiaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  previewText: {
    color: coachTokens.text,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },
  previewLink: {
    minHeight: 40,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewLinkText: {
    color: coachTokens.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  statusCard: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: coachTokens.border,
    backgroundColor: coachTokens.card,
    padding: 16,
  },
  statusTextWrap: {
    flex: 1,
    gap: 4,
  },
  statusTitle: {
    color: coachTokens.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  statusDetail: {
    color: coachTokens.secondaryText,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.72,
  },
  skeletonContent: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 34,
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: coachTokens.surface,
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
    height: 190,
    borderRadius: 24,
    backgroundColor: coachTokens.surface,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skeletonContext: {
    width: '48.5%',
    height: 92,
    borderRadius: 18,
    backgroundColor: coachTokens.surface,
  },
  skeletonPriority: {
    height: 108,
    borderRadius: 20,
    backgroundColor: coachTokens.surface,
  },
  skeletonPreview: {
    height: 150,
    borderRadius: 22,
    backgroundColor: coachTokens.surface,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: coachTokens.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateSecondary: {
    color: coachTokens.secondaryText,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
});
