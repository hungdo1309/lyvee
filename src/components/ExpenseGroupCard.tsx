import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from './Card';
import { ExpensesIcon } from './ExpensesIcon';
import { colors, radius, spacing, typography } from '../constants/theme';

interface ExpenseGroupCardProps {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress: () => void;
}

export function ExpenseGroupCard({ title, subtitle, meta, onPress }: ExpenseGroupCardProps) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.iconWrap}>
        <ExpensesIcon size={20} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.moneyMuted,
    borderWidth: 1,
    borderColor: colors.money,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.heading,
    fontSize: 17,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  meta: {
    ...typography.caption,
    marginTop: 2,
  },
});
