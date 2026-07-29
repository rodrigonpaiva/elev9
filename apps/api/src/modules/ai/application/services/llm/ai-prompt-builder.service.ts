import { Injectable } from '@nestjs/common';

import { CoachMessageRole } from '../../../domain/entities/coach-message.entity';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import {
  HabitPromptPayload,
  NotificationPromptPayload,
  PersonalizationPromptPayload,
} from '../../../../../shared/mappers';
import type { CoachExpertCompositionResult } from '../experts/composition/coach-expert-composition';
import type { CoachExplanation } from '../explainability/coach-explainability';
import type { CoachPersonaGuidance } from '../persona/coach-persona-engine';
import {
  FatigueLevel,
  UserHealthContext,
} from '../context-builder/build-user-health-context.service';
import { CoachDecisionReadModelPayload } from '../../../../../shared/mappers';
import { AiLlmMessage, AiLlmPrompt } from './ai-llm.types';
import {
  AI_COACH_CHAT_PROMPT_ID,
  AiRolloutAssignment,
} from '../governance/ai-governance.types';
import { AiPromptRegistryService } from '../governance/ai-prompt-registry.service';

export const AI_CHAT_PROMPT_VERSION = 'coach-chat-prompt-v1';

export type AiPromptBuilderConversationMessage = {
  role: CoachMessageRole;
  content: string;
  createdAt: string;
};

export type AiPromptBuilderConversationMemory = {
  summary: string;
  metadata: {
    generatedFromMessageCount: number;
    version: string;
  };
};

export type AiPromptBuilderInput = {
  message: string;
  healthContext: UserHealthContext;
  conversationHistory: AiPromptBuilderConversationMessage[];
  trace?: AiLlmPrompt['trace'];
  conversationMemory?: AiPromptBuilderConversationMemory;
  coachDecision?: CoachDecisionReadModelPayload;
  notification?: NotificationPromptPayload;
  habit?: HabitPromptPayload;
  personalization?: PersonalizationPromptPayload;
  experiment?: AiRolloutAssignment;
  composition?: CoachExpertCompositionResult;
  unifiedCoachIntelligence?: CoachExpertCompositionResult;
  personaGuidance?: CoachPersonaGuidance;
  explanation?: CoachExplanation;
};

export type AiPromptBuilderDebugSnapshot = {
  promptVersion: string;
  promptPreview: {
    systemSections: string[];
    userMessagePreview: string;
  };
  conversationMemory?: {
    version: string;
    generatedFromMessageCount: number;
    summaryPreview: string;
  };
  context: {
    fatigueLevel: FatigueLevel;
    recoveryTrend: 'improving' | 'stable' | 'needs_recovery';
    hasNutritionProfile: boolean;
    hasLatestCheckIn: boolean;
    recentWorkoutCount: number;
    recentConversationMessages: number;
  };
};

@Injectable()
export class AiPromptBuilder {
  constructor(
    private readonly promptRegistry: AiPromptRegistryService = new AiPromptRegistryService(),
  ) {}

  build(input: AiPromptBuilderInput): AiLlmPrompt {
    const promptDefinition = this.promptRegistry.getVersionMetadata(
      AI_COACH_CHAT_PROMPT_ID,
      input.experiment?.selectedPromptVersion,
    );
    const promptVersion =
      promptDefinition?.version ??
      this.promptRegistry.getCurrentVersion(AI_COACH_CHAT_PROMPT_ID) ??
      AI_CHAT_PROMPT_VERSION;

    const messages: AiLlmMessage[] = [
      {
        role: 'system',
        content: this.buildSystemInstructions(),
      },
      {
        role: 'system',
        content: this.buildContextBlock(input.healthContext),
      },
    ];

    const notificationBlock = this.buildNotificationBlock(input.notification);

    if (notificationBlock) {
      messages.push({
        role: 'system',
        content: notificationBlock,
      });
    }

    const unifiedCoachIntelligenceBlock =
      this.buildUnifiedCoachIntelligenceBlock(
        input.unifiedCoachIntelligence ?? input.composition,
      );

    if (unifiedCoachIntelligenceBlock) {
      messages.push({
        role: 'system',
        content: unifiedCoachIntelligenceBlock,
      });
    }

    const personaGuidanceBlock = this.buildPersonaGuidanceBlock(
      input.personaGuidance,
    );

    if (personaGuidanceBlock) {
      messages.push({
        role: 'system',
        content: personaGuidanceBlock,
      });
    }

    const explanationBlock = this.buildCoachExplanationBlock(input.explanation);

    if (explanationBlock) {
      messages.push({
        role: 'system',
        content: explanationBlock,
      });
    }

    const conversationMemoryBlock = this.buildConversationMemoryBlock(
      input.conversationMemory,
    );

    if (conversationMemoryBlock) {
      messages.push({
        role: 'system',
        content: conversationMemoryBlock,
      });
    }

    const coachDecisionBlock = this.buildCoachDecisionBlock(
      input.coachDecision,
    );

    if (coachDecisionBlock) {
      messages.push({
        role: 'system',
        content: coachDecisionBlock,
      });
    }

    const personalizationBlock = this.buildPersonalizationBlock(
      input.personalization,
    );

    if (personalizationBlock) {
      messages.push({
        role: 'system',
        content: personalizationBlock,
      });
    }

    const habitBlock = this.buildHabitBlock(input.habit);

    if (habitBlock) {
      messages.push({
        role: 'system',
        content: habitBlock,
      });
    }

    messages.push(
      ...input.conversationHistory.slice(-8).map((message) => ({
        role: message.role,
        content: this.normalizeContent(message.content),
      })),
    );

    messages.push({
      role: 'user',
      content: this.normalizeContent(input.message),
    });

    return {
      promptVersion,
      messages,
      trace: {
        ...(input.trace ?? {}),
        ...(input.experiment
          ? {
              experimentId: input.experiment.experimentId,
              canaryBucket: input.experiment.canaryBucket,
              rolloutVariant: input.experiment.rolloutVariant,
            }
          : {}),
      },
      metadata: {
        promptId: AI_COACH_CHAT_PROMPT_ID,
        promptReleaseDate: promptDefinition?.releaseDate,
        promptStatus: promptDefinition?.status,
        promptAuthor: promptDefinition?.author,
        promptDescription: promptDefinition?.description,
        experimentId: input.experiment?.experimentId,
        canaryBucket: input.experiment?.canaryBucket,
        canaryPercentage: input.experiment?.canaryPercentage,
        streamingEnabled: input.experiment?.streamingEnabled,
        structuredOutputsEnabled: input.experiment?.structuredOutputsEnabled,
        toolCallingEnabled: input.experiment?.toolCallingEnabled,
        futureMemoryEnabled: input.experiment?.futureMemoryEnabled,
        currentPromptVersion: input.experiment?.currentPromptVersion,
        previousPromptVersion: input.experiment?.previousPromptVersion,
        currentProvider: input.experiment?.currentProvider,
        previousProvider: input.experiment?.previousProvider,
        currentModel: input.experiment?.currentModel,
        previousModel: input.experiment?.previousModel,
        provider: input.experiment?.selectedProvider,
        model: input.experiment?.selectedModel,
      },
    };
  }

  buildDebugSnapshot(
    input: AiPromptBuilderInput,
  ): AiPromptBuilderDebugSnapshot {
    const recoveryTrend = this.resolveRecoveryTrend(input.healthContext);
    const conversationMemoryPreview = input.conversationMemory
      ? {
          version: input.conversationMemory.metadata.version,
          generatedFromMessageCount:
            input.conversationMemory.metadata.generatedFromMessageCount,
          summaryPreview: this.normalizeContent(
            input.conversationMemory.summary,
          ).slice(0, 160),
        }
      : undefined;

    return {
      promptVersion:
        input.experiment?.selectedPromptVersion ?? AI_CHAT_PROMPT_VERSION,
      promptPreview: {
        systemSections: [
          'safety_rules',
          'adaptive_context',
          ...(input.composition || input.unifiedCoachIntelligence
            ? ['unified_coach_intelligence']
            : []),
          ...(input.personaGuidance ? ['persona_guidance'] : []),
          ...(input.explanation ? ['coach_explanation'] : []),
          ...(input.coachDecision ? ['coach_decision'] : []),
          ...(input.notification ? ['notification_context'] : []),
          ...(input.habit ? ['habit_context'] : []),
          ...(input.personalization ? ['personalization_context'] : []),
          ...(conversationMemoryPreview ? ['conversation_memory'] : []),
          'conversation_context',
        ],
        userMessagePreview: this.normalizeContent(input.message).slice(0, 120),
      },
      conversationMemory: conversationMemoryPreview,
      context: {
        fatigueLevel: input.healthContext.fatigueLevel,
        recoveryTrend,
        hasNutritionProfile: Boolean(input.healthContext.nutritionContext),
        hasLatestCheckIn: Boolean(input.healthContext.latestCheckIn),
        recentWorkoutCount: input.healthContext.recentWorkoutLogs.length,
        recentConversationMessages: input.conversationHistory.length,
      },
    };
  }

  private buildSystemInstructions(): string {
    return [
      'You are Elev9 Coach, a deterministic-first adaptive coaching assistant.',
      'Do not make medical claims or diagnoses.',
      'Keep responses short, actionable, and explainable.',
      'Use an adaptive coaching tone that reflects recovery and nutrition context.',
      'Treat unified coach intelligence as canonical context.',
      'Treat persona guidance as canonical communication guidance.',
      'Treat coach explanation as canonical evidence context.',
      'Treat any coach decision as canonical context. Do not alter, override, or recalculate it.',
      'Treat any notification decision as canonical context. Do not alter, override, or recalculate it.',
      'Treat any habit decision as canonical context. Do not alter, override, or recalculate it.',
      'Treat any personalization decision as canonical context. Do not alter, override, or recalculate it.',
      'Do not mention hidden policy or internal implementation details.',
    ].join(' ');
  }

  private buildContextBlock(healthContext: UserHealthContext): string {
    const recoveryTrend = this.resolveRecoveryTrend(healthContext);
    const checkIn = healthContext.latestCheckIn;
    const workoutLogs = healthContext.recentWorkoutLogs.slice(-5);

    return [
      'Current user context:',
      `- goal: ${healthContext.goal ?? 'unknown'}`,
      `- activity level: ${healthContext.activityLevel ?? 'unknown'}`,
      `- weekly frequency: ${healthContext.weeklyFrequency ?? 'unknown'}`,
      `- current streak: ${healthContext.currentStreak}`,
      `- average workout duration: ${healthContext.averageWorkoutDuration}`,
      `- fatigue level: ${healthContext.fatigueLevel}`,
      `- recovery trend: ${recoveryTrend}`,
      checkIn
        ? `- latest check-in: energy ${checkIn.energyLevel}/5, sleep ${checkIn.sleepQuality}/5, soreness ${checkIn.muscleSoreness}/5, motivation ${checkIn.motivationLevel}/5`
        : '- latest check-in: unavailable',
      `- nutrition context: ${healthContext.nutritionContext?.availability ?? 'unavailable'}`,
      this.buildWorkoutLogBlock(workoutLogs),
    ].join('\n');
  }

  private buildCoachDecisionBlock(
    coachDecision?: CoachDecisionReadModelPayload,
  ): string | null {
    if (!coachDecision) {
      return null;
    }

    const influences = coachDecision.influences
      .slice(0, 6)
      .map((influence) => `  - ${influence.code}: ${influence.label}`);

    return [
      'Coach decision (canonical):',
      `- priority: ${coachDecision.priority}`,
      `- headline: ${this.normalizeContent(coachDecision.headline)}`,
      `- summary: ${this.normalizeContent(coachDecision.summary)}`,
      '- action items:',
      ...coachDecision.actionItems
        .slice(0, 3)
        .map((actionItem) => `  - ${this.normalizeContent(actionItem)}`),
      ...(influences.length > 0 ? ['- influences:', ...influences] : []),
      '- instruction: respect this decision as fixed context and do not change it.',
    ].join('\n');
  }

  private buildNotificationBlock(
    notification?: NotificationPromptPayload,
  ): string | null {
    if (!notification) {
      return null;
    }

    const current = notification.current;
    const engagementSummary = notification.engagementSummary;

    return [
      'Notifications (canonical):',
      current
        ? `- type: ${current.type}\n- priority: ${current.priority}\n- status: ${current.status}\n- suppressed: ${current.suppressed}\n- fatigue level: ${current.fatigueLevel}`
        : '- current: unavailable',
      engagementSummary
        ? [
            `- engagement score: ${engagementSummary.engagementScore}`,
            `- engagement fatigue: ${engagementSummary.fatigueLevel}`,
            `- recent events: ${engagementSummary.recentEventsCount}`,
            `- dismissed count: ${engagementSummary.dismissedCount}`,
          ].join('\n')
        : '- engagement summary: unavailable',
      '- instruction: do not recalculate notifications; treat the notification decision as canonical.',
    ].join('\n');
  }

  private buildUnifiedCoachIntelligenceBlock(
    composition?: CoachExpertCompositionResult,
  ): string | null {
    if (!composition) {
      return null;
    }

    return [
      'Unified coach intelligence (canonical):',
      `- primary expert: ${composition.primaryExpert?.id ?? 'none'}`,
      composition.participatingExperts.length > 0
        ? [
            '- participating experts:',
            ...composition.participatingExperts.map(
              (expert) =>
                `  - ${expert.expertId} | ${expert.role} | ${expert.sequence}`,
            ),
          ].join('\n')
        : '- participating experts: none',
      `- summary: ${this.normalizeContent(composition.summary)}`,
      composition.keyFindings.length > 0
        ? [
            '- key findings:',
            ...composition.keyFindings.map((finding) => `  - ${finding}`),
          ].join('\n')
        : '- key findings: none',
      composition.recommendations.length > 0
        ? [
            '- recommendations:',
            ...composition.recommendations.map(
              (recommendation) =>
                `  - ${recommendation.code} | ${recommendation.category} | ${this.normalizeContent(recommendation.summary)}`,
            ),
          ].join('\n')
        : '- recommendations: none',
      composition.risks.length > 0
        ? [
            '- risks:',
            ...composition.risks.map(
              (risk) =>
                `  - ${risk.level} | ${this.formatList([...risk.sources])} | ${this.normalizeContent(risk.summary)}`,
            ),
          ].join('\n')
        : '- risks: none',
      `- confidence: ${composition.confidence.level} | ${this.normalizeContent(composition.confidence.summary)}`,
      composition.conflicts.length > 0
        ? [
            '- conflicts:',
            ...composition.conflicts.map(
              (conflict) =>
                `  - ${conflict.type} | ${conflict.severity} | ${conflict.resolution.strategy}`,
            ),
          ].join('\n')
        : '- conflicts: none',
      composition.supportingExperts.length > 0
        ? [
            '- supporting experts:',
            ...composition.supportingExperts.map(
              (expert) => `  - ${expert.expertId}`,
            ),
          ].join('\n')
        : '- supporting experts: none',
      [
        '- metadata:',
        `  - request id: ${composition.metadata.requestId ?? 'none'}`,
        `  - intent: ${composition.metadata.intent}`,
        `  - selected domains: ${this.formatList([
          ...composition.metadata.selectedDomains,
        ])}`,
        `  - route confidence: ${composition.metadata.routeConfidence}`,
        `  - policy approved: ${composition.metadata.policyApproved}`,
        `  - policy blocked: ${composition.metadata.policyBlocked}`,
        `  - policy fallback required: ${composition.metadata.policyFallbackRequired}`,
        `  - runtime completeness: ${composition.metadata.runtimeCompleteness}`,
        `  - composition duration ms: ${composition.metadata.compositionDurationMs}`,
      ].join('\n'),
    ].join('\n');
  }

  private buildPersonaGuidanceBlock(
    personaGuidance?: CoachPersonaGuidance,
  ): string | null {
    if (!personaGuidance) {
      return null;
    }

    return [
      'Coach persona guidance (canonical):',
      `- tone: ${personaGuidance.tone}`,
      `- verbosity: ${personaGuidance.verbosity}`,
      `- focus: ${personaGuidance.focus}`,
      `- directive level: ${personaGuidance.directiveLevel}`,
      `- empathy level: ${personaGuidance.empathyLevel}`,
      `- encouragement level: ${personaGuidance.encouragementLevel}`,
      `- technical depth: ${personaGuidance.technicalDepth}`,
      `- urgency: ${personaGuidance.urgency}`,
      `- celebration level: ${personaGuidance.celebrationLevel}`,
      `- safety level: ${personaGuidance.safetyLevel}`,
      personaGuidance.communicationRules.length > 0
        ? [
            '- communication rules:',
            ...personaGuidance.communicationRules.map((rule) => `  - ${rule}`),
          ].join('\n')
        : '- communication rules: none',
      [
        '- metadata:',
        `  - request id: ${personaGuidance.metadata.requestId ?? 'none'}`,
        `  - intent: ${personaGuidance.metadata.intent}`,
        `  - selected domains: ${this.formatList([
          ...personaGuidance.metadata.selectedDomains,
        ])}`,
        `  - primary expert id: ${personaGuidance.metadata.primaryExpertId ?? 'none'}`,
        `  - participating expert ids: ${this.formatList([
          ...personaGuidance.metadata.participatingExpertIds,
        ])}`,
        `  - supporting expert ids: ${this.formatList([
          ...personaGuidance.metadata.supportingExpertIds,
        ])}`,
        `  - blocked expert ids: ${this.formatList([
          ...personaGuidance.metadata.blockedExpertIds,
        ])}`,
        `  - risk level: ${personaGuidance.metadata.riskLevel}`,
        `  - conflict count: ${personaGuidance.metadata.conflictCount}`,
        `  - recommendation count: ${personaGuidance.metadata.recommendationCount}`,
        `  - communication rule count: ${personaGuidance.metadata.communicationRuleCount}`,
        `  - runtime completeness: ${personaGuidance.metadata.runtimeCompleteness}`,
      ].join('\n'),
    ].join('\n');
  }

  private buildCoachExplanationBlock(
    explanation?: CoachExplanation,
  ): string | null {
    if (!explanation) {
      return null;
    }

    return [
      'Coach explanation (canonical):',
      `- primary expert: ${explanation.primaryExpertId ?? 'none'}`,
      explanation.participatingExperts.length > 0
        ? [
            '- participating experts:',
            ...explanation.participatingExperts.map(
              (expertId) => `  - ${expertId}`,
            ),
          ].join('\n')
        : '- participating experts: none',
      explanation.supportingExperts.length > 0
        ? [
            '- supporting experts:',
            ...explanation.supportingExperts.map(
              (expertId) => `  - ${expertId}`,
            ),
          ].join('\n')
        : '- supporting experts: none',
      explanation.evidence.length > 0
        ? [
            '- evidence:',
            ...explanation.evidence.map(
              (evidence) =>
                `  - ${evidence.type} | ${evidence.source} | ${evidence.expert ?? 'none'} | ${evidence.importance} | ${evidence.confidence} | ${evidence.availability}`,
            ),
          ].join('\n')
        : '- evidence: none',
      explanation.decisionReasons.length > 0
        ? [
            '- decision reasons:',
            ...explanation.decisionReasons.map(
              (reason) =>
                `  - ${reason.decisionType} | ${reason.code} | ${reason.reasonCategory} | ${reason.priority}`,
            ),
          ].join('\n')
        : '- decision reasons: none',
      explanation.recommendationReasons.length > 0
        ? [
            '- recommendation reasons:',
            ...explanation.recommendationReasons.map(
              (reason) =>
                `  - ${reason.recommendationCode} | ${reason.reasonCategory} | ${reason.priority}`,
            ),
          ].join('\n')
        : '- recommendation reasons: none',
      explanation.riskExplanations.length > 0
        ? [
            '- risk explanations:',
            ...explanation.riskExplanations.map(
              (risk) =>
                `  - ${risk.riskLevel} | ${risk.severity} | ${this.formatList([...risk.supportingExperts])}`,
            ),
          ].join('\n')
        : '- risk explanations: none',
      [
        '- confidence explanation:',
        `  - confidence: ${explanation.confidenceExplanation.confidence}`,
        `  - supporting evidence count: ${explanation.confidenceExplanation.supportingEvidenceCount}`,
        `  - supporting expert count: ${explanation.confidenceExplanation.supportingExpertCount}`,
        `  - missing evidence count: ${explanation.confidenceExplanation.missingEvidenceCount}`,
        `  - policy restrictions: ${this.formatList([
          ...explanation.confidenceExplanation.policyRestrictions,
        ])}`,
      ].join('\n'),
      explanation.conflictExplanations.length > 0
        ? [
            '- conflict explanations:',
            ...explanation.conflictExplanations.map(
              (conflict) =>
                `  - ${conflict.conflictType} | ${conflict.severity} | ${conflict.resolvedBy}`,
            ),
          ].join('\n')
        : '- conflict explanations: none',
      explanation.missingEvidence.length > 0
        ? [
            '- missing evidence:',
            ...explanation.missingEvidence.map(
              (item) =>
                `  - ${item.type} | ${item.source} | ${item.availability}`,
            ),
          ].join('\n')
        : '- missing evidence: none',
      [
        '- metadata:',
        `  - request id: ${explanation.metadata.requestId ?? 'none'}`,
        `  - intent: ${explanation.metadata.intent}`,
        `  - selected domains: ${this.formatList([
          ...explanation.metadata.selectedDomains,
        ])}`,
        `  - primary expert id: ${explanation.metadata.primaryExpertId ?? 'none'}`,
        `  - participating expert ids: ${this.formatList([
          ...explanation.metadata.participatingExpertIds,
        ])}`,
        `  - supporting expert ids: ${this.formatList([
          ...explanation.metadata.supportingExpertIds,
        ])}`,
        `  - evidence count: ${explanation.metadata.evidenceCount}`,
        `  - explanation count: ${explanation.metadata.explanationCount}`,
        `  - recommendation count: ${explanation.metadata.recommendationCount}`,
        `  - risk count: ${explanation.metadata.riskCount}`,
        `  - conflict count: ${explanation.metadata.conflictCount}`,
        `  - missing evidence count: ${explanation.metadata.missingEvidenceCount}`,
        `  - blocked expert count: ${explanation.metadata.blockedExpertCount}`,
        `  - blocked recommendation count: ${explanation.metadata.blockedRecommendationCount}`,
        `  - persona tone: ${explanation.metadata.personaTone}`,
        `  - persona focus: ${explanation.metadata.personaFocus}`,
        `  - persona safety level: ${explanation.metadata.personaSafetyLevel}`,
        `  - persona urgency: ${explanation.metadata.personaUrgency}`,
        `  - runtime completeness: ${explanation.metadata.runtimeCompleteness}`,
        `  - explanation version: ${explanation.metadata.explanationVersion}`,
      ].join('\n'),
    ].join('\n');
  }

  private buildHabitBlock(habit?: HabitPromptPayload): string | null {
    if (!habit) {
      return null;
    }

    const current = habit.current;
    const summary = habit.summary;
    const riskSignals = habit.riskSignals ?? [];

    if (!current && !summary && riskSignals.length === 0) {
      return null;
    }

    return [
      'Habits & Consistency (canonical):',
      current
        ? [
            `- consistency score: ${current.consistencyScore}`,
            `- trend: ${current.trend}`,
            `- current streak: ${current.streakDays}`,
          ].join('\n')
        : '- current: unavailable',
      summary
        ? [
            `- risk level: ${summary.riskLevel}`,
            `- longest streak: ${summary.longestStreak}`,
            `- adherence rate: ${summary.adherenceRate}`,
          ].join('\n')
        : '- summary: unavailable',
      riskSignals.length > 0
        ? [
            '- risk signals:',
            ...riskSignals.slice(0, 5).map((signal) => `  - ${signal.type}`),
          ].join('\n')
        : '- risk signals: none',
      '- instruction: do not recalculate consistency; treat Habit Engine outputs as canonical.',
    ].join('\n');
  }

  private buildPersonalizationBlock(
    personalization?: PersonalizationPromptPayload,
  ): string | null {
    if (!personalization) {
      return null;
    }

    return [
      'Personalization (canonical):',
      personalization.preferredCoachingStyle
        ? `- preferred coaching style: ${personalization.preferredCoachingStyle}`
        : '- preferred coaching style: unavailable',
      personalization.engagementProfile
        ? `- engagement profile: ${personalization.engagementProfile}`
        : '- engagement profile: unavailable',
      [
        `- notification responsiveness: ${personalization.notificationResponsiveness ?? 'unavailable'}`,
        `- goal responsiveness: ${personalization.goalResponsiveness ?? 'unavailable'}`,
        `- recovery responsiveness: ${personalization.recoveryResponsiveness ?? 'unavailable'}`,
        `- habit responsiveness: ${personalization.habitResponsiveness ?? 'unavailable'}`,
        `- risk of disengagement: ${personalization.riskOfDisengagement ?? 'unavailable'}`,
      ].join('\n'),
      personalization.topBehavioralPatterns.length > 0
        ? [
            '- top behavioral patterns:',
            ...personalization.topBehavioralPatterns
              .slice(0, 5)
              .map((pattern) => `  - ${pattern}`),
          ].join('\n')
        : '- top behavioral patterns: none',
      '- instruction: do not recalculate personalization. Treat Personalization Engine outputs as canonical.',
    ].join('\n');
  }

  private buildConversationMemoryBlock(
    conversationMemory?: AiPromptBuilderConversationMemory,
  ): string | null {
    if (!conversationMemory) {
      return null;
    }

    return [
      'Conversation memory summary:',
      `- version: ${conversationMemory.metadata.version}`,
      `- generated from message count: ${conversationMemory.metadata.generatedFromMessageCount}`,
      `- summary: ${this.normalizeContent(conversationMemory.summary)}`,
    ].join('\n');
  }

  private buildWorkoutLogBlock(workoutLogs: WorkoutLog[]): string {
    if (workoutLogs.length === 0) {
      return '- recent workout logs: none';
    }

    const lines = workoutLogs.map(
      (log) =>
        `  - ${log.date}: ${log.durationMinutes} min, ${log.completedExercises.length} exercises${log.feedback?.difficulty ? `, feedback ${log.feedback.difficulty}` : ''}`,
    );

    return ['- recent workout logs:', ...lines].join('\n');
  }

  private resolveRecoveryTrend(
    healthContext: Pick<UserHealthContext, 'fatigueLevel' | 'recoveryTrend'>,
  ): 'improving' | 'stable' | 'needs_recovery' {
    if (healthContext.recoveryTrend) {
      return healthContext.recoveryTrend;
    }

    switch (healthContext.fatigueLevel) {
      case 'LOW':
        return 'improving';
      case 'HIGH':
        return 'needs_recovery';
      case 'MODERATE':
      default:
        return 'stable';
    }
  }

  private formatList(values: string[] | undefined): string {
    if (!values || values.length === 0) {
      return 'none';
    }

    return values.join(', ');
  }

  private normalizeContent(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }
}
