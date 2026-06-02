import { MacroTargetsProps } from '../value-objects/macro-targets.value-object';

export type FoodItemProps = {
  name: string;
  quantity: string;
  unit?: string;
  estimatedMacros?: MacroTargetsProps;
  tags: string[];
};

export class FoodItem {
  readonly name: string;
  readonly quantity: string;
  readonly unit?: string;
  readonly estimatedMacros?: MacroTargetsProps;
  readonly tags: string[];

  constructor(props: FoodItemProps) {
    this.name = props.name;
    this.quantity = props.quantity;
    this.unit = props.unit;
    this.estimatedMacros = props.estimatedMacros;
    this.tags = [...props.tags];
  }
}
