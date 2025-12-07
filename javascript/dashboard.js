// =====================================================
// KICKERSCUP - DASHBOARD (ESM) - ES2025 MODERNIZED
// Haupt-Dashboard mit News, Countdown, Quick Stats
// ✅ AbortController für automatisches Event Cleanup
// ✅ Error Causes für strukturiertes Error Handling
// ✅ Optional Chaining & Nullish Coalescing
// ✅ Hybrid: Alte Event-Listener + ES2025 Cleanup
// ✅ Immutable Configuration mit Object.freeze
// ✅ Strukturiertes Logging
// =====================================================

import {navigateTo} from './navigation.js';

// =====================================================
// CONFIGURATION
// ✅ ES2025: Frozen Configuration
// =====================================================

const DASHBOARD_CONFIG = Object.freeze({
    DEFAULT_FILTER: 'alle',
    COUNTDOWN_INTERVAL: 1000,
    COUNTDOWN_UPDATE_THRESHOLD: 0,
    // ✅ KORRIGIERT: Exakte Filter-Werte aus HTML
    FILTER_TYPES: Object.freeze(['alle', 'events', 'updates', 'kritisch']),
    NEWS_TYPE_PRIORITY: Object.freeze(['critical', 'event', 'update', 'info'])
});

// =====================================================
// PRIVATE STATE
// =====================================================

let currentFilter = DASHBOARD_CONFIG.DEFAULT_FILTER;
let countdownInterval = null;

// ✅ ES2025: AbortController für automatisches Event Cleanup
let dashboardAbortController = new AbortController();

// ✅ HYBRID: Behalte altes Array-Tracking für nicht-delegierte Events
const eventListeners = [];

/**
 * Helper: Event Listener registrieren mit Cleanup-Tracking
 * ✅ HYBRID: Nutzt AbortController Signal wenn verfügbar
 */
const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;

    // ✅ ES2025: Füge signal hinzu wenn options ein Object ist
    if (typeof options === 'object' && !options.signal) {
        options.signal = dashboardAbortController.signal;
    } else if (options === false || options === true) {
        options = { capture: options, signal: dashboardAbortController.signal };
    }

    element.addEventListener(event, handler, options);
    eventListeners.push({element, event, handler, options});
};

// =====================================================
// STRUCTURED LOGGING
// ✅ ES2025: Konsistentes Logging mit Context
// =====================================================

const log = {
    info: (context, message, data = {}) => {
        console.log(`[Dashboard:${context}]`, message, data);
    },
    error: (context, error) => {
        console.error(`[Dashboard:${context}]`, error.message, {
            cause: error.cause,
            stack: error.stack
        });
    },
    debug: (context, message, data = {}) => {
        if (window.DEBUG_MODE) {
            console.log(`[Dashboard:${context}:DEBUG]`, message, data);
        }
    }
};

// =====================================================
// COUNTDOWN LOGIC
// =====================================================

/**
 * Erstellt das Ziel-Datum für den Countdown
 * ✅ ES2025: Gekapselte Date-Logik für bessere Testbarkeit
 *
 * @returns {Date} Das Ziel-Datum (2 Tage in der Zukunft, 18:30 Uhr)
 */
const createTargetDate = () => {
    const now = new Date();
    const target = new Date(now);
    target.setDate(now.getDate() + 2);
    target.setHours(18, 30, 0, 0);
    return target;
};

/**
 * Formatiert die Zeitdifferenz als lesbaren String
 * ✅ ES2025: Pure Function ohne Side Effects
 *
 * @param {number} diff - Zeitdifferenz in Millisekunden
 * @returns {string} Formatierter Countdown-Text
 */
const formatCountdown = (diff) => {
    if (diff <= DASHBOARD_CONFIG.COUNTDOWN_UPDATE_THRESHOLD) {
        return 'Match läuft!';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let countdownText = '';
    if (days > 0) countdownText += `${days}d `;
    countdownText += `${hours}h ${minutes}m ${seconds}s`;

    return countdownText;
};

/**
 * Aktualisiert den Countdown im DOM
 * ✅ ES2025: Error Handling mit Error Cause
 * ✅ ES2025: Optional Chaining für sichere DOM-Zugriffe
 */
const updateCountdown = () => {
    try {
        const countdownElement = document.getElementById('matchCountdown');

        if (!countdownElement) {
            throw new Error('Countdown element not found in DOM');
        }

        const targetDate = createTargetDate();
        const now = new Date();
        const diff = targetDate - now;

        countdownElement.textContent = formatCountdown(diff);

        // Stoppe Interval wenn Match läuft
        if (diff <= DASHBOARD_CONFIG.COUNTDOWN_UPDATE_THRESHOLD) {
            stopCountdown();
            log.info('Countdown', 'Match started, countdown stopped');
        }
    } catch (error) {
        const contextError = new Error('Failed to update countdown display');
        contextError.cause = error;
        log.error('UpdateCountdown', contextError);
        stopCountdown();
    }
};

/**
 * Startet den Countdown-Interval
 * ✅ ES2025: Gekapselte Start-Logik
 */
const startCountdown = () => {
    // Verhindere mehrfache Intervals
    stopCountdown();

    updateCountdown(); // Sofortige erste Aktualisierung
    countdownInterval = setInterval(
        updateCountdown,
        DASHBOARD_CONFIG.COUNTDOWN_INTERVAL
    );

    log.info('Countdown', 'Countdown started');
};

/**
 * Stoppt den Countdown-Interval
 * ✅ ES2025: Sichere Cleanup-Funktion
 */
const stopCountdown = () => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        log.debug('Countdown', 'Countdown interval cleared');
    }
};

// =====================================================
// NEWS FILTER LOGIC
// =====================================================

/**
 * Ermittelt den Typ eines News-Items anhand der CSS-Klassen
 * ✅ ES2025: Optional Chaining & bessere Fehlerbehandlung
 * ✅ KORRIGIERT: Unterstützt beide Badge-Typen (alt & neu)
 *
 * @param {HTMLElement} item - Das News-Item DOM-Element
 * @returns {'critical'|'event'|'update'|'info'} Der ermittelte News-Typ
 */
const getNewsItemType = (item) => {
    if (!item?.classList) {
        log.error('GetNewsType', new Error('Invalid news item: missing classList'));
        return 'info';
    }

    const classList = item.classList;

    // 1. Prüfe CSS-Klassen direkt am news-item
    if (classList.contains('critical')) return 'critical';
    if (classList.contains('event')) return 'event';
    if (classList.contains('update')) return 'update';

    // 2. Prüfe Badge-Klassen (beide Varianten)
    const badge = item.querySelector('.news-badge');
    if (badge) {
        if (badge.classList.contains('badge-critical')) return 'critical';
        if (badge.classList.contains('badge-event')) return 'event';
        if (badge.classList.contains('badge-update')) return 'update';
        if (badge.classList.contains('badge-info')) return 'info';
    }

    // 3. Fallback: Prüfe Icon-Klasse im Header
    const icon = item.querySelector('.news-header .icon');
    const iconClass = icon?.className ?? '';

    if (iconClass.includes('critical')) return 'critical';
    if (iconClass.includes('event')) return 'event';
    if (iconClass.includes('update')) return 'update';

    return 'info';
};

/**
 * Filtert News-Items basierend auf dem aktuellen Filter
 * ✅ ES2025: Optimierte Logik mit Optional Chaining
 * ✅ ES2025: Strukturiertes Error Handling
 * ✅ KORRIGIERT: Verwendet 'is-hidden' statt 'hidden'
 * ✅ KORRIGIERT: Richtiges Filter-Mapping
 *
 * @param {string} filterType - Der gewählte Filter-Typ
 */
const filterNews = (filterType) => {
    try {
        const newsItems = document.querySelectorAll('.news-item');

        if (newsItems.length === 0) {
            log.debug('FilterNews', 'No news items found in DOM');
            return;
        }

        // ✅ KORRIGIERT: Mapping von data-filter Werten zu News-Typen
        const filterMapping = {
            'alle': null,            // Zeige alles
            'events': 'event',       // data-filter="events" → type="event"
            'updates': 'update',     // data-filter="updates" → type="update"
            'kritisch': 'critical'   // data-filter="kritisch" → type="critical"
        };

        const targetType = filterMapping[filterType];
        let visibleCount = 0;

        newsItems.forEach(item => {
            const itemType = getNewsItemType(item);

            // KORRIGIERT: "alle" zeigt alles, sonst nur wenn Typ übereinstimmt
            const shouldShow = filterType === 'alle' || itemType === targetType;

            // ✅ KORRIGIERT: Verwendet 'is-hidden' statt 'hidden'
            if (shouldShow) {
                item.classList.remove('is-hidden');
                visibleCount++;
            } else {
                item.classList.add('is-hidden');
            }
        });

        // Zeige/Verstecke "Keine Ergebnisse"
        if (visibleCount === 0) {
            showNoResultsMessage();
        } else {
            hideNoResultsMessage();
        }

        log.debug('FilterNews', `Filtered news`, {
            filter: filterType,
            total: newsItems.length,
            visible: visibleCount
        });
    } catch (error) {
        const contextError = new Error('Failed to filter news items');
        contextError.cause = error;
        log.error('FilterNews', contextError);
    }
};

/**
 * Zeigt "Keine Ergebnisse" Nachricht
 * ✅ ES2025: Verwendet 'is-hidden' Klasse
 */
const showNoResultsMessage = () => {
    const newsWidget = document.querySelector('.news-widget');
    if (!newsWidget) return;

    let noResultsEl = document.querySelector('.no-results-message');

    if (!noResultsEl) {
        noResultsEl = document.createElement('div');
        noResultsEl.className = 'no-results-message';
        noResultsEl.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
            <p>Keine News in dieser Kategorie verfügbar</p>
        `;
        newsWidget.appendChild(noResultsEl);
    }

    noResultsEl.classList.remove('is-hidden');
};

/**
 * Versteckt "Keine Ergebnisse" Nachricht
 * ✅ ES2025: Verwendet 'is-hidden' Klasse
 */
const hideNoResultsMessage = () => {
    const noResultsEl = document.querySelector('.no-results-message');
    if (noResultsEl) {
        noResultsEl.classList.add('is-hidden');
    }
};

/**
 * Initialisiert die News-Filter-Buttons
 * ✅ HYBRID: Alte forEach-Struktur mit ES2025 AbortController
 * ✅ KORRIGIERT: Verwendet data-filter Attribut korrekt
 */
const initNewsFilter = () => {
    try {
        const filterButtons = document.querySelectorAll('.filter-btn');

        if (filterButtons.length === 0) {
            throw new Error('News filter buttons not found in DOM');
        }

        filterButtons.forEach(btn => {
            addEventListener(btn, 'click', function () {
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // ✅ KORRIGIERT: Hole data-filter und konvertiere zu lowercase
                const filter = this.getAttribute('data-filter')?.toLowerCase() ?? 'alle';
                currentFilter = filter;
                filterNews(filter);

                log.debug('FilterButton', 'Filter changed', { filter });
            });
        });

        log.info('NewsFilter', 'News filter initialized');
    } catch (error) {
        const contextError = new Error('Failed to initialize news filter');
        contextError.cause = error;
        log.error('InitNewsFilter', contextError);
    }
};

// =====================================================
// ACTION HANDLERS
// =====================================================

/**
 * Handler für Match Action Buttons
 * ✅ KORRIGIERT: Alle Button-Typen unterstützt (Taktik, Aufstellung, Analyse)
 * ✅ ES2025: Optional Chaining für sicheren Zugriff
 *
 * @param {string} action - Der Button-Text (Action-Name)
 */
const handleMatchAction = (action) => {
    try {
        log.debug('MatchAction', 'Button clicked', { action });

        if (action.includes('Taktik')) {
            navigateTo('tactics');
        } else if (action.includes('Aufstellung')) {
            navigateTo('lineup');
        } else if (action.includes('Analyse')) {
            alert('📊 Match-Analyse\n\nDetaillierte Spielanalyse wird geladen...');
        } else {
            log.debug('MatchAction', 'Unknown action', { action });
        }
    } catch (error) {
        const contextError = new Error('Failed to handle match action');
        contextError.cause = error;
        log.error('MatchAction', contextError);
    }
};

/**
 * Handler für Quick Stats Klicks
 * ✅ KORRIGIERT: "23 Spieler" führt zu Team-Page
 * ✅ ES2025: Switch mit toLowerCase für case-insensitive matching
 *
 * @param {string} label - Das Stat-Label
 */
const handleStatClick = (label) => {
    try {
        const normalizedLabel = label.toLowerCase().trim();

        log.debug('StatClick', 'Stat clicked', { label, normalized: normalizedLabel });

        switch (true) {
            case normalizedLabel.includes('tabellenplatz'):
            case normalizedLabel.includes('platz'):
                navigateTo('league');
                break;
            case normalizedLabel.includes('spieler'):
            case /\d+\s*spieler/.test(normalizedLabel): // Matches "23 Spieler", "23Spieler" etc.
                navigateTo('team');
                break;
            default:
                log.debug('StatClick', 'No handler for stat', { label: normalizedLabel });
        }
    } catch (error) {
        const contextError = new Error('Failed to handle stat click');
        contextError.cause = error;
        log.error('StatClick', contextError);
    }
};

// =====================================================
// EVENT LISTENERS
// =====================================================

/**
 * Initialisiert Event Listeners
 * ✅ HYBRID: Alte forEach-Struktur mit ES2025 AbortController
 * ✅ KORRIGIERT: Verwendet querySelector für Label-Zugriff
 */
const initEventListeners = () => {
    try {
        // ✅ Match Action Buttons
        const matchButtons = document.querySelectorAll('.btn-match-action');
        matchButtons.forEach(btn => {
            addEventListener(btn, 'click', function () {
                const action = this.textContent.trim();
                handleMatchAction(action);
            });
        });

        // ✅ Quick Stats Items
        const statItems = document.querySelectorAll('.quick-stat-item');
        statItems.forEach(item => {
            addEventListener(item, 'click', function () {
                const labelElement = this.querySelector('.quick-stat-label');
                const label = labelElement?.textContent ?? '';
                if (label) {
                    handleStatClick(label);
                }
            });
        });

        log.info('EventListeners', 'Event listeners initialized', {
            matchButtons: matchButtons.length,
            statItems: statItems.length
        });
    } catch (error) {
        const contextError = new Error('Failed to initialize event listeners');
        contextError.cause = error;
        log.error('InitEventListeners', contextError);
    }
};

// =====================================================
// MODULE LIFECYCLE
// =====================================================

/**
 * Initialisiert das Dashboard
 * ✅ HYBRID: Alte synchrone Init mit ES2025 Error Handling
 * ✅ ES2025: Neuer AbortController für diese Session
 * EXPORT für ModuleManager
 */
export function init() {
    try {
        log.info('Init', 'Dashboard initialization started');

        // ✅ ES2025: Neuer AbortController für diese Session
        dashboardAbortController = new AbortController();

        // Countdown starten
        startCountdown();

        // News Filter initialisieren
        initNewsFilter();

        // Event Listeners initialisieren
        initEventListeners();

        // Initialen Filter anwenden
        filterNews(currentFilter);

        log.info('Init', 'Dashboard initialization completed');
    } catch (error) {
        const contextError = new Error('Dashboard initialization failed');
        contextError.cause = error;
        log.error('Init', contextError);
        // Don't throw - allow partial initialization
    }
}

/**
 * Cleanup beim Verlassen
 * ✅ HYBRID: AbortController + manuelles Cleanup für Robustheit
 * ✅ ES2025: Strukturiertes Error Handling
 * EXPORT für ModuleManager
 */
export function cleanup() {
    try {
        log.info('Cleanup', 'Dashboard cleanup started');

        // ✅ ES2025: AbortController entfernt alle Listener auf einmal
        dashboardAbortController.abort();

        // ✅ FALLBACK: Manuelles Cleanup für nicht-abortable Listener
        eventListeners.forEach(({element, event, handler, options}) => {
            if (element) {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (e) {
                    // Listener war bereits entfernt (durch abort)
                }
            }
        });
        eventListeners.length = 0;

        // Stoppe Countdown
        stopCountdown();

        // Reset State
        currentFilter = DASHBOARD_CONFIG.DEFAULT_FILTER;

        log.info('Cleanup', 'Dashboard cleanup completed');
    } catch (error) {
        const contextError = new Error('Dashboard cleanup failed');
        contextError.cause = error;
        log.error('Cleanup', contextError);
        // Don't throw in cleanup - log and continue
    }
}
