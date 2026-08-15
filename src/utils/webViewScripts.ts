/**
 * WebView JavaScript injection scripts for YouTube customization.
 * Includes UI customization and optional content filtering.
 */

import { getAdFilterScript } from './contentFilter';

// ─── Hide Shorts Script ────────────────────────────────────────
/**
 * Returns JavaScript that hides YouTube Shorts-related UI elements.
 * Uses a MutationObserver for dynamic content and wraps everything
 * in try/catch for graceful degradation if YouTube changes its DOM.
 */
export function getHideShortsScript(): string {
  return `
    (function() {
      'use strict';
      try {
        var SHORTS_SELECTORS = [
          'ytd-reel-shelf-renderer',
          'ytd-rich-shelf-renderer[is-shorts]',
          'ytd-guide-entry-renderer:has(a[title="Shorts"])',
          'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])',
          'ytd-video-renderer:has([overlay-style="SHORTS"])',
          'ytd-grid-video-renderer:has([overlay-style="SHORTS"])',
          'ytd-rich-item-renderer:has([overlay-style="SHORTS"])',
          'yt-tab-shape[tab-title="Shorts"]',
          'ytm-reel-shelf-renderer',
          'ytm-shorts-lockup-view-model',
          'ytm-pivot-bar-item-renderer:has(.pivot-shorts)',
          'ytm-pivot-bar-item-renderer:nth-child(2)', // Mobile bottom nav shorts tab
          'a[href^="/shorts"]', // Any link to a short
          'a[href*="/shorts/"]'
        ];

        var SHORTS_STYLE_ID = '__ytfocus_hide_shorts_style';

        function injectShortsCSS() {
          if (document.getElementById(SHORTS_STYLE_ID)) return;
          var style = document.createElement('style');
          style.id = SHORTS_STYLE_ID;
          style.textContent = SHORTS_SELECTORS.map(function(sel) {
            return sel + ' { display: none !important; }';
          }).join('\\n');
          (document.head || document.documentElement).appendChild(style);
        }

        function hideShortElements() {
          try {
            SHORTS_SELECTORS.forEach(function(selector) {
              try {
                var elements = document.querySelectorAll(selector);
                elements.forEach(function(el) {
                  if (el && el.style) {
                    el.style.setProperty('display', 'none', 'important');
                  }
                });
              } catch(e) {
                // Selector not supported or element not found — skip
              }
            });
          } catch(e) {
            // Graceful degradation
          }
        }

        // Inject CSS immediately
        injectShortsCSS();
        // Also do direct DOM hiding
        hideShortElements();

        // Observe DOM mutations for dynamically loaded content
        if (typeof MutationObserver !== 'undefined') {
          var debounceTimer = null;
          var observer = new MutationObserver(function() {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
              injectShortsCSS();
              hideShortElements();
            }, 150);
          });
          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
          });
        }

        // Re-run on page transitions (YouTube SPA navigation)
        var lastUrl = location.href;
        setInterval(function() {
          if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(function() {
              injectShortsCSS();
              hideShortElements();
            }, 500);
          }
        }, 1000);

      } catch(e) {
        // Complete failure — YouTube still works, just Shorts visible
      }
    })();
    true;
  `;
}

// ─── No-op Script ───────────────────────────────────────────────
/**
 * Returns a no-op script when Hide Shorts is disabled.
 */
export function getNoopScript(): string {
  return 'true;';
}

// ─── Mobile YouTube Enhancements ────────────────────────────────
/**
 * Returns JavaScript that enhances the mobile YouTube experience.
 * Sets viewport and prevents zoom issues.
 */
export function getEnhancementScript(): string {
  return `
    (function() {
      'use strict';
      try {
        // Prevent text size adjustment issues
        var metaViewport = document.querySelector('meta[name="viewport"]');
        if (!metaViewport) {
          metaViewport = document.createElement('meta');
          metaViewport.name = 'viewport';
          metaViewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
          document.head.appendChild(metaViewport);
        }
      } catch(e) {
        // Ignore
      }
    })();
    true;
  `;
}

// ─── Combined Script Builder ────────────────────────────────────
/**
 * Builds the complete injection script based on settings.
 */
export function buildInjectionScript(hideShorts: boolean, contentFilter: boolean = false): string {
  const scripts: string[] = [getEnhancementScript()];
  if (hideShorts) {
    scripts.push(getHideShortsScript());
  }
  if (contentFilter) {
    scripts.push(getAdFilterScript());
  }
  return scripts.join('\n');
}
