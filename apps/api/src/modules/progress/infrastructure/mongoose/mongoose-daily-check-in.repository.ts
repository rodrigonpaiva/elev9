import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { DailyCheckIn } from '../../domain/entities/daily-check-in.entity';
import {
  CreateDailyCheckInRepositoryInput,
  DailyCheckInRepository,
} from '../../domain/repositories/daily-check-in.repository';
import {
  DAILY_CHECK_IN_MODEL_NAME,
  DailyCheckInDocument,
  DailyCheckInSchemaClass,
} from './daily-check-in.schema';

@Injectable()
export class MongooseDailyCheckInRepository implements DailyCheckInRepository {
  constructor(
    @InjectModel(DAILY_CHECK_IN_MODEL_NAME)
    private readonly dailyCheckInModel: Model<DailyCheckInSchemaClass>,
  ) {}

  async create(
    input: CreateDailyCheckInRepositoryInput,
  ): Promise<DailyCheckIn> {
    const document = await this.dailyCheckInModel.create(input);

    return this.toEntity(document as DailyCheckInDocument);
  }

  async findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<DailyCheckIn | null> {
    const document = await this.dailyCheckInModel
      .findOne({ userProfileId })
      .sort({ createdAt: -1 })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as DailyCheckInDocument);
  }

  async findManyByUserProfileId(
    userProfileId: string,
  ): Promise<DailyCheckIn[]> {
    const documents = await this.dailyCheckInModel
      .find({ userProfileId })
      .sort({ createdAt: -1 })
      .exec();

    return documents.map((document) =>
      this.toEntity(document as DailyCheckInDocument),
    );
  }

  private toEntity(document: DailyCheckInDocument): DailyCheckIn {
    return new DailyCheckIn({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      energyLevel: document.energyLevel,
      sleepQuality: document.sleepQuality,
      muscleSoreness: document.muscleSoreness,
      motivationLevel: document.motivationLevel,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
