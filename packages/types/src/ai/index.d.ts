export type SendCoachChatRequest = {
    message: string;
};
export type SendCoachChatResponse = {
    conversationId: string;
    reply: string;
};
export type CoachChatHistoryMessage = {
    role: "user" | "assistant";
    content: string;
    createdAt: string;
};
export type GetCoachChatHistoryQuery = {
    limit?: number;
};
export type CoachChatHistoryResponse = CoachChatHistoryMessage[];
