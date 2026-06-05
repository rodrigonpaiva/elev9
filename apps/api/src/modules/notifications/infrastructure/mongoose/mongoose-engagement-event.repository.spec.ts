import { MongooseEngagementEventRepository } from './mongoose-engagement-event.repository';

describe('MongooseEngagementEventRepository', () => {
  it('creates an engagement event', async () => {
    const create = jest.fn().mockResolvedValue(buildDocument());
    const repository = new MongooseEngagementEventRepository({
      create,
    } as never);

    const result = await repository.create(buildInput());

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        notificationDecisionId: 'notification_123',
        type: 'opened',
      }),
    );
    expect(result.id).toBe('event_123');
  });

  it('finds events by user with ordering and limit', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query: { limit: jest.Mock; exec: jest.Mock } = {} as never;
    query.limit = jest.fn().mockImplementation(() => query);
    query.exec = exec;
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseEngagementEventRepository({
      find,
    } as never);

    const result = await repository.findManyByUserProfileId('profile_123', {
      limit: 1,
    });

    expect(find).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(sort).toHaveBeenCalledWith({
      occurredAt: -1,
      _id: -1,
    });
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(result).toHaveLength(1);
  });

  it('finds events by notification decision id', async () => {
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([buildDocument()]),
      }),
    });
    const repository = new MongooseEngagementEventRepository({
      find,
    } as never);

    const result = await repository.findManyByNotificationDecisionId(
      'notification_123',
    );

    expect(find).toHaveBeenCalledWith({ notificationDecisionId: 'notification_123' });
    expect(result[0].type).toBe('opened');
  });

  it('finds recent events by user', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query: { limit: jest.Mock; exec: jest.Mock } = {} as never;
    query.limit = jest.fn().mockImplementation(() => query);
    query.exec = exec;
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseEngagementEventRepository({
      find,
    } as never);

    const result = await repository.findRecentByUserProfileId('profile_123', {
      limit: 1,
    });

    expect(result).toHaveLength(1);
  });

  it('preserves metadata and user isolation', async () => {
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([buildDocument()]),
      }),
    });
    const repository = new MongooseEngagementEventRepository({
      find,
    } as never);

    const result = await repository.findManyByUserProfileId('profile_456');

    expect(find).toHaveBeenCalledWith({ userProfileId: 'profile_456' });
    expect(result[0].metadata).toEqual({
      surface: 'dashboard',
    });
  });
});

function buildInput() {
  return {
    userProfileId: 'profile_123',
    notificationDecisionId: 'notification_123',
    type: 'opened' as const,
    occurredAt: new Date('2026-06-03T12:00:00.000Z'),
    metadata: {
      surface: 'dashboard',
    },
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'event_123',
    },
    ...buildInput(),
  };
}
