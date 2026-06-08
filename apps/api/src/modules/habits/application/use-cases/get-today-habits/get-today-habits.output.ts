import { HabitSnapshot } from '../../../domain/entities/habit-snapshot.entity';

export interface GetTodayHabitsOutput {
  habitSnapshot: HabitSnapshot;
}
