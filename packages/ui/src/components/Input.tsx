import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { Text } from "./Text";

export type InputProps = TextInputProps & {
  className?: string;
  errorMessage?: string | null;
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function Input({
  errorMessage,
  label,
  containerStyle,
  inputStyle,
  ...props
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#94a3b8"
        style={[styles.input, inputStyle]}
        {...props}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: "#0f172a",
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
    lineHeight: 20,
  },
});
