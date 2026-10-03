/**
 * Content filtering and Anti-Adblock Defusal system for Sony LIV WebView.
 *
 * Reverse-engineered components:
 * 1. Webpack Module 61647 Defusal: Sony LIV uses 'just-detect-adblock' (module 61647 in chunk 7693)
 *    which is invoked by App.jsx as: D().isDetected() ? this.setState({adBlocker: true}) : ...
 *    We hook window.__LOADABLE_LOADED_CHUNKS__.push to intercept and replace module 61647 with a clean
 *    mock returning isDetected() => false.
 * 2. DOM Bait Element Spoofing: Overrides offsetParent, offsetHeight, offsetWidth, offsetLeft, offsetTop,
 *    clientHeight, clientWidth, and getComputedStyle on bait divs (.pub_300x250, .text-ad, .adSense, .adBlock)
 *    so any DOM measurement returns non-zero positive values and visible display.
 * 3. Network Bait Neutralization: Intercepts raw.githubusercontent.com / pagead2.googlesyndication.com
 *    in XMLHttpRequest to respond with status 200 and 'thistextshouldbethere\n'.
 * 4. CSS & DOM Suppression: Targets the exact modal container (.ad_block_wrapper_all) from chunk 5771
 *    without touching the bait div classes.
 * 5. 50ms Active Video Ad Killer: Mutes video ads, speeds them up 16x, seeks to end, and clicks skip buttons.
 * 6. Brave-Style Background Playback & PiP.
 */

// ─── Blocked Sony LIV Ad & Tracking Domains ───────────────────────
// We block 3rd-party ad trackers, but NEVER block sonyliv.com or imasdk.googleapis.com
const SONYLIV_BLOCKED_DOMAINS: string[] = [
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
  'ad.doubleclick.net',
  'static.doubleclick.net',
  's0.2mdn.net',
];

const SONYLIV_BLOCKED_PATTERNS: RegExp[] = [
  /apps\.apple\.com/i,
  /itunes\.apple\.com/i,
  /play\.google\.com/i,
  /\/download\b/i,
  /sonyliv:\/\/./i,
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

    // 2. CRITICAL: NEVER block Sony LIV's own services or critical player endpoints!
    if (
      hostname === 'sonyliv.com' ||
      hostname.endsWith('.sonyliv.com') ||
      hostname.includes('imasdk.googleapis.com') ||
      url.includes('spnadmanager.js') ||
      url.includes('ima3_dai.js') ||
      url.includes('ima3.js') ||
      url.includes('playersdk') ||
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
        // LAYER 1: WEBPACK MODULE 61647 DEFUSAL
        // ════════════════════════════════════════════════════
        // Sony LIV uses 'just-detect-adblock' (module 61647) inside chunk 7693.
        // In App.jsx, componentDidMount calls:
        //   D().isDetected() ? this.setState({adBlocker: true}) : this.setState({adBlocker: false})
        // When adBlocker is true, React unmounts everything and displays DetectAdBlock (chunk 5771).
        // By replacing module 61647 in the Webpack chunk registry before execution,
        // D().isDetected() ALWAYS returns false!
        try {
          var cleanAdblockMock = function(module) {
            module.exports = function() {
              return {
                detectAnyAdblocker: function() { return Promise.resolve(false); },
                detectDomAdblocker: function() { return Promise.resolve(false); },
                detectBraveShields: function() { return Promise.resolve(false); },
                detectOperaAdblocker: function() { return Promise.resolve(false); },
                isDetected: function() { return false; }
              };
            };
          };

          function patchChunkArray(arr) {
            if (!arr || arr.__zenHooked) return;
            arr.__zenHooked = true;

            // Check any chunks already in the array
            for (var c = 0; c < arr.length; c++) {
              var item = arr[c];
              if (item && item[1] && typeof item[1] === 'object' && item[1][61647]) {
                item[1][61647] = cleanAdblockMock;
              }
            }

            var origPush = arr.push;
            arr.push = function() {
              for (var i = 0; i < arguments.length; i++) {
                var chunk = arguments[i];
                if (chunk && chunk[1] && typeof chunk[1] === 'object' && chunk[1][61647]) {
                  chunk[1][61647] = cleanAdblockMock;
                }
              }
              return origPush.apply(this, arguments);
            };
          }

          var initialChunks = window.__LOADABLE_LOADED_CHUNKS__ || [];
          patchChunkArray(initialChunks);
          window.__LOADABLE_LOADED_CHUNKS__ = initialChunks;

          var _loadableChunks = initialChunks;
          try {
            Object.defineProperty(window, '__LOADABLE_LOADED_CHUNKS__', {
              get: function() { return _loadableChunks; },
              set: function(val) {
                _loadableChunks = val;
                patchChunkArray(val);
              },
              configurable: true
            });
          } catch(e) {}
        } catch(e) {}


        // ════════════════════════════════════════════════════
        // LAYER 2: DOM BAIT ELEMENT MEASUREMENT SPOOFING
        // ════════════════════════════════════════════════════
        // 'just-detect-adblock' creates a bait <div> with:
        // class="pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links ad-text adSense adBlock adContent adBanner"
        // and checks:
        //   null === e.offsetParent || 0 == e.offsetHeight || 0 == e.offsetLeft || 0 == e.offsetTop ||
        //   0 == e.offsetWidth || 0 == e.clientHeight || 0 == e.clientWidth ||
        //   getComputedStyle(e).getPropertyValue('display') === 'none' ||
        //   getComputedStyle(e).getPropertyValue('visibility') === 'hidden'
        // We ensure every bait check returns healthy non-zero dimensions and visible status!

        function isBaitClass(cls) {
          if (!cls || typeof cls !== 'string') return false;
          return /pub_|text-ad|adSense|adBlock|adContent|adBanner/i.test(cls);
        }

        try {
          var origOffsetHeightDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
          if (origOffsetHeightDesc && origOffsetHeightDesc.get) {
            Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
              get: function() {
                if (isBaitClass(this.className)) return 1;
                return origOffsetHeightDesc.get.call(this);
              },
              configurable: true
            });
          }

          var origOffsetWidthDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
          if (origOffsetWidthDesc && origOffsetWidthDesc.get) {
            Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
              get: function() {
                if (isBaitClass(this.className)) return 1;
                return origOffsetWidthDesc.get.call(this);
              },
              configurable: true
            });
          }

          var origOffsetLeftDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft');
          if (origOffsetLeftDesc && origOffsetLeftDesc.get) {
            Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
              get: function() {
                if (isBaitClass(this.className)) return -10000;
                return origOffsetLeftDesc.get.call(this);
              },
              configurable: true
            });
          }

          var origOffsetTopDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');
          if (origOffsetTopDesc && origOffsetTopDesc.get) {
            Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
              get: function() {
                if (isBaitClass(this.className)) return -1000;
                return origOffsetTopDesc.get.call(this);
              },
              configurable: true
            });
          }

          var origOffsetParentDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
          if (origOffsetParentDesc && origOffsetParentDesc.get) {
            Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
              get: function() {
                if (isBaitClass(this.className)) return document.body || this.parentElement;
                return origOffsetParentDesc.get.call(this);
              },
              configurable: true
            });
          }

          var origClientHeightDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight');
          if (origClientHeightDesc && origClientHeightDesc.get) {
            Object.defineProperty(Element.prototype, 'clientHeight', {
              get: function() {
                if (isBaitClass(this.className)) return 1;
                return origClientHeightDesc.get.call(this);
              },
              configurable: true
            });
          }

          var origClientWidthDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth');
          if (origClientWidthDesc && origClientWidthDesc.get) {
            Object.defineProperty(Element.prototype, 'clientWidth', {
              get: function() {
                if (isBaitClass(this.className)) return 1;
                return origClientWidthDesc.get.call(this);
              },
              configurable: true
            });
          }

          // Hook window.getComputedStyle
          if (window.getComputedStyle) {
            var origGetComputedStyle = window.getComputedStyle;
            window.getComputedStyle = function(el, pseudo) {
              var res = origGetComputedStyle.apply(this, arguments);
              if (el && el.className && isBaitClass(el.className)) {
                return new Proxy(res, {
                  get: function(target, prop) {
                    if (prop === 'display') return 'block';
                    if (prop === 'visibility') return 'visible';
                    if (prop === 'getPropertyValue') {
                      return function(p) {
                        if (p === 'display') return 'block';
                        if (p === 'visibility') return 'visible';
                        return target.getPropertyValue(p);
                      };
                    }
                    var val = target[prop];
                    if (typeof val === 'function') return val.bind(target);
                    return val;
                  }
                });
              }
              return res;
            };
          }

          // Body 'abp' attribute check spoof
          var origGetAttribute = Element.prototype.getAttribute;
          Element.prototype.getAttribute = function(name) {
            if (name === 'abp') return null;
            return origGetAttribute.apply(this, arguments);
          };
        } catch(e) {}


        // ════════════════════════════════════════════════════
        // LAYER 3: XHR BAIT INTERCEPTION
        // ════════════════════════════════════════════════════
        // 'just-detect-adblock' tests raw.githubusercontent.com/.../baits/pagead2.googlesyndication.com
        // Expects status 200 with text 'thistextshouldbethere\\n'
        try {
          var origOpen = XMLHttpRequest.prototype.open;
          var origSend = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.open = function(method, url) {
            this.__zenUrl = (url || '').toString();
            return origOpen.apply(this, arguments);
          };
          XMLHttpRequest.prototype.send = function() {
            if (this.__zenUrl && (
              this.__zenUrl.indexOf('just-detect-adblock') !== -1 ||
              this.__zenUrl.indexOf('pagead2.googlesyndication.com') !== -1
            )) {
              var self = this;
              setTimeout(function() {
                try {
                  Object.defineProperty(self, 'status', { get: function() { return 200; }, configurable: true });
                  Object.defineProperty(self, 'readyState', { get: function() { return 4; }, configurable: true });
                  Object.defineProperty(self, 'responseText', { get: function() { return 'thistextshouldbethere\\n'; }, configurable: true });
                  if (typeof self.onreadystatechange === 'function') {
                    self.onreadystatechange();
                  }
                  if (typeof self.onload === 'function') {
                    self.onload();
                  }
                } catch(e) {}
              }, 10);
              return;
            }
            return origSend.apply(this, arguments);
          };
        } catch(e) {}


        // ════════════════════════════════════════════════════
        // LAYER 4: TARGETED CSS SUPPRESSION
        // ════════════════════════════════════════════════════
        // Target ONLY the exact Ad Blocker Detected screen from chunk 5771 (.ad_block_wrapper_all).
        // NEVER use broad [class*="adblock"] which matches the bait div!
        try {
          var baitStyle = document.createElement('style');
          baitStyle.id = '__zen_sonyliv_detector_defuse';
          baitStyle.textContent = [
            '/* Defuse the exact ad blocker detection screen */',
            '.ad_block_wrapper_all {',
            '  display: none !important;',
            '  visibility: hidden !important;',
            '  opacity: 0 !important;',
            '  pointer-events: none !important;',
            '  height: 0 !important;',
            '  max-height: 0 !important;',
            '  overflow: hidden !important;',
            '}',
            '/* Hide app download banners and promotions */',
            '.app-download-banner, .app-banner, [class*="app-banner" i], [class*="download-app" i], [class*="open-in-app" i] {',
            '  display: none !important;',
            '}'
          ].join('\\n');
          (document.head || document.documentElement).appendChild(baitStyle);
        } catch(e) {}

        // Prevent window.close from terminating the WebView on "No Thanks!"
        try {
          window.close = function() {};
        } catch(e) {}


        // ════════════════════════════════════════════════════
        // LAYER 5: GOOGLE IMA SDK & AD MANAGER DEFUSAL
        // ════════════════════════════════════════════════════
        function hookGoogleIMA() {
          if (!window.google || !window.google.ima) return;

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
        // LAYER 6: 50MS ACTIVE VIDEO AD KILLER & INSTANT SKIP
        // ════════════════════════════════════════════════════
        var isAdSpeedActive = false;

        function runAdKiller() {
          try {
            // 1. Auto-click skip buttons
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

            // 2. Auto-remove .ad_block_wrapper_all if mounted
            var adBlockWall = document.querySelector('.ad_block_wrapper_all');
            if (adBlockWall && adBlockWall.parentNode) {
              try { adBlockWall.parentNode.removeChild(adBlockWall); } catch(e) {}
            }

            // 3. Detect if player is showing an ad
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
                vid.muted = true;
                vid.playbackRate = 16.0;
                if (vid.duration && !isNaN(vid.duration) && isFinite(vid.duration) && vid.duration > 0) {
                  vid.currentTime = vid.duration - 0.1;
                }
              } else if (isAdSpeedActive) {
                isAdSpeedActive = false;
                vid.playbackRate = 1.0;
                vid.muted = false;
              }
            }
          } catch(e) {}
        }

        setInterval(runAdKiller, 50);


        // ════════════════════════════════════════════════════
        // LAYER 7: BRAVE-STYLE BACKGROUND PLAYBACK & PIP
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
