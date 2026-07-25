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
  /** Nested / pressed rows inside white cards (Invest-style surface ladder). */
  surfaceElevated: brand.lavenderSoft,
  primary: brand.purple,
  primaryDark: brand.purpleDark,
  primaryLight: '#F0ECFA',
  /** ~12% brand fills for pills, empty tiles, status panels. */
  primaryMuted: 'rgba(122, 111, 216, 0.12)',
  text: '#1A1528',
  textSecondary: '#6E6785',
  textMuted: '#9A94AB',
  /** Dimmer caption (Invest textDim analogue). */
  textDim: '#B0A9C0',
  border: '#DDD4F5',
  borderLight: '#EFEBF7',
  borderStrong: '#C9BDE8',
  error: '#DC2626',
  errorMuted: 'rgba(220, 38, 38, 0.12)',
  success: '#34C759',
  successMuted: 'rgba(52, 199, 89, 0.12)',
  warning: '#FF9500',
  warningMuted: 'rgba(255, 149, 0, 0.12)',
  task: '#F59E0B',
  activity: brand.purple,
  document: '#10B981',
  /** US-dollar green for expense/money UI */
  money: '#228B22',
  moneyLight: '#E8F5E9',
  moneyMuted: 'rgba(34, 139, 34, 0.12)',
  overlay: 'rgba(26, 21, 40, 0.45)',
  iconBg: brand.lavenderSoft,
  onPrimary: '#FFFFFF',
};

/** Spacing: 4 / 8 / 12 / 16 / 24 / 32 (xs stays 8 for existing layouts). */
export const spacing = {
  /** Dense rung (Invest xs) — prefer for tight icon gaps. */
  xxs: 4,
  sm: 8,
  /** Between sm and md — list row / chip density. */
  mdTight: 12,
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
  /** Quieter section titles (Invest-style sentence case). */
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    letterSpacing: 0,
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
  appHeaderHeight: 48,
  /** Space between the app header rule and screen content. */
  tabContentTopPadding: spacing.md,
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
