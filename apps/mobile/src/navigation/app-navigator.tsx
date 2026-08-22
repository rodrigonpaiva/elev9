import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { TodayWorkout, WorkoutHistoryResponse } from '@elev9/types';
import { Text } from '@elev9/ui';

import { AskCoachScreen } from '../screens/ask-coach-screen';
import { useAuth } from '../auth/auth-provider';
import { ActiveWorkoutScreen } from '../screens/active-workout-screen';
import { CreateNutritionProfileScreen } from '../screens/create-nutrition-profile-screen';
import { CreateFitnessProfileScreen } from '../screens/create-fitness-profile-screen';
import { CreateProfileScreen } from '../screens/create-profile-screen';
import { CreateTrainingPlanScreen } from '../screens/create-training-plan-screen';
import { DailyCheckInHistoryScreen } from '../screens/daily-check-in-history-screen';
import { DailyCheckInScreen } from '../screens/daily-check-in-screen';
import { RecoveryScreenContainer } from '../features/recovery';
import { CoachChatScreen } from '../screens/coach-chat-screen';
import { CoachDailyBriefingScreen } from '../screens/coach-daily-briefing-screen';
import { CoachHomeScreen } from '../screens/coach-home-screen';
import { CoachInsightsScreen } from '../screens/coach-insights-screen';
import { CoachGoalGuidanceScreen } from '../screens/coach-goal-guidance-screen';
import { CoachNotificationsScreen } from '../screens/coach-notifications-screen';
import { CoachMemoryTimelineScreen } from '../screens/coach-memory-timeline-screen';
import { CoachWeeklyReviewScreen } from '../screens/coach-weekly-review-screen';
import { ExerciseDetailScreen } from '../screens/exercise-detail-screen';
import { ExerciseReplacementScreen } from '../screens/exercise-replacement-screen';
import { HomeResolverScreen } from '../screens/home-resolver-screen';
import { LoginScreen } from '../screens/login-screen';
import { RegisterScreen } from '../screens/register-screen';
import { LogMealScreen } from '../screens/log-meal-screen';
import { MainTabsScreen } from '../screens/main-tabs-screen';
import { MealDetailScreen } from '../screens/meal-detail-screen';
import {
  NutritionHistoryDayScreen,
  NutritionHistoryScreen,
} from '../screens/nutrition-history-screen';
import { NutritionOverviewScreen } from '../screens/nutrition-overview-screen';
import { NutritionPlanScreen } from '../screens/nutrition-plan-screen';
import { NutritionRecommendationsScreen } from '../screens/nutrition-recommendations-screen';
import { ReplaceMealScreen } from '../screens/replace-meal-screen';
import { RestTimerScreen } from '../screens/rest-timer-screen';
import { TodaysMealsScreen } from '../screens/todays-meals-screen';
import { TrainingAnalyticsScreen } from '../screens/training-analytics-screen';
import { WorkoutCompletionScreen } from '../screens/workout-completion-screen';
import { WorkoutOverviewScreen } from '../screens/workout-overview-screen';
import { WorkoutScreen } from '../screens/workout-screen';
import { WorkoutSessionDetailScreen } from '../screens/workout-history-screen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  HomeResolver: undefined;
  CreateProfile: undefined;
  CreateFitnessProfile: undefined;
  CreateTrainingPlan: {
    fitnessProfileId: string;
    goal?: 'lose_weight' | 'gain_muscle' | 'maintain';
    activityLevel?: 'low' | 'medium' | 'high';
  };
  CreateNutritionProfile:
    | {
        prefillGoal?: 'fat_loss' | 'maintenance' | 'muscle_gain';
      }
    | undefined;
  MainTabs:
    | {
        initialTab?:
          | 'home'
          | 'coach'
          | 'workout'
          | 'history'
          | 'progress'
          | 'profile';
      }
    | undefined;
  CoachHome: undefined;
  AskCoach: undefined;
  CoachChat:
    | {
        initialPrompt?: string;
        promptId?: string;
      }
    | undefined;
  CoachDailyBriefing: undefined;
  CoachInsights: undefined;
  CoachGoalGuidance: undefined;
  CoachNotifications: undefined;
  CoachMemoryTimeline: undefined;
  CoachWeeklyReview: undefined;
  DailyCheckIn:
    | {
        mode?: 'create' | 'edit';
        entryPoint?: 'dashboard' | 'other';
        initialValues?: import('@elev9/types').SubmitDailyCheckInRequest;
      }
    | undefined;
  DailyCheckInHistory: undefined;
  Recovery: undefined;
  MealDetail: {
    mealId: string;
  };
  LogMeal: {
    mealId: string;
  };
  ReplaceMeal: {
    mealId: string;
  };
  NutritionOverview: undefined;
  NutritionPlan: undefined;
  NutritionHistory: undefined;
  NutritionHistoryDay: { date: string };
  NutritionRecommendations: undefined;
  TodaysMeals: undefined;
  TrainingAnalytics: undefined;
  WorkoutOverview: {
    trainingPlanId: string;
    workout: TodayWorkout;
  };
  ActiveWorkout: {
    trainingPlanId: string;
    workout: TodayWorkout;
    initialProgress?: Array<{
      completedSets: boolean[];
    }>;
    replacementBanner?: string;
    replacementToken?: string;
    startedAt?: number;
    workoutSessionId?: string;
    resumeFromStorage?: boolean;
  };
  ExerciseDetail: {
    exercise: TodayWorkout['exercises'][number];
    workoutContext: {
      title: string;
      focus: string;
      format: string;
      intensity: TodayWorkout['intensity'];
    };
    replacementContext?: {
      trainingPlanId: string;
      workout: TodayWorkout;
      exerciseIndex: number;
      progress: Array<{
        completedSets: boolean[];
      }>;
      startedAt: number;
      workoutSessionId?: string;
    };
  };
  ExerciseReplacement: {
    trainingPlanId: string;
    workout: TodayWorkout;
    exerciseIndex: number;
    progress: Array<{
      completedSets: boolean[];
    }>;
    startedAt: number;
    workoutSessionId?: string;
  };
  RestTimer: {
    exerciseName: string;
    nextExerciseName: string;
    nextSetNumber: number;
    totalSets: number;
    reps: string;
    restSeconds: number;
    isWorkoutComplete: boolean;
    workoutSessionId?: string;
  };
  WorkoutCompletion: {
    trainingPlanId: string;
    workoutSessionId?: string;
    workout: TodayWorkout;
    durationMinutes: number;
    completedExercises: Array<{
      name: string;
      setsDone: number;
      repsDone: number;
    }>;
  };
  WorkoutSessionDetail: {
    workoutLog: WorkoutHistoryResponse['workoutLogs'][number];
  };
  Workout: {
    trainingPlanId: string;
    workout: TodayWorkout;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#22c55e" />
        <Text style={styles.loadingText}>Loading your training space...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {status === 'authenticated' ? (
          <>
            <Stack.Screen
              name="HomeResolver"
              component={HomeResolverScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateProfile"
              component={CreateProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateFitnessProfile"
              component={CreateFitnessProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateTrainingPlan"
              component={CreateTrainingPlanScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateNutritionProfile"
              component={CreateNutritionProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="MainTabs"
              component={MainTabsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CoachInsights"
              component={CoachInsightsScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="CoachGoalGuidance"
              component={CoachGoalGuidanceScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="CoachNotifications"
              component={CoachNotificationsScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="AskCoach"
              component={AskCoachScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="CoachMemoryTimeline"
              component={CoachMemoryTimelineScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="CoachWeeklyReview"
              component={CoachWeeklyReviewScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="CoachDailyBriefing"
              component={CoachDailyBriefingScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="CoachHome"
              component={CoachHomeScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="CoachChat"
              component={CoachChatScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="DailyCheckIn"
              component={DailyCheckInScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="DailyCheckInHistory"
              component={DailyCheckInHistoryScreen}
              options={{
                headerShown: true,
                title: 'Daily Check-in History',
                headerStyle: {
                  backgroundColor: '#020617',
                },
                headerTintColor: '#f8fafc',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="Recovery"
              component={RecoveryScreenContainer}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="TrainingAnalytics"
              component={TrainingAnalyticsScreen}
              options={{
                headerShown: true,
                title: 'Training Analytics',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="NutritionOverview"
              component={NutritionOverviewScreen}
              options={{
                headerShown: true,
                title: 'Nutrition',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="NutritionPlan"
              component={NutritionPlanScreen}
              options={{
                headerShown: true,
                title: 'Nutrition Plan',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="NutritionHistory"
              component={NutritionHistoryScreen}
              options={{
                headerShown: true,
                title: 'Nutrition History',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="NutritionHistoryDay"
              component={NutritionHistoryDayScreen}
              options={{
                headerShown: true,
                title: 'Nutrition Day',
              }}
            />
            <Stack.Screen
              name="NutritionRecommendations"
              component={NutritionRecommendationsScreen}
              options={{
                headerShown: true,
                title: 'Nutrition Recommendations',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="MealDetail"
              component={MealDetailScreen}
              options={{
                headerShown: true,
                title: 'Meal',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="LogMeal"
              component={LogMealScreen}
              options={{
                headerShown: true,
                title: 'Log Meal',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="ReplaceMeal"
              component={ReplaceMealScreen}
              options={{
                headerShown: true,
                title: 'Replace Meal',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="TodaysMeals"
              component={TodaysMealsScreen}
              options={{
                headerShown: true,
                title: "Today's Meals",
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="WorkoutOverview"
              component={WorkoutOverviewScreen}
              options={{
                headerShown: true,
                title: 'Workout',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="ActiveWorkout"
              component={ActiveWorkoutScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="ExerciseDetail"
              component={ExerciseDetailScreen}
              options={{
                headerShown: true,
                title: 'Exercise',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="ExerciseReplacement"
              component={ExerciseReplacementScreen}
              options={{
                headerShown: true,
                title: 'Replace Exercise',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="RestTimer"
              component={RestTimerScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="WorkoutCompletion"
              component={WorkoutCompletionScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="WorkoutSessionDetail"
              component={WorkoutSessionDetailScreen}
              options={{
                headerShown: true,
                title: 'Session',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#111827',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="Workout"
              component={WorkoutScreen}
              options={{
                headerShown: true,
                title: 'Workout',
                headerStyle: {
                  backgroundColor: '#020617',
                },
                headerTintColor: '#f8fafc',
                headerShadowVisible: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    color: '#94a3b8',
  },
});
