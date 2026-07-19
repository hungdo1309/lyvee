import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { brand, colors, spacing } from '../constants/theme';

const uncheckedPrimary = `${brand.purple}73`;

interface LegalAcceptanceCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export function LegalAcceptanceCheckbox({
  checked,
  onChange,
  error,
}: LegalAcceptanceCheckboxProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.row}
        onPress={() => onChange(!checked)}
        hitSlop={6}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="I agree to the Terms of Use and Privacy Policy"
      >
        <Ionicons
          name={checked ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={checked ? colors.primary : error ? colors.error : uncheckedPrimary}
          style={styles.icon}
        />
        <Text style={[styles.label, checked && styles.labelChecked]}>
          I agree to the{' '}
          <Text
            style={styles.link}
            onPress={() => router.push('/(auth)/terms' as Href)}
            accessibilityRole="link"
          >
            Terms of Use
          </Text>
          {' '}and{' '}
          <Text
            style={styles.link}
            onPress={() => router.push('/(auth)/privacy' as Href)}
            accessibilityRole="link"
          >
            Privacy Policy
          </Text>
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: spacing.sm,
    marginTop: 1,
  },
  label: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    color: uncheckedPrimary,
    fontWeight: '500',
  },
  labelChecked: {
    color: colors.text,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  error: {
    fontSize: 13,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: 30,
  },
});
