import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { IdempotentUpsertHelper } from '../../../../shared/concurrency';
import { UserBehaviorProfile } from '../../domain/entities/user-behavior-profile.entity';
import {
  UserBehaviorProfileRepository,
  UpsertUserBehaviorProfileRepositoryInput,
} from '../../domain/repositories/user-behavior-profile.repository';
import { CoachingStyleValueObject } from '../../domain/value-objects/coaching-style.value-object';
import { EngagementProfileValueObject } from '../../domain/value-objects/engagement-profile.value-object';
import { ResponsivenessLevelValueObject } from '../../domain/value-objects/responsiveness-level.value-object';
import {
  USER_BEHAVIOR_PROFILE_MODEL_NAME,
  type UserBehaviorProfileDocument,
  type UserBehaviorProfileSchemaClass,
} from './user-behavior-profile.schema';

@Injectable()
export class MongooseUserBehaviorProfileRepository implements UserBehaviorProfileRepository {
  constructor(
    @InjectModel(USER_BEHAVIOR_PROFILE_MODEL_NAME)
    private readonly userBehaviorProfileModel: Model<UserBehaviorProfileSchemaClass>,
  ) {}

  async findByUserProfileId(
    userProfileId: string,
  ): Promise<UserBehaviorProfile | null> {
    const document = await this.userBehaviorProfileModel
      .findOne({ userProfileId })
      .exec();

    return document
      ? this.toEntity(document as UserBehaviorProfileDocument)
      : null;
  }

  async upsertByUserProfileId(
    input: UpsertUserBehaviorProfileRepositoryInput,
  ): Promise<UserBehaviorProfile> {
    const now = new Date();

    try {
      const document = await this.userBehaviorProfileModel
        .findOneAndUpdate(
          { userProfileId: input.userProfileId },
          {
            $set: {
              preferredCoachingStyle: input.preferredCoachingStyle,
              notificationResponsiveness: input.notificationResponsiveness,
              goalResponsiveness: input.goalResponsiveness,
              recoveryResponsiveness: input.recoveryResponsiveness,
              habitResponsiveness: input.habitResponsiveness,
              engagementProfile: input.engagementProfile,
              riskOfDisengagement: input.riskOfDisengagement,
              formulaVersion: input.formulaVersion,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        )
        .exec();

      if (!document) {
        throw new Error('Failed to upsert user behavior profile.');
      }

      return this.toEntity(document as UserBehaviorProfileDocument);
    } catch (error) {
      return IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error,
        reload: async () => {
          const existingDocument = await this.userBehaviorProfileModel
            .findOne({ userProfileId: input.userProfileId })
            .exec();

          return existingDocument
            ? this.toEntity(existingDocument as UserBehaviorProfileDocument)
            : null;
        },
      });
    }
  }

  private toEntity(document: UserBehaviorProfileDocument): UserBehaviorProfile {
    return new UserBehaviorProfile({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      preferredCoachingStyle: new CoachingStyleValueObject(
        document.preferredCoachingStyle,
      ),
      notificationResponsiveness: new ResponsivenessLevelValueObject(
        document.notificationResponsiveness,
      ),
      goalResponsiveness: new ResponsivenessLevelValueObject(
        document.goalResponsiveness,
      ),
      recoveryResponsiveness: new ResponsivenessLevelValueObject(
        document.recoveryResponsiveness,
      ),
      habitResponsiveness: new ResponsivenessLevelValueObject(
        document.habitResponsiveness,
      ),
      engagementProfile: new EngagementProfileValueObject(
        document.engagementProfile,
      ),
      riskOfDisengagement: new ResponsivenessLevelValueObject(
        document.riskOfDisengagement,
      ),
      formulaVersion: document.formulaVersion,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
