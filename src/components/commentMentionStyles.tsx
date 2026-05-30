import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/theme';
import { CommentBodyPart } from '../utils/commentMentions';

export const commentMentionStyles = StyleSheet.create({
  bodyTextComposer: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'top' as const,
      },
    }),
  },
  bodyTextComment: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  mentionTextComposer: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: colors.primaryLight,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'top' as const,
      },
    }),
  },
  mentionTextComment: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: colors.primaryLight,
  },
});

export function renderCommentBodyParts(
  parts: CommentBodyPart[],
  variant: 'composer' | 'comment'
) {
  const bodyStyle =
    variant === 'composer'
      ? commentMentionStyles.bodyTextComposer
      : commentMentionStyles.bodyTextComment;
  const mentionStyle =
    variant === 'composer'
      ? commentMentionStyles.mentionTextComposer
      : commentMentionStyles.mentionTextComment;

  return parts.map((part, index) =>
    part.type === 'mention' ? (
      <Text key={`${part.value}-${index}`} style={mentionStyle}>
        {part.value}
      </Text>
    ) : (
      <Text key={`${part.value}-${index}`} style={bodyStyle}>
        {part.value}
      </Text>
    )
  );
}
