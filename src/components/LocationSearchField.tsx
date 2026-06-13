import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  PlaceSearchAnchor,
  PlaceSearchScope,
  TripLocation,
  tripLocationFromManual,
  tripLocationFromSearch,
} from '../types/places';
import { useLocationSearch } from '../hooks/useLocationSearch';
import {
  scrollFocusedInputIntoView,
  useKeyboardFocusScroll,
} from './KeyboardAwareScrollView';
import { colors, radius, spacing, typography } from '../constants/theme';

interface LocationSearchFieldProps {
  label?: string;
  value: TripLocation | null;
  onChange: (location: TripLocation | null) => void;
  onQueryChange?: (query: string) => void;
  scope?: PlaceSearchScope;
  placeholder?: string;
  allowManual?: boolean;
  error?: string;
  /** Prefer results near this place; falls back to device location when unset */
  near?: PlaceSearchAnchor;
  /** When true and `near` is empty or cannot be geocoded, bias search to the device location */
  allowDeviceFallback?: boolean;
}

export function LocationSearchField({
  label,
  value,
  onChange,
  onQueryChange,
  scope = 'region',
  placeholder = 'Search for a place',
  allowManual = true,
  error,
  near,
  allowDeviceFallback = false,
}: LocationSearchFieldProps) {
  const inputRef = useRef<TextInput>(null);
  const measureRef = useRef<View>(null);
  const scrollToFocus = useKeyboardFocusScroll();
  const suppressBlurRef = useRef(false);
  const [query, setQuery] = useState(value?.label ?? '');
  const [focused, setFocused] = useState(false);
  const isAirportScope = scope === 'airport';
  const { suggestions, loading, error: searchError } = useLocationSearch(
    query,
    scope,
    near,
    allowDeviceFallback
  );

  useEffect(() => {
    if (value) {
      setQuery(value.label);
      onQueryChange?.(value.label);
    } else {
      setQuery('');
      onQueryChange?.('');
    }
    // Only sync when the committed location changes, not while typing a draft query.
  }, [value]);

  const trimmedQuery = query.trim();
  const showResults = focused && trimmedQuery.length >= 2;
  const canUseManual =
    allowManual &&
    trimmedQuery.length >= 2 &&
    (!value || value.label !== trimmedQuery || value.source === 'manual');

  const handleQueryChange = (text: string) => {
    setQuery(text);
    onQueryChange?.(text);
  };

  const handleSelectSearch = (suggestion: (typeof suggestions)[number]) => {
    suppressBlurRef.current = false;
    onChange(tripLocationFromSearch(suggestion));
    setQuery(suggestion.label);
    onQueryChange?.(suggestion.label);
    setFocused(false);
  };

  const handleUseManual = () => {
    suppressBlurRef.current = false;
    onChange(tripLocationFromManual(trimmedQuery));
    onQueryChange?.(trimmedQuery);
    setFocused(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    onQueryChange?.('');
    setFocused(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (suppressBlurRef.current) {
        suppressBlurRef.current = false;
        return;
      }
      if (query.trim().length === 0 && value) {
        onChange(null);
      }
      setFocused(false);
    }, 200);
  };

  const handleResultPressIn = () => {
    suppressBlurRef.current = true;
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        ref={measureRef}
        collapsable={false}
        style={[
          styles.inputWrap,
          error && styles.inputWrapError,
          focused && !error && styles.inputWrapFocused,
        ]}
      >
        <Ionicons
          name={isAirportScope ? 'airplane-outline' : 'search-outline'}
          size={18}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={handleQueryChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize={isAirportScope ? 'characters' : 'words'}
          autoCorrect={false}
          onFocus={() => {
            setFocused(true);
            scrollFocusedInputIntoView(scrollToFocus, measureRef.current);
          }}
          onBlur={handleBlur}
          style={styles.input}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.trailingIcon} />
        ) : value ? (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={label ? `Clear ${label}` : 'Clear location'}
            style={styles.trailingIcon}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

      {showResults ? (
        <View style={styles.resultsCard}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.id}
                style={styles.resultRow}
                onPressIn={handleResultPressIn}
                onPress={() => handleSelectSearch(suggestion)}
              >
                <View style={styles.resultIcon}>
                  <Ionicons
                    name={isAirportScope ? 'airplane-outline' : 'location-outline'}
                    size={18}
                    color={colors.primaryDark}
                  />
                </View>
                <View style={styles.resultCopy}>
                  <Text style={styles.resultLabel}>{suggestion.label}</Text>
                  {suggestion.subtitle ? (
                    <Text style={styles.resultSubtitle}>{suggestion.subtitle}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
            {canUseManual ? (
              <TouchableOpacity
                style={styles.manualRow}
                onPressIn={handleResultPressIn}
                onPress={handleUseManual}
              >
                <Ionicons name="create-outline" size={18} color={colors.primaryDark} />
                <Text style={styles.manualText}>Use “{trimmedQuery}”</Text>
              </TouchableOpacity>
            ) : null}
            {suggestions.length === 0 && !loading && !canUseManual ? (
              <Text style={styles.emptyResults}>
                {isAirportScope ? 'No matching airports' : 'No matching places'}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
  },
  inputWrapError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  trailingIcon: {
    marginLeft: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
  resultsCard: {
    maxHeight: 240,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  emptyResults: {
    padding: spacing.md,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
  },
  manualText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCopy: {
    flex: 1,
    gap: 2,
  },
  resultLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  resultSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
