export type AuthUserProps = {
  id: string;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class AuthUser {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly isEmailVerified: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: AuthUserProps) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.isEmailVerified = props.isEmailVerified;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
