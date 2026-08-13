import { memo, useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@elev9/ui';

import {
  CoachActionGrid,
  CoachCenteredState,
  CoachHeroCard,
  CoachEvidenceList,
  CoachPriorityBanner,
  CoachSection,
} from '../components/coach';
import type {
  CoachInsightAction,
  CoachInsightSignal,
  CoachInsightsModel,
} from '../hooks/use-coach-insights';
import {
  trackCoachInsightsEvent,
  useCoachInsights,
} from '../hooks/use-coach-insights';
import type { RootStackParamList } from '../navigation/app-navigator';

const insightTokens = {
  background: '#ffffff',
  card: '#ffffff',
  surface: '#f8fafc',
  text: '#111827',
  secondaryText: '#5b6472',
  tertiaryText: '#8a94a6',
  border: '#e5e7eb',
  borderSoft: '#eef2f7',
  accent: '#111827',
  green: '#16a34a',
} as const;

export function CoachInsightsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insights = useCoachInsights();
  const refreshInsights = insights.refresh;

  useFocusEffect(
    useCallback(() => {
      trackCoachInsightsEvent('coach_insight_opened');
      void refreshInsights();
    }, [refreshInsights]),
  );

  const handleAction = useCallback(
    (action: CoachInsightAction) => {
      if (!action.isEnabled) {
        return;
      }

      if (action.target === 'workout') {
        trackCoachInsightsEvent('coach_recommendation_followed', {
          action: action.id,
        });
      }

      switch (action.target) {
        case 'workout':
          if (insights.trainingPlanId && insights.workout) {
            navigation.navigate('WorkoutOverview', {
              trainingPlanId: insights.trainingPlanId,
              workout: insights.workout,
            });
            return;
          }

          navigation.navigate('MainTabs', { initialTab: 'workout' });
          return;
        case 'nutrition':
          navigation.navigate('NutritionOverview');
          return;
        case 'goals':
          navigation.navigate('CoachGoalGuidance');
          return;
        case 'conversation':
          navigation.navigate('CoachChat');
          return;
        case 'memory':
          navigation.navigate('CoachMemoryTimeline');
          return;
        case 'dashboard':
          navigation.navigate('MainTabs', { initialTab: 'home' });
          return;
      }
    },
    [insights.trainingPlanId, insights.workout, navigation],
  );

  if (insights.isLoading) {
    return <InsightsSkeleton />;
  }

  if (insights.errorMessage && !insights.model) {
    return (
      <InsightsState
        buttonLabel="Retry"
        message="Unable to explain today's recommendation."
        onPress={() => void insights.refresh()}
      />
    );
  }

  if (insights.isEmpty || !insights.model) {
    return (
      <InsightsState
        buttonLabel="Open Coach Home"
        message="No coaching recommendation available today."
        onPress={() => navigation.navigate('MainTabs', { initialTab: 'coach' })}
        secondaryText="Complete your daily activities to unlock personalized insights."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={insights.isRefreshing}
            onRefresh={() => void insights.refresh()}
            tintColor={insightTokens.accent}
          />
        }
      >
        <View
          accessibilityLabel={insights.model.accessibilityLabel}
          style={styles.content}
        >
          <RecommendationHero model={insights.model} />
          <PriorityBanner model={insights.model} />
          <Explanation model={insights.model} />
          <Signals signals={insights.model.signals} />
          <Benefits benefits={insights.model.benefits} />
          <Alternative alternative={insights.model.alternative} />
          <Confidence confidence={insights.model.confidence} />
          <EvidenceSection model={insights.model} />
          <QuickActions
            actions={insights.model.actions}
            onAction={handleAction}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const RecommendationHero = memo(function RecommendationHero({
  model,
}: {
  model: CoachInsightsModel;
}) {
  return (
    <CoachHeroCard
      accessibilityLabel={`Recommendation. ${model.recommendation}. ${model.focus}.`}
      containerStyle={styles.hero}
      iconColor={insightTokens.text}
      iconContainerStyle={styles.heroIcon}
      iconName="bulb-outline"
      title={model.recommendation}
      titleTextProps={{ maxFontSizeMultiplier: 1.25, numberOfLines: 2 }}
      titleStyle={styles.heroText}
    />
  );
});

const PriorityBanner = memo(function PriorityBanner({
  model,
}: {
  model: CoachInsightsModel;
}) {
  return (
    <CoachPriorityBanner
      confidenceLevel={model.confidenceLevel}
      detail={model.supportingEvidenceSummary || model.explanation}
      focus={model.focusLevel}
      riskLevel={model.riskLevel}
      title={model.topRecommendation}
    />
  );
});

const Explanation = memo(function Explanation({
  model,
}: {
  model: CoachInsightsModel;
}) {
  return (
    <CoachSection title="Why This Recommendation?" style={styles.section}>
      <View
        accessibilityLabel={`Why this recommendation. ${model.explanation}`}
        onLayout={() => trackCoachInsightsEvent('coach_explanation_read')}
        style={styles.explanationCard}
      >
        {model.explanation.split(/\n\n+/).map((paragraph) => (
          <Text
            key={paragraph}
            maxFontSizeMultiplier={1.35}
            style={styles.explanationText}
          >
            {paragraph}
          </Text>
        ))}
      </View>
    </CoachSection>
  );
});

const EvidenceSection = memo(function EvidenceSection({
  model,
}: {
  model: CoachInsightsModel;
}) {
  return (
    <CoachSection title="Supporting Evidence" style={styles.section}>
      <CoachEvidenceList evidence={model.evidence} maxItems={3} />
    </CoachSection>
  );
});

const Signals = memo(function Signals({
  signals,
}: {
  signals: CoachInsightSignal[];
}) {
  return (
    <CoachSection title="Signals Used" style={styles.section}>
      <View style={styles.signalGrid}>
        {signals.map((signal) => (
          <View
            accessibilityLabel={`${signal.label}. ${signal.value}.`}
            key={signal.id}
            style={styles.signalCard}
          >
            <Text style={styles.signalLabel}>{signal.label}</Text>
            <Text maxFontSizeMultiplier={1.25} style={styles.signalValue}>
              {signal.value}
            </Text>
          </View>
        ))}
      </View>
    </CoachSection>
  );
});

const Benefits = memo(function Benefits({ benefits }: { benefits: string[] }) {
  return (
    <CoachSection title="What Happens If You Follow It?" style={styles.section}>
      <View style={styles.benefitGrid}>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.benefitCard}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={insightTokens.green}
            />
            <Text maxFontSizeMultiplier={1.25} style={styles.benefitText}>
              {benefit}
            </Text>
          </View>
        ))}
      </View>
    </CoachSection>
  );
});

const Alternative = memo(function Alternative({
  alternative,
}: {
  alternative: string;
}) {
  return (
    <CoachSection title="Alternative Recommendation" style={styles.section}>
      <Pressable
        accessibilityLabel={`If today doesn't go as planned. ${alternative}`}
        accessibilityRole="button"
        onPress={() => trackCoachInsightsEvent('coach_alternative_selected')}
        style={({ pressed }) => [
          styles.alternativeCard,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.alternativeLabel}>
          If today doesn't go as planned...
        </Text>
        <Text maxFontSizeMultiplier={1.35} style={styles.alternativeText}>
          {alternative}
        </Text>
      </Pressable>
    </CoachSection>
  );
});

const Confidence = memo(function Confidence({
  confidence,
}: {
  confidence: string;
}) {
  return (
    <CoachSection title="Coach Confidence" style={styles.section}>
      <View
        accessibilityLabel={`Coach confidence. ${confidence}`}
        style={styles.confidenceCard}
      >
        <Text maxFontSizeMultiplier={1.35} style={styles.confidenceText}>
          {confidence}
        </Text>
      </View>
    </CoachSection>
  );
});

const QuickActions = memo(function QuickActions({
  actions,
  onAction,
}: {
  actions: CoachInsightAction[];
  onAction: (action: CoachInsightAction) => void;
}) {
  return (
    <CoachSection title="Quick Actions" style={styles.section}>
      <CoachActionGrid
        actions={actions}
        actionStyle={styles.actionPill}
        containerStyle={styles.actionGridContainer}
        disabledActionStyle={styles.disabled}
        onAction={onAction}
        textStyle={styles.actionText}
      />
    </CoachSection>
  );
});

function InsightsSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading coach insight"
        accessibilityRole="progressbar"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonExplanation} />
        <View style={styles.skeletonSignals} />
        <View style={styles.skeletonBenefits} />
      </View>
    </SafeAreaView>
  );
}

function InsightsState({
  buttonLabel,
  message,
  onPress,
  secondaryText,
}: {
  buttonLabel: string;
  message: string;
  onPress: () => void;
  secondaryText?: string;
}) {
  return (
    <CoachCenteredState
      action={
        <Pressable
          accessibilityLabel={buttonLabel}
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
        </Pressable>
      }
      contentStyle={styles.stateContent}
      message={message}
      safeAreaStyle={styles.safeArea}
      secondaryText={secondaryText}
      secondaryTextStyle={styles.stateSecondary}
      titleStyle={styles.stateTitle}
      titleTextProps={{ maxFontSizeMultiplier: 1.25 }}
      secondaryTextProps={{ maxFontSizeMultiplier: 1.35 }}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: insightTokens.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 42,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 28,
  },
  hero: {
    gap: 16,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: insightTokens.border,
    backgroundColor: insightTokens.card,
    padding: 24,
    shadowColor: insightTokens.text,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: insightTokens.surface,
    borderWidth: 1,
    borderColor: insightTokens.border,
  },
  heroText: {
    color: insightTokens.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: 0,
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: insightTokens.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  explanationCard: {
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: insightTokens.border,
    backgroundColor: insightTokens.surface,
    padding: 20,
  },
  explanationText: {
    color: insightTokens.text,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '700',
  },
  signalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  signalCard: {
    width: '48.5%',
    minHeight: 86,
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: insightTokens.border,
    backgroundColor: insightTokens.card,
    padding: 15,
  },
  signalLabel: {
    color: insightTokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  signalValue: {
    color: insightTokens.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  benefitGrid: {
    gap: 10,
  },
  benefitCard: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: insightTokens.border,
    backgroundColor: insightTokens.card,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  benefitText: {
    flex: 1,
    color: insightTokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  alternativeCard: {
    gap: 9,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: insightTokens.border,
    backgroundColor: insightTokens.surface,
    padding: 18,
  },
  alternativeLabel: {
    color: insightTokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  alternativeText: {
    color: insightTokens.text,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
  },
  confidenceCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: insightTokens.border,
    backgroundColor: insightTokens.card,
    padding: 18,
  },
  confidenceText: {
    color: insightTokens.text,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
  },
  actionGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionPill: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: insightTokens.border,
    backgroundColor: insightTokens.surface,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  actionText: {
    color: insightTokens.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  skeletonContent: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 34,
  },
  skeletonHero: {
    height: 178,
    borderRadius: 26,
    backgroundColor: insightTokens.surface,
  },
  skeletonExplanation: {
    height: 156,
    borderRadius: 24,
    backgroundColor: insightTokens.surface,
  },
  skeletonSignals: {
    height: 112,
    borderRadius: 20,
    backgroundColor: insightTokens.surface,
  },
  skeletonBenefits: {
    height: 132,
    borderRadius: 20,
    backgroundColor: insightTokens.surface,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: insightTokens.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateSecondary: {
    color: insightTokens.secondaryText,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: insightTokens.accent,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
  },
});
