import type { PropsWithChildren } from "react";
import { Text as NativeText, type TextProps as NativeTextProps } from "react-native";

type TextVariant = "body" | "label" | "title" | "headline";

export type TextProps = PropsWithChildren<
  NativeTextProps & {
    className?: string;
    variant?: TextVariant;
  }
>;

export function Text({
  children,
  className,
  variant = "body",
  ...props
}: TextProps) {
  return (
    <NativeText
      className={`${variantClassName(variant)} text-ink ${className ?? ""}`.trim()}
      {...props}
    >
      {children}
    </NativeText>
  );
}

function variantClassName(variant: TextVariant): string {
  switch (variant) {
    case "headline":
      return "text-3xl font-extrabold tracking-tight";
    case "title":
      return "text-xl font-bold";
    case "label":
      return "text-sm font-semibold uppercase tracking-wide text-slate";
    default:
      return "text-base";
  }
}
