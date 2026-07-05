import { memo, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@elev9/ui';

type CoachSectionProps = {
  title: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<ComponentProps<typeof Text>['style']>;
};

export const CoachSection = memo(function CoachSection({
  children,
  style,
  title,
  titleStyle,
}: CoachSectionProps) {
  return (
    <View style={[styles.section, style]}>
      <Text accessibilityRole="header" style={[styles.title, titleStyle]}>
        {title}
      </Text>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  title: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0,
  },
});
