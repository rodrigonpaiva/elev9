import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { TodayWorkout } from "@elev9/types";
import { Text } from "@elev9/ui";

import { useAuth } from "../auth/auth-provider";
import { CreateFitnessProfileScreen } from "../screens/create-fitness-profile-screen";
import { CreateProfileScreen } from "../screens/create-profile-screen";
import { CreateTrainingPlanScreen } from "../screens/create-training-plan-screen";
import { DailyCheckInHistoryScreen } from "../screens/daily-check-in-history-screen";
import { HomeResolverScreen } from "../screens/home-resolver-screen";
import { LoginScreen } from "../screens/login-screen";
import { MainTabsScreen } from "../screens/main-tabs-screen";
import { WorkoutScreen } from "../screens/workout-screen";

export type RootStackParamList = {
  Login: undefined;
  HomeResolver: undefined;
  CreateProfile: undefined;
  CreateFitnessProfile: undefined;
  CreateTrainingPlan: {
    fitnessProfileId: string;
    goal?: "lose_weight" | "gain_muscle" | "maintain";
    activityLevel?: "low" | "medium" | "high";
  };
  MainTabs: undefined;
  DailyCheckInHistory: undefined;
  Workout: {
    trainingPlanId: string;
    workout: TodayWorkout;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#22c55e" />
        <Text style={styles.loadingText}>Loading Elev9...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {status === "authenticated" ? (
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
              name="MainTabs"
              component={MainTabsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="DailyCheckInHistory"
              component={DailyCheckInHistoryScreen}
              options={{
                headerShown: true,
                title: "Recovery History",
                headerStyle: {
                  backgroundColor: "#020617",
                },
                headerTintColor: "#f8fafc",
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="Workout"
              component={WorkoutScreen}
              options={{
                headerShown: true,
                title: "Workout",
                headerStyle: {
                  backgroundColor: "#020617",
                },
                headerTintColor: "#f8fafc",
                headerShadowVisible: false,
              }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    color: "#94a3b8",
  },
});
