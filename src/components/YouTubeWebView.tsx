import React, { useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as Linking from 'expo-linking';
import * as ScreenOrientation from 'expo-screen-orientation';
import { buildInjectionScript } from '../utils/webViewScripts';
import { shouldBlockRequest } from '../utils/contentFilter';
import { LoadingView } from './LoadingView';
import { useTheme } from '../theme/theme';

// ─── YouTube URL helpers ────────────────────────────────────────
const YOUTUBE_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'accounts.google.com',
  'accounts.youtube.com',
  'consent.youtube.com',
  'consent.google.com',
  'myaccount.google.com',
  'gstatic.com',
  'googleusercontent.com',
  'googlevideo.com',
  'ytimg.com',
  'ggpht.com',
  'googleapis.com',
  'google.com',
];

function isYouTubeOrGoogleUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return YOUTUBE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// ─── User Agent ─────────────────────────────────────────────────
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// ─── Component Types ────────────────────────────────────────────
export interface YouTubeWebViewRef {
  goBack: () => void;
  reload: () => void;
  canGoBack: boolean;
}

interface YouTubeWebViewProps {
  url: string;
  hideShorts: boolean;
  contentFilter: boolean;
  onNavigationStateChange?: (navState: WebViewNavigation) => void;
  onError?: () => void;
  onLoadEnd?: () => void;
}

// ─── Component ──────────────────────────────────────────────────
export const YouTubeWebView = forwardRef<YouTubeWebViewRef, YouTubeWebViewProps>(
  function YouTubeWebView({ url, hideShorts, contentFilter, onNavigationStateChange, onError, onLoadEnd }, ref) {
    const webViewRef = useRef<WebView>(null);
    const canGoBackRef = useRef(false);
    const { theme } = useTheme();

    // Build injection script
    const injectedScript = useMemo(() => buildInjectionScript(hideShorts, contentFilter), [hideShorts, contentFilter]);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      goBack: () => webViewRef.current?.goBack(),
      reload: () => webViewRef.current?.reload(),
      get canGoBack() {
        return canGoBackRef.current;
      },
    }));

    // Navigation state handler
    const handleNavigationStateChange = useCallback(
      (navState: WebViewNavigation) => {
        canGoBackRef.current = navState.canGoBack;
        onNavigationStateChange?.(navState);
      },
      [onNavigationStateChange]
    );

      // External link handler + ad domain blocking
      const handleShouldStartLoad = useCallback((request: ShouldStartLoadRequest): boolean => {
        const { url: reqUrl } = request;

        // Natively block any navigation to a Shorts video
        if (hideShorts && reqUrl.includes('/shorts/')) {
          return false;
        }

        // Block ad-serving domains when content filter is enabled
        if (contentFilter && shouldBlockRequest(reqUrl)) {
          return false;
        }

      // Allow YouTube and Google auth URLs
      if (isYouTubeOrGoogleUrl(reqUrl)) {
        return true;
      }

      // Allow data: and blob: URIs (used by YouTube internally)
      if (reqUrl.startsWith('data:') || reqUrl.startsWith('blob:') || reqUrl.startsWith('about:')) {
        return true;
      }

      // Open external links in system browser
      Linking.openURL(reqUrl).catch(() => {});
      return false;
    }, [contentFilter]);

    // Handle messages from injected JavaScript
    const handleMessage = useCallback((event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'fullscreen') {
          if (data.isFullscreen) {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          } else {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }, []);

    // Render loading
    const renderLoading = useCallback(() => {
      return <LoadingView isDark={theme.isDark} />;
    }, [theme.isDark]);

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={[styles.webView, { backgroundColor: theme.colors.background }]}
          // JavaScript & Storage
          javaScriptEnabled={true}
          domStorageEnabled={true}
          // Cookies & Sessions
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          // Media
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          // Navigation
          allowsBackForwardNavigationGestures={true}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onMessage={handleMessage}
          // Injection
          injectedJavaScript={injectedScript}
          // Loading
          startInLoadingState={true}
          renderLoading={renderLoading}
          // Error handling
          onError={() => onError?.()}
          onHttpError={(syntheticEvent) => {
            const { statusCode } = syntheticEvent.nativeEvent;
            // Only treat 5xx as errors
            if (statusCode >= 500) {
              onError?.();
            }
          }}
          onLoadEnd={() => onLoadEnd?.()}
          // Performance
          cacheEnabled={true}
          incognito={false}
          // iOS specific
          allowsLinkPreview={false}
          automaticallyAdjustContentInsets={false}
          contentMode="mobile"
          // Misc
          pullToRefreshEnabled={true}
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows={false}
          mixedContentMode="compatibility"
          originWhitelist={['*']}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});
