import { availableRecoveryScreenFixture } from '../fixtures/recovery-screen.fixtures';
import {
  availableHistoryPointCount,
  formatRecoveryLocalDate,
  historyPointLabel,
} from './recovery-history-presentation';

describe('recovery history presentation', () => {
  it('formats local dates without shifting the canonical day', () => {
    expect(formatRecoveryLocalDate('2026-07-28')).toBe('Jul 28');
  });

  it('counts only available history points', () => {
    expect(
      availableHistoryPointCount(availableRecoveryScreenFixture.history),
    ).toBe(4);
  });

  it('provides a text alternative for history points', () => {
    expect(historyPointLabel(availableRecoveryScreenFixture.history[0])).toBe(
      'Jul 22, score 64',
    );
  });
});
