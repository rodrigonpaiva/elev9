import type { PropsWithChildren } from "react";
import {
  StyleSheet,
  View,
  type TextStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { Text } from "./Text";

type BadgeVariant = "primary" | "muted" | "danger";

export type BadgeProps = PropsWithChildren<{
  label?: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}>;

export function Badge({
  children,
  label,
  variant = "muted",
  style,
}: BadgeProps) {
  const resolved = typeof children === "string" ? children : label;

  if (!resolved) {
    return null;
  }

  return (
    <View style={[styles.base, containerStyles[variant], style]}>
      <Text style={[styles.label, labelStyles[variant]]}>{resolved}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
  },
  primary: {
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  muted: {
    backgroundColor: "#0b1220",
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  labelPrimary: {
    color: colors.primary,
  },
  labelMuted: {
    color: colors.mutedText,
  },
  labelDanger: {
    color: "#fca5a5",
  },
});

const containerStyles: Record<BadgeVariant, ViewStyle> = {
  primary: styles.primary,
  muted: styles.muted,
  danger: styles.danger,
};

const labelStyles: Record<BadgeVariant, TextStyle> = {
  primary: styles.labelPrimary,
  muted: styles.labelMuted,
  danger: styles.labelDanger,
};
