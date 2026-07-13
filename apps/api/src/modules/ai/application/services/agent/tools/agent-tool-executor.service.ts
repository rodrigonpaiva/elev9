import { Inject, Injectable } from '@nestjs/common';

import {
  GOAL_FORECAST_REPOSITORY,
  GoalForecastRepository,
} from '../../../../../goals/domain/repositories/goal-forecast.repository';
import {
  GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
  GoalProgressSnapshotRepository,
} from '../../../../../goals/domain/repositories/goal-progress-snapshot.repository';
import {
  GOAL_REPOSITORY,
  GoalRepository,
} from '../../../../../goals/domain/repositories/goal.repository';
import {
  NUTRITION_PLAN_REPOSITORY,
  NutritionPlanRepository,
} from '../../../../../nutrition/domain/repositories/nutrition-plan.repository';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../../../recovery/domain/repositories/recovery-snapshot.repository';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
  AdaptiveTrainingRecommendationRepository,
} from '../../../../../training/domain/repositories/adaptive-training-recommendation.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../../users/domain/repositories/user-profile.repository';
import {
  COACH_CONVERSATION_MEMORY_REPOSITORY,
  CoachConversationMemoryRepository,
} from '../../../../domain/repositories/coach-conversation-memory.repository';
import { AgentRuntimeConfigService } from '../agent-runtime.config';
import { AgentTraceService } from '../observability/agent-trace.service';
import { AgentToolRegistryService } from './agent-tool-registry.service';
import { AgentToolExecutionError } from './agent-tool-execution.error';
import { AgentToolExecutionPolicy } from './agent-tool-execution.policy';
import type {
  AgentToolExecutionContext,
  AgentToolExecutionErrorCode,
  AgentToolExecutionMetrics,
  AgentToolExecutionOutcome,
  AgentToolExecutionResult,
} from './agent-tool-execution.types';
import type { AgentToolDescriptor } from './agent-tool.types';

@Injectable()
export class AgentToolExecutorService {
  constructor(
    private readonly config: AgentRuntimeConfigService,
    private readonly policy: AgentToolExecutionPolicy,
    private readonly toolRegistry: AgentToolRegistryService,
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY)
    private readonly adaptiveTrainingRecommendationRepository: AdaptiveTrainingRecommendationRepository,
    @Inject(NUTRITION_PLAN_REPOSITORY)
    private readonly nutritionPlanRepository: NutritionPlanRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepository: GoalRepository,
    @Inject(GOAL_PROGRESS_SNAPSHOT_REPOSITORY)
    private readonly goalProgressSnapshotRepository: GoalProgressSnapshotRepository,
    @Inject(GOAL_FORECAST_REPOSITORY)
    private readonly goalForecastRepository: GoalForecastRepository,
    @Inject(COACH_CONVERSATION_MEMORY_REPOSITORY)
    private readonly coachConversationMemoryRepository: CoachConversationMemoryRepository,
    private readonly agentTraceService?: AgentTraceService,
  ) {}

  async execute(
    input: AgentToolExecutionContext,
  ): Promise<AgentToolExecutionOutcome> {
    const startTime = Date.now();
    const enabled = this.config.isToolsEnabled();
    const maxToolCalls = this.config.getMaxToolCalls();
    const timeoutMs = this.config.getToolTimeoutMs();
    const selectedToolIds = input.plan.selectedTools.map((tool) => tool.id);
    const results: AgentToolExecutionResult[] = [];
    const executedToolIds: string[] = [];
    const skippedToolIds: string[] = [];
    const failedToolIds: string[] = [];
    const timeoutToolIds: string[] = [];
    const perToolDurationMs: Array<{ toolId: string; durationMs: number }> = [];
    let executedToolCount = 0;

    this.agentTraceService?.recordEvent(
      input.request.sessionMetadata.requestId,
      {
        event: 'TOOL_SELECTED',
        timestamp: new Date().toISOString(),
        summary: 'Selected candidate tools for bounded execution.',
        metadata: {
          candidateToolIds: input.plan.candidateTools.map((tool) => tool.id),
          selectedToolIds,
          enabled,
          maxToolCalls,
        },
      },
    );

    for (const plannedTool of input.plan.selectedTools) {
      const registryTool = this.toolRegistry.getTool(plannedTool.id);
      const decision = registryTool
        ? this.policy.evaluate({
            tool: registryTool,
            enabled,
            executedToolCount,
            maxToolCalls,
          })
        : {
            status: 'skipped' as const,
            resultStatus: 'SKIPPED' as const,
            errorCode: 'TOOL_NOT_REGISTERED' as const,
            summary: 'Tool is not registered in the execution registry.',
          };

      if (decision.status === 'skipped' || !registryTool) {
        const result = this.buildSkippedResult({
          toolId: plannedTool.id,
          errorCode: decision.errorCode,
          summary: decision.summary,
        });
        results.push(result);
        skippedToolIds.push(plannedTool.id);
        perToolDurationMs.push({ toolId: plannedTool.id, durationMs: 0 });
        this.agentTraceService?.recordEvent(
          input.request.sessionMetadata.requestId,
          {
            event: 'TOOL_SKIPPED',
            timestamp: new Date().toISOString(),
            summary: result.summary,
            metadata: {
              toolId: plannedTool.id,
              errorCode: result.errorCode,
              durationMs: result.durationMs,
            },
          },
        );
        continue;
      }

      const executionStart = Date.now();

      try {
        const data = await this.withTimeout(
          () => this.executeTool(registryTool, input),
          timeoutMs,
          registryTool.id,
        );
        const durationMs = Date.now() - executionStart;

        results.push(
          this.buildSuccessResult({
            toolId: registryTool.id,
            summary: data.summary,
            data: data.data,
            durationMs,
            metadata: data.metadata,
          }),
        );
        executedToolIds.push(registryTool.id);
        executedToolCount += 1;
        perToolDurationMs.push({ toolId: registryTool.id, durationMs });
        this.agentTraceService?.recordEvent(
          input.request.sessionMetadata.requestId,
          {
            event: 'TOOL_EXECUTED',
            timestamp: new Date().toISOString(),
            summary: data.summary,
            metadata: {
              toolId: registryTool.id,
              durationMs,
              status: 'SUCCESS',
            },
          },
        );
      } catch (error) {
        const durationMs = Date.now() - executionStart;
        const normalized = this.normalizeExecutionError(registryTool.id, error);

        results.push(
          this.buildFailedResult({
            toolId: registryTool.id,
            summary: normalized.summary,
            durationMs,
            errorCode: normalized.errorCode,
            metadata: normalized.metadata,
          }),
        );
        failedToolIds.push(registryTool.id);
        if (normalized.errorCode === 'TIMEOUT') {
          timeoutToolIds.push(registryTool.id);
        }
        executedToolCount += 1;
        perToolDurationMs.push({ toolId: registryTool.id, durationMs });
        this.agentTraceService?.recordEvent(
          input.request.sessionMetadata.requestId,
          {
            event: 'TOOL_EXECUTED',
            timestamp: new Date().toISOString(),
            summary: normalized.summary,
            metadata: {
              toolId: registryTool.id,
              durationMs,
              errorCode: normalized.errorCode,
              status: normalized.errorCode === 'TIMEOUT' ? 'TIMEOUT' : 'FAILED',
            },
          },
        );
      }
    }

    const totalDurationMs = Date.now() - startTime;
    this.agentTraceService?.recordToolSnapshot(
      input.request.sessionMetadata.requestId,
      {
        enabled,
        maxToolCalls,
        timeoutMs,
        candidateToolIds: input.plan.candidateTools.map((tool) => tool.id),
        selectedToolIds,
        executedToolIds,
        skippedToolIds,
        failedToolIds,
        timeoutToolIds,
        estimatedCost: input.plan.selectedTools.reduce(
          (total, tool) => total + tool.estimatedCost,
          0,
        ),
        estimatedLatencyMs: input.plan.selectedTools.reduce(
          (total, tool) => total + tool.estimatedLatencyMs,
          0,
        ),
        metrics: {
          enabled,
          maxToolCalls,
          timeoutMs,
          selectedToolCount: selectedToolIds.length,
          executedToolCount: executedToolIds.length + failedToolIds.length,
          skippedToolCount: skippedToolIds.length,
          failedToolCount: failedToolIds.length,
          timeoutCount: timeoutToolIds.length,
          totalDurationMs,
          selectedToolIds,
          executedToolIds,
          skippedToolIds,
          failedToolIds,
          timeoutToolIds,
          perToolDurationMs,
        },
        results: results.map((result) => ({
          toolId: result.toolId,
          status: result.status,
          summary: result.summary,
          durationMs: result.durationMs,
          ...(result.errorCode ? { errorCode: result.errorCode } : {}),
          metadata: result.metadata,
        })),
      },
    );

    return {
      results,
      metrics: {
        enabled,
        maxToolCalls,
        timeoutMs,
        selectedToolCount: selectedToolIds.length,
        executedToolCount: executedToolIds.length + failedToolIds.length,
        skippedToolCount: skippedToolIds.length,
        failedToolCount: failedToolIds.length,
        timeoutCount: timeoutToolIds.length,
        totalDurationMs,
        selectedToolIds,
        executedToolIds,
        skippedToolIds,
        failedToolIds,
        timeoutToolIds,
        perToolDurationMs,
      },
    };
  }

  private async executeTool(
    tool: AgentToolDescriptor,
    input: AgentToolExecutionContext,
  ): Promise<{
    summary: string;
    data: unknown;
    metadata: Record<string, unknown>;
  }> {
    switch (tool.id) {
      case 'UserProfileTool':
        return this.executeUserProfileTool(input);
      case 'TrainingTool':
        return this.executeTrainingTool(input);
      case 'NutritionTool':
        return this.executeNutritionTool(input);
      case 'RecoveryTool':
        return this.executeRecoveryTool(input);
      case 'GoalTool':
        return this.executeGoalTool(input);
      case 'ConversationMemoryTool':
        return this.executeConversationMemoryTool(input);
      default:
        throw new AgentToolExecutionError(
          tool.id,
          'TOOL_NOT_SUPPORTED',
          'Tool is not supported by the execution pipeline.',
        );
    }
  }

  private async executeUserProfileTool(
    input: AgentToolExecutionContext,
  ): Promise<{
    summary: string;
    data: unknown;
    metadata: Record<string, unknown>;
  }> {
    const userProfile = await this.userProfileRepository.findByAuthUserId(
      input.request.sessionMetadata.authUserId,
    );

    if (!userProfile) {
      return {
        summary: 'User profile was not found.',
        data: null,
        metadata: {
          source: 'user-profile-repository',
          readOnly: true,
          emptyResult: true,
        },
      };
    }

    return {
      summary: 'Loaded user profile context.',
      data: {
        userProfile: this.normalizeUserProfile(userProfile),
      },
      metadata: {
        source: 'user-profile-repository',
        readOnly: true,
        emptyResult: false,
      },
    };
  }

  private async executeTrainingTool(input: AgentToolExecutionContext): Promise<{
    summary: string;
    data: unknown;
    metadata: Record<string, unknown>;
  }> {
    const recommendation =
      await this.adaptiveTrainingRecommendationRepository.findLatestByUserProfileId(
        input.request.sessionMetadata.userProfileId,
      );

    if (!recommendation) {
      return {
        summary: 'No adaptive training recommendation was found.',
        data: null,
        metadata: {
          source: 'adaptive-training-recommendation-repository',
          readOnly: true,
          emptyResult: true,
        },
      };
    }

    return {
      summary: 'Loaded training context.',
      data: {
        adaptiveTrainingRecommendation:
          this.normalizeAdaptiveTrainingRecommendation(recommendation),
      },
      metadata: {
        source: 'adaptive-training-recommendation-repository',
        readOnly: true,
        emptyResult: false,
      },
    };
  }

  private async executeNutritionTool(
    input: AgentToolExecutionContext,
  ): Promise<{
    summary: string;
    data: unknown;
    metadata: Record<string, unknown>;
  }> {
    const nutritionPlan =
      await this.nutritionPlanRepository.findActiveByUserProfileId(
        input.request.sessionMetadata.userProfileId,
      );

    if (!nutritionPlan) {
      return {
        summary: 'No active nutrition plan was found.',
        data: null,
        metadata: {
          source: 'nutrition-plan-repository',
          readOnly: true,
          emptyResult: true,
        },
      };
    }

    return {
      summary: 'Loaded nutrition context.',
      data: {
        nutritionPlan: this.normalizeNutritionPlan(nutritionPlan),
      },
      metadata: {
        source: 'nutrition-plan-repository',
        readOnly: true,
        emptyResult: false,
      },
    };
  }

  private async executeRecoveryTool(input: AgentToolExecutionContext): Promise<{
    summary: string;
    data: unknown;
    metadata: Record<string, unknown>;
  }> {
    const recoverySnapshot =
      await this.recoverySnapshotRepository.findLatestByUserProfileId(
        input.request.sessionMetadata.userProfileId,
      );

    if (!recoverySnapshot) {
      return {
        summary: 'No recovery snapshot was found.',
        data: null,
        metadata: {
          source: 'recovery-snapshot-repository',
          readOnly: true,
          emptyResult: true,
        },
      };
    }

    return {
      summary: 'Loaded recovery context.',
      data: {
        recoverySnapshot: this.normalizeRecoverySnapshot(recoverySnapshot),
      },
      metadata: {
        source: 'recovery-snapshot-repository',
        readOnly: true,
        emptyResult: false,
      },
    };
  }

  private async executeGoalTool(input: AgentToolExecutionContext): Promise<{
    summary: string;
    data: unknown;
    metadata: Record<string, unknown>;
  }> {
    const goal = await this.goalRepository.findActiveByUserProfileId(
      input.request.sessionMetadata.userProfileId,
    );

    if (!goal) {
      return {
        summary: 'No active goal was found.',
        data: null,
        metadata: {
          source: 'goal-repository',
          readOnly: true,
          emptyResult: true,
        },
      };
    }

    const [progressSnapshot, forecast] = await Promise.all([
      this.goalProgressSnapshotRepository.findLatestByGoalId(goal.id),
      this.goalForecastRepository.findByGoalId(goal.id),
    ]);

    return {
      summary: 'Loaded goal context.',
      data: {
        goal: goal.toJSON(),
        ...(progressSnapshot
          ? { progressSnapshot: progressSnapshot.toJSON() }
          : {}),
        ...(forecast ? { forecast: forecast.toJSON() } : {}),
      },
      metadata: {
        source: 'goal-repository',
        readOnly: true,
        emptyResult: false,
        hasProgressSnapshot: Boolean(progressSnapshot),
        hasForecast: Boolean(forecast),
      },
    };
  }

  private async executeConversationMemoryTool(
    input: AgentToolExecutionContext,
  ): Promise<{
    summary: string;
    data: unknown;
    metadata: Record<string, unknown>;
  }> {
    const conversationMemory =
      await this.coachConversationMemoryRepository.findByConversationId(
        input.request.conversationId,
      );

    return {
      summary: conversationMemory
        ? 'Loaded conversation memory.'
        : 'No conversation memory was found.',
      data: {
        conversationMemory: conversationMemory
          ? {
              conversationId: conversationMemory.conversationId,
              summary: conversationMemory.summary,
              metadata: conversationMemory.metadata,
            }
          : null,
        recentMessagesCount: input.conversationState.conversationHistory.length,
        recentMessagesPreview: input.conversationState.conversationHistory
          .slice(-3)
          .map((message) => ({
            role: message.role,
            content: this.truncate(message.content, 160),
            createdAt: message.createdAt,
          })),
      },
      metadata: {
        source: 'coach-conversation-memory-repository',
        readOnly: true,
        emptyResult: !conversationMemory,
      },
    };
  }

  private normalizeUserProfile(userProfile: {
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
  }): Record<string, unknown> {
    return {
      id: userProfile.id,
      authUserId: userProfile.authUserId,
      name: userProfile.name,
      ...(userProfile.birthDate
        ? { birthDate: userProfile.birthDate.toISOString() }
        : {}),
      ...(userProfile.gender ? { gender: userProfile.gender } : {}),
      language: userProfile.language,
      timezone: userProfile.timezone,
      status: userProfile.status,
      createdAt: userProfile.createdAt.toISOString(),
      updatedAt: userProfile.updatedAt.toISOString(),
    };
  }

  private normalizeNutritionPlan(plan: {
    id: string;
    userProfileId: string;
    nutritionProfileId: string;
    fitnessProfileId: string;
    status: 'active' | 'archived' | 'replaced';
    weekStartDate: string;
    weekEndDate: string;
    macroTargets: Record<string, unknown>;
    days: Array<{
      date: string;
      dayIndex: number;
      meals: Array<{
        id: string;
        name: string;
        mealType: string;
        calories: number;
      }>;
      dailyMacroTargets: Record<string, unknown>;
    }>;
    generatedBy: 'deterministic';
    sourceContext?: Record<string, unknown>;
    createdAt: Date;
    updatedAt?: Date;
    replacedAt?: Date;
  }): Record<string, unknown> {
    return {
      id: plan.id,
      userProfileId: plan.userProfileId,
      nutritionProfileId: plan.nutritionProfileId,
      fitnessProfileId: plan.fitnessProfileId,
      status: plan.status,
      weekStartDate: plan.weekStartDate,
      weekEndDate: plan.weekEndDate,
      macroTargets: plan.macroTargets,
      dayCount: plan.days.length,
      daysPreview: plan.days.slice(0, 2).map((day) => ({
        date: day.date,
        dayIndex: day.dayIndex,
        mealCount: day.meals.length,
        dailyMacroTargets: day.dailyMacroTargets,
      })),
      generatedBy: plan.generatedBy,
      ...(plan.sourceContext ? { sourceContext: plan.sourceContext } : {}),
      createdAt: plan.createdAt.toISOString(),
      ...(plan.updatedAt ? { updatedAt: plan.updatedAt.toISOString() } : {}),
      ...(plan.replacedAt ? { replacedAt: plan.replacedAt.toISOString() } : {}),
    };
  }

  private normalizeAdaptiveTrainingRecommendation(recommendation: {
    id: string;
    userProfileId: string;
    trainingPlanId?: string;
    date: string;
    recommendationType: string;
    recommendedIntensity: string;
    volumeAction: string;
    reasoning: string;
    influences: Array<{
      toJSON(): Record<string, unknown>;
    }>;
    sourceContext: Record<string, unknown>;
    formulaVersion: string;
    generatedBy: 'deterministic';
    createdAt: Date;
    updatedAt: Date;
  }): Record<string, unknown> {
    return {
      id: recommendation.id,
      userProfileId: recommendation.userProfileId,
      ...(recommendation.trainingPlanId
        ? { trainingPlanId: recommendation.trainingPlanId }
        : {}),
      date: recommendation.date,
      recommendationType: recommendation.recommendationType,
      recommendedIntensity: recommendation.recommendedIntensity,
      volumeAction: recommendation.volumeAction,
      reasoning: recommendation.reasoning,
      influences: recommendation.influences.map((influence) =>
        influence.toJSON(),
      ),
      sourceContext: recommendation.sourceContext,
      formulaVersion: recommendation.formulaVersion,
      generatedBy: recommendation.generatedBy,
      createdAt: recommendation.createdAt.toISOString(),
      updatedAt: recommendation.updatedAt.toISOString(),
    };
  }

  private normalizeRecoverySnapshot(snapshot: {
    userProfileId: string;
    date: string;
    readinessScore: number;
    fatigueScore: number;
    recoveryTrend: string;
    recommendedIntensity: string;
    influences: Array<{
      toJSON(): Record<string, unknown>;
    }>;
    formulaVersion: string;
    sourceContext: Record<string, unknown>;
    createdAt: Date;
  }): Record<string, unknown> {
    return {
      userProfileId: snapshot.userProfileId,
      date: snapshot.date,
      readinessScore: snapshot.readinessScore,
      fatigueScore: snapshot.fatigueScore,
      recoveryTrend: snapshot.recoveryTrend,
      recommendedIntensity: snapshot.recommendedIntensity,
      influences: snapshot.influences.map((influence) => influence.toJSON()),
      formulaVersion: snapshot.formulaVersion,
      sourceContext: snapshot.sourceContext,
      createdAt: snapshot.createdAt.toISOString(),
    };
  }

  private buildSkippedResult(input: {
    toolId: string;
    errorCode?: AgentToolExecutionErrorCode;
    summary: string;
  }): AgentToolExecutionResult {
    return {
      toolId: input.toolId,
      status: 'SKIPPED',
      summary: input.summary,
      data: null,
      durationMs: 0,
      ...(input.errorCode ? { errorCode: input.errorCode } : {}),
      metadata: {
        readOnly: true,
      },
    };
  }

  private buildSuccessResult(input: {
    toolId: string;
    summary: string;
    data: unknown;
    durationMs: number;
    metadata: Record<string, unknown>;
  }): AgentToolExecutionResult {
    return {
      toolId: input.toolId,
      status: 'SUCCESS',
      summary: input.summary,
      data: input.data,
      durationMs: input.durationMs,
      metadata: input.metadata,
    };
  }

  private buildFailedResult(input: {
    toolId: string;
    summary: string;
    durationMs: number;
    errorCode: AgentToolExecutionErrorCode;
    metadata: Record<string, unknown>;
  }): AgentToolExecutionResult {
    return {
      toolId: input.toolId,
      status: input.errorCode === 'TIMEOUT' ? 'TIMEOUT' : 'FAILED',
      summary: input.summary,
      data: null,
      durationMs: input.durationMs,
      errorCode: input.errorCode,
      metadata: input.metadata,
    };
  }

  private normalizeExecutionError(
    toolId: string,
    error: unknown,
  ): {
    errorCode: AgentToolExecutionErrorCode;
    summary: string;
    metadata: Record<string, unknown>;
  } {
    if (error instanceof AgentToolExecutionError) {
      return {
        errorCode: error.code,
        summary: error.message,
        metadata: {
          toolId: error.toolId,
          ...(error.details ? { details: error.details } : {}),
        },
      };
    }

    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        errorCode: 'TIMEOUT',
        summary: 'Tool execution timed out.',
        metadata: {
          toolId,
        },
      };
    }

    if (
      error instanceof Error &&
      error.message === 'Tool execution timed out.'
    ) {
      return {
        errorCode: 'TIMEOUT',
        summary: error.message,
        metadata: {
          toolId,
        },
      };
    }

    return {
      errorCode: 'EXECUTION_FAILED',
      summary: 'Tool execution failed.',
      metadata: {
        toolId,
        errorName: error instanceof Error ? error.name : typeof error,
      },
    };
  }

  private async withTimeout<T>(
    handler: () => Promise<T>,
    timeoutMs: number,
    toolId: string,
  ): Promise<T> {
    return await Promise.race([
      handler(),
      new Promise<T>((_, reject) => {
        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          reject(
            new AgentToolExecutionError(
              toolId,
              'TIMEOUT',
              'Tool execution timed out.',
            ),
          );
        }, timeoutMs);
      }),
    ]);
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 1)}…`;
  }
}
