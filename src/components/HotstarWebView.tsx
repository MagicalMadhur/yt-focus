import React, { useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as Linking from 'expo-linking';
import * as ScreenOrientation from 'expo-screen-orientation';
import { shouldBlockHotstarRequest, isHotstarAllowedUrl, getHotstarAdScript } from '../utils/hotstarFilter';
import { LoadingView } from './LoadingView';
import { useTheme } from '../theme/theme';

// Desktop Safari UA — Hotstar enables native HLS/FairPlay web video playback compatible
// with iOS WKWebView and does not show the mobile app download banner.
const DESKTOP_SAFARI_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15';

// ─── Component Types ────────────────────────────────────────────
export interface HotstarWebViewRef {
  goBack: () => void;
  reload: () => void;
  canGoBack: boolean;
}

interface HotstarWebViewProps {
  url: string;
  pipEnabled?: boolean;
  onNavigationStateChange?: (navState: WebViewNavigation) => void;
  onError?: () => void;
  onLoadEnd?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────────
export const HotstarWebView = forwardRef<HotstarWebViewRef, HotstarWebViewProps>(
  function HotstarWebView({ url, pipEnabled = true, onNavigationStateChange, onError, onLoadEnd, onFullscreenChange }, ref) {
    const webViewRef = useRef<WebView>(null);
    const canGoBackRef = useRef(false);
    const { theme } = useTheme();

    // Build injection script
    const injectedScript = useMemo(() => getHotstarAdScript(), []);

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

    // Request filter + ad domain blocking + app store suppression
    const handleShouldStartLoad = useCallback((request: ShouldStartLoadRequest): boolean => {
      const { url: reqUrl } = request;

      // Silently block app store and native app deep links
      if (
        reqUrl.includes('apps.apple.com') ||
        reqUrl.includes('itunes.apple.com') ||
        reqUrl.includes('play.google.com') ||
        reqUrl.startsWith('itms-apps:') ||
        reqUrl.startsWith('itms:') ||
        reqUrl.startsWith('hotstar:')
      ) {
        return false;
      }

      // Block ad-serving domains
      if (shouldBlockHotstarRequest(reqUrl)) {
        return false;
      }

      // Allow Hotstar and related URLs
      if (isHotstarAllowedUrl(reqUrl)) {
        return true;
      }

      // Allow data: and blob: URIs or valid web requests
      if (reqUrl.startsWith('data:') || reqUrl.startsWith('blob:') || reqUrl.startsWith('about:') || reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
        return true;
      }

      // Open other external deep links in system browser
      Linking.openURL(reqUrl).catch(() => {});
      return false;
    }, []);

    // Handle messages from injected JavaScript (fullscreen notifications)
    const handleMessage = useCallback((event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'fullscreen') {
          const isFS = !!data.isFullscreen;
          onFullscreenChange?.(isFS);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }, [onFullscreenChange]);

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
          allowsFullscreenVideo={false}
          allowsPictureInPictureMediaPlayback={pipEnabled}
          // Navigation
          allowsBackForwardNavigationGestures={true}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onMessage={handleMessage}
          // Injection: run BEFORE content loads and on load
          injectedJavaScriptBeforeContentLoaded={injectedScript}
          injectedJavaScript={injectedScript}
          // Loading
          startInLoadingState={true}
          renderLoading={renderLoading}
          // Error handling
          onError={() => onError?.()}
          onLoadEnd={() => onLoadEnd?.()}
          // Performance
          cacheEnabled={true}
          incognito={false}
          // iOS specific: mobile contentMode for responsive device-width scaling
          allowsLinkPreview={false}
          automaticallyAdjustContentInsets={false}
          contentMode="mobile"
          userAgent={DESKTOP_SAFARI_UA}
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
