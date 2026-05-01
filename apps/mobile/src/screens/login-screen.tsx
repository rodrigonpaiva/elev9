import { useState } from "react";

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
    <Screen contentClassName="justify-center bg-panel">
      <Card className="gap-5 border-0 bg-white px-6 py-8">
        <Text variant="headline">Elev9</Text>
        <Text className="text-slate">
          Sign in to continue your training plan and weekly progress.
        </Text>

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

        {errorMessage ? (
          <Text className="text-danger">{errorMessage}</Text>
        ) : null}

        <Button label="Login" loading={isSubmitting} onPress={handleSubmit} />
      </Card>
    </Screen>
  );
}
