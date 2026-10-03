/**
 * Content filtering and Anti-Adblock Defusal system for Sony LIV WebView.
 *
 * Implements:
 * 1. Anti-Adblock Bypass: Allows IMA SDK loader to pass integrity check without triggering "Disable adblocker" wall.
 * 2. Bait Element Protection: Spoofs ad bait elements (.pub_300x250, .text-ad, etc.) with non-zero dimensions.
 * 3. JSON Pruning: Strips ad_breaks, ad_pods, ad_cue_points, and interventions from API responses.
 * 4. Google IMA & SPNAdManager Defusal: Wraps AdsManager to trigger instant completion without error.
 * 5. 50ms Active Video Ad Killer & Instant Skip: Detects video ads, mutes them, speeds them up 16x,
 *    seeks to end, and auto-clicks skip buttons.
 * 6. App download banner & nag removal.
 */

// ─── Blocked Sony LIV Ad & Tracking Domains ───────────────────────
// We block 3rd-party ad trackers and programmatic networks, but EXCLUDE imasdk.googleapis.com
// from network-level blocking so Sony LIV's anti-adblock check does not fail with script.onerror!
const SONYLIV_BLOCKED_DOMAINS: string[] = [
  // ── 3rd-party programmatic ad networks & trackers ──
  'pubmatic.com',
  'ads.pubmatic.com',
  'gads.pubmatic.com',
  'adsrvr.org',
  'adnxs.com',
  'moatads.com',
  'serving-sys.com',
  'scorecardresearch.com',
  'sb.scorecardresearch.com',
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
  'conviva.com',
  'convivaid.com',
  'app-measurement.com',
  // Specific Doubleclick tracking pixels (NOT the gampad endpoint required for player init)
  'ad.doubleclick.net',
  'static.doubleclick.net',
  's0.2mdn.net',
];

const SONYLIV_BLOCKED_PATTERNS: RegExp[] = [
  /\/ptracking/i,
  /\btracking\.js/i,
  /\/beacon\?/i,
  /\/collect\?/i,
  /apps\.apple\.com/i,
  /itunes\.apple\.com/i,
  /play\.google\.com/i,
  /\/download\b/i,
  /sonyliv:\/\/./i,
  /api-godavari\.sonyliv\.com\/beacon/i,
];

/**
 * Check if a URL should be blocked for Sony LIV.
 */
export function shouldBlockSonyLivRequest(url: string): boolean {
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

    // 2. CRITICAL EXCEPTION FOR ANTI-ADBLOCK:
    // Sony LIV strictly tests if imasdk.googleapis.com and spnadmanager load.
    // If blocked at the network level, script.onerror triggers: "Disable adblocker 1st".
    // We ALLOW them at the network layer and defuse them in JavaScript!
    if (
      hostname.includes('imasdk.googleapis.com') ||
      url.includes('spnadmanager.js') ||
      url.includes('ima3_dai.js') ||
      url.includes('ima3.js') ||
      url.includes('/gampad/')
    ) {
      return false;
    }

    // 3. Block external programmatic ad networks & trackers
    for (const domain of SONYLIV_BLOCKED_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }

    // 4. Blocked URL patterns
    for (const pattern of SONYLIV_BLOCKED_PATTERNS) {
      if (pattern.test(url)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

// ─── Allowed domains for Sony LIV navigation ───────────────────────
const SONYLIV_ALLOWED_DOMAINS: string[] = [
  'sonyliv.com',
  'www.sonyliv.com',
  'api.sonyliv.com',
  'api-godavari.sonyliv.com',
  'player.sonyliv.com',
  'playback.sonyliv.com',
  'vod.sonyliv.com',
  'images.sonyliv.com',
  'spnsports.sonyliv.com',
  'statictokencdn.sonyliv.com',
  'ag-api.sonyliv.com',
  'auth.sonyliv.com',
  'accounts.google.com',
  'accounts.sonyliv.com',
  'akamaized.net',
  'akamaihd.net',
  'cloudfront.net',
  'd2r1yp2w7bby2u.cloudfront.net',
  'googleusercontent.com',
  'gstatic.com',
  'googleapis.com',
  'google.com',
  'facebook.com',
];

export function isSonyLivAllowedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Critical scripts needed for player init
    if (
      hostname.includes('imasdk.googleapis.com') ||
      hostname.includes('doubleclick.net')
    ) {
      return true;
    }

    // Explicitly blocked ad domains must not be allowed
    for (const domain of SONYLIV_BLOCKED_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return false;
      }
    }

    if (
      hostname === 'sonyliv.com' || hostname.endsWith('.sonyliv.com') ||
      hostname.endsWith('.akamaized.net') || hostname.endsWith('.akamaihd.net') ||
      hostname.endsWith('.cloudfront.net')
    ) {
      return true;
    }

    return SONYLIV_ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// ─── Sony LIV Anti-Adblock Bypass & Ad Neutralization Script ───────
export function getSonyLivAdScript(pipEnabled: boolean = true): string {
  return `
    (function() {
      'use strict';
      try {
        window.__zenTubePipEnabled = ${pipEnabled};

        // ════════════════════════════════════════════════════
        // PHASE 1: ANTI-ADBLOCK BAIT PROTECTION & FAKE CHECK PASS
        // ════════════════════════════════════════════════════
        // Sony LIV checks if bait elements (.pub_300x250, .text-ad, etc.)
        // have 0 height. If an adblocker collapses them, Sony LIV blocks playback!
        // We force bait elements to report positive dimensions and stay in the DOM.

        try {
          var baitStyle = document.createElement('style');
          baitStyle.id = '__zen_sonyliv_bait_fix';
          baitStyle.textContent = [
            '.pub_300x250, .pub_300x250m, .pub_728x90, .text-ad, .textAd, .text_ad, .text_ads, .text-ads, .text-ad-links {',
            '  display: block !important;',
            '  visibility: visible !important;',
            '  height: 250px !important;',
            '  min-height: 1px !important;',
            '  position: absolute !important;',
            '  top: -9999px !important;',
            '  left: -9999px !important;',
            '}',
            '/* Hide any adblocker warning modals or dialogs if Sony LIV mounts them */',
            '[class*="adblock" i], [id*="adblock" i], [class*="ad-blocker" i], .ad-blocker-container, .adblock-overlay {',
            '  display: none !important;',
            '  pointer-events: none !important;',
            '}',
            '/* Hide app download prompts */',
            '.app-download-banner, .app-banner, [class*="app-banner" i], [class*="download-app" i], [class*="open-in-app" i], [aria-label*="open in app" i] {',
            '  display: none !important;',
            '}'
          ].join('\\n');
          (document.head || document.documentElement).appendChild(baitStyle);
        } catch(e) {}

        // Hook offsetHeight and clientHeight to guarantee bait tests report > 0
        try {
          var origOffsetHeightDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
          if (origOffsetHeightDesc && origOffsetHeightDesc.get) {
            Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
              get: function() {
                var h = origOffsetHeightDesc.get.call(this);
                if (h === 0 && this.className && typeof this.className === 'string') {
                  if (/pub_|text-ad|adsbox|ad-banner/i.test(this.className)) {
                    return 250;
                  }
                }
                return h;
              },
              configurable: true
            });
          }
        } catch(e) {}

        // ════════════════════════════════════════════════════
        // PHASE 2: JSON-PRUNE AD BREAKS & CUE POINTS
        // ════════════════════════════════════════════════════
        // Recursively strip ad_breaks, ad_pods, ad_cue_points, and interventions
        // from any JSON response so Sony LIV's player receives a clean stream schedule.

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

        // Hook XMLHttpRequest response
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
        // PHASE 3: GOOGLE IMA SDK & AD MANAGER DEFUSAL HOOK
        // ════════════════════════════════════════════════════
        // When google.ima loads, hook AdsManager to signal instant ad completion.
        // This delivers a SUCCESS response to the player (no AdError = no "Disable adblocker" screen!)

        function hookGoogleIMA() {
          if (!window.google || !window.google.ima) return;

          // Wrap AdsManager.prototype.start to complete instantly
          if (window.google.ima.AdsManager && window.google.ima.AdsManager.prototype) {
            var proto = window.google.ima.AdsManager.prototype;
            if (!proto.__zenHooked) {
              proto.__zenHooked = true;
              var origStart = proto.start;
              proto.start = function() {
                var self = this;
                setTimeout(function() {
                  try {
                    self.dispatchEvent({ type: 'allAdsCompleted' });
                    self.dispatchEvent({ type: 'contentResumeRequested' });
                  } catch(e) {}
                }, 0);
                if (origStart) {
                  try { origStart.apply(this, arguments); } catch(e) {}
                }
              };
            }
          }
        }

        // Monitor window.google definition
        var _google = window.google;
        try {
          Object.defineProperty(window, 'google', {
            get: function() { return _google; },
            set: function(val) {
              _google = val;
              hookGoogleIMA();
            },
            configurable: true
          });
        } catch(e) {}

        setInterval(hookGoogleIMA, 250);


        // ════════════════════════════════════════════════════
        // PHASE 4: 50MS ACTIVE VIDEO AD KILLER & AUTO-SKIP
        // ════════════════════════════════════════════════════
        // Ultra-fast active watcher:
        // 1. Detects video ads (ad containers, badges, timers, countdowns).
        // 2. Mutes audio, fast-forwards at 16x, seeks to end, and clicks skip buttons.
        // 3. Immediately restores normal speed and audio for main content!

        var isAdSpeedActive = false;

        function runAdKiller() {
          try {
            // Check for skip buttons
            var skipSelectors = [
              'button.skip-ad',
              '.video-ad-skip',
              '.ad-skip-button',
              '.skip-button',
              'button[class*="skip" i]',
              'div[class*="skip" i]',
              'button[aria-label*="skip" i]',
              '.ad-skip'
            ];
            for (var s = 0; s < skipSelectors.length; s++) {
              var btn = document.querySelector(skipSelectors[s]);
              if (btn && btn.offsetParent !== null) {
                try { btn.click(); } catch(e) {}
              }
            }

            // Check if player is currently showing an ad
            var adIndicatorSelectors = [
              '.ad-container',
              '.video-ad-container',
              '[class*="ad-timer"]',
              '[class*="ad-countdown"]',
              '[class*="ad-playing"]',
              '[class*="ad-badge"]',
              '.ad-duration',
              '[class*="advertisement" i]',
              '.spn-ad-container'
            ];

            var isAdPlaying = false;
            for (var a = 0; a < adIndicatorSelectors.length; a++) {
              var el = document.querySelector(adIndicatorSelectors[a]);
              if (el && el.offsetParent !== null) {
                isAdPlaying = true;
                break;
              }
            }

            var videos = document.querySelectorAll('video');
            for (var v = 0; v < videos.length; v++) {
              var vid = videos[v];
              if (!vid) continue;

              // Ensure playsinline
              if (!vid.playsInline) {
                vid.setAttribute('playsinline', 'true');
                vid.setAttribute('webkit-playsinline', 'true');
                vid.playsInline = true;
              }

              if (isAdPlaying) {
                isAdSpeedActive = true;
                // Mute and fast-forward ad
                vid.muted = true;
                vid.playbackRate = 16.0;
                // Seek to end of ad if finite
                if (vid.duration && !isNaN(vid.duration) && isFinite(vid.duration) && vid.duration > 0) {
                  vid.currentTime = vid.duration - 0.1;
                }
              } else if (isAdSpeedActive) {
                // Ad ended -> restore normal playback
                isAdSpeedActive = false;
                vid.playbackRate = 1.0;
                vid.muted = false;
              }
            }
          } catch(e) {}
        }

        setInterval(runAdKiller, 50);


        // ════════════════════════════════════════════════════
        // PHASE 5: BRAVE-STYLE BACKGROUND PLAYBACK & PIP
        // ════════════════════════════════════════════════════
        try {
          Object.defineProperty(Document.prototype, 'visibilityState', {
            enumerable: true,
            configurable: true,
            get: function() { return 'visible'; }
          });
          Object.defineProperty(Document.prototype, 'hidden', {
            enumerable: true,
            configurable: true,
            get: function() { return false; }
          });
          document.addEventListener('visibilitychange', function(e) {
            e.stopImmediatePropagation();
          }, true);
        } catch(e) {}

        window.__triggerZenTubePiP = function() {
          try {
            var vids = document.querySelectorAll('video');
            for (var i = 0; i < vids.length; i++) {
              var v = vids[i];
              if (v && !v.paused) {
                v.setAttribute('playsinline', 'true');
                v.setAttribute('webkit-playsinline', 'true');
                v.playsInline = true;
                if (typeof v.webkitSetPresentationMode === 'function') {
                  v.webkitSetPresentationMode('picture-in-picture');
                  return true;
                } else if (typeof v.requestPictureInPicture === 'function') {
                  v.requestPictureInPicture().catch(function(){});
                  return true;
                }
              }
            }
          } catch(e) {}
          return false;
        };

      } catch(globalErr) {}
    })();
    true;
  `;
}
