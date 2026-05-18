export type CoachConversationMemoryMetadata = {
  generatedFromMessageCount: number;
  version: string;
};

export type CoachConversationMemoryProps = {
  id: string;
  conversationId: string;
  summary: string;
  metadata: CoachConversationMemoryMetadata;
  createdAt: Date;
  updatedAt: Date;
};

export class CoachConversationMemory {
  readonly id: string;
  readonly conversationId: string;
  readonly summary: string;
  readonly metadata: CoachConversationMemoryMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: CoachConversationMemoryProps) {
    this.id = props.id;
    this.conversationId = props.conversationId;
    this.summary = props.summary;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
