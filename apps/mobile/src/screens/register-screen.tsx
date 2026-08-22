import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Card, Input, Screen, Text, colors } from '@elev9/ui';

import { useAuth } from '../auth/auth-provider';
import {
  getOnboardingErrorCategory,
  trackOnboardingEvent,
} from '../analytics/onboarding-analytics';
import type { RootStackParamList } from '../navigation/app-navigator';
import {
  getRegistrationErrorMessage,
  validateRegistrationForm,
} from './register-screen-helpers';

export function RegisterScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackOnboardingEvent('registration_started');
  }, []);

  const validation = useMemo(
    () =>
      validateRegistrationForm({
        name,
        email,
        password,
        passwordConfirmation,
      }),
    [email, name, password, passwordConfirmation],
  );

  async function handleRegister() {
    if (isSubmitting) {
      return;
    }

    if (!validation.isValid) {
      setErrorMessage('Check the highlighted fields before continuing.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      trackOnboardingEvent('registration_completed');
      // AuthProvider switches to the authenticated navigator, whose first
      // screen is HomeResolver. Keeping navigation there preserves the
      // existing session bootstrap behavior.
    } catch (error) {
      trackOnboardingEvent('onboarding_error', {
        stage: 'registration',
        errorCategory: getOnboardingErrorCategory(error),
      });
      setErrorMessage(getRegistrationErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.content} scroll>
      <View style={styles.stack}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Create your account</Text>
          <Text variant="headline" style={styles.title}>
            Start your Elev9 journey
          </Text>
          <Text style={styles.subtitle}>
            Create an account and we&apos;ll guide you through your training
            setup next.
          </Text>
        </View>

        <Card style={styles.card}>
          <Input
            label="Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            errorMessage={name.length > 0 ? validation.nameError : null}
          />
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            errorMessage={email.length > 0 ? validation.emailError : null}
          />
          <Input
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            errorMessage={password.length > 0 ? validation.passwordError : null}
          />
          <Input
            label="Confirm password"
            placeholder="Repeat your password"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            errorMessage={
              passwordConfirmation.length > 0
                ? validation.passwordConfirmationError
                : null
            }
          />

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          <Button
            label="Create account"
            onPress={() => void handleRegister()}
            loading={isSubmitting}
            disabled={!validation.isValid || isSubmitting}
            style={styles.fullButton}
          />
          <Button
            label="Back to sign in"
            onPress={() => navigation.goBack()}
            variant="secondary"
            disabled={isSubmitting}
            style={styles.fullButton}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 32,
  },
  stack: {
    gap: 24,
  },
  hero: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
  },
  card: {
    gap: 16,
  },
  error: {
    color: '#fca5a5',
  },
  fullButton: {
    width: '100%',
  },
});
