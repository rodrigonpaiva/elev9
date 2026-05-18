import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { Text } from './Text';

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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontSize: 16,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
