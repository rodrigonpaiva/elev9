import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type {
  NutritionHistoryDaySummary,
  NutritionTrendReadModel,
} from '@elev9/types';
import { Card, Text } from '@elev9/ui';

import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

const PERIOD_DAYS = 30;

export function NutritionHistoryScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<NutritionHistoryDaySummary[]>([]);
  const [trends, setTrends] = useState<NutritionTrendReadModel | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'more' = 'initial') => {
      if (mode === 'more' && (!hasNextPage || loadingMore)) return;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      setError(false);

      try {
        const [history, trendResponse] = await Promise.all([
          apiClient.nutrition.getHistory({
            from: utcDateShift(-PERIOD_DAYS + 1),
            to: utcDateString(new Date()),
            cursor: mode === 'more' ? (cursor ?? undefined) : undefined,
            limit: 20,
          }),
          mode === 'more'
            ? Promise.resolve(null)
            : apiClient.nutrition.getTrends({
                from: utcDateShift(-PERIOD_DAYS + 1),
                to: utcDateString(new Date()),
              }),
        ]);

        setItems((current) =>
          mode === 'more' ? [...current, ...history.items] : history.items,
        );
        setCursor(history.pageInfo.nextCursor);
        setHasNextPage(history.pageInfo.hasNextPage);
        if (trendResponse) setTrends(trendResponse.trends);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [cursor, hasNextPage, loadingMore],
  );

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <HistoryState title="Loading nutrition history…" />;
  if (error && items.length === 0) {
    return (
      <HistoryState
        title="Some nutrition history could not be loaded."
        actionLabel="Try again"
        onAction={() => void load()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load('refresh')}
          />
        }
        onEndReached={() => void load('more')}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={<HistoryHeader trends={trends} />}
        ListEmptyComponent={
          <HistoryState title="No nutrition data is available for this period." />
        }
        ListFooterComponent={
          loadingMore ? (
            <Text accessibilityRole="progressbar">Loading more history…</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={historyAccessibilityLabel(item)}
            onPress={() =>
              navigation.navigate('NutritionHistoryDay', { date: item.date })
            }
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card style={styles.dayCard}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text variant="title">{formatDate(item.date)}</Text>
                  <Text style={styles.muted}>{historyQualityLabel(item)}</Text>
                </View>
                <View style={styles.valueBlock}>
                  <Text>
                    {item.meals
                      ? `${item.meals.completed}/${item.meals.planned} meals`
                      : 'Meals unavailable'}
                  </Text>
                  <Text style={styles.muted}>
                    {item.calories?.percentage !== null && item.calories
                      ? `${item.calories.percentage}% recorded progress`
                      : 'Calories unavailable'}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

export function NutritionHistoryDayScreen({
  route,
}: {
  route: { params: { date: string } };
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [day, setDay] = useState<
    Awaited<ReturnType<typeof apiClient.nutrition.getHistoryDay>>['day'] | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setDay((await apiClient.nutrition.getHistoryDay(route.params.date)).day);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [route.params.date]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <HistoryState title="Loading nutrition day…" />;
  if (error || !day)
    return (
      <HistoryState
        title="This nutrition day could not be loaded."
        actionLabel="Try again"
        onAction={() => void load()}
      />
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.detailContent}>
        <Text variant="title">
          Nutrition summary for {formatDate(day.date)}
        </Text>
        <Text style={styles.muted}>{dayDetailLabel(day)}</Text>
        {day.calories ? (
          <Card>
            <Text
              accessibilityLabel={`Calories: ${day.calories.percentage ?? 'unavailable'} percent of recorded target.`}
            >
              Calories: {day.calories.percentage ?? '—'}%
            </Text>
          </Card>
        ) : null}
        {day.mealProgress ? (
          <Card>
            <Text
              accessibilityLabel={`${day.mealProgress.completed} of ${day.mealProgress.planned} planned meals completed.`}
            >
              Meals: {day.mealProgress.completed} of {day.mealProgress.planned}{' '}
              completed
            </Text>
          </Card>
        ) : null}
        {day.macros.length > 0 ? (
          <Card>
            <Text variant="label">Recorded macronutrients</Text>
            {day.macros.map((macro) => (
              <Text key={macro.nutrient}>
                {macro.nutrient}: {macro.consumed} {macro.unit}
                {macro.target === null
                  ? ''
                  : ` of ${macro.target} ${macro.unit}`}
              </Text>
            ))}
          </Card>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function HistoryHeader({ trends }: { trends: NutritionTrendReadModel | null }) {
  return (
    <View style={styles.header}>
      <Text variant="title">Nutrition history</Text>
      <Text style={styles.muted}>
        Recorded nutrition summaries for the last {PERIOD_DAYS} days.
      </Text>
      {trends ? (
        <Card accessibilityLabel={trendAccessibilityLabel(trends)}>
          <Text variant="label">Recorded coverage</Text>
          <Text>
            {trends.coverage.availableDays} days with data of{' '}
            {trends.coverage.expectedDays}
          </Text>
          <Text style={styles.muted}>
            {trends.coverage.partialDays} partial ·{' '}
            {trends.coverage.missingDays} without data
          </Text>
        </Card>
      ) : null}
    </View>
  );
}

function HistoryState({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.state}>
        <Text variant="title">{title}</Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
          >
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function historyAccessibilityLabel(item: NutritionHistoryDaySummary): string {
  return `${formatDate(item.date)}. ${historyQualityLabel(item)}. ${item.meals ? `${item.meals.completed} of ${item.meals.planned} planned meals completed.` : 'Meal data unavailable.'}`;
}

function historyQualityLabel(item: NutritionHistoryDaySummary): string {
  if (item.availability === 'partial' || item.dataQuality === 'partial')
    return 'Partial nutrition data';
  if (item.availability === 'legacy' || item.dataQuality === 'legacy')
    return 'Some historical details are unavailable';
  if (item.availability === 'no_data') return 'No nutrition data';
  return 'Nutrition data available';
}

function dayDetailLabel(day: {
  availability: string;
  dataQuality: string;
}): string {
  return day.availability === 'partial' || day.dataQuality === 'partial'
    ? 'Some historical details are unavailable.'
    : 'Recorded nutrition data.';
}

function trendAccessibilityLabel(trends: NutritionTrendReadModel): string {
  return `Recorded nutrition coverage. ${trends.coverage.availableDays} days with data out of ${trends.coverage.expectedDays}.`;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function utcDateShift(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateString(date);
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  detailContent: { padding: 16, gap: 12 },
  header: { gap: 8, marginBottom: 4 },
  dayCard: { paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 4 },
  valueBlock: { alignItems: 'flex-end', gap: 4 },
  muted: { color: '#64748b' },
  pressed: { opacity: 0.75 },
  state: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  action: { color: '#2563eb', fontWeight: '700' },
});
