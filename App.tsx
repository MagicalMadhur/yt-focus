import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ThemeProvider, useTheme } from './src/theme/theme';
import { SettingsProvider } from './src/hooks/useSettings';
import { BottomNavigation } from './src/components/BottomNavigation';

// Suppress non-critical warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// ─── App Content (inside providers) ─────────────────────────────
function AppContent() {
  const { theme } = useTheme();

  // Allow orientation changes for video fullscreen
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar
        barStyle={theme.colors.statusBar}
        backgroundColor={theme.colors.background}
        translucent={false}
      />
      <NavigationContainer
        theme={{
          dark: theme.isDark,
          colors: {
            primary: '#FF0000',
            background: theme.colors.background,
            card: theme.colors.navBar,
            text: theme.colors.text,
            border: theme.colors.navBarBorder,
            notification: '#FF0000',
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '800' },
          },
        }}
      >
        <BottomNavigation />
      </NavigationContainer>
    </>
  );
}

// ─── App Root ───────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
