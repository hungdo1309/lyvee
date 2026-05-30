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
  const isDark = variant === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isDark ? styles.buttonDark : styles.buttonLight,
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
        <View style={styles.content}>
          <Image source={{ uri: GOOGLE_G_LOGO }} style={styles.logo} />
          <Text style={[styles.label, isDark && styles.labelDark]}>
            Sign in with Google
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#747775',
  },
  buttonDark: {
    backgroundColor: '#131314',
    borderWidth: 1,
    borderColor: '#8E918F',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    width: 20,
    height: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F1F1F',
    textAlign: 'center',
  },
  labelDark: {
    color: '#E3E3E3',
  },
  disabled: {
    opacity: 0.5,
  },
});
