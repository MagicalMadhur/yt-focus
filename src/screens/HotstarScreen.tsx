import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { WebViewNavigation } from 'react-native-webview';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HotstarWebView, HotstarWebViewRef } from '../components/HotstarWebView';
import { ErrorView } from '../components/ErrorView';
import { OfflineView } from '../components/OfflineView';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from '../theme/theme';

const HOTSTAR_HOME = 'https://www.jiohotstar.com/';

export function HotstarScreen() {
  const webViewRef = useRef<HotstarWebViewRef>(null);
  const { isConnected } = useNetworkStatus();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [hasError, setHasError] = useState(false);

  // Handle back button (Android/hardware)
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const onBackPress = () => {
        if (webViewRef.current?.canGoBack) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // Hide/show tab bar on fullscreen change
  const handleFullscreenChange = useCallback((isFullscreen: boolean) => {
    navigation.getParent()?.setOptions({
      tabBarStyle: isFullscreen
        ? { display: 'none' }
        : undefined, // undefined restores the default style
    });
    // Also apply to this navigator
    navigation.setOptions({
      tabBarStyle: isFullscreen
        ? { display: 'none' }
        : undefined,
    });
  }, [navigation]);

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
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <HotstarWebView
        ref={webViewRef}
        url={HOTSTAR_HOME}
        onError={() => setHasError(true)}
        onFullscreenChange={handleFullscreenChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
