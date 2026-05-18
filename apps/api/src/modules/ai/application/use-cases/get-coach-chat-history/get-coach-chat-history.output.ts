export type GetCoachChatHistoryOutput = Array<{
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}>;
