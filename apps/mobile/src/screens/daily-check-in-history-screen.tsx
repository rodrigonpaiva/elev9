import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ApiClientError } from '@elev9/api-client';
import type { DailyCheckInHistoryResponse } from '@elev9/types';
import {
  Badge,
  Button,
  Card,
  colors,
  Screen,
  SectionHeader,
  Text,
} from '@elev9/ui';

import { mobileApiClient } from '../api/client';

type DailyCheckInHistoryItem =
  DailyCheckInHistoryResponse['dailyCheckIns'][number];

const INITIAL_LIMIT = 20;

export function DailyCheckInHistoryScreen() {
  const [dailyCheckIns, setDailyCheckIns] = useState<DailyCheckInHistoryItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const loadDailyCheckInHistory = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (options?.refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      try {
        const response = await mobileApiClient.progress.getDailyCheckInHistory({
          limit: INITIAL_LIMIT,
        });
        setDailyCheckIns(response.dailyCheckIns);
      } catch (error) {
        if (error instanceof ApiClientError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Unable to load recovery history.');
        }
      } finally {
        if (options?.refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDailyCheckInHistory();
    }, [loadDailyCheckInHistory]),
  );

  useEffect(() => {
    if (!isLoading) {
      entrance.setValue(0);
      Animated.timing(entrance, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }).start();
    }
  }, [entrance, isLoading]);

  return (
    <Screen
      contentStyle={styles.content}
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadDailyCheckInHistory({ refresh: true })}
            tintColor={colors.primary}
          />
        ),
      }}
    >
      <Animated.View
        style={[
          styles.stack,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Card style={styles.heroCard}>
          <Badge label="Recovery" variant="primary" />
          <Text variant="headline" style={styles.title}>
            Daily Check-in History
          </Text>
          <Text style={styles.subtitle}>
            Review your recent recovery inputs and how you have been feeling.
          </Text>
        </Card>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading recovery history...</Text>
          </View>
        ) : errorMessage ? (
          <Card style={styles.feedbackCard}>
            <Text variant="title">History unavailable</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button
              label="Retry"
              onPress={() => void loadDailyCheckInHistory()}
              style={styles.fullButton}
            />
          </Card>
        ) : dailyCheckIns.length === 0 ? (
          <Card style={styles.feedbackCard}>
            <Text variant="title">No recovery check-ins yet</Text>
            <Text style={styles.subtitle}>
              Complete your first daily check-in from the dashboard to start
              tracking recovery trends.
            </Text>
          </Card>
        ) : (
          <View style={styles.listContent}>
            <SectionHeader
              title="Recent check-ins"
              subtitle={`${dailyCheckIns.length} recovery update${dailyCheckIns.length === 1 ? '' : 's'}.`}
            />
            {dailyCheckIns.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemTop}>
                  <View style={styles.itemTitleBlock}>
                    <Text style={styles.itemDate}>
                      {formatDate(item.createdAt)}
                    </Text>
                    <Text style={styles.itemTime}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                  <Badge
                    label={badgeLabelForCheckIn(item)}
                    variant={badgeVariantForCheckIn(item)}
                  />
                </View>

                <View style={styles.metricRow}>
                  <MetricPill label="Energy" value={String(item.energyLevel)} />
                  <MetricPill label="Sleep" value={String(item.sleepQuality)} />
                </View>
                <View style={styles.metricRow}>
                  <MetricPill
                    label="Soreness"
                    value={String(item.muscleSoreness)}
                  />
                  <MetricPill
                    label="Motivation"
                    value={String(item.motivationLevel)}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </Animated.View>
    </Screen>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(value: string): string {
  const date = new Date(value);

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function badgeLabelForCheckIn(item: DailyCheckInHistoryItem): string {
  if (
    item.energyLevel <= 2 ||
    item.sleepQuality <= 2 ||
    item.muscleSoreness >= 4
  ) {
    return 'High';
  }

  if (
    item.energyLevel >= 4 &&
    item.sleepQuality >= 4 &&
    item.muscleSoreness <= 2 &&
    item.motivationLevel >= 4
  ) {
    return 'Low';
  }

  return 'Moderate';
}

function badgeVariantForCheckIn(
  item: DailyCheckInHistoryItem,
): 'primary' | 'secondary' | 'muted' {
  const label = badgeLabelForCheckIn(item);

  switch (label) {
    case 'High':
      return 'secondary';
    case 'Low':
      return 'primary';
    case 'Moderate':
    default:
      return 'muted';
  }
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  stack: {
    gap: 18,
  },
  heroCard: {
    gap: 10,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
  },
  loadingState: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.mutedText,
  },
  feedbackCard: {
    gap: 14,
  },
  errorText: {
    color: colors.danger,
  },
  fullButton: {
    width: '100%',
  },
  listContent: {
    gap: 14,
  },
  itemCard: {
    gap: 14,
    backgroundColor: colors.card,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemTitleBlock: {
    flex: 1,
    gap: 4,
  },
  itemDate: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  itemTime: {
    color: colors.mutedText,
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricPill: {
    flex: 1,
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
});
