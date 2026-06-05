import { MongooseNotificationHistoryRepository } from './mongoose-notification-history.repository';

describe('MongooseNotificationHistoryRepository', () => {
  it('creates a history transition', async () => {
    const create = jest.fn().mockResolvedValue(buildDocument());
    const repository = new MongooseNotificationHistoryRepository({
      create,
    } as never);

    const result = await repository.create(buildInput());

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        notificationDecisionId: 'notification_123',
        previousStatus: 'planned',
        nextStatus: 'sent',
        reason: 'Delivered in app',
      }),
    );
    expect(result.id).toBe('history_123');
  });

  it('finds history by user with ordering and limit', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query: { limit: jest.Mock; exec: jest.Mock } = {} as never;
    query.limit = jest.fn().mockImplementation(() => query);
    query.exec = exec;
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseNotificationHistoryRepository({
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

  it('finds history by notification decision id', async () => {
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([buildDocument()]),
      }),
    });
    const repository = new MongooseNotificationHistoryRepository({
      find,
    } as never);

    const result = await repository.findManyByNotificationDecisionId(
      'notification_123',
    );

    expect(find).toHaveBeenCalledWith({ notificationDecisionId: 'notification_123' });
    expect(result[0].notificationDecisionId).toBe('notification_123');
  });

  it('preserves user isolation', async () => {
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([buildDocument()]),
      }),
    });
    const repository = new MongooseNotificationHistoryRepository({
      find,
    } as never);

    await repository.findManyByUserProfileId('profile_456');

    expect(find).toHaveBeenCalledWith({ userProfileId: 'profile_456' });
  });
});

function buildInput() {
  return {
    userProfileId: 'profile_123',
    notificationDecisionId: 'notification_123',
    previousStatus: 'planned' as const,
    nextStatus: 'sent' as const,
    reason: 'Delivered in app',
    occurredAt: new Date('2026-06-03T10:00:00.000Z'),
    metadata: {
      channel: 'in_app',
    },
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'history_123',
    },
    ...buildInput(),
  };
}
