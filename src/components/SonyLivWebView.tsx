import React, { useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as Linking from 'expo-linking';
import { shouldBlockSonyLivRequest, isSonyLivAllowedUrl, getSonyLivAdScript } from '../utils/sonyLivFilter';
import { LoadingView } from './LoadingView';
import { useTheme } from '../theme/theme';

// Desktop Safari UA — Sony LIV enables native web video playback without app download prompts
const DESKTOP_SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15';

// ─── Component Types ────────────────────────────────────────────
export interface SonyLivWebViewRef {
  goBack: () => void;
  reload: () => void;
  canGoBack: boolean;
  injectJavaScript: (script: string) => void;
}

interface SonyLivWebViewProps {
  url: string;
  pipEnabled?: boolean;
  onNavigationStateChange?: (navState: WebViewNavigation) => void;
  onError?: () => void;
  onLoadEnd?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────────
export const SonyLivWebView = forwardRef<SonyLivWebViewRef, SonyLivWebViewProps>(
  function SonyLivWebView({ url, pipEnabled = true, onNavigationStateChange, onError, onLoadEnd, onFullscreenChange }, ref) {
    const webViewRef = useRef<WebView>(null);
    const canGoBackRef = useRef(false);
    const { theme } = useTheme();

    // Build injection script with anti-adblock bypass, PiP, and ad-skipping
    const injectedScript = useMemo(() => getSonyLivAdScript(pipEnabled), [pipEnabled]);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      goBack: () => webViewRef.current?.goBack(),
      reload: () => webViewRef.current?.reload(),
      injectJavaScript: (script: string) => webViewRef.current?.injectJavaScript(script),
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

    // Request filter + ad domain blocking + app store deep link suppression
    const handleShouldStartLoad = useCallback((request: ShouldStartLoadRequest): boolean => {
      const { url: reqUrl } = request;

      // Silently block app store and native app deep links
      if (
        reqUrl.includes('apps.apple.com') ||
        reqUrl.includes('itunes.apple.com') ||
        reqUrl.includes('play.google.com') ||
        reqUrl.startsWith('itms-apps:') ||
        reqUrl.startsWith('itms:') ||
        reqUrl.startsWith('sonyliv:')
      ) {
        return false;
      }

      // Block programmatic ad networks & trackers
      if (shouldBlockSonyLivRequest(reqUrl)) {
        return false;
      }

      // Allow Sony LIV and required player domains
      if (isSonyLivAllowedUrl(reqUrl)) {
        return true;
      }

      // Allow data: and blob: URIs
      if (
        reqUrl.startsWith('data:') ||
        reqUrl.startsWith('blob:') ||
        reqUrl.startsWith('about:') ||
        reqUrl.startsWith('http://') ||
        reqUrl.startsWith('https://')
      ) {
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
          allowsFullscreenVideo={true}
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
