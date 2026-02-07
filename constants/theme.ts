/**
 * Aidra Design System
 * Clinical, trustworthy, calm — built for emergencies
 */
import { Platform } from 'react-native';

// Core palette — midnight clinical with teal & indigo
export const colors = {
  // Base
  background: '#07090d',
  surface: '#0f1218',
  surfaceElevated: '#161b22',

  // Brand & accents
  primary: '#00c9a7',       // Teal — health, action, calm
  primaryMuted: 'rgba(0, 201, 167, 0.18)',
  accent: '#6366f1',        // Indigo — trust, tech
  accentMuted: 'rgba(99, 102, 241, 0.18)',

  // Semantic
  success: '#10b981',
  successMuted: 'rgba(16, 185, 129, 0.18)',
  danger: '#f43f5e',
  dangerMuted: 'rgba(244, 63, 94, 0.18)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245, 158, 11, 0.18)',

  // Text
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Borders
  border: 'rgba(248, 250, 252, 0.06)',
  borderStrong: 'rgba(248, 250, 252, 0.1)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  title: {
    fontSize: 36,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  titleSmall: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
} as const;

// Legacy Colors export for compatibility
const tintColorLight = colors.primary;
const tintColorDark = colors.accent;

export const Colors = {
  light: {
    text: '#07090d',
    background: '#f8fafc',
    tint: tintColorLight,
    icon: '#64748b',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: colors.text,
    background: colors.background,
    tint: tintColorDark,
    icon: colors.textSecondary,
    tabIconDefault: colors.textMuted,
    tabIconSelected: colors.accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});