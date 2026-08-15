/**
 * Content filtering system for the YouTube WebView.
 * Implements URL-level request blocking and DOM-based element removal
 * similar to how Brave browser's Shields feature works.
 */

// ─── Blocked Ad-Serving Domains ─────────────────────────────────
// These are well-known advertising and tracking domains.
const BLOCKED_DOMAINS: string[] = [
  // Google Ads
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  'googleads.g.doubleclick.net',
  'pagead2.googlesyndication.com',
  'adservice.google.com',
  'ad.doubleclick.net',
  'static.doubleclick.net',
  'm.doubleclick.net',
  's0.2mdn.net',
  // Ad tracking
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'fundingchoicesmessages.google.com',
  // General ad networks
  'adsrvr.org',
  'adnxs.com',
  'moatads.com',
  'serving-sys.com',
  'app-measurement.com',
  'firebase-settings.crashlytics.com',
];

// ─── Blocked URL Patterns ───────────────────────────────────────
const BLOCKED_URL_PATTERNS: RegExp[] = [
  /\/pagead\//i,
  /\/ptracking\?/i,
  /\/api\/stats\/ads/i,
  /\/get_video_info.*(&|%26)adformat/i,
  /\/youtubei\/v1\/player\/ad_break/i,
  /\/api\/stats\/playback.*adformat/i,
  /doubleclick\.net/i,
  /\/generate_204\?.*ad/i,
  /\/log_interaction\?.*ad/i,
];

/**
 * Check if a URL should be blocked based on domain and pattern matching.
 */
export function shouldBlockRequest(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Check blocked domains
    for (const domain of BLOCKED_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }

    // Check blocked URL patterns
    for (const pattern of BLOCKED_URL_PATTERNS) {
      if (pattern.test(url)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

// ─── Ad Element Removal Script ──────────────────────────────────
/**
 * Returns JavaScript that removes/hides ad-related DOM elements
 * and handles video ad skipping in YouTube's player.
 */
export function getAdFilterScript(): string {
  return `
    (function() {
      'use strict';
      try {
        // ── CSS-based hiding of ad containers ──────────────
        var AD_STYLE_ID = '__ytfocus_adfilter_style';
        
        function injectAdCSS() {
          if (document.getElementById(AD_STYLE_ID)) return;
          var style = document.createElement('style');
          style.id = AD_STYLE_ID;
          style.textContent = [
            // Video ad overlays
            '.ytp-ad-module { display: none !important; }',
            '.ytp-ad-overlay-container { display: none !important; }',
            '.ytp-ad-overlay-slot { display: none !important; }',
            '.ytp-ad-overlay-close-button { display: none !important; }',
            '.ytp-ad-overlay-ad-info-button-container { display: none !important; }',
            '.ytp-ad-text-overlay { display: none !important; }',
            '.ytp-ad-image-overlay { display: none !important; }',
            // Banner / companion ads
            'ytd-promoted-sparkles-web-renderer { display: none !important; }',
            'ytd-promoted-sparkles-text-search-renderer { display: none !important; }',
            'ytd-display-ad-renderer { display: none !important; }',
            'ytd-companion-slot-renderer { display: none !important; }',
            'ytd-action-companion-ad-renderer { display: none !important; }',
            'ytd-in-feed-ad-layout-renderer { display: none !important; }',
            'ytd-ad-slot-renderer { display: none !important; }',
            'ytd-banner-promo-renderer { display: none !important; }',
            'ytd-statement-banner-renderer { display: none !important; }',
            'ytd-mealbar-promo-renderer { display: none !important; }',
            'ytm-companion-ad-renderer { display: none !important; }',
            'ytm-promoted-sparkles-web-renderer { display: none !important; }',
            'ytm-promoted-video-renderer { display: none !important; }',
            // Masthead ads
            'ytd-primetime-promo-renderer { display: none !important; }',
            '#masthead-ad { display: none !important; }',
            // Player ad elements
            '.ytp-ad-skip-button-modern { visibility: visible !important; opacity: 1 !important; }',
            '.ytp-ad-preview-container { display: none !important; }',
            '.ytp-ad-message-container { display: none !important; }',
            // Popup/dialog ads
            'tp-yt-paper-dialog:has(#dismiss-button) { display: none !important; }',
            'ytd-enforcement-message-view-model { display: none !important; }',
            'ytd-popup-container:has(.ytd-enforcement-message-view-model) { display: none !important; }',
            // Mobile ad elements
            'ytm-ad-slot-renderer { display: none !important; }',
            '.ad-showing .ytp-ad-overlay-container { display: none !important; }',
          ].join('\\n');
          (document.head || document.documentElement).appendChild(style);
        }

        // ── Video ad skip logic ────────────────────────────
        function handleVideoAds() {
          try {
            var videos = document.querySelectorAll('video');
            for (var v = 0; v < videos.length; v++) {
              var video = videos[v];
              var player = video.closest('.html5-video-player') || video.closest('#player-control-overlay');
              
              var isAdPlaying = player && (player.classList.contains('ad-showing') || player.querySelector('.ytp-ad-module') || document.querySelector('ytm-promoted-video-renderer'));
              
              // Mobile specific check
              var isMobileAd = document.querySelector('.ad-showing') || document.querySelector('ytm-promoted-video-renderer') || document.querySelector('.ytp-ad-player-overlay');
              
              if (isAdPlaying || isMobileAd) {
                // Try to click skip button
                var skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-container button');
                if (skipBtn) {
                  skipBtn.click();
                }

                // Fast forward video
                if (video.duration && isFinite(video.duration) && video.currentTime < video.duration - 1) {
                  video.currentTime = video.duration - 0.1;
                  video.playbackRate = 16;
                  video.muted = true;
                }
              }
            }
          } catch(e) {}
        }

        // ── Network Interceptor (Fetch & XHR) ──────────────
        var blockedPatterns = [
          '/pagead/', '/ptracking?', '/api/stats/ads', 'adformat', '/youtubei/v1/player/ad_break',
          'doubleclick.net', '/generate_204?ad', '/log_interaction?ad', 'googleadservices.com',
          'googlesyndication.com'
        ];

        function isAdUrl(url) {
          if (!url || typeof url !== 'string') return false;
          url = url.toLowerCase();
          for (var i = 0; i < blockedPatterns.length; i++) {
            if (url.indexOf(blockedPatterns[i]) > -1) return true;
          }
          return false;
        }

        // Monkey-patch fetch
        var originalFetch = window.fetch;
        window.fetch = function() {
          var url = arguments[0];
          if (typeof url === 'string' && isAdUrl(url)) {
            return Promise.reject(new Error('Ad blocked'));
          } else if (url && url.url && isAdUrl(url.url)) {
            return Promise.reject(new Error('Ad blocked'));
          }
          return originalFetch.apply(this, arguments);
        };

        // Monkey-patch XHR safely
        var originalOpen = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
          if (isAdUrl(url)) {
            arguments[1] = 'about:blank';
          }
          return originalOpen.apply(this, arguments);
        };

        // ── Remove ad elements from DOM ────────────────────
        function removeAdElements() {
          try {
            var adSelectors = [
              'ytd-ad-slot-renderer',
              'ytd-in-feed-ad-layout-renderer',
              'ytd-display-ad-renderer',
              'ytd-promoted-sparkles-web-renderer',
              'ytd-promoted-sparkles-text-search-renderer',
              'ytd-companion-slot-renderer',
              'ytd-action-companion-ad-renderer',
              'ytd-banner-promo-renderer',
              'ytd-mealbar-promo-renderer',
              '#masthead-ad',
              'ytm-ad-slot-renderer',
              'ytm-companion-ad-renderer',
              'ytm-promoted-sparkles-web-renderer',
              'ytm-promoted-video-renderer',
            ];

            adSelectors.forEach(function(selector) {
              try {
                document.querySelectorAll(selector).forEach(function(el) {
                  el.remove();
                });
              } catch(e) {}
            });
          } catch(e) {}
        }

        // ── Handle ad-blocker detection popups ─────────────
        function dismissAdBlockPopups() {
          try {
            // YouTube's "ad blockers are not allowed" dialog
            var enforcementMsg = document.querySelector('ytd-enforcement-message-view-model');
            if (enforcementMsg) {
              var container = enforcementMsg.closest('tp-yt-paper-dialog');
              if (container) container.remove();
              enforcementMsg.remove();
            }

            // Dismiss button on promo dialogs
            var dismissBtns = document.querySelectorAll('#dismiss-button');
            dismissBtns.forEach(function(btn) {
              var dialog = btn.closest('tp-yt-paper-dialog');
              if (dialog) {
                btn.click();
              }
            });

            // Remove overlay backdrop
            var backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
            if (backdrop && backdrop.style.display !== 'none') {
              backdrop.style.display = 'none';
            }
          } catch(e) {}
        }

        // ── Main execution loop ────────────────────────────
        injectAdCSS();
        removeAdElements();
        handleVideoAds();
        dismissAdBlockPopups();

        // Run ad handler frequently for video ads
        setInterval(function() {
          handleVideoAds();
          dismissAdBlockPopups();
        }, 500);

        // MutationObserver for new ad elements
        if (typeof MutationObserver !== 'undefined') {
          var debounceTimer = null;
          var observer = new MutationObserver(function() {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
              injectAdCSS();
              removeAdElements();
              dismissAdBlockPopups();
            }, 200);
          });
          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
          });
        }

        // Re-apply on SPA navigation
        var lastHref = location.href;
        setInterval(function() {
          if (location.href !== lastHref) {
            lastHref = location.href;
            setTimeout(function() {
              injectAdCSS();
              removeAdElements();
            }, 500);
          }
        }, 1000);

      } catch(e) {
        // Complete failure — app still works normally
      }
    })();
    true;
  `;
}
