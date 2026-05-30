import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  InteractionManager,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Item, User } from '../types';
import { ItemComment } from '../types/comments';
import { MentionComposerInput } from './MentionComposerInput';
import { Button } from './Button';
import { renderCommentBodyParts } from './commentMentionStyles';
import { colors, radius, spacing } from '../constants/theme';
import {
  applyMentionSelection,
  getActiveMentionQuery,
  getMentionAutocompleteMembers,
  getMentionSuggestions,
  parseMentionsFromBody,
  splitCommentBodyParts,
} from '../utils/commentMentions';
import { getFirstName, getNameInitials } from '../utils/names';
import {
  buildCommentThreadViews,
  createItemComment,
  deleteItemComment,
  fetchCommentsForFocus,
  fetchItemCommentsPage,
  mergeItemCommentsIfChanged,
  subscribeToRecentItemComments,
  updateItemComment,
} from '../services/comments';
import { appAlert } from '../utils/dialog';
import {
  scrollElementIntoView,
  useScrollIntoView,
} from './KeyboardAwareScrollView';

interface ItemCommentsProps {
  item: Item;
  groupMembers: User[];
  groupMemberIds: string[];
  currentUserId?: string;
  focusCommentId?: string;
}

interface ComposerState {
  body: string;
}

const EMPTY_COMPOSER: ComposerState = {
  body: '',
};

const INITIAL_VISIBLE_THREADS = 5;
const THREADS_SHOW_MORE_STEP = 5;
const INITIAL_VISIBLE_REPLIES = 3;
const REPLIES_SHOW_MORE_STEP = 5;

function formatRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

const CommentBody = React.memo(function CommentBody({
  body,
  members,
}: {
  body: string;
  members: User[];
}) {
  const parts = useMemo(() => splitCommentBodyParts(body, members), [body, members]);

  return (
    <Text style={styles.commentBody}>
      {renderCommentBodyParts(parts, 'comment')}
    </Text>
  );
});

function getReplyThreadRootId(comment: ItemComment): string {
  if (!comment.parentCommentId) return comment.id;
  return comment.threadRootId ?? comment.parentCommentId;
}

interface CommentComposerPanelProps {
  variant: 'top' | 'inline';
  groupMembers: User[];
  composer: ComposerState;
  cursor: number;
  pendingSelection: { start: number; end: number } | null;
  mentionSuggestions: ReturnType<typeof getMentionSuggestions>;
  editingComment: ItemComment | null;
  submitting: boolean;
  inputRef: React.RefObject<TextInput | null>;
  onComposerChange: (body: string) => void;
  onSelectionChange: (start: number, end?: number) => void;
  onSelectMention: (insertToken: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

function CommentComposerPanel({
  variant,
  groupMembers,
  composer,
  cursor,
  pendingSelection,
  mentionSuggestions,
  editingComment,
  submitting,
  inputRef,
  onComposerChange,
  onSelectionChange,
  onSelectMention,
  onCancel,
  onSubmit,
}: CommentComposerPanelProps) {
  const isInline = variant === 'inline';

  return (
    <View style={isInline ? styles.inlineReplyComposer : styles.composerSection}>
      <View style={styles.composer}>
        <MentionComposerInput
          ref={inputRef}
          label={
            isInline
              ? undefined
              : editingComment
                ? 'Edit comment'
                : 'Add a comment'
          }
          members={groupMembers}
          cursor={cursor}
          value={composer.body}
          selection={pendingSelection ?? undefined}
          onChangeText={onComposerChange}
          onSelectionChange={(event) => {
            const { start, end } = event.nativeEvent.selection;
            onSelectionChange(start, end);
          }}
          mentionSuggestions={mentionSuggestions}
          onSelectMention={onSelectMention}
          placeholder={
            isInline
              ? 'Write a reply… Type @ to mention someone'
              : 'Write a comment… Type @ to mention someone'
          }
          autoGrow={isInline}
          minInputHeight={isInline ? 80 : 96}
          maxInputHeight={isInline ? 160 : 200}
          compact={isInline}
          multiline
          numberOfLines={isInline ? 1 : 4}
          style={isInline ? styles.inlineComposerInput : styles.composerInput}
        />
      </View>

      <View style={styles.composerActions}>
        <Button
          title="Cancel"
          variant="danger"
          onPress={onCancel}
          size={isInline ? 'md' : 'lg'}
          style={styles.composerActionButton}
        />
        <Button
          title="Post"
          onPress={onSubmit}
          loading={submitting}
          size={isInline ? 'md' : 'lg'}
          style={styles.composerActionButton}
        />
      </View>
    </View>
  );
}
const SWIPE_ACTION_WIDTH = 72;
const SWIPE_SNAP_THRESHOLD = 28;

interface CommentRowProps {
  comment: ItemComment;
  members: User[];
  authorName: string;
  authorInitials: string;
  currentUserId?: string;
  variant?: 'root' | 'reply';
  highlighted?: boolean;
  rowRef?: (node: View | null) => void;
  onReply: (comment: ItemComment) => void;
  onEdit: (comment: ItemComment) => void;
  onDelete: (comment: ItemComment) => void;
}

const CommentRow = React.memo(function CommentRow({
  comment,
  members,
  authorName,
  authorInitials,
  currentUserId,
  variant = 'root',
  highlighted = false,
  rowRef,
  onReply,
  onEdit,
  onDelete,
}: CommentRowProps) {
  const swipeRef = useRef<Swipeable>(null);
  const isOwn = comment.authorId === currentUserId;
  const isReply = variant === 'reply';

  const row = (
    <View
      ref={rowRef}
      collapsable={false}
      style={[
        styles.commentRow,
        isReply && styles.replyRow,
        highlighted && styles.commentRowHighlighted,
      ]}
    >
      <View style={[styles.avatar, isReply && styles.replyAvatar]}>
        <Text style={[styles.avatarText, isReply && styles.replyAvatarText]}>
          {authorInitials}
        </Text>
      </View>

      <View style={styles.commentContent}>
        <Text style={styles.metaLine}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.commentTime}>
            {formatRelativeTime(comment.createdAt)}
            {comment.editedAt ? ' · edited' : ''}
          </Text>
        </Text>

        <CommentBody body={comment.body} members={members} />

        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() => onReply(comment)} hitSlop={8}>
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
          {isOwn ? (
            <TouchableOpacity onPress={() => onEdit(comment)} hitSlop={8}>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );

  if (!isOwn) {
    return row;
  }

  const handleDeletePress = () => {
    swipeRef.current?.close();
    onDelete(comment);
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={handleDeletePress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Delete comment"
        >
          <Ionicons name="trash-outline" size={22} color={colors.onPrimary} />
        </TouchableOpacity>
      )}
      overshootRight={false}
      friction={1}
      rightThreshold={SWIPE_SNAP_THRESHOLD}
      activeOffsetX={[-10, 10]}
      failOffsetY={[-12, 12]}
    >
      {row}
    </Swipeable>
  );
});

export function ItemComments({
  item,
  groupMembers,
  groupMemberIds,
  currentUserId,
  focusCommentId,
}: ItemCommentsProps) {
  const scrollIntoView = useScrollIntoView();
  const [comments, setComments] = useState<ItemComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [visibleThreadCount, setVisibleThreadCount] = useState(INITIAL_VISIBLE_THREADS);
  const [visibleReplyCountByRoot, setVisibleReplyCountByRoot] = useState<Record<string, number>>(
    {}
  );
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [replyTo, setReplyTo] = useState<ItemComment | null>(null);
  const [editingComment, setEditingComment] = useState<ItemComment | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [pendingSelection, setPendingSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const composerRef = useRef<View>(null);
  const topInputRef = useRef<TextInput>(null);
  const replyInputRef = useRef<TextInput>(null);
  const commentsCursorRef = useRef<Awaited<
    ReturnType<typeof fetchItemCommentsPage>
  >['lastDoc']>(null);
  const initialCommentListenerRef = useRef(true);
  const commentRowRefs = useRef<Map<string, View>>(new Map());
  const focusAttemptRef = useRef<string | null>(null);

  const membersById = useMemo(
    () => new Map(groupMembers.map((member) => [member.id, member])),
    [groupMembers]
  );

  const getMemberDisplay = useCallback(
    (authorId: string) => {
      const member = membersById.get(authorId);
      const name = member ? getFirstName(member.name) : 'Member';
      return {
        authorName: name,
        authorInitials: getNameInitials(member?.name ?? name),
      };
    },
    [membersById]
  );

  const mentionAutocompleteMembers = useMemo(
    () => getMentionAutocompleteMembers(groupMembers, currentUserId),
    [groupMembers, currentUserId]
  );

  const mentionContext = useMemo(
    () => getActiveMentionQuery(composer.body, cursor),
    [composer.body, cursor]
  );

  const mentionSuggestions = useMemo(() => {
    if (!mentionContext) return [];
    return getMentionSuggestions(mentionAutocompleteMembers, mentionContext.query);
  }, [mentionAutocompleteMembers, mentionContext]);

  const commentThreads = useMemo(() => buildCommentThreadViews(comments), [comments]);

  const visibleCommentThreads = useMemo(
    () => commentThreads.slice(0, visibleThreadCount),
    [commentThreads, visibleThreadCount]
  );

  const hiddenThreadCount = Math.max(0, commentThreads.length - visibleThreadCount);
  const showSeeMore = hiddenThreadCount > 0 || hasMoreComments;

  const repliesByRootId = useMemo(() => {
    const map = new Map<string, ItemComment[]>();
    for (const thread of commentThreads) {
      map.set(thread.root.id, thread.replies);
    }
    return map;
  }, [commentThreads]);

  const replyThreadRootId = useMemo(
    () => (replyTo ? getReplyThreadRootId(replyTo) : null),
    [replyTo]
  );

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      if (!active) return;

      setLoading(true);
      setComments([]);
      setHasMoreComments(false);
      setVisibleThreadCount(INITIAL_VISIBLE_THREADS);
      setVisibleReplyCountByRoot({});
      commentsCursorRef.current = null;
      initialCommentListenerRef.current = true;

      unsubscribe = subscribeToRecentItemComments(item.id, (snapshot) => {
        if (!active) return;

        setComments((current) =>
          mergeItemCommentsIfChanged(current, snapshot.comments)
        );

        if (snapshot.lastDoc) {
          commentsCursorRef.current = snapshot.lastDoc;
        }

        if (initialCommentListenerRef.current) {
          initialCommentListenerRef.current = false;
          setHasMoreComments(snapshot.hasMore);
          setLoading(false);
          return;
        }
      });
    });

    return () => {
      active = false;
      task.cancel();
      unsubscribe?.();
    };
  }, [item.id]);

  const handleSeeMoreComments = useCallback(async () => {
    if (hiddenThreadCount > 0) {
      setVisibleThreadCount((count) => count + THREADS_SHOW_MORE_STEP);
      return;
    }

    if (!hasMoreComments || loadingMore) return;

    setLoadingMore(true);
    try {
      const page = await fetchItemCommentsPage(item.id, undefined, commentsCursorRef.current);
      setComments((current) => mergeItemCommentsIfChanged(current, page.comments));
      setHasMoreComments(page.hasMore);
      commentsCursorRef.current = page.lastDoc;
      setVisibleThreadCount((count) => count + THREADS_SHOW_MORE_STEP);
    } catch (error) {
      console.warn('[ItemComments] load more comments:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreComments, hiddenThreadCount, item.id, loadingMore]);

  const getVisibleReplyCount = useCallback(
    (rootId: string, totalReplies: number) => {
      const configured = visibleReplyCountByRoot[rootId] ?? INITIAL_VISIBLE_REPLIES;
      return Math.min(configured, totalReplies);
    },
    [visibleReplyCountByRoot]
  );

  const handleSeeMoreReplies = useCallback((rootId: string) => {
    setVisibleReplyCountByRoot((current) => ({
      ...current,
      [rootId]: (current[rootId] ?? INITIAL_VISIBLE_REPLIES) + REPLIES_SHOW_MORE_STEP,
    }));
  }, []);

  const expandRepliesForThread = useCallback((rootId: string, minimumVisible: number) => {
    setVisibleReplyCountByRoot((current) => ({
      ...current,
      [rootId]: Math.max(current[rootId] ?? INITIAL_VISIBLE_REPLIES, minimumVisible),
    }));
  }, []);

  const setCommentRowRef = useCallback((commentId: string, node: View | null) => {
    if (node) {
      commentRowRefs.current.set(commentId, node);
      return;
    }
    commentRowRefs.current.delete(commentId);
  }, []);

  useEffect(() => {
    focusAttemptRef.current = null;
    setHighlightedCommentId(null);
  }, [focusCommentId, item.id]);

  useEffect(() => {
    if (!focusCommentId || loading) return;
    if (focusAttemptRef.current === focusCommentId) return;

    let cancelled = false;

    const revealFocusedComment = async () => {
      let mergedComments = comments;
      let target = mergedComments.find((comment) => comment.id === focusCommentId);

      if (!target) {
        try {
          const fetched = await fetchCommentsForFocus(item.id, focusCommentId);
          if (cancelled || fetched.length === 0) return;
          mergedComments = mergeItemCommentsIfChanged(mergedComments, fetched);
          setComments(mergedComments);
          target = mergedComments.find((comment) => comment.id === focusCommentId);
        } catch (error) {
          console.warn('[ItemComments] fetchCommentsForFocus:', error);
          return;
        }
      }

      if (!target || cancelled) return;

      const threads = buildCommentThreadViews(mergedComments);
      const rootId = target.parentCommentId
        ? target.threadRootId ?? getReplyThreadRootId(target)
        : target.id;
      const threadIndex = threads.findIndex((thread) => thread.root.id === rootId);

      if (threadIndex >= 0) {
        setVisibleThreadCount((count) => Math.max(count, threadIndex + 1));

        if (target.parentCommentId) {
          const replyIndex = threads[threadIndex].replies.findIndex(
            (reply) => reply.id === target?.id
          );
          if (replyIndex >= 0) {
            expandRepliesForThread(rootId, replyIndex + 1);
          }
        }
      }

      focusAttemptRef.current = focusCommentId;
      setHighlightedCommentId(focusCommentId);
    };

    void revealFocusedComment();

    return () => {
      cancelled = true;
    };
  }, [comments, expandRepliesForThread, focusCommentId, item.id, loading]);

  useEffect(() => {
    if (!highlightedCommentId) return;

    const scrollTimer = setTimeout(() => {
      const row = commentRowRefs.current.get(highlightedCommentId);
      scrollElementIntoView(scrollIntoView, row);
    }, 120);

    return () => clearTimeout(scrollTimer);
  }, [highlightedCommentId, scrollIntoView, visibleCommentThreads, visibleReplyCountByRoot]);

  const resetComposer = useCallback(() => {
    setComposer(EMPTY_COMPOSER);
    setCursor(0);
    setPendingSelection(null);
    setReplyTo(null);
    setEditingComment(null);
    setComposerVisible(false);
  }, []);

  const focusTopComposer = useCallback(() => {
    requestAnimationFrame(() => {
      topInputRef.current?.focus();
    });
  }, []);

  const focusReplyComposer = useCallback(() => {
    requestAnimationFrame(() => {
      replyInputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (replyTo) {
      focusReplyComposer();
    }
  }, [replyTo, focusReplyComposer]);

  const openNewComment = useCallback(() => {
    setReplyTo(null);
    setEditingComment(null);
    setComposer(EMPTY_COMPOSER);
    setCursor(0);
    setPendingSelection(null);
    setComposerVisible(true);
    focusTopComposer();
  }, [focusTopComposer]);

  const handleComposerChange = useCallback(
    (body: string) => {
      setPendingSelection(null);
      setComposer({ body });
      setCursor((current) => {
        const previousLength = composer.body.length;
        const lengthDelta = body.length - previousLength;

        if (lengthDelta === 1 && current >= previousLength - 1) {
          return current + 1;
        }

        if (lengthDelta < 0 && current > body.length) {
          return body.length;
        }

        if (lengthDelta > 1 && current >= previousLength) {
          return current + lengthDelta;
        }

        return current;
      });
    },
    [composer.body]
  );

  const handleSelectMention = useCallback(
    (insertToken: string) => {
      if (!mentionContext) return;

      setComposer((currentComposer) => {
        const next = applyMentionSelection(
          currentComposer.body,
          mentionContext.startIndex,
          cursor,
          insertToken
        );
        setCursor(next.selectionStart);
        setPendingSelection({
          start: next.selectionStart,
          end: next.selectionStart,
        });
        requestAnimationFrame(() => {
          setPendingSelection(null);
        });
        (replyTo ? replyInputRef : topInputRef).current?.focus();
        return { body: next.body };
      });
    },
    [cursor, mentionContext, replyTo]
  );

  const handleReply = useCallback(
    (comment: ItemComment) => {
      setEditingComment(null);
      setComposerVisible(false);
      setReplyTo(comment);
      setComposer(EMPTY_COMPOSER);
      setCursor(0);
      setPendingSelection(null);
      focusReplyComposer();
    },
    [focusReplyComposer]
  );

  const handleEdit = useCallback(
    (comment: ItemComment) => {
      setReplyTo(null);
      setEditingComment(comment);
      setComposer({ body: comment.body });
      setCursor(comment.body.length);
      setPendingSelection(null);
      setComposerVisible(true);
      focusTopComposer();
    },
    [focusTopComposer]
  );

  const clearComposerForRemovedComments = useCallback((removedIds: Set<string>) => {
    setReplyTo((current) => (current && removedIds.has(current.id) ? null : current));
    setEditingComment((current) => {
      if (current && removedIds.has(current.id)) {
        setComposer(EMPTY_COMPOSER);
        setCursor(0);
        setPendingSelection(null);
        setComposerVisible(false);
        return null;
      }
      return current;
    });
  }, []);

  const handleDelete = useCallback(
    (comment: ItemComment) => {
      if (!currentUserId) return;

      const isRoot = !comment.parentCommentId;
      const replies = isRoot ? (repliesByRootId.get(comment.id) ?? []) : [];
      const message =
        isRoot && replies.length > 0
          ? `Delete this comment and ${replies.length} ${
              replies.length === 1 ? 'reply' : 'replies'
            }? This can't be undone.`
          : "Delete this comment? This can't be undone.";

      appAlert('Delete comment', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItemComment(item.id, comment, comments, currentUserId);
              const removedIds = new Set(
                isRoot ? [comment.id, ...replies.map((reply) => reply.id)] : [comment.id]
              );
              clearComposerForRemovedComments(removedIds);
            } catch (error: unknown) {
              appAlert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete comment'
              );
            }
          },
        },
      ]);
    },
    [clearComposerForRemovedComments, comments, currentUserId, item.id, repliesByRootId]
  );

  const handleSubmit = useCallback(async () => {
    if (!currentUserId) return;
    const body = composer.body.trim();
    if (!body) {
      appAlert('Error', 'Write a comment before posting');
      return;
    }

    const { mentionUserIds, mentionEveryone } = parseMentionsFromBody(
      body,
      mentionAutocompleteMembers,
      currentUserId
    );

    setSubmitting(true);
    try {
      const payload = {
        body,
        mentionUserIds,
        mentionEveryone,
      };

      if (editingComment) {
        await updateItemComment(
          item,
          editingComment,
          payload,
          currentUserId,
          groupMemberIds
        );
      } else {
        await createItemComment(
          item,
          {
            ...payload,
            parentCommentId: replyTo?.id ?? null,
          },
          currentUserId,
          groupMemberIds,
          replyTo
        );
        if (replyTo) {
          const rootId = getReplyThreadRootId(replyTo);
          expandRepliesForThread(
            rootId,
            (repliesByRootId.get(rootId)?.length ?? 0) + 1
          );
        }
      }
      resetComposer();
    } catch (error: unknown) {
      appAlert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save comment'
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    composer.body,
    currentUserId,
    editingComment,
    expandRepliesForThread,
    groupMemberIds,
    item,
    mentionAutocompleteMembers,
    repliesByRootId,
    replyTo,
    resetComposer,
  ]);

  const handleSelectionChange = useCallback((start: number, end: number = start) => {
    setPendingSelection(null);
    setCursor(end);
  }, []);

  const showFeedLoader = loading && comments.length === 0;
  const showEmptyState = !loading && commentThreads.length === 0;
  const showTopComposer = composerVisible || editingComment !== null;
  const showInlineReply = replyTo !== null;

  const composerPanelProps = useMemo(
    () => ({
      groupMembers,
      composer,
      cursor,
      pendingSelection,
      mentionSuggestions,
      editingComment,
      submitting,
      onComposerChange: handleComposerChange,
      onSelectionChange: handleSelectionChange,
      onSelectMention: handleSelectMention,
      onCancel: resetComposer,
      onSubmit: handleSubmit,
    }),
    [
      groupMembers,
      composer,
      cursor,
      pendingSelection,
      mentionSuggestions,
      editingComment,
      submitting,
      handleComposerChange,
      handleSelectionChange,
      handleSelectMention,
      resetComposer,
      handleSubmit,
    ]
  );

  return (
    <View style={styles.container} ref={composerRef}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Comments</Text>
        {!showTopComposer ? (
          <TouchableOpacity
            onPress={openNewComment}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add comment"
          >
            <Text style={styles.addCommentAction}>+ Comment</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.commentsPanel}>
        {showTopComposer ? (
          <>
            {editingComment ? (
              <View style={styles.contextBanner}>
                <Text style={styles.contextBannerText}>Editing your comment</Text>
              </View>
            ) : null}

            <CommentComposerPanel
              variant="top"
              inputRef={topInputRef}
              {...composerPanelProps}
            />
          </>
        ) : null}

        {showFeedLoader ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : showEmptyState && !showTopComposer && !showInlineReply ? (
          <Text style={styles.empty}>No comments yet.</Text>
        ) : showEmptyState && !showInlineReply ? null : (
          <View
            style={[
              styles.commentsFeed,
              showTopComposer && styles.commentsFeedWithComposer,
            ]}
          >
            {visibleCommentThreads.map(({ root, replies }, threadIndex) => {
              const rootDisplay = getMemberDisplay(root.authorId);
              const isReplyingInThread = replyThreadRootId === root.id;
              const visibleReplyCount = getVisibleReplyCount(root.id, replies.length);
              const visibleReplies = replies.slice(0, visibleReplyCount);
              const hiddenReplyCount = replies.length - visibleReplies.length;

              return (
                <View
                  key={root.id}
                  style={[styles.thread, threadIndex > 0 && styles.threadDivider]}
                >
                  <CommentRow
                    comment={root}
                    members={groupMembers}
                    authorName={rootDisplay.authorName}
                    authorInitials={rootDisplay.authorInitials}
                    currentUserId={currentUserId}
                    highlighted={highlightedCommentId === root.id}
                    rowRef={(node) => {
                      setCommentRowRef(root.id, node);
                    }}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                  {visibleReplies.map((reply) => {
                    const replyDisplay = getMemberDisplay(reply.authorId);

                    return (
                      <CommentRow
                        key={reply.id}
                        comment={reply}
                        members={groupMembers}
                        authorName={replyDisplay.authorName}
                        authorInitials={replyDisplay.authorInitials}
                        currentUserId={currentUserId}
                        variant="reply"
                        highlighted={highlightedCommentId === reply.id}
                        rowRef={(node) => {
                          setCommentRowRef(reply.id, node);
                        }}
                        onReply={handleReply}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                  {hiddenReplyCount > 0 ? (
                    <TouchableOpacity
                      style={styles.seeMoreRepliesButton}
                      onPress={() => handleSeeMoreReplies(root.id)}
                      accessibilityRole="button"
                      accessibilityLabel="See more replies"
                    >
                      <Ionicons name="chevron-down" size={16} color={colors.primary} />
                      <Text style={styles.seeMoreRepliesText}>See more replies</Text>
                    </TouchableOpacity>
                  ) : null}
                  {isReplyingInThread && replyTo ? (
                    <View style={styles.inlineReplyRow}>
                      <CommentComposerPanel
                        variant="inline"
                        inputRef={replyInputRef}
                        {...composerPanelProps}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
            {showSeeMore ? (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() => {
                  void handleSeeMoreComments();
                }}
                disabled={loadingMore}
                accessibilityRole="button"
                accessibilityLabel="See more comments"
              >
                {loadingMore ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="chevron-down" size={18} color={colors.primary} />
                    <Text style={styles.seeMoreText}>See more</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addCommentAction: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  loader: {
    marginVertical: spacing.md,
  },
  empty: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  commentsPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
  },
  commentsFeed: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  commentsFeedWithComposer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  thread: {
    paddingVertical: spacing.sm,
  },
  threadDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  seeMoreRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 40,
    paddingLeft: spacing.sm,
    paddingVertical: 4,
  },
  seeMoreRepliesText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  commentRowHighlighted: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
  },
  replyRow: {
    marginLeft: 40,
    paddingLeft: spacing.sm,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  replyAvatarText: {
    fontSize: 10,
  },
  commentContent: {
    flex: 1,
    minWidth: 0,
  },
  metaLine: {
    marginBottom: 2,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  metaDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  commentTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  commentBody: {
    fontSize: 15,
    lineHeight: 21,
  },
  commentActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteAction: {
    width: SWIPE_ACTION_WIDTH,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: radius.sm,
  },
  contextBanner: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  contextBannerText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  composerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  composerActionButton: {
    flex: 1,
  },
  composerSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  composer: {
    position: 'relative',
    zIndex: 2,
  },
  composerInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inlineReplyRow: {
    marginLeft: 40,
    paddingLeft: spacing.sm,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  inlineReplyComposer: {
    paddingTop: spacing.xs,
  },
  inlineComposerInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
