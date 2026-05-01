import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";

export type CardProps = PropsWithChildren<
  ViewProps & {
    className?: string;
  }
>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={`rounded-3xl border border-mist bg-panel p-5 shadow-sm ${className ?? ""}`.trim()}
      {...props}
    >
      {children}
    </View>
  );
}
