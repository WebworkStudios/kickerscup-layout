// =====================================================
// KICKERSCUP - NAVIGATION SYSTEM (FIXED)
// Routing & Page Management mit ModuleManager
// FIX: HTML ERST einfügen, DANN Module initialisieren
// =====================================================

const NavigationSystem = (() => {
    'use strict';

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
            html: 'pages/league.html',
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
            if (window.ModuleManager) {
                await window.ModuleManager.deactivateCurrentModule();
            }

            // 3. Lade Module-Ressourcen (CSS/JS) aber initialisiere NOCH NICHT
            if (window.ModuleManager && pageConfig.module) {
                await window.ModuleManager.preloadModule(pageConfig.module);
            }

            // 4. Setze HTML-Content ins DOM (KRITISCH: ERST JETZT!)
            if (contentWrapper) {
                contentWrapper.innerHTML = htmlContent;
            }

            // 5. JETZT initialisiere das Modul (HTML ist im DOM!)
            if (window.ModuleManager && pageConfig.module) {
                const config = window.ModuleManager._debug.moduleRegistry[pageConfig.module];
                if (config?.module?.init) {
                    await config.module.init();
                    console.log(`✅ Modul initialisiert: ${pageConfig.module}`);
                }
            }

            // 6. Update Navigation
            updateNavigation(pageName);

            // 7. Update State
            currentPage = pageName;

            // 8. Dispatch Event
            const event = new CustomEvent('pageLoaded', {
                detail: {page: pageName}
            });
            document.dispatchEvent(event);

            // 9. Verstecke Loading
            hideLoadingIndicator();

            console.log(`✅ Seite geladen: ${pageName}`);

        } catch (error) {
            console.error('Fehler beim Laden der Seite:', error);
            showErrorPage();
            hideLoadingIndicator();
        }
    }

    /**
     * Zeigt Loading-Indikator (optimiert)
     */
    function showLoadingIndicator() {
        if (!contentWrapper) return;

        // Verwende CSS-Klasse statt innerHTML für bessere Performance
        contentWrapper.classList.add('loading-state');
        contentWrapper.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p class="loading-text">Lädt...</p>
            </div>
        `;

        // Füge Styles hinzu (nur einmal)
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                .loading-state {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                }
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }
                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(0, 199, 139, 0.1);
                    border-top-color: var(--gold-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .loading-text {
                    color: var(--text-muted);
                    font-size: 14px;
                    margin: 0;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Versteckt Loading-Indikator
     */
    function hideLoadingIndicator() {
        if (!contentWrapper) return;
        contentWrapper.classList.remove('loading-state');
    }

    /**
     * Zeigt Error-Seite
     */
    function showErrorPage() {
        if (!contentWrapper) return;

        contentWrapper.classList.remove('loading-state');
        contentWrapper.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 72px; margin-bottom: 20px;">⚠️</div>
                <h2 style="color: var(--gold-primary); font-size: 32px; margin-bottom: 15px;">
                    Fehler beim Laden
                </h2>
                <p style="color: var(--text-muted); font-size: 16px; margin-bottom: 30px;">
                    Die Seite konnte nicht geladen werden.
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
     * Preload nächster Seite (für Performance)
     */
    function preloadNextPages() {
        // Preload wahrscheinliche nächste Seiten basierend auf aktueller Seite
        const preloadMap = {
            dashboard: ['team', 'league'],
            team: ['tactics', 'training'],
            league: ['cup'],
        };

        const pagesToPreload = preloadMap[currentPage] || [];

        pagesToPreload.forEach(pageName => {
            const pageConfig = pages[pageName];
            if (pageConfig && window.ModuleManager) {
                setTimeout(() => {
                    (async () => {
                        try {
                            await window.ModuleManager.preloadModule(pageConfig.module);
                            await fetchPageHTML(pageConfig.html);
                        } catch (error) {
                            console.warn(`Preload fehlgeschlagen für ${pageName}:`, error);
                        }
                    })();
                }, 1000);
            }
        });
    }

    /**
     * Initialisiert Navigation
     */
    function init() {
        // Event Listener für Nav-Buttons
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const pageName = btn.getAttribute('data-page');

                if (pageName && pageName !== currentPage) {
                    navigateTo(pageName);
                }
            });
        });

        // Browser Back/Forward Support
        window.addEventListener('popstate', (e) => {
            if (e.state?.page) {
                loadPage(e.state.page).catch((error) => {
                    console.error('Fehler beim Laden via Browser-Navigation:', error);
                });
            }
        });

        // Lade initiale Seite
        loadPage('dashboard').then(() => {
            // Preload wahrscheinliche nächste Seiten
            preloadNextPages();
        }).catch((error) => {
            console.error('Fehler beim Laden der initialen Seite:', error);
        });

        console.log('✅ Navigation System initialisiert');
    }

    /**
     * Navigiert zu einer Seite
     */
    function navigateTo(pageName) {
        // Verhindere redundante Navigation
        if (pageName === currentPage) {
            console.log(`Bereits auf Seite: ${pageName}`);
            return;
        }

        loadPage(pageName).then(() => {
            // Update Browser History
            if (window.history?.pushState) {
                window.history.pushState(
                    {page: pageName},
                    '',
                    `#${pageName}`
                );
            }

            // Preload nächste wahrscheinliche Seiten
            preloadNextPages();
        }).catch((error) => {
            console.error('Navigation fehlgeschlagen:', error);
        });
    }

    /**
     * Cleanup
     */
    function cleanup() {
        pageCache.clear();
    }

    // Public API
    return {
        init,
        navigateTo,
        cleanup
    };
})();

// Auto-Initialisierung
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NavigationSystem.init);
} else {
    NavigationSystem.init();
}

// Global verfügbar
window.NavigationSystem = NavigationSystem;
window.navigateTo = NavigationSystem.navigateTo;