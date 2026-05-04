export type CoachFeedbackProps = {
  id: string;
  userProfileId: string;
  message: string;
  insights: string[];
  recommendations: string[];
  createdAt: Date;
};

export class CoachFeedback {
  readonly id: string;
  readonly userProfileId: string;
  readonly message: string;
  readonly insights: string[];
  readonly recommendations: string[];
  readonly createdAt: Date;

  constructor(props: CoachFeedbackProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.message = props.message;
    this.insights = props.insights;
    this.recommendations = props.recommendations;
    this.createdAt = props.createdAt;
  }
}
