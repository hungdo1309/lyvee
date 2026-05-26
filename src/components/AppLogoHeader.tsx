import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { APP_NAME } from '../constants/app';

interface AppLogoHeaderProps {
  tagline?: string;
  iconSize?: number;
}

export function AppLogoHeader({ tagline, iconSize = 96 }: AppLogoHeaderProps) {
  const radius = iconSize * 0.22;

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icon.png')}
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: radius,
        }}
        accessibilityLabel={`${APP_NAME} logo`}
      />
      <Text style={styles.wordmark}>{APP_NAME}</Text>
      {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  wordmark: {
    ...typography.title,
    fontSize: 40,
    color: colors.primary,
    letterSpacing: -1,
    marginTop: spacing.md,
  },
  tagline: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
