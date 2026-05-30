import React, { useRef, useState } from 'react';
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
  const scrollToFocus = useKeyboardFocusScroll();
  const isPasswordField = secureTextEntry === true;
  const isReadOnly = editable === false;

  React.useImperativeHandle(ref, () => inputRef.current as TextInput);

  const handleBlur = (event: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setFocused(false);
    setPasswordVisible(false);
    onBlur?.(event);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
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
              scrollFocusedInputIntoView(scrollToFocus, inputRef.current);
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
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  inputWithToggle: {
    paddingRight: spacing.xxl,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputSuccess: {
    borderColor: colors.success,
  },
  inputError: {
    borderColor: colors.error,
  },
  toggle: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
