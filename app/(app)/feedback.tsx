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
import Ionicons from '@expo/vector-icons/Ionicons';
import { appAlert } from '../../src/utils/dialog';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { ScreenBackButton } from '../../src/components/ScreenBackButton';
import { submitFeedback } from '../../src/services/feedback';
import {
  FEEDBACK_SCREEN_CATEGORIES,
  type FeedbackScreen as FeedbackScreenName,
} from '../../src/types';
import { colors, layout, spacing, typography, radius } from '../../src/constants/theme';
import { isFirebaseConfigured } from '../../src/config/firebase';

export default function FeedbackScreen() {
  const { user } = useAuth();
  const [screenName, setScreenName] = useState<FeedbackScreenName | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ screen?: string; message?: string }>({});

  const toggleCategory = (title: string) => {
    setExpandedCategory((current) => (current === title ? null : title));
  };

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenBackButton label="Back to Settings" showChevron />
        <Text style={styles.screenTitle}>Send feedback</Text>
      </View>

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

          <Text style={styles.fieldLabel}>Screen</Text>
          <Text style={styles.fieldHint}>
            Open a category, then choose the screen that fits best.
          </Text>
          {screenName ? (
            <Text style={styles.selectionSummary}>Selected: {screenName}</Text>
          ) : null}
          {FEEDBACK_SCREEN_CATEGORIES.map((category) => {
            const expanded = expandedCategory === category.title;
            const selectedInCategory = category.screens.some(
              (screen) => screen === screenName
            )
              ? screenName
              : null;

            return (
              <View key={category.title} style={styles.categoryBlock}>
                <TouchableOpacity
                  style={[
                    styles.categoryHeader,
                    expanded && styles.categoryHeaderExpanded,
                  ]}
                  onPress={() => toggleCategory(category.title)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                >
                  <View style={styles.categoryHeaderText}>
                    <Text
                      style={[
                        styles.categoryTitle,
                        expanded && styles.categoryTitleExpanded,
                      ]}
                    >
                      {category.title}
                    </Text>
                    {selectedInCategory && !expanded ? (
                      <Text style={styles.categorySelection}>{selectedInCategory}</Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={expanded ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>

                {expanded ? (
                  <View style={styles.screenGrid}>
                    {category.screens.map((screen) => {
                      const selected = screenName === screen;
                      return (
                        <TouchableOpacity
                          key={screen}
                          style={[styles.screenChip, selected && styles.screenChipSelected]}
                          onPress={() => {
                            setScreenName(screen);
                            setErrors((current) => ({ ...current, screen: undefined }));
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
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
                ) : null}
              </View>
            );
          })}
          {errors.screen ? <Text style={styles.error}>{errors.screen}</Text> : null}

          <Input
            label="Message"
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              setErrors((current) => ({ ...current, message: undefined }));
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
  header: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    ...typography.heading,
    fontSize: 24,
    marginTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  subtitle: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  fieldHint: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  selectionSummary: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  categoryBlock: {
    marginBottom: spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  categoryHeaderExpanded: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  categoryHeaderText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  categoryTitleExpanded: {
    color: colors.primary,
  },
  categorySelection: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs / 2,
  },
  screenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
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
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  messageInput: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
});
