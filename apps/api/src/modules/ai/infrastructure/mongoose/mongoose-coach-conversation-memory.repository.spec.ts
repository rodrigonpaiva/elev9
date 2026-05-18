import { MongooseCoachConversationMemoryRepository } from "./mongoose-coach-conversation-memory.repository";

describe("MongooseCoachConversationMemoryRepository", () => {
  it("upserts a single memory document per conversation", async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: {
          toString: () => "memory_123",
        },
        conversationId: "conversation_123",
        summary: "goal=gain_muscle; fatigue=HIGH",
        metadata: {
          generatedFromMessageCount: 2,
          version: "memory-v1",
        },
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:00:00.000Z"),
      }),
    });

    const repository = new MongooseCoachConversationMemoryRepository(
      {
        findOneAndUpdate,
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as never,
    );

    const result = await repository.upsertByConversationId({
      conversationId: "conversation_123",
      summary: "goal=gain_muscle; fatigue=HIGH",
      metadata: {
        generatedFromMessageCount: 2,
        version: "memory-v1",
      },
    });

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { conversationId: "conversation_123" },
      {
        $set: {
          summary: "goal=gain_muscle; fatigue=HIGH",
          metadata: {
            generatedFromMessageCount: 2,
            version: "memory-v1",
          },
        },
        $setOnInsert: {
          conversationId: "conversation_123",
        },
      },
      expect.objectContaining({
        upsert: true,
        new: true,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: "memory_123",
        conversationId: "conversation_123",
        summary: "goal=gain_muscle; fatigue=HIGH",
      }),
    );
  });
});
