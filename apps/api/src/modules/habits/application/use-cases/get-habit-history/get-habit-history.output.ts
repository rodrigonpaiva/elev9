import { HabitSnapshot } from '../../../domain/entities/habit-snapshot.entity';

export interface GetHabitHistoryOutput {
  habitSnapshots: HabitSnapshot[];
  limit: number;
}
