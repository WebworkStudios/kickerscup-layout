// =====================================================
// KICKERSCUP - NAVIGATION SYSTEM (ESM)
// Routing & Page Management mit ModuleManager
// Modernisiert: ES Modules, keine globalen Variablen
// =====================================================

import {
    preloadModule,
    deactivateCurrentModule,
    getModuleConfig,
    setActiveModule
} from './module-manager.js';

// Private State
let currentPage = 'dashboard';
const contentWrapper = document.getElementById('contentWrapper');
const pageCache = new Map();

// Seiten-Konfiguration
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

/**
 * Lädt HTML-Content einer Seite
 */
async function fetchPageHTML(htmlPath) {
    // Check Cache
    if (pageCache.has(htmlPath)) {
        return pageCache.get(htmlPath);
    }

    try {
        const response = await fetch(htmlPath);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${htmlPath}`);
        }

        const content = await response.text();

        // Cache für zukünftige Nutzung
        pageCache.set(htmlPath, content);

        return content;

    } catch (error) {
        console.error('Fehler beim Laden des HTML:', error);
        throw error;
    }
}

/**
 * Zeigt Loading-Indikator (ohne manuelle Style-Generation)
 */
function showLoadingIndicator() {
    contentWrapper.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Seite wird geladen...</p>
        </div>
    `;
}

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
}

/**
 * Aktualisiert die Navigation
 */
function updateNavigation(pageName) {
    const navButtons = document.querySelectorAll('.nav-btn');

    navButtons.forEach(btn => {
        const btnPage = btn.getAttribute('data-page');

        if (btnPage === pageName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Lädt eine Seite (HTML + Module)
 * FIX: HTML ZUERST einfügen, DANN Module initialisieren!
 */
async function loadPage(pageName) {
    // Validierung
    const pageConfig = pages[pageName];
    if (!pageConfig) {
        console.error(`Seite "${pageName}" nicht gefunden`);
        showErrorPage();
        return;
    }

    // Loading-Indikator
    showLoadingIndicator();

    try {
        // 1. Lade HTML-Content
        const htmlContent = await fetchPageHTML(pageConfig.html);

        // 2. Deaktiviere vorheriges Modul (cleanup)
        await deactivateCurrentModule();

        // 3. Füge HTML ins DOM ein (KRITISCH: Vor Modul-Init!)
        contentWrapper.innerHTML = htmlContent;

        // 4. Lade & Initialisiere Modul
        const moduleName = pageConfig.module;
        if (moduleName) {
            // Lade Modul (CSS + JS)
            await preloadModule(moduleName);

            // Hole Modul-Config
            const moduleConfig = getModuleConfig(moduleName);

            // Initialisiere Modul (ruft init() auf)
            if (moduleConfig?.module?.init) {
                await moduleConfig.module.init();

                // Registriere als aktives Modul
                setActiveModule(moduleName, moduleConfig);
            }
        }

        // 5. Update Navigation & State
        currentPage = pageName;
        updateNavigation(pageName);

    } catch (error) {
        console.error('Fehler beim Laden der Seite:', error);
        showErrorPage();
    }
}

/**
 * Hauptnavigation (exportiert für externe Nutzung)
 */
export function navigateTo(pageName) {
    if (pageName === currentPage) return;
    loadPage(pageName);
}

/**
 * Initialisierung beim Start
 */
function init() {
    // Navigation Event Delegation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetPage = btn.getAttribute('data-page');
            if (targetPage) {
                navigateTo(targetPage);
            }
        });
    });

    // Lade Startseite
    loadPage(currentPage);
}

// Auto-Start nach DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
