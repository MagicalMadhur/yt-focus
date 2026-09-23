import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, BackHandler, Platform, TouchableOpacity, Text, AppState } from 'react-native';
import { WebViewNavigation } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

  // Auto-trigger Picture-in-Picture on minimize / backgrounding if enabled
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        if (settings.pipYouTube) {
          webViewRef.current?.injectJavaScript(`
            (function() {
              if (window.__triggerZenTubePiP) {
                window.__triggerZenTubePiP();
              }
            })();
            true;
          `);
        }
      }
    });

    return () => subscription.remove();
  }, [settings.pipYouTube]);

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

  const handleTriggerPiP = useCallback(() => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        if (window.__triggerZenTubePiP) {
          window.__triggerZenTubePiP();
        }
      })();
      true;
    `);
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

      {/* Floating Picture-in-Picture Button */}
      {settings.pipYouTube && (
        <TouchableOpacity
          style={[styles.floatingPiPBtn, { top: insets.top + 8, right: 14 }]}
          onPress={handleTriggerPiP}
          activeOpacity={0.7}
        >
          <Ionicons name="copy-outline" size={13} color="#fff" />
          <Text style={styles.floatingPiPText}>PiP</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingPiPBtn: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 9999,
  },
  floatingPiPText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
