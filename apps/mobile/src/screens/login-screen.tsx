import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { ApiClientError } from '@elev9/api-client';
import { Button, Card, Input, Screen, Text } from '@elev9/ui';
import { colors } from '@elev9/ui';

import { useAuth } from '../auth/auth-provider';

const isDemoModeEnabled =
  __DEV__ || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

export function LoginScreen() {
  const { signIn, signInDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  async function handleLogin() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to login.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    setErrorMessage(null);
    setIsDemoSubmitting(true);

    try {
      await signInDemo();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to start demo mode.');
      }
    } finally {
      setIsDemoSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.screenContent} scroll>
      <Animated.View
        style={[
          styles.animatedBlock,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          },
        ]}
      >
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

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          <View style={styles.buttonBlock}>
            <Button
              label="Sign in"
              loading={isSubmitting}
              onPress={handleLogin}
              style={styles.button}
            />
            {isDemoModeEnabled ? (
              <Button
                label="Try demo"
                loading={isDemoSubmitting}
                onPress={handleDemoLogin}
                variant="secondary"
                style={styles.button}
              />
            ) : null}
          </View>
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'center',
    gap: 24,
    paddingTop: 36,
    paddingBottom: 36,
  },
  animatedBlock: {
    gap: 22,
  },
  hero: {
    gap: 8,
    paddingHorizontal: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  title: {
    maxWidth: 260,
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
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
    color: colors.mutedText,
  },
  fields: {
    gap: 16,
  },
  error: {
    color: '#fca5a5',
  },
  buttonBlock: {
    gap: 10,
    width: '100%',
  },
  button: {
    marginTop: 4,
    width: '100%',
  },
});
