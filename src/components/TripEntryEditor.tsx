import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TripItineraryEntry } from '../types/trips';
import { PlaceSearchAnchor, TripLocation } from '../types/places';
import {
  createTripEntryId,
  formatTripDateKey,
  getTripTimeRangeError,
  normalizeTripTag,
  parseTripDateKey,
} from '../utils/trips';
import { buildAutoStayEntryTitle, parseAutoStayEntryId } from '../utils/tripStayEntries';
import {
  buildAutoFlightEntryTitle,
  parseAutoFlightEntryId,
  parseFlightLabelFromEntryTitle,
} from '../utils/tripFlightEntries';
import { formatTripTimeValue, parseTripTime } from '../utils/tripTime';
import { Input } from './Input';
import { Button } from './Button';
import { CancelButton } from './CancelButton';
import { LocationSearchField } from './LocationSearchField';
import { TagInput } from './TagInput';
import { TripTimeRangeField } from './TripTimeRangeField';
import { ItemDateTimeField } from './ItemDateTimeField';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { colors, radius, spacing, typography } from '../constants/theme';

const MAX_SHEET_HEIGHT = Dimensions.get('window').height * 0.88;

interface TripEntryEditorProps {
  visible: boolean;
  initialEntry?: TripItineraryEntry | null;
  entryDateKey?: string | null;
  tripStartDate?: string;
  tripEndDate?: string;
  searchNear?: PlaceSearchAnchor;
  onClose: () => void;
  onSave: (entry: TripItineraryEntry, entryDateKey: string) => Promise<void>;
}

function scheduledAtFromEntry(entryDateKey: string, time?: string): Date {
  const date = parseTripDateKey(entryDateKey);
  const parsedTime = parseTripTime(time);
  date.setHours(parsedTime.getHours(), parsedTime.getMinutes(), 0, 0);
  return date;
}

export function TripEntryEditor({
  visible,
  initialEntry,
  entryDateKey,
  tripStartDate,
  tripEndDate,
  searchNear,
  onClose,
  onSave,
}: TripEntryEditorProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [location, setLocation] = useState<TripLocation | null>(null);
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState<string | undefined>();
  const [endTime, setEndTime] = useState<string | undefined>();
  const [scheduledAt, setScheduledAt] = useState(() => new Date());
  const [planDate, setPlanDate] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stayEntryKind = useMemo(
    () => (initialEntry ? parseAutoStayEntryId(initialEntry.id)?.kind : null),
    [initialEntry]
  );

  const flightEntryKind = useMemo(
    () => (initialEntry ? parseAutoFlightEntryId(initialEntry.id)?.kind : null),
    [initialEntry]
  );

  const usesScheduledDateTime = Boolean(stayEntryKind || flightEntryKind);

  const stayEntryTitle = useMemo(() => {
    if (!stayEntryKind) return title;
    return buildAutoStayEntryTitle(stayEntryKind, location ?? undefined);
  }, [stayEntryKind, location, title]);

  const flightEntryTitle = useMemo(() => {
    if (!flightEntryKind || !initialEntry) return title;
    const flightLabel = parseFlightLabelFromEntryTitle(initialEntry.title);
    return buildAutoFlightEntryTitle(flightEntryKind, flightLabel);
  }, [flightEntryKind, initialEntry, title]);

  const timeRangeError = useMemo(() => {
    if (usesScheduledDateTime) return null;
    if (stayEntryKind === 'checkout') {
      return getTripTimeRangeError(undefined, endTime);
    }
    return getTripTimeRangeError(startTime, endTime);
  }, [usesScheduledDateTime, stayEntryKind, startTime, endTime]);

  useEffect(() => {
    if (!visible) return;
    setTitle(initialEntry?.title ?? '');
    setTags(initialEntry?.tag ? [initialEntry.tag] : []);
    setLocation(initialEntry?.location ?? null);
    setNotes(initialEntry?.notes ?? '');

    const resolvedDateKey = entryDateKey ?? formatTripDateKey(new Date());
    const entryTime =
      stayEntryKind === 'checkout' ? initialEntry?.startTime : initialEntry?.startTime;

    if (usesScheduledDateTime) {
      setScheduledAt(scheduledAtFromEntry(resolvedDateKey, entryTime));
      setStartTime(undefined);
      setEndTime(undefined);
    } else if (stayEntryKind === 'checkout') {
      setPlanDate(parseTripDateKey(resolvedDateKey));
      setStartTime(undefined);
      setEndTime(initialEntry?.startTime);
    } else {
      setPlanDate(parseTripDateKey(resolvedDateKey));
      setStartTime(initialEntry?.startTime);
      setEndTime(initialEntry?.endTime);
    }

    setError(null);
    setSaving(false);
  }, [visible, initialEntry, entryDateKey, stayEntryKind, usesScheduledDateTime]);

  const handleSave = async () => {
    setError(null);
    if (timeRangeError) {
      setError(timeRangeError);
      return;
    }
    setSaving(true);
    try {
      let resolvedStartTime: string | undefined;
      let resolvedEndTime: string | undefined;
      let resolvedDateKey = entryDateKey ?? formatTripDateKey(new Date());

      if (usesScheduledDateTime) {
        resolvedDateKey = formatTripDateKey(scheduledAt);
        resolvedStartTime = formatTripTimeValue(scheduledAt);
      } else {
        resolvedDateKey = formatTripDateKey(planDate);
        if (stayEntryKind === 'checkout') {
          resolvedStartTime = endTime;
        } else {
          resolvedStartTime = startTime;
          resolvedEndTime = endTime;
          if (!resolvedStartTime && !resolvedEndTime) {
            resolvedStartTime = undefined;
            resolvedEndTime = undefined;
          }
        }
      }

      const resolvedTitle = stayEntryKind
        ? buildAutoStayEntryTitle(stayEntryKind, location ?? undefined)
        : flightEntryKind
          ? buildAutoFlightEntryTitle(
              flightEntryKind,
              parseFlightLabelFromEntryTitle(initialEntry?.title ?? '')
            )
          : title;

      await onSave(
        {
          id: initialEntry?.id ?? createTripEntryId(),
          title: resolvedTitle,
          tag: stayEntryKind ? 'lodging' : flightEntryKind ? 'flight' : normalizeTripTag(tags[0] ?? ''),
          location: location ?? undefined,
          notes: notes.trim() || undefined,
          startTime: resolvedStartTime,
          endTime: resolvedEndTime,
        },
        resolvedDateKey
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save plan item');
    } finally {
      setSaving(false);
    }
  };

  const scheduledFieldLabel =
    stayEntryKind === 'checkin'
      ? 'Check in'
      : stayEntryKind === 'checkout'
        ? 'Check out'
        : flightEntryKind === 'depart'
          ? 'Departure'
          : flightEntryKind === 'arrive'
            ? 'Arrival'
            : undefined;

  const scheduledSheetTitle =
    stayEntryKind === 'checkin'
      ? 'Check in date & time'
      : stayEntryKind === 'checkout'
        ? 'Check out date & time'
        : flightEntryKind === 'depart'
          ? 'Departure date & time'
          : flightEntryKind === 'arrive'
            ? 'Arrival date & time'
            : 'Date & time';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          onPress={Keyboard.dismiss}
        >
          <KeyboardAwareScrollView
            style={{
              flex: 0,
              maxHeight: MAX_SHEET_HEIGHT - Math.max(insets.bottom, spacing.md),
            }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>
              {stayEntryKind
                ? stayEntryKind === 'checkin'
                  ? 'Edit check in'
                  : 'Edit check out'
                : flightEntryKind
                  ? flightEntryKind === 'depart'
                    ? 'Edit departure'
                    : 'Edit arrival'
                  : initialEntry
                    ? 'Edit plan item'
                    : 'Add plan item'}
            </Text>

            {stayEntryKind ? (
              <Input label="Title" value={stayEntryTitle} editable={false} />
            ) : flightEntryKind ? (
              <Input label="Title" value={flightEntryTitle} editable={false} />
            ) : (
              <Input
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="Museum visit, dinner reservation…"
              />
            )}

            {!stayEntryKind && !flightEntryKind ? (
              <TagInput
                label="Tag"
                tags={tags}
                onChange={setTags}
                maxTags={1}
                placeholder="Type a tag, press enter or comma"
              />
            ) : null}

            <LocationSearchField
              label={flightEntryKind ? undefined : 'Location'}
              value={location}
              onChange={setLocation}
              scope={flightEntryKind ? 'airport' : 'address'}
              near={searchNear}
              placeholder={
                flightEntryKind ? 'Search airport name or code' : 'Search address, venue, or neighborhood'
              }
              allowManual
            />

            {usesScheduledDateTime ? (
              <View style={styles.dateTimeGroup}>
                <ItemDateTimeField
                  value={scheduledAt}
                  onChange={setScheduledAt}
                  fieldLabel={scheduledFieldLabel}
                  sheetTitle={scheduledSheetTitle}
                  minDate={tripStartDate}
                  maxDate={tripEndDate}
                />
              </View>
            ) : (
              <>
                <View style={styles.dateTimeGroup}>
                  <ItemDateTimeField
                    value={planDate}
                    onChange={setPlanDate}
                    dateOnly
                    fieldLabel="Date"
                    sheetTitle="Plan date"
                  />
                </View>
                <TripTimeRangeField
                  startTime={startTime}
                  endTime={endTime}
                  onStartTimeChange={setStartTime}
                  onEndTimeChange={setEndTime}
                  showStart={stayEntryKind !== 'checkout'}
                  showEnd={!stayEntryKind}
                  startLabel="Start"
                  endLabel={stayEntryKind === 'checkout' ? 'Check out' : 'End'}
                  defaultEndTime={stayEntryKind === 'checkout' ? '11:00' : undefined}
                />
              </>
            )}

            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Reservation number, tips, links…"
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <CancelButton onPress={onClose} disabled={saving} />
              <Button
                title={initialEntry ? 'Save changes' : 'Add to day'}
                onPress={handleSave}
                loading={saving}
                disabled={Boolean(timeRangeError)}
              />
            </View>
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    maxHeight: MAX_SHEET_HEIGHT,
  },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingRight: spacing.xs,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.heading,
    fontSize: 20,
    marginBottom: spacing.md,
  },
  dateTimeGroup: {
    marginBottom: spacing.md,
  },
  notesInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
