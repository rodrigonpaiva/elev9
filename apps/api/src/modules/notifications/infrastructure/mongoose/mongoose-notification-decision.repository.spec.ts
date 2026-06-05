import { MongooseNotificationDecisionRepository } from './mongoose-notification-decision.repository';

describe('MongooseNotificationDecisionRepository', () => {
  it('creates or upserts a daily decision', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseNotificationDecisionRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsertDailyDecision(buildInput());

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { userProfileId: 'profile_123', date: '2026-06-03' },
      expect.objectContaining({
        $set: expect.objectContaining({
          type: 'recovery_alert',
          priority: 'urgent',
          channel: 'in_app',
          status: 'planned',
          title: 'Recovery needed today',
          formulaVersion: 'notification-engine-v1',
          suppressed: false,
          suppressionReasons: [],
          fatigueLevel: 'low',
        }),
      }),
      expect.objectContaining({
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }),
    );
    expect(result.id).toBe('notification_123');
    expect(result.suppressed).toBe(false);
    expect(result.suppressionReasons).toEqual([]);
    expect(result.fatigueLevel).toBe('low');
  });

  it('returns the persisted decision when the upsert hits a duplicate key', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseNotificationDecisionRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertDailyDecision(buildInput());

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      date: '2026-06-03',
    });
    expect(result.id).toBe('notification_123');
  });

  it('finds a decision by date', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseNotificationDecisionRepository({
      findOne,
    } as never);

    const result = await repository.findByUserProfileIdAndDate(
      'profile_123',
      '2026-06-03',
    );

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      date: '2026-06-03',
    });
    expect(result?.sourceContext.formulaVersion).toBe('notification-engine-v1');
  });

  it('finds the latest decision by canonical ordering', async () => {
    const findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(buildDocument()),
      }),
    });
    const repository = new MongooseNotificationDecisionRepository({
      findOne,
    } as never);

    const result = await repository.findLatestByUserProfileId('profile_123');

    expect(findOne).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(
      findOne.mock.results[0].value.sort,
    ).toHaveBeenCalledWith({ date: -1, createdAt: -1, _id: -1 });
    expect(result?.priority.value).toBe('urgent');
  });

  it('finds history with canonical ordering and limit', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query: { limit: jest.Mock; exec: jest.Mock } = {} as never;
    query.limit = jest.fn().mockImplementation(() => query);
    query.exec = exec;
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseNotificationDecisionRepository({
      find,
    } as never);

    const result = await repository.findManyByUserProfileId('profile_123', {
      limit: 1,
    });

    expect(find).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(sort).toHaveBeenCalledWith({
      date: -1,
      createdAt: -1,
      _id: -1,
    });
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(result).toHaveLength(1);
  });

  it('finds a decision by id', async () => {
    const findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseNotificationDecisionRepository({
      findById,
    } as never);

    const result = await repository.findById('notification_123');

    expect(findById).toHaveBeenCalledWith('notification_123');
    expect(result?.actionLabel).toBe('Recover today');
  });

  it('updates the notification status', async () => {
    const findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...buildDocument(),
        status: 'opened',
      }),
    });
    const repository = new MongooseNotificationDecisionRepository({
      findByIdAndUpdate,
    } as never);

    const result = await repository.updateStatus('notification_123', 'opened');

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'notification_123',
      {
        $set: {
          status: 'opened',
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
    expect(result?.status.value).toBe('opened');
  });

  it('preserves influences and source context', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseNotificationDecisionRepository({
      findOne,
    } as never);

    const result = await repository.findByUserProfileIdAndDate(
      'profile_123',
      '2026-06-03',
    );

    expect(result?.influences).toHaveLength(2);
    expect(result?.influences[0].code).toBe('HIGH_FATIGUE');
    expect(result?.sourceContext.formulaVersion).toBe('notification-engine-v1');
  });

  it('preserves suppression fields', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...buildDocument(),
        suppressed: true,
        suppressionReasons: ['daily_cap_reached'],
        fatigueLevel: 'high',
      }),
    });
    const repository = new MongooseNotificationDecisionRepository({
      findOne,
    } as never);

    const result = await repository.findByUserProfileIdAndDate(
      'profile_123',
      '2026-06-03',
    );

    expect(result?.suppressed).toBe(true);
    expect(result?.suppressionReasons).toEqual(['daily_cap_reached']);
    expect(result?.fatigueLevel).toBe('high');
  });
});

function buildInput() {
  return {
    userProfileId: 'profile_123',
    date: '2026-06-03',
    type: 'recovery_alert' as const,
    priority: 'urgent' as const,
    channel: 'in_app' as const,
    status: 'planned' as const,
    title: 'Recovery needed today',
    message: 'Recovery is the priority today.',
    actionLabel: 'Recover today',
    actionTarget: 'recovery.today',
    influences: [
      {
        code: 'HIGH_FATIGUE',
        label: 'High fatigue',
        impact: 'negative' as const,
        source: 'recovery' as const,
        value: 92,
      },
      {
        code: 'LOW_READINESS',
        label: 'Low readiness',
        impact: 'negative' as const,
        source: 'recovery' as const,
        value: 20,
      },
    ],
    sourceContext: {
      formulaVersion: 'notification-engine-v1',
      generatedAt: '2026-06-03T00:00:00.000Z',
      readinessScore: 20,
      fatigueScore: 92,
    },
    suppressed: false,
    suppressionReasons: [],
    fatigueLevel: 'low' as const,
    formulaVersion: 'notification-engine-v1',
    generatedBy: 'deterministic' as const,
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'notification_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  };
}
