import { memo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Badge } from '@elev9/ui';

import {
  getCoachRiskLabel,
  getCoachRiskVariant,
  type CoachRiskLevel,
} from '../../hooks/coach';

type CoachRiskBadgeProps = {
  level: CoachRiskLevel | null;
  style?: StyleProp<ViewStyle>;
};

export const CoachRiskBadge = memo(function CoachRiskBadge({
  level,
  style,
}: CoachRiskBadgeProps) {
  if (!level) {
    return null;
  }

  return (
    <Badge
      label={getCoachRiskLabel(level)}
      variant={getCoachRiskVariant(level)}
      style={[styles.badge, style]}
    />
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
});
