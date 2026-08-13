import type {
  CoachChatHistoryMessage,
  CoachDecision,
  GetCurrentGoalResponse,
  HabitSnapshot,
  PersonalizationSnapshot,
} from '@elev9/types';
import { formatGoalType } from '@elev9/ui/formatters/enum-labels';

import { formatCoachRelativeTime } from './coach-relative-time';
import { limitCoachText } from './coach-copy';
import type {
  CoachUnifiedCoachIntelligence,
  CoachPersonaProfile,
} from './coach-intelligence';
import { mapUnifiedCoachInsight } from './coach-intelligence';

type CurrentGoal = GetCurrentGoalResponse['goal'];

export type AskCoachCategoryId =
  | 'training'
  | 'nutrition'
  | 'recovery'
  | 'goals'
  | 'habits'
  | 'motivation';

export type AskCoachQuestion = {
  id: string;
  text: string;
  category: AskCoachCategoryId;
};

export type AskCoachCategory = {
  id: AskCoachCategoryId;
  label: string;
};

export type AskCoachPersonalizedSuggestion = {
  id: string;
  title: string;
  explanation: string;
  outcome: string;
  prompt: string;
};

export type AskCoachRecentConversation = {
  id: string;
  title: string;
  subtitle: string;
};

export type AskCoachQuickAction = {
  id: 'conversation' | 'briefing' | 'memory' | 'insights' | 'dashboard';
  label: string;
  target: 'conversation' | 'briefing' | 'memory' | 'insights' | 'dashboard';
  isEnabled: boolean;
};

export type AskCoachModel = {
  heroTitle: string;
  heroSubtitle: string;
  selectedCategory: AskCoachCategoryId;
  categories: AskCoachCategory[];
  questions: AskCoachQuestion[];
  personalizedSuggestions: AskCoachPersonalizedSuggestion[];
  recentConversations: AskCoachRecentConversation[];
  quickActions: AskCoachQuickAction[];
  accessibilityLabel: string;
};

const CATEGORIES: AskCoachCategory[] = [
  { id: 'training', label: 'Training' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'goals', label: 'Goals' },
  { id: 'habits', label: 'Habits' },
  { id: 'motivation', label: 'Motivation' },
];

export function buildAskCoachModel(input: {
  coachDecision?: CoachDecision;
  intelligence?: CoachUnifiedCoachIntelligence | null;
  insight?: ReturnType<typeof mapUnifiedCoachInsight>;
  persona?: CoachPersonaProfile | null;
  currentGoal: CurrentGoal | null;
  habitSnapshot: HabitSnapshot | null;
  personalizationSnapshot: PersonalizationSnapshot | null;
  chatHistory: CoachChatHistoryMessage[];
  recoveryScore?: number;
  hasWorkout: boolean;
  nutritionFocus?: string;
  nextMealTitle?: string;
  selectedCategory: AskCoachCategoryId;
}): AskCoachModel | null {
  const questions = buildQuestions(input).filter(
    (question) => question.category === input.selectedCategory,
  );
  const personalizedSuggestions = buildPersonalizedSuggestions(input);
  const recentConversations = buildRecentConversations(input.chatHistory);
  const insight =
    input.insight ??
    mapUnifiedCoachInsight({
      intelligence: input.intelligence ?? null,
    });

  if (
    !input.coachDecision &&
    !input.currentGoal &&
    !input.habitSnapshot &&
    !input.hasWorkout &&
    !input.recoveryScore &&
    !input.nutritionFocus &&
    recentConversations.length === 0
  ) {
    return null;
  }

  return {
    heroTitle: 'What would you like help with today?',
    heroSubtitle: buildHeroSubtitle({ insight, persona: input.persona }),
    selectedCategory: input.selectedCategory,
    categories: CATEGORIES,
    questions: questions.slice(0, 8),
    personalizedSuggestions,
    recentConversations,
    quickActions: [
      {
        id: 'conversation',
        label: 'Continue Conversation',
        target: 'conversation',
        isEnabled: true,
      },
      {
        id: 'briefing',
        label: "Today's Briefing",
        target: 'briefing',
        isEnabled: true,
      },
      {
        id: 'memory',
        label: 'Coach Memory',
        target: 'memory',
        isEnabled: true,
      },
      {
        id: 'insights',
        label: 'Coach Insights',
        target: 'insights',
        isEnabled: true,
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        target: 'dashboard',
        isEnabled: true,
      },
    ],
    accessibilityLabel: `Ask Coach. ${insight.headline}. ${insight.supportingEvidenceSummary}.`,
  };
}

function buildHeroSubtitle(input: {
  insight: ReturnType<typeof mapUnifiedCoachInsight>;
  persona: CoachPersonaProfile | null | undefined;
}): string {
  const focusLabel = input.insight.currentFocus
    ? input.insight.currentFocus.toLowerCase()
    : 'coach';
  const tone = input.persona?.tone.toLowerCase() ?? 'supportive';
  const summary = input.insight.summary.trim();

  if (summary.length > 0) {
    return `${tone} guidance focused on ${focusLabel}. ${summary}`;
  }

  return `${tone} guidance focused on ${focusLabel}.`;
}

export function buildQuestions(input: {
  coachDecision?: CoachDecision;
  currentGoal: CurrentGoal | null;
  habitSnapshot: HabitSnapshot | null;
  recoveryScore?: number;
  hasWorkout: boolean;
  nutritionFocus?: string;
  nextMealTitle?: string;
}): AskCoachQuestion[] {
  const questions: AskCoachQuestion[] = [
    {
      id: 'training-readiness',
      category: 'training',
      text: input.hasWorkout
        ? "Should I increase today's intensity?"
        : 'Should I train today or recover?',
    },
    {
      id: 'training-replace',
      category: 'training',
      text: "Can I replace today's workout?",
    },
    {
      id: 'training-focus',
      category: 'training',
      text: "What should I focus on during today's session?",
    },
    {
      id: 'training-adjust',
      category: 'training',
      text: 'How should I adjust if I feel low energy?',
    },
    {
      id: 'recovery-adjust',
      category: 'recovery',
      text:
        input.recoveryScore !== undefined && input.recoveryScore < 60
          ? "Should I reduce today's workout?"
          : 'How ready am I today?',
    },
    {
      id: 'recovery-faster',
      category: 'recovery',
      text: 'How can I recover faster?',
    },
    {
      id: 'recovery-sleep',
      category: 'recovery',
      text: 'What should I do before sleep tonight?',
    },
    {
      id: 'recovery-warning',
      category: 'recovery',
      text: 'What recovery signs should I pay attention to?',
    },
    {
      id: 'nutrition-after-training',
      category: 'nutrition',
      text: input.hasWorkout
        ? 'What should I eat after training?'
        : 'What should I eat next?',
    },
    {
      id: 'nutrition-replace',
      category: 'nutrition',
      text: input.nextMealTitle
        ? `Can I replace ${input.nextMealTitle.toLowerCase()}?`
        : "Can I replace today's lunch?",
    },
    {
      id: 'nutrition-protein',
      category: 'nutrition',
      text: 'How should I time protein today?',
    },
    {
      id: 'nutrition-energy',
      category: 'nutrition',
      text: 'What should I eat for better energy?',
    },
    {
      id: 'goal-progress',
      category: 'goals',
      text: input.currentGoal
        ? `Am I progressing toward ${formatGoalType(input.currentGoal.type).toLowerCase()}?`
        : 'Am I progressing toward my goal?',
    },
    {
      id: 'goal-priority',
      category: 'goals',
      text: 'What matters most for my goal today?',
    },
    {
      id: 'goal-obstacle',
      category: 'goals',
      text: 'What could slow my progress this week?',
    },
    {
      id: 'goal-plan',
      category: 'goals',
      text: 'How should I balance training and nutrition for my goal?',
    },
    {
      id: 'habit-consistency',
      category: 'habits',
      text:
        input.habitSnapshot?.trend === 'declining'
          ? 'How do I get my consistency back?'
          : 'Which habit should I focus on today?',
    },
    {
      id: 'habit-routine',
      category: 'habits',
      text: 'How can I make today easier to follow through?',
    },
    {
      id: 'habit-missed',
      category: 'habits',
      text: 'What should I do if I miss a habit today?',
    },
    {
      id: 'habit-best',
      category: 'habits',
      text: 'Which routine is helping me most right now?',
    },
    {
      id: 'motivation-tired',
      category: 'motivation',
      text: 'Why am I feeling tired?',
    },
    {
      id: 'motivation-simple',
      category: 'motivation',
      text: 'What is one small win I can get today?',
    },
    {
      id: 'motivation-reset',
      category: 'motivation',
      text: 'How do I reset if the day gets off track?',
    },
    {
      id: 'motivation-confidence',
      category: 'motivation',
      text: 'What should I remember about my progress?',
    },
  ];

  if (input.coachDecision?.priority === 'nutrition' && input.nutritionFocus) {
    questions.unshift({
      id: 'nutrition-priority',
      category: 'nutrition',
      text: 'What is my nutrition priority today?',
    });
  }

  return dedupeQuestions(questions);
}

export function buildPersonalizedSuggestions(input: {
  coachDecision?: CoachDecision;
  currentGoal: CurrentGoal | null;
  habitSnapshot: HabitSnapshot | null;
  recoveryScore?: number;
  hasWorkout: boolean;
  nutritionFocus?: string;
}): AskCoachPersonalizedSuggestion[] {
  const suggestions: AskCoachPersonalizedSuggestion[] = [];

  if (input.recoveryScore !== undefined && input.recoveryScore < 65) {
    suggestions.push({
      id: 'recovery-lower',
      title: 'Ask why recovery needs attention.',
      explanation: 'Your coach can help you decide whether to lower intensity.',
      outcome: 'A safer plan for today',
      prompt: "Why is recovery important for today's plan?",
    });
  }

  if (input.hasWorkout) {
    suggestions.push({
      id: 'workout-priority',
      title: "Understand today's workout priority.",
      explanation: 'Get the reason behind the training focus before you start.',
      outcome: 'Clearer intent for the session',
      prompt: "What should I focus on in today's workout?",
    });
  }

  if (input.nutritionFocus) {
    suggestions.push({
      id: 'nutrition-goal',
      title: "Learn how today's meals affect your goal.",
      explanation: 'Connect your next meals to recovery, energy and progress.',
      outcome: 'Better food choices today',
      prompt: "How do today's meals support my goal?",
    });
  }

  if (input.currentGoal) {
    suggestions.push({
      id: 'goal-next-step',
      title: 'Ask for the next best step.',
      explanation: `Keep the focus tied to ${formatGoalType(input.currentGoal.type).toLowerCase()}.`,
      outcome: 'A simple action to follow',
      prompt: 'What is the next best step for my goal today?',
    });
  }

  if (input.habitSnapshot?.trend === 'improving') {
    suggestions.push({
      id: 'habit-momentum',
      title: 'Keep your habit momentum going.',
      explanation: 'Ask how to repeat what has been working recently.',
      outcome: 'More consistent follow-through',
      prompt: 'How can I keep my consistency improving?',
    });
  }

  return suggestions.slice(0, 3);
}

export function buildRecentConversations(
  messages: CoachChatHistoryMessage[],
): AskCoachRecentConversation[] {
  return messages
    .filter(
      (message) => message.role === 'user' && message.content.trim().length > 0,
    )
    .slice(-6)
    .reverse()
    .map((message, index) => ({
      id: `${message.createdAt}-${index}`,
      title: limitCoachText(cleanMessageTitle(message.content), 48),
      subtitle: formatCoachRelativeTime(message.createdAt, {
        style: 'recent',
      }),
    }))
    .slice(0, 3);
}

export function getDefaultCategory(
  priority: CoachDecision['priority'],
): AskCoachCategoryId {
  switch (priority) {
    case 'training':
      return 'training';
    case 'nutrition':
      return 'nutrition';
    case 'recovery':
      return 'recovery';
    case 'consistency':
      return 'habits';
    case 'motivation':
    default:
      return 'motivation';
  }
}

export function dedupeQuestions(
  questions: AskCoachQuestion[],
): AskCoachQuestion[] {
  const seen = new Set<string>();

  return questions.filter((question) => {
    const key = question.text.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function cleanMessageTitle(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[?.!]+$/, '')
    .trim();
}
