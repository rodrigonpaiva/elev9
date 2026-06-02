export class CalculateMacroTargetsResponseDto {
  macroTargets!: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    formulaVersion: string;
    activityMultiplier: number;
    goalAdjustment: number;
    calculatedAt: string;
  };
}
