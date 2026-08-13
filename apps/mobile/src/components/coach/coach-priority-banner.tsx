import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@elev9/ui';

import type { CoachFocus, CoachUnifiedRisk } from '../../hooks/coach';
import { getCoachFocusLabel, getCoachRiskLabel } from '../../hooks/coach';
import { CoachConfidenceBadge } from './coach-confidence-badge';
import { CoachRiskBadge } from './coach-risk-badge';

type CoachPriorityBannerProps = {
  focus: CoachFocus | null;
  title: string;
  detail: string;
  riskLevel?: CoachUnifiedRisk['level'] | null;
  confidenceLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
};

export const CoachPriorityBanner = memo(function CoachPriorityBanner({
  confidenceLevel,
  detail,
  focus,
  riskLevel,
  title,
}: CoachPriorityBannerProps) {
  return (
    <View
      accessibilityLabel={`Priority banner. ${getCoachFocusLabel(focus)}. ${title}. ${detail}.`}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.label}>TODAY&apos;S PRIORITY</Text>
        <View style={styles.badges}>
          <CoachRiskBadge level={riskLevel ?? null} />
          <CoachConfidenceBadge level={confidenceLevel ?? null} />
        </View>
      </View>
      <Text style={styles.focus}>{getCoachFocusLabel(focus)}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      {riskLevel ? (
        <Text style={styles.riskDetail}>{getCoachRiskLabel(riskLevel)}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  label: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  focus: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
  },
  detail: {
    color: '#5b6472',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  riskDetail: {
    color: '#b45309',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
