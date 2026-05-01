import type { PropsWithChildren } from "react";
import { ScrollView, View, type ScrollViewProps, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type ScreenProps = PropsWithChildren<{
  className?: string;
  contentClassName?: string;
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  viewProps?: ViewProps;
}>;

export function Screen({
  children,
  className,
  contentClassName,
  scroll = false,
  scrollProps,
  viewProps,
}: ScreenProps) {
  return (
    <SafeAreaView className={`flex-1 bg-white ${className ?? ""}`.trim()}>
      {scroll ? (
        <ScrollView
          contentContainerClassName={`flex-grow px-5 py-4 ${contentClassName ?? ""}`.trim()}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          className={`flex-1 px-5 py-4 ${contentClassName ?? ""}`.trim()}
          {...viewProps}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
