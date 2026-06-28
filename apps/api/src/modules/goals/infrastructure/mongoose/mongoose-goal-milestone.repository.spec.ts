import { GoalMilestone } from '../../domain/entities/goal-milestone.entity';
import { GoalMilestoneTypeValueObject } from '../../domain/value-objects/goal-milestone-type.value-object';
import { MongooseGoalMilestoneRepository } from './mongoose-goal-milestone.repository';

describe('MongooseGoalMilestoneRepository', () => {
  it('creates many milestones', async () => {
    const insertMany = jest.fn().mockResolvedValue([buildDocument()]);
    const repository = new MongooseGoalMilestoneRepository({
      insertMany,
    } as never);

    const result = await repository.createMany([buildEntity()]);

    expect(insertMany).toHaveBeenCalledWith(
      [
        {
          goalId: 'goal_123',
          type: 'weight_target',
          title: '25% goal milestone',
          targetValue: 25,
          achieved: false,
          achievedAt: undefined,
        },
      ],
      { ordered: true },
    );
    expect(result).toHaveLength(1);
  });

  it('finds milestones by goal id', async () => {
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([buildDocument()]),
      }),
    });
    const repository = new MongooseGoalMilestoneRepository({
      find,
    } as never);

    const result = await repository.findManyByGoalId('goal_123');

    expect(find).toHaveBeenCalledWith({ goalId: 'goal_123' });
    expect(result).toHaveLength(1);
  });

  it('marks a milestone as achieved', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument({ achieved: true })),
    });
    const repository = new MongooseGoalMilestoneRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.markAchieved(
      'goal_123',
      'weight_target',
      '2026-06-10T00:00:00.000Z',
    );

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { goalId: 'goal_123', type: 'weight_target' },
      {
        $set: {
          achieved: true,
          achievedAt: '2026-06-10T00:00:00.000Z',
          updatedAt: expect.any(Date),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
    expect(result?.achieved).toBe(true);
  });
});

function buildEntity() {
  return new GoalMilestone({
    goalId: 'goal_123',
    type: new GoalMilestoneTypeValueObject('weight_target'),
    title: '25% goal milestone',
    targetValue: 25,
    achieved: false,
  });
}

function buildDocument(overrides: { achieved?: boolean } = {}) {
  return {
    _id: {
      toString: () => 'milestone_123',
    },
    goalId: 'goal_123',
    type: 'weight_target',
    title: '25% goal milestone',
    targetValue: 25,
    achieved: overrides.achieved ?? false,
    achievedAt: overrides.achieved ? '2026-06-10T00:00:00.000Z' : undefined,
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  };
}
