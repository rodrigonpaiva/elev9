export type WorkoutLogExercise = {
  name: string;
  setsDone: number;
  repsDone: number;
};

export type WorkoutLogFeedback = {
  difficulty: "easy" | "medium" | "hard";
  notes?: string;
};

export type WorkoutLogProps = {
  id: string;
  trainingPlanId: string;
  workoutDayIndex: number;
  durationMinutes: number;
  completedExercises: WorkoutLogExercise[];
  feedback?: WorkoutLogFeedback;
  date: string;
  createdAt: Date;
  updatedAt: Date;
};

export class WorkoutLog {
  readonly id: string;
  readonly trainingPlanId: string;
  readonly workoutDayIndex: number;
  readonly durationMinutes: number;
  readonly completedExercises: WorkoutLogExercise[];
  readonly feedback?: WorkoutLogFeedback;
  readonly date: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: WorkoutLogProps) {
    this.id = props.id;
    this.trainingPlanId = props.trainingPlanId;
    this.workoutDayIndex = props.workoutDayIndex;
    this.durationMinutes = props.durationMinutes;
    this.completedExercises = props.completedExercises;
    this.feedback = props.feedback;
    this.date = props.date;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
