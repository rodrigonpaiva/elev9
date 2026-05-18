export type CoachConversationProps = {
  id: string;
  userProfileId: string;
  createdAt: Date;
  updatedAt: Date;
};

export class CoachConversation {
  readonly id: string;
  readonly userProfileId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: CoachConversationProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
