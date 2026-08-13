import { memo, type ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Text } from '@elev9/ui';

type CoachActionLike = {
  id: string;
  label: string;
  isEnabled?: boolean;
};

type CoachActionGridProps<TAction extends CoachActionLike> = {
  actions: TAction[];
  onAction: (action: TAction) => void;
  containerStyle?: StyleProp<ViewStyle>;
  gridStyle?: StyleProp<ViewStyle>;
  actionStyle?: StyleProp<ViewStyle>;
  disabledActionStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabelPrefix?: string;
  textProps?: Omit<ComponentProps<typeof Text>, 'children' | 'style'>;
};

export const CoachActionGrid = memo(function CoachActionGrid<
  TAction extends CoachActionLike,
>({
  actions,
  actionStyle,
  accessibilityLabelPrefix,
  containerStyle,
  disabledActionStyle,
  gridStyle,
  onAction,
  textProps,
  textStyle,
}: CoachActionGridProps<TAction>) {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.grid, gridStyle]}>
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={
              accessibilityLabelPrefix
                ? `${accessibilityLabelPrefix}${action.label}`
                : action.label
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: action.isEnabled === false }}
            disabled={action.isEnabled === false}
            key={action.id}
            onPress={() => onAction(action)}
            style={({ pressed }) => [
              styles.action,
              actionStyle,
              action.isEnabled === false ? disabledActionStyle : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text {...textProps} style={[styles.text, textStyle]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.76,
  },
});
