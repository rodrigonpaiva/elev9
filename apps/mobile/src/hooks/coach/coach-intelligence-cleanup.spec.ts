import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd(), '..', '..');

describe('coach intelligence cleanup', () => {
  it('keeps local composition centralized in the canonical hook', () => {
    expect(
      readFileSync(
        resolve(ROOT, 'apps/mobile/src/hooks/coach/use-coach-intelligence.ts'),
        'utf8',
      ),
    ).toContain('buildCoachIntelligence(');

    expect(
      readFileSync(
        resolve(ROOT, 'apps/mobile/src/hooks/coach/coach-intelligence.ts'),
        'utf8',
      ),
    ).toContain('buildCoachIntelligence(');

    [
      'apps/mobile/src/hooks/use-dashboard.ts',
      'apps/mobile/src/hooks/use-coach-home.ts',
      'apps/mobile/src/hooks/use-coach-daily-briefing.ts',
      'apps/mobile/src/hooks/use-coach-insights.ts',
      'apps/mobile/src/hooks/use-coach-goal-guidance.ts',
      'apps/mobile/src/hooks/use-ask-coach.ts',
      'apps/mobile/src/hooks/use-coach-weekly-review.ts',
    ].forEach((relativePath) => {
      const source = readFileSync(resolve(ROOT, relativePath), 'utf8');

      expect(source).not.toContain('buildCoachIntelligence(');
      expect(source).not.toContain('buildCoachPersonaGuidance(');
      expect(source).not.toContain('buildCoachExplanation(');
    });
  });
});
