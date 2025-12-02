// =====================================================
// KICKERSCUP - MODULE MANAGER (ESM) - ENHANCED
// Zentrales System für Script-Loading & Lifecycle
// ✅ NEU: Vollständiges CSS-Cleanup bei Modulwechsel
// ✅ NEU: Performance-Optimierung durch CSS-Entfernung
// ✅ NEU: Verhindert CSS-Konflikte zwischen Modulen
// ✅ NEU: Finance-Modul integriert
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
        cssElements: [],  // ← NEU: Tracking von CSS <link> Elementen
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
        scripts: ['./individual-training-config.js','./training.js'],
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
        scripts: ['./stadium.js'],
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
    settings: {
        scripts: ['./settings.js'],
        css: ['css/settings.css'],
        cssElements: [],
        module: null
    }
};

/**
 * Lädt ein CSS-File mit Deduplizierung und Modul-Tracking
 * ✅ NEU: CSS-Elemente werden dem Modul zugeordnet für späteres Cleanup
 *
 * @param {string} href - Pfad zur CSS-Datei
 * @param {string} moduleName - Name des Moduls (für Tracking)
 * @returns {Promise<HTMLLinkElement>}
 */
async function loadStyle(href, moduleName) {
    // Check Cache - aber erstelle neues Element wenn es zu anderem Modul gehört
    const cacheKey = `${href}`;

    if (loadedStyles.has(cacheKey)) {
        const existingLink = loadedStyles.get(cacheKey);

        // ✅ NEU: Prüfe ob das Element noch im DOM ist
        if (existingLink && existingLink.parentNode) {
            // Element existiert bereits und ist im DOM
            return existingLink;
        } else {
            // Element wurde entfernt, Cache-Eintrag löschen
            loadedStyles.delete(cacheKey);
        }
    }

    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;

        // ✅ NEU: Modul-Zuordnung per data-Attribut
        link.dataset.module = moduleName;
        link.dataset.cssPath = href;

        link.onload = () => {
            // Cache aktualisieren
            loadedStyles.set(cacheKey, link);

            // ✅ NEU: Zum Modul hinzufügen für späteres Cleanup
            if (moduleName && moduleRegistry[moduleName]) {
                if (!moduleRegistry[moduleName].cssElements.includes(link)) {
                    moduleRegistry[moduleName].cssElements.push(link);
                }
            }

            resolve(link);
        };

        link.onerror = () => reject(new Error(`CSS failed: ${href}`));

        document.head.appendChild(link);
    });
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
 * ✅ NEU: Entfernt CSS-Dateien eines Moduls aus dem DOM
 * Verbessert Performance und verhindert CSS-Konflikte
 *
 * @param {string} moduleName - Name des zu bereinigenden Moduls
 */
function cleanupModuleCSS(moduleName) {
    const config = moduleRegistry[moduleName];

    if (!config || !config.cssElements || config.cssElements.length === 0) {
        return;
    }

    console.log(`🧹 CSS-Cleanup für Modul: ${moduleName}`);

    // Entferne alle CSS-Elemente des Moduls
    config.cssElements.forEach(linkElement => {
        if (linkElement && linkElement.parentNode) {
            const href = linkElement.dataset.cssPath || linkElement.href;
            console.log(`  ↳ Entferne: ${href}`);

            // ✅ Aus DOM entfernen
            linkElement.parentNode.removeChild(linkElement);

            // ✅ Aus Cache entfernen
            loadedStyles.delete(href);
        }
    });

    // Array leeren
    config.cssElements = [];
}

/**
 * Preload eines Moduls (lädt CSS/JS aber initialisiert NICHT)
 * WICHTIG: Navigation verwendet dies BEVOR HTML ins DOM kommt
 * ✅ GEÄNDERT: Übergibt moduleName an loadStyle für Tracking
 */
export async function preloadModule(moduleName) {
    const config = moduleRegistry[moduleName];
    if (!config) {
        console.warn(`Modul nicht registriert: ${moduleName}`);
        return;
    }

    try {
        // Lade CSS parallel - ✅ NEU: Mit Modul-Tracking
        if (config.css?.length) {
            await Promise.all(
                config.css.map(css => loadStyle(css, moduleName))
            );
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
 * ✅ NEU: Führt vollständiges CSS-Cleanup durch
 */
export async function deactivateCurrentModule() {
    for (const [name, config] of activeModules.entries()) {
        console.log(`⏹️  Deaktiviere Modul: ${name}`);

        // 1. JavaScript Cleanup-Hook aufrufen
        if (config.module?.cleanup) {
            try {
                await config.module.cleanup();
                console.log(`  ✓ JavaScript cleanup abgeschlossen`);
            } catch (error) {
                console.error(`  ❌ Cleanup-Fehler in ${name}:`, error);
            }
        }

        // 2. ✅ NEU: CSS-Cleanup durchführen
        cleanupModuleCSS(name);

        // 3. Module aus Tracking entfernen
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

/**
 * ✅ NEU: Debug-Funktion - Zeigt alle geladenen CSS-Dateien
 * Hilfreich für Entwicklung und Debugging
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

// ✅ NEU: Globale Debug-Funktion verfügbar machen (nur Development)
if (typeof window !== 'undefined') {
    window.debugModuleCSS = debugCSS;
}