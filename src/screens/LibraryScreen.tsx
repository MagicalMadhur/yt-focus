import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YouTubeWebView, YouTubeWebViewRef } from '../components/YouTubeWebView';
import { ErrorView } from '../components/ErrorView';
import { OfflineView } from '../components/OfflineView';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../theme/theme';

const YOUTUBE_LIBRARY = 'https://m.youtube.com/feed/library';

export function LibraryScreen() {
  const webViewRef = useRef<YouTubeWebViewRef>(null);
  const { isConnected } = useNetworkStatus();
  const { settings } = useSettings();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [hasError, setHasError] = useState(false);

  // Handle back button (Android)
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

  const handleRetry = useCallback(() => {
    setHasError(false);
    webViewRef.current?.reload();
  }, []);

  if (isConnected === false) {
    return <OfflineView onRetry={handleRetry} />;
  }

  if (hasError) {
    return <ErrorView onRetry={handleRetry} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <YouTubeWebView
        ref={webViewRef}
        url={YOUTUBE_LIBRARY}
        hideShorts={settings.hideShorts}
        contentFilter={settings.contentFilter}
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
