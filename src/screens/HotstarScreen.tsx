import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, BackHandler, Platform, TouchableOpacity, Text, StatusBar } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { HotstarWebView, HotstarWebViewRef } from '../components/HotstarWebView';
import { ErrorView } from '../components/ErrorView';
import { OfflineView } from '../components/OfflineView';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../theme/theme';

const HOTSTAR_HOME = 'https://www.hotstar.com/in';

export function HotstarScreen() {
  const webViewRef = useRef<HotstarWebViewRef>(null);
  const { isConnected } = useNetworkStatus();
  const { settings } = useSettings();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [hasError, setHasError] = useState(false);

  // Lock to landscape while viewing Hotstar, restore to portrait when leaving
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      StatusBar.setHidden(true);

      const onBackPress = () => {
        if (webViewRef.current?.canGoBack) {
          webViewRef.current.goBack();
          return true;
        }
        // At root of Hotstar, return to Home/YouTube tab
        (navigation as any).navigate('Home');
        return true;
      };

      const subscription = Platform.OS === 'android'
        ? BackHandler.addEventListener('hardwareBackPress', onBackPress)
        : null;

      return () => {
        // Restore to portrait when switching to other tabs
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        StatusBar.setHidden(false);
        subscription?.remove();
      };
    }, [navigation])
  );

  const handleRetry = useCallback(() => {
    setHasError(false);
    webViewRef.current?.reload();
  }, []);

  // Show offline view
  if (isConnected === false) {
    return <OfflineView onRetry={handleRetry} />;
  }

  // Show error view
  if (hasError) {
    return <ErrorView onRetry={handleRetry} />;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <HotstarWebView
        ref={webViewRef}
        url={HOTSTAR_HOME}
        pipEnabled={settings.pipHotstar}
        onError={() => setHasError(true)}
      />

      {/* Floating ZenTube button to easily switch back to YouTube */}
      <TouchableOpacity
        style={[styles.floatingBackBtn, { top: Math.max(insets.top, 16), left: '50%', transform: [{ translateX: -40 }] }]}
        onPress={() => (navigation as any).navigate('Home')}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={12} color="#fff" />
        <Text style={styles.floatingBackText}>ZenTube</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingBackBtn: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 9999,
  },
  floatingBackText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

