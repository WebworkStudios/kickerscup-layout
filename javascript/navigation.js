// =====================================================
// KICKERSCUP - NAVIGATION SYSTEM (ESM)
// Routing & Page Management mit ModuleManager
// ✅ ChampionsCup integriert
// =====================================================

import {deactivateCurrentModule, getModuleConfig, preloadModule, setActiveModule} from './module-manager.js';

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = {
    TRANSITION_DURATION: 150,
    LOADER_DELAY: 300,
    TRANSITION_TIMEOUT: 500
};

// =====================================================
// PRIVATE STATE
// =====================================================

let currentPage = 'dashboard';
let currentLoadId = 0;
let isNavigating = false;
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
    settings: {
        html: 'pages/settings.html',
        module: 'settings'
    }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

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

async function loadPage(pageName) {
    const pageConfig = pages[pageName];
    if (!pageConfig) {
        console.error(`Seite "${pageName}" nicht gefunden`);
        showErrorPage();
        return;
    }

    const loadId = ++currentLoadId;

    if (isNavigating) {
        return;
    }
    isNavigating = true;

    try {
        console.log(`🚀 Lade Seite: ${pageName}`);

        // Fade-Out starten
        contentWrapper.classList.add('page-loading');
        contentWrapper.classList.remove('page-ready');

        scheduleLoadingIndicator();

        // Parallel laden: CSS/JS + HTML
        let htmlContent = null;

        if (pageConfig.module) {
            const results = await Promise.allSettled([
                preloadModule(pageConfig.module),
                fetchPageHTML(pageConfig.html)
            ]);

            const htmlResult = results[1];
            if (htmlResult.status === 'fulfilled') {
                htmlContent = htmlResult.value;
            }
        } else {
            htmlContent = await fetchPageHTML(pageConfig.html);
        }

        if (htmlContent === null) {
            throw new Error(`HTML konnte nicht geladen werden: ${pageConfig.html}`);
        }

        if (loadId !== currentLoadId) {
            console.log(`Navigation abgebrochen: Neue Navigation gestartet`);
            return;
        }

        await waitForTransition(contentWrapper);

        if (loadId !== currentLoadId) {
            return;
        }

        await deactivateCurrentModule();

        clearLoadingIndicator();

        contentWrapper.innerHTML = htmlContent;

        // Modul initialisieren
        const moduleName = pageConfig.module;
        if (moduleName) {
            const moduleConfig = getModuleConfig(moduleName);
            const moduleExports = moduleConfig?.module;

            const initFn = moduleExports?.['init'];
            if (typeof initFn === 'function') {
                console.log(`🎬 Initialisiere Modul: ${moduleName}`);
                await initFn();
                setActiveModule(moduleName, moduleConfig);
            }
        }

        if (loadId !== currentLoadId) {
            return;
        }

        contentWrapper.classList.remove('page-loading');
        contentWrapper.classList.add('page-ready');

        currentPage = pageName;
        updateNavigation(pageName);

        console.log(`✅ Seite geladen: ${pageName}`);

    } catch (error) {
        console.error('❌ Fehler beim Laden der Seite:', error);

        if (loadId === currentLoadId) {
            clearLoadingIndicator();
            showErrorPage();
        }
    } finally {
        if (loadId === currentLoadId) {
            isNavigating = false;
        }
    }
}

// =====================================================
// PUBLIC API
// =====================================================

export function navigateTo(pageName) {
    if (pageName === currentPage && !isNavigating) {
        return;
    }

    void loadPage(pageName);
}

// Global verfügbar machen
window.navigateTo = navigateTo;

// =====================================================
// INITIALIZATION
// =====================================================

function initNavigation() {
    console.log('🧭 Initialisiere Navigation System...');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.getAttribute('data-page');
            if (targetPage) {
                navigateTo(targetPage);
            }
        });

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

    window.addEventListener('popstate', (event) => {
        if (event.state?.page) {
            void loadPage(event.state.page);
        }
    });

    contentWrapper.classList.add('page-ready');
    void loadPage(currentPage);

    console.log('✅ Navigation System bereit');
}

// Auto-Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}