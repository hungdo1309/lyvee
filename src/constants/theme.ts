export const colors = {
  background: '#F7F7F5',
  surface: '#FFFFFF',
  primary: '#007AFF',
  primaryLight: '#EBF5FF',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F0F0F0',
  error: '#DC2626',
  success: '#34C759',
  warning: '#FF9500',
  task: '#FF9500',
  activity: '#5856D6',
  document: '#34C759',
  overlay: 'rgba(0, 0, 0, 0.4)',
  iconBg: '#F2F2F7',
};

/** 8 / 16 / 24 / 32 spacing scale */
export const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  /** Alias for sm — prefer sm */
  xs: 8,
  /** Alias for xl — prefer xl */
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  largeTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
};

export const layout = {
  screenPadding: spacing.md,
  sectionGap: spacing.md,
  listGap: spacing.sm,
  tabContentTopPadding: spacing.lg / 2,
};

export const itemTypeConfig = {
  task: {
    label: 'Task',
    color: colors.task,
    icon: '✓',
    titlePlaceholder: 'What needs to happen?',
    dateTimeLabel: 'Due Date & Time',
    supportsRecurring: true,
  },
  activity: {
    label: 'Event/Activity',
    color: colors.activity,
    icon: '◉',
    titlePlaceholder: 'What are you planning?',
    dateTimeLabel: 'Date & Time',
    supportsRecurring: true,
  },
  document: {
    label: 'Document',
    color: colors.document,
    icon: '▤',
    titlePlaceholder: 'What is this document?',
    dateTimeLabel: 'Expired Date & Time',
    supportsRecurring: false,
  },
};

export function itemTypeSupportsRecurring(type: keyof typeof itemTypeConfig): boolean {
  return itemTypeConfig[type].supportsRecurring;
}
