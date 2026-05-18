export class GetHomeDashboardDebugResponseDto {
  generatedAt!: string;
  recovery!: {
    fatigueLevel: string;
    recoveryTrend: 'improving' | 'stable' | 'needs_recovery';
    recoverySignals: string[];
  };
  nutrition!: {
    priority: 'recovery' | 'consistency' | 'performance';
    signals: string[];
  };
}
