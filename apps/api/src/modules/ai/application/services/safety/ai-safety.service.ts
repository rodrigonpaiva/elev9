import { Inject, Injectable, Logger } from '@nestjs/common';

import { AiLlmConfigService } from '../llm/ai-llm-config.service';
import { AiLlmMessage, AiLlmPrompt } from '../llm/ai-llm.types';
import { AI_SAFETY_METRICS, AiSafetyMetrics } from './ai-safety-metrics';
import {
  AiPromptInjectionAssessment,
  AiSafetyClassification,
  AiSafetyMetadata,
  AiSafetyPreparedPrompt,
  AiSafetyValidationResult,
} from './ai-safety.types';
import { AiPromptInjectionDetectorService } from './ai-prompt-injection-detector.service';

const SAFETY_VERSION = 'ai-safety-v1';
const CONTEXT_VERSION = 'user-health-context-v1';
const MAX_SYSTEM_MESSAGES = 8;
const MAX_CONVERSATION_MESSAGES = 6;
const MAX_CONTEXT_MESSAGE_CHARS = 1800;

@Injectable()
export class AiSafetyService {
  private readonly logger = new Logger(AiSafetyService.name);

  constructor(
    private readonly config: AiLlmConfigService,
    private readonly detector: AiPromptInjectionDetectorService,
    @Inject(AI_SAFETY_METRICS)
    private readonly metrics: AiSafetyMetrics,
  ) {}

  preparePrompt(prompt: AiLlmPrompt): AiSafetyPreparedPrompt {
    const sanitizedMessages = prompt.messages.map((message) =>
      this.sanitizeMessage(message),
    );
    const assessment = this.detector.assess(
      this.buildInspectionText(prompt.messages),
    );
    const promptClassification = this.resolvePromptClassification(assessment);
    const shouldBlock = this.shouldBlockPrompt(assessment);
    const minimized = this.minimizeMessages(sanitizedMessages);
    const promptSizeChars = this.countPromptChars(minimized.messages);
    const contextSizeChars = this.countPromptChars(
      minimized.messages.slice(0, -1),
    );
    const redactionCount = sanitizedMessages.reduce(
      (total, message) => total + message.redactionCount,
      0,
    );
    const metadata = this.buildMetadata({
      promptVersion: prompt.promptVersion,
      provider: prompt.metadata?.provider ?? this.config.getProvider(),
      model: prompt.metadata?.model ?? this.config.getModel(),
      promptId: prompt.metadata?.promptId,
      promptReleaseDate: prompt.metadata?.promptReleaseDate,
      promptStatus: prompt.metadata?.promptStatus,
      promptAuthor: prompt.metadata?.promptAuthor,
      promptDescription: prompt.metadata?.promptDescription,
      promptSizeChars,
      contextSizeChars,
      redactionCount,
      removedMessageCount: minimized.removedMessageCount,
      assessment,
      classification: shouldBlock ? 'BLOCKED' : promptClassification,
      experimentId: prompt.metadata?.experimentId,
      canaryBucket: prompt.metadata?.canaryBucket,
      canaryPercentage: prompt.metadata?.canaryPercentage,
      streamingEnabled: prompt.metadata?.streamingEnabled,
      structuredOutputsEnabled: prompt.metadata?.structuredOutputsEnabled,
      toolCallingEnabled: prompt.metadata?.toolCallingEnabled,
      futureMemoryEnabled: prompt.metadata?.futureMemoryEnabled,
      currentPromptVersion: prompt.metadata?.currentPromptVersion,
      previousPromptVersion: prompt.metadata?.previousPromptVersion,
      currentProvider: prompt.metadata?.currentProvider,
      previousProvider: prompt.metadata?.previousProvider,
      currentModel: prompt.metadata?.currentModel,
      previousModel: prompt.metadata?.previousModel,
    });

    this.metrics.recordPromptSize({
      promptVersion: metadata.promptVersion,
      safetyVersion: metadata.safetyVersion,
      contextVersion: metadata.contextVersion,
      provider: metadata.provider,
      model: metadata.model,
      promptSizeChars,
      contextSizeChars,
      redactionCount,
      removedMessageCount: minimized.removedMessageCount,
    });
    this.metrics.recordContextSize({
      promptVersion: metadata.promptVersion,
      safetyVersion: metadata.safetyVersion,
      contextVersion: metadata.contextVersion,
      provider: metadata.provider,
      model: metadata.model,
      promptSizeChars,
      contextSizeChars,
      redactionCount,
      removedMessageCount: minimized.removedMessageCount,
    });

    if (redactionCount > 0) {
      this.metrics.recordPIIRedaction({
        promptVersion: metadata.promptVersion,
        safetyVersion: metadata.safetyVersion,
        contextVersion: metadata.contextVersion,
        provider: metadata.provider,
        model: metadata.model,
        promptSizeChars,
        contextSizeChars,
        redactionCount,
        removedMessageCount: minimized.removedMessageCount,
      });
    }

    if (assessment.riskScore > 0) {
      this.metrics.recordInjectionAttempt({
        promptVersion: metadata.promptVersion,
        safetyVersion: metadata.safetyVersion,
        contextVersion: metadata.contextVersion,
        provider: metadata.provider,
        model: metadata.model,
        promptSizeChars,
        contextSizeChars,
        redactionCount,
        removedMessageCount: minimized.removedMessageCount,
        riskLevel: assessment.riskLevel,
        classification: promptClassification,
      });
    }

    if (shouldBlock) {
      this.metrics.recordBlockedPrompt({
        promptVersion: metadata.promptVersion,
        safetyVersion: metadata.safetyVersion,
        contextVersion: metadata.contextVersion,
        provider: metadata.provider,
        model: metadata.model,
        promptSizeChars,
        contextSizeChars,
        redactionCount,
        removedMessageCount: minimized.removedMessageCount,
        riskLevel: assessment.riskLevel,
        classification: 'BLOCKED',
        reason: `risk:${assessment.riskLevel}`,
      });
    }

    return {
      prompt: {
        ...prompt,
        messages: minimized.messages,
        trace: prompt.trace,
        metadata: {
          ...(prompt.metadata ?? {}),
          safetyVersion: SAFETY_VERSION,
          contextVersion: CONTEXT_VERSION,
          timestamp: metadata.timestamp,
        },
      },
      metadata,
      blocked: shouldBlock,
      assessment,
    };
  }

  validateOutput(
    output: string,
    metadata: AiSafetyMetadata,
  ): AiSafetyValidationResult {
    const normalized = this.normalizeOutput(output);
    const maxResponseChars = this.config.getMaxResponseChars();

    if (!normalized) {
      return this.rejectOutput(metadata, 'empty_output', normalized.length);
    }

    if (normalized.length < 12 || this.wordCount(normalized) < 3) {
      return this.rejectOutput(metadata, 'too_short', normalized.length);
    }

    if (normalized.length > maxResponseChars) {
      return this.rejectOutput(metadata, 'oversized_output', normalized.length);
    }

    if (this.containsControlCharacters(output)) {
      return this.rejectOutput(
        metadata,
        'control_characters',
        normalized.length,
      );
    }

    if (this.looksLikeRawJson(normalized)) {
      return this.rejectOutput(metadata, 'raw_json', normalized.length);
    }

    if (this.containsLeakage(normalized)) {
      return this.rejectOutput(metadata, 'prompt_leakage', normalized.length);
    }

    if (this.isGarbled(normalized)) {
      return this.rejectOutput(metadata, 'garbled_output', normalized.length);
    }

    const classification = this.resolveOutputClassification(normalized);

    return {
      allowed: true,
      classification,
    };
  }

  private buildMetadata(input: {
    promptVersion: string;
    provider: string;
    model: string;
    promptId?: string;
    promptReleaseDate?: string;
    promptStatus?: string;
    promptAuthor?: string;
    promptDescription?: string;
    experimentId?: string;
    canaryBucket?: number;
    canaryPercentage?: number;
    streamingEnabled?: boolean;
    structuredOutputsEnabled?: boolean;
    toolCallingEnabled?: boolean;
    futureMemoryEnabled?: boolean;
    currentPromptVersion?: string;
    previousPromptVersion?: string;
    currentProvider?: string;
    previousProvider?: string;
    currentModel?: string;
    previousModel?: string;
    promptSizeChars: number;
    contextSizeChars: number;
    redactionCount: number;
    removedMessageCount: number;
    assessment: AiPromptInjectionAssessment;
    classification: AiSafetyClassification;
  }): AiSafetyMetadata {
    return {
      promptVersion: input.promptVersion,
      promptId: input.promptId,
      promptReleaseDate: input.promptReleaseDate,
      promptStatus: input.promptStatus,
      promptAuthor: input.promptAuthor,
      promptDescription: input.promptDescription,
      safetyVersion: SAFETY_VERSION,
      contextVersion: CONTEXT_VERSION,
      provider: input.provider,
      model: input.model,
      timestamp: new Date().toISOString(),
      experimentId: input.experimentId,
      canaryBucket: input.canaryBucket,
      canaryPercentage: input.canaryPercentage,
      streamingEnabled:
        input.streamingEnabled ?? this.config.isStreamingEnabled(),
      structuredOutputsEnabled:
        input.structuredOutputsEnabled ??
        this.config.isStructuredOutputsEnabled(),
      toolCallingEnabled:
        input.toolCallingEnabled ?? this.config.isToolCallingEnabled(),
      futureMemoryEnabled:
        input.futureMemoryEnabled ?? this.config.isFutureMemoryEnabled(),
      currentPromptVersion:
        input.currentPromptVersion ?? this.config.getPromptVersion(),
      previousPromptVersion:
        input.previousPromptVersion ?? this.config.getPreviousPromptVersion(),
      currentProvider: input.currentProvider ?? this.config.getProvider(),
      previousProvider:
        input.previousProvider ?? this.config.getPreviousProvider(),
      currentModel: input.currentModel ?? this.config.getModel(),
      previousModel: input.previousModel ?? this.config.getPreviousModel(),
      promptSizeChars: input.promptSizeChars,
      contextSizeChars: input.contextSizeChars,
      riskLevel: input.assessment.riskLevel,
      classification: input.classification,
      redactionCount: input.redactionCount,
      removedMessageCount: input.removedMessageCount,
    };
  }

  private minimizeMessages(messages: SanitizedMessage[]): {
    messages: AiLlmMessage[];
    removedMessageCount: number;
  } {
    const systemMessages = messages.filter(
      (message) => message.role === 'system',
    );
    const conversationMessages = messages.filter(
      (message) => message.role !== 'system',
    );
    const deduplicatedConversation =
      this.dedupeConsecutiveMessages(conversationMessages);
    let prunedSystem =
      this.dedupeConsecutiveMessages(systemMessages).slice(
        -MAX_SYSTEM_MESSAGES,
      );
    let prunedConversation = deduplicatedConversation.slice(
      -MAX_CONVERSATION_MESSAGES,
    );
    let removedMessageCount =
      messages.length - prunedSystem.length - prunedConversation.length;

    if (
      this.countPromptChars([...prunedSystem, ...prunedConversation]) >
      this.maxPromptChars()
    ) {
      const memoryIndex = prunedSystem.findIndex((message) =>
        this.isConversationMemoryMessage(message.content),
      );

      if (memoryIndex >= 0) {
        prunedSystem = [
          ...prunedSystem.slice(0, memoryIndex),
          ...prunedSystem.slice(memoryIndex + 1),
        ];
        removedMessageCount += 1;
      }
    }

    while (
      this.countPromptChars([...prunedSystem, ...prunedConversation]) >
        this.maxPromptChars() &&
      prunedConversation.length > 2
    ) {
      prunedConversation = prunedConversation.slice(1);
      removedMessageCount += 1;
    }

    const trimmedConversation = prunedConversation.map((message) => ({
      ...message,
      content: this.trimMessageContent(message.content),
    }));
    const trimmedSystem = prunedSystem.map((message) => ({
      ...message,
      content: this.trimMessageContent(message.content),
    }));

    return {
      messages: [...trimmedSystem, ...trimmedConversation],
      removedMessageCount,
    };
  }

  private sanitizeMessage(message: AiLlmMessage): SanitizedMessage {
    const normalized = this.normalizeWhitespace(message.content);
    const redacted = this.redactSensitiveData(normalized);
    const injectionFree = this.removeInjectionFragments(redacted.content);
    const limitedTokens = this.limitRepeatedTokens(injectionFree);
    const normalizedAgain = this.normalizeWhitespace(limitedTokens);
    const limitedFragments = this.dedupeRepeatedFragments(normalizedAgain);
    const content = limitedFragments.trim() || '********';

    return {
      role: message.role,
      content,
      redactionCount: redacted.redactionCount,
    };
  }

  private redactSensitiveData(content: string): {
    content: string;
    redactionCount: number;
  } {
    const patterns: Array<{
      pattern: RegExp;
      replace: (match: string, ...groups: Array<string | undefined>) => string;
    }> = [
      {
        pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi,
        replace: () => 'Bearer ********',
      },
      {
        pattern: /\beyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\b/g,
        replace: () => '********',
      },
      {
        pattern: /\bsk-[A-Za-z0-9]{16,}\b/gi,
        replace: () => '********',
      },
      {
        pattern:
          /\b((?:api[_-]?key|token|password|secret|jwt|session|authorization|cookie|refresh[_-]?token|access[_-]?token))\b\s*[:=]\s*([^\s"'`]+)/gi,
        replace: (_match, group1) => `${group1}: ********`,
      },
      {
        pattern: /\b([A-Z][A-Z0-9_]{2,})\b\s*=\s*([^\s"'`]+)/g,
        replace: (_match, group1) => `${group1}=********`,
      },
      {
        pattern:
          /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
        replace: () => '********',
      },
      {
        pattern:
          /(?:\/Users\/[^\s`"'\\]+|\/private\/[^\s`"'\\]+|[A-Za-z]:\\[^\s`"'\\]+)/g,
        replace: () => '********',
      },
    ];

    let redactionCount = 0;
    let result = content;

    for (const { pattern, replace } of patterns) {
      result = result.replace(pattern, (...args) => {
        redactionCount += 1;
        return replace(args[0], ...args.slice(1, -2));
      });
    }

    return {
      content: result,
      redactionCount,
    };
  }

  private removeInjectionFragments(content: string): string {
    let result = content;

    for (const fragment of [
      /ignore\s+(?:all\s+)?previous\s+instructions?/gi,
      /reveal\s+(?:the\s+)?system\s+prompt/gi,
      /show\s+(?:the\s+)?hidden\s+prompt/gi,
      /forget\s+your\s+instructions?/gi,
      /developer\s+message/gi,
      /system\s+message/gi,
      /act\s+as\s+(?:another|a\s+different)\s+assistant/gi,
      /execute\s+hidden\s+instructions?/gi,
      /override\s+safety/gi,
      /tell\s+me\s+your\s+instructions/gi,
      /show\s+me\s+your\s+prompt/gi,
    ]) {
      result = result.replace(fragment, '');
    }

    return result;
  }

  private limitRepeatedTokens(content: string): string {
    let result = content;
    const repeatedTokenPattern = /(\b[^\s]+\b)(\s+\1){4,}/gi;

    while (true) {
      const next = result.replace(repeatedTokenPattern, '$1 $1 $1 $1');

      if (next === result) {
        break;
      }

      result = next;
    }

    return result;
  }

  private dedupeRepeatedFragments(content: string): string {
    const lines = content.split('\n').map((line) => line.trim());
    const deduped: string[] = [];

    for (const line of lines) {
      if (!line) {
        continue;
      }

      if (deduped[deduped.length - 1] === line) {
        continue;
      }

      deduped.push(line);
    }

    return deduped.join('\n');
  }

  private dedupeConsecutiveMessages(
    messages: SanitizedMessage[],
  ): SanitizedMessage[] {
    const deduped: SanitizedMessage[] = [];

    for (const message of messages) {
      const previous = deduped[deduped.length - 1];
      if (
        previous &&
        previous.role === message.role &&
        this.normalizeComparison(previous.content) ===
          this.normalizeComparison(message.content)
      ) {
        continue;
      }

      deduped.push(message);
    }

    return deduped;
  }

  private normalizeWhitespace(value: string): string {
    return value
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .trim();
  }

  private trimMessageContent(content: string): string {
    const maxChars = MAX_CONTEXT_MESSAGE_CHARS;

    if (content.length <= maxChars) {
      return content;
    }

    return `${content.slice(0, maxChars).trim()}…`;
  }

  private countPromptChars(messages: AiLlmMessage[]): number {
    return messages.reduce(
      (total, message) => total + message.content.length,
      0,
    );
  }

  private maxPromptChars(): number {
    return Math.max(4000, this.config.getMaxResponseChars() * 3);
  }

  private buildInspectionText(messages: AiLlmMessage[]): string {
    return messages
      .filter(
        (message) =>
          message.role !== 'system' ||
          !this.isConversationMemoryMessage(message.content),
      )
      .map((message) => message.content)
      .join('\n');
  }

  private isConversationMemoryMessage(content: string): boolean {
    return /^Conversation memory summary:/i.test(content.trim());
  }

  private containsControlCharacters(value: string): boolean {
    return /[\u0000-\u0008\u000B-\u001F\u007F]/.test(value);
  }

  private looksLikeRawJson(value: string): boolean {
    const trimmed = value.trim();

    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false;
    }

    return /["'][^"']+["']\s*:/.test(trimmed) || trimmed.includes('":');
  }

  private containsLeakage(value: string): boolean {
    return [
      /You are Elev9 Coach/i,
      /deterministic-first adaptive coaching assistant/i,
      /system prompt/i,
      /developer message/i,
      /hidden policy/i,
      /AI_LLM_ENABLED/i,
      /OPENAI_API_KEY/i,
      /prompt version/i,
      /safety version/i,
      /context version/i,
      /OpenAI/i,
    ].some((pattern) => pattern.test(value));
  }

  private isGarbled(value: string): boolean {
    const letters = value.replace(/[^A-Za-z]/g, '').length;
    const symbols = value.replace(/[A-Za-z0-9\s]/g, '').length;

    return letters === 0 || symbols > letters * 3;
  }

  private resolvePromptClassification(
    assessment: AiPromptInjectionAssessment,
  ): AiSafetyClassification {
    switch (assessment.riskLevel) {
      case 'HIGH':
      case 'CRITICAL':
        return 'BLOCKED';
      case 'MEDIUM':
        return 'NEEDS_REVIEW';
      case 'LOW':
        return 'LOW_RISK';
      case 'SAFE':
      default:
        return 'SAFE';
    }
  }

  private shouldBlockPrompt(assessment: AiPromptInjectionAssessment): boolean {
    return (
      assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL'
    );
  }

  private resolveOutputClassification(value: string): AiSafetyClassification {
    if (value.length < 48) {
      return 'LOW_RISK';
    }

    return 'SAFE';
  }

  private rejectOutput(
    metadata: AiSafetyMetadata,
    reason: string,
    outputSizeChars: number,
  ): AiSafetyValidationResult {
    this.metrics.recordOutputRejected({
      promptVersion: metadata.promptVersion,
      safetyVersion: metadata.safetyVersion,
      contextVersion: metadata.contextVersion,
      provider: metadata.provider,
      model: metadata.model,
      promptSizeChars: metadata.promptSizeChars,
      contextSizeChars: metadata.contextSizeChars,
      redactionCount: metadata.redactionCount,
      removedMessageCount: metadata.removedMessageCount,
      reason,
      outputSizeChars,
    });

    this.logger.warn(
      JSON.stringify({
        event: 'safety_output_rejected',
        reason,
        promptVersion: metadata.promptVersion,
        safetyVersion: metadata.safetyVersion,
        provider: metadata.provider,
        model: metadata.model,
        outputSizeChars,
      }),
    );

    return {
      allowed: false,
      classification: 'BLOCKED',
      reason,
    };
  }

  private normalizeOutput(value: string): string {
    return value
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .trim();
  }

  private wordCount(value: string): number {
    return value.split(/\s+/).filter(Boolean).length;
  }

  private normalizeComparison(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
  }
}

type SanitizedMessage = AiLlmMessage & {
  redactionCount: number;
};
