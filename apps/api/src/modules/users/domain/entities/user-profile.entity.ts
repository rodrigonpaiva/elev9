export type UserProfileProps = {
  id: string;
  authUserId: string;
  name: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  language: 'en-US';
  timezone: 'UTC';
  status: 'active';
  createdAt: Date;
  updatedAt: Date;
};

export class UserProfile {
  readonly id: string;
  readonly authUserId: string;
  readonly name: string;
  readonly birthDate?: Date;
  readonly gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  readonly language: 'en-US';
  readonly timezone: 'UTC';
  readonly status: 'active';
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProfileProps) {
    this.id = props.id;
    this.authUserId = props.authUserId;
    this.name = props.name;
    this.birthDate = props.birthDate;
    this.gender = props.gender;
    this.language = props.language;
    this.timezone = props.timezone;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
