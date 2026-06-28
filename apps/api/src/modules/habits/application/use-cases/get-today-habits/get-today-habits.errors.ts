import {
  HABIT_READ_ERROR_CODES,
  HabitReadError,
} from '../../services/habit-read.errors';

export const GET_TODAY_HABITS_ERROR_CODES = HABIT_READ_ERROR_CODES;

export class GetTodayHabitsError extends HabitReadError {}
