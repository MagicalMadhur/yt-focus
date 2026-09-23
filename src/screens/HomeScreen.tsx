import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { WebViewNavigation } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YouTubeWebView, YouTubeWebViewRef } from '../components/YouTubeWebView';
import { ErrorView } from '../components/ErrorView';
import { OfflineView } from '../components/OfflineView';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../theme/theme';
import { saveLastVisitedUrl, getLastVisitedUrl } from '../services/storage';

const YOUTUBE_HOME = 'https://m.youtube.com/';

export function HomeScreen() {
  const webViewRef = useRef<YouTubeWebViewRef>(null);
  const { isConnected } = useNetworkStatus();
  const { settings } = useSettings();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [hasError, setHasError] = useState(false);
  const [initialUrl, setInitialUrl] = useState<string>(YOUTUBE_HOME);
  const [isReady, setIsReady] = useState(false);

  // Determine initial URL based on settings
  useEffect(() => {
    (async () => {
      if (settings.rememberLastPage && !settings.openHomeOnStartup) {
        const lastUrl = await getLastVisitedUrl();
        if (lastUrl) {
          setInitialUrl(lastUrl);
        }
      }
      setIsReady(true);
    })();
  }, []);

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

  // Track navigation for "remember last page"
  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (settings.rememberLastPage && navState.url) {
        saveLastVisitedUrl(navState.url);
      }
    },
    [settings.rememberLastPage]
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

  if (!isReady) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <YouTubeWebView
        ref={webViewRef}
        url={initialUrl}
        hideShorts={settings.hideShorts}
        contentFilter={settings.contentFilter}
        pipEnabled={settings.pipYouTube}
        onNavigationStateChange={handleNavigationStateChange}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
