// =====================================================
// KICKERSCUP - MODULE MANAGER (ESM) - ENHANCED
// Zentrales System für Script-Loading & Lifecycle
// ✅ NEU: ChampionsCup-Modul integriert
// =====================================================

// Tracking für geladene Module
const loadedScripts = new Map();
const loadedStyles = new Map();
const activeModules = new Map();

// Module Registry mit Lifecycle-Hooks und CSS-Tracking
const moduleRegistry = {
    dashboard: {
        scripts: ['./dashboard.js'],
        css: ['css/dashboard.css', 'css/utilities.css'],
        cssElements: [],
        module: null
    },
    team: {
        scripts: ['./team.js'],
        css: ['css/team.css'],
        cssElements: [],
        module: null
    },
    lineup: {
        scripts: ['./lineup-config.js', './lineup.js'],
        css: ['css/lineup.css', 'css/lineup-375px.css'],
        cssElements: [],
        module: null
    },
    training: {
        scripts: ['./individual-training-config.js', './training.js'],
        css: ['css/training.css', 'css/training-individual.css'],
        cssElements: [],
        module: null
    },
    tactics: {
        scripts: ['./tactics.js'],
        css: ['css/tactics.css'],
        cssElements: [],
        module: null
    },
    stadium: {
        scripts: ['./stadium-config.js', './stadium.js'],
        css: ['css/stadium.css'],
        cssElements: [],
        module: null
    },
    league: {
        scripts: ['./league.js'],
        css: ['css/league.css'],
        cssElements: [],
        module: null
    },
    finance: {
        scripts: ['./finance.js'],
        css: ['css/finance.css'],
        cssElements: [],
        module: null
    },
    cup: {
        scripts: ['./cup.js'],
        css: ['css/cup.css'],
        cssElements: [],
        module: null
    },
    championscup: {
        scripts: ['./champions-cup.js'],
        css: ['css/champions-cup.css'],
        cssElements: [],
        module: null
    },
    eurocup: {
        scripts: ['./euro-cup.js'],
        css: ['css/euro-cup.css'],
        cssElements: [],
        module: null
    },
    settings: {
        scripts: ['./settings.js'],
        css: ['css/settings.css'],
        cssElements: [],
        module: null
    }
};

/**
 * Lädt ein CSS-File mit Deduplizierung und Modul-Tracking
 */
async function loadStyle(href, moduleName) {
    const cacheKey = `${href}`;

    if (loadedStyles.has(cacheKey)) {
        const existingLink = loadedStyles.get(cacheKey);
        if (existingLink && existingLink.parentNode) {
            return existingLink;
        } else {
            loadedStyles.delete(cacheKey);
        }
    }

    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.module = moduleName;
        link.dataset.cssPath = href;

        link.onload = () => {
            loadedStyles.set(cacheKey, link);
            if (moduleName && moduleRegistry[moduleName]) {
                if (!moduleRegistry[moduleName].cssElements.includes(link)) {
                    moduleRegistry[moduleName].cssElements.push(link);
                }
            }
            console.log(`✓ CSS geladen: ${href}`);
            resolve(link);
        };

        link.onerror = () => {
            console.error(`❌ CSS fehlgeschlagen: ${href}`);
            reject(new Error(`CSS failed: ${href}`));
        };

        document.head.appendChild(link);
    });
}

/**
 * Lädt ein Modul via Dynamic Import
 */
async function loadModule(src) {
    if (loadedScripts.has(src)) {
        return loadedScripts.get(src);
    }

    try {
        console.log(`⏳ Lade Modul: ${src}`);
        const module = await import(src);
        loadedScripts.set(src, module);
        console.log(`✓ Modul geladen: ${src}`);
        return module;
    } catch (error) {
        console.error(`❌ Modul fehlgeschlagen: ${src}`, error);
        throw new Error(`Module failed: ${src} - ${error.message}`);
    }
}

/**
 * Entfernt CSS-Dateien eines Moduls aus dem DOM
 */
function cleanupModuleCSS(moduleName) {
    const config = moduleRegistry[moduleName];

    if (!config || !config.cssElements || config.cssElements.length === 0) {
        return;
    }

    console.log(`🧹 CSS-Cleanup für Modul: ${moduleName}`);

    config.cssElements.forEach(linkElement => {
        if (linkElement && linkElement.parentNode) {
            const href = linkElement.dataset.cssPath || linkElement.href;
            console.log(`  ↳ Entferne: ${href}`);
            linkElement.parentNode.removeChild(linkElement);
            loadedStyles.delete(href);
        }
    });

    config.cssElements = [];
}

/**
 * Preload eines Moduls (lädt CSS/JS aber initialisiert NICHT)
 */
export async function preloadModule(moduleName) {
    const config = moduleRegistry[moduleName];
    if (!config) {
        console.warn(`⚠️ Modul nicht registriert: ${moduleName}`);
        return;
    }

    console.log(`📦 Preload Modul: ${moduleName}`);

    try {
        // Lade CSS parallel
        if (config.css?.length) {
            console.log(`  → Lade ${config.css.length} CSS-Datei(en)...`);
            await Promise.all(
                config.css.map(css => loadStyle(css, moduleName))
            );
        }

        // Lade Scripts sequentiell
        for (const script of config.scripts) {
            const module = await loadModule(script);
            if (script === config.scripts[config.scripts.length - 1]) {
                config.module = module;
            }
        }

        console.log(`✅ Preload abgeschlossen: ${moduleName}`);

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
        console.log(`⏹️  Deaktiviere Modul: ${name}`);

        // JavaScript Cleanup
        if (config.module?.cleanup) {
            try {
                await config.module.cleanup();
                console.log(`  ✓ JavaScript cleanup abgeschlossen`);
            } catch (error) {
                console.error(`  ❌ Cleanup-Fehler in ${name}:`, error);
            }
        }

        // CSS-Cleanup
        cleanupModuleCSS(name);

        activeModules.delete(name);
    }
}

/**
 * Gibt Modul-Config zurück
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

/**
 * Debug-Funktion - Zeigt alle geladenen CSS-Dateien
 */
export function debugCSS() {
    console.log('📋 Aktuell geladene CSS-Dateien:');

    const allLinks = document.querySelectorAll('link[rel="stylesheet"]');
    allLinks.forEach(link => {
        const module = link.dataset.module || 'global';
        const path = link.dataset.cssPath || link.href;
        console.log(`  [${module}] ${path}`);
    });

    console.log('\n📊 CSS-Elemente pro Modul:');
    Object.keys(moduleRegistry).forEach(moduleName => {
        const count = moduleRegistry[moduleName].cssElements.length;
        if (count > 0) {
            console.log(`  ${moduleName}: ${count} CSS-Dateien`);
        }
    });
}

// Debug-Funktion verfügbar machen
if (typeof window !== 'undefined') {
    window.debugModuleCSS = debugCSS;
}