// =====================================================
// KICKERSCUP - NAVIGATION SYSTEM (ESM)
// Routing & Page Management mit ModuleManager
// ✅ FIX: Flicker-Free Page Transitions
// ✅ FIX: Race-Condition-Schutz bei schnellem Klicken
// ✅ FIX: transitionend statt hardcoded Timeout
// =====================================================

import {deactivateCurrentModule, getModuleConfig, preloadModule, setActiveModule} from './module-manager.js';

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = {
    TRANSITION_DURATION: 150,      // ms - muss mit CSS übereinstimmen
    LOADER_DELAY: 300,             // ms - Loader erst nach dieser Zeit zeigen
    TRANSITION_TIMEOUT: 500        // ms - Fallback falls transitionend nicht feuert
};

// =====================================================
// PRIVATE STATE
// =====================================================

let currentPage = 'dashboard';
let currentLoadId = 0;            // Race-Condition-Schutz
let isNavigating = false;         // Verhindert Doppelklicks
let loaderTimeout = null;

const contentWrapper = document.getElementById('contentWrapper');
const pageCache = new Map();

// =====================================================
// PAGE CONFIGURATION
// =====================================================

const pages = {
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
        html: 'pages/stadium.html',
        module: 'stadium'
    },
    league: {
        html: 'league.html',
        module: 'league'
    },
    cup: {
        html: 'pages/cup.html',
        module: 'cup'
    },
    settings: {
        html: 'pages/settings.html',
        module: 'settings'
    }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Wartet auf das Ende der CSS-Transition mit Fallback-Timeout
 * @param {HTMLElement} element - Element mit Transition
 * @param {number} fallbackMs - Fallback-Timeout in ms
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
            // Nur auf opacity-Transition des Elements selbst reagieren
            if (e.target === element && e.propertyName === 'opacity') {
                done();
            }
        };

        element.addEventListener('transitionend', onTransitionEnd);

        // Fallback falls transitionend nicht feuert (z.B. bei display:none)
        const fallbackTimeout = setTimeout(done, fallbackMs);
    });
}

/**
 * Lädt HTML-Content einer Seite mit Caching
 * @param {string} htmlPath - Pfad zur HTML-Datei
 * @returns {Promise<string|null>} HTML-Content oder null bei Fehler
 */
async function fetchPageHTML(htmlPath) {
    if (pageCache.has(htmlPath)) {
        return pageCache.get(htmlPath);
    }

    const response = await fetch(htmlPath);

    if (!response.ok) {
        console.error(`HTTP ${response.status}: ${htmlPath}`);
        return null;
    }

    const content = await response.text();
    pageCache.set(htmlPath, content);

    return content;
}

// =====================================================
// LOADING INDICATOR
// =====================================================

/**
 * Zeigt Loading-Indikator nach Verzögerung (vermeidet Flicker bei schnellen Loads)
 */
function scheduleLoadingIndicator() {
    clearLoadingIndicator();

    loaderTimeout = setTimeout(() => {
        // Nur anzeigen wenn noch im Loading-State
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
 * Entfernt Loading-Indikator und cleared Timeout
 */
function clearLoadingIndicator() {
    if (loaderTimeout) {
        clearTimeout(loaderTimeout);
        loaderTimeout = null;
    }

    const loader = contentWrapper.querySelector('.page-loader');
    if (loader) {
        loader.remove();
    }
}

// =====================================================
// ERROR PAGE
// =====================================================

/**
 * Zeigt Fehlerseite
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

    // Seite sichtbar machen
    contentWrapper.classList.remove('page-loading');
    contentWrapper.classList.add('page-ready');
}

// =====================================================
// NAVIGATION UPDATE
// =====================================================

/**
 * Aktualisiert die aktive Navigation
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
// MAIN PAGE LOADING
// =====================================================

/**
 * Lädt eine Seite mit Flicker-Free Transition
 *
 * Ablauf:
 * 1. Fade-Out starten (opacity → 0)
 * 2. Parallel: HTML + CSS/JS laden
 * 3. Warten auf Fade-Out Ende
 * 4. Altes Modul deaktivieren
 * 5. Neues HTML einfügen (unsichtbar)
 * 6. Neues Modul initialisieren
 * 7. Fade-In starten (opacity → 1)
 */
async function loadPage(pageName) {
    // Validierung
    const pageConfig = pages[pageName];
    if (!pageConfig) {
        console.error(`Seite "${pageName}" nicht gefunden`);
        showErrorPage();
        return;
    }

    // Race-Condition-Schutz: Neue Load-ID vergeben
    const loadId = ++currentLoadId;

    // Verhindere Doppelklicks während Navigation
    if (isNavigating) {
        return;
    }
    isNavigating = true;

    try {
        // 1. Fade-Out starten
        contentWrapper.classList.add('page-loading');
        contentWrapper.classList.remove('page-ready');

        // Loading-Indikator nach Verzögerung einplanen
        scheduleLoadingIndicator();

        // 2. Parallel laden: CSS/JS + HTML gleichzeitig
        let htmlContent = null;

        if (pageConfig.module) {
            // Beide parallel starten, auf beide warten
            const results = await Promise.allSettled([
                preloadModule(pageConfig.module),
                fetchPageHTML(pageConfig.html)
            ]);

            // HTML-Ergebnis extrahieren
            const htmlResult = results[1];
            if (htmlResult.status === 'fulfilled') {
                htmlContent = htmlResult.value;
            }
        } else {
            // Nur HTML laden
            htmlContent = await fetchPageHTML(pageConfig.html);
        }

        // Fehler beim HTML-Laden
        if (htmlContent === null) {
            throw new Error(`HTML konnte nicht geladen werden: ${pageConfig.html}`);
        }

        // Race-Condition-Check: Wurde inzwischen eine andere Seite angefordert?
        if (loadId !== currentLoadId) {
            console.log(`Navigation abgebrochen: Neue Navigation gestartet`);
            return;
        }

        // 3. Warten auf Fade-Out Ende (CSS transition)
        await waitForTransition(contentWrapper);

        // Nochmal Race-Condition-Check nach Transition
        if (loadId !== currentLoadId) {
            return;
        }

        // 4. Altes Modul deaktivieren (cleanup)
        await deactivateCurrentModule();

        // 5. Loading-Indikator entfernen
        clearLoadingIndicator();

        // 6. Neues HTML einfügen (noch unsichtbar wegen opacity: 0)
        contentWrapper.innerHTML = htmlContent;

        // 7. Neues Modul initialisieren
        const moduleName = pageConfig.module;
        if (moduleName) {
            const moduleConfig = getModuleConfig(moduleName);
            const moduleExports = moduleConfig?.module;

            // Bracket-Notation für dynamischen Zugriff (vermeidet Linter-Warnung)
            const initFn = moduleExports?.['init'];
            if (typeof initFn === 'function') {
                await initFn();
                setActiveModule(moduleName, moduleConfig);
            }
        }

        // Letzter Race-Condition-Check vor Anzeige
        if (loadId !== currentLoadId) {
            return;
        }

        // 8. Fade-In starten
        contentWrapper.classList.remove('page-loading');
        contentWrapper.classList.add('page-ready');

        // 9. State aktualisieren
        currentPage = pageName;
        updateNavigation(pageName);

    } catch (error) {
        console.error('Fehler beim Laden der Seite:', error);

        // Nur Fehler anzeigen wenn dies noch die aktuelle Navigation ist
        if (loadId === currentLoadId) {
            clearLoadingIndicator();
            showErrorPage();
        }
    } finally {
        // Navigation wieder freigeben (nur wenn dies die aktuelle Navigation war)
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
 * @param {string} pageName - Name der Zielseite
 */
export function navigateTo(pageName) {
    // Gleiche Seite: Nichts tun
    if (pageName === currentPage && !isNavigating) {
        return;
    }

    void loadPage(pageName);
}

// =====================================================
// INITIALIZATION
// =====================================================

/**
 * Initialisiert das Navigation System
 */
function initNavigation() {
    // Navigation Event Delegation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.getAttribute('data-page');
            if (targetPage) {
                navigateTo(targetPage);
            }
        });

        // Keyboard Support
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const targetPage = btn.getAttribute('data-page');
                if (targetPage) {
                    navigateTo(targetPage);
                }
            }
        });
    });

    // Browser Back/Forward Support (falls History API genutzt wird)
    window.addEventListener('popstate', (event) => {
        if (event.state?.page) {
            void loadPage(event.state.page);
        }
    });

    // Initiales Laden - Content-Wrapper startet sichtbar
    contentWrapper.classList.add('page-ready');
    void loadPage(currentPage);
}

// Auto-Start nach DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}