import { Injectable, Logger } from '@nestjs/common';

type RecoveryRequestResult = 'success' | 'expected_empty' | 'technical_failure';
type RecoveryRebuildResult = 'attempt' | 'success' | 'failure';

/**
 * Recovery operational signals deliberately contain no account, health, or
 * response data. It is a thin adapter over the existing structured logger;
 * a metrics exporter can consume these events later without changing domain
 * or controller code.
 */
@Injectable()
export class RecoveryObservabilityService {
  private readonly logger = new Logger(RecoveryObservabilityService.name);

  recordCurrentRequest(result: RecoveryRequestResult, durationMs: number): void {
    this.record('recovery_current_request', { result, durationMs });
  }

  recordHistoryRequest(result: RecoveryRequestResult, durationMs: number): void {
    this.record('recovery_history_request', { result, durationMs });
  }

  recordRebuild(result: RecoveryRebuildResult): void {
    this.record(`recovery_rebuild_${result}`, {});
  }

  recordLegacySnapshot(): void {
    this.record('recovery_legacy_snapshot_encountered', {});
  }

  recordTrend(result: 'computed' | 'insufficient_data' | 'failed'): void {
    this.record(`recovery_trend_${result}`, {});
  }

  recordReadModelMappingFailure(): void {
    this.record('recovery_read_model_mapping_failed', {});
  }

  recordCoachContext(result: 'available' | 'fallback' | 'failure'): void {
    this.record(`coach_recovery_context_${result}`, {});
  }

  private record(event: string, metadata: Record<string, string | number>): void {
    this.logger.log({
      event,
      operation: 'recovery',
      ...metadata,
    });
  }
}
