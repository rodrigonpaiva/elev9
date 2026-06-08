import {
  HABIT_READ_ERROR_CODES,
  HabitReadError,
} from '../../services/habit-read.errors';

export const GET_HABIT_HISTORY_ERROR_CODES = HABIT_READ_ERROR_CODES;

export class GetHabitHistoryError extends HabitReadError {}
