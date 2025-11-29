// =====================================================
// KICKERSCUP - DASHBOARD (ESM)
// Haupt-Dashboard mit News, Countdown, Quick Stats
// Modernisiert: ES Modules, const, CSS-Klassen
// =====================================================

import { navigateTo } from './navigation.js';

// State Management (const für nicht neu zugewiesene Werte)
let currentFilter = 'alle';
let countdownInterval = null;
const eventListeners = [];

/**
 * Helper: Event Listener registrieren mit Cleanup-Tracking
 */
const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;
    element.addEventListener(event, handler, options);
    eventListeners.push({ element, event, handler, options });
};

/**
 * Startet den Countdown bis zum nächsten Match
 * MODERNISIERT: Interval auf 1000ms (1 Sekunde) für höhere Präzision
 */
const startCountdown = () => {
    const updateCountdown = () => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 2);
        targetDate.setHours(18, 30, 0, 0);

        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) {
            const countdownElement = document.getElementById('matchCountdown');
            if (countdownElement) {
                countdownElement.textContent = 'Match läuft!';
            }
            clearInterval(countdownInterval);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let countdownText = '';
        if (days > 0) countdownText += `${days}d `;
        countdownText += `${hours}h ${minutes}m ${seconds}s`;

        const countdownElement = document.getElementById('matchCountdown');
        if (countdownElement) {
            countdownElement.textContent = countdownText;
        }
    };

    updateCountdown();
    // MODERNISIERT: 1000ms statt 60000ms für Sekunden-Genauigkeit
    countdownInterval = setInterval(updateCountdown, 1000);
};

/**
 * Ermittelt den Typ eines News-Items
 */
const getNewsItemType = (item) => {
    // 1. Prüfe CSS-Klassen direkt am news-item
    if (item.classList.contains('critical')) return 'critical';
    if (item.classList.contains('event')) return 'event';
    if (item.classList.contains('update')) return 'update';

    // 2. Prüfe Badge-Klassen
    const badge = item.querySelector('.news-badge');
    if (badge) {
        if (badge.classList.contains('badge-critical')) return 'critical';
        if (badge.classList.contains('badge-event')) return 'event';
        if (badge.classList.contains('badge-update')) return 'update';
        if (badge.classList.contains('badge-info')) return 'info';
    }

    return 'info'; // Default
};

/**
 * Initialisiert den News Filter
 */
const initNewsFilter = () => {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
        addEventListener(btn, 'click', function () {
            // Update active state
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.getAttribute('data-filter').toLowerCase();
            currentFilter = filter;
            filterNews(filter);
        });
    });
};

/**
 * Filtert News nach Kategorie
 * MODERNISIERT: Verwendet CSS-Klassen statt Inline-Styles
 */
const filterNews = (filter) => {
    const newsItems = document.querySelectorAll('.news-item');

    if (newsItems.length === 0) {
        return;
    }

    // Mapping: data-filter Werte → Typ-Namen
    const filterMapping = {
        'alle': null,
        'events': 'event',
        'updates': 'update',
        'kritisch': 'critical'
    };

    const targetType = filterMapping[filter];
    let visibleCount = 0;

    newsItems.forEach((item) => {
        const itemType = getNewsItemType(item);

        // KORRIGIERT: "alle" zeigt alles, sonst nur wenn Typ übereinstimmt
        if (filter === 'alle' || itemType === targetType) {
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
};

/**
 * Zeigt "Keine Ergebnisse" Nachricht
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

    // MODERNISIERT: CSS-Klasse statt style.display
    noResultsEl.classList.remove('is-hidden');
};

/**
 * Versteckt "Keine Ergebnisse" Nachricht
 */
const hideNoResultsMessage = () => {
    const noResultsEl = document.querySelector('.no-results-message');
    if (noResultsEl) {
        // MODERNISIERT: CSS-Klasse statt style.display
        noResultsEl.classList.add('is-hidden');
    }
};

/**
 * Handler für Match Action Buttons
 * MODERNISIERT: Importiert navigateTo statt window.NavigationSystem
 */
const handleMatchAction = (action) => {
    if (action.includes('Taktik')) {
        navigateTo('tactics');
    } else if (action.includes('Aufstellung')) {
        navigateTo('team');
    } else if (action.includes('Analyse')) {
        alert('📊 Match-Analyse\n\nDetaillierte Spielanalyse wird geladen...');
    }
};

/**
 * Handler für Quick Stats Klicks
 * MODERNISIERT: Verwendet importierte navigateTo-Funktion
 */
const handleStatClick = (label) => {
    switch (label.toLowerCase()) {
        case 'tabellenplatz':
            navigateTo('league');
            break;
        case 'spieler':
            navigateTo('team');
            break;
        default:
            console.log(`Statistik geklickt: ${label}`);
    }
};

/**
 * Initialisiert Event Listeners
 */
const initEventListeners = () => {
    // Match Action Buttons
    const matchButtons = document.querySelectorAll('.btn-match-action');
    matchButtons.forEach(btn => {
        addEventListener(btn, 'click', function () {
            const action = this.textContent.trim();
            handleMatchAction(action);
        });
    });

    // Quick Stats Items (nur noch für Navigation)
    const statItems = document.querySelectorAll('.quick-stat-item');
    statItems.forEach(item => {
        addEventListener(item, 'click', function () {
            const label = this.querySelector('.quick-stat-label').textContent;
            handleStatClick(label);
        });
    });
};

/**
 * Initialisiert das Dashboard
 * EXPORT für ModuleManager
 */
export function init() {
    // Countdown starten
    startCountdown();

    // News Filter initialisieren
    initNewsFilter();

    // Event Listeners initialisieren
    initEventListeners();
    
    // **WICHTIGE KORREKTUR:** Initialen Filter anwenden, um den korrekten Startzustand sicherzustellen.
    filterNews(currentFilter);
}

/**
 * Cleanup beim Verlassen
 * EXPORT für ModuleManager
 */
export function cleanup() {
    // Entferne alle Event Listener
    eventListeners.forEach(({ element, event, handler, options }) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners.length = 0;

    // Stoppe Countdown
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // Reset State
    currentFilter = 'alle';
}