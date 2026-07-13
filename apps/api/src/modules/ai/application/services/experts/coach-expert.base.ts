import type {
  CoachExpert,
  CoachExpertContext,
  CoachExpertContribution,
  CoachExpertMetadata,
  CoachExpertRequest,
  CoachExpertResult,
  CoachExpertSupportInput,
} from './coach-expert.types';

export abstract class BaseCoachExpert implements CoachExpert {
  readonly metadata: CoachExpertMetadata;

  protected constructor(metadata: CoachExpertMetadata) {
    this.metadata = Object.freeze({
      ...metadata,
      supportedIntents: Object.freeze([...metadata.supportedIntents]),
      supportedDomains: Object.freeze([...metadata.supportedDomains]),
      capabilities: Object.freeze([...metadata.capabilities]),
    });
    Object.freeze(this);
  }

  supports(input: CoachExpertSupportInput): boolean {
    if (!this.metadata.enabled) {
      return false;
    }

    if (
      input.intent &&
      !this.metadata.supportedIntents.includes(input.intent)
    ) {
      return false;
    }

    if (
      input.selectedDomains?.length &&
      !input.selectedDomains.some((domain) =>
        this.metadata.supportedDomains.includes(domain),
      )
    ) {
      return false;
    }

    if (
      input.capability &&
      !this.metadata.capabilities.includes(input.capability)
    ) {
      return false;
    }

    return true;
  }

  loadContext(
    input: CoachExpertRequest,
    context: CoachExpertContext,
  ): CoachExpertContext {
    void input;
    return context;
  }

  analyze(
    input: CoachExpertRequest,
    context: CoachExpertContext,
  ): CoachExpertResult {
    return {
      expertId: this.metadata.id,
      summary: `${this.metadata.displayName} is registered as a metadata-only coach expert.`,
      contributions: [],
      metadata: Object.freeze({
        expertId: this.metadata.id,
        category: this.metadata.category,
        priority: this.metadata.priority,
        intent: input.intent,
        selectedDomainCount: input.selectedDomains.length,
        selectionReason: context.selectionReason,
        runtimeMode: 'metadata-only',
      }),
    };
  }

  contribute(
    input: CoachExpertRequest,
    context: CoachExpertContext,
    result: CoachExpertResult,
  ): readonly CoachExpertContribution[] {
    void input;
    void context;
    return result.contributions;
  }
}
