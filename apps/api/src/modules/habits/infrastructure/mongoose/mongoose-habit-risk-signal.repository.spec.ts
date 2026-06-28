import { HabitRiskSignal } from '../../domain/entities/habit-risk-signal.entity';
import { HabitRiskLevelValueObject } from '../../domain/value-objects/habit-risk-level.value-object';
import { MongooseHabitRiskSignalRepository } from './mongoose-habit-risk-signal.repository';

describe('MongooseHabitRiskSignalRepository', () => {
  it('creates many habit risk signals', async () => {
    const insertMany = jest.fn().mockResolvedValue([buildDocument()]);
    const repository = new MongooseHabitRiskSignalRepository({
      insertMany,
    } as never);

    const result = await repository.createMany([buildEntity()]);

    expect(insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          userProfileId: 'profile_123',
          type: 'dropout_risk',
          level: 'high',
          formulaVersion: 'habit-engine-v1',
        }),
      ],
      { ordered: true },
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('dropout_risk');
  });

  it('finds signals by user profile with ordering and limit', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query = {
      limit: jest.fn().mockReturnThis(),
      exec,
    };
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseHabitRiskSignalRepository({
      find,
    } as never);

    const result = await repository.findManyByUserProfileId('profile_123', {
      limit: 4,
    });

    expect(find).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(sort).toHaveBeenCalledWith({
      generatedAt: -1,
      createdAt: -1,
      _id: -1,
    });
    expect(query.limit).toHaveBeenCalledWith(4);
    expect(result).toHaveLength(1);
  });

  it('finds recent signals by user profile', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query = {
      limit: jest.fn().mockReturnThis(),
      exec,
    };
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseHabitRiskSignalRepository({
      find,
    } as never);

    const result = await repository.findRecentByUserProfileId('profile_123', {
      limit: 2,
    });

    expect(result).toHaveLength(1);
    expect(query.limit).toHaveBeenCalledWith(2);
  });

  it('deletes signals by user profile id', async () => {
    const deleteMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ acknowledged: true }),
    });
    const repository = new MongooseHabitRiskSignalRepository({
      deleteMany,
    } as never);

    await repository.deleteByUserProfileId('profile_123');

    expect(deleteMany).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
  });

  it('keeps user isolation when querying signals', async () => {
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });
    const repository = new MongooseHabitRiskSignalRepository({
      find,
    } as never);

    await repository.findManyByUserProfileId('another_profile');

    expect(find).toHaveBeenCalledWith({ userProfileId: 'another_profile' });
  });
});

function buildEntity() {
  return new HabitRiskSignal({
    userProfileId: 'profile_123',
    type: 'dropout_risk',
    level: new HabitRiskLevelValueObject('high'),
    title: 'Dropout risk detected',
    description:
      'Low consistency combined with a declining trend indicates dropout risk.',
    generatedAt: new Date('2026-06-03T00:00:00.000Z'),
    formulaVersion: 'habit-engine-v1',
  });
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'risk_signal_123',
    },
    userProfileId: 'profile_123',
    type: 'dropout_risk',
    level: 'high',
    title: 'Dropout risk detected',
    description:
      'Low consistency combined with a declining trend indicates dropout risk.',
    generatedAt: new Date('2026-06-03T00:00:00.000Z'),
    formulaVersion: 'habit-engine-v1',
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
  };
}
