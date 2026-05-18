import { MongooseCoachMessageRepository } from "./mongoose-coach-message.repository";

describe("MongooseCoachMessageRepository", () => {
  it("maps documents without metadata to valid coach messages", async () => {
    const create = jest.fn().mockResolvedValue({
      _id: { toString: () => "message_1" },
      conversationId: "conversation_1",
      role: "assistant",
      content: "Keep it light today.",
      createdAt: new Date("2026-05-18T10:00:00.000Z"),
    });
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: { toString: () => "message_2" },
              conversationId: "conversation_1",
              role: "user",
              content: "Should I train today?",
              createdAt: new Date("2026-05-18T09:59:59.000Z"),
            },
          ]),
        }),
      }),
    });

    const repository = new MongooseCoachMessageRepository({
      create,
      find,
    } as never);

    const created = await repository.create({
      conversationId: "conversation_1",
      role: "assistant",
      content: "Keep it light today.",
    });

    const history = await repository.findByConversationId({
      conversationId: "conversation_1",
      limit: 1,
    });

    expect(created.metadata).toBeUndefined();
    expect(history[0].metadata).toBeUndefined();
  });
});
