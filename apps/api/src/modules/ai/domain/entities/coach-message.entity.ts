export type CoachMessageRole = "user" | "assistant";

export type CoachMessageProps = {
  id: string;
  conversationId: string;
  role: CoachMessageRole;
  content: string;
  createdAt: Date;
  metadata?: CoachMessageMetadata;
};

export type CoachMessageMetadata = {
  source?: "heuristic" | "llm";
  provider?: string;
  model?: string;
  promptVersion?: string;
};

export class CoachMessage {
  readonly id: string;
  readonly conversationId: string;
  readonly role: CoachMessageRole;
  readonly content: string;
  readonly createdAt: Date;
  readonly metadata?: CoachMessageMetadata;

  constructor(props: CoachMessageProps) {
    this.id = props.id;
    this.conversationId = props.conversationId;
    this.role = props.role;
    this.content = props.content;
    this.createdAt = props.createdAt;
    this.metadata = props.metadata;
  }
}
