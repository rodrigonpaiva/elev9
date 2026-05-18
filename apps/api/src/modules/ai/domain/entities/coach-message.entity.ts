export type CoachMessageRole = "user" | "assistant";

export type CoachMessageProps = {
  id: string;
  conversationId: string;
  role: CoachMessageRole;
  content: string;
  createdAt: Date;
};

export class CoachMessage {
  readonly id: string;
  readonly conversationId: string;
  readonly role: CoachMessageRole;
  readonly content: string;
  readonly createdAt: Date;

  constructor(props: CoachMessageProps) {
    this.id = props.id;
    this.conversationId = props.conversationId;
    this.role = props.role;
    this.content = props.content;
    this.createdAt = props.createdAt;
  }
}
