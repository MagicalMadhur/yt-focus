/**
 * Content filtering system for JioHotstar WebView.
 * Implements Brave Shield-style ad blocking, json-pruning of ad cue points,
 * Google IMA SDK neutralization, and inline video enforcement.
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
  // Tracking & Analytics
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'app-measurement.com',
  'conviva.com',
  'convivaid.com',
  'sb.scorecardresearch.com',
  // ── Hotstar's OWN ad infrastructure ──
  'go.hotstar.com',
  'ads.hotstar.com',
  'ad-pods.hotstar.com',
  'ads.jiohotstar.com',
  'adtech.hotstar.com',
  'adtech.jiohotstar.com',
  'monetization.hotstar.com',
  'dai.hotstar.com',
  'dai.jiohotstar.com',
  'ssai.hotstar.com',
  'tracking.hotstar.com',
  'us-east-1-dai.hotstar.com',
  // ── 3rd-party ad networks ──
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
  'freewheel.com',
  'fwmrm.net',
  'innovid.com',
  'eyereturn.com',
  'flashtalking.com',
  'smaato.com',
  'smartadserver.com',
  'yieldmo.com',
  'sharethrough.com',
  'indexexchange.com',
  'bidswitch.net',
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
  /\/vast/i,
  /\/vpaid/i,
  /\/ptracking/i,
  /\btracking\.js/i,
  /\/beacon\?/i,
  /\/collect\?/i,
  /apps\.apple\.com/i,
  /itunes\.apple\.com/i,
  /play\.google\.com/i,
  /\/download\b/i,
  /hotstar:\/\/./i,
  // ── Hotstar-specific ad patterns ──
  /\/ad-pods\//i,
  /\/adpods\//i,
  /getAdPods/i,
  /\/adconfig/i,
  /\/ad-config/i,
  /\/adManager/i,
  /\/adBreak/i,
  /\/ad_break/i,
  /\/adInit/i,
  /\/ssai\//i,
  /\/dai\//i,
  /\/monetize/i,
  /\/adInsert/i,
  /\/adRequest/i,
  /\/adResponse/i,
  /\/adEvent/i,
  /\/adTracking/i,
  /\/adImpression/i,
  /\/adCallback/i,
  /\/adProxy/i,
  /\/getAds/i,
  /\/fetchAds/i,
  /\/adManifest/i,
  /\/conviva/i,
  /ad[_-]?pod/i,
  /ad[_-]?slot/i,
  /ad[_-]?break/i,
  /ad[_-]?tag/i,
];

/**
 * Check if a URL should be blocked for Hotstar.
 * Ensures blocked ad domains and patterns are checked FIRST before any whitelist.
 */
export function shouldBlockHotstarRequest(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    // 1. Silently block app store and download landing pages
    if (
      pathname.includes('/download') ||
      hostname.includes('apple.com') ||
      hostname.includes('google.com/store')
    ) {
      return true;
    }

    // 2. Explicitly blocked ad domains (checked first — prevents ads.hotstar.com bypass)
    for (const domain of HOTSTAR_BLOCKED_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }

    // 3. Blocked URL patterns
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

    // Blocked ad domains must NEVER be allowed
    for (const domain of HOTSTAR_BLOCKED_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return false;
      }
    }

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
// Brave-style approach:
// 1. JSON Pruning (uBlock Origin json-prune scriptlet): strips intervention_data,
//    ad_breaks, and ad pods from all API responses before the player sees them.
// 2. Complete dummy google.ima & FreeWheel SDKs.
// 3. In-page fetch / XHR / beacon interception returning clean empty responses.
// 4. Inline video enforcement & webkitEnterFullscreen neutering (prevents native iOS fullscreen ads).
// 5. Active 50ms video ad killer & auto-skip (seeks forward +15s, fast-forwards 16x, clicks skip).
// 6. CSS ad hiding & app download banner removal.
export function getHotstarAdScript(): string {
  return `
    (function() {
      'use strict';
      try {

        // ════════════════════════════════════════════════════
        // PHASE 1: JSON-PRUNE ENGINE (Brave & uBlock Origin)
        // ════════════════════════════════════════════════════
        // uBlock rule: hotstar.com##+js(json-prune, success.page.spaces.player.widget_wrappers.[].widget.data.intervention_data)
        // Recursively strip all intervention_data, ad_breaks, ad_pods, and cue points
        // from any JSON parsed or fetched, so Hotstar never schedules any ads.

        var AD_KEY_NAMES = [
          'intervention_data', 'interventions', 'ad_breaks', 'adbreaks',
          'ad_pods', 'adpods', 'ad_tags', 'adtags', 'ad_config', 'adconfig',
          'ad_info', 'adinfo', 'ad_data', 'addata', 'ad_slot', 'adslot',
          'ad_manager', 'admanager', 'ad_cue_points', 'adcuepoints',
          'monetization', 'dai_stream', 'ssai_stream', 'ad_tracking',
          'adtracking', 'ad_events', 'adevents', 'ad_manifest', 'admanifest'
        ];

        function pruneAdData(obj, depth) {
          if (!obj || typeof obj !== 'object' || (depth || 0) > 15) return;
          if (Array.isArray(obj)) {
            for (var i = obj.length - 1; i >= 0; i--) {
              var item = obj[i];
              if (item && typeof item === 'object') {
                var wType = (item.widget_type || item.type || item.name || '').toString().toUpperCase();
                if (wType === 'AD' || wType === 'INTERVENTION' || wType === 'AD_BREAK' || wType === 'AD_POD') {
                  obj.splice(i, 1);
                  continue;
                }
              }
              pruneAdData(item, (depth || 0) + 1);
            }
            return;
          }

          for (var key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            var lkey = key.toLowerCase();
            var shouldDelete = false;

            for (var k = 0; k < AD_KEY_NAMES.length; k++) {
              if (lkey === AD_KEY_NAMES[k] || lkey.indexOf(AD_KEY_NAMES[k]) === 0) {
                shouldDelete = true;
                break;
              }
            }

            if (!shouldDelete && (
              /^intervention/i.test(key) ||
              /^ad_?(break|pod|tag|config|slot|cue|manager|info|event|track|manifest)/i.test(key)
            )) {
              shouldDelete = true;
            }

            if (shouldDelete) {
              try {
                delete obj[key];
              } catch(e) {
                obj[key] = null;
              }
            } else if (obj[key] && typeof obj[key] === 'object') {
              pruneAdData(obj[key], (depth || 0) + 1);
            }
          }
        }

        // Hook JSON.parse
        var origJSONParse = JSON.parse;
        JSON.parse = function(text, reviver) {
          var result = origJSONParse.apply(this, arguments);
          if (result && typeof result === 'object') {
            pruneAdData(result, 0);
          }
          return result;
        };

        // Hook Response.prototype.json
        if (window.Response && window.Response.prototype && window.Response.prototype.json) {
          var origResponseJson = window.Response.prototype.json;
          window.Response.prototype.json = function() {
            return origResponseJson.apply(this, arguments).then(function(data) {
              if (data && typeof data === 'object') {
                pruneAdData(data, 0);
              }
              return data;
            });
          };
        }

        // Hook XMLHttpRequest response getter
        try {
          var origXHRResponseDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');
          if (origXHRResponseDesc && origXHRResponseDesc.get) {
            Object.defineProperty(XMLHttpRequest.prototype, 'response', {
              get: function() {
                var val = origXHRResponseDesc.get.call(this);
                if (this.responseType === 'json' && val && typeof val === 'object' && !this.__pruned) {
                  this.__pruned = true;
                  pruneAdData(val, 0);
                }
                return val;
              },
              configurable: true
            });
          }
        } catch(e) {}


        // ════════════════════════════════════════════════════
        // PHASE 2: NEUTRALIZE GOOGLE IMA SDK & FREEWHEEL
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

        var AdErrorEvent = { Type: { AD_ERROR: 'adError' } };
        var AdsManagerLoadedEvent = { Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' } };

        // Install dummy google.ima namespace
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

        try {
          Object.defineProperty(window.google, 'ima', {
            value: window.google.ima,
            writable: false,
            configurable: false
          });
        } catch(e) {}

        // Dummy FreeWheel SDK
        if (!window.tv) window.tv = {};
        if (!window.tv.freewheel) window.tv.freewheel = {};
        window.tv.freewheel.am = {
          AdManager: function() {
            return {
              newContext: function() {
                return {
                  registerVideoDisplayBase: noopFn,
                  setProfile: noopFn,
                  setSiteSection: noopFn,
                  setVideoAsset: noopFn,
                  submitRequest: function() {},
                  addEventListener: noopFn,
                  removeEventListener: noopFn,
                  setParameter: noopFn,
                };
              }
            };
          }
        };


        // ════════════════════════════════════════════════════
        // PHASE 3: IN-PAGE NETWORK AD BLOCKING
        // ════════════════════════════════════════════════════

        var adDomains = [
          'imasdk.googleapis.com', 'doubleclick.net', 'googleadservices.com',
          'googlesyndication.com', 'pubads.g.doubleclick.net',
          'securepubads.g.doubleclick.net', 'adservice.google.com',
          's0.2mdn.net', 'pubmatic.com', 'adsrvr.org', 'adnxs.com',
          'moatads.com', 'scorecardresearch.com', 'comscore.com',
          'googletagmanager.com', 'google-analytics.com', 'analytics.google.com',
          // Hotstar ad infra
          'go.hotstar.com', 'ads.hotstar.com', 'ad-pods.hotstar.com',
          'ads.jiohotstar.com', 'adtech.hotstar.com', 'adtech.jiohotstar.com',
          'monetization.hotstar.com', 'dai.hotstar.com', 'dai.jiohotstar.com',
          'ssai.hotstar.com', 'tracking.hotstar.com', 'us-east-1-dai.hotstar.com',
          // 3rd party ad networks & tracking
          'conviva.com', 'convivaid.com', 'freewheel.com', 'fwmrm.net',
          'innovid.com', 'eyereturn.com', 'flashtalking.com', 'smaato.com',
          'smartadserver.com', 'yieldmo.com', 'sharethrough.com',
          'indexexchange.com', 'bidswitch.net', 'rubiconproject.com',
          'openx.net', 'criteo.com', 'taboola.com', 'outbrain.com',
          'amazon-adsystem.com',
          // Patterns
          '/ads/', '/ad/', '/pagead/', '/vast', '/vpaid', '/ptracking',
          '/beacon?', '/ad-pods/', '/adpods/', 'getadpods', '/adconfig',
          '/adbreak', '/ad_break', '/dai/', '/ssai/', '/monetize', '/conviva'
        ];

        function isAdURL(url) {
          if (!url || typeof url !== 'string') return false;
          var u = url.toLowerCase();
          for (var i = 0; i < adDomains.length; i++) {
            if (u.indexOf(adDomains[i]) > -1) return true;
          }
          return false;
        }

        // Intercept fetch — return empty successful response instead of hanging
        var origFetch = window.fetch;
        window.fetch = function() {
          var url = arguments[0];
          var u = typeof url === 'string' ? url : (url && url.url ? url.url : '');
          if (isAdURL(u)) {
            var emptyJson = JSON.stringify({ ads: [], ad_pods: [], ad_breaks: [], status: 'ok' });
            return Promise.resolve(new Response(emptyJson, {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
          return origFetch.apply(this, arguments);
        };

        // Intercept XHR
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
          if (this.__blocked) {
            var self = this;
            setTimeout(function() {
              try {
                Object.defineProperty(self, 'readyState', { value: 4, writable: true });
                Object.defineProperty(self, 'status', { value: 200, writable: true });
                Object.defineProperty(self, 'responseText', { value: '{"ads":[],"ad_pods":[]}', writable: true });
                Object.defineProperty(self, 'response', { value: { ads: [], ad_pods: [] }, writable: true });
                if (self.onreadystatechange) self.onreadystatechange();
                if (self.onload) self.onload(new ProgressEvent('load'));
              } catch(e) {}
            }, 0);
            return;
          }
          return origXHRSend.apply(this, arguments);
        };

        // Intercept navigator.sendBeacon
        if (navigator.sendBeacon) {
          var origBeacon = navigator.sendBeacon.bind(navigator);
          navigator.sendBeacon = function(url, data) {
            if (isAdURL(url)) return true;
            return origBeacon(url, data);
          };
        }

        // Block dynamic script injection of ad SDKs
        var origCreateElement = document.createElement.bind(document);
        document.createElement = function(tag) {
          var el = origCreateElement(tag);
          if (tag && tag.toLowerCase() === 'script') {
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
        // PHASE 4: PREVENT NATIVE IOS FULLSCREEN ADS
        // ════════════════════════════════════════════════════
        // When ads open in iPhone's landscape fullscreen player,
        // it's because the ad video lacks playsinline or calls webkitEnterFullscreen.
        // We enforce inline playback and neuter fullscreen overrides.

        function enforceInlineVideo(v) {
          if (!v) return;
          v.setAttribute('playsinline', 'true');
          v.setAttribute('webkit-playsinline', 'true');
          v.playsInline = true;
          v.webkitPlaysInline = true;
        }

        // Neuter webkitEnterFullscreen to prevent ad players from forcing iOS AVPlayer
        try {
          HTMLVideoElement.prototype.webkitEnterFullscreen = function() {
            // No-op: video stays inline in our landscape-locked player
          };
          HTMLVideoElement.prototype.webkitRequestFullscreen = function() {
            // No-op
          };
        } catch(e) {}


        // ════════════════════════════════════════════════════
        // PHASE 5: ACTIVE 50ms VIDEO AD KILLER & AUTO-SKIP
        // ════════════════════════════════════════════════════
        // Instantly detects any residual ad video or SSAI ad segment,
        // mutes it, seeks forward (+15s or to duration), fast-forwards 16x,
        // and clicks any skip button.

        var isAdMuted = false;

        function clickSkipButtons() {
          var skipSelectors = [
            '.videoAdUiSkipButton',
            'button[class*="skip" i]',
            '[class*="skip-ad" i]',
            '[class*="skipAd" i]',
            '[class*="SkipAd" i]',
            '[class*="ad-skip" i]',
            '[class*="adSkip" i]',
            '[aria-label*="skip" i]',
            '.ytp-ad-skip-button',
            '.ytp-ad-skip-button-modern'
          ];
          for (var s = 0; s < skipSelectors.length; s++) {
            var btns = document.querySelectorAll(skipSelectors[s]);
            for (var b = 0; b < btns.length; b++) {
              try { btns[b].click(); } catch(x){}
            }
          }
        }

        function isAdActive() {
          var adIndicators = [
            '.videoAdUi',
            '[class*="ad-showing"]', '[class*="adShowing"]',
            '[class*="ad-playing"]', '[class*="adPlaying"]',
            '[class*="ad-countdown"]', '[class*="adCountdown"]',
            '[class*="ad-timer"]', '[class*="adTimer"]',
            '[class*="ad-badge"]', '[class*="adBadge"]',
            '#ima-ad-container', '.ima-ad-container',
            '[id*="ima-ad"]', '[class*="ima-ad"]'
          ];
          for (var i = 0; i < adIndicators.length; i++) {
            var el = document.querySelector(adIndicators[i]);
            if (el && el.offsetParent !== null) return true;
          }

          // Check for visible text matching "Ad :" or "Ad 1 of" or "Ad will end"
          var badges = document.querySelectorAll('span, p, div');
          for (var j = 0; j < badges.length; j++) {
            var t = (badges[j].textContent || '').trim();
            if (t.length < 30 && (/^ad\\s*:\\s*\\d/i.test(t) || /^ad\\s+\\d+\\s+of\\s+\\d+/i.test(t) || /ad will end in/i.test(t))) {
              if (badges[j].offsetParent !== null) return true;
            }
          }
          return false;
        }

        function killAds() {
          try {
            var adDetected = isAdActive();
            var videos = document.querySelectorAll('video');

            for (var v = 0; v < videos.length; v++) {
              var video = videos[v];
              enforceInlineVideo(video);

              // Ad detected either via DOM indicator or short-duration ad video
              var isThisVideoAd = adDetected || (isFinite(video.duration) && video.duration > 0 && video.duration <= 90 && video.closest('[class*="ad"], [id*="ad"]'));

              if (isThisVideoAd) {
                // 1. Mute immediately
                if (!video.muted) {
                  video.muted = true;
                  isAdMuted = true;
                }

                // 2. Seek to end if short video ad (< 120s)
                if (isFinite(video.duration) && video.duration > 0 && video.duration < 120) {
                  if (video.currentTime < video.duration - 0.2) {
                    video.currentTime = video.duration;
                  }
                } else {
                  // SSAI stream: jump forward 15s (matches user's manual skip)
                  video.currentTime += 15;
                }

                // 3. Fast-forward
                video.playbackRate = 16.0;

                // 4. Click skip
                clickSkipButtons();
              } else if (isAdMuted && !adDetected) {
                // Content resumed: restore normal playback
                video.playbackRate = 1.0;
                video.muted = false;
                isAdMuted = false;
              }
            }
          } catch(e) {}
        }


        // ════════════════════════════════════════════════════
        // PHASE 6: CSS AD HIDING & BANNER CLEANUP
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
          ].join('\\n');
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

        function nukeAdContainers() {
          try {
            var containers = document.querySelectorAll('#ima-ad-container, .ima-ad-container, .videoAdUi, [id*="ima-ad"], [class*="ima-ad"]');
            for (var c = 0; c < containers.length; c++) {
              containers[c].remove();
            }
          } catch(e) {}
        }


        // ════════════════════════════════════════════════════
        // PHASE 7: DESKTOP SPOOFING & VIEWPORT
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
        // PHASE 8: EXECUTE & HIGH-FREQUENCY MONITOR
        // ════════════════════════════════════════════════════

        injectHotstarCSS();
        removeAppBanners();
        nukeAdContainers();
        killAds();

        // High frequency video ad killer (every 50ms)
        setInterval(function() {
          killAds();
        }, 50);

        setInterval(function() {
          nukeAdContainers();
        }, 500);

        setInterval(function() {
          removeAppBanners();
        }, 2000);

        if (typeof MutationObserver !== 'undefined') {
          var debounceTimer = null;
          var observer = new MutationObserver(function() {
            killAds();
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
              injectHotstarCSS();
              removeAppBanners();
              nukeAdContainers();
            }, 100);
          });
          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
          });
        }

      } catch(e) {
        // Graceful degradation — Hotstar still works
      }
    })();
    true;
  `;
}
