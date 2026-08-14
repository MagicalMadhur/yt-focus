# YT Focus — Distraction-Free YouTube for iOS

A premium, distraction-free YouTube browsing experience built with React Native, Expo, and TypeScript. Wraps YouTube in a native WebView with optional Shorts hiding, persistent settings, and full video playback support.

## Features

- **Full-Screen YouTube WebView** — No address bar, no browser UI. Just YouTube.
- **Hide Shorts** — Optionally removes Shorts from Home, Search, navigation, and channel pages.
- **Native Bottom Navigation** — Home, Subscriptions, Library, Settings tabs.
- **Dark/Light/System Theme** — Premium dark mode inspired by YouTube's own design.
- **Persistent Settings** — Theme, Hide Shorts, Remember Last Page, and more.
- **Network-Aware** — Detects offline state and shows retry prompt.
- **Error Handling** — Graceful error views when YouTube fails to load.
- **Full-Screen Video** — Supports landscape orientation for video playback.
- **External Link Protection** — YouTube-external links open in system browser.
- **Cookie/Session Persistence** — YouTube login persists across sessions.

## Architecture

```
src/
├── components/
│   ├── YouTubeWebView.tsx      # Core WebView with YouTube config
│   ├── BottomNavigation.tsx    # Tab navigator with 4 tabs
│   ├── LoadingView.tsx         # Loading overlay
│   ├── ErrorView.tsx           # Error state with retry
│   └── OfflineView.tsx         # No-internet state with retry
│
├── screens/
│   ├── HomeScreen.tsx           # YouTube Home (m.youtube.com)
│   ├── SubscriptionsScreen.tsx  # YouTube Subscriptions feed
│   ├── LibraryScreen.tsx        # YouTube Library feed
│   └── SettingsScreen.tsx       # Native settings UI
│
├── services/
│   └── storage.ts              # AsyncStorage settings persistence
│
├── hooks/
│   ├── useNetworkStatus.ts     # Network connectivity hook
│   └── useSettings.ts          # Global settings context
│
├── utils/
│   └── webViewScripts.ts       # JavaScript injection scripts
│
└── theme/
    └── theme.ts                # Theme system (dark/light/system)
```

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **Expo CLI** (installed automatically via npx)
- **Physical iPhone** for testing (WebView doesn't work in Expo Go)

## Setup (Windows)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npx expo start
```

### 3. Testing on iPhone

> **Important:** `react-native-webview` is a native module that does NOT work in Expo Go. You need a **development build**.

#### Option A: EAS Development Build (Recommended)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Create a development build for iOS
eas build --profile development --platform ios

# Once built, install the dev client on your iPhone via the link provided
# Then start the dev server:
npx expo start --dev-client
```

#### Option B: Expo Go (Limited)

Expo Go will not render the WebView. Use it only for testing the Settings screen UI.

```bash
npx expo start
# Scan QR code with iPhone camera
```

## EAS iOS Build (No Mac Required)

You can build and submit to the App Store entirely from Windows using EAS Build.

### Prerequisites

1. **Apple Developer Account** ($99/year) — sign up at [developer.apple.com](https://developer.apple.com)
2. **Expo Account** — sign up at [expo.dev](https://expo.dev)
3. **EAS CLI** installed:
   ```bash
   npm install -g eas-cli
   eas login
   ```

### Build Commands

```bash
# Initialize EAS in your project (first time only)
eas init

# Development build (for testing with dev client)
eas build --profile development --platform ios

# Preview build (for internal TestFlight testing)
eas build --profile preview --platform ios

# Production build (for App Store)
eas build --profile production --platform ios
```

### Submit to App Store

```bash
# Submit your latest production build
eas submit --platform ios
```

EAS will handle code signing, provisioning profiles, and building on a remote macOS VM.

### Configuration

Edit `eas.json` to configure:
- **Apple ID** credentials for submission
- **Bundle identifier** in `app.json`
- **Build profiles** (development, preview, production)

## How Hide Shorts Works

The Hide Shorts feature uses **client-side CSS injection** via the WebView's `injectedJavaScript` prop.

### Mechanism

1. **CSS Injection**: A `<style>` element is injected into the YouTube page with `display: none !important` rules targeting Shorts-specific elements.

2. **DOM Manipulation**: Direct `element.style.display = 'none'` is applied to matched elements as a secondary measure.

3. **MutationObserver**: A `MutationObserver` watches for DOM changes (YouTube loads content dynamically) and re-applies hiding rules whenever new elements appear.

4. **SPA Navigation Detection**: An interval checks for URL changes (YouTube uses client-side navigation) and re-applies hiding after page transitions.

### Targeted Selectors

| Selector | What It Hides |
|----------|---------------|
| `ytd-reel-shelf-renderer` | Shorts carousel on home |
| `ytd-rich-shelf-renderer[is-shorts]` | Alternative Shorts shelf |
| `ytd-guide-entry-renderer:has(a[title="Shorts"])` | Sidebar Shorts link |
| `ytd-mini-guide-entry-renderer:has(a[title="Shorts"])` | Collapsed sidebar Shorts |
| `ytd-video-renderer:has([overlay-style="SHORTS"])` | Shorts in search results |
| `ytd-grid-video-renderer:has([overlay-style="SHORTS"])` | Shorts in grid views |
| `ytd-rich-item-renderer:has([overlay-style="SHORTS"])` | Shorts in rich item lists |
| `yt-tab-shape[tab-title="Shorts"]` | Shorts tab on channels |
| `ytm-reel-shelf-renderer` | Mobile Shorts shelf |
| `ytm-shorts-lockup-view-model` | Mobile Shorts cards |
| `ytm-pivot-bar-item-renderer:has(.pivot-shorts)` | Mobile nav Shorts button |

### Graceful Degradation

All injection code is wrapped in `try/catch`. If YouTube changes its DOM structure:
- The hiding simply stops working — Shorts become visible again.
- The app continues to function normally.
- No crashes or broken states.

## What This App Does NOT Do

- ❌ Block or circumvent advertisements
- ❌ Bypass DRM or content protection
- ❌ Intercept or extract YouTube credentials
- ❌ Download videos
- ❌ Modify video streams
- ❌ Act as a proxy server
- ❌ Collect any user data

The app is a simple WebView wrapper with optional UI customization.

## Known Limitations

1. **YouTube DOM Changes**: YouTube frequently updates its website structure. The Hide Shorts selectors may break at any time. The app handles this gracefully (Shorts become visible, nothing crashes).

2. **No Expo Go Support**: The WebView requires a native development build. Expo Go cannot render `react-native-webview`.

3. **Mobile YouTube Differences**: The app uses `m.youtube.com` (mobile web). Some desktop YouTube features may not be available.

4. **Cookie Persistence**: While `sharedCookiesEnabled` is set, some iOS WebView updates may clear cookies. YouTube login may need to be re-entered occasionally.

5. **Full-Screen Video**: Landscape orientation is unlocked, but the full-screen transition depends on YouTube's own mobile web player behavior.

6. **No iOS Simulator on Windows**: You cannot run the iOS simulator on Windows. Use a physical iPhone with a development build, or use EAS Build.

7. **YouTube Rate Limiting**: YouTube may occasionally show CAPTCHA or rate-limiting prompts in the WebView. This is normal YouTube behavior.

8. **Picture-in-Picture**: PiP support depends on the iOS version and YouTube's mobile web player implementation.

## License

This project is for personal/educational use. YouTube is a trademark of Google LLC.
