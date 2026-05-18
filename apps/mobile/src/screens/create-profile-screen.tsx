import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import { Button, Card, Input, Screen, Text, colors } from '@elev9/ui';

import { mobileApiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

export function CreateProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 2 && trimmedName.length <= 80;
  const nameError =
    name.length === 0
      ? null
      : !isValid
        ? 'Enter a name between 2 and 80 characters.'
        : null;

  async function handleCreateProfile() {
    if (!isValid) {
      setErrorMessage('Name must contain between 2 and 80 characters.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await mobileApiClient.users.createProfile({
        name: trimmedName,
      });
      navigation.replace('HomeResolver');
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to create your profile.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.content} scroll>
      <View style={styles.stack}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Onboarding</Text>
          <Text variant="headline" style={styles.title}>
            Let&apos;s set up your profile
          </Text>
          <Text style={styles.subtitle}>
            Start with your name so Elev9 can personalize your training flow.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text variant="title">Profile details</Text>
            <Text style={styles.sectionSubtitle}>
              This is the name that will appear in your dashboard.
            </Text>
          </View>
          <Input
            label="Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            errorMessage={nameError}
          />

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          <Button
            label="Continue"
            onPress={handleCreateProfile}
            loading={isSubmitting}
            disabled={!isValid}
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
    gap: 18,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionSubtitle: {
    color: colors.mutedText,
  },
  error: {
    color: '#fca5a5',
  },
  fullButton: {
    width: '100%',
  },
});
