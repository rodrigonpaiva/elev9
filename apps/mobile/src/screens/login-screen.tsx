import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ApiClientError } from "@elev9/api-client";
import { Button, Card, Input, Screen, Text } from "@elev9/ui";

import { useAuth } from "../auth/auth-provider";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to login.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Performance coaching</Text>
        <Text variant="headline" style={styles.title}>
          Elev9 Coach
        </Text>
        <Text style={styles.subtitle}>
          A focused mobile companion for training structure, daily execution,
          and steady progress.
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.formHeader}>
          <Text variant="title">Welcome back</Text>
          <Text style={styles.formSubtitle}>
            Sign in to access your dashboard and current training context.
          </Text>
        </View>

        <View style={styles.fields}>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />

          <Input
            label="Password"
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            value={password}
          />
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Button
          label="Login"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={styles.button}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: "center",
    gap: 24,
  },
  hero: {
    gap: 8,
    paddingHorizontal: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#0f766e",
  },
  title: {
    maxWidth: 260,
  },
  subtitle: {
    color: "#475569",
    maxWidth: 340,
  },
  card: {
    gap: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  formHeader: {
    gap: 6,
  },
  formSubtitle: {
    color: "#64748b",
  },
  fields: {
    gap: 16,
  },
  error: {
    color: "#dc2626",
  },
  button: {
    marginTop: 4,
  },
});
