// =====================================================
// KICKERSCUP - MODULE MANAGER
// Zentrales System für Script-Loading & Lifecycle
// =====================================================

const ModuleManager = (() => {
    // Tracking für geladene Module
    const loadedScripts = new Map();
    const loadedStyles = new Map();
    const activeModules = new Map();

    // Module Registry mit Lifecycle-Hooks
    const moduleRegistry = {
        dashboard: {
            scripts: ['javascript/dashboard.js'],
            css: ['css/dashboard.css'],
            module: null // Wird beim Laden gesetzt
        },
        team: {
            scripts: ['javascript/team.js'],
            css: ['css/team.css'],
            module: null
        },
        training: {
            scripts: ['javascript/training.js'],
            css: ['css/training.css'],
            module: null
        },
        tactics: {
            scripts: ['javascript/tactics.js'],
            css: ['css/tactics.css'],
            module: null
        },
        stadium: {
            scripts: ['javascript/stadium.js'],
            css: ['css/stadium.css'],
            module: null
        },
        league: {
            scripts: ['javascript/league.js'],
            css: ['css/league.css'],
            module: null
        },
        cup: {
            scripts: ['javascript/cup.js'],
            css: ['css/cup.css'],
            module: null
        },
        settings: {
            scripts: ['javascript/settings.js'],
            css: ['css/settings.css'],
            module: null
        }
    };

    /**
     * Lädt ein CSS-File mit Deduplizierung
     */
    async function loadStyle(href) {
        // Check Cache
        if (loadedStyles.has(href)) {
            return loadedStyles.get(href);
        }

        const promise = new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve(link);
            link.onerror = () => reject(new Error(`CSS failed: ${href}`));
            document.head.appendChild(link);
        });

        loadedStyles.set(href, promise);
        return promise;
    }

    /**
     * Lädt ein Script mit Deduplizierung und gibt Module zurück
     */
    async function loadScript(src) {
        // Check Cache
        if (loadedScripts.has(src)) {
            return loadedScripts.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;

            // Module wird über window.__KICKERSCUP_MODULE__ exposed
            script.onload = () => {
                const module = window.__KICKERSCUP_MODULE__;
                window.__KICKERSCUP_MODULE__ = null; // Cleanup
                resolve(module);
            };

            script.onerror = () => reject(new Error(`Script failed: ${src}`));
            document.body.appendChild(script);
        });

        loadedScripts.set(src, promise);
        return promise;
    }

    /**
     * Aktiviert ein Modul (lädt Dependencies und initialisiert)
     */
    async function activateModule(moduleName) {
        const config = moduleRegistry[moduleName];
        if (!config) {
            throw new Error(`Modul nicht registriert: ${moduleName}`);
        }

        // Deaktiviere vorheriges Modul
        await deactivateCurrentModule();

        try {
            // Lade CSS parallel
            if (config.css?.length) {
                await Promise.all(config.css.map(css => loadStyle(css)));
            }

            // Lade Scripts sequentiell (um Abhängigkeiten zu respektieren)
            for (const script of config.scripts) {
                const module = await loadScript(script);
                if (module) {
                    config.module = module;
                }
            }

            // Initialisiere Modul
            if (config.module?.init) {
                await config.module.init();
            }

            // Merke aktives Modul
            activeModules.set(moduleName, config);

            console.log(`✅ Modul aktiviert: ${moduleName}`);

            return config.module;

        } catch (error) {
            console.error(`❌ Fehler beim Aktivieren von ${moduleName}:`, error);
            throw error;
        }
    }

    /**
     * Deaktiviert das aktuell aktive Modul
     */
    async function deactivateCurrentModule() {
        for (const [name, config] of activeModules.entries()) {
            // Cleanup-Hook aufrufen
            if (config.module?.cleanup) {
                try {
                    await config.module.cleanup();
                    console.log(`🧹 Cleanup durchgeführt: ${name}`);
                } catch (error) {
                    console.error(`❌ Cleanup-Fehler in ${name}:`, error);
                }
            }

            // Module aus Tracking entfernen
            activeModules.delete(name);
        }
    }

    /**
     * Prüft ob ein Modul bereits geladen ist
     */
    function isModuleLoaded(moduleName) {
        return activeModules.has(moduleName);
    }

    /**
     * Gibt das aktive Modul zurück
     */
    function getActiveModule() {
        return activeModules.size > 0
            ? Array.from(activeModules.entries())[0]
            : null;
    }

    /**
     * Preload eines Moduls (ohne Aktivierung)
     */
    async function preloadModule(moduleName) {
        const config = moduleRegistry[moduleName];
        if (!config) return;

        // Lade nur CSS und Scripts, aber initialisiere nicht
        const promises = [
            ...(config.css?.map(css => loadStyle(css)) || []),
            ...(config.scripts?.map(script => loadScript(script)) || [])
        ];

        await Promise.all(promises);
        console.log(`📦 Modul vorgeladen: ${moduleName}`);
    }

    // Public API
    return {
        activateModule,
        deactivateCurrentModule,
        isModuleLoaded,
        getActiveModule,
        preloadModule,

        // Für Debugging
        _debug: {
            loadedScripts,
            loadedStyles,
            activeModules,
            moduleRegistry
        }
    };
})();

// Global verfügbar machen
window.ModuleManager = ModuleManager;