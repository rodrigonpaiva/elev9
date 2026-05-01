import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ApiClientError } from "@elev9/api-client";
import { Button, Card, colors, Screen, Text } from "@elev9/ui";

import { apiClient } from "../api/client";
import { useAuth } from "../auth/auth-provider";
import type { RootStackParamList } from "../navigation/app-navigator";

export function HomeResolverScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void resolveNextScreen();
  }, []);

  async function resolveNextScreen() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.dashboard.getHome();
      const dashboard = response.dashboard;

      if (!dashboard.fitnessProfile) {
        navigation.replace("CreateFitnessProfile");
        return;
      }

      if (!dashboard.trainingPlan) {
        navigation.replace("CreateTrainingPlan", {
          fitnessProfileId: dashboard.fitnessProfile.id,
          goal: dashboard.fitnessProfile.goal,
          activityLevel: dashboard.fitnessProfile.activityLevel,
        });
        return;
      }

      navigation.replace("MainTabs");
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === "USER_PROFILE_NOT_FOUND"
      ) {
        navigation.replace("CreateProfile");
        return;
      }

      if (
        error instanceof ApiClientError &&
        error.code === "AUTH_INVALID_SESSION"
      ) {
        await signOut();
        return;
      }

      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to prepare your workspace.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Preparing your dashboard...</Text>
        </View>
      ) : (
        <Card style={styles.card}>
          <Text variant="title">Unable to continue</Text>
          <Text style={styles.errorText}>
            {errorMessage ?? "Unable to prepare your onboarding flow."}
          </Text>
          <Button
            label="Retry"
            onPress={() => void resolveNextScreen()}
            style={styles.fullButton}
          />
          <Button
            label="Logout"
            onPress={() => void signOut()}
            variant="secondary"
            style={styles.fullButton}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: "center",
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.mutedText,
  },
  card: {
    gap: 14,
  },
  errorText: {
    color: "#fca5a5",
  },
  fullButton: {
    width: "100%",
  },
});
