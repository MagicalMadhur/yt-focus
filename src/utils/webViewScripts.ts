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
              } catch(e) {}
            });

            // Aggressive Inner-Text scanning to kill the bottom nav tab and home chips
            var allDivs = document.querySelectorAll('div, span, yt-formatted-string');
            for (var i = 0; i < allDivs.length; i++) {
              var el = allDivs[i];
              if (el.textContent && el.textContent.trim() === 'Shorts') {
                // If this is inside a pivot bar (bottom nav), kill the whole tab
                var pivotItem = el.closest('ytm-pivot-bar-item-renderer, ytd-mini-guide-entry-renderer, ytd-guide-entry-renderer');
                if (pivotItem) {
                  pivotItem.style.setProperty('display', 'none', 'important');
                }
                
                // If this is a chip cloud filter
                var chipItem = el.closest('yt-chip-cloud-chip-renderer, ytm-chip-cloud-chip-renderer');
                if (chipItem) {
                  chipItem.style.setProperty('display', 'none', 'important');
                }
              }
            }
          } catch(e) {}
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
          
          // ABSOLUTE NUKE: If URL ever becomes a shorts URL, redirect to home instantly
          if (window.location.pathname.indexOf('/shorts') === 0) {
             window.location.replace('/');
          }
        }, 100);

        // Monkey-patch SPA navigations
        var originalPushState = history.pushState;
        history.pushState = function(state, title, url) {
          if (typeof url === 'string' && url.indexOf('/shorts') > -1) {
            arguments[2] = '/';
          }
          return originalPushState.apply(this, arguments);
        };

        var originalReplaceState = history.replaceState;
        history.replaceState = function(state, title, url) {
          if (typeof url === 'string' && url.indexOf('/shorts') > -1) {
            arguments[2] = '/';
          }
          return originalReplaceState.apply(this, arguments);
        };

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

// ─── In-Page YouTube Fullscreen Engine ────────────────────────
/**
 * Enables in-page YouTube fullscreen without triggering iOS WebKit's native AVPlayer:
 * 1. Neuters HTMLVideoElement.prototype.webkitEnterFullscreen so the iOS native player never takes over.
 * 2. Polyfills standard Fullscreen API (requestFullscreen, exitFullscreen, fullscreenElement, fullscreenEnabled)
 *    so YouTube's player stays inside the webview and uses YouTube's own player UI (gear icon, speed, quality, captions).
 * 3. Applies edge-to-edge in-page styling to #movie_player and the video element in fullscreen mode.
 * 4. Communicates with React Native to rotate to landscape and hide the status bar.
 */
export function getFullscreenInterceptorScript(): string {
  return `
    (function() {
      'use strict';
      if (window.__zenTubeFSInstalled) return;
      window.__zenTubeFSInstalled = true;

      var _fsElement = null;
      var FS_STYLE_ID = '__zentube_inpage_fs_style';

      // ── 1. Inject In-Page Fullscreen CSS ──
      function injectFSCSS() {
        if (document.getElementById(FS_STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = FS_STYLE_ID;
        style.textContent = [
          'html.__yt_inpage_fullscreen, body.__yt_inpage_fullscreen {',
          '  overflow: hidden !important;',
          '  width: 100vw !important;',
          '  height: 100vh !important;',
          '  margin: 0 !important;',
          '  padding: 0 !important;',
          '  background: #000 !important;',
          '  position: fixed !important;',
          '  top: 0 !important;',
          '  left: 0 !important;',
          '  z-index: 2147483640 !important;',
          '}',
          'html.__yt_inpage_fullscreen ytm-app,',
          'html.__yt_inpage_fullscreen #app,',
          'html.__yt_inpage_fullscreen ytm-watch {',
          '  transform: none !important;',
          '  perspective: none !important;',
          '  filter: none !important;',
          '  overflow: visible !important;',
          '}',
          'html.__yt_inpage_fullscreen #header-bar,',
          'html.__yt_inpage_fullscreen ytm-header-bar,',
          'html.__yt_inpage_fullscreen ytm-mobile-topbar-renderer,',
          'html.__yt_inpage_fullscreen ytm-pivot-bar-renderer,',
          'html.__yt_inpage_fullscreen .pivot-bar,',
          'html.__yt_inpage_fullscreen .watch-below-the-player,',
          'html.__yt_inpage_fullscreen #below,',
          'html.__yt_inpage_fullscreen ytm-item-section-renderer,',
          'html.__yt_inpage_fullscreen ytm-compact-video-renderer,',
          'html.__yt_inpage_fullscreen ytm-single-column-watch-next-results-renderer {',
          '  display: none !important;',
          '}',
          'html.__yt_inpage_fullscreen #player,',
          'html.__yt_inpage_fullscreen #player-container-id,',
          'html.__yt_inpage_fullscreen .player-container,',
          'html.__yt_inpage_fullscreen #movie_player,',
          'html.__yt_inpage_fullscreen .player-wrapper {',
          '  position: fixed !important;',
          '  top: 0 !important;',
          '  left: 0 !important;',
          '  width: 100vw !important;',
          '  height: 100vh !important;',
          '  max-width: 100vw !important;',
          '  max-height: 100vh !important;',
          '  z-index: 2147483647 !important;',
          '  background: #000 !important;',
          '  border-radius: 0 !important;',
          '}',
          'html.__yt_inpage_fullscreen video,',
          'html.__yt_inpage_fullscreen .html5-main-video {',
          '  position: absolute !important;',
          '  top: 0 !important;',
          '  left: 0 !important;',
          '  width: 100vw !important;',
          '  height: 100vh !important;',
          '  max-width: 100vw !important;',
          '  max-height: 100vh !important;',
          '  object-fit: contain !important;',
          '}',
          'html.__yt_inpage_fullscreen .html5-video-container {',
          '  width: 100vw !important;',
          '  height: 100vh !important;',
          '  top: 0 !important;',
          '  left: 0 !important;',
          '}',
          'html.__yt_inpage_fullscreen .ytp-chrome-bottom,',
          'html.__yt_inpage_fullscreen .ytp-chrome-top,',
          'html.__yt_inpage_fullscreen .ytp-settings-menu,',
          'html.__yt_inpage_fullscreen .ytp-popup,',
          'html.__yt_inpage_fullscreen .ytp-caption-window-container,',
          'html.__yt_inpage_fullscreen ytm-menu-popup-renderer,',
          'html.__yt_inpage_fullscreen tp-yt-iron-dropdown {',
          '  z-index: 2147483647 !important;',
          '}'
        ].join('\\n');
        (document.head || document.documentElement).appendChild(style);
      }

      injectFSCSS();

      function notifyReactNative(isFS) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'fullscreen',
            isFullscreen: isFS
          }));
        }
      }

      function enterInPageFullscreen(target) {
        injectFSCSS();
        _fsElement = target || document.querySelector('#movie_player') || document.querySelector('video') || document.body;
        document.documentElement.classList.add('__yt_inpage_fullscreen');
        document.body.classList.add('__yt_inpage_fullscreen');

        var moviePlayer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
        if (moviePlayer) {
          moviePlayer.classList.add('ytp-fullscreen');
        }

        notifyReactNative(true);

        try {
          document.dispatchEvent(new Event('fullscreenchange', { bubbles: true }));
          document.dispatchEvent(new Event('webkitfullscreenchange', { bubbles: true }));
        } catch(e) {}

        return Promise.resolve();
      }

      function exitInPageFullscreen() {
        _fsElement = null;
        document.documentElement.classList.remove('__yt_inpage_fullscreen');
        document.body.classList.remove('__yt_inpage_fullscreen');

        var moviePlayer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
        if (moviePlayer) {
          moviePlayer.classList.remove('ytp-fullscreen');
        }

        notifyReactNative(false);

        try {
          document.dispatchEvent(new Event('fullscreenchange', { bubbles: true }));
          document.dispatchEvent(new Event('webkitfullscreenchange', { bubbles: true }));
        } catch(e) {}

        return Promise.resolve();
      }

      // ── 2. Fullscreen API Polyfills for YouTube Web Player ──
      Element.prototype.requestFullscreen = function() {
        return enterInPageFullscreen(this);
      };
      Element.prototype.webkitRequestFullscreen = function() {
        return enterInPageFullscreen(this);
      };
      Document.prototype.exitFullscreen = function() {
        return exitInPageFullscreen();
      };
      Document.prototype.webkitExitFullscreen = function() {
        return exitInPageFullscreen();
      };

      try {
        Object.defineProperty(Document.prototype, 'fullscreenElement', {
          get: function() { return _fsElement; },
          configurable: true
        });
        Object.defineProperty(Document.prototype, 'webkitFullscreenElement', {
          get: function() { return _fsElement; },
          configurable: true
        });
        Object.defineProperty(Document.prototype, 'fullscreenEnabled', {
          get: function() { return true; },
          configurable: true
        });
        Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', {
          get: function() { return true; },
          configurable: true
        });
      } catch(e) {}

      // ── 3. Neuter WebKit Native Fullscreen on Videos (prevents iOS AVPlayer) ──
      HTMLVideoElement.prototype.webkitEnterFullscreen = function() {
        if (_fsElement) {
          exitInPageFullscreen();
        } else {
          var player = this.closest('#movie_player') || 
                       this.closest('#player') || 
                       this.closest('#player-container-id') || 
                       this.closest('.player-container') || 
                       this.closest('.player-wrapper') ||
                       this;
          enterInPageFullscreen(player);
        }
      };
      HTMLVideoElement.prototype.webkitExitFullscreen = function() {
        exitInPageFullscreen();
      };

      // ── 4. Fallback Click Interceptor on Fullscreen Toggle Buttons ──
      document.addEventListener('click', function(e) {
        var fsBtn = e.target && e.target.closest && (
          e.target.closest('.ytp-fullscreen-button') ||
          e.target.closest('button[aria-label*="full screen" i]') ||
          e.target.closest('button[aria-label*="fullscreen" i]') ||
          e.target.closest('button[data-title-no-tooltip*="full screen" i]')
        );

        if (fsBtn) {
          // Allow YouTube internal handler a moment to trigger polyfilled requestFullscreen
          setTimeout(function() {
            // If still not entered or exited, toggle manually
            if (!_fsElement) {
              var player = fsBtn.closest('#movie_player') || document.querySelector('#movie_player') || document.querySelector('video');
              enterInPageFullscreen(player);
            }
          }, 60);
        }
      }, true);

      // Expose helpers globally
      window.__enterZenTubeFullscreen = enterInPageFullscreen;
      window.__exitZenTubeFullscreen = exitInPageFullscreen;
      window.__isZenTubeFullscreen = function() { return !!_fsElement; };
    })();
    true;
  `;
}

// ─── Media Backgrounding & Picture-in-Picture Script ───────────
/**
 * Brave iOS-style MediaBackgrounding:
 * 1. Spoofs Document.prototype.visibilityState and hidden so web players never pause on minimize
 * 2. Intercepts unintended pause events when the app moves to background with multi-retry
 * 3. Provides window.__triggerZenTubePiP() to programmatically enter native iOS Picture-in-Picture
 * 4. Tracks foreground/background state to prevent WebView freezing on return
 */
export function getMediaBackgroundingScript(pipEnabled: boolean = true): string {
  return `
    (function() {
      'use strict';
      if (window.__zenTubeMediaBGInstalled) return;
      window.__zenTubeMediaBGInstalled = true;

      try {
        window.__zenTubePipEnabled = ${pipEnabled};
        window.__zenTubeIsBackground = false;

        // ── 1. Page Visibility Spoofing (Brave Shield MediaBackgrounding) ──
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
          // Block visibilitychange events from reaching listeners
          document.addEventListener('visibilitychange', function(e) {
            e.stopImmediatePropagation();
          }, true);
        } catch(e) {}

        // ── 2. Track User Pause vs Backgrounding Pause ──
        Object.defineProperty(HTMLVideoElement.prototype, 'userHitPause', {
          enumerable: false,
          configurable: true,
          writable: true,
          value: false
        });

        var origPause = HTMLVideoElement.prototype.pause;
        HTMLVideoElement.prototype.pause = function() {
          // Only mark as user pause if we're NOT in background
          if (!window.__zenTubeIsBackground) {
            this.userHitPause = true;
          }
          return origPause.apply(this, arguments);
        };

        var origPlay = HTMLVideoElement.prototype.play;
        HTMLVideoElement.prototype.play = function() {
          this.userHitPause = false;
          return origPlay.apply(this, arguments);
        };

        // ── 3. Picture-in-Picture Trigger Helper ──
        window.__triggerZenTubePiP = function() {
          try {
            var videos = document.querySelectorAll('video');
            for (var i = 0; i < videos.length; i++) {
              var v = videos[i];
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

        // ── 4. Multi-retry resume helper ──
        function tryResumeVideo(v, attempt) {
          if (!v || v.userHitPause || v.ended) return;
          if (v.paused) {
            try {
              var playPromise = origPlay.call(v);
              if (playPromise && playPromise.catch) {
                playPromise.catch(function() {
                  // If play failed and we have retries left, try again
                  if (attempt < 3) {
                    setTimeout(function() {
                      tryResumeVideo(v, attempt + 1);
                    }, 200 * (attempt + 1));
                  }
                });
              }
            } catch(e) {
              if (attempt < 3) {
                setTimeout(function() {
                  tryResumeVideo(v, attempt + 1);
                }, 200 * (attempt + 1));
              }
            }
          }
        }

        // ── 5. Attach Protection to Videos ──
        function protectVideo(v) {
          if (!v || v.__zenTubeProtected) return;
          v.__zenTubeProtected = true;

          v.setAttribute('playsinline', 'true');
          v.setAttribute('webkit-playsinline', 'true');
          v.playsInline = true;

          // Resume on unintended background pause with multi-retry
          v.addEventListener('pause', function() {
            if (!v.userHitPause && !v.ended) {
              tryResumeVideo(v, 0);
            }
          }, false);

          v.addEventListener('webkitpresentationmodechanged', function(e) {
            e.stopPropagation();
          }, true);
        }

        // ── 6. Background/Foreground detection via page lifecycle ──
        window.addEventListener('pagehide', function() {
          window.__zenTubeIsBackground = true;
          if (window.__zenTubePipEnabled) {
            window.__triggerZenTubePiP();
          }
          // Force-resume any paused videos after a short delay
          setTimeout(function() {
            var vids = document.querySelectorAll('video');
            for (var i = 0; i < vids.length; i++) {
              tryResumeVideo(vids[i], 0);
            }
          }, 100);
        });

        window.addEventListener('pageshow', function() {
          window.__zenTubeIsBackground = false;
        });

        // Also handle blur/focus at window level
        window.addEventListener('blur', function() {
          window.__zenTubeIsBackground = true;
          // Ensure videos keep playing after a moment
          setTimeout(function() {
            var vids = document.querySelectorAll('video');
            for (var i = 0; i < vids.length; i++) {
              if (!vids[i].userHitPause && !vids[i].ended && vids[i].paused) {
                tryResumeVideo(vids[i], 0);
              }
            }
          }, 150);
        });

        window.addEventListener('focus', function() {
          window.__zenTubeIsBackground = false;
        });

        // ── 7. Scan existing videos ──
        var existingVideos = document.querySelectorAll('video');
        for (var i = 0; i < existingVideos.length; i++) {
          protectVideo(existingVideos[i]);
        }

        // ── 8. Observe DOM for newly added videos ──
        if (typeof MutationObserver !== 'undefined') {
          var observer = new MutationObserver(function(mutations) {
            for (var m = 0; m < mutations.length; m++) {
              var nodes = mutations[m].addedNodes;
              for (var n = 0; n < nodes.length; n++) {
                if (nodes[n].nodeName === 'VIDEO') {
                  protectVideo(nodes[n]);
                } else if (nodes[n].querySelectorAll) {
                  var vids = nodes[n].querySelectorAll('video');
                  for (var v = 0; v < vids.length; v++) {
                    protectVideo(vids[v]);
                  }
                }
              }
            }
          });
          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
          });
        }

        // ── 9. Periodic protection + resume check (every 2s to reduce CPU) ──
        setInterval(function() {
          var allVids = document.querySelectorAll('video');
          for (var j = 0; j < allVids.length; j++) {
            protectVideo(allVids[j]);
            // If we're in background and a video got paused unintentionally, resume it
            if (window.__zenTubeIsBackground && !allVids[j].userHitPause && !allVids[j].ended && allVids[j].paused) {
              tryResumeVideo(allVids[j], 0);
            }
          }
        }, 2000);

      } catch(e) {}
    })();
    true;
  `;
}

// ─── Combined Script Builder ────────────────────────────────────
/**
 * Builds the complete injection script based on settings.
 */
export function buildInjectionScript(hideShorts: boolean, contentFilter: boolean = false, pipEnabled: boolean = true): string {
  const scripts: string[] = [
    getEnhancementScript(),
    getFullscreenInterceptorScript(),
    getMediaBackgroundingScript(pipEnabled)
  ];
  if (hideShorts) {
    scripts.push(getHideShortsScript());
  }
  if (contentFilter) {
    scripts.push(getAdFilterScript());
  }
  return scripts.join('\n');
}
