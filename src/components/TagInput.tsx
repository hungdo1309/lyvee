import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { TagPills } from './TagPills';
import { addTag, parseTagInput } from '../utils/tags';
import { colors, radius, spacing } from '../constants/theme';
import {
  scrollFocusedInputIntoView,
  useKeyboardFocusScroll,
} from './KeyboardAwareScrollView';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export function TagInput({
  tags,
  onChange,
  label = 'Tags',
  placeholder = 'Type a tag, press enter or comma',
  readOnly = false,
}: TagInputProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);
  const scrollToFocus = useKeyboardFocusScroll();

  const commitDraft = (raw: string) => {
    const next = addTag(tags, raw);
    if (next.length !== tags.length || next.some((t, i) => t !== tags[i])) {
      onChange(next);
    }
    setDraft('');
  };

  const handleChangeText = (text: string) => {
    if (text.includes(',')) {
      const { tags: parsed, remainder } = parseTagInput(text);
      let next = tags;
      for (const tag of parsed) {
        next = addTag(next, tag);
      }
      onChange(next);
      setDraft(remainder);
      return;
    }
    setDraft(text);
  };

  const handleSubmit = () => {
    if (draft.trim()) commitDraft(draft);
  };

  if (readOnly) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        {tags.length > 0 ? (
          <View style={styles.inputWrap}>
            <View style={styles.chips}>
              <TagPills tags={tags} size="md" />
            </View>
          </View>
        ) : (
          <Text style={styles.empty}>No tags</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        {tags.length > 0 && (
          <View style={styles.chips}>
            <TagPills
              tags={tags}
              size="md"
              onRemove={(tag) => onChange(tags.filter((t) => t !== tag))}
            />
          </View>
        )}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={draft}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          onFocus={() => scrollFocusedInputIntoView(scrollToFocus, inputRef.current)}
          placeholder={tags.length === 0 ? placeholder : 'Add another…'}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          blurOnSubmit={false}
        />
      </View>
      <Text style={styles.hint}>Press enter or comma to add · tags are lowercase</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  inputWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  chips: {
    marginBottom: spacing.sm,
    maxHeight: 72,
    overflow: 'hidden',
  },
  input: {
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  empty: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
