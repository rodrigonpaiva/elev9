import type { ReplayComparison, ReplayDifference } from './replay.types';

type ReplayFieldValue = unknown;

export type ReplayComparatorInput<
  TPersisted extends object,
  TRecalculated extends object,
  TField extends keyof TPersisted & keyof TRecalculated & string,
> = {
  persisted: TPersisted;
  recalculated: TRecalculated;
  fields: readonly TField[];
};

export class ReplayComparator {
  private static readonly UNDEFINED_TOKEN = {
    __replayUndefined: true,
  } as const;

  static compare<
    TPersisted extends object,
    TRecalculated extends object,
    TField extends keyof TPersisted & keyof TRecalculated & string,
  >(
    input: ReplayComparatorInput<TPersisted, TRecalculated, TField>,
  ): ReplayComparison<TField> {
    const persisted = input.persisted as Record<string, unknown>;
    const recalculated = input.recalculated as Record<string, unknown>;
    const differences: Array<ReplayDifference<TField>> = [];

    for (const field of input.fields) {
      const persistedValue = persisted[field];
      const recalculatedValue = recalculated[field];

      if (!this.isEqual(persistedValue, recalculatedValue)) {
        differences.push({
          field,
          persisted: persistedValue,
          recalculated: recalculatedValue,
        });
      }
    }

    return {
      matches: differences.length === 0,
      differences,
    };
  }

  private static isEqual(left: ReplayFieldValue, right: ReplayFieldValue): boolean {
    return this.normalize(left) === this.normalize(right);
  }

  private static normalize(value: ReplayFieldValue): string {
    return JSON.stringify(this.toStableValue(value));
  }

  private static toStableValue(value: ReplayFieldValue): ReplayFieldValue {
    if (value === null || value === undefined) {
      return value === undefined ? this.UNDEFINED_TOKEN : null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toStableValue(item));
    }

    if (this.isPlainObject(value)) {
      const entries = Object.entries(value as Record<string, unknown>).sort(
        ([leftKey], [rightKey]) => leftKey.localeCompare(rightKey),
      );

      return entries.reduce<Record<string, unknown>>((accumulator, [key, item]) => {
        accumulator[key] = this.toStableValue(item);
        return accumulator;
      }, {});
    }

    return value;
  }

  private static isPlainObject(value: ReplayFieldValue): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
