import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Appearance, ColorSchemeName, StatusBarStyle } from 'react-native';
import { getSettings } from '../services/storage';

// ─── Color Tokens ───────────────────────────────────────────────
export const colors = {
  // YouTube brand
  youtubeRed: '#FF0000',
  youtubeRedDark: '#CC0000',
  youtubeRedLight: '#FF4444',

  // Dark palette (YouTube Dark inspired)
  dark: {
    background: '#0F0F0F',
    surface: '#1A1A1A',
    surfaceElevated: '#242424',
    surfaceBorder: '#2E2E2E',
    text: '#F1F1F1',
    textSecondary: '#AAAAAA',
    textMuted: '#717171',
    navBar: '#181818',
    navBarBorder: '#2E2E2E',
    activeTab: '#FFFFFF',
    inactiveTab: '#717171',
    statusBar: 'light-content' as StatusBarStyle,
  },

  // Light palette
  light: {
    background: '#FFFFFF',
    surface: '#F8F8F8',
    surfaceElevated: '#FFFFFF',
    surfaceBorder: '#E5E5E5',
    text: '#0F0F0F',
    textSecondary: '#606060',
    textMuted: '#909090',
    navBar: '#FFFFFF',
    navBarBorder: '#E5E5E5',
    activeTab: '#0F0F0F',
    inactiveTab: '#909090',
    statusBar: 'dark-content' as StatusBarStyle,
  },
};

// ─── Typography ─────────────────────────────────────────────────
export const typography = {
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  small: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
};

// ─── Spacing & Layout ───────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// ─── Theme Type ─────────────────────────────────────────────────
export type ThemeColors = typeof colors.dark;
export type ThemeMode = 'dark' | 'light' | 'system';

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
}

// ─── Theme Resolver ─────────────────────────────────────────────
export function resolveTheme(mode: ThemeMode, systemScheme: ColorSchemeName): Theme {
  const isDark = mode === 'system' ? systemScheme !== 'light' : mode === 'dark';
  return {
    mode,
    isDark,
    colors: isDark ? colors.dark : colors.light,
    typography,
    spacing,
    borderRadius,
  };
}

// ─── Theme Context ──────────────────────────────────────────────
interface ThemeContextType {
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: resolveTheme('dark', 'dark'),
  setThemeMode: () => {},
});

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

// ─── Theme Provider ─────────────────────────────────────────────
interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode = 'dark' }: ThemeProviderProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const settings = await getSettings();
        setThemeMode(settings.theme);
      } catch {
        // Use default
      }
    })();
  }, []);

  const theme = useMemo(() => resolveTheme(themeMode, systemScheme), [themeMode, systemScheme]);

  const contextValue = useMemo(
    () => ({ theme, setThemeMode }),
    [theme]
  );

  return React.createElement(ThemeContext.Provider, { value: contextValue }, children);
}
