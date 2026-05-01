import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { Text } from "./Text";

type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = PropsWithChildren<
  Omit<PressableProps, "children" | "style"> & {
    label?: string;
    loading?: boolean;
    variant?: ButtonVariant;
    className?: string;
    style?: StyleProp<ViewStyle>;
  }
>;

export function Button({
  disabled,
  label,
  loading = false,
  children,
  variant = "primary",
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

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
        <Text style={[styles.label, labelStyleMap[variant]]}>
          {label ?? children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primary: {
    backgroundColor: "#0f766e",
  },
  secondary: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#0f766e",
  },
  ghost: {
    backgroundColor: "#f8fafc",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  labelPrimary: {
    color: "#ffffff",
  },
  labelSecondary: {
    color: "#0f766e",
  },
  labelGhost: {
    color: "#475569",
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});

const containerStyleMap: Record<ButtonVariant, ViewStyle> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
};

const labelStyleMap: Record<ButtonVariant, TextStyle> = {
  primary: styles.labelPrimary,
  secondary: styles.labelSecondary,
  ghost: styles.labelGhost,
};

function spinnerColor(variant: ButtonVariant): string {
  return variant === "primary" ? "#ffffff" : "#0f766e";
}
