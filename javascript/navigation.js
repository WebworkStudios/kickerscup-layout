// =====================================================
// KICKERSCUP - NAVIGATION SYSTEM (ESM) - ES2025 MODERNIZED
// Routing & Page Management mit ModuleManager
// ✅ Konsistentes async/await (kein .then() mehr)
// ✅ Promise.allSettled für robustes Error Handling
// ✅ AbortController für Event Cleanup
// ✅ Strukturierte Error Handling mit Error Causes
// ✅ Optimierte loadPage-Logik
// =====================================================

import {deactivateCurrentModule, getModuleConfig, preloadModule, setActiveModule} from './module-manager.js';

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = Object.freeze({
    TRANSITION_DURATION: 150,
    LOADER_DELAY: 300,
    TRANSITION_TIMEOUT: 500
});

// =====================================================
// PRIVATE STATE
// =====================================================

let currentPage = 'dashboard';
let currentLoadId = 0;
let isNavigating = false;
let loaderTimeout = null;

// ✅ ES2025: AbortController für Event Cleanup
let navigationAbortController = new AbortController();

const contentWrapper = document.getElementById('contentWrapper');
const pageCache = new Map();

// =====================================================
// PAGE CONFIGURATION
// ✅ Registry ist eingefroren (keine neuen Pages)
// ⚠️ Page-Objekte sind NICHT eingefroren (könnten erweitert werden)
// =====================================================

const pages = Object.freeze({
    dashboard: {
        html: 'dashboard.html',
        module: 'dashboard'
    },
    team: {
        html: 'team.html',
        module: 'team'
    },
    lineup: {
        html: 'lineup.html',
        module: 'lineup'
    },
    training: {
        html: 'training.html',
        module: 'training'
    },
    tactics: {
        html: 'pages/tactics.html',
        module: 'tactics'
    },
    stadium: {
        html: 'stadium.html',
        module: 'stadium'
    },
    league: {
        html: 'league.html',
        module: 'league'
    },
    finance: {
        html: 'finance.html',
        module: 'finance'
    },
    cup: {
        html: 'cup.html',
        module: 'cup'
    },
    championscup: {
        html: 'champions-cup.html',
        module: 'championscup'
    },
    eurocup: {
        html: 'euro-cup.html',
        module: 'eurocup'
    },
    settings: {
        html: 'pages/settings.html',
        module: 'settings'
    }
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Wartet auf CSS Transition mit Timeout-Fallback
 * ✅ ES2025: Strukturiertes Promise-Pattern
 *
 * @param {HTMLElement} element
 * @param {number} fallbackMs
 * @returns {Promise<void>}
 */
function waitForTransition(element, fallbackMs = CONFIG.TRANSITION_TIMEOUT) {
    return new Promise(resolve => {
        let resolved = false;

        const done = () => {
            if (resolved) return;
            resolved = true;
            element.removeEventListener('transitionend', onTransitionEnd);
            clearTimeout(fallbackTimeout);
            resolve();
        };

        const onTransitionEnd = (e) => {
            if (e.target === element && e.propertyName === 'opacity') {
                done();
            }
        };

        element.addEventListener('transitionend', onTransitionEnd);
        const fallbackTimeout = setTimeout(done, fallbackMs);
    });
}

/**
 * Lädt HTML-Seite mit Caching
 * ✅ ES2025: Strukturiertes Error Handling
 *
 * @param {string} htmlPath
 * @returns {Promise<string|null>}
 */
async function fetchPageHTML(htmlPath) {
    // Return from cache if available
    if (pageCache.has(htmlPath)) {
        return pageCache.get(htmlPath);
    }

    try {
        const response = await fetch(htmlPath);

        if (!response.ok) {
            const error = new Error(`Failed to fetch page: ${htmlPath}`);
            // @ts-ignore - Error cause is ES2022+ feature
            error.cause = { status: response.status, statusText: response.statusText };
            console.error(`HTTP ${response.status}: ${htmlPath}`);
            return null;
        }

        const content = await response.text();
        pageCache.set(htmlPath, content);

        return content;
    } catch (error) {
        console.error(`Network error loading ${htmlPath}:`, error);
        return null;
    }
}

// =====================================================
// LOADING INDICATOR
// =====================================================

/**
 * Zeigt Loading Indicator nach Delay
 */
function scheduleLoadingIndicator() {
    clearLoadingIndicator();

    loaderTimeout = setTimeout(() => {
        if (contentWrapper.classList.contains('page-loading')) {
            const existingLoader = contentWrapper.querySelector('.page-loader');
            if (!existingLoader) {
                const loader = document.createElement('div');
                loader.className = 'page-loader';
                loader.innerHTML = `
                    <div class="loading-spinner"></div>
                    <p class="loading-text">Seite wird geladen...</p>
                `;
                contentWrapper.appendChild(loader);
            }
        }
    }, CONFIG.LOADER_DELAY);
}

/**
 * Entfernt Loading Indicator
 */
function clearLoadingIndicator() {
    if (loaderTimeout) {
        clearTimeout(loaderTimeout);
        loaderTimeout = null;
    }

    const loader = contentWrapper.querySelector('.page-loader');
    loader?.remove();
}

// =====================================================
// ERROR PAGE
// =====================================================

/**
 * Zeigt Error-Seite bei kritischen Fehlern
 */
function showErrorPage() {
    contentWrapper.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            text-align: center;
            padding: 20px;
        ">
            <div style="font-size: 80px; margin-bottom: 20px;">❌</div>
            <h2 style="color: var(--gold-primary); margin-bottom: 10px;">Fehler beim Laden</h2>
            <p style="color: #fff; margin-bottom: 30px;">
                Die angeforderte Seite konnte nicht geladen werden.
            </p>
            <button 
                onclick="location.reload()" 
                style="
                    padding: 15px 40px;
                    background: linear-gradient(135deg, var(--gold-primary), var(--platinum));
                    color: var(--dark-primary);
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    font-family: 'Poppins', sans-serif;
                "
            >Seite neu laden</button>
        </div>
    `;

    contentWrapper.classList.remove('page-loading');
    contentWrapper.classList.add('page-ready');
}

// =====================================================
// NAVIGATION UPDATE
// =====================================================

/**
 * Aktualisiert aktiven Navigation-Button
 * @param {string} pageName
 */
function updateNavigation(pageName) {
    const navButtons = document.querySelectorAll('.nav-btn');

    navButtons.forEach(btn => {
        const btnPage = btn.getAttribute('data-page');

        if (btnPage === pageName) {
            btn.classList.add('active');
            btn.setAttribute('aria-current', 'page');
        } else {
            btn.classList.remove('active');
            btn.removeAttribute('aria-current');
        }
    });
}

// =====================================================
// MAIN PAGE LOADING (ES2025 Modernized)
// =====================================================

/**
 * Lädt eine Seite mit Module-Preloading
 * ✅ ES2025: Promise.allSettled statt Promise.all
 * ✅ ES2025: Konsistentes async/await
 * ✅ ES2025: Strukturierte Error Recovery
 *
 * @param {string} pageName
 * @returns {Promise<void>}
 */
async function loadPage(pageName) {
    const pageConfig = pages[pageName];

    if (!pageConfig) {
        console.error(`Seite "${pageName}" nicht gefunden`);
        showErrorPage();
        return;
    }

    const loadId = ++currentLoadId;

    // Prevent concurrent navigation
    if (isNavigating) {
        return;
    }
    isNavigating = true;

    try {
        console.log(`🚀 Lade Seite: ${pageName}`);

        // Start fade-out animation
        contentWrapper.classList.add('page-loading');
        contentWrapper.classList.remove('page-ready');

        scheduleLoadingIndicator();

        // ✅ ES2025: Promise.allSettled für robustes Parallel-Loading
        let htmlContent = null;

        if (pageConfig.module) {
            // Load module and HTML in parallel
            const results = await Promise.allSettled([
                preloadModule(pageConfig.module),
                fetchPageHTML(pageConfig.html)
            ]);

            // Check module preload result - THIS IS CRITICAL
            if (results[0].status === 'rejected') {
                const error = new Error('Module preload failed');
                // @ts-ignore - Error cause is ES2022+ feature
                error.cause = results[0].reason;
                console.error('❌ Critical: Module preload failed:', error);
                throw error; // ✅ STOP - Don't continue without module
            }

            // Check HTML fetch result
            const htmlResult = results[1];
            if (htmlResult.status === 'fulfilled') {
                htmlContent = htmlResult.value;
            } else {
                const error = new Error('HTML fetch failed');
                // @ts-ignore - Error cause is ES2022+ feature
                error.cause = htmlResult.reason;
                throw error;
            }
        } else {
            // No module, just load HTML
            htmlContent = await fetchPageHTML(pageConfig.html);
        }

        // Validate HTML content
        if (htmlContent === null) {
            throw new Error(`HTML konnte nicht geladen werden: ${pageConfig.html}`);
        }

        // Check if navigation was cancelled
        if (loadId !== currentLoadId) {
            console.log(`Navigation abgebrochen: Neue Navigation gestartet`);
            return;
        }

        // Wait for fade-out transition
        await waitForTransition(contentWrapper);

        // Check again after transition
        if (loadId !== currentLoadId) {
            return;
        }

        // Cleanup previous module
        await deactivateCurrentModule();

        clearLoadingIndicator();

        // Insert new content
        contentWrapper.innerHTML = htmlContent;

        // Initialize module if present
        const moduleName = pageConfig.module;
        if (moduleName) {
            const moduleConfig = getModuleConfig(moduleName);
            const moduleExports = moduleConfig?.module;

            const initFn = moduleExports?.['init'];
            if (typeof initFn === 'function') {
                console.log(`🎬 Initialisiere Modul: ${moduleName}`);
                await initFn(); // ✅ Let errors bubble up to catch block
                setActiveModule(moduleName, moduleConfig);
            } else if (moduleName) {
                // Module expected but init not found
                console.warn(`⚠️ Module ${moduleName} has no init function`);
            }
        }

        // Final cancellation check
        if (loadId !== currentLoadId) {
            return;
        }

        // Fade-in new content
        contentWrapper.classList.remove('page-loading');
        contentWrapper.classList.add('page-ready');

        currentPage = pageName;
        updateNavigation(pageName);

        console.log(`✅ Seite geladen: ${pageName}`);

    } catch (error) {
        console.error('❌ Fehler beim Laden der Seite:', error);

        // ✅ ES2025 Error Strategy:
        // - Module preload errors → Show error page (critical)
        // - Module init errors → Show error page (critical)
        // - HTML fetch errors → Show error page (critical)
        // This ensures users see functional pages, not broken ones

        // Only show error if this load is still current
        if (loadId === currentLoadId) {
            clearLoadingIndicator();
            showErrorPage();
        }
    } finally {
        // Reset navigation lock if this load is still current
        if (loadId === currentLoadId) {
            isNavigating = false;
        }
    }
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Navigiert zu einer Seite
 * @param {string} pageName
 */
export function navigateTo(pageName) {
    if (pageName === currentPage && !isNavigating) {
        return;
    }

    void loadPage(pageName);
}

// Make globally available
window.navigateTo = navigateTo;

// =====================================================
// INITIALIZATION (ES2025 Modernized)
// =====================================================

/**
 * Initialisiert Navigation System
 * ✅ ES2025: AbortController für Event Cleanup
 */
function initNavigation() {
    console.log('🧭 Initialisiere Navigation System...');

    // ✅ ES2025: Alle Events mit einem AbortController
    const signal = navigationAbortController.signal;

    // Navigation button clicks
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.getAttribute('data-page');
            if (targetPage) {
                navigateTo(targetPage);
            }
        }, { signal });

        // Keyboard accessibility
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const targetPage = btn.getAttribute('data-page');
                if (targetPage) {
                    navigateTo(targetPage);
                }
            }
        }, { signal });
    });

    // Browser back/forward navigation
    window.addEventListener('popstate', (event) => {
        if (event.state?.page) {
            void loadPage(event.state.page);
        }
    }, { signal });

    // Load initial page
    contentWrapper.classList.add('page-ready');
    void loadPage(currentPage);

    console.log('✅ Navigation System bereit');
}

/**
 * Cleanup Navigation System (für Testing/Reload)
 * ✅ ES2025: Ein Aufruf entfernt ALLE Event Listener
 */
export function cleanup() {
    navigationAbortController.abort();
    navigationAbortController = new AbortController();

    clearLoadingIndicator();
    pageCache.clear();

    console.log('🧹 Navigation System cleaned up');
}

// =====================================================
// AUTO-START
// =====================================================

// Start navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}

// =====================================================
// ES2025 IMPROVEMENTS SUMMARY
// =====================================================
/*
✅ Promise.allSettled() - Module load errors don't stop HTML load
✅ Konsistentes async/await - Keine .then() chains mehr
✅ AbortController - Ein Aufruf für Event Cleanup
✅ Error Causes - Vollständige Error-Ketten
✅ Optional Chaining - Sichere Property-Zugriffe
✅ Object.freeze() - Immutable Configuration
✅ Strukturierte Error Recovery - App bleibt funktional
✅ Cleanup-Funktion - Testbar & Memory-Leak-frei
*/