import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fab } from './Fab';
import { GroupsIcon } from './GroupsIcon';
import { colors, layout, shadows, spacing } from '../constants/theme';

interface GroupsFabMenuProps {
  open: boolean;
  onToggle: () => void;
  onJoin: () => void;
  onCreate: () => void;
}

const MAIN_FAB_SIZE = 56;
const ACTION_FAB_SIZE = 48;
const ACTION_GAP = spacing.sm;

export function GroupsFabMenu({
  open,
  onToggle,
  onJoin,
  onCreate,
}: GroupsFabMenuProps) {
  const insets = useSafeAreaInsets();
  const [actionsVisible, setActionsVisible] = useState(open);
  const slideProgress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const showModalLayer = open || actionsVisible;

  useEffect(() => {
    if (open) {
      setActionsVisible(true);
      Animated.spring(slideProgress, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
        mass: 0.8,
      }).start();
      return;
    }

    Animated.timing(slideProgress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setActionsVisible(false);
      }
    });
  }, [open, slideProgress]);

  const actionsStyle = {
    opacity: slideProgress,
    transform: [
      {
        translateY: slideProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [MAIN_FAB_SIZE + ACTION_GAP, 0],
        }),
      },
    ],
  };

  const mainFabStyle = {
    opacity: slideProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.42],
    }),
  };

  const backdropStyle = {
    opacity: slideProgress,
  };

  const renderMenu = (bottomOffset: number) => (
    <View style={[styles.menu, { bottom: bottomOffset }]} pointerEvents="box-none">
      {actionsVisible ? (
        <Animated.View style={[styles.actions, actionsStyle]}>
          <TouchableOpacity
            style={styles.actionFab}
            onPress={onJoin}
            accessibilityRole="button"
            accessibilityLabel="Join with invite code"
            activeOpacity={0.85}
          >
            <Ionicons name="ticket-outline" size={24} color={colors.onPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionFab}
            onPress={onCreate}
            accessibilityRole="button"
            accessibilityLabel="Create a group"
            activeOpacity={0.85}
          >
            <GroupsIcon size={24} color={colors.onPrimary} />
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      <Animated.View style={mainFabStyle}>
        <Fab
          embedded
          icon={open ? 'close' : 'add'}
          onPress={onToggle}
          accessibilityLabel={open ? 'Close group actions' : 'Add or join a group'}
        />
      </Animated.View>
    </View>
  );

  return (
    <>
      {!showModalLayer ? (
        <View style={[styles.menu, { bottom: spacing.lg }]} pointerEvents="box-none">
          <Fab
            embedded
            icon="add"
            onPress={onToggle}
            accessibilityLabel="Add or join a group"
          />
        </View>
      ) : null}

      <Modal
        visible={showModalLayer}
        transparent
        animationType="none"
        statusBarTranslucent={Platform.OS === 'android'}
        onRequestClose={onToggle}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityLabel="Close group actions"
          >
            <Animated.View style={[styles.backdrop, backdropStyle]} />
          </Pressable>

          {renderMenu(spacing.lg + insets.bottom)}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  menu: {
    position: 'absolute',
    right: layout.screenPadding,
    alignItems: 'center',
    zIndex: 10,
    elevation: Platform.OS === 'android' ? 12 : 0,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: ACTION_GAP,
    marginBottom: ACTION_GAP,
  },
  actionFab: {
    width: ACTION_FAB_SIZE,
    height: ACTION_FAB_SIZE,
    borderRadius: ACTION_FAB_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
});
