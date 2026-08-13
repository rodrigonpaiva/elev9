import { Injectable } from '@nestjs/common';

import type { CoachExpertCompositionResult } from '../experts/composition/coach-expert-composition.types';
import type {
  CoachCelebrationLevel,
  CoachCommunicationStyle,
  CoachDirectiveLevel,
  CoachEmpathyLevel,
  CoachEncouragementLevel,
  CoachFocus,
  CoachPersonaEngineInput,
  CoachPersonaMetadata,
  CoachPersonaProfile,
  CoachSafetyLevel,
  CoachTechnicalDepth,
  CoachTone,
  CoachUrgency,
  CoachVerbosity,
} from './coach-persona-engine.types';

const SAFETY_CRITICAL_FINDINGS = new Set([
  'LOW_RECOVERY',
  'HIGH_RECOVERY_RISK',
  'INCREASED_INJURY_RISK',
  'NUTRITION_INCONSISTENCY',
]);

const STRICT_SAFETY_FINDINGS = new Set([
  'LOW_RECOVERY',
  'HIGH_RECOVERY_RISK',
  'INCREASED_INJURY_RISK',
]);

@Injectable()
export class CoachPersonaEnginePolicy {
  resolveProfile(input: CoachPersonaEngineInput): CoachPersonaProfile & {
    tone: CoachTone;
    verbosity: CoachVerbosity;
    focus: CoachFocus;
    directiveLevel: CoachDirectiveLevel;
    empathyLevel: CoachEmpathyLevel;
    encouragementLevel: CoachEncouragementLevel;
    technicalDepth: CoachTechnicalDepth;
    urgency: CoachUrgency;
    celebrationLevel: CoachCelebrationLevel;
    safetyLevel: CoachSafetyLevel;
    communicationStyle: CoachCommunicationStyle;
  } {
    const intelligence = input.unifiedCoachIntelligence;
    const focus = this.resolveFocus(input, intelligence);
    const safetyLevel = this.resolveSafetyLevel(input, intelligence, focus);
    const tone = this.resolveTone(input, intelligence, focus, safetyLevel);
    const verbosity = this.resolveVerbosity(
      input,
      intelligence,
      focus,
      safetyLevel,
    );
    const directiveLevel = this.resolveDirectiveLevel(
      input,
      intelligence,
      focus,
      safetyLevel,
    );
    const empathyLevel = this.resolveEmpathyLevel(input, intelligence, focus);
    const encouragementLevel = this.resolveEncouragementLevel(
      input,
      intelligence,
      focus,
    );
    const technicalDepth = this.resolveTechnicalDepth(input);
    const urgency = this.resolveUrgency(
      input,
      intelligence,
      focus,
      safetyLevel,
    );
    const celebrationLevel = this.resolveCelebrationLevel(
      input,
      intelligence,
      focus,
      safetyLevel,
    );

    const communicationStyle: CoachCommunicationStyle = Object.freeze({
      tone,
      directiveLevel,
      empathyLevel,
      encouragementLevel,
      technicalDepth,
      urgency,
      celebrationLevel,
      safetyLevel,
    });

    return Object.freeze({
      communicationStyle,
      focus,
      verbosity,
      tone,
      directiveLevel,
      empathyLevel,
      encouragementLevel,
      technicalDepth,
      urgency,
      celebrationLevel,
      safetyLevel,
    });
  }

  resolveCommunicationRules(input: {
    profile: ReturnType<CoachPersonaEnginePolicy['resolveProfile']>;
    guidance: CoachPersonaEngineInput;
  }): readonly string[] {
    const rules = [
      input.profile.safetyLevel === 'STRICT' ? 'LEAD_WITH_SAFETY' : null,
      input.profile.focus === 'WORKOUT' ? 'PRIORITIZE_WORKOUT' : null,
      input.profile.focus === 'RECOVERY' ? 'PRIORITIZE_RECOVERY' : null,
      input.profile.focus === 'NUTRITION' ? 'PRIORITIZE_NUTRITION' : null,
      input.profile.focus === 'GOALS' ? 'PRIORITIZE_GOALS' : null,
      input.profile.focus === 'CONSISTENCY' ? 'PRIORITIZE_CONSISTENCY' : null,
      input.profile.focus === 'PROGRESS' ? 'PRIORITIZE_PROGRESS' : null,
      input.profile.focus === 'MOTIVATION' ? 'PRIORITIZE_MOTIVATION' : null,
      input.profile.focus === 'SAFETY' ? 'PRIORITIZE_SAFETY' : null,
      input.profile.tone === 'DIRECT' ? 'USE_DIRECT_TONE' : null,
      input.profile.tone === 'ANALYTICAL' ? 'USE_ANALYTICAL_TONE' : null,
      input.profile.tone === 'CELEBRATORY' ? 'USE_CELEBRATORY_TONE' : null,
      input.profile.tone === 'CAUTIOUS' ? 'USE_CAUTIOUS_TONE' : null,
      input.profile.tone === 'CALM' ? 'USE_CALM_TONE' : null,
      input.profile.verbosity === 'VERY_SHORT' ? 'KEEP_VERY_SHORT' : null,
      input.profile.verbosity === 'SHORT' ? 'KEEP_SHORT' : null,
      input.profile.verbosity === 'NORMAL' ? 'KEEP_NORMAL' : null,
      input.profile.verbosity === 'DETAILED' ? 'ALLOW_DETAIL' : null,
      input.profile.directiveLevel === 'HIGH' ? 'BE_DIRECTIVE' : null,
      input.profile.directiveLevel === 'MEDIUM' ? 'BE_ACTIONABLE' : null,
      input.profile.directiveLevel === 'LOW' ? 'BE_EXPLORATORY' : null,
      input.profile.empathyLevel === 'HIGH' ? 'USE_HIGH_EMPATHY' : null,
      input.profile.empathyLevel === 'MEDIUM' ? 'USE_MEDIUM_EMPATHY' : null,
      input.profile.empathyLevel === 'LOW' ? 'USE_LOW_EMPATHY' : null,
      input.profile.encouragementLevel === 'HIGH'
        ? 'USE_HIGH_ENCOURAGEMENT'
        : null,
      input.profile.encouragementLevel === 'MEDIUM'
        ? 'USE_MEDIUM_ENCOURAGEMENT'
        : null,
      input.profile.encouragementLevel === 'LOW'
        ? 'USE_LOW_ENCOURAGEMENT'
        : null,
      input.profile.technicalDepth === 'BEGINNER' ? 'USE_BEGINNER_DEPTH' : null,
      input.profile.technicalDepth === 'INTERMEDIATE'
        ? 'USE_INTERMEDIATE_DEPTH'
        : null,
      input.profile.technicalDepth === 'ADVANCED' ? 'USE_ADVANCED_DEPTH' : null,
      input.profile.urgency === 'CRITICAL' ? 'MARK_AS_CRITICAL' : null,
      input.profile.urgency === 'HIGH' ? 'MARK_AS_HIGH_URGENCY' : null,
      input.profile.urgency === 'MEDIUM' ? 'MARK_AS_MEDIUM_URGENCY' : null,
      input.profile.urgency === 'LOW' ? 'MARK_AS_LOW_URGENCY' : null,
      input.profile.urgency === 'NONE' ? 'MARK_AS_NON_URGENT' : null,
      input.profile.celebrationLevel === 'HIGH' ? 'CELEBRATE_HIGH' : null,
      input.profile.celebrationLevel === 'MEDIUM' ? 'CELEBRATE_MEDIUM' : null,
      input.profile.celebrationLevel === 'LOW' ? 'CELEBRATE_LOW' : null,
      input.profile.celebrationLevel === 'NONE' ? 'NO_CELEBRATION' : null,
      (input.guidance.unifiedCoachIntelligence?.participatingExperts.length ??
        0) > 1
        ? 'MULTI_EXPERT_SYNTHESIS'
        : null,
      (input.guidance.unifiedCoachIntelligence?.conflicts.length ?? 0) > 0
        ? 'EXPLICIT_CONFLICT_HANDLING'
        : null,
      input.guidance.runtimeMetadata.responseMode === 'stream'
        ? 'STREAM_SAFE_DELIVERY'
        : null,
      'DO_NOT_INFER_EMOTIONS',
      'DO_NOT_INVENT_USER_PREFERENCES',
      'DO_NOT_OVERRIDE_SAFETY',
      'KEEP_STRUCTURED_OUTPUT',
    ].filter((rule): rule is string => Boolean(rule));

    return Object.freeze([...new Set(rules)]);
  }

  resolveMetadata(input: {
    profile: ReturnType<CoachPersonaEnginePolicy['resolveProfile']>;
    guidance: CoachPersonaEngineInput;
    rules: readonly string[];
  }): CoachPersonaMetadata {
    const intelligence = input.guidance.unifiedCoachIntelligence;
    const metadata = intelligence?.metadata;

    return Object.freeze({
      requestId: input.guidance.requestId,
      intent: input.guidance.intent,
      selectedDomains: Object.freeze([...input.guidance.selectedDomains]),
      primaryExpertId: metadata?.primaryExpertId,
      participatingExpertIds: Object.freeze(
        metadata?.participatingExpertIds ?? [],
      ),
      supportingExpertIds: Object.freeze(metadata?.supportingExpertIds ?? []),
      blockedExpertIds: Object.freeze(metadata?.blockedExpertIds ?? []),
      routeConfidence: metadata?.routeConfidence ?? 'UNKNOWN',
      policyApproved: metadata?.policyApproved ?? false,
      policyBlocked: metadata?.policyBlocked ?? false,
      policyFallbackRequired: metadata?.policyFallbackRequired ?? false,
      riskLevel: this.resolveRiskLevel(intelligence),
      conflictCount: intelligence?.conflicts.length ?? 0,
      recommendationCount: intelligence?.recommendations.length ?? 0,
      communicationRuleCount: input.rules.length,
      runtimeCompleteness: metadata?.runtimeCompleteness ?? 'EMPTY',
      userProfileId: input.guidance.healthContext.userProfileId,
      activityLevel: input.guidance.healthContext.activityLevel,
      technicalDepthSource: this.resolveTechnicalDepthSource(input.profile),
      toneSource: this.resolveToneSource(input.profile, input.guidance),
      safetySource: this.resolveSafetySource(input.profile),
      focusSource: this.resolveFocusSource(input.profile, input.guidance),
    });
  }

  private resolveRiskLevel(
    intelligence?: CoachExpertCompositionResult,
  ): CoachPersonaMetadata['riskLevel'] {
    const level = intelligence?.risks[0]?.level ?? 'UNKNOWN';
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
      case 'MEDIUM':
      case 'LOW':
      case 'UNKNOWN':
        return level;
      default:
        return 'UNKNOWN';
    }
  }

  private resolveFocus(
    input: CoachPersonaEngineInput,
    intelligence?: CoachExpertCompositionResult,
  ): CoachFocus {
    const findings = new Set(intelligence?.keyFindings ?? []);
    const primaryExpert = intelligence?.primaryExpert;
    const primaryExpertId = primaryExpert?.id ?? '';
    const selectedDomains = new Set(input.selectedDomains);

    if (this.isSafetyDriven(input, intelligence)) {
      return 'SAFETY';
    }

    if (findings.has('LOW_RECOVERY') || findings.has('HIGH_RECOVERY_RISK')) {
      return 'RECOVERY';
    }

    if (findings.has('NUTRITION_INCONSISTENCY')) {
      return 'NUTRITION';
    }

    if (
      findings.has('PLATEAU') ||
      findings.has('STALL') ||
      findings.has('REGRESSION')
    ) {
      return 'PROGRESS';
    }

    if (findings.has('RECENT_MILESTONE')) {
      return selectedDomains.has('goals') ? 'GOALS' : 'PROGRESS';
    }

    if (findings.has('CONSISTENT_HABITS')) {
      return 'CONSISTENCY';
    }

    if (findings.has('HIGH_MOTIVATION')) {
      return 'MOTIVATION';
    }

    const expertFocus = this.resolveFocusFromExpert(primaryExpertId);
    if (expertFocus) {
      return expertFocus;
    }

    if (selectedDomains.has('recovery')) {
      return 'RECOVERY';
    }

    if (selectedDomains.has('nutrition')) {
      return 'NUTRITION';
    }

    if (selectedDomains.has('goals')) {
      return 'GOALS';
    }

    if (selectedDomains.has('progress')) {
      return 'PROGRESS';
    }

    if (selectedDomains.has('habits')) {
      return 'CONSISTENCY';
    }

    if (selectedDomains.has('training')) {
      return 'WORKOUT';
    }

    return 'MOTIVATION';
  }

  private resolveTone(
    input: CoachPersonaEngineInput,
    intelligence: CoachExpertCompositionResult | undefined,
    focus: CoachFocus,
    safetyLevel: CoachSafetyLevel,
  ): CoachTone {
    const findings = new Set(intelligence?.keyFindings ?? []);
    const style = input.personalization?.preferredCoachingStyle;

    if (safetyLevel === 'STRICT' || focus === 'SAFETY') {
      return 'CAUTIOUS';
    }

    if (findings.has('RECENT_MILESTONE') || findings.has('HIGH_MOTIVATION')) {
      return 'CELEBRATORY';
    }

    if (
      findings.has('PLATEAU') ||
      findings.has('STALL') ||
      findings.has('REGRESSION')
    ) {
      return 'ANALYTICAL';
    }

    if (style === 'direct') {
      return 'DIRECT';
    }

    if (style === 'educational') {
      return 'ANALYTICAL';
    }

    if (style === 'motivational') {
      return 'SUPPORTIVE';
    }

    if (focus === 'RECOVERY') {
      return 'CALM';
    }

    if (focus === 'NUTRITION') {
      return 'ANALYTICAL';
    }

    return 'SUPPORTIVE';
  }

  private resolveVerbosity(
    _input: CoachPersonaEngineInput,
    intelligence: CoachExpertCompositionResult | undefined,
    focus: CoachFocus,
    safetyLevel: CoachSafetyLevel,
  ): CoachVerbosity {
    if (safetyLevel === 'STRICT' || focus === 'SAFETY') {
      return 'VERY_SHORT';
    }

    const participatingExpertCount =
      intelligence?.participatingExperts.length ?? 0;
    const recommendationCount = intelligence?.recommendations.length ?? 0;
    const conflictCount = intelligence?.conflicts.length ?? 0;

    if (
      conflictCount > 0 ||
      participatingExpertCount >= 3 ||
      recommendationCount >= 3
    ) {
      return 'DETAILED';
    }

    if (participatingExpertCount <= 1 && recommendationCount <= 1) {
      return 'SHORT';
    }

    if (focus === 'NUTRITION' || focus === 'PROGRESS') {
      return 'NORMAL';
    }

    return 'NORMAL';
  }

  private resolveDirectiveLevel(
    input: CoachPersonaEngineInput,
    intelligence: CoachExpertCompositionResult | undefined,
    focus: CoachFocus,
    safetyLevel: CoachSafetyLevel,
  ): CoachDirectiveLevel {
    if (safetyLevel === 'STRICT' || focus === 'SAFETY') {
      return 'HIGH';
    }

    if (focus === 'RECOVERY') {
      return 'HIGH';
    }

    if (input.personalization?.preferredCoachingStyle === 'direct') {
      return 'HIGH';
    }

    if (
      (intelligence?.recommendations.length ?? 0) > 0 &&
      (focus === 'WORKOUT' || focus === 'NUTRITION' || focus === 'GOALS')
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveEmpathyLevel(
    input: CoachPersonaEngineInput,
    intelligence: CoachExpertCompositionResult | undefined,
    focus: CoachFocus,
  ): CoachEmpathyLevel {
    const healthContext = input.healthContext;
    const personalization = input.personalization;
    const recentWorkoutCount = healthContext.recentWorkoutLogs.length;
    const lowBehavioralMomentum =
      healthContext.currentStreak <= 1 ||
      healthContext.adherenceScore < 60 ||
      (recentWorkoutCount === 0 &&
        healthContext.currentStreak === 0 &&
        Boolean(healthContext.weeklyFrequency));

    if (
      lowBehavioralMomentum ||
      personalization?.riskOfDisengagement === 'high' ||
      focus === 'RECOVERY' ||
      (intelligence?.risks[0]?.level ?? 'UNKNOWN') === 'HIGH'
    ) {
      return 'HIGH';
    }

    if (
      healthContext.currentStreak >= 3 ||
      healthContext.adherenceScore >= 80 ||
      personalization?.engagementProfile === 'high'
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveEncouragementLevel(
    input: CoachPersonaEngineInput,
    intelligence: CoachExpertCompositionResult | undefined,
    focus: CoachFocus,
  ): CoachEncouragementLevel {
    const findings = new Set(intelligence?.keyFindings ?? []);
    const healthContext = input.healthContext;

    if (findings.has('RECENT_MILESTONE') || findings.has('STRONG_PROGRESS')) {
      return 'HIGH';
    }

    if (
      findings.has('CONSISTENT_HABITS') ||
      healthContext.currentStreak >= 5 ||
      healthContext.adherenceScore >= 80 ||
      focus === 'MOTIVATION'
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveTechnicalDepth(
    input: CoachPersonaEngineInput,
  ): CoachTechnicalDepth {
    const activityLevel =
      input.fitnessProfile?.activityLevel ?? input.healthContext.activityLevel;
    const weeklyFrequency =
      input.fitnessProfile?.weeklyFrequency ??
      input.healthContext.weeklyFrequency ??
      0;
    const adherenceScore =
      input.fitnessProfile?.adherenceScore ??
      input.healthContext.adherenceScore;

    if (
      activityLevel === 'high' ||
      (weeklyFrequency >= 5 && adherenceScore >= 80)
    ) {
      return 'ADVANCED';
    }

    if (
      activityLevel === 'low' ||
      weeklyFrequency <= 2 ||
      adherenceScore < 60
    ) {
      return 'BEGINNER';
    }

    return 'INTERMEDIATE';
  }

  private resolveUrgency(
    input: CoachPersonaEngineInput,
    intelligence: CoachExpertCompositionResult | undefined,
    focus: CoachFocus,
    safetyLevel: CoachSafetyLevel,
  ): CoachUrgency {
    const riskLevel = intelligence?.risks[0]?.level ?? 'UNKNOWN';
    const findings = new Set(intelligence?.keyFindings ?? []);
    const conflictCount = intelligence?.conflicts.length ?? 0;

    if (safetyLevel === 'STRICT' || riskLevel === 'CRITICAL') {
      return 'CRITICAL';
    }

    if (riskLevel === 'HIGH' && (focus === 'RECOVERY' || focus === 'SAFETY')) {
      return 'HIGH';
    }

    if (
      conflictCount > 0 ||
      input.safetyDecisions.policyEvaluation.decision.blocked
    ) {
      return 'HIGH';
    }

    if (findings.has('RECENT_MILESTONE') || findings.has('STRONG_PROGRESS')) {
      return 'MEDIUM';
    }

    if (intelligence?.recommendations.length) {
      return 'LOW';
    }

    return 'NONE';
  }

  private resolveCelebrationLevel(
    input: CoachPersonaEngineInput,
    intelligence: CoachExpertCompositionResult | undefined,
    focus: CoachFocus,
    safetyLevel: CoachSafetyLevel,
  ): CoachCelebrationLevel {
    if (safetyLevel === 'STRICT' || focus === 'SAFETY') {
      return 'NONE';
    }

    const findings = new Set(intelligence?.keyFindings ?? []);
    const healthContext = input.healthContext;

    if (findings.has('RECENT_MILESTONE')) {
      return 'HIGH';
    }

    if (findings.has('STRONG_PROGRESS')) {
      return 'MEDIUM';
    }

    if (
      findings.has('CONSISTENT_HABITS') ||
      healthContext.currentStreak >= 5 ||
      healthContext.adherenceScore >= 80
    ) {
      return 'LOW';
    }

    return 'NONE';
  }

  private resolveSafetyLevel(
    input: CoachPersonaEngineInput,
    intelligence: CoachExpertCompositionResult | undefined,
    focus: CoachFocus,
  ): CoachSafetyLevel {
    const riskLevel = intelligence?.risks[0]?.level ?? 'UNKNOWN';
    const blockedByPolicy =
      input.safetyDecisions.policyEvaluation.decision.blocked;
    const strictSafetyFinding = this.hasStrictSafetyFinding(intelligence);
    const elevatedSafetyFinding = this.hasSafetyCriticalFinding(intelligence);

    if (blockedByPolicy || riskLevel === 'CRITICAL' || strictSafetyFinding) {
      return 'STRICT';
    }

    if (riskLevel === 'HIGH' && (focus === 'RECOVERY' || focus === 'SAFETY')) {
      return 'STRICT';
    }

    if (elevatedSafetyFinding || riskLevel === 'MEDIUM') {
      return 'ELEVATED';
    }

    return 'NORMAL';
  }

  private isSafetyDriven(
    input: CoachPersonaEngineInput,
    intelligence?: CoachExpertCompositionResult,
  ): boolean {
    const riskLevel = intelligence?.risks[0]?.level ?? 'UNKNOWN';

    return (
      input.safetyDecisions.policyEvaluation.decision.blocked ||
      riskLevel === 'CRITICAL' ||
      this.hasStrictSafetyFinding(intelligence)
    );
  }

  private resolveFocusFromExpert(
    primaryExpertId?: string,
  ): CoachFocus | undefined {
    if (!primaryExpertId) {
      return undefined;
    }

    const normalized = primaryExpertId.toLowerCase();

    if (normalized.includes('workout')) {
      return 'WORKOUT';
    }

    if (normalized.includes('nutrition')) {
      return 'NUTRITION';
    }

    if (normalized.includes('recovery')) {
      return 'RECOVERY';
    }

    if (normalized.includes('goal')) {
      return 'GOALS';
    }

    if (normalized.includes('habit')) {
      return 'CONSISTENCY';
    }

    if (normalized.includes('progress')) {
      return 'PROGRESS';
    }

    if (normalized.includes('motivation')) {
      return 'MOTIVATION';
    }

    return undefined;
  }

  private resolveTechnicalDepthSource(profile: CoachPersonaProfile): string {
    return profile.verbosity === 'DETAILED'
      ? 'MULTI_EXPERT_CONTEXT'
      : profile.communicationStyle.technicalDepth;
  }

  private resolveToneSource(
    profile: CoachPersonaProfile,
    input: CoachPersonaEngineInput,
  ): string {
    if (input.safetyDecisions.policyEvaluation.decision.blocked) {
      return 'POLICY_BLOCK';
    }

    if (
      (input.unifiedCoachIntelligence?.risks[0]?.level ?? 'UNKNOWN') ===
      'CRITICAL'
    ) {
      return 'CRITICAL_RISK';
    }

    return profile.communicationStyle.tone;
  }

  private resolveSafetySource(profile: CoachPersonaProfile): string {
    return profile.communicationStyle.safetyLevel;
  }

  private resolveFocusSource(
    profile: CoachPersonaProfile,
    input: CoachPersonaEngineInput,
  ): string {
    const primaryExpertId =
      input.unifiedCoachIntelligence?.metadata.primaryExpertId;
    if (primaryExpertId) {
      return primaryExpertId;
    }

    return profile.focus;
  }

  private hasSafetyCriticalFinding(
    intelligence?: CoachExpertCompositionResult,
  ): boolean {
    return Boolean(
      intelligence?.keyFindings.some((finding) =>
        SAFETY_CRITICAL_FINDINGS.has(finding),
      ),
    );
  }

  private hasStrictSafetyFinding(
    intelligence?: CoachExpertCompositionResult,
  ): boolean {
    return Boolean(
      intelligence?.keyFindings.some((finding) =>
        STRICT_SAFETY_FINDINGS.has(finding),
      ),
    );
  }
}
