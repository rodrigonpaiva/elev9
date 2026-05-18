export type GetCoachChatHistoryResponseDto = Array<{
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}>;
