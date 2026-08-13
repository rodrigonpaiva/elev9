import {
  availableRecoveryScreenFixture,
  errorRecoveryScreenFixture,
  insufficientDataRecoveryScreenFixture,
  legacyRecoveryScreenFixture,
  notAvailableRecoveryScreenFixture,
  processingFailedRecoveryScreenFixture,
  staleRecoveryScreenFixture,
} from '../fixtures/recovery-screen.fixtures';

describe('Recovery screen state fixtures', () => {
  it('represents the available state with server-owned values', () => {
    expect(availableRecoveryScreenFixture.status).toBe('available');
    expect(availableRecoveryScreenFixture.current.category).toBe('good');
    expect(availableRecoveryScreenFixture.trend.direction).toBe('improving');
  });

  it('preserves stale and legacy freshness states', () => {
    expect(staleRecoveryScreenFixture.current.freshness).toBe('stale');
    expect(legacyRecoveryScreenFixture.current.freshness).toBe('legacy');
  });

  it('keeps non-available states explicit', () => {
    expect(insufficientDataRecoveryScreenFixture.status).toBe(
      'insufficient_data',
    );
    expect(notAvailableRecoveryScreenFixture.status).toBe('not_available');
    expect(processingFailedRecoveryScreenFixture.status).toBe(
      'processing_failed',
    );
    expect(errorRecoveryScreenFixture.status).toBe('error');
  });
});
