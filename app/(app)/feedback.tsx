import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { appAlert } from '../../src/utils/dialog';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { submitFeedback } from '../../src/services/feedback';
import { FEEDBACK_SCREENS, type FeedbackScreen as FeedbackScreenName } from '../../src/types';
import { colors, spacing, typography, radius } from '../../src/constants/theme';
import { isFirebaseConfigured } from '../../src/config/firebase';

export default function FeedbackScreen() {
  const { user } = useAuth();
  const [screenName, setScreenName] = useState<FeedbackScreenName | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ screen?: string; message?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!screenName) next.screen = 'Select a screen';
    if (!message.trim()) next.message = 'Message is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user || !screenName) return;

    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Feedback cannot be sent until Firebase is set up.'
      );
      return;
    }

    setLoading(true);
    try {
      await submitFeedback({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        screenName,
        message,
      });
      appAlert('Thank you', 'Your feedback has been sent.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: unknown) {
      appAlert(
        'Could not send',
        error instanceof Error ? error.message : 'Failed to send feedback'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>
            Tell us what you were doing and how we can improve Lyvee.
          </Text>

          <Text style={styles.label}>Screen</Text>
          <View style={styles.screenGrid}>
            {FEEDBACK_SCREENS.map((screen) => {
              const selected = screenName === screen;
              return (
                <TouchableOpacity
                  key={screen}
                  style={[styles.screenChip, selected && styles.screenChipSelected]}
                  onPress={() => {
                    setScreenName(screen);
                    setErrors((e) => ({ ...e, screen: undefined }));
                  }}
                >
                  <Text
                    style={[
                      styles.screenChipText,
                      selected && styles.screenChipTextSelected,
                    ]}
                  >
                    {screen}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.screen ? <Text style={styles.error}>{errors.screen}</Text> : null}

          <Input
            label="Message"
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              setErrors((e) => ({ ...e, message: undefined }));
            }}
            placeholder="What happened? What would you like to see?"
            multiline
            numberOfLines={6}
            style={styles.messageInput}
            error={errors.message}
          />

          <Button
            title="Send Feedback"
            onPress={handleSubmit}
            loading={loading}
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  subtitle: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  screenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  screenChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  screenChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  screenChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  screenChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    color: colors.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  messageInput: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
});
