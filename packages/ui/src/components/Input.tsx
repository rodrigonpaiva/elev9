import { TextInput, type TextInputProps, View } from "react-native";

import { Text } from "./Text";

export type InputProps = TextInputProps & {
  className?: string;
  errorMessage?: string | null;
  label?: string;
};

export function Input({
  className,
  errorMessage,
  label,
  ...props
}: InputProps) {
  return (
    <View className="gap-2">
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        className={`rounded-2xl border border-mist bg-white px-4 py-4 text-base text-ink ${className ?? ""}`.trim()}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {errorMessage ? (
        <Text className="text-sm text-danger">{errorMessage}</Text>
      ) : null}
    </View>
  );
}
