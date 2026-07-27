import { MongooseDailyCheckInRepository } from './mongoose-daily-check-in.repository';
import { DailyCheckInSchema } from './daily-check-in.schema';

describe('MongooseDailyCheckInRepository', () => {
  it('uses an atomic local-day upsert', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseDailyCheckInRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsert({
      userProfileId: 'profile_123',
      localDate: '2026-05-04',
      timezone: 'UTC',
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    });

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        $or: expect.arrayContaining([{ localDate: '2026-05-04' }]),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ localDate: '2026-05-04' }),
      }),
      expect.objectContaining({ new: true, upsert: true }),
    );
    expect(result.localDate).toBe('2026-05-04');
  });

  it('re-reads after a duplicate-key race instead of creating another record', async () => {
    const findOneAndUpdate = jest
      .fn()
      .mockReturnValueOnce({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      })
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(buildDocument()),
      });
    const repository = new MongooseDailyCheckInRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsert({
      userProfileId: 'profile_123',
      localDate: '2026-05-04',
      timezone: 'UTC',
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    });

    expect(findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(result.id).toBe('checkin_123');
  });

  it('declares a partial unique index for canonical records', () => {
    const indexes = DailyCheckInSchema.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        [
          { localDate: 1, userProfileId: 1 },
          expect.objectContaining({
            unique: true,
            partialFilterExpression: { localDate: { $exists: true } },
          }),
        ],
      ]),
    );
  });
});

function buildDocument() {
  return {
    _id: { toString: () => 'checkin_123' },
    userProfileId: 'profile_123',
    localDate: '2026-05-04',
    timezone: 'UTC',
    energyLevel: 4,
    sleepQuality: 3,
    muscleSoreness: 2,
    motivationLevel: 5,
    createdAt: new Date('2026-05-04T10:00:00.000Z'),
    updatedAt: new Date('2026-05-04T10:00:00.000Z'),
  };
}
