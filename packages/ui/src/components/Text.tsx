import type { PropsWithChildren } from 'react';
import {
  StyleSheet,
  Text as NativeText,
  type StyleProp,
  type TextProps as NativeTextProps,
  type TextStyle,
} from 'react-native';

import { colors } from '../theme/colors';

type TextVariant = 'body' | 'label' | 'title' | 'headline';

export type TextProps = PropsWithChildren<
  NativeTextProps & {
    className?: string;
    variant?: TextVariant;
    style?: StyleProp<TextStyle>;
  }
>;

export function Text({
  children,
  variant = 'body',
  style,
  ...props
}: TextProps) {
  return (
    <NativeText
      style={[styles.base, variantStyleMap[variant], style]}
      {...props}
    >
      {children}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.mutedText,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  headline: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
});

const variantStyleMap: Record<TextVariant, TextStyle> = {
  body: styles.body,
  label: styles.label,
  title: styles.title,
  headline: styles.headline,
};
