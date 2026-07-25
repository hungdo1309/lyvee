import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing, typography } from '../constants/theme';
import {
  scrollFocusedInputIntoView,
  useKeyboardFocusScroll,
} from './KeyboardAwareScrollView';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  highlight?: 'success' | 'error';
}

export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { label, error, highlight, style, onFocus, onBlur, secureTextEntry, editable, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const measureRef = useRef<View>(null);
  const scrollToFocus = useKeyboardFocusScroll();
  const isPasswordField = secureTextEntry === true;
  const isReadOnly = editable === false;

  const assignInputRef = useCallback(
    (node: TextInput | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  const handleBlur = (event: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setFocused(false);
    setPasswordVisible(false);
    onBlur?.(event);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View ref={measureRef} collapsable={false} style={styles.inputWrapper}>
        <TextInput
          ref={assignInputRef}
          placeholderTextColor={colors.textMuted}
          {...props}
          editable={editable}
          style={[
            styles.input,
            isPasswordField && styles.inputWithToggle,
            highlight === 'success' && styles.inputSuccess,
            (highlight === 'error' || error) && styles.inputError,
            focused && !error && !highlight && !isReadOnly && styles.inputFocused,
            style,
          ]}
          showSoftInputOnFocus={!isReadOnly}
          secureTextEntry={isPasswordField ? !passwordVisible : false}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
            if (!isReadOnly) {
              scrollFocusedInputIntoView(scrollToFocus, measureRef.current);
            }
          }}
          onBlur={handleBlur}
        />
        {isPasswordField ? (
          <Pressable
            style={styles.toggle}
            onPress={() => setPasswordVisible((visible) => !visible)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.mdTight,
    minHeight: 52,
    fontSize: 16,
    color: colors.text,
  },
  inputWithToggle: {
    paddingRight: spacing.xxl,
  },
  inputFocused: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  inputSuccess: {
    borderColor: colors.success,
    backgroundColor: colors.successMuted,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorMuted,
  },
  toggle: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
