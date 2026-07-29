import { Injectable } from '@nestjs/common';

import { CoachChatContextLoaderService } from '../chat/coach-chat-context-loader.service';
import { AgentIntentClassifierService } from './agent-intent-classifier.service';
import { AgentContextSelectionPolicy } from './agent-context-selection.policy';
import { AgentPolicyEngineService } from './policies/agent-policy.engine.service';
import { AgentTraceService } from './observability/agent-trace.service';
import type {
  AgentContext,
  AgentContextDomain,
  AgentIntent,
  AgentRequest,
  AgentSafetyMetadata,
} from './agent.types';
import type {
  CoachChatConversationState,
  CoachChatLoadedContext,
} from '../../use-cases/create-coach-chat/create-coach-chat.types';

export type AgentContextOrchestrationMetadata = {
  detectedIntent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  selectedDomainCount: number;
  orchestrationDurationMs: number;
  rationale: string;
  policyDecision: {
    approved: boolean;
    blocked: boolean;
    fallbackRequired: boolean;
    allowedDomainCount: number;
    blockedDomainIds: AgentContextDomain[];
  };
};

export type AgentContextOrchestrationResult = {
  request: AgentRequest;
  context: AgentContext;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  metadata: AgentContextOrchestrationMetadata;
};

@Injectable()
export class AgentContextOrchestratorService {
  constructor(
    private readonly agentIntentClassifierService: AgentIntentClassifierService,
    private readonly agentContextSelectionPolicy: AgentContextSelectionPolicy,
    private readonly agentPolicyEngineService: AgentPolicyEngineService,
    private readonly coachChatContextLoaderService: CoachChatContextLoaderService,
    private readonly agentTraceService?: AgentTraceService,
  ) {}

  async orchestrate(
    request: AgentRequest,
    options: {
      conversationState: CoachChatConversationState;
    },
  ): Promise<AgentContextOrchestrationResult> {
    const startTime = Date.now();
    const classification = this.agentIntentClassifierService.classify({
      userMessage: request.userMessage,
    });
    this.agentTraceService?.recordEvent(request.sessionMetadata.requestId, {
      event: 'INTENT_CLASSIFIED',
      timestamp: new Date().toISOString(),
      summary: 'Classified the agent intent deterministically.',
      metadata: {
        intent: classification.intent,
        rationale: classification.rationale,
      },
    });
    const selectedDomains = this.agentContextSelectionPolicy.selectDomains(
      classification.intent,
    );
    const policyEvaluation = this.agentPolicyEngineService.evaluate({
      stage: 'CONTEXT',
      request,
      intent: classification.intent,
      selectedDomains,
      responseMode: request.streamingPreference ? 'stream' : 'standard',
      runtimeEnabled: true,
      toolsEnabled: true,
      llmEnabled: true,
    });
    const allowedDomains = policyEvaluation.decision.allowedDomains;
    const loadedContext = await this.coachChatContextLoaderService.load(
      request.sessionMetadata.authUserId,
      {
        domains: [...allowedDomains],
        userProfileId: request.sessionMetadata.userProfileId,
      },
    );
    const conversationState = options.conversationState;
    const context = this.buildAgentContext({
      request,
      classification,
      selectedDomains,
      conversationState,
      loadedContext,
    });
    const orchestrationDurationMs = Date.now() - startTime;
    this.agentTraceService?.recordEvent(request.sessionMetadata.requestId, {
      event: 'CONTEXT_SELECTED',
      timestamp: new Date().toISOString(),
      summary: 'Selected the required context domains.',
      metadata: {
        intent: classification.intent,
        selectedDomains: allowedDomains,
        selectedDomainCount: allowedDomains.length,
        orchestrationDurationMs,
      },
    });

    return {
      request,
      context,
      intent: classification.intent,
      selectedDomains: allowedDomains,
      metadata: {
        detectedIntent: classification.intent,
        selectedDomains: allowedDomains,
        selectedDomainCount: allowedDomains.length,
        orchestrationDurationMs,
        rationale: classification.rationale,
        policyDecision: {
          approved: policyEvaluation.decision.approved,
          blocked: policyEvaluation.decision.blocked,
          fallbackRequired: policyEvaluation.decision.fallbackRequired,
          allowedDomainCount: policyEvaluation.decision.allowedDomains.length,
          blockedDomainIds: [
            ...policyEvaluation.decision.metadata.blockedDomainIds,
          ],
        },
      },
    };
  }

  private buildAgentContext(input: {
    request: AgentRequest;
    classification: { intent: AgentIntent };
    selectedDomains: readonly AgentContextDomain[];
    conversationState: CoachChatConversationState;
    loadedContext: CoachChatLoadedContext;
  }): AgentContext {
    const selectedDomains = input.selectedDomains;
    const conversationMemory = selectedDomains.includes('conversation_memory')
      ? input.conversationState.conversationMemory
      : undefined;
    const recentMessages = selectedDomains.includes('recent_messages')
      ? input.conversationState.conversationHistory
      : [];
    const safetyMetadata = this.buildSafetyMetadata({
      promptVersion: input.request.promptVersion,
      rolloutMetadata: input.request.experimentMetadata,
    });

    return {
      intent: input.classification.intent,
      selectedDomains,
      healthContext: input.loadedContext.healthContext,
      ...(input.loadedContext.goalContext
        ? { goalContext: input.loadedContext.goalContext }
        : {}),
      ...(input.loadedContext.progress
        ? { progress: input.loadedContext.progress }
        : {}),
      ...(input.loadedContext.recoveryHistory
        ? { recoveryHistory: input.loadedContext.recoveryHistory }
        : {}),
      ...(input.loadedContext.nutritionContext
        ? { nutritionContext: input.loadedContext.nutritionContext }
        : {}),
      ...(input.loadedContext.habitHistory
        ? { habitHistory: input.loadedContext.habitHistory }
        : {}),
      ...(conversationMemory ? { conversationMemory } : {}),
      recentMessages,
      ...(input.loadedContext.coachDecision
        ? { coachDecision: input.loadedContext.coachDecision }
        : {}),
      ...(input.loadedContext.notification
        ? { notification: input.loadedContext.notification }
        : {}),
      ...(input.loadedContext.habit
        ? { habit: input.loadedContext.habit }
        : {}),
      ...(input.loadedContext.personalization
        ? { personalization: input.loadedContext.personalization }
        : {}),
      ...(input.loadedContext.notificationMemory
        ? { notificationMemory: input.loadedContext.notificationMemory }
        : {}),
      ...(input.loadedContext.habitMemory
        ? { habitMemory: input.loadedContext.habitMemory }
        : {}),
      ...(input.loadedContext.personalizationMemory
        ? { personalizationMemory: input.loadedContext.personalizationMemory }
        : {}),
      safetyMetadata,
      rolloutMetadata: input.request.experimentMetadata,
    };
  }

  private buildSafetyMetadata(input: {
    promptVersion: string;
    rolloutMetadata: AgentRequest['experimentMetadata'];
  }): AgentSafetyMetadata {
    return {
      deterministicFirst: true,
      toolCallingEnabled: input.rolloutMetadata.toolCallingEnabled,
      fallbackAllowed: true,
      promptVersion: input.promptVersion,
    };
  }
}
