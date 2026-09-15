/**
 * Content filtering system for JioHotstar WebView.
 * Blocks ad-serving domains and removes ad/promo UI elements.
 */

// ─── Blocked Hotstar Ad Domains ─────────────────────────────────
const HOTSTAR_BLOCKED_DOMAINS: string[] = [
  // Ad servers
  'pubads.g.doubleclick.net',
  'securepubads.g.doubleclick.net',
  'googleads.g.doubleclick.net',
  'ad.doubleclick.net',
  'static.doubleclick.net',
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  'pagead2.googlesyndication.com',
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
];

/**
 * Check if a URL should be blocked for Hotstar.
 */
export function shouldBlockHotstarRequest(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

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
  'apple.com',
];

export function isHotstarAllowedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return HOTSTAR_ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// ─── Hotstar Ad/Banner Removal Script ───────────────────────────
/**
 * Returns JavaScript that removes ad elements, hides "Download App" banners,
 * and intercepts ad network requests inside JioHotstar.
 */
export function getHotstarAdScript(): string {
  return `
    (function() {
      'use strict';
      try {
        // ── CSS-based hiding ──────────────────────────────
        var HS_AD_STYLE_ID = '__zentube_hotstar_adfilter';

        function injectHotstarCSS() {
          if (document.getElementById(HS_AD_STYLE_ID)) return;
          var style = document.createElement('style');
          style.id = HS_AD_STYLE_ID;
          style.textContent = [
            // Generic ad containers
            '[class*="ad-container"] { display: none !important; }',
            '[class*="ad-banner"] { display: none !important; }',
            '[class*="ad-overlay"] { display: none !important; }',
            '[class*="adBanner"] { display: none !important; }',
            '[class*="adContainer"] { display: none !important; }',
            '[class*="AdContainer"] { display: none !important; }',
            '[class*="advertisement"] { display: none !important; }',
            '[class*="google-ad"] { display: none !important; }',
            '[id*="google_ads"] { display: none !important; }',
            '[id*="ad-slot"] { display: none !important; }',
            // Download app banners / smart banners
            '[class*="app-download"] { display: none !important; }',
            '[class*="download-app"] { display: none !important; }',
            '[class*="downloadApp"] { display: none !important; }',
            '[class*="DownloadApp"] { display: none !important; }',
            '[class*="smart-banner"] { display: none !important; }',
            '[class*="smartBanner"] { display: none !important; }',
            '[class*="SmartBanner"] { display: none !important; }',
            '[class*="app-banner"] { display: none !important; }',
            '[class*="appBanner"] { display: none !important; }',
            '[class*="AppBanner"] { display: none !important; }',
            '[class*="open-in-app"] { display: none !important; }',
            '[class*="openInApp"] { display: none !important; }',
            '[class*="get-app"] { display: none !important; }',
            '[class*="getApp"] { display: none !important; }',
            '[class*="install-app"] { display: none !important; }',
            '.tippy-popper { display: none !important; }',
            // Promo overlays
            '[class*="promo-overlay"] { display: none !important; }',
            '[class*="PromoOverlay"] { display: none !important; }',
            '[class*="upsell"] { display: none !important; }',
            '[class*="Upsell"] { display: none !important; }',
            // In-stream video ad player overlay
            '[class*="preroll"] { display: none !important; }',
            '[class*="midroll"] { display: none !important; }',
            '[class*="postroll"] { display: none !important; }',
            // Hide "Continue in app" and similar popups
            '[class*="continue-in-app"] { display: none !important; }',
            '[class*="ContinueInApp"] { display: none !important; }',
            // IMA SDK container (Google Interactive Media Ads)
            '#ima-ad-container { display: none !important; }',
            '[id*="ima-ad"] { display: none !important; }',
            '[class*="ima-ad"] { display: none !important; }',
          ].join('\\n');
          (document.head || document.documentElement).appendChild(style);
        }

        // ── Remove download app banners from DOM ──────────
        function removeAppBanners() {
          try {
            // Text-based scanning for "Download" / "Get the App" / "Open in App"
            var allElements = document.querySelectorAll('a, button, div, span, p');
            for (var i = 0; i < allElements.length; i++) {
              var el = allElements[i];
              var text = (el.textContent || '').trim().toLowerCase();
              if (
                (text === 'download app' || text === 'get the app' ||
                 text === 'open in app' || text === 'install app' ||
                 text === 'continue in app' || text === 'use app' ||
                 text === 'download the app' || text === 'get app') &&
                el.offsetHeight > 0
              ) {
                // Find a reasonable parent container to hide
                var banner = el.closest('[class*="banner"], [class*="Banner"], [class*="download"], [class*="Download"], [class*="app-prompt"], [class*="overlay"]');
                if (banner) {
                  banner.style.setProperty('display', 'none', 'important');
                } else {
                  // If no semantic parent, just hide this element
                  el.style.setProperty('display', 'none', 'important');
                }
              }
            }
          } catch(e) {}
        }

        // ── Video ad skip logic ───────────────────────────
        function handleVideoAds() {
          try {
            var videos = document.querySelectorAll('video');
            for (var v = 0; v < videos.length; v++) {
              var video = videos[v];

              // Check for IMA ad container or ad-showing class
              var adContainer = document.querySelector('#ima-ad-container, [class*="ima-ad"], [class*="preroll"], [class*="midroll"]');
              if (adContainer && adContainer.offsetHeight > 0) {
                adContainer.style.setProperty('display', 'none', 'important');
              }

              // Fast forward any ad video
              var isAd = document.querySelector('[class*="ad-showing"], [class*="adPlaying"]');
              if (isAd && video.duration && isFinite(video.duration) && video.currentTime < video.duration - 1) {
                video.currentTime = video.duration - 0.1;
                video.muted = true;
              }
            }

            // Click any skip button
            var skipBtns = document.querySelectorAll('[class*="skip-ad"], [class*="skipAd"], [class*="SkipAd"], [class*="skip-button"]');
            for (var s = 0; s < skipBtns.length; s++) {
              if (skipBtns[s].offsetHeight > 0) {
                skipBtns[s].click();
              }
            }
          } catch(e) {}
        }

        // ── Network interceptor ───────────────────────────
        var blockedPatterns = [
          '/ads/', '/ad/', '/pagead/', 'doubleclick', 'adserver', 'adunit',
          'vast.xml', 'vastUrl', '/ptracking', 'googlesyndication', 'googleadservices',
          'pubmatic.com', 'scorecardresearch', 'moatads', 'springserve', 'aniview',
          '/beacon?', '/collect?'
        ];

        function isAdUrl(url) {
          if (!url || typeof url !== 'string') return false;
          var lower = url.toLowerCase();
          for (var i = 0; i < blockedPatterns.length; i++) {
            if (lower.indexOf(blockedPatterns[i]) > -1) return true;
          }
          return false;
        }

        // Monkey-patch fetch
        var originalFetch = window.fetch;
        window.fetch = function() {
          var url = arguments[0];
          if (typeof url === 'string' && isAdUrl(url)) {
            return Promise.resolve(new Response('', { status: 200 }));
          } else if (url && url.url && isAdUrl(url.url)) {
            return Promise.resolve(new Response('', { status: 200 }));
          }
          return originalFetch.apply(this, arguments);
        };

        // Monkey-patch XHR
        var originalOpen = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
          if (isAdUrl(url)) {
            arguments[1] = 'about:blank';
          }
          return originalOpen.apply(this, arguments);
        };

        // ── Fullscreen rotation support ───────────────────
        function sendFullscreen(isFullscreen) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'fullscreen',
              isFullscreen: isFullscreen
            }));
          }
        }

        function attachVideoListeners() {
          var videos = document.querySelectorAll('video');
          for (var i = 0; i < videos.length; i++) {
            if (!videos[i].__hs_fs_attached) {
              videos[i].__hs_fs_attached = true;
              videos[i].addEventListener('webkitbeginfullscreen', function() {
                sendFullscreen(true);
              });
              videos[i].addEventListener('webkitendfullscreen', function() {
                sendFullscreen(false);
              });
            }
          }
        }

        document.addEventListener('fullscreenchange', function() {
          sendFullscreen(!!document.fullscreenElement);
        });
        document.addEventListener('webkitfullscreenchange', function() {
          sendFullscreen(!!document.webkitFullscreenElement);
        });

        // ── Main execution ────────────────────────────────
        injectHotstarCSS();
        removeAppBanners();
        handleVideoAds();
        attachVideoListeners();

        // Periodic cleanup
        setInterval(function() {
          handleVideoAds();
          removeAppBanners();
          attachVideoListeners();
        }, 500);

        // MutationObserver for dynamic content
        if (typeof MutationObserver !== 'undefined') {
          var debounceTimer = null;
          var observer = new MutationObserver(function() {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
              injectHotstarCSS();
              removeAppBanners();
            }, 200);
          });
          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
          });
        }

      } catch(e) {
        // Graceful degradation
      }
    })();
    true;
  `;
}
