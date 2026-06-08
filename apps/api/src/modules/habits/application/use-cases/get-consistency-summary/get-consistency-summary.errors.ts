import {
  HABIT_READ_ERROR_CODES,
  HabitReadError,
} from '../../services/habit-read.errors';

export const GET_CONSISTENCY_SUMMARY_ERROR_CODES = HABIT_READ_ERROR_CODES;

export class GetConsistencySummaryError extends HabitReadError {}
