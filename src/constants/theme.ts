/** LyVee brand palette — aligned with app icon and splash screen. */
export const brand = {
  purple: '#7A6FD8',
  purpleDark: '#5C51B8',
  purpleLight: '#9B8FE8',
  lavender: '#EDE8F5',
  lavenderSoft: '#F5F2FA',
};

export const colors = {
  background: brand.lavender,
  surface: '#FFFFFF',
  primary: brand.purple,
  primaryDark: brand.purpleDark,
  primaryLight: '#F0ECFA',
  text: '#1A1528',
  textSecondary: '#6E6785',
  textMuted: '#9A94AB',
  border: '#DDD4F5',
  borderLight: '#EFEBF7',
  error: '#DC2626',
  success: '#34C759',
  warning: '#FF9500',
  task: '#F59E0B',
  activity: brand.purple,
  document: '#10B981',
  overlay: 'rgba(26, 21, 40, 0.45)',
  iconBg: brand.lavenderSoft,
  onPrimary: '#FFFFFF',
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
    shadowColor: brand.purpleDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  fab: {
    shadowColor: brand.purpleDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
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
    dateTimeLabel: 'Expiration Date',
    supportsRecurring: false,
  },
};

export function itemTypeSupportsRecurring(type: keyof typeof itemTypeConfig): boolean {
  return itemTypeConfig[type].supportsRecurring;
}
