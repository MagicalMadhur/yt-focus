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
    return HOTSTAR_ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// Hotstar Ad/Banner Removal Script
export function getHotstarAdScript(): string {
  return `
    (function() {
      'use strict';
      try {
        // ── Viewport & Desktop Spoofing ──────────────────
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
            get: function() { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'; },
            configurable: true
          });
          Object.defineProperty(navigator, 'platform', {
            get: function() { return 'MacIntel'; },
            configurable: true
          });
        } catch(e) {}

        // ── CSS-based hiding ──────────────────────────────
        var HS_AD_STYLE_ID = '__zentube_hotstar_adfilter';

        function injectHotstarCSS() {
          if (document.getElementById(HS_AD_STYLE_ID)) return;
          var style = document.createElement('style');
          style.id = HS_AD_STYLE_ID;
          style.textContent = [
            // ── Native Desktop Layout (Removed Aggressive Overrides) ──

            // ── Generic ad containers ──
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
            '[data-ad] { display: none !important; }',
            '[data-ad-unit] { display: none !important; }',
            '[data-google-ad] { display: none !important; }',

            // ── Hotstar-specific ad selectors ──
            '[class*="ad-unit"] { display: none !important; }',
            '[class*="adUnit"] { display: none !important; }',
            '[class*="AdUnit"] { display: none !important; }',
            '[class*="ad-display"] { display: none !important; }',
            '[class*="adDisplay"] { display: none !important; }',
            '[class*="ad-wrapper"] { display: none !important; }',
            '[class*="adWrapper"] { display: none !important; }',
            '[class*="ad-card"] { display: none !important; }',
            '[class*="adCard"] { display: none !important; }',
            '[class*="AdCard"] { display: none !important; }',
            '[class*="sponsored"] { display: none !important; }',
            '[class*="Sponsored"] { display: none !important; }',
            '[class*="masthead-ad"] { display: none !important; }',
            '[class*="mastheadAd"] { display: none !important; }',
            '[class*="MastheadAd"] { display: none !important; }',
            '[class*="display-ad"] { display: none !important; }',
            '[class*="displayAd"] { display: none !important; }',
            '[class*="native-ad"] { display: none !important; }',
            '[class*="nativeAd"] { display: none !important; }',
            '[class*="NativeAd"] { display: none !important; }',
            '[class*="ad-rail"] { display: none !important; }',
            '[class*="adRail"] { display: none !important; }',
            '[class*="banner-ad"] { display: none !important; }',
            '[class*="BannerAd"] { display: none !important; }',
            '[class*="bannerAd"] { display: none !important; }',
            '[class*="leaderboard"] { display: none !important; }',
            '[class*="Leaderboard"] { display: none !important; }',

            // ── IMA SDK (Google Interactive Media Ads) ──
            '#ima-ad-container { display: none !important; }',
            '[id*="ima-ad"] { display: none !important; }',
            '[class*="ima-ad"] { display: none !important; }',
            '.ima-ad-container { display: none !important; }',
            '#google_companion_ad_div { display: none !important; }',
            '.videoAdUi { display: none !important; }',
            '.videoAdUiTopBar { display: none !important; }',
            '[class*="ad-showing"] { display: none !important; }',
            '[class*="adShowing"] { display: none !important; }',

            // ── In-stream video ads ──
            '[class*="preroll"] { display: none !important; }',
            '[class*="Preroll"] { display: none !important; }',
            '[class*="midroll"] { display: none !important; }',
            '[class*="Midroll"] { display: none !important; }',
            '[class*="postroll"] { display: none !important; }',
            '[class*="Postroll"] { display: none !important; }',
            '[class*="ad-break"] { display: none !important; }',
            '[class*="adBreak"] { display: none !important; }',
            '[class*="AdBreak"] { display: none !important; }',
            '[class*="ad-playing"] { display: none !important; }',
            '[class*="adPlaying"] { display: none !important; }',
            '[class*="ad-countdown"] { display: none !important; }',
            '[class*="adCountdown"] { display: none !important; }',

            // ── Download app / smart banners ──
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
            '[class*="OpenInApp"] { display: none !important; }',
            '[class*="get-app"] { display: none !important; }',
            '[class*="getApp"] { display: none !important; }',
            '[class*="install-app"] { display: none !important; }',
            '[class*="installApp"] { display: none !important; }',
            '[class*="continue-in-app"] { display: none !important; }',
            '[class*="ContinueInApp"] { display: none !important; }',
            '[class*="downloadPrompt"] { display: none !important; }',
            '[class*="DownloadPrompt"] { display: none !important; }',
            '[id*="download-prompt"] { display: none !important; }',
            '[id*="downloadPrompt"] { display: none !important; }',
            '[class*="switch-to-app"] { display: none !important; }',
            '[class*="watch-on-app"] { display: none !important; }',
            '[class*="mobile-app"] { display: none !important; }',
            '[class*="MobileApp"] { display: none !important; }',
            'a[href*="apps.apple.com"] { display: none !important; }',
            'a[href*="itunes.apple.com"] { display: none !important; }',
            'a[href*="play.google.com"] { display: none !important; }',
            '.tippy-popper { display: none !important; }',
            'meta[name="apple-itunes-app"] { display: none !important; }',
            'meta[name="google-play-app"] { display: none !important; }',

            // ── Promo / upsell overlays ──
            '[class*="promo-overlay"] { display: none !important; }',
            '[class*="PromoOverlay"] { display: none !important; }',
            '[class*="upsell"] { display: none !important; }',
            '[class*="Upsell"] { display: none !important; }',
            '[class*="upgrade-prompt"] { display: none !important; }',
            '[class*="upgradePrompt"] { display: none !important; }',
            '[class*="subscribe-prompt"] { display: none !important; }',

            // ── iframes (often used for third-party ads) ──
            'iframe[src*="doubleclick"] { display: none !important; }',
            'iframe[src*="googlesyndication"] { display: none !important; }',
            'iframe[src*="googleads"] { display: none !important; }',
            'iframe[src*="ad."] { display: none !important; }',
            'iframe[id*="google_ads"] { display: none !important; }',
          ].join('\\\\n');
          (document.head || document.documentElement).appendChild(style);
        }

        // ── Remove download app banners from DOM ──────────
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
                    if (banner) {
                      banner.style.setProperty('display', 'none', 'important');
                    } else {
                      el.style.setProperty('display', 'none', 'important');
                    }
                  }
                  break;
                }
              }
            }

            // Remove apple-itunes-app and google-play-app meta (stops native smart banners)
            var metas = document.querySelectorAll('meta[name="apple-itunes-app"], meta[name="google-play-app"]');
            for (var m = 0; m < metas.length; m++) {
              metas[m].remove();
            }
          } catch(e) {}
        }

        // ── Video ad skip logic ───────────────────────────
        function handleVideoAds() {
          try {
            // Skip ad videos by fast-forwarding
            var videos = document.querySelectorAll('video');
            for (var v = 0; v < videos.length; v++) {
              var video = videos[v];

              // Detect if this video is an ad
              var parent = video.parentElement;
              var isAd = false;
              var depth = 0;
              while (parent && depth < 10) {
                var cls = (parent.className || '').toString().toLowerCase();
                var id = (parent.id || '').toLowerCase();
                if (cls.indexOf('ad') > -1 || id.indexOf('ad') > -1 ||
                    cls.indexOf('ima') > -1 || id.indexOf('ima') > -1 ||
                    cls.indexOf('preroll') > -1 || cls.indexOf('midroll') > -1) {
                  isAd = true;
                  break;
                }
                parent = parent.parentElement;
                depth++;
              }

              if (isAd && video.duration && isFinite(video.duration) && video.duration < 120) {
                video.currentTime = video.duration;
                video.muted = true;
                video.pause();
                var adParent = video.closest('[class*="ad"], [id*="ima"]');
                if (adParent) adParent.style.setProperty('display', 'none', 'important');
              }
            }

            // Hide any visible ad overlays
            var adOverlays = document.querySelectorAll(
              '#ima-ad-container, [class*="ima-ad"], [class*="preroll"], [class*="midroll"], ' +
              '[class*="ad-showing"], [class*="adPlaying"], [class*="ad-break"], [class*="adBreak"]'
            );
            for (var a = 0; a < adOverlays.length; a++) {
              if (adOverlays[a].offsetHeight > 0) {
                adOverlays[a].style.setProperty('display', 'none', 'important');
              }
            }

            // Click any skip button
            var skipSelectors = [
              '[class*="skip-ad"]', '[class*="skipAd"]', '[class*="SkipAd"]',
              '[class*="skip-button"]', '[class*="skipButton"]', '[class*="SkipButton"]',
              '[class*="ad-skip"]', '[class*="adSkip"]',
              'button[class*="skip"]', '[aria-label*="Skip"]', '[aria-label*="skip"]',
            ];
            var skipBtns = document.querySelectorAll(skipSelectors.join(', '));
            for (var s = 0; s < skipBtns.length; s++) {
              if (skipBtns[s].offsetHeight > 0) {
                skipBtns[s].click();
              }
            }
          } catch(e) {}
        }

        // ── Fullscreen rotation support ───────────────────
        var isFullscreen = false;
        function sendFullscreen(fs) {
          if (fs === isFullscreen) return; // debounce duplicate events
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
              videos[i].addEventListener('webkitbeginfullscreen', function() {
                sendFullscreen(true);
              });
              videos[i].addEventListener('webkitendfullscreen', function() {
                sendFullscreen(false);
              });
              // Also detect via play in landscape (Hotstar uses custom fullscreen)
              videos[i].addEventListener('playing', function() {
                if (this.videoWidth > this.videoHeight && this.videoWidth > 400) {
                  // Landscape video playing — check if it's filling viewport
                  var rect = this.getBoundingClientRect();
                  if (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.7) {
                    sendFullscreen(true);
                  }
                }
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

        // Periodic cleanup (fast for ads, slower for banners)
        setInterval(function() {
          handleVideoAds();
          attachVideoListeners();
        }, 300);
        setInterval(function() {
          removeAppBanners();
        }, 1000);

        // MutationObserver for dynamic content
        if (typeof MutationObserver !== 'undefined') {
          var debounceTimer = null;
          var observer = new MutationObserver(function() {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
              injectHotstarCSS();
              removeAppBanners();
              handleVideoAds();
            }, 150);
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
