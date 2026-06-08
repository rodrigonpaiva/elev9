import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { HabitRiskSignal as HabitRiskSignalEntity } from '../../domain/entities/habit-risk-signal.entity';
import {
  HabitRiskSignalQueryOptions,
  HabitRiskSignalRepository,
} from '../../domain/repositories/habit-risk-signal.repository';
import { HabitRiskLevelValueObject } from '../../domain/value-objects/habit-risk-level.value-object';
import {
  HABIT_RISK_SIGNAL_MODEL_NAME,
  HabitRiskSignalDocument,
  HabitRiskSignalSchemaClass,
} from './habit-risk-signal.schema';

@Injectable()
export class MongooseHabitRiskSignalRepository
  implements HabitRiskSignalRepository
{
  constructor(
    @InjectModel(HABIT_RISK_SIGNAL_MODEL_NAME)
    private readonly habitRiskSignalModel: Model<HabitRiskSignalSchemaClass>,
  ) {}

  async findManyByUserProfileId(
    userProfileId: string,
    options?: HabitRiskSignalQueryOptions,
  ): Promise<HabitRiskSignalEntity[]> {
    const query = this.habitRiskSignalModel
      .find({ userProfileId })
      .sort({ generatedAt: -1, createdAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();
    return documents.map((document) =>
      this.toEntity(document as HabitRiskSignalDocument),
    );
  }

  async createMany(
    input: HabitRiskSignalEntity[],
  ): Promise<HabitRiskSignalEntity[]> {
    if (input.length === 0) {
      return [];
    }

    const documents = await this.habitRiskSignalModel.insertMany(
      input.map((signal) => ({
        userProfileId: signal.userProfileId,
        type: signal.type,
        level: signal.level.value,
        title: signal.title,
        description: signal.description,
        generatedAt: signal.generatedAt,
        formulaVersion: signal.formulaVersion,
      })),
      { ordered: true },
    );

    return documents.map((document) =>
      this.toEntity(document as HabitRiskSignalDocument),
    );
  }

  async deleteByUserProfileId(userProfileId: string): Promise<void> {
    await this.habitRiskSignalModel.deleteMany({ userProfileId }).exec();
  }

  async findRecentByUserProfileId(
    userProfileId: string,
    options?: HabitRiskSignalQueryOptions,
  ): Promise<HabitRiskSignalEntity[]> {
    return this.findManyByUserProfileId(userProfileId, options);
  }

  private toEntity(document: HabitRiskSignalDocument): HabitRiskSignalEntity {
    return new HabitRiskSignalEntity({
      userProfileId: document.userProfileId,
      type: document.type,
      level: new HabitRiskLevelValueObject(document.level),
      title: document.title,
      description: document.description,
      generatedAt: document.generatedAt,
      formulaVersion: document.formulaVersion,
    });
  }
}
