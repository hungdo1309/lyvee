import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  getGoogleSignInModule,
  isGoogleSignInNativeAvailable,
} from '../utils/googleSignInNative';

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Official Google styles: light (white + border) or dark (dark pill). */
  variant?: 'light' | 'dark';
}

const GOOGLE_G_LOGO =
  'https://developers.google.com/identity/images/g-logo.png';

export function GoogleSignInButton({
  onPress,
  loading = false,
  disabled = false,
  style,
  variant = 'light',
}: GoogleSignInButtonProps) {
  const isDisabled = disabled || loading;
  const nativeModule = isGoogleSignInNativeAvailable()
    ? getGoogleSignInModule()
    : null;
  const NativeGoogleSigninButton = nativeModule?.GoogleSigninButton;

  if (NativeGoogleSigninButton) {
    return (
      <View style={[styles.container, style]}>
        <NativeGoogleSigninButton
          size={NativeGoogleSigninButton.Size.Wide}
          color={
            variant === 'dark'
              ? NativeGoogleSigninButton.Color.Dark
              : NativeGoogleSigninButton.Color.Light
          }
          onPress={onPress}
          disabled={isDisabled}
          style={styles.nativeButton}
        />
        {loading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator
              color={variant === 'dark' ? '#FFFFFF' : '#1F1F1F'}
            />
          </View>
        ) : null}
      </View>
    );
  }

  const isDark = variant === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.fallbackButton,
        isDark ? styles.fallbackDark : styles.fallbackLight,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityLabel="Sign in with Google"
    >
      {loading ? (
        <ActivityIndicator color={isDark ? '#FFFFFF' : '#1F1F1F'} />
      ) : (
        <>
          <Image source={{ uri: GOOGLE_G_LOGO }} style={styles.logo} />
          <Text style={[styles.label, isDark && styles.labelDark]}>
            Sign in with Google
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  nativeButton: {
    width: '100%',
    height: 48,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 4,
  },
  fallbackButton: {
    width: '100%',
    height: 48,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  fallbackLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#747775',
  },
  fallbackDark: {
    backgroundColor: '#131314',
    borderWidth: 1,
    borderColor: '#8E918F',
  },
  logo: {
    width: 20,
    height: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F1F1F',
  },
  labelDark: {
    color: '#E3E3E3',
  },
  disabled: {
    opacity: 0.5,
  },
});
