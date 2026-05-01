import type { PropsWithChildren } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";

export type CardProps = PropsWithChildren<
  ViewProps & {
    className?: string;
  }
>;

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    backgroundColor: "#ffffff",
    padding: 20,
    shadowColor: "#0f172a",
    shadowOpacity: Platform.OS === "web" ? 0.08 : 0.12,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 3,
  } satisfies ViewStyle,
});
