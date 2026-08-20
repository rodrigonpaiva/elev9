import { CoachIntelligenceObservabilityService } from './coach-intelligence.observability.service';

describe('CoachIntelligenceObservabilityService', () => {
  it('stores only non-reversible identity references in traces', () => {
    const service = new CoachIntelligenceObservabilityService();
    const trace = service.startTrace({
      requestId: 'request-123',
      authUserId: 'auth-user-private',
      userProfileId: 'profile-private',
    });

    expect(JSON.stringify(trace)).not.toContain('auth-user-private');
    expect(JSON.stringify(trace)).not.toContain('profile-private');
    expect(trace.authUserId).toMatch(/^redacted-[a-f0-9]{16}$/);
    expect(trace.userProfileId).toMatch(/^redacted-[a-f0-9]{16}$/);
  });
});
