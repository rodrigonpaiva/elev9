import { memo, useCallback } from 'react';
import {
  FlatList,
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
  CoachSection,
} from '../components/coach';
import type {
  AskCoachCategory,
  AskCoachCategoryId,
  AskCoachModel,
  AskCoachPersonalizedSuggestion,
  AskCoachQuestion,
  AskCoachQuickAction,
  AskCoachRecentConversation,
} from '../hooks/use-ask-coach';
import { trackAskCoachEvent, useAskCoach } from '../hooks/use-ask-coach';
import type { RootStackParamList } from '../navigation/app-navigator';

const askCoachTokens = {
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

export function AskCoachScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const askCoach = useAskCoach();
  const refreshAskCoach = askCoach.refresh;

  useFocusEffect(
    useCallback(() => {
      trackAskCoachEvent('coach_quick_actions_opened');
      void refreshAskCoach();
    }, [refreshAskCoach]),
  );

  const openConversationWithPrompt = useCallback(
    (prompt: string) => {
      navigation.navigate('CoachChat', {
        initialPrompt: prompt,
        promptId: `${Date.now()}`,
      });
    },
    [navigation],
  );

  const handleQuestion = useCallback(
    (question: AskCoachQuestion) => {
      trackAskCoachEvent('coach_suggestion_selected', {
        suggestion: question.id,
        category: question.category,
      });
      openConversationWithPrompt(question.text);
    },
    [openConversationWithPrompt],
  );

  const handlePersonalizedSuggestion = useCallback(
    (suggestion: AskCoachPersonalizedSuggestion) => {
      trackAskCoachEvent('coach_suggestion_selected', {
        suggestion: suggestion.id,
      });
      openConversationWithPrompt(suggestion.prompt);
    },
    [openConversationWithPrompt],
  );

  const handleRecentConversation = useCallback(
    (conversation: AskCoachRecentConversation) => {
      trackAskCoachEvent('coach_recent_conversation_opened', {
        conversation: conversation.id,
      });
      navigation.navigate('CoachChat');
    },
    [navigation],
  );

  const handleCategory = useCallback(
    (category: AskCoachCategoryId) => {
      trackAskCoachEvent('coach_category_selected', { category });
      askCoach.setSelectedCategory(category);
    },
    [askCoach],
  );

  const handleQuickAction = useCallback(
    (action: AskCoachQuickAction) => {
      if (!action.isEnabled) {
        return;
      }

      switch (action.target) {
        case 'conversation':
          navigation.navigate('CoachChat');
          return;
        case 'briefing':
          navigation.navigate('CoachDailyBriefing');
          return;
        case 'memory':
          navigation.navigate('CoachMemoryTimeline');
          return;
        case 'insights':
          navigation.navigate('CoachInsights');
          return;
        case 'dashboard':
          navigation.navigate('MainTabs', { initialTab: 'home' });
          return;
      }
    },
    [navigation],
  );

  const renderQuestion = useCallback(
    ({ item }: { item: AskCoachQuestion }) => (
      <QuestionCard question={item} onPress={handleQuestion} />
    ),
    [handleQuestion],
  );

  const keyExtractor = useCallback((item: AskCoachQuestion) => item.id, []);

  if (askCoach.isLoading) {
    return <AskCoachSkeleton />;
  }

  if (askCoach.errorMessage && !askCoach.model) {
    return (
      <AskCoachState
        buttonLabel="Retry"
        message="Unable to prepare coach suggestions."
        onPress={() => void askCoach.refresh()}
      />
    );
  }

  if (askCoach.isEmpty || !askCoach.model) {
    return (
      <AskCoachState
        buttonLabel="Open Coach Conversation"
        message="Your coach is preparing personalized suggestions."
        onPress={() => navigation.navigate('CoachChat')}
        secondaryText="Complete more activities to unlock contextual questions."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={askCoach.model.questions}
        keyExtractor={keyExtractor}
        renderItem={renderQuestion}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={askCoach.isRefreshing}
            onRefresh={() => void askCoach.refresh()}
            tintColor={askCoachTokens.accent}
          />
        }
        ListHeaderComponent={
          <View
            accessibilityLabel={askCoach.model.accessibilityLabel}
            style={styles.content}
          >
            <CoachPrompt model={askCoach.model} />
            <CategoryChips
              categories={askCoach.model.categories}
              selectedCategory={askCoach.selectedCategory}
              onSelect={handleCategory}
            />
            <Section title="Suggested Questions" />
          </View>
        }
        ListEmptyComponent={<EmptyQuestionSet />}
        ListFooterComponent={
          <View style={styles.contentFooter}>
            <PersonalizedSuggestions
              suggestions={askCoach.model.personalizedSuggestions}
              onSelect={handlePersonalizedSuggestion}
            />
            <RecentConversations
              conversations={askCoach.model.recentConversations}
              onSelect={handleRecentConversation}
            />
            <QuickActions
              actions={askCoach.model.quickActions}
              onAction={handleQuickAction}
            />
          </View>
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

const CoachPrompt = memo(function CoachPrompt({
  model,
}: {
  model: AskCoachModel;
}) {
  return (
    <CoachHeroCard
      accessibilityLabel={model.accessibilityLabel}
      containerStyle={styles.hero}
      iconColor={askCoachTokens.text}
      iconContainerStyle={styles.heroIcon}
      iconName="sparkles"
      subtitle={model.heroSubtitle}
      subtitleTextProps={{ maxFontSizeMultiplier: 1.35, numberOfLines: 2 }}
      subtitleStyle={styles.heroSubtitle}
      title={model.heroTitle}
      titleTextProps={{ maxFontSizeMultiplier: 1.25, numberOfLines: 2 }}
      titleStyle={styles.heroTitle}
    />
  );
});

const CategoryChips = memo(function CategoryChips({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: AskCoachCategory[];
  selectedCategory: AskCoachCategoryId;
  onSelect: (category: AskCoachCategoryId) => void;
}) {
  return (
    <CoachSection title="Smart Categories" style={styles.section}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {categories.map((category) => {
          const isSelected = category.id === selectedCategory;

          return (
            <Pressable
              accessibilityLabel={`${category.label} questions`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={category.id}
              onPress={() => onSelect(category.id)}
              style={({ pressed }) => [
                styles.categoryChip,
                isSelected ? styles.categoryChipSelected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  isSelected ? styles.categoryTextSelected : null,
                ]}
              >
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </CoachSection>
  );
});

const QuestionCard = memo(function QuestionCard({
  question,
  onPress,
}: {
  question: AskCoachQuestion;
  onPress: (question: AskCoachQuestion) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Suggested question. ${question.text}. Double tap to ask your coach.`}
      accessibilityRole="button"
      onPress={() => onPress(question)}
      style={({ pressed }) => [
        styles.questionCard,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text maxFontSizeMultiplier={1.35} style={styles.questionText}>
        {question.text}
      </Text>
      <Ionicons
        name="arrow-forward"
        size={18}
        color={askCoachTokens.secondaryText}
      />
    </Pressable>
  );
});

const PersonalizedSuggestions = memo(function PersonalizedSuggestions({
  suggestions,
  onSelect,
}: {
  suggestions: AskCoachPersonalizedSuggestion[];
  onSelect: (suggestion: AskCoachPersonalizedSuggestion) => void;
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <CoachSection title="Personalized Suggestions" style={styles.section}>
      <View style={styles.stack}>
        {suggestions.map((suggestion) => (
          <Pressable
            accessibilityLabel={`${suggestion.title}. ${suggestion.explanation}. ${suggestion.outcome}.`}
            accessibilityRole="button"
            key={suggestion.id}
            onPress={() => onSelect(suggestion)}
            style={({ pressed }) => [
              styles.personalizedCard,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text maxFontSizeMultiplier={1.25} style={styles.personalizedTitle}>
              {suggestion.title}
            </Text>
            <Text maxFontSizeMultiplier={1.35} style={styles.personalizedCopy}>
              {suggestion.explanation}
            </Text>
            <View style={styles.outcomeRow}>
              <Ionicons
                name="checkmark-circle"
                size={17}
                color={askCoachTokens.green}
              />
              <Text style={styles.outcomeText}>{suggestion.outcome}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </CoachSection>
  );
});

const RecentConversations = memo(function RecentConversations({
  conversations,
  onSelect,
}: {
  conversations: AskCoachRecentConversation[];
  onSelect: (conversation: AskCoachRecentConversation) => void;
}) {
  if (conversations.length === 0) {
    return null;
  }

  return (
    <CoachSection title="Recent Conversations" style={styles.section}>
      <View style={styles.stack}>
        {conversations.map((conversation) => (
          <Pressable
            accessibilityLabel={`Recent conversation. ${conversation.title}. ${conversation.subtitle}.`}
            accessibilityRole="button"
            key={conversation.id}
            onPress={() => onSelect(conversation)}
            style={({ pressed }) => [
              styles.recentCard,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.recentIcon}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={askCoachTokens.text}
              />
            </View>
            <View style={styles.recentCopy}>
              <Text maxFontSizeMultiplier={1.25} style={styles.recentTitle}>
                {conversation.title}
              </Text>
              <Text style={styles.recentSubtitle}>{conversation.subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </CoachSection>
  );
});

const QuickActions = memo(function QuickActions({
  actions,
  onAction,
}: {
  actions: AskCoachQuickAction[];
  onAction: (action: AskCoachQuickAction) => void;
}) {
  return (
    <CoachSection title="Quick Actions" style={styles.section}>
      <CoachActionGrid
        actions={actions}
        actionStyle={styles.actionButton}
        containerStyle={styles.actionGridContainer}
        disabledActionStyle={styles.disabled}
        onAction={onAction}
        textStyle={styles.actionText}
      />
    </CoachSection>
  );
});

function EmptyQuestionSet() {
  return (
    <View style={styles.emptyQuestions}>
      <Text style={styles.emptyQuestionTitle}>
        No questions for this category yet.
      </Text>
      <Text style={styles.emptyQuestionCopy}>
        Choose another focus or continue the conversation with your coach.
      </Text>
    </View>
  );
}

function AskCoachSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonChipRow}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={styles.skeletonChip} />
          ))}
        </View>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={styles.skeletonQuestion} />
        ))}
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCardShort} />
      </View>
    </SafeAreaView>
  );
}

function AskCoachState({
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
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [
            styles.stateButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.stateButtonText}>{buttonLabel}</Text>
        </Pressable>
      }
      contentStyle={styles.stateContent}
      message={message}
      safeAreaStyle={styles.safeArea}
      secondaryText={secondaryText}
      secondaryTextProps={{ maxFontSizeMultiplier: 1.35 }}
      secondaryTextStyle={styles.stateCopy}
      titleStyle={styles.stateTitle}
      titleTextProps={{ maxFontSizeMultiplier: 1.25 }}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: askCoachTokens.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  content: {
    gap: 22,
  },
  contentFooter: {
    gap: 22,
    paddingTop: 22,
  },
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: askCoachTokens.border,
    backgroundColor: askCoachTokens.card,
    padding: 22,
    gap: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: askCoachTokens.surface,
  },
  heroTitle: {
    color: askCoachTokens.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: askCoachTokens.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: askCoachTokens.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  categoryRow: {
    gap: 10,
    paddingRight: 20,
  },
  categoryChip: {
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: askCoachTokens.border,
    backgroundColor: askCoachTokens.card,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: askCoachTokens.text,
    borderColor: askCoachTokens.text,
  },
  categoryText: {
    color: askCoachTokens.secondaryText,
    fontSize: 14,
    fontWeight: '800',
  },
  categoryTextSelected: {
    color: '#ffffff',
  },
  questionCard: {
    minHeight: 66,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: askCoachTokens.border,
    backgroundColor: askCoachTokens.card,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  questionText: {
    flex: 1,
    color: askCoachTokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  stack: {
    gap: 12,
  },
  personalizedCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: askCoachTokens.border,
    backgroundColor: askCoachTokens.surface,
    padding: 18,
    gap: 8,
  },
  personalizedTitle: {
    color: askCoachTokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  personalizedCopy: {
    color: askCoachTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  outcomeText: {
    color: askCoachTokens.text,
    fontSize: 13,
    fontWeight: '800',
  },
  recentCard: {
    minHeight: 66,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: askCoachTokens.border,
    backgroundColor: askCoachTokens.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: askCoachTokens.surface,
  },
  recentCopy: {
    flex: 1,
    gap: 3,
  },
  recentTitle: {
    color: askCoachTokens.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  recentSubtitle: {
    color: askCoachTokens.tertiaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  actionGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: askCoachTokens.border,
    backgroundColor: askCoachTokens.card,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: askCoachTokens.text,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyQuestions: {
    borderRadius: 20,
    backgroundColor: askCoachTokens.surface,
    padding: 18,
    marginTop: 10,
    gap: 6,
  },
  emptyQuestionTitle: {
    color: askCoachTokens.text,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyQuestionCopy: {
    color: askCoachTokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  stateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
  },
  stateTitle: {
    color: askCoachTokens.text,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  stateCopy: {
    color: askCoachTokens.secondaryText,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  stateButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: askCoachTokens.text,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  skeletonContent: {
    padding: 20,
    gap: 14,
  },
  skeletonHero: {
    height: 170,
    borderRadius: 28,
    backgroundColor: '#eef2f7',
  },
  skeletonChipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonChip: {
    width: 88,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f5f7fb',
  },
  skeletonQuestion: {
    height: 66,
    borderRadius: 20,
    backgroundColor: '#eef2f7',
  },
  skeletonCard: {
    height: 126,
    borderRadius: 22,
    backgroundColor: '#f5f7fb',
  },
  skeletonCardShort: {
    height: 86,
    borderRadius: 22,
    backgroundColor: '#eef2f7',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
