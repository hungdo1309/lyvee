import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { appAlert } from '../../../src/utils/dialog';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { InfoRow, SectionCard } from '../../../src/components/SectionCard';
import { colors, layout, radius, spacing, typography } from '../../../src/constants/theme';
import { getNameInitials } from '../../../src/utils/names';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    appAlert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getNameInitials(user?.name ?? '', '?')}
            </Text>
          </View>
          <View>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>
      </Card>

      <SectionCard title="Support">
        <Button
          title="Send Feedback"
          variant="secondary"
          onPress={() => router.push('/(app)/feedback' as Href)}
        />
      </SectionCard>

      <SectionCard title="About">
        <InfoRow label="App" value="Lyvee v1.0.0" />
      </SectionCard>

      <View style={styles.footer}>
        <Button title="Sign Out" variant="danger" onPress={handleLogout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileCard: {
    marginHorizontal: layout.screenPadding,
    marginBottom: layout.sectionGap,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onPrimary,
    letterSpacing: -0.5,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm / 2,
  },
  footer: {
    marginTop: 'auto',
    padding: layout.screenPadding,
  },
});
