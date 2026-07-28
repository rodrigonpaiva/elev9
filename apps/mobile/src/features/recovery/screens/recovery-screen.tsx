import type { RecoveryExperienceInsightAction } from '@elev9/types';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Screen, SectionHeader, Text, colors } from '@elev9/ui';

import { availableHistoryPointCount } from '../helpers/recovery-history-presentation';
import type { RecoveryScreenState } from '../models/recovery-screen-state';
import { RecoveryEmptyState } from '../components/recovery-empty-state';
import { RecoveryErrorState } from '../components/recovery-error-state';
import { RecoveryFactorList } from '../components/recovery-factor-list';
import { RecoveryFreshnessNote } from '../components/recovery-freshness-note';
import { RecoveryHistoryChart } from '../components/recovery-history-chart';
import { RecoveryHistoryList } from '../components/recovery-history-list';
import { RecoveryInsightCard } from '../components/recovery-insight-card';
import { RecoveryLoadingState } from '../components/recovery-loading-state';
import { RecoveryScoreHero } from '../components/recovery-score-hero';
import { RecoveryTrendSummary } from '../components/recovery-trend-summary';

export type RecoveryScreenProps = {
  state: RecoveryScreenState;
  onBack?: () => void;
  onRefresh?: () => void;
  onRetry?: () => void;
  onCompleteCheckIn?: () => void;
  onOpenHistoryItem?: (localDate: string) => void;
  onSelectHistoryRange?: (days: 7) => void;
  onInsightAction?: (action: RecoveryExperienceInsightAction) => void;
};

export function RecoveryScreen({
  state,
  onBack,
  onRefresh,
  onRetry,
  onCompleteCheckIn,
  onOpenHistoryItem,
  onSelectHistoryRange,
  onInsightAction,
}: RecoveryScreenProps) {
  const isRefreshing = state.status === 'available' ? state.isRefreshing : false;

  return (
    <Screen
      contentStyle={styles.content}
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        ),
      }}
    >
      <View style={styles.stack}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" variant="headline">
              Recovery
            </Text>
            <Text style={styles.intro}>
              Understand how ready you may be for today’s activity.
            </Text>
          </View>
          {onBack ? (
            <Button
              accessibilityLabel="Go back"
              label="Back"
              onPress={onBack}
              style={styles.backButton}
              variant="ghost"
            />
          ) : null}
        </View>
        {state.status === 'loading' ? <RecoveryLoadingState /> : null}
        {state.status === 'available' ? (
          <AvailableRecoveryContent
            state={state}
            onInsightAction={onInsightAction}
            onOpenHistoryItem={onOpenHistoryItem}
            onSelectHistoryRange={onSelectHistoryRange}
          />
        ) : null}
        {state.status === 'insufficient_data' ? (
          <RecoveryEmptyState
            actionLabel="Complete today’s check-in"
            message="Your Recovery guidance will appear after you share how you’re feeling today."
            onAction={onCompleteCheckIn}
            title="Complete today’s check-in"
          />
        ) : null}
        {state.status === 'not_available' ? (
          <RecoveryEmptyState
            actionLabel="Complete today’s check-in"
            message="Check back after completing your daily check-in."
            onAction={onCompleteCheckIn}
            title="Recovery is not available yet"
          />
        ) : null}
        {state.status === 'processing_failed' ? (
          <RecoveryEmptyState
            actionLabel="Try again"
            message="We couldn’t update your Recovery. Try again in a moment."
            onAction={onRetry}
            title="Recovery could not be updated"
          />
        ) : null}
        {state.status === 'error' ? (
          <RecoveryErrorState
            isRetrying={state.isRetrying}
            message={state.message}
            onRetry={onRetry}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function AvailableRecoveryContent({
  state,
  onInsightAction,
  onOpenHistoryItem,
  onSelectHistoryRange,
}: {
  state: Extract<RecoveryScreenState, { status: 'available' }>;
  onInsightAction?: (action: RecoveryExperienceInsightAction) => void;
  onOpenHistoryItem?: (localDate: string) => void;
  onSelectHistoryRange?: (days: 7) => void;
}) {
  return (
    <View style={styles.stack}>
      <RecoveryScoreHero current={state.current} />
      <RecoveryFreshnessNote
        freshness={state.current.freshness}
        lastUpdatedAt={state.current.lastUpdatedAt}
      />
      <RecoveryInsightCard
        insight={state.current.insight}
        onAction={
          onInsightAction
            ? () => onInsightAction(state.current.insight.action)
            : undefined
        }
      />
      <RecoveryFactorList factors={state.current.breakdown} />
      <RecoveryTrendSummary
        availablePointCount={availableHistoryPointCount(state.history)}
        trend={state.trend}
      />
      <RecoveryHistoryChart history={state.history} />
      <RecoveryHistoryList
        history={state.history}
        onOpenItem={onOpenHistoryItem}
      />
      <SectionHeader
        title="Keep listening to your body"
        subtitle="Recovery is guidance for training decisions, not a medical assessment."
      />
      {onSelectHistoryRange ? (
        <Text
          accessibilityRole="button"
          onPress={() => onSelectHistoryRange(7)}
          style={styles.rangeHint}
        >
          Showing the last 7 days
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  stack: { gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1, gap: 8 },
  intro: { color: colors.mutedText, marginTop: -8 },
  backButton: { minWidth: 88, width: 88, paddingHorizontal: 8, paddingVertical: 12 },
  rangeHint: { color: colors.primary, fontWeight: '700' },
});
