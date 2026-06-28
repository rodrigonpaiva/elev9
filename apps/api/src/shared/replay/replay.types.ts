export type ReplayStatus = 'match' | 'drift_detected' | 'not_replayable';

export type BackfillMode = 'dry_run' | 'apply';

export type FormulaVersioned = {
  formulaVersion: string;
  generatedAt?: string | Date;
};

export type ReplayDifference<TField extends string = string> = {
  field: TField;
  persisted: unknown;
  recalculated: unknown;
};

export type ReplayComparison<TField extends string = string> = {
  matches: boolean;
  differences: Array<ReplayDifference<TField>>;
};

export type ReplayResult<
  TPersisted,
  TRecalculated,
  TField extends string = string,
> = {
  persisted: TPersisted;
  recalculated: TRecalculated;
  comparison: ReplayComparison<TField>;
  replayedAt: string;
};

export type BackfillRunMetadata = {
  mode: BackfillMode;
  formulaVersion: string;
  startedAt: string;
  completedAt?: string;
  runId?: string;
  totalRecords?: number;
  matchedRecords?: number;
  driftDetectedRecords?: number;
};
