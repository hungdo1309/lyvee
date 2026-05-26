import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from './Card';
import { colors, radius, spacing } from '../constants/theme';

interface GroupCardProps {
  name: string;
  meta: string;
  onPress: () => void;
  expanded?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GroupCard({
  name,
  meta,
  onPress,
  expanded = false,
  selected = false,
  selectionMode = false,
  style,
}: GroupCardProps) {
  const variant = expanded || selected ? 'selected' : 'default';

  return (
    <Card
      variant={variant}
      onPress={onPress}
      style={style}
      accessibilityRole="button"
      accessibilityState={{ expanded, selected: selectionMode ? selected : expanded }}
    >
      <View style={styles.row}>
        {selectionMode && (
          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected && <View style={styles.radioInner} />}
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.name, expanded && styles.nameExpanded]}>{name}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        {!selectionMode && (
          <View style={[styles.chevronWrap, expanded && styles.chevronWrapExpanded]}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={expanded ? colors.primary : colors.textSecondary}
            />
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  nameExpanded: {
    color: colors.primaryDark,
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm / 2,
    lineHeight: 20,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    backgroundColor: colors.iconBg,
  },
  chevronWrapExpanded: {
    backgroundColor: colors.primaryLight,
  },
});
