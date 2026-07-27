import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { DailyCheckIn } from '../../domain/entities/daily-check-in.entity';
import {
  DailyCheckInRepository,
  UpsertDailyCheckInRepositoryInput,
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

  async upsert(
    input: UpsertDailyCheckInRepositoryInput,
  ): Promise<DailyCheckIn> {
    const filter = this.buildDayFilter(input);
    const update = {
      $set: {
        localDate: input.localDate,
        timezone: input.timezone,
        energyLevel: input.energyLevel,
        sleepQuality: input.sleepQuality,
        muscleSoreness: input.muscleSoreness,
        motivationLevel: input.motivationLevel,
      },
      $setOnInsert: {
        userProfileId: input.userProfileId,
      },
    };

    try {
      const document = await this.dailyCheckInModel
        .findOneAndUpdate(filter, update, {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        })
        .exec();

      if (!document) {
        throw new Error('Daily check-in upsert returned no document.');
      }

      return this.toEntity(document as DailyCheckInDocument);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        const document = await this.dailyCheckInModel
          .findOneAndUpdate(filter, update, {
            new: true,
            runValidators: true,
          })
          .exec();

        if (document) {
          return this.toEntity(document as DailyCheckInDocument);
        }
      }

      throw error;
    }
  }

  async findByUserProfileIdAndLocalDate(input: {
    userProfileId: string;
    localDate: string;
    legacyDayStart?: Date;
    legacyDayEnd?: Date;
  }): Promise<DailyCheckIn | null> {
    const document = await this.dailyCheckInModel
      .findOne(this.buildDayFilter(input))
      .sort({ updatedAt: -1, createdAt: -1 })
      .exec();

    return document ? this.toEntity(document as DailyCheckInDocument) : null;
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
      localDate: document.localDate,
      timezone: document.timezone,
      energyLevel: document.energyLevel,
      sleepQuality: document.sleepQuality,
      muscleSoreness: document.muscleSoreness,
      motivationLevel: document.motivationLevel,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  private buildDayFilter(input: {
    userProfileId: string;
    localDate: string;
    legacyDayStart?: Date;
    legacyDayEnd?: Date;
  }): Record<string, unknown> {
    const filters: Array<Record<string, unknown>> = [
      { localDate: input.localDate },
    ];

    if (input.legacyDayStart && input.legacyDayEnd) {
      filters.push({
        localDate: { $exists: false },
        createdAt: {
          $gte: input.legacyDayStart,
          $lt: input.legacyDayEnd,
        },
      });
    }

    return {
      userProfileId: input.userProfileId,
      $or: filters,
    };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    );
  }
}
