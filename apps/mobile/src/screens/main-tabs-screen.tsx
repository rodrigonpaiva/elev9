import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@elev9/ui';
import { Text } from '@elev9/ui';

import { CurrentWorkoutScreen } from './current-workout-screen';
import { DashboardScreen } from './dashboard-screen';
import { ProfileScreen } from './profile-screen';
import { ProgressSummaryScreen } from './progress-summary-screen';
import { WorkoutHistoryScreen } from './workout-history-screen';

type MainTabKey = 'home' | 'workout' | 'history' | 'progress' | 'profile';

type TabConfig = {
  key: MainTabKey;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  activeIcon: ComponentProps<typeof Ionicons>['name'];
};

const TABS: TabConfig[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  {
    key: 'workout',
    label: 'Workout',
    icon: 'barbell-outline',
    activeIcon: 'barbell',
  },
  {
    key: 'history',
    label: 'History',
    icon: 'time-outline',
    activeIcon: 'time',
  },
  {
    key: 'progress',
    label: 'Progress',
    icon: 'stats-chart-outline',
    activeIcon: 'stats-chart',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person-outline',
    activeIcon: 'person',
  },
];

const themeAlpha = {
  borderSoft: withAlpha(colors.border, 0.7),
  borderSubtle: withAlpha(colors.border, 0.24),
  cardMuted: withAlpha(colors.card, 0.92),
  primaryGlow: withAlpha(colors.primary, 0.12),
  primaryBorder: withAlpha(colors.primary, 0.28),
  primaryIconShell: withAlpha(colors.primary, 0.16),
  primaryIconBorder: withAlpha(colors.primary, 0.34),
  shadow: withAlpha(colors.ink, 0.28),
  transparent: withAlpha(colors.surface, 0),
};

export function MainTabsScreen() {
  const [activeTab, setActiveTab] = useState<MainTabKey>('home');

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.content}>{renderTab(activeTab, setActiveTab)}</View>
      <View style={styles.tabBarShell}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TabBarItem
              key={tab.key}
              tab={tab}
              isActive={tab.key === activeTab}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

type TabBarItemProps = {
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
};

function TabBarItem({ tab, isActive, onPress }: TabBarItemProps) {
  const activeProgress = useSharedValue(isActive ? 1 : 0);
  const pressProgress = useSharedValue(0);

  useEffect(() => {
    activeProgress.value = withSpring(isActive ? 1 : 0, {
      damping: 16,
      stiffness: 180,
      mass: 0.8,
    });
  }, [activeProgress, isActive]);

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      [themeAlpha.transparent, themeAlpha.primaryGlow],
    ),
    borderColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      [themeAlpha.transparent, themeAlpha.primaryBorder],
    ),
    transform: [
      {
        translateY: interpolate(activeProgress.value, [0, 1], [0, -2]),
      },
      {
        scale:
          interpolate(activeProgress.value, [0, 1], [1, 1.05]) -
          interpolate(pressProgress.value, [0, 1], [0, 0.03]),
      },
    ],
    opacity: interpolate(pressProgress.value, [0, 1], [1, 0.92]),
  }));

  const iconShellStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      [themeAlpha.cardMuted, themeAlpha.primaryIconShell],
    ),
    borderColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      [themeAlpha.borderSoft, themeAlpha.primaryIconBorder],
    ),
    transform: [
      {
        scale: interpolate(activeProgress.value, [0, 1], [1, 1.06]),
      },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeProgress.value,
      [0, 1],
      [colors.mutedText, colors.primary],
    ),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
    transform: [
      {
        scaleX: interpolate(activeProgress.value, [0, 1], [0.4, 1]),
      },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      key={tab.key}
      onPress={onPress}
      onPressIn={() => {
        pressProgress.value = withTiming(1, { duration: 120 });
      }}
      onPressOut={() => {
        pressProgress.value = withTiming(0, { duration: 180 });
      }}
      style={styles.pressable}
    >
      <Animated.View style={[styles.tabItem, containerStyle]}>
        <Animated.View style={[styles.activeGlow, glowStyle]} />
        <Animated.View style={[styles.iconShell, iconShellStyle]}>
          <Ionicons
            name={isActive ? tab.activeIcon : tab.icon}
            size={20}
            color={isActive ? colors.primary : colors.mutedText}
          />
        </Animated.View>
        <Animated.Text style={[styles.tabLabel, labelStyle]}>
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

function renderTab(
  activeTab: MainTabKey,
  setActiveTab: (tab: MainTabKey) => void,
) {
  switch (activeTab) {
    case 'home':
      return <DashboardScreen onOpenHistory={() => setActiveTab('history')} />;
    case 'workout':
      return <CurrentWorkoutScreen />;
    case 'history':
      return <WorkoutHistoryScreen />;
    case 'progress':
      return <ProgressSummaryScreen />;
    case 'profile':
      return <ProfileScreen />;
    default:
      return <DashboardScreen onOpenHistory={() => setActiveTab('history')} />;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBarShell: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: themeAlpha.borderSubtle,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 76,
    shadowColor: colors.ink,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: -8,
    },
    elevation: 20,
  },
  pressable: {
    flex: 1,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  activeGlow: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 26,
    height: 3,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    backgroundColor: colors.primary,
  },
  iconShell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

function withAlpha(color: string, alpha: number) {
  const normalized = color.replace('#', '');
  const hex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((value) => value + value)
          .join('')
      : normalized;

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
