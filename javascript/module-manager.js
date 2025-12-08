// =====================================================
// KICKERSCUP - MODULE MANAGER (ESM) - ES2025 MODERNIZED
// Zentrales System für Script-Loading & Lifecycle
// ✅ Promise.allSettled für robustes Error Handling
// ✅ Strukturierte Error Recovery mit Error Causes
// ✅ Optimierte Map-Operationen
// ✅ Immutable Data Structures mit Object.freeze
// =====================================================

// =====================================================
// TRACKING MAPS
// =====================================================

const loadedScripts = new Map();
const loadedStyles = new Map();
const activeModules = new Map();

// =====================================================
// MODULE REGISTRY
// ✅ Registry ist eingefroren (keine neuen Module)
// ✅ Arrays (scripts/css) sind eingefroren (keine Mutation)
// ⚠️ Config-Objekte sind NICHT eingefroren (module/cssElements werden zur Laufzeit gesetzt)
// =====================================================

const moduleRegistry = Object.freeze({
    dashboard: {
        scripts: Object.freeze(['./dashboard.js']),
        css: Object.freeze(['css/dashboard.css', 'css/utilities.css']),
        cssElements: [],
        module: null
    },
    team: {
        scripts: Object.freeze(['./team.js']),
        css: Object.freeze(['css/team.css']),
        cssElements: [],
        module: null
    },
    lineup: {
        scripts: Object.freeze(['./lineup-config.js', './lineup.js']),
        css: Object.freeze(['css/lineup.css', 'css/lineup-375px.css']),
        cssElements: [],
        module: null
    },
    training: {
        scripts: Object.freeze(['./individual-training-config.js', './training.js']),
        css: Object.freeze(['css/training.css', 'css/training-individual.css']),
        cssElements: [],
        module: null
    },
    tactics: {
        scripts: Object.freeze(['./tactics.js']),
        css: Object.freeze(['css/tactics.css']),
        cssElements: [],
        module: null
    },
    stadium: {
        scripts: Object.freeze(['./stadium-config.js', './stadium-sponsors.js', './stadium-sponsors-ui.js', './stadium.js']),
        css: Object.freeze(['css/stadium.css', 'css/stadium-sponsors.css', 'css/stadium-modals.css', 'css/stadium-css-additions.css']),
        cssElements: [],
        module: null
    },
    league: {
        scripts: Object.freeze(['./league.js']),
        css: Object.freeze(['css/league.css']),
        cssElements: [],
        module: null
    },
    finance: {
        scripts: Object.freeze(['./finance.js']),
        css: Object.freeze(['css/finance.css']),
        cssElements: [],
        module: null
    },
    cup: {
        scripts: Object.freeze(['./cup.js']),
        css: Object.freeze(['css/cup.css']),
        cssElements: [],
        module: null
    },
    championscup: {
        scripts: Object.freeze(['./champions-cup.js']),
        css: Object.freeze(['css/champions-cup.css']),
        cssElements: [],
        module: null
    },
    eurocup: {
        scripts: Object.freeze(['./euro-cup.js']),
        css: Object.freeze(['css/euro-cup.css']),
        cssElements: [],
        module: null
    },
    settings: {
        scripts: Object.freeze(['./settings.js']),
        css: Object.freeze(['css/settings.css']),
        cssElements: [],
        module: null
    }
});

// =====================================================
// CSS LOADING (ES2025 Modernized)
// =====================================================

/**
 * Lädt ein CSS-File mit Deduplizierung und Modul-Tracking
 * ✅ ES2025: Strukturiertes Error Handling mit Error Causes
 *
 * @param {string} href - CSS-Datei Pfad
 * @param {string} moduleName - Modul-Name für Tracking
 * @returns {Promise<HTMLLinkElement>}
 */
async function loadStyle(href, moduleName) {
    const cacheKey = href;

    // Check existing cached link
    if (loadedStyles.has(cacheKey)) {
        const existingLink = loadedStyles.get(cacheKey);
        if (existingLink?.parentNode) {
            return existingLink;
        }
        // Remove stale cache entry
        loadedStyles.delete(cacheKey);
    }

    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.module = moduleName;
        link.dataset.cssPath = href;

        link.onload = () => {
            loadedStyles.set(cacheKey, link);

            // Track CSS element for cleanup
            const config = moduleRegistry[moduleName];
            if (config && !config.cssElements.includes(link)) {
                config.cssElements.push(link);
            }

            console.log(`✓ CSS geladen: ${href}`);
            resolve(link);
        };

        link.onerror = () => {
            const error = new Error(`CSS load failed: ${href}`);
            // @ts-ignore - Error cause is ES2022+ feature
            error.cause = {href, moduleName};
            console.error(`❌ CSS fehlgeschlagen: ${href}`);
            reject(error);
        };

        document.head.appendChild(link);
    });
}

// =====================================================
// SCRIPT LOADING (ES2025 Modernized)
// =====================================================

/**
 * Lädt ein Modul via Dynamic Import mit Caching
 * ✅ ES2025: Verbesserte Cache-Logik
 * ✅ ES2025: Error mit cause chain
 *
 * @param {string} src - Script-Pfad
 * @returns {Promise<Module>}
 */
async function loadModule(src) {
    // Return cached module if exists
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
        const wrappedError = new Error(`Module load failed: ${src}`);
        // @ts-ignore - Error cause is ES2022+ feature
        wrappedError.cause = error;
        console.error(`❌ Modul fehlgeschlagen: ${src}`, error);
        throw wrappedError;
    }
}

// =====================================================
// CSS CLEANUP
// =====================================================

/**
 * Entfernt CSS-Dateien eines Moduls aus dem DOM
 * ✅ ES2025: Optional Chaining für sichere Property-Zugriffe
 *
 * @param {string} moduleName
 */
function cleanupModuleCSS(moduleName) {
    const config = moduleRegistry[moduleName];

    if (!config?.cssElements?.length) {
        return;
    }

    console.log(`🧹 CSS-Cleanup für Modul: ${moduleName}`);

    config.cssElements.forEach(linkElement => {
        if (linkElement?.parentNode) {
            const href = linkElement.dataset.cssPath ?? linkElement.href;
            console.log(`  ↳ Entferne: ${href}`);
            linkElement.parentNode.removeChild(linkElement);
            loadedStyles.delete(href);
        }
    });

    // Clear array
    config.cssElements.length = 0;
}

// =====================================================
// MODULE PRELOADING (ES2025 Modernized)
// =====================================================

/**
 * Preload eines Moduls (lädt CSS/JS aber initialisiert NICHT)
 * ✅ ES2025: Promise.allSettled für robustes Error Handling
 * ✅ ES2025: Detaillierte Error Recovery
 *
 * @param {string} moduleName
 * @returns {Promise<void>}
 */
export async function preloadModule(moduleName) {
    const config = moduleRegistry[moduleName];

    if (!config) {
        console.warn(`⚠️ Modul nicht registriert: ${moduleName}`);
        return;
    }

    console.log(`📦 Preload Modul: ${moduleName}`);

    try {
        // ✅ ES2025: Promise.allSettled statt Promise.all
        // Vorteil: Einzelne CSS-Fehler stoppen nicht gesamten Load-Prozess
        if (config.css?.length) {
            console.log(`  → Lade ${config.css.length} CSS-Datei(en)...`);

            const cssResults = await Promise.allSettled(
                config.css.map(css => loadStyle(css, moduleName))
            );

            // Check for failures (manual loop for TypeScript compatibility)
            let failedCount = 0;
            let successCount = 0;

            for (const result of cssResults) {
                if (result.status === 'rejected') {
                    failedCount++;
                    // @ts-ignore - TypeScript doesn't narrow PromiseSettledResult properly
                    const href = result.reason?.cause?.href ?? 'Unknown';
                    console.error('  ↳ CSS Fehler:', href);
                } else {
                    successCount++;
                }
            }

            if (failedCount > 0) {
                console.warn(`⚠️ ${failedCount} von ${config.css.length} CSS-Dateien fehlgeschlagen`);
                // Continue despite CSS failures (non-blocking)
                // Critical CSS failures could be handled here if needed
            }

            console.log(`  ✓ ${successCount} CSS-Dateien erfolgreich geladen`);
        }

        // Load scripts sequentially (preserve execution order)
        for (const script of config.scripts) {
            const module = await loadModule(script);

            // Store main module reference (last script)
            if (script === config.scripts[config.scripts.length - 1]) {
                config.module = module;
            }
        }

        console.log(`✅ Preload abgeschlossen: ${moduleName}`);

    } catch (error) {
        // ✅ ES2025: Structured error with context
        const contextError = new Error(`Module preload failed: ${moduleName}`);
        // @ts-ignore - Error cause is ES2022+ feature
        contextError.cause = error;
        console.error(`❌ Fehler beim Preload von ${moduleName}:`, error);
        throw contextError;
    }
}

// =====================================================
// MODULE LIFECYCLE
// =====================================================

/**
 * Deaktiviert das aktuell aktive Modul
 * ✅ ES2025: Bessere Error Isolation
 *
 * @returns {Promise<void>}
 */
export async function deactivateCurrentModule() {
    for (const [name, config] of activeModules.entries()) {
        console.log(`⏹️  Deaktiviere Modul: ${name}`);

        // JavaScript Cleanup (isolated error handling)
        if (config.module?.cleanup) {
            try {
                await config.module.cleanup();
                console.log(`  ✓ JavaScript cleanup abgeschlossen`);
            } catch (error) {
                // Log but don't throw - allow other cleanups to proceed
                console.error(`  ❌ Cleanup-Fehler in ${name}:`, error);
            }
        }

        // CSS-Cleanup (always runs even if JS cleanup failed)
        cleanupModuleCSS(name);

        activeModules.delete(name);
    }
}

// =====================================================
// MODULE REGISTRY ACCESS
// =====================================================

/**
 * Gibt Modul-Config zurück
 * @param {string} moduleName
 * @returns {Object|undefined}
 */
export function getModuleConfig(moduleName) {
    return moduleRegistry[moduleName];
}

/**
 * Setzt das aktive Modul
 * @param {string} moduleName
 * @param {Object} config
 */
export function setActiveModule(moduleName, config) {
    activeModules.set(moduleName, config);
}

/**
 * Prüft ob ein Modul bereits geladen ist
 * @param {string} moduleName
 * @returns {boolean}
 */
export function isModuleLoaded(moduleName) {
    return activeModules.has(moduleName);
}

/**
 * Gibt das aktive Modul zurück
 * ✅ ES2025: Optional Chaining
 * @returns {[string, Object]|null}
 */
export function getActiveModule() {
    return activeModules.size > 0
        ? Array.from(activeModules.entries())[0]
        : null;
}

// =====================================================
// DEBUG UTILITIES
// =====================================================

/**
 * Debug-Funktion - Zeigt alle geladenen CSS-Dateien
 * ✅ ES2025: Verbesserte Logging-Struktur
 */
export function debugCSS() {
    console.log('📋 Aktuell geladene CSS-Dateien:');

    const allLinks = document.querySelectorAll('link[rel="stylesheet"]');
    allLinks.forEach(link => {
        const module = link.dataset.module ?? 'global';
        const path = link.dataset.cssPath ?? link.href;
        console.log(`  [${module}] ${path}`);
    });

    console.log('\n📊 CSS-Elemente pro Modul:');

    // ✅ ES2025: Object.entries für bessere Lesbarkeit
    Object.entries(moduleRegistry).forEach(([moduleName, config]) => {
        const count = config.cssElements?.length ?? 0;
        if (count > 0) {
            console.log(`  ${moduleName}: ${count} CSS-Dateien`);
        }
    });

    console.log(`\n💾 Cache Status:`);
    console.log(`  Geladene Scripts: ${loadedScripts.size}`);
    console.log(`  Geladene Styles: ${loadedStyles.size}`);
    console.log(`  Aktive Module: ${activeModules.size}`);
}

// Make debug function globally available
if (typeof window !== 'undefined') {
    window.debugModuleCSS = debugCSS;
}

// =====================================================
// ES2025 IMPROVEMENTS SUMMARY
// =====================================================
/*
✅ Promise.allSettled() - Robustes CSS Loading ohne kompletten Abbruch
✅ Error Causes - Strukturierte Error-Ketten für besseres Debugging
✅ Optional Chaining (?.) - Sichere Property-Zugriffe
✅ Nullish Coalescing (??) - Präzise Default-Werte
✅ Object.freeze() - Immutable Configuration
✅ Bessere Error Isolation - Cleanup läuft auch bei Fehlern
✅ Strukturiertes Logging - Detaillierte Debug-Informationen
✅ JSDoc Annotations - Bessere IDE-Unterstützung
*/