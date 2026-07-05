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

import { ApiClientError } from '@elev9/api-client';
import { Badge, Button, Card, SectionHeader, Text } from '@elev9/ui';

import { CoachActionGrid, CoachCenteredState } from '../components/coach';
import { apiClient } from '../api/client';
import type {
  CoachNotificationHistoryItem,
  CoachNotificationPreference,
  CoachNotificationQuickAction,
  CoachNotificationToday,
  CoachNotificationUpcoming,
  CoachNotificationsModel,
} from '../hooks/use-coach-notifications';
import {
  trackCoachNotificationsEvent,
  useCoachNotifications,
} from '../hooks/use-coach-notifications';
import type { RootStackParamList } from '../navigation/app-navigator';

const notificationTokens = {
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
  rose: '#e11d48',
} as const;

type HistoryIconName =
  | 'fitness-outline'
  | 'restaurant-outline'
  | 'moon-outline'
  | 'flag-outline'
  | 'trophy-outline'
  | 'calendar-outline'
  | 'sparkles-outline'
  | 'alert-circle-outline';

export function CoachNotificationsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const notifications = useCoachNotifications();
  const refreshNotifications = notifications.refresh;

  useFocusEffect(
    useCallback(() => {
      trackCoachNotificationsEvent('coach_notifications_opened');
      trackCoachNotificationsEvent('coach_quiet_mode_viewed');
      void refreshNotifications();
    }, [refreshNotifications]),
  );

  const handleTodayAction = useCallback(
    async (today: CoachNotificationToday) => {
      trackCoachNotificationsEvent('coach_nudge_selected', {
        nudge: today.id,
      });

      if (today.notificationId) {
        void recordNotificationEvent(today.notificationId, 'clicked');
      }

      navigateToTarget(navigation, today.action.target);
    },
    [navigation],
  );

  const handleTodayDismiss = useCallback(
    async (today: CoachNotificationToday) => {
      trackCoachNotificationsEvent('coach_nudge_dismissed', {
        nudge: today.id,
      });

      if (today.notificationId) {
        void recordNotificationEvent(today.notificationId, 'dismissed');
      }
    },
    [],
  );

  const handleHistoryPress = useCallback(
    async (item: CoachNotificationHistoryItem) => {
      trackCoachNotificationsEvent('coach_notification_history_opened', {
        notification: item.id,
      });

      if (item.notificationId) {
        void recordNotificationEvent(item.notificationId, 'opened');
      }

      navigateToTarget(navigation, item.target);
    },
    [navigation],
  );

  const handleQuickAction = useCallback(
    (action: CoachNotificationQuickAction) => {
      if (!action.isEnabled) {
        return;
      }

      switch (action.target) {
        case 'coach-home':
          navigation.navigate('CoachHome');
          return;
        case 'coach-daily-briefing':
          navigation.navigate('CoachDailyBriefing');
          return;
        case 'coach-weekly-review':
          navigation.navigate('CoachWeeklyReview');
          return;
        case 'coach-goal-guidance':
          navigation.navigate('CoachGoalGuidance');
          return;
        case 'dashboard':
          navigation.navigate('MainTabs', { initialTab: 'home' });
          return;
        default:
          navigation.navigate('CoachHome');
      }
    },
    [navigation],
  );

  const renderHistoryItem = useCallback(
    ({ item }: { item: CoachNotificationHistoryItem }) => (
      <HistoryRow item={item} onPress={handleHistoryPress} />
    ),
    [handleHistoryPress],
  );

  const keyExtractor = useCallback(
    (item: CoachNotificationHistoryItem) => item.id,
    [],
  );

  if (notifications.isLoading) {
    return <CoachNotificationsSkeleton />;
  }

  if (notifications.errorMessage && !notifications.model) {
    return (
      <CoachNotificationsState
        buttonLabel="Retry"
        message="Unable to load smart nudges."
        onPress={() => void notifications.refresh()}
      />
    );
  }

  if (notifications.isEmpty || !notifications.model) {
    return (
      <CoachNotificationsState
        buttonLabel="Open Coach Home"
        message="No smart nudges right now."
        onPress={() => navigation.navigate('CoachHome')}
        secondaryText="Your coach will suggest reminders when they can help."
      />
    );
  }

  const model = notifications.model;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={model.history}
        keyExtractor={keyExtractor}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={notifications.isRefreshing}
            onRefresh={() => void notifications.refresh()}
            tintColor={notificationTokens.accent}
          />
        }
        ListHeaderComponent={
          <View
            accessibilityLabel={model.accessibilityLabel}
            style={styles.content}
          >
            <HeroSection model={model} />
            <TodayNudgeSection
              today={model.today}
              onAction={handleTodayAction}
              onDismiss={handleTodayDismiss}
              onOpenCoachHome={() => navigation.navigate('CoachHome')}
            />
            <UpcomingSection upcoming={model.upcoming} />
            <SectionHeader
              title="Notification History"
              subtitle="Recent reminders and how they performed."
            />
          </View>
        }
        ListEmptyComponent={<HistoryEmpty />}
        ListFooterComponent={
          <View style={styles.contentFooter}>
            <PreferencesSection preferences={model.preferences} />
            <QuietModeSection quietMode={model.quietMode} />
            <QuickActionsSection
              actions={model.quickActions}
              onAction={handleQuickAction}
            />
          </View>
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

const HeroSection = memo(function HeroSection({
  model,
}: {
  model: CoachNotificationsModel;
}) {
  return (
    <Card style={styles.heroCard}>
      <Badge variant="primary" label="Smart Nudges" />
      <Text maxFontSizeMultiplier={1.25} style={styles.heroTitle}>
        Smart Nudges
      </Text>
      <Text maxFontSizeMultiplier={1.35} style={styles.heroSubtitle}>
        {model.heroSubtitle}
      </Text>
    </Card>
  );
});

const TodayNudgeSection = memo(function TodayNudgeSection({
  today,
  onAction,
  onDismiss,
}: {
  today: CoachNotificationToday | null;
  onAction: (today: CoachNotificationToday) => void;
  onDismiss: (today: CoachNotificationToday) => void;
  onOpenCoachHome: () => void;
}) {
  return (
    <Section title="Today's Smart Nudge">
      <Card style={styles.todayCard}>
        {today ? (
          <>
            <View style={styles.todayMetaRow}>
              <Badge variant="muted" label={today.typeLabel} />
              <Text style={styles.timeLabel}>{today.recommendedTime}</Text>
            </View>
            <Text maxFontSizeMultiplier={1.2} style={styles.todayTitle}>
              {today.title}
            </Text>
            <Text maxFontSizeMultiplier={1.35} style={styles.todayReason}>
              {today.reason}
            </Text>
            <View style={styles.todayMetaRow}>
              <Text style={styles.statusLabel}>{today.statusLabel}</Text>
              <Text style={styles.statusLabel}>{today.action.label}</Text>
            </View>
            <Button
              label={today.action.label}
              onPress={() => onAction(today)}
              style={styles.fullButton}
            />
            {!today.isSuppressed ? (
              <Pressable
                accessibilityLabel={today.dismissLabel}
                accessibilityRole="button"
                onPress={() => onDismiss(today)}
                style={({ pressed }) => [
                  styles.dismissButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.dismissButtonText}>
                  {today.dismissLabel}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Badge variant="muted" label="No nudge" />
            <Text maxFontSizeMultiplier={1.2} style={styles.todayTitle}>
              No smart nudge right now.
            </Text>
            <Text maxFontSizeMultiplier={1.35} style={styles.todayReason}>
              Your coach is keeping reminders light until they can help.
            </Text>
            <Button
              label="Open Coach Home"
              onPress={onOpenCoachHome}
              style={styles.fullButton}
            />
          </>
        )}
      </Card>
    </Section>
  );
});

const UpcomingSection = memo(function UpcomingSection({
  upcoming,
}: {
  upcoming: CoachNotificationUpcoming[];
}) {
  return (
    <Section title="Upcoming Nudges">
      {upcoming.length > 0 ? (
        <View style={styles.upcomingList}>
          {upcoming.map((item) => (
            <Card key={item.id} style={styles.upcomingCard}>
              <View style={styles.upcomingMetaRow}>
                <Text style={styles.upcomingLabel}>{item.label}</Text>
                <Text style={styles.upcomingTime}>{item.recommendedTime}</Text>
              </View>
              <Text style={styles.upcomingTitle}>{item.title}</Text>
              <Text style={styles.upcomingDetail}>{item.detail}</Text>
              <Text style={styles.upcomingStatus}>{item.statusLabel}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <Card style={styles.upcomingEmptyCard}>
          <Text style={styles.emptyTitle}>No future nudges scheduled yet.</Text>
          <Text style={styles.emptyDetail}>
            Your coach will surface the next reminder when timing is useful.
          </Text>
        </Card>
      )}
    </Section>
  );
});

const HistoryRow = memo(function HistoryRow({
  item,
  onPress,
}: {
  item: CoachNotificationHistoryItem;
  onPress: (item: CoachNotificationHistoryItem) => void;
}) {
  const icon = resolveHistoryIcon(item.typeLabel);
  const isPressable = item.target !== 'unknown';

  const content = (
    <View style={styles.historyCard}>
      <View style={styles.historyIcon}>
        <Ionicons name={icon} size={18} color={notificationTokens.text} />
      </View>
      <View style={styles.historyBody}>
        <View style={styles.historyMetaRow}>
          <Text style={styles.historyDate}>{item.dateLabel}</Text>
          <Badge variant="muted" label={item.statusLabel} />
        </View>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historyDetail}>{item.detail}</Text>
        <View style={styles.historyFooter}>
          <Text style={styles.historyType}>{item.typeLabel}</Text>
          <Text style={styles.historyAction}>{item.actionLabel}</Text>
        </View>
      </View>
      {isPressable ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={notificationTokens.tertiaryText}
        />
      ) : null}
    </View>
  );

  if (!isPressable) {
    return <View style={styles.historyRow}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.historyRow,
        pressed ? styles.pressed : null,
      ]}
    >
      {content}
    </Pressable>
  );
});

const PreferencesSection = memo(function PreferencesSection({
  preferences,
}: {
  preferences: CoachNotificationPreference[];
}) {
  return (
    <Section title="Coaching Preferences">
      <View style={styles.preferenceGrid}>
        {preferences.map((preference) => (
          <Card key={preference.id} style={styles.preferenceCard}>
            <Badge variant="muted" label="Read only" />
            <Text style={styles.preferenceLabel}>{preference.label}</Text>
            <Text style={styles.preferenceDetail}>{preference.detail}</Text>
          </Card>
        ))}
      </View>
    </Section>
  );
});

const QuietModeSection = memo(function QuietModeSection({
  quietMode,
}: {
  quietMode: CoachNotificationQuietMode;
}) {
  return (
    <Section title="Quiet Mode">
      <Card style={styles.quietCard}>
        <View style={styles.quietHeader}>
          <Text style={styles.quietTitle}>{quietMode.label}</Text>
          <Badge
            variant={quietMode.isActive ? 'primary' : 'muted'}
            label={quietMode.badgeLabel}
          />
        </View>
        <Text style={styles.quietDetail}>{quietMode.detail}</Text>
      </Card>
    </Section>
  );
});

const QuickActionsSection = memo(function QuickActionsSection({
  actions,
  onAction,
}: {
  actions: CoachNotificationQuickAction[];
  onAction: (action: CoachNotificationQuickAction) => void;
}) {
  return (
    <Section title="Quick Actions">
      <CoachActionGrid
        actions={actions}
        actionStyle={styles.quickAction}
        containerStyle={styles.quickActionGrid}
        onAction={onAction}
        textProps={{ maxFontSizeMultiplier: 1.15 }}
        textStyle={styles.quickActionText}
      />
    </Section>
  );
});

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

function HistoryEmpty() {
  return (
    <Card style={styles.historyEmptyCard}>
      <Text style={styles.emptyTitle}>No notification history yet.</Text>
      <Text style={styles.emptyDetail}>
        Once the coach starts sending reminders, the latest ones will appear
        here.
      </Text>
    </Card>
  );
}

function CoachNotificationsSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading smart nudges"
        style={styles.skeletonContent}
      >
        <View style={[styles.skeletonBlock, styles.skeletonHero]} />
        <View style={[styles.skeletonBlock, styles.skeletonToday]} />
        <View style={[styles.skeletonBlock, styles.skeletonUpcoming]} />
        <View style={[styles.skeletonBlock, styles.skeletonUpcoming]} />
        <View style={[styles.skeletonBlock, styles.skeletonHistory]} />
        <View style={[styles.skeletonBlock, styles.skeletonHistory]} />
        <View style={[styles.skeletonBlock, styles.skeletonPreference]} />
        <View style={[styles.skeletonBlock, styles.skeletonQuiet]} />
      </View>
    </SafeAreaView>
  );
}

function CoachNotificationsState({
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
      action={<Button label={buttonLabel} onPress={onPress} />}
      contentStyle={styles.stateContent}
      message={message}
      safeAreaStyle={styles.safeArea}
      secondaryText={secondaryText}
      secondaryTextStyle={styles.stateSecondary}
      titleStyle={styles.stateTitle}
    />
  );
}

function navigateToTarget(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  target:
    | CoachNotificationToday['action']['target']
    | CoachNotificationUpcoming['target']
    | CoachNotificationHistoryItem['target'],
) {
  switch (target) {
    case 'coach-chat':
      navigation.navigate('CoachChat');
      return;
    case 'coach-insights':
      navigation.navigate('CoachInsights');
      return;
    case 'coach-goal-guidance':
      navigation.navigate('CoachGoalGuidance');
      return;
    case 'coach-daily-briefing':
      navigation.navigate('CoachDailyBriefing');
      return;
    case 'coach-weekly-review':
      navigation.navigate('CoachWeeklyReview');
      return;
    case 'coach-memory-timeline':
      navigation.navigate('CoachMemoryTimeline');
      return;
    case 'ask-coach':
      navigation.navigate('AskCoach');
      return;
    case 'workout':
      navigation.navigate('MainTabs', { initialTab: 'workout' });
      return;
    case 'nutrition':
      navigation.navigate('NutritionOverview');
      return;
    case 'recovery':
      navigation.navigate('DailyCheckInHistory');
      return;
    case 'dashboard':
    case 'coach-home':
      navigation.navigate('CoachHome');
      return;
    case 'unknown':
    default:
      navigation.navigate('CoachHome');
  }
}

async function recordNotificationEvent(
  notificationId: string,
  type: 'opened' | 'clicked' | 'dismissed' | 'completed',
) {
  try {
    await apiClient.notifications.recordEngagementEvent(notificationId, {
      type,
    });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return;
    }
  }
}

function resolveHistoryIcon(typeLabel: string): HistoryIconName {
  switch (typeLabel) {
    case 'Workout reminder':
    case 'Missed workout':
      return 'fitness-outline';
    case 'Nutrition reminder':
      return 'restaurant-outline';
    case 'Recovery alert':
      return 'moon-outline';
    case 'Goal milestone':
      return 'flag-outline';
    case 'Goal achieved':
      return 'trophy-outline';
    case 'Weekly summary':
      return 'calendar-outline';
    case 'Coach nudge':
      return 'sparkles-outline';
    default:
      return 'alert-circle-outline';
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: notificationTokens.background,
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
    gap: 22,
  },
  contentFooter: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 22,
    paddingTop: 6,
  },
  section: {
    gap: 12,
  },
  heroCard: {
    gap: 10,
  },
  heroTitle: {
    color: notificationTokens.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: 0,
  },
  heroSubtitle: {
    color: notificationTokens.secondaryText,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  },
  todayCard: {
    gap: 12,
  },
  todayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeLabel: {
    color: notificationTokens.tertiaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  todayTitle: {
    color: notificationTokens.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: 0,
  },
  todayReason: {
    color: notificationTokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
  },
  statusLabel: {
    color: notificationTokens.tertiaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  fullButton: {
    marginTop: 4,
  },
  dismissButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  dismissButtonText: {
    color: notificationTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  upcomingList: {
    gap: 12,
  },
  upcomingCard: {
    gap: 8,
  },
  upcomingEmptyCard: {
    gap: 6,
  },
  upcomingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  upcomingLabel: {
    color: notificationTokens.tertiaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  upcomingTime: {
    color: notificationTokens.secondaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  upcomingTitle: {
    color: notificationTokens.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  upcomingDetail: {
    color: notificationTokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  upcomingStatus: {
    color: notificationTokens.tertiaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  historyRow: {
    marginBottom: 12,
  },
  historyCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: notificationTokens.border,
    backgroundColor: notificationTokens.card,
    padding: 16,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: notificationTokens.surface,
  },
  historyBody: {
    flex: 1,
    gap: 8,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyDate: {
    color: notificationTokens.tertiaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  historyTitle: {
    color: notificationTokens.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  historyDetail: {
    color: notificationTokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyType: {
    color: notificationTokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  historyAction: {
    color: notificationTokens.secondaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  preferenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  preferenceCard: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: 8,
  },
  preferenceLabel: {
    color: notificationTokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  preferenceDetail: {
    color: notificationTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  quietCard: {
    gap: 10,
  },
  quietHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  quietTitle: {
    color: notificationTokens.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  quietDetail: {
    color: notificationTokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: notificationTokens.border,
    backgroundColor: notificationTokens.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  quickActionText: {
    color: notificationTokens.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  historyEmptyCard: {
    gap: 8,
  },
  emptyTitle: {
    color: notificationTokens.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  emptyDetail: {
    color: notificationTokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  skeletonContent: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  skeletonBlock: {
    borderRadius: 20,
    backgroundColor: notificationTokens.borderSoft,
  },
  skeletonHero: {
    height: 150,
  },
  skeletonToday: {
    height: 210,
  },
  skeletonUpcoming: {
    height: 116,
  },
  skeletonHistory: {
    height: 94,
  },
  skeletonPreference: {
    height: 170,
  },
  skeletonQuiet: {
    height: 132,
  },
  stateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: notificationTokens.background,
  },
  stateTitle: {
    color: notificationTokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateSecondary: {
    color: notificationTokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
});
