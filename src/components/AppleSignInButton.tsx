import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  requestAppleSignInFromDevice,
  type AppleSignInPayload,
  type AuthIntent,
} from '../services/auth';
import { prepareAppleSignInNonces, takeAppleSignInNonce } from '../utils/appleSignIn';

interface AppleSignInButtonProps {
  /** Runs after Apple confirms (Face ID / Continue). Completes Firebase sign-in. */
  onAppleCredential: (payload: AppleSignInPayload) => Promise<void>;
  onAppleError?: (error: unknown) => void;
  /** Sync checks before opening Apple's sheet (e.g. legal acceptance). Return false to abort. */
  beforeStart?: () => boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Use SIGN_UP on the create-account screen. CONTINUE for linking in Settings. */
  type?: 'signIn' | 'signUp' | 'continue';
}

/**
 * Official Apple button. Opens Apple's system confirmation sheet from this button's tap.
 * Do not show on Android.
 */
export function AppleSignInButton({
  onAppleCredential,
  onAppleError,
  beforeStart,
  disabled = false,
  style,
  type = 'signIn',
}: AppleSignInButtonProps) {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    prepareAppleSignInNonces();
  }, []);

  if (Platform.OS !== 'ios') return null;

  const intent: AuthIntent = type === 'signUp' ? 'signUp' : 'signIn';
  const buttonType =
    type === 'signUp'
      ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
      : type === 'continue'
        ? AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
        : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN;

  return (
    <View style={[styles.wrap, style, disabled && styles.disabled]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={buttonType}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8}
        style={styles.button}
        onPress={async () => {
          if (disabled) return;
          if (beforeStart && !beforeStart()) return;

          const preparedNonce = takeAppleSignInNonce();
          if (!preparedNonce) {
            onAppleError?.(
              new Error(
                type === 'signUp'
                  ? 'Sign up with Apple is still starting. Wait a moment and try again.'
                  : 'Sign in with Apple is still starting. Wait a moment and try again.'
              )
            );
            prepareAppleSignInNonces();
            return;
          }

          try {
            const payload = await requestAppleSignInFromDevice(intent, preparedNonce);
            await onAppleCredential(payload);
          } catch (error) {
            onAppleError?.(error);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  button: {
    width: '100%',
    height: 48,
  },
  disabled: {
    opacity: 0.5,
  },
});
