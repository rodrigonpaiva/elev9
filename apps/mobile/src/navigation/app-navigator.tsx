import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { TodayWorkout } from "@elev9/types";
import { Text } from "@elev9/ui";

import { useAuth } from "../auth/auth-provider";
import { DashboardScreen } from "../screens/dashboard-screen";
import { LoginScreen } from "../screens/login-screen";
import { WorkoutHistoryScreen } from "../screens/workout-history-screen";
import { WorkoutScreen } from "../screens/workout-screen";

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  WorkoutHistory: undefined;
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
        <ActivityIndicator color="#0f766e" />
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
              name="Dashboard"
              component={DashboardScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WorkoutHistory"
              component={WorkoutHistoryScreen}
              options={{
                headerShown: true,
                title: "Workout History",
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
    backgroundColor: "#f3f7fb",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    color: "#475569",
  },
});
