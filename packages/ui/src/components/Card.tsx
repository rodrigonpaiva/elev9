import type { PropsWithChildren } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";

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
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.xl,
    shadowColor: "#000000",
    shadowOpacity: Platform.OS === "web" ? 0.18 : 0.24,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 6,
  } satisfies ViewStyle,
});
