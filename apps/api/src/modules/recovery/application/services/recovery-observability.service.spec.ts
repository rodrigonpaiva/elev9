import { RecoveryObservabilityService } from './recovery-observability.service';

describe('RecoveryObservabilityService', () => {
  it('emits only low-cardinality operational metadata', () => {
    const service = new RecoveryObservabilityService();
    const logger = (service as unknown as { logger: { log: jest.Mock } }).logger;
    logger.log = jest.fn();

    service.recordCurrentRequest('success', 12);
    service.recordHistoryRequest('expected_empty', 8);
    service.recordRebuild('failure');
    service.recordLegacySnapshot();

    expect(logger.log).toHaveBeenCalledTimes(4);
    for (const [payload] of logger.log.mock.calls) {
      expect(payload).not.toHaveProperty('userProfileId');
      expect(payload).not.toHaveProperty('score');
      expect(payload).not.toHaveProperty('category');
      expect(payload).not.toHaveProperty('sourceContext');
      expect(payload).not.toHaveProperty('response');
    }
  });

  it('uses separate technical signals for Coach Recovery outcomes', () => {
    const service = new RecoveryObservabilityService();
    const logger = (service as unknown as { logger: { log: jest.Mock } }).logger;
    logger.log = jest.fn();

    service.recordCoachContext('fallback');

    expect(logger.log).toHaveBeenCalledWith({
      event: 'coach_recovery_context_fallback',
      operation: 'recovery',
    });
  });
});
