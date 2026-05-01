import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, type PressableProps, View } from "react-native";

import { Text } from "./Text";

type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = PropsWithChildren<
  Omit<PressableProps, "children"> & {
    label?: string;
    loading?: boolean;
    variant?: ButtonVariant;
    className?: string;
  }
>;

export function Button({
  className,
  disabled,
  label,
  loading = false,
  children,
  variant = "primary",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={`${buttonClassName(variant, isDisabled)} ${className ?? ""}`.trim()}
      disabled={isDisabled}
      {...props}
    >
      <View className="flex-row items-center justify-center gap-2">
        {loading ? <ActivityIndicator color={spinnerColor(variant)} /> : null}
        <Text className={labelClassName(variant)}>{label ?? children}</Text>
      </View>
    </Pressable>
  );
}

function buttonClassName(variant: ButtonVariant, disabled: boolean): string {
  const disabledClassName = disabled ? "opacity-60" : "";

  switch (variant) {
    case "secondary":
      return `rounded-2xl border border-brand bg-white px-4 py-4 ${disabledClassName}`;
    case "ghost":
      return `rounded-2xl px-4 py-4 ${disabledClassName}`;
    default:
      return `rounded-2xl bg-brand px-4 py-4 ${disabledClassName}`;
  }
}

function labelClassName(variant: ButtonVariant): string {
  switch (variant) {
    case "secondary":
      return "text-base font-semibold text-brand";
    case "ghost":
      return "text-base font-semibold text-slate";
    default:
      return "text-base font-semibold text-white";
  }
}

function spinnerColor(variant: ButtonVariant): string {
  return variant === "primary" ? "#ffffff" : "#0f766e";
}
