export type DailyCheckInProps = {
  id: string;
  userProfileId: string;
  energyLevel: number;
  sleepQuality: number;
  muscleSoreness: number;
  motivationLevel: number;
  createdAt: Date;
  updatedAt: Date;
};

export class DailyCheckIn {
  readonly id: string;
  readonly userProfileId: string;
  readonly energyLevel: number;
  readonly sleepQuality: number;
  readonly muscleSoreness: number;
  readonly motivationLevel: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: DailyCheckInProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.energyLevel = props.energyLevel;
    this.sleepQuality = props.sleepQuality;
    this.muscleSoreness = props.muscleSoreness;
    this.motivationLevel = props.motivationLevel;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
