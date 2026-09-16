/**
 * Content filtering system for JioHotstar WebView.
 * Blocks ad-serving domains and removes ad/promo UI elements.
 */

// ─── Blocked Hotstar Ad Domains ─────────────────────────────────
const HOTSTAR_BLOCKED_DOMAINS: string[] = [
  // Google IMA SDK & Ad servers
  'imasdk.googleapis.com',
  'pubads.g.doubleclick.net',
  'securepubads.g.doubleclick.net',
  'googleads.g.doubleclick.net',
  'ad.doubleclick.net',
  'static.doubleclick.net',
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  'pagead2.googlesyndication.com',
  'pagead2.google.com',
  'adservice.google.com',
  's0.2mdn.net',
  // Tracking
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'app-measurement.com',
  // Hotstar specific ad infra
  'pubmatic.com',
  'ads.pubmatic.com',
  'gads.pubmatic.com',
  'adsrvr.org',
  'adnxs.com',
  'moatads.com',
  'serving-sys.com',
  'scorecardresearch.com',
  'comscore.com',
  'rubiconproject.com',
  'openx.net',
  'spotxchange.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'casalemedia.com',
  'amazon-adsystem.com',
  'media.net',
  'advertising.com',
  'adobedtm.com',
  'demdex.net',
  'omtrdc.net',
  'turn.com',
  'aniview.com',
  'springserve.com',
  'go.hotstar.com',
];

const HOTSTAR_BLOCKED_PATTERNS: RegExp[] = [
  /\/ads\//i,
  /\/ad\//i,
  /\/pagead\//i,
  /adserver/i,
  /adunit/i,
  /doubleclick/i,
  /\bvastUrl\b/i,
  /\bvast\.xml\b/i,
  /\/ptracking/i,
  /\btracking\.js/i,
  /\/beacon\?/i,
  /\/collect\?/i,
  /apps\.apple\.com/i,
  /itunes\.apple\.com/i,
  /play\.google\.com/i,
  /\/download\b/i,
  /hotstar:\/\/./i,
];

/**
 * Check if a URL should be blocked for Hotstar.
 */
export function shouldBlockHotstarRequest(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Never block Hotstar's own core domains (except go.hotstar.com ad domain)
    const isHotstarCore =
      (hostname === 'hotstar.com' ||
        hostname.endsWith('.hotstar.com') ||
        hostname === 'jiohotstar.com' ||
        hostname.endsWith('.jiohotstar.com') ||
        hostname.endsWith('.hotstarext.com')) &&
      hostname !== 'go.hotstar.com';

    if (isHotstarCore) {
      // Only block if it is explicitly an app store redirect or /download landing page
      return /\/download\b/i.test(parsed.pathname);
    }

    for (const domain of HOTSTAR_BLOCKED_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }

    for (const pattern of HOTSTAR_BLOCKED_PATTERNS) {
      if (pattern.test(url)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

// ─── Allowed domains for navigation ─────────────────────────────
const HOTSTAR_ALLOWED_DOMAINS: string[] = [
  'hotstar.com',
  'www.hotstar.com',
  'jiohotstar.com',
  'www.jiohotstar.com',
  'api.hotstar.com',
  'api.jiohotstar.com',
  'secure.hotstar.com',
  'secure.jiohotstar.com',
  'img1.hotstarext.com',
  'img.hotstar.com',
  'images.hotstar.com',
  'bifrost-api.hotstar.com',
  'accounts.google.com',
  'accounts.hotstar.com',
  'us.hotstar.com',
  'in.hotstar.com',
  'akamaized.net',
  'akamaihd.net',
  'jiocinema.com',
  'media.hotstar.com',
  'hsreqhost.hotstar.com',
  'googleusercontent.com',
  'gstatic.com',
  'googleapis.com',
  'google.com',
  'facebook.com',
];

export function isHotstarAllowedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (
      hostname === 'hotstar.com' || hostname.endsWith('.hotstar.com') ||
      hostname === 'jiohotstar.com' || hostname.endsWith('.jiohotstar.com') ||
      hostname === 'hotstarext.com' || hostname.endsWith('.hotstarext.com') ||
      hostname === 'jiocinema.com' || hostname.endsWith('.jiocinema.com') ||
      hostname === 'jio.com' || hostname.endsWith('.jio.com') ||
      hostname.endsWith('.akamaized.net') || hostname.endsWith('.akamaihd.net') ||
      hostname.endsWith('.cloudfront.net')
    ) {
      return true;
    }

    return HOTSTAR_ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// ─── Hotstar Ad Neutralization Script ────────────────────────────
// Brave-style approach: install a complete dummy google.ima namespace
// BEFORE Hotstar's code loads, so the IMA SDK never initializes.
// No ads are ever requested, loaded, or shown — not even ad markers
// in the video progress bar.
export function getHotstarAdScript(): string {
  return `
    (function() {
      'use strict';
      try {

        // ════════════════════════════════════════════════════
        // PHASE 1: NEUTRALIZE GOOGLE IMA SDK (Brave Shield)
        // ════════════════════════════════════════════════════
        // Install a full dummy google.ima namespace so Hotstar
        // thinks the SDK loaded but it never requests any ads.

        var noopFn = function() {};
        var noopThis = function() { return this; };
        var noopPromise = function() { return Promise.resolve(); };
        var noopArr = function() { return []; };

        // Tiny EventTarget stub
        function StubEventTarget() { this._l = {}; }
        StubEventTarget.prototype.addEventListener = function(e, fn) {
          if (!this._l[e]) this._l[e] = [];
          this._l[e].push(fn);
        };
        StubEventTarget.prototype.removeEventListener = function(e, fn) {
          if (!this._l[e]) return;
          this._l[e] = this._l[e].filter(function(f){ return f !== fn; });
        };
        StubEventTarget.prototype.dispatchEvent = function(evt) {
          var fns = this._l[evt.type] || [];
          for (var i = 0; i < fns.length; i++) { try { fns[i](evt); } catch(x){} }
        };

        // ── AdDisplayContainer ──
        function AdDisplayContainer(container, videoElement) {
          this.container_ = container;
          this.video_ = videoElement;
        }
        AdDisplayContainer.prototype.initialize = noopFn;
        AdDisplayContainer.prototype.destroy = noopFn;

        // ── AdsRenderingSettings ──
        function AdsRenderingSettings() {
          this.restoreCustomPlaybackStateOnAdBreakComplete = true;
          this.enablePreloading = false;
          this.useStyledLinearAds = false;
          this.useStyledNonLinearAds = false;
          this.bitrate = -1;
          this.loadVideoTimeout = -1;
          this.playAdsAfterTime = -1;
          this.uiElements = [];
          this.autoAlign = true;
        }

        // ── AdsManager stub ──
        function StubAdsManager() {
          StubEventTarget.call(this);
          this.volume = 1;
        }
        StubAdsManager.prototype = Object.create(StubEventTarget.prototype);
        StubAdsManager.prototype.constructor = StubAdsManager;
        StubAdsManager.prototype.init = noopFn;
        StubAdsManager.prototype.start = function() {
          // Fire ALL_ADS_COMPLETED immediately so Hotstar's player
          // transitions straight to content playback.
          var self = this;
          setTimeout(function() {
            self.dispatchEvent({ type: 'allAdsCompleted' });
            self.dispatchEvent({ type: 'contentResumeRequested' });
          }, 0);
        };
        StubAdsManager.prototype.stop = noopFn;
        StubAdsManager.prototype.destroy = noopFn;
        StubAdsManager.prototype.skip = noopFn;
        StubAdsManager.prototype.pause = noopFn;
        StubAdsManager.prototype.resume = noopFn;
        StubAdsManager.prototype.resize = noopFn;
        StubAdsManager.prototype.discardAdBreak = noopFn;
        StubAdsManager.prototype.collapse = noopFn;
        StubAdsManager.prototype.expand = noopFn;
        StubAdsManager.prototype.updateAdsRenderingSettings = noopFn;
        StubAdsManager.prototype.focus = noopFn;
        StubAdsManager.prototype.getAdSkippableState = function() { return false; };
        StubAdsManager.prototype.getCuePoints = noopArr;
        StubAdsManager.prototype.getCurrentAd = function() { return null; };
        StubAdsManager.prototype.getRemainingTime = function() { return 0; };
        StubAdsManager.prototype.getVolume = function() { return this.volume; };
        StubAdsManager.prototype.setVolume = function(v) { this.volume = v; };
        StubAdsManager.prototype.isCustomClickTrackingUsed = function() { return false; };
        StubAdsManager.prototype.isCustomPlaybackUsed = function() { return false; };

        // ── AdsLoader stub ──
        function StubAdsLoader(container) {
          StubEventTarget.call(this);
          this.container_ = container;
        }
        StubAdsLoader.prototype = Object.create(StubEventTarget.prototype);
        StubAdsLoader.prototype.constructor = StubAdsLoader;
        StubAdsLoader.prototype.requestAds = function() {
          // Instead of loading ads, immediately fire ADS_MANAGER_LOADED
          // with our stub manager that skips everything.
          var self = this;
          setTimeout(function() {
            var fakeEvt = {
              type: 'adsManagerLoaded',
              getAdsManager: function() { return new StubAdsManager(); }
            };
            self.dispatchEvent(fakeEvt);
          }, 0);
        };
        StubAdsLoader.prototype.contentComplete = noopFn;
        StubAdsLoader.prototype.destroy = noopFn;
        StubAdsLoader.prototype.getSettings = function() {
          return {
            getCompanionBackfill: noopFn,
            setAutoPlayAdBreaks: noopFn,
            setCompanionBackfill: noopFn,
            setDisableCustomPlaybackForIOS10Plus: noopFn,
            setDisableFlashAds: noopFn,
            setFeatureFlags: noopFn,
            setLocale: noopFn,
            setNumRedirects: noopFn,
            setPlayerType: noopFn,
            setPlayerVersion: noopFn,
            setVpaidAllowed: noopFn,
            setVpaidMode: noopFn,
            setSessionId: noopFn,
            setStreamCorrelator: noopFn,
          };
        };

        // ── AdsRequest stub ──
        function AdsRequest() {
          this.adTagUrl = '';
          this.adsResponse = '';
          this.linearAdSlotWidth = 0;
          this.linearAdSlotHeight = 0;
          this.nonLinearAdSlotWidth = 0;
          this.nonLinearAdSlotHeight = 0;
          this.forceNonLinearFullSlot = false;
          this.vastLoadTimeout = 0;
          this.pageUrl = '';
        }
        AdsRequest.prototype.setAdWillAutoPlay = noopFn;
        AdsRequest.prototype.setAdWillPlayMuted = noopFn;
        AdsRequest.prototype.setContinuousPlayback = noopFn;

        // ── Event type enums ──
        var AdEvent = {
          Type: {
            AD_BREAK_READY: 'adBreakReady',
            AD_BUFFERING: 'adBuffering',
            AD_CAN_PLAY: 'adCanPlay',
            AD_METADATA: 'adMetadata',
            AD_PROGRESS: 'adProgress',
            ALL_ADS_COMPLETED: 'allAdsCompleted',
            CLICK: 'click',
            COMPLETE: 'complete',
            CONTENT_PAUSE_REQUESTED: 'contentPauseRequested',
            CONTENT_RESUME_REQUESTED: 'contentResumeRequested',
            DURATION_CHANGE: 'durationChange',
            EXPANDED_CHANGED: 'expandedChanged',
            FIRST_QUARTILE: 'firstQuartile',
            IMPRESSION: 'impression',
            INTERACTION: 'interaction',
            LINEAR_CHANGED: 'linearChanged',
            LOADED: 'loaded',
            LOG: 'log',
            MIDPOINT: 'midpoint',
            PAUSED: 'paused',
            RESUMED: 'resumed',
            SKIPPABLE_STATE_CHANGED: 'skippableStateChanged',
            SKIPPED: 'skipped',
            STARTED: 'started',
            THIRD_QUARTILE: 'thirdQuartile',
            USER_CLOSE: 'userClose',
            VIDEO_CLICKED: 'videoClicked',
            VIDEO_ICON_CLICKED: 'videoIconClicked',
            VOLUME_CHANGED: 'volumeChanged',
            VOLUME_MUTED: 'volumeMuted',
          }
        };

        var AdErrorEvent = {
          Type: { AD_ERROR: 'adError' }
        };

        var AdsManagerLoadedEvent = {
          Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' }
        };

        // ── Install the full dummy namespace ──
        if (!window.google) window.google = {};
        window.google.ima = {
          AdDisplayContainer: AdDisplayContainer,
          AdError: function(msg, code, type) {
            this.message = msg || '';
            this.errorCode = code || 0;
            this.type = type || '';
            this.getErrorCode = function() { return this.errorCode; };
            this.getMessage = function() { return this.message; };
            this.getType = function() { return this.type; };
            this.getVastErrorCode = function() { return -1; };
            this.getInnerError = function() { return null; };
            this.toString = function() { return 'AdError'; };
          },
          AdErrorEvent: AdErrorEvent,
          AdEvent: AdEvent,
          AdsLoader: StubAdsLoader,
          AdsManager: StubAdsManager,
          AdsManagerLoadedEvent: AdsManagerLoadedEvent,
          AdsRenderingSettings: AdsRenderingSettings,
          AdsRequest: AdsRequest,
          CompanionAdSelectionSettings: function() {
            this.creativeSizeType = 'CreativeSizeType';
            this.resourceType = 'ResourceType';
            this.sizeCriteria = 'SizeCriteria';
          },
          ImaSdkSettings: function() {
            this.c = '';
            this.getCompanionBackfill = noopFn;
            this.setAutoPlayAdBreaks = noopFn;
            this.setCompanionBackfill = noopFn;
            this.setDisableCustomPlaybackForIOS10Plus = noopFn;
            this.setDisableFlashAds = noopFn;
            this.setFeatureFlags = noopFn;
            this.setLocale = noopFn;
            this.setNumRedirects = noopFn;
            this.setPlayerType = noopFn;
            this.setPlayerVersion = noopFn;
            this.setVpaidAllowed = noopFn;
            this.setVpaidMode = noopFn;
            this.setSessionId = noopFn;
            this.setStreamCorrelator = noopFn;
          },
          OmidAccessMode: { DOMAIN: 'domain', FULL: 'full', LIMITED: 'limited' },
          OmidVerificationVendor: {},
          UiElements: { AD_ATTRIBUTION: 'adAttribution', COUNTDOWN: 'countdown' },
          UniversalAdIdInfo: function() {
            this.getAdIdRegistry = function() { return ''; };
            this.getAdIdValue = function() { return ''; };
          },
          ViewMode: { FULLSCREEN: 'fullscreen', NORMAL: 'normal' },
          VERSION: '3.0.0',
          settings: {
            getCompanionBackfill: noopFn,
            setAutoPlayAdBreaks: noopFn,
            setCompanionBackfill: noopFn,
            setDisableCustomPlaybackForIOS10Plus: noopFn,
            setDisableFlashAds: noopFn,
            setFeatureFlags: noopFn,
            setLocale: noopFn,
            setNumRedirects: noopFn,
            setPlayerType: noopFn,
            setPlayerVersion: noopFn,
            setVpaidAllowed: noopFn,
            setVpaidMode: noopFn,
            setSessionId: noopFn,
            setStreamCorrelator: noopFn,
          },
          dai: {
            api: {
              StreamManager: function() {
                StubEventTarget.call(this);
              },
              StreamRequest: function() {},
              StreamType: { LIVE: 'live', VOD: 'vod' },
              AdProgressData: noopFn,
            }
          }
        };

        // Lock it so Hotstar can't overwrite it with the real SDK
        try {
          Object.defineProperty(window.google, 'ima', {
            value: window.google.ima,
            writable: false,
            configurable: false
          });
        } catch(e) {}


        // ════════════════════════════════════════════════════
        // PHASE 2: NETWORK-LEVEL AD BLOCKING
        // ════════════════════════════════════════════════════

        var adDomains = [
          'imasdk.googleapis.com', 'doubleclick.net', 'googleadservices.com',
          'googlesyndication.com', 'pubads.g.doubleclick.net',
          'securepubads.g.doubleclick.net', 'adservice.google.com',
          's0.2mdn.net', 'pubmatic.com', 'adsrvr.org', 'adnxs.com',
          'moatads.com', 'scorecardresearch.com', 'comscore.com',
          'googletagmanager.com', 'google-analytics.com',
          '/ads/', '/ad/', '/pagead/', '/vast', '/ptracking', '/beacon?'
        ];

        function isAdURL(url) {
          if (!url || typeof url !== 'string') return false;
          var u = url.toLowerCase();
          for (var i = 0; i < adDomains.length; i++) {
            if (u.indexOf(adDomains[i]) > -1) return true;
          }
          return false;
        }

        // Block fetch
        var origFetch = window.fetch;
        window.fetch = function() {
          var url = arguments[0];
          var u = typeof url === 'string' ? url : (url && url.url ? url.url : '');
          if (isAdURL(u)) return new Promise(function(){});
          return origFetch.apply(this, arguments);
        };

        // Block XHR
        var origXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
          if (isAdURL(url)) {
            this.__blocked = true;
            return;
          }
          return origXHROpen.apply(this, arguments);
        };
        var origXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function() {
          if (this.__blocked) return;
          return origXHRSend.apply(this, arguments);
        };

        // Block dynamic script injection of ad SDKs
        var origCreateElement = document.createElement.bind(document);
        document.createElement = function(tag) {
          var el = origCreateElement(tag);
          if (tag.toLowerCase() === 'script') {
            var origSrcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src') ||
                              Object.getOwnPropertyDescriptor(el.__proto__, 'src');
            if (origSrcDesc && origSrcDesc.set) {
              Object.defineProperty(el, 'src', {
                get: function() { return origSrcDesc.get.call(this); },
                set: function(v) {
                  if (isAdURL(v)) return;
                  origSrcDesc.set.call(this, v);
                },
                configurable: true
              });
            }
          }
          return el;
        };


        // ════════════════════════════════════════════════════
        // PHASE 3: VIEWPORT & DESKTOP SPOOFING
        // ════════════════════════════════════════════════════

        try {
          var meta = document.querySelector('meta[name="viewport"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'viewport';
            (document.head || document.documentElement).appendChild(meta);
          }
          meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

          var appleMeta = document.querySelector('meta[name="apple-itunes-app"]');
          if (appleMeta) appleMeta.remove();
          var googleMeta = document.querySelector('meta[name="google-play-app"]');
          if (googleMeta) googleMeta.remove();

          Object.defineProperty(navigator, 'userAgent', {
            get: function() { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15'; },
            configurable: true
          });
          Object.defineProperty(navigator, 'platform', {
            get: function() { return 'MacIntel'; },
            configurable: true
          });
        } catch(e) {}


        // ════════════════════════════════════════════════════
        // PHASE 4: CSS AD HIDING & BANNER CLEANUP
        // ════════════════════════════════════════════════════

        var HS_AD_STYLE_ID = '__zentube_hotstar_adfilter';

        function injectHotstarCSS() {
          if (document.getElementById(HS_AD_STYLE_ID)) return;
          var s = document.createElement('style');
          s.id = HS_AD_STYLE_ID;
          s.textContent = [
            // IMA containers
            '#ima-ad-container, .ima-ad-container, [id*="ima-ad"], [class*="ima-ad"] { display:none!important; height:0!important; width:0!important; overflow:hidden!important; pointer-events:none!important; }',
            '.videoAdUi, .videoAdUiTopBar, .videoAdUiAttribution, [class*="videoAd"] { display:none!important; }',
            '#google_companion_ad_div { display:none!important; }',

            // Generic ad selectors
            '[class*="ad-container"], [class*="ad-banner"], [class*="ad-overlay"], [class*="adBanner"], [class*="adContainer"], [class*="AdContainer"] { display:none!important; }',
            '[class*="advertisement"], [class*="google-ad"], [id*="google_ads"], [id*="ad-slot"], [data-ad], [data-ad-unit], [data-google-ad] { display:none!important; }',
            '[class*="ad-unit"], [class*="adUnit"], [class*="AdUnit"], [class*="ad-display"], [class*="adDisplay"] { display:none!important; }',
            '[class*="ad-wrapper"], [class*="adWrapper"], [class*="ad-card"], [class*="adCard"], [class*="AdCard"] { display:none!important; }',
            '[class*="sponsored"], [class*="Sponsored"], [class*="masthead-ad"], [class*="mastheadAd"], [class*="MastheadAd"] { display:none!important; }',
            '[class*="display-ad"], [class*="displayAd"], [class*="native-ad"], [class*="nativeAd"], [class*="NativeAd"] { display:none!important; }',
            '[class*="ad-rail"], [class*="adRail"], [class*="banner-ad"], [class*="BannerAd"], [class*="bannerAd"] { display:none!important; }',
            '[class*="leaderboard"], [class*="Leaderboard"] { display:none!important; }',
            '[class*="ad-showing"], [class*="adShowing"], [class*="ad-playing"], [class*="adPlaying"] { display:none!important; }',
            '[class*="ad-break"], [class*="adBreak"], [class*="AdBreak"] { display:none!important; }',
            '[class*="preroll"], [class*="Preroll"], [class*="midroll"], [class*="Midroll"], [class*="postroll"], [class*="Postroll"] { display:none!important; }',
            '[class*="ad-countdown"], [class*="adCountdown"], [class*="ad-timer"], [class*="ad-badge"] { display:none!important; }',

            // Download app / smart banners
            '[class*="app-download"], [class*="download-app"], [class*="downloadApp"], [class*="DownloadApp"] { display:none!important; }',
            '[class*="smart-banner"], [class*="smartBanner"], [class*="SmartBanner"] { display:none!important; }',
            '[class*="app-banner"], [class*="appBanner"], [class*="AppBanner"] { display:none!important; }',
            '[class*="open-in-app"], [class*="openInApp"], [class*="OpenInApp"] { display:none!important; }',
            '[class*="get-app"], [class*="getApp"], [class*="install-app"], [class*="installApp"] { display:none!important; }',
            '[class*="continue-in-app"], [class*="ContinueInApp"] { display:none!important; }',
            '[class*="downloadPrompt"], [class*="DownloadPrompt"], [id*="download-prompt"], [id*="downloadPrompt"] { display:none!important; }',
            '[class*="switch-to-app"], [class*="watch-on-app"], [class*="mobile-app"], [class*="MobileApp"] { display:none!important; }',
            'a[href*="apps.apple.com"], a[href*="itunes.apple.com"], a[href*="play.google.com"] { display:none!important; }',
            '.tippy-popper { display:none!important; }',

            // Promo / upsell overlays
            '[class*="promo-overlay"], [class*="PromoOverlay"], [class*="upsell"], [class*="Upsell"] { display:none!important; }',
            '[class*="upgrade-prompt"], [class*="upgradePrompt"], [class*="subscribe-prompt"] { display:none!important; }',

            // Ad iframes
            'iframe[src*="doubleclick"], iframe[src*="googlesyndication"], iframe[src*="googleads"], iframe[src*="ad."], iframe[id*="google_ads"] { display:none!important; }',
          ].join('\\\\n');
          (document.head || document.documentElement).appendChild(s);
        }

        function removeAppBanners() {
          try {
            var bannerTexts = [
              'download app', 'get the app', 'open in app', 'install app',
              'continue in app', 'use app', 'download the app', 'get app',
              'download the jiohotstar mobile app', 'download the hotstar app',
              'open in the app', 'switch to app', 'watch on app',
            ];
            var allElements = document.querySelectorAll('a, button, div, span, p, section, aside');
            for (var i = 0; i < allElements.length; i++) {
              var el = allElements[i];
              var text = (el.textContent || '').trim().toLowerCase();
              for (var t = 0; t < bannerTexts.length; t++) {
                if (text === bannerTexts[t] || (text.indexOf(bannerTexts[t]) > -1 && text.length < 100)) {
                  if (el.offsetHeight > 0) {
                    var banner = el.closest('[class*="banner"], [class*="Banner"], [class*="download"], [class*="Download"], [class*="app-prompt"], [class*="overlay"], [class*="Overlay"], section, aside');
                    if (banner) banner.style.setProperty('display', 'none', 'important');
                    else el.style.setProperty('display', 'none', 'important');
                  }
                  break;
                }
              }
            }
            var metas = document.querySelectorAll('meta[name="apple-itunes-app"], meta[name="google-play-app"]');
            for (var m = 0; m < metas.length; m++) metas[m].remove();
          } catch(e) {}
        }

        // Remove any IMA ad containers from DOM
        function nukeAdContainers() {
          try {
            var containers = document.querySelectorAll('#ima-ad-container, .ima-ad-container, .videoAdUi, [id*="ima-ad"], [class*="ima-ad"]');
            for (var c = 0; c < containers.length; c++) {
              containers[c].remove();
            }
          } catch(e) {}
        }


        // ════════════════════════════════════════════════════
        // PHASE 5: FULLSCREEN SUPPORT
        // ════════════════════════════════════════════════════

        var isFullscreen = false;
        function sendFullscreen(fs) {
          if (fs === isFullscreen) return;
          isFullscreen = fs;
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'fullscreen',
              isFullscreen: fs
            }));
          }
        }

        function attachVideoListeners() {
          var videos = document.querySelectorAll('video');
          for (var i = 0; i < videos.length; i++) {
            if (!videos[i].__hs_fs_attached) {
              videos[i].__hs_fs_attached = true;
              videos[i].addEventListener('webkitbeginfullscreen', function() { sendFullscreen(true); });
              videos[i].addEventListener('webkitendfullscreen', function() { sendFullscreen(false); });
              videos[i].addEventListener('playing', function() {
                if (this.videoWidth > this.videoHeight && this.videoWidth > 400) {
                  var rect = this.getBoundingClientRect();
                  if (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.7) {
                    sendFullscreen(true);
                  }
                }
              });
            }
          }
        }

        document.addEventListener('fullscreenchange', function() { sendFullscreen(!!document.fullscreenElement); });
        document.addEventListener('webkitfullscreenchange', function() { sendFullscreen(!!document.webkitFullscreenElement); });


        // ════════════════════════════════════════════════════
        // PHASE 6: EXECUTE & MONITOR
        // ════════════════════════════════════════════════════

        injectHotstarCSS();
        removeAppBanners();
        nukeAdContainers();
        attachVideoListeners();

        setInterval(function() {
          nukeAdContainers();
          attachVideoListeners();
        }, 500);
        setInterval(function() {
          removeAppBanners();
        }, 2000);

        if (typeof MutationObserver !== 'undefined') {
          var debounceTimer = null;
          var observer = new MutationObserver(function() {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
              injectHotstarCSS();
              removeAppBanners();
              nukeAdContainers();
            }, 200);
          });
          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
          });
        }

      } catch(e) {
        // Graceful degradation — Hotstar still works, just with ads
      }
    })();
    true;
  `;
}
