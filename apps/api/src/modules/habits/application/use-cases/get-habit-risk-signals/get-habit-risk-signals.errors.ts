import {
  HABIT_READ_ERROR_CODES,
  HabitReadError,
} from '../../services/habit-read.errors';

export const GET_HABIT_RISK_SIGNALS_ERROR_CODES = HABIT_READ_ERROR_CODES;

export class GetHabitRiskSignalsError extends HabitReadError {}
