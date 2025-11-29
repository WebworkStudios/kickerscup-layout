// =====================================================
// KICKERSCUP - MODULE MANAGER (ESM)
// Zentrales System für Script-Loading & Lifecycle
// Modernisiert: Native ES Modules, Dynamic Imports
// =====================================================

// Tracking für geladene Module
const loadedScripts = new Map();
const loadedStyles = new Map();
const activeModules = new Map();

// Module Registry mit Lifecycle-Hooks
const moduleRegistry = {
    dashboard: {
        scripts: ['./dashboard.js'],
        css: ['css/dashboard.css', 'css/utilities.css'],
        module: null
    },
    team: {
        scripts: ['./team.js'],
        css: ['css/team.css'],
        module: null
    },
    lineup: {
        scripts: ['./lineup-config.js', './lineup.js', './lineup-responsive.js'],
        css: ['css/lineup.css', 'css/lineup-375px.css'],
        module: null
    },
    training: {
        scripts: ['./training.js'],
        css: ['css/training.css'],
        module: null
    },
    tactics: {
        scripts: ['./tactics.js'],
        css: ['css/tactics.css'],
        module: null
    },
    stadium: {
        scripts: ['./stadium.js'],
        css: ['css/stadium.css'],
        module: null
    },
    league: {
        scripts: ['./league.js'],
        css: ['css/league.css'],
        module: null
    },
    cup: {
        scripts: ['./cup.js'],
        css: ['css/cup.css'],
        module: null
    },
    settings: {
        scripts: ['./settings.js'],
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
 * Lädt ein Modul via Dynamic Import
 * @param {string} src - Pfad zum ES Module
 * @returns {Promise<Object>} - Geladenes Modul-Objekt
 */
async function loadModule(src) {
    // Check Cache
    if (loadedScripts.has(src)) {
        return loadedScripts.get(src);
    }

    try {
        const module = await import(src);
        loadedScripts.set(src, module);
        return module;
    } catch (error) {
        throw new Error(`Module failed: ${src} - ${error.message}`);
    }
}

/**
 * Preload eines Moduls (lädt CSS/JS aber initialisiert NICHT)
 * WICHTIG: Navigation verwendet dies BEVOR HTML ins DOM kommt
 */
export async function preloadModule(moduleName) {
    const config = moduleRegistry[moduleName];
    if (!config) {
        console.warn(`Modul nicht registriert: ${moduleName}`);
        return;
    }

    try {
        // Lade CSS parallel
        if (config.css?.length) {
            await Promise.all(config.css.map(css => loadStyle(css)));
        }

        // Lade Scripts sequentiell (um Abhängigkeiten zu respektieren)
        // Das letzte Script im Array ist das Hauptmodul mit init/cleanup
        for (const script of config.scripts) {
            const module = await loadModule(script);
            // Speichere nur das Hauptmodul (letztes Script)
            if (script === config.scripts[config.scripts.length - 1]) {
                config.module = module;
            }
        }

    } catch (error) {
        console.error(`❌ Fehler beim Preload von ${moduleName}:`, error);
        throw error;
    }
}

/**
 * Deaktiviert das aktuell aktive Modul
 */
export async function deactivateCurrentModule() {
    for (const [name, config] of activeModules.entries()) {
        // Cleanup-Hook aufrufen
        if (config.module?.cleanup) {
            try {
                await config.module.cleanup();
            } catch (error) {
                console.error(`❌ Cleanup-Fehler in ${name}:`, error);
            }
        }

        // Module aus Tracking entfernen
        activeModules.delete(name);
    }
}

/**
 * Gibt Modul-Config zurück (für manuelle Initialisierung)
 */
export function getModuleConfig(moduleName) {
    return moduleRegistry[moduleName];
}

/**
 * Setzt das aktive Modul
 */
export function setActiveModule(moduleName, config) {
    activeModules.set(moduleName, config);
}

/**
 * Prüft ob ein Modul bereits geladen ist
 */
export function isModuleLoaded(moduleName) {
    return activeModules.has(moduleName);
}

/**
 * Gibt das aktive Modul zurück
 */
export function getActiveModule() {
    return activeModules.size > 0
        ? Array.from(activeModules.entries())[0]
        : null;
}
