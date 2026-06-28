import { memo, useCallback, useMemo } from 'react';
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

import type {
  CoachGrowthMoment,
  CoachMemoryItem,
  CoachMemoryPattern,
  CoachMemoryQuickAction,
  CoachMemoryTarget,
  CoachMemoryTimelineModel,
} from '../hooks/use-coach-memory-timeline';
import {
  trackCoachMemoryEvent,
  useCoachMemoryTimeline,
} from '../hooks/use-coach-memory-timeline';
import type { RootStackParamList } from '../navigation/app-navigator';

const memoryTokens = {
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

export function CoachMemoryTimelineScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const memory = useCoachMemoryTimeline();
  const refreshMemory = memory.refresh;

  useFocusEffect(
    useCallback(() => {
      trackCoachMemoryEvent('coach_memory_opened');
      void refreshMemory();
    }, [refreshMemory]),
  );

  const handleTarget = useCallback(
    (target?: CoachMemoryTarget) => {
      switch (target) {
        case 'insight':
          navigation.navigate('CoachInsights');
          return;
        case 'conversation':
          navigation.navigate('CoachChat');
          return;
        case 'weekly-review':
          navigation.navigate('CoachWeeklyReview');
          return;
        case 'workout-history':
          navigation.navigate('MainTabs', { initialTab: 'history' });
          return;
        case 'nutrition-history':
          navigation.navigate('NutritionHistory');
          return;
        case 'recovery':
          navigation.navigate('DailyCheckInHistory');
          return;
        case 'goals':
          navigation.navigate('CoachGoalGuidance');
          return;
        case 'dashboard':
          navigation.navigate('MainTabs', { initialTab: 'home' });
          return;
        default:
          return;
      }
    },
    [navigation],
  );

  const renderMemory = useCallback(
    ({ item }: { item: CoachMemoryItem }) => (
      <MemoryRow item={item} onPress={handleTarget} />
    ),
    [handleTarget],
  );

  const keyExtractor = useCallback((item: CoachMemoryItem) => item.id, []);

  const listHeader = useMemo(() => {
    if (!memory.model) {
      return null;
    }

    return <MemoryListHeader model={memory.model} onTarget={handleTarget} />;
  }, [handleTarget, memory.model]);

  if (memory.isLoading) {
    return <MemorySkeleton />;
  }

  if (memory.errorMessage && !memory.model) {
    return (
      <MemoryState
        buttonLabel="Retry"
        message="Unable to load coach memories."
        onPress={() => void memory.refresh()}
      />
    );
  }

  if (memory.isEmpty || !memory.model) {
    return (
      <MemoryState
        buttonLabel="Open Coach Conversation"
        message="Your coach is still getting to know you."
        onPress={() => navigation.navigate('CoachChat')}
        secondaryText="Complete workouts, log meals and chat with your coach to build personalized memories."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={memory.model.memories}
        keyExtractor={keyExtractor}
        renderItem={renderMemory}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          <MemoryListFooter model={memory.model} onTarget={handleTarget} />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={memory.isRefreshing}
            onRefresh={() => void memory.refresh()}
            tintColor={memoryTokens.accent}
          />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={80}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

const MemoryListHeader = memo(function MemoryListHeader({
  model,
}: {
  model: CoachMemoryTimelineModel;
  onTarget: (target?: CoachMemoryTarget) => void;
}) {
  return (
    <View accessibilityLabel={model.accessibilityLabel} style={styles.headerStack}>
      <MemoryHero subtitle={model.subtitle} />
      <SectionTitle title="Recent Memories" />
    </View>
  );
});

const MemoryListFooter = memo(function MemoryListFooter({
  model,
  onTarget,
}: {
  model: CoachMemoryTimelineModel;
  onTarget: (target?: CoachMemoryTarget) => void;
}) {
  return (
    <View style={styles.footerStack}>
      <BehavioralPatterns patterns={model.patterns} onTarget={onTarget} />
      <GrowthMoments moments={model.growthMoments} />
      <CoachReflection reflection={model.reflection} />
      <QuickActions actions={model.quickActions} onTarget={onTarget} />
    </View>
  );
});

const MemoryHero = memo(function MemoryHero({ subtitle }: { subtitle: string }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroIcon}>
        <Ionicons name="sparkles" size={20} color={memoryTokens.text} />
      </View>
      <Text maxFontSizeMultiplier={1.25} style={styles.heroTitle}>
        Coach Memory
      </Text>
      <Text maxFontSizeMultiplier={1.35} numberOfLines={2} style={styles.heroSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
});

const MemoryRow = memo(function MemoryRow({
  item,
  onPress,
}: {
  item: CoachMemoryItem;
  onPress: (target?: CoachMemoryTarget) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${item.dateLabel}. ${item.title}. ${item.explanation}`}
      accessibilityRole={item.target ? 'button' : 'text'}
      onPress={() => {
        trackCoachMemoryEvent('coach_memory_item_selected', { item: item.id });
        onPress(item.target);
      }}
      style={({ pressed }) => [
        styles.memoryRow,
        pressed && item.target ? styles.pressed : null,
      ]}
    >
      <View style={styles.timelineMarker}>
        <View style={styles.timelineDot}>
          <Ionicons name={getMemoryIcon(item.icon)} size={13} color="#ffffff" />
        </View>
        <View style={styles.timelineLine} />
      </View>
      <View style={styles.memoryCard}>
        <Text style={styles.memoryDate}>{item.dateLabel}</Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.memoryTitle}>
          {item.title}
        </Text>
        <Text maxFontSizeMultiplier={1.35} style={styles.memoryExplanation}>
          {item.explanation}
        </Text>
      </View>
    </Pressable>
  );
});

const BehavioralPatterns = memo(function BehavioralPatterns({
  onTarget,
  patterns,
}: {
  patterns: CoachMemoryPattern[];
  onTarget: (target?: CoachMemoryTarget) => void;
}) {
  if (patterns.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionTitle title="Behavioral Patterns" />
      <View style={styles.patternStack}>
        {patterns.map((pattern) => (
          <Pressable
            accessibilityLabel={`${pattern.pattern}. ${pattern.confidence}. ${pattern.whyItMatters}`}
            accessibilityRole="button"
            key={pattern.id}
            onPress={() => {
              trackCoachMemoryEvent('coach_memory_pattern_opened', {
                pattern: pattern.id,
              });
              onTarget(pattern.target);
            }}
            style={({ pressed }) => [
              styles.patternCard,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.patternTitle}>
              {pattern.pattern}
            </Text>
            <Text style={styles.patternConfidence}>{pattern.confidence}</Text>
            <Text maxFontSizeMultiplier={1.35} style={styles.patternWhy}>
              {pattern.whyItMatters}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const GrowthMoments = memo(function GrowthMoments({
  moments,
}: {
  moments: CoachGrowthMoment[];
}) {
  if (moments.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionTitle title="Growth Moments" />
      <View style={styles.growthStack}>
        {moments.map((moment) => (
          <View
            accessibilityLabel={`${moment.title}. ${moment.detail}.`}
            key={moment.id}
            style={styles.growthCard}
          >
            <Text maxFontSizeMultiplier={1.25} style={styles.growthTitle}>
              {moment.title}
            </Text>
            <Text maxFontSizeMultiplier={1.35} style={styles.growthDetail}>
              {moment.detail}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const CoachReflection = memo(function CoachReflection({
  reflection,
}: {
  reflection: string;
}) {
  return (
    <View
      accessibilityLabel={`Coach reflection. ${reflection}`}
      style={styles.reflectionCard}
      onLayout={() => trackCoachMemoryEvent('coach_memory_reflection_read')}
    >
      <Text style={styles.reflectionLabel}>COACH REFLECTION</Text>
      <Text maxFontSizeMultiplier={1.35} numberOfLines={4} style={styles.reflectionText}>
        {reflection}
      </Text>
    </View>
  );
});

const QuickActions = memo(function QuickActions({
  actions,
  onTarget,
}: {
  actions: CoachMemoryQuickAction[];
  onTarget: (target?: CoachMemoryTarget) => void;
}) {
  return (
    <View style={styles.section}>
      <SectionTitle title="Quick Actions" />
      <View style={styles.actionGrid}>
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={action.label}
            accessibilityRole="button"
            accessibilityState={{ disabled: !action.isEnabled }}
            disabled={!action.isEnabled}
            key={action.id}
            onPress={() => onTarget(action.target)}
            style={({ pressed }) => [
              styles.actionPill,
              !action.isEnabled ? styles.disabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

function SectionTitle({ title }: { title: string }) {
  return (
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {title}
    </Text>
  );
}

function MemorySkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading coach memories"
        accessibilityRole="progressbar"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonTimeline} />
        <View style={styles.skeletonTimeline} />
        <View style={styles.skeletonPattern} />
        <View style={styles.skeletonReflection} />
      </View>
    </SafeAreaView>
  );
}

function MemoryState({
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
      </View>
    </SafeAreaView>
  );
}

function getMemoryIcon(icon: CoachMemoryItem['icon']) {
  switch (icon) {
    case 'barbell':
      return 'barbell-outline';
    case 'nutrition':
      return 'restaurant-outline';
    case 'recovery':
      return 'moon-outline';
    case 'goal':
      return 'flag-outline';
    case 'habit':
      return 'repeat-outline';
    case 'sparkles':
    default:
      return 'sparkles';
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: memoryTokens.background,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 42,
  },
  headerStack: {
    gap: 28,
    marginBottom: 14,
  },
  footerStack: {
    gap: 28,
    marginTop: 18,
  },
  hero: {
    gap: 13,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: memoryTokens.border,
    backgroundColor: memoryTokens.card,
    padding: 24,
    shadowColor: memoryTokens.text,
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
    backgroundColor: memoryTokens.surface,
    borderWidth: 1,
    borderColor: memoryTokens.border,
  },
  heroTitle: {
    color: memoryTokens.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 0,
  },
  heroSubtitle: {
    color: memoryTokens.secondaryText,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '500',
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: memoryTokens.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  memoryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineMarker: {
    width: 28,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: memoryTokens.text,
  },
  timelineLine: {
    flex: 1,
    width: 1,
    minHeight: 72,
    backgroundColor: memoryTokens.border,
  },
  memoryCard: {
    flex: 1,
    gap: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: memoryTokens.border,
    backgroundColor: memoryTokens.card,
    padding: 16,
    marginBottom: 14,
  },
  memoryDate: {
    color: memoryTokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  memoryTitle: {
    color: memoryTokens.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  memoryExplanation: {
    color: memoryTokens.secondaryText,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  patternStack: {
    gap: 12,
  },
  patternCard: {
    gap: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: memoryTokens.border,
    backgroundColor: memoryTokens.surface,
    padding: 18,
  },
  patternTitle: {
    color: memoryTokens.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  patternConfidence: {
    color: memoryTokens.green,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  patternWhy: {
    color: memoryTokens.secondaryText,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  growthStack: {
    gap: 10,
  },
  growthCard: {
    gap: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: memoryTokens.border,
    backgroundColor: memoryTokens.card,
    padding: 16,
  },
  growthTitle: {
    color: memoryTokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  growthDetail: {
    color: memoryTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  reflectionCard: {
    gap: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: memoryTokens.border,
    backgroundColor: memoryTokens.surface,
    padding: 22,
  },
  reflectionLabel: {
    color: memoryTokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0,
  },
  reflectionText: {
    color: memoryTokens.text,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '800',
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
    borderColor: memoryTokens.border,
    backgroundColor: memoryTokens.surface,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  actionText: {
    color: memoryTokens.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  skeletonContent: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 34,
  },
  skeletonHero: {
    height: 178,
    borderRadius: 26,
    backgroundColor: memoryTokens.surface,
  },
  skeletonTimeline: {
    height: 118,
    borderRadius: 20,
    backgroundColor: memoryTokens.surface,
  },
  skeletonPattern: {
    height: 132,
    borderRadius: 22,
    backgroundColor: memoryTokens.surface,
  },
  skeletonReflection: {
    height: 150,
    borderRadius: 26,
    backgroundColor: memoryTokens.surface,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: memoryTokens.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateSecondary: {
    color: memoryTokens.secondaryText,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  primaryAction: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: memoryTokens.accent,
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
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
  },
});
