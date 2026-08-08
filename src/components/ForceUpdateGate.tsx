import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import {
  getPlayStoreMarketUrl,
  getPlayStoreUrl,
  getStoreListingUrl,
} from '../constants/storeUrls';
import { colors, layout, spacing, typography } from '../constants/theme';
import { fetchAppUpdateConfig } from '../services/appConfig';
import { isBelowRequiredVersion } from '../utils/appVersion';

const DEFAULT_MESSAGE =
  'A newer version of LyVee is required to continue. Update the app to keep using LyVee.';

export function ForceUpdateGate() {
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [iosAppStoreId, setIosAppStoreId] = useState<string | undefined>();
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const config = await fetchAppUpdateConfig();
      if (cancelled || !config) return;

      const needsUpdate = isBelowRequiredVersion({
        minAndroidVersionCode: config.minAndroidVersionCode,
        minIosBuildNumber: config.minIosBuildNumber,
        minAppVersion: config.minAppVersion,
      });

      if (!needsUpdate) return;

      setMessage(
        config.message?.trim() ? config.message.trim() : DEFAULT_MESSAGE
      );
      setIosAppStoreId(config.iosAppStoreId);
      setBlocked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!blocked || Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [blocked]);

  const openStore = async () => {
    setOpening(true);
    try {
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(getPlayStoreMarketUrl());
          return;
        } catch {
          await Linking.openURL(getPlayStoreUrl());
          return;
        }
      }

      const url = getStoreListingUrl(iosAppStoreId);
      if (url) {
        await Linking.openURL(url);
        return;
      }

      // iOS listing not configured yet — still try Play-style web search fallback.
      await Linking.openURL('https://apps.apple.com/search?term=LyVee');
    } finally {
      setOpening(false);
    }
  };

  if (!blocked) return null;

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        /* hard block — ignore */
      }}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <Text style={styles.title}>Update required</Text>
          <Text style={styles.message}>{message}</Text>
          <Button
            title="Update"
            onPress={openStore}
            loading={opening}
            size="lg"
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 28,
    color: colors.text,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  button: {
    alignSelf: 'stretch',
  },
});
