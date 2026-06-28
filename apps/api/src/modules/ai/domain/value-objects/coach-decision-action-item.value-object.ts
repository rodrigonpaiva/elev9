export type CoachDecisionActionItemProps = {
  value: string;
};

export class CoachDecisionActionItem {
  readonly value: string;

  constructor(value: string) {
    this.value = normalizeActionItem(value);
  }

  toJSON(): CoachDecisionActionItemProps {
    return {
      value: this.value,
    };
  }
}

function normalizeActionItem(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
