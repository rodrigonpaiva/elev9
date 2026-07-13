import { memo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Badge } from '@elev9/ui';

import {
  getCoachConfidenceLabel,
  getCoachConfidenceVariant,
  type CoachConfidenceLevel,
} from '../../hooks/coach';

type CoachConfidenceBadgeProps = {
  level: CoachConfidenceLevel | null;
  style?: StyleProp<ViewStyle>;
};

export const CoachConfidenceBadge = memo(function CoachConfidenceBadge({
  level,
  style,
}: CoachConfidenceBadgeProps) {
  if (!level) {
    return null;
  }

  return (
    <Badge
      label={getCoachConfidenceLabel(level)}
      variant={getCoachConfidenceVariant(level)}
      style={[styles.badge, style]}
    />
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
});
