import { memo, type ComponentProps } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@elev9/ui';

type CoachHeroCardProps = {
  accessibilityLabel?: string;
  iconName?: ComponentProps<typeof Ionicons>['name'];
  iconSize?: number;
  iconColor: string;
  title: string;
  subtitle?: string;
  containerStyle?: StyleProp<ViewStyle>;
  iconContainerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  titleTextProps?: Omit<ComponentProps<typeof Text>, 'children' | 'style'>;
  subtitleTextProps?: Omit<ComponentProps<typeof Text>, 'children' | 'style'>;
};

export const CoachHeroCard = memo(function CoachHeroCard({
  accessibilityLabel,
  containerStyle,
  iconColor,
  iconContainerStyle,
  iconName,
  iconSize = 20,
  subtitle,
  subtitleStyle,
  subtitleTextProps,
  title,
  titleStyle,
  titleTextProps,
}: CoachHeroCardProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.hero, containerStyle]}
    >
      {iconName ? (
        <View style={[styles.icon, iconContainerStyle]}>
          <Ionicons name={iconName} size={iconSize} color={iconColor} />
        </View>
      ) : null}
      <Text {...titleTextProps} style={[styles.title, titleStyle]}>
        {title}
      </Text>
      {subtitle ? (
        <Text {...subtitleTextProps} style={[styles.subtitle, subtitleStyle]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    gap: 8,
  },
  icon: {
    alignSelf: 'flex-start',
  },
  title: {
    color: '#111827',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#475467',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
});
