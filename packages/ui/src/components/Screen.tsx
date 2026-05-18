import type { PropsWithChildren } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export type ScreenProps = PropsWithChildren<{
  className?: string;
  contentClassName?: string;
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  viewProps?: ViewProps;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({
  children,
  scroll = false,
  scrollProps,
  viewProps,
  style,
  contentStyle,
}: ScreenProps) {
  const rootStyle = [
    styles.root,
    Platform.OS === 'web' ? styles.rootWeb : null,
    style,
  ];

  if (scroll) {
    return (
      <SafeAreaView style={rootStyle}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={rootStyle}>
      <View
        style={[styles.content, contentStyle, viewProps?.style]}
        {...viewProps}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rootWeb: {
    minHeight: '100%' as unknown as ViewStyle['minHeight'],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
});
