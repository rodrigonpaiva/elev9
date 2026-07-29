import { NutritionHistoryProjectionService } from './nutrition-history-projection.service';
import {
  NutritionHistoryQueryError,
  NutritionHistoryQueryService,
} from './nutrition-history-query.service';

describe('NutritionHistoryQueryService', () => {
  const userProfileRepository = {
    findByAuthUserId: jest.fn(),
  };
  const nutritionLogRepository = {
    findByUserProfileIdAndDateRange: jest.fn(),
    findByUserProfileIdAndDate: jest.fn(),
  };
  const nutritionPlanRepository = {
    findById: jest.fn(),
    findByIds: jest.fn(),
  };
  let service: NutritionHistoryQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NutritionHistoryQueryService(
      userProfileRepository as never,
      nutritionLogRepository as never,
      nutritionPlanRepository as never,
      new NutritionHistoryProjectionService(),
    );
    userProfileRepository.findByAuthUserId.mockResolvedValue({ id: 'profile_1' });
    nutritionLogRepository.findByUserProfileIdAndDateRange.mockResolvedValue([]);
    nutritionLogRepository.findByUserProfileIdAndDate.mockResolvedValue([]);
    nutritionPlanRepository.findByIds.mockResolvedValue([]);
  });

  it('rejects intervals larger than the bounded query window', async () => {
    await expect(service.getPage({
      authUserId: 'auth_1',
      from: '2026-01-01',
      to: '2026-04-02',
    })).rejects.toMatchObject<NutritionHistoryQueryError>({ code: 'RANGE_TOO_LARGE' });
    expect(userProfileRepository.findByAuthUserId).not.toHaveBeenCalled();
  });

  it('returns an opaque cursor and preserves user scoping', async () => {
    const result = await service.getPage({ authUserId: 'auth_1', from: '2026-06-01', to: '2026-06-02', limit: 1 });

    expect(result.pageInfo.nextCursor).toBeNull();
    expect(userProfileRepository.findByAuthUserId).toHaveBeenCalledWith('auth_1');
    expect(nutritionLogRepository.findByUserProfileIdAndDateRange).toHaveBeenCalledWith('profile_1', '2026-06-01', '2026-06-02');
  });

  it('rejects malformed cursors before querying history', async () => {
    await expect(service.getPage({ authUserId: 'auth_1', cursor: 'not-a-cursor' }))
      .rejects.toMatchObject<NutritionHistoryQueryError>({ code: 'INVALID_CURSOR' });
    expect(userProfileRepository.findByAuthUserId).not.toHaveBeenCalled();
  });

  it('returns no_data for a valid day without logs', async () => {
    const result = await service.getDay({ authUserId: 'auth_1', date: '2026-06-02' });
    expect(result.availability).toBe('no_data');
    expect(result.calories).toBeNull();
  });
});
