import { memo, type ComponentProps, type ReactNode } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Text } from '@elev9/ui';

type CoachCenteredStateProps = {
  message: string;
  secondaryText?: string;
  action: ReactNode;
  accessibilityLabel?: string;
  safeAreaStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  secondaryTextStyle?: StyleProp<TextStyle>;
  titleTextProps?: Omit<ComponentProps<typeof Text>, 'children' | 'style'>;
  secondaryTextProps?: Omit<ComponentProps<typeof Text>, 'children' | 'style'>;
};

export const CoachCenteredState = memo(function CoachCenteredState({
  accessibilityLabel,
  action,
  contentStyle,
  message,
  safeAreaStyle,
  secondaryText,
  secondaryTextProps,
  secondaryTextStyle,
  titleStyle,
  titleTextProps,
}: CoachCenteredStateProps) {
  return (
    <SafeAreaView style={safeAreaStyle}>
      <View
        accessibilityLabel={accessibilityLabel ?? message}
        style={[styles.content, contentStyle]}
      >
        <Text {...titleTextProps} style={[styles.title, titleStyle]}>
          {message}
        </Text>
        {secondaryText ? (
          <Text
            {...secondaryTextProps}
            style={[styles.secondary, secondaryTextStyle]}
          >
            {secondaryText}
          </Text>
        ) : null}
        {action}
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  title: {
    letterSpacing: 0,
  },
  secondary: {
    letterSpacing: 0,
  },
});
