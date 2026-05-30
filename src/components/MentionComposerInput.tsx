import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ScrollView,
  Platform,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { User } from '../types';
import { colors, radius, spacing, typography } from '../constants/theme';
import { MentionSuggestion, splitComposerBodyParts } from '../utils/commentMentions';
import { getNameInitials } from '../utils/names';
import {
  scrollFocusedInputIntoView,
  useKeyboardFocusScroll,
} from './KeyboardAwareScrollView';
import { commentMentionStyles, renderCommentBodyParts } from './commentMentionStyles';

const LINE_HEIGHT = 22;
const CHAR_WIDTH = 8.5;
const POPUP_ROW_HEIGHT = 36;
const POPUP_MAX_VISIBLE_ROWS = 4;
const POPUP_WIDTH = 228;
const HORIZONTAL_PADDING = spacing.md;
const VERTICAL_PADDING = spacing.md;
const DEFAULT_ASCENDER = Platform.OS === 'ios' ? 14.5 : 16;
const BASELINE_NUDGE = Platform.OS === 'ios' ? 1.5 : 2;
const CARET_WIDTH = 2;
const CARET_HEIGHT = 20;
const COMPOSER_FONT_SIZE = 16;
const COMPOSER_LINE_HEIGHT = 22;

type TextLayoutLine = TextLayoutEventData['lines'][number];

interface CaretPosition {
  x: number;
  y: number;
}

const androidTextMetrics = Platform.select({
  android: {
    includeFontPadding: false,
    textAlignVertical: 'top' as const,
    textBreakStrategy: 'simple' as const,
  },
  default: {},
});

function getCaretBaselineOffset(line: TextLayoutLine | undefined): number {
  if (!line) return DEFAULT_ASCENDER;

  // Prefer descender math when available — closest to the real baseline on both platforms.
  if (line.height > 0 && line.descender < 0) {
    return line.height + line.descender;
  }

  if (line.ascender > 0) {
    return line.ascender;
  }

  if (line.capHeight > 0) {
    return line.capHeight;
  }

  if (line.height > 0) {
    return line.height * (Platform.OS === 'android' ? 0.78 : 0.74);
  }

  return DEFAULT_ASCENDER;
}

function getCursorPositionFromLines(
  lines: TextLayoutLine[],
  charIndex: number,
  plainText: string
): { line: TextLayoutLine | undefined; x: number; y: number } {
  if (charIndex <= 0 || lines.length === 0) {
    return { line: lines[0], x: 0, y: 0 };
  }

  const linesHaveText = lines.some((line) => typeof line.text === 'string' && line.text.length > 0);

  if (!linesHaveText) {
    const explicitLines = plainText.split('\n');
    const lineIndex = Math.max(0, explicitLines.length - 1);
    const targetLine = lines[Math.min(lineIndex, lines.length - 1)] ?? lines[0];
    const indexInLine = explicitLines[lineIndex]?.length ?? 0;
    const linePlain = explicitLines[lineIndex] ?? '';
    const progress = linePlain.length > 0 ? indexInLine / linePlain.length : 1;

    return {
      line: targetLine,
      x: targetLine.x + targetLine.width * progress,
      y: targetLine.y,
    };
  }

  let count = 0;
  for (const line of lines) {
    const lineText = line.text ?? '';
    const nextCount = count + lineText.length;

    if (charIndex <= nextCount) {
      const indexInLine = charIndex - count;
      const progress = lineText.length > 0 ? indexInLine / lineText.length : 0;
      return {
        line,
        x: line.x + line.width * progress,
        y: line.y,
      };
    }

    count = nextCount;
  }

  const lastLine = lines[lines.length - 1];
  return {
    line: lastLine,
    x: lastLine.x + lastLine.width,
    y: lastLine.y,
  };
}

function getCaretPosition(lines: TextLayoutLine[], charIndex: number, plainText: string): CaretPosition {
  const { line, x, y } = getCursorPositionFromLines(lines, charIndex, plainText);
  const baseline = getCaretBaselineOffset(line);

  return {
    x: HORIZONTAL_PADDING + x,
    y: VERTICAL_PADDING + y + baseline + BASELINE_NUDGE - CARET_HEIGHT,
  };
}

interface MentionComposerInputProps extends TextInputProps {
  label?: string;
  members: User[];
  cursor: number;
  autoGrow?: boolean;
  minInputHeight?: number;
  maxInputHeight?: number;
  compact?: boolean;
  mentionSuggestions?: MentionSuggestion[];
  onSelectMention?: (insertToken: string) => void;
}

function getMentionPopupPosition(
  body: string,
  cursor: number,
  suggestionCount: number
): { top: number; left: number } {
  const safeCursor = Math.max(0, Math.min(cursor, body.length));
  const textBeforeCursor = body.slice(0, safeCursor);
  const lines = textBeforeCursor.split('\n');
  const lineIndex = lines.length - 1;
  const currentLine = lines[lineIndex] ?? '';
  const atIndexInLine = currentLine.lastIndexOf('@');
  const anchorColumn = atIndexInLine >= 0 ? atIndexInLine : currentLine.length;
  const popupHeight =
    Math.min(POPUP_MAX_VISIBLE_ROWS, Math.max(suggestionCount, 1)) * POPUP_ROW_HEIGHT + 8;

  const left = Math.min(HORIZONTAL_PADDING + anchorColumn * CHAR_WIDTH, 120);
  const lineTop = VERTICAL_PADDING + lineIndex * LINE_HEIGHT;
  const top = lineTop - popupHeight - 6;

  return { top, left };
}

interface MentionSuggestionPopupProps {
  suggestions: MentionSuggestion[];
  body: string;
  cursor: number;
  onSelect: (insertToken: string) => void;
}

function MentionSuggestionPopup({
  suggestions,
  body,
  cursor,
  onSelect,
}: MentionSuggestionPopupProps) {
  const position = useMemo(
    () => getMentionPopupPosition(body, cursor, suggestions.length),
    [body, cursor, suggestions.length]
  );

  return (
    <View
      style={[
        styles.mentionPopup,
        {
          top: position.top,
          left: position.left,
          maxHeight: POPUP_MAX_VISIBLE_ROWS * POPUP_ROW_HEIGHT + 8,
        },
      ]}
    >
      <ScrollView
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        showsVerticalScrollIndicator={suggestions.length > POPUP_MAX_VISIBLE_ROWS}
      >
        {suggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion.key}
            style={styles.mentionPopupRow}
            onPress={() => onSelect(suggestion.insertToken)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.mentionPopupAvatar,
                suggestion.kind === 'everyone' && styles.mentionPopupAvatarEveryone,
              ]}
            >
              {suggestion.kind === 'everyone' ? (
                <Ionicons name="people-outline" size={14} color={colors.primaryDark} />
              ) : (
                <Text style={styles.mentionPopupAvatarText}>
                  {getNameInitials(suggestion.label)}
                </Text>
              )}
            </View>
            <Text style={styles.mentionPopupName} numberOfLines={1}>
              {suggestion.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export const MentionComposerInput = React.forwardRef<TextInput, MentionComposerInputProps>(
  function MentionComposerInput(
    {
      label,
      members,
      cursor,
      style,
      value,
      onFocus,
      onBlur,
      editable,
      autoGrow = false,
      minInputHeight = 44,
      maxInputHeight = 160,
      compact = false,
      mentionSuggestions = [],
      onSelectMention,
      onContentSizeChange,
      ...props
    },
    ref
  ) {
    const [focused, setFocused] = useState(false);
    const [inputHeight, setInputHeight] = useState<number | undefined>(
      autoGrow ? minInputHeight : undefined
    );
    const inputRef = useRef<TextInput>(null);
    const scrollToFocus = useKeyboardFocusScroll();
    const [caretVisible, setCaretVisible] = useState(true);
    const [caretPos, setCaretPos] = useState<CaretPosition | null>(null);
    const isReadOnly = editable === false;
    const textValue = typeof value === 'string' ? value : '';
    const safeCursor = Math.max(0, Math.min(cursor, textValue.length));
    const textBeforeCursor = textValue.slice(0, safeCursor);
    const textAfterCursor = textValue.slice(safeCursor);

    React.useImperativeHandle(ref, () => inputRef.current as TextInput);

    React.useEffect(() => {
      if (!autoGrow) return;
      if (textValue.length === 0) {
        setInputHeight(minInputHeight);
      }
    }, [autoGrow, minInputHeight, textValue.length]);

    const parts = useMemo(
      () => splitComposerBodyParts(textValue, members, cursor),
      [textValue, members, cursor]
    );

    const partsBeforeCursor = useMemo(
      () => splitComposerBodyParts(textBeforeCursor, members, safeCursor),
      [members, safeCursor, textBeforeCursor]
    );

    const partsAfterCursor = useMemo(
      () => splitComposerBodyParts(textAfterCursor, members, 0),
      [members, textAfterCursor]
    );

    const showCustomCaret = focused && !isReadOnly;

    const handleCaretLayout = useCallback(
      (event: NativeSyntheticEvent<TextLayoutEventData>) => {
        if (!showCustomCaret) return;
        setCaretPos(getCaretPosition(event.nativeEvent.lines, textBeforeCursor.length, textBeforeCursor));
      },
      [partsAfterCursor, partsBeforeCursor, showCustomCaret, textBeforeCursor]
    );

    useEffect(() => {
      if (!showCustomCaret) {
        setCaretVisible(true);
        setCaretPos(null);
        return;
      }

      const interval = setInterval(() => {
        setCaretVisible((visible) => !visible);
      }, 530);

      return () => clearInterval(interval);
    }, [showCustomCaret]);

    const handleContentSizeChange: TextInputProps['onContentSizeChange'] = (event) => {
      if (autoGrow) {
        const nextHeight = Math.max(
          minInputHeight,
          Math.min(maxInputHeight, event.nativeEvent.contentSize.height)
        );
        setInputHeight(nextHeight);
      }
      onContentSizeChange?.(event);

      if (focused && !isReadOnly) {
        requestAnimationFrame(() => {
          scrollFocusedInputIntoView(scrollToFocus, inputRef.current);
        });
        setTimeout(() => {
          scrollFocusedInputIntoView(scrollToFocus, inputRef.current);
        }, 100);
      }
    };

    const resolvedInputHeight = autoGrow ? (inputHeight ?? minInputHeight) : minInputHeight;
    const showMentionPopup =
      focused &&
      mentionSuggestions.length > 0 &&
      typeof onSelectMention === 'function';

    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.inputArea}>
          {showMentionPopup ? (
            <MentionSuggestionPopup
              suggestions={mentionSuggestions}
              body={textValue}
              cursor={cursor}
              onSelect={onSelectMention}
            />
          ) : null}
          <View
            style={[
              styles.inputWrapper,
              focused && !isReadOnly && styles.inputWrapperFocused,
            ]}
          >
          <View style={styles.overlay} pointerEvents="none">
            {showCustomCaret ? (
              <Text style={styles.overlayText} onTextLayout={handleCaretLayout}>
                {textBeforeCursor.length > 0
                  ? renderCommentBodyParts(partsBeforeCursor, 'composer')
                  : null}
                {textAfterCursor.length > 0
                  ? renderCommentBodyParts(partsAfterCursor, 'composer')
                  : null}
              </Text>
            ) : textValue.length > 0 ? (
              <Text style={styles.overlayText}>
                {renderCommentBodyParts(parts, 'composer')}
              </Text>
            ) : null}
          </View>
          <TextInput
            ref={inputRef}
            placeholderTextColor={colors.textMuted}
            {...props}
            editable={editable}
            value={value}
            multiline
            scrollEnabled={
              autoGrow ? resolvedInputHeight >= maxInputHeight : props.scrollEnabled
            }
            onContentSizeChange={handleContentSizeChange}
            style={[
              styles.input,
              autoGrow ? { height: resolvedInputHeight } : null,
              style,
            ]}
            caretHidden={showCustomCaret}
            caretColor={colors.text}
            selectionColor={colors.primaryLight}
            showSoftInputOnFocus={!isReadOnly}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
              if (!isReadOnly) {
                scrollFocusedInputIntoView(scrollToFocus, inputRef.current);
              }
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
          />
          {showCustomCaret && caretPos && caretVisible ? (
            <View
              collapsable={false}
              pointerEvents="none"
              style={[
                styles.customCaret,
                {
                  left: caretPos.x,
                  top: caretPos.y,
                },
              ]}
            />
          ) : null}
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  containerCompact: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  inputArea: {
    position: 'relative',
    zIndex: 1,
  },
  mentionPopup: {
    position: 'absolute',
    width: POPUP_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1528',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  mentionPopupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: POPUP_ROW_HEIGHT,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  mentionPopupAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionPopupAvatarEveryone: {
    backgroundColor: colors.primaryLight,
  },
  mentionPopupAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  mentionPopupName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  inputWrapper: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'visible',
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  overlayText: {
    ...commentMentionStyles.bodyTextComposer,
    ...androidTextMetrics,
    alignSelf: 'stretch',
  },
  customCaret: {
    position: 'absolute',
    width: CARET_WIDTH,
    height: CARET_HEIGHT,
    backgroundColor: colors.text,
    borderRadius: 1,
    zIndex: 10,
    ...Platform.select({
      android: {
        elevation: 10,
      },
    }),
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: COMPOSER_FONT_SIZE,
    lineHeight: COMPOSER_LINE_HEIGHT,
    color: 'transparent',
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
    ...androidTextMetrics,
  },
});
