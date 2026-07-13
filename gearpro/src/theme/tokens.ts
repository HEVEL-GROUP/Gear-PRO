import { useColorScheme } from 'react-native';

export const font = {
  body: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
  display: 'Caprasimo_400Regular',
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

const palette = {
  sage: '#7a8a5e',
  sageDark: '#67754e',
  sageMuted: '#9aa886',
  sageSoft: '#e4e7d5',
  cream: '#f5ead8',
  creamDeep: '#efe2c9',
  ink: '#201e1d',
  terracotta: '#c67139',
  white: '#ffffff',
};

const lightTheme = {
  mode: 'light' as const,
  bg: palette.cream,
  surface: palette.white,
  surfaceAlt: '#faf6ec',
  text: palette.ink,
  textMuted: '#6f6a60',
  primary: palette.sage,
  primaryDark: palette.sageDark,
  onPrimary: palette.cream,
  soft: palette.sageSoft,
  softText: '#4a5334',
  track: palette.creamDeep,
  border: '#e6dcc6',
  bar: palette.ink,
  barText: palette.cream,
  barMuted: '#9a9a86',
  barActive: palette.terracotta,
  alert: palette.terracotta,
  alertSoft: '#f6e2d2',
  alertText: '#8a4a1e',
  ...palette,
};

const darkTheme = {
  ...lightTheme,
  mode: 'dark' as const,
  bg: '#17150f',
  surface: '#221f19',
  surfaceAlt: '#2a261f',
  text: palette.cream,
  textMuted: '#a89f8b',
  primary: '#8a9a6e',
  onPrimary: '#17150f',
  soft: '#33372a',
  softText: '#cdd4b8',
  track: '#33302a',
  border: '#39342b',
  bar: '#100f0a',
  barText: palette.cream,
  barMuted: '#8a8578',
  alertSoft: '#3a2a1f',
  alertText: '#e0a06a',
};

export type Theme = typeof lightTheme;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}
