import type { PropsWithChildren } from "react";
import {
  Platform,
  ScrollView,
  View,
  type ViewStyle,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
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
  const rootStyle: ViewStyle = {
    flex: 1 as const,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  };

  const contentMinHeightStyle: ViewStyle | undefined =
    Platform.OS === "web"
      ? {
          minHeight: "100%" as unknown as ViewStyle["minHeight"],
        }
      : undefined;

  return (
    <SafeAreaView
      className={`flex-1 bg-white ${className ?? ""}`.trim()}
      style={rootStyle}
    >
      {scroll ? (
        <ScrollView
          contentContainerClassName={`flex-grow px-5 py-4 ${contentClassName ?? ""}`.trim()}
          style={{ flex: 1 }}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          className={`flex-1 px-5 py-4 ${contentClassName ?? ""}`.trim()}
          style={contentMinHeightStyle}
          {...viewProps}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
