import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = PropsWithChildren<
  Omit<PressableProps, 'children' | 'style'> & {
    label?: string;
    title?: string;
    loading?: boolean;
    variant?: ButtonVariant;
    className?: string;
    style?: StyleProp<ViewStyle>;
  }
>;

export function Button({
  disabled,
  label,
  title,
  loading = false,
  children,
  variant = 'primary',
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const resolvedLabel = resolveLabel({ label, title, children, loading });

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        containerStyleMap[variant],
        isDisabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
        style,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={spinnerColor(variant)} /> : null}
        <Text
          style={[
            styles.label,
            labelStyleMap[variant],
            loading ? styles.labelWithSpinner : null,
          ]}
        >
          {resolvedLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    minWidth: 160,
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelWithSpinner: {
    marginLeft: 10,
  },
  labelPrimary: {
    color: colors.primaryText,
  },
  labelSecondary: {
    color: colors.text,
  },
  labelGhost: {
    color: colors.mutedText,
  },
  labelDanger: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
});

const containerStyleMap: Record<ButtonVariant, ViewStyle> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
};

const labelStyleMap: Record<ButtonVariant, TextStyle> = {
  primary: styles.labelPrimary,
  secondary: styles.labelSecondary,
  ghost: styles.labelGhost,
  danger: styles.labelDanger,
};

function spinnerColor(variant: ButtonVariant): string {
  return variant === 'primary' ? colors.primaryText : colors.text;
}

function resolveLabel(input: {
  label?: string;
  title?: string;
  children?: ReactNode;
  loading: boolean;
}): string {
  if (typeof input.children === 'string' && input.children.trim().length > 0) {
    return input.children;
  }

  if (input.title && input.title.trim().length > 0) {
    return input.title;
  }

  if (input.label && input.label.trim().length > 0) {
    return input.label;
  }

  return input.loading ? 'Loading...' : 'Button';
}
