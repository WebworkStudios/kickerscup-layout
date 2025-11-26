// =====================================================
// KICKERSCUP - NAVIGATION SYSTEM
// Routing & Page Management
// =====================================================

const NavigationSystem = (() => {
    // Private variables
    let currentPage = 'dashboard';
    const contentWrapper = document.getElementById('contentWrapper');
    
    // Cache für geladene Seiten
    const pageCache = new Map();
    
    // Seiten-Konfiguration mit zugehörigen Scripts
    const pages = {
        dashboard: {
            html: 'pages/dashboard.html',
            scripts: ['javascript/dashboard.js'],
            css: ['css/dashboard.css']
        },
        team: {
            html: 'team.html',
            scripts: ['javascript/team.js'],
            css: ['css/team.css']
        },
        training: {
            html: 'pages/training.html',
            scripts: ['javascript/training.js'],
            css: ['css/training.css']
        },
        tactics: {
            html: 'pages/tactics.html',
            scripts: ['javascript/tactics.js'],
            css: ['css/tactics.css']
        },
        stadium: {
            html: 'pages/stadium.html',
            scripts: ['javascript/stadium.js'],
            css: ['css/stadium.css']
        },
        league: {
            html: 'pages/league.html',
            scripts: ['javascript/league.js'],
            css: ['css/league.css']
        },
        cup: {
            html: 'pages/cup.html',
            scripts: ['javascript/cup.js'],
            css: ['css/cup.css']
        },
        settings: {
            html: 'pages/settings.html',
            scripts: ['javascript/settings.js'],
            css: ['css/settings.css']
        }
    };
    
    // Geladene Scripts und CSS tracken
    const loadedScripts = new Set();
    const loadedStyles = new Set();

    /**
     * Lädt ein JavaScript-File dynamisch
     * @param {string} src - Script-Pfad
     * @returns {Promise} - Resolve wenn Script geladen
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Prüfe ob Script bereits geladen
            if (loadedScripts.has(src)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loadedScripts.add(src);
                console.log(`✅ Script geladen: ${src}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`❌ Fehler beim Laden: ${src}`);
                reject(new Error(`Script konnte nicht geladen werden: ${src}`));
            };
            document.body.appendChild(script);
        });
    }

    /**
     * Lädt ein CSS-File dynamisch
     * @param {string} href - CSS-Pfad
     * @returns {Promise} - Resolve wenn CSS geladen
     */
    function loadStyle(href) {
        return new Promise((resolve, reject) => {
            // Prüfe ob CSS bereits geladen
            if (loadedStyles.has(href)) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => {
                loadedStyles.add(href);
                console.log(`✅ CSS geladen: ${href}`);
                resolve();
            };
            link.onerror = () => {
                console.error(`❌ Fehler beim Laden: ${href}`);
                reject(new Error(`CSS konnte nicht geladen werden: ${href}`));
            };
            document.head.appendChild(link);
        });
    }

    /**
     * Lädt eine Seite via AJAX
     * @param {string} pageName - Name der zu ladenden Seite
     */
    async function loadPage(pageName) {
        // Prüfe ob Seite existiert
        if (!pages[pageName]) {
            console.error(`Seite "${pageName}" nicht gefunden`);
            showErrorPage();
            return;
        }

        try {
            // Zeige Loading-Indikator
            showLoadingIndicator();

            const pageConfig = pages[pageName];
            const htmlPath = pageConfig.html || pageConfig;

            // Lade CSS falls vorhanden
            if (pageConfig.css && Array.isArray(pageConfig.css)) {
                await Promise.all(pageConfig.css.map(css => loadStyle(css)));
            }

            // Prüfe Cache
            let content;
            if (pageCache.has(pageName)) {
                content = pageCache.get(pageName);
            } else {
                // Lade Seite vom Server
                const response = await fetch(htmlPath);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                content = await response.text();
            }

            // WICHTIG: Erst Content clearen, dann neu setzen
            contentWrapper.innerHTML = '';
            
            // Kleine Verzögerung für sauberen Übergang
            setTimeout(async () => {
                contentWrapper.innerHTML = content;
                
                // Lade Scripts falls vorhanden
                if (pageConfig.scripts && Array.isArray(pageConfig.scripts)) {
                    await Promise.all(pageConfig.scripts.map(script => loadScript(script)));
                }
                
                // Update Navigation
                updateNavigation(pageName);
                
                // Update currentPage
                currentPage = pageName;

                // Trigger custom event für Page-Load
                const event = new CustomEvent('pageLoaded', { 
                    detail: { page: pageName } 
                });
                document.dispatchEvent(event);

                // Verstecke Loading-Indikator
                hideLoadingIndicator();
            }, 50);

        } catch (error) {
            console.error('Fehler beim Laden der Seite:', error);
            showErrorPage();
            hideLoadingIndicator();
        }
    }

    /**
     * Zeigt Loading-Indikator
     */
    function showLoadingIndicator() {
        contentWrapper.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                flex-direction: column;
                gap: 20px;
            ">
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(0, 199, 139, 0.1);
                    border-top-color: var(--gold-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
                <p style="color: var(--text-muted); font-size: 14px;">Lädt...</p>
            </div>
        `;
        
        // CSS für Spin-Animation (falls nicht vorhanden)
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = `
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
        // Wird automatisch durch loadPage ersetzt
    }

    /**
     * Zeigt Error-Seite
     */
    function showErrorPage() {
        contentWrapper.innerHTML = `
            <div style="
                text-align: center;
                padding: 60px 20px;
            ">
                <div style="font-size: 72px; margin-bottom: 20px;">⚠️</div>
                <h2 style="
                    color: var(--gold-primary);
                    font-size: 32px;
                    margin-bottom: 15px;
                ">Fehler beim Laden</h2>
                <p style="
                    color: var(--text-muted);
                    font-size: 16px;
                    margin-bottom: 30px;
                ">Die Seite konnte nicht geladen werden.</p>
                <button 
                    onclick="location.reload()" 
                    class="btn btn-primary"
                    style="
                        padding: 15px 40px;
                        background: linear-gradient(135deg, var(--gold-primary), var(--platinum));
                        color: var(--dark-primary);
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                    "
                >Seite neu laden</button>
            </div>
        `;
    }

    /**
     * Aktualisiert die Navigation
     * @param {string} pageName - Aktive Seite
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
     * Initialisiert die Navigation
     */
    function init() {
        // Event Listener für alle Nav-Buttons
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const pageName = btn.getAttribute('data-page');
                if (pageName) {
                    loadPage(pageName);
                }
            });
        });

        // Lade initiale Seite (Dashboard)
        loadPage('dashboard');

        // Browser Back/Forward Button Support (optional)
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                loadPage(e.state.page);
            }
        });

        console.log('✅ Navigation System initialisiert');
    }

    /**
     * Navigiert zu einer spezifischen Seite (Public API)
     * @param {string} pageName - Name der Seite
     */
    function navigateTo(pageName) {
        loadPage(pageName);
        
        // Update Browser History (optional)
        if (window.history && window.history.pushState) {
            window.history.pushState(
                { page: pageName }, 
                '', 
                `#${pageName}`
            );
        }
    }

    /**
     * Gibt die aktuelle Seite zurück
     * @returns {string} Current page name
     */
    function getCurrentPage() {
        return currentPage;
    }

    // Public API
    return {
        init,
        navigateTo,
        getCurrentPage
    };
})();

// Auto-Initialisierung wenn DOM ready ist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NavigationSystem.init);
} else {
    NavigationSystem.init();
}

// Global verfügbar machen für inline onclick (optional)
window.navigateTo = NavigationSystem.navigateTo;
window.showPage = NavigationSystem.navigateTo;