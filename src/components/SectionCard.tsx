import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Card } from './Card';
import { colors, layout, spacing, typography } from '../constants/theme';

interface SectionCardProps {
  title?: string;
  /** Use quieter sentence-case title (Invest-style). Default keeps uppercase labels. */
  quietTitle?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionCard({ title, quietTitle = false, children, style }: SectionCardProps) {
  return (
    <View style={[styles.wrapper, style]}>
      {title ? (
        <Text style={[styles.title, quietTitle && styles.titleQuiet]}>{title}</Text>
      ) : null}
      <Card padded style={styles.card}>
        {children}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: layout.screenPadding,
    marginBottom: layout.sectionGap,
  },
  title: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  titleQuiet: {
    ...typography.sectionTitle,
    textTransform: 'none',
  },
  card: {
    marginBottom: 0,
  },
});

interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: 16,
    color: colors.text,
  },
  value: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
