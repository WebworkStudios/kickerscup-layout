// =====================================================
// KICKERSCUP - CUP MODULE (ESM) - ES2025 MODERNIZED
// Pokalwettbewerbe & Turniere
// ✅ AbortController für Event Cleanup
// ✅ Strukturierte Error Causes
// ✅ Object.freeze für immutable Configuration
// ✅ Konsistentes Error Handling
// =====================================================

// =====================================================
// STATE MANAGEMENT
// =====================================================

// ✅ ES2025: AbortController statt manuelles Array-Tracking
let cupAbortController = new AbortController();

// =====================================================
// MOCK DATA - ES2025 MODERNIZED
// ✅ Object.freeze für immutable Configuration
// =====================================================

const MOCK_DATA = Object.freeze({
    championsCup: Object.freeze({
        status: 'active',
        phase: 'Gruppenphase',
        group: 'Gruppe H',
        position: 2,
        points: 12,
        gamesPlayed: 4,
        wins: 4,
        draws: 0,
        losses: 0
    }),
    euroCup: Object.freeze({
        status: 'active',
        round: 'Achtelfinale',
        nextMatch: Object.freeze({
            day: 18,
            opponent: 'FC Valencia'
        }),
        wins: 3,
        qualified: true
    }),
    premiumCup: Object.freeze({
        status: 'locked',
        requirements: Object.freeze({
            isPremium: false,
            teamStrength: 38,
            requiredStrength: 45,
            hasEntryFee: true,
            entryFee: 50000,
            availableCapital: 2485750
        })
    }),
    history: Object.freeze({
        totalTitles: 3,
        finalsReached: 5,
        totalGames: 47,
        winRate: 68,
        trophies: Object.freeze([
            Object.freeze({
                id: 'cc-2023',
                name: 'ChampionsCup Sieger',
                season: 'Saison 2023/24',
                icon: '🏆',
                count: 1
            }),
            Object.freeze({
                id: 'ec-2023',
                name: 'EuroCup Sieger',
                season: 'Saison 2023/24 & 2022/23',
                icon: '🥇',
                count: 2
            }),
            Object.freeze({
                id: 'pc-none',
                name: 'PremiumCup',
                season: 'Noch nicht gewonnen',
                icon: '💎',
                count: 0,
                locked: true
            })
        ])
    })
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Formatiert Zahlen als Währung im deutschen Format
 *
 * @param {number} amount - Betrag in Euro
 * @returns {string} Formatierter Currency-String (z.B. "2.485.750 €")
 *
 * @example
 * formatCurrency(2485750) // "2.485.750 €"
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// =====================================================
// UI UPDATE FUNCTIONS
// =====================================================

/**
 * Aktualisiert die ChampionsCup Card mit echten Daten
 * @param {Object} data - ChampionsCup Daten
 */
const updateChampionsCupCard = (data) => {
    // Diese Funktion könnte in Zukunft dynamische Daten einbinden
    console.log('ChampionsCup Daten:', data);
};

/**
 * Aktualisiert die EuroCup Card mit echten Daten
 * @param {Object} data - EuroCup Daten
 */
const updateEuroCupCard = (data) => {
    // Diese Funktion könnte in Zukunft dynamische Daten einbinden
    console.log('EuroCup Daten:', data);
};

/**
 * Aktualisiert die PremiumCup Card mit echten Daten
 * @param {Object} data - PremiumCup Daten
 */
const updatePremiumCupCard = (data) => {
    // Diese Funktion könnte in Zukunft dynamische Daten einbinden
    console.log('PremiumCup Daten:', data);
};

/**
 * Aktualisiert die History Card mit echten Daten
 * @param {Object} data - History Daten
 */
const updateHistoryCard = (data) => {
    // Diese Funktion könnte in Zukunft dynamische Daten einbinden
    console.log('History Daten:', data);
};

// =====================================================
// CHAMPIONS CUP EVENT HANDLERS
// =====================================================

/**
 * Navigiert zum ChampionsCup
 * ✅ ES2025: Strukturierte Error Causes statt dreifacher Fallback
 */
const handleOpenChampionsCup = () => {
    console.log('🏆 ChampionsCup Button geklickt');

    try {
        if (typeof window.navigateTo !== 'function') {
            const error = new Error('Navigation system not initialized');
            // @ts-ignore - Error cause is ES2022+ feature
            error.cause = {
                requiredFunction: 'window.navigateTo',
                targetPage: 'championscup',
                availableMethods: Object.keys(window).filter(k => k.includes('navigate'))
            };
            throw error;
        }

        window.navigateTo('championscup');
    } catch (error) {
        console.error('❌ Navigation failed:', error);
        showNotification(
            '❌ Navigation Error',
            'Could not navigate to ChampionsCup. Please reload the page.'
        );
    }
};

/**
 * Zeigt ChampionsCup Statistiken
 */
const handleViewCCStats = () => {
    showNotification('📊 Statistiken', 'Detaillierte ChampionsCup Statistiken werden geladen...');
    // TODO: Modal mit erweiterten Statistiken
};

// =====================================================
// EURO CUP EVENT HANDLERS
// =====================================================

/**
 * Navigiert zum EuroCup K.o.-Baum
 */
const handleViewECBracket = () => {
    try {
        if (typeof window.navigateTo !== 'function') {
            const error = new Error('Navigation system not initialized');
            // @ts-ignore
            error.cause = {targetPage: 'eurocup'};
            throw error;
        }
        window.navigateTo('eurocup');
    } catch (error) {
        console.error('❌ Navigation failed:', error);
        showNotification('❌ Navigation Error', 'Could not navigate to EuroCup.');
    }
};

/**
 * Zeigt EuroCup Spielplan
 */
const handleViewECSchedule = () => {
    showNotification('📅 Spielplan', 'Der EuroCup Spielplan wird geladen...');
    // TODO: Modal oder neue Ansicht mit Spielplan öffnen
};

// =====================================================
// PREMIUM CUP EVENT HANDLERS
// =====================================================

/**
 * Startet Premium-Upgrade Prozess
 */
const handleUpgradePremium = () => {
    showNotification(
        '⭐ Premium freischalten',
        'Premium-Upgrade wird vorbereitet...\n\nDiese Funktion wird in einer zukünftigen Version verfügbar sein.'
    );
    // TODO: Premium-Upgrade Modal oder Weiterleitung
};

// =====================================================
// HISTORY EVENT HANDLERS
// =====================================================

/**
 * Zeigt vollständige Pokal-Historie
 */
const handleViewHistory = () => {
    showNotification('📜 Pokal-Historie', 'Deine komplette Pokal-Geschichte wird geladen...');
    // TODO: Modal oder neue Ansicht mit vollständiger Historie
};

// =====================================================
// NOTIFICATION SYSTEM
// =====================================================

/**
 * Zeigt eine Benachrichtigung (temporär mit console.log)
 * TODO: Durch elegantes Toast/Modal-System ersetzen
 * ✅ ES2025: Non-blocking, dispatcht Event für zukünftiges System
 *
 * @param {string} title - Titel der Benachrichtigung
 * @param {string} message - Nachrichtentext
 */
const showNotification = (title, message) => {
    console.log(`📢 ${title}`, message);

    // ✅ ES2025: Event-basierte Architektur für zukünftiges Toast-System
    window.dispatchEvent(new CustomEvent('app:notification', {
        detail: Object.freeze({
            title,
            message,
            type: 'info',
            timestamp: Date.now()
        })
    }));
};

// =====================================================
// INITIALIZATION - ES2025 MODERNIZED
// =====================================================

/**
 * Initialisiert Cup-Modul
 * ✅ ES2025: AbortController für automatisches Event Cleanup
 * ✅ ES2025: Strukturiertes Error Handling mit Error Causes
 */
export function init() {
    try {
        console.log('Cup-Modul wird initialisiert...');

        const signal = cupAbortController.signal;

        // UI mit Mock-Daten aktualisieren
        updateChampionsCupCard(MOCK_DATA.championsCup);
        updateEuroCupCard(MOCK_DATA.euroCup);
        updatePremiumCupCard(MOCK_DATA.premiumCup);
        updateHistoryCard(MOCK_DATA.history);

        // ========== CHAMPIONS CUP EVENT LISTENERS ==========
        // ✅ ES2025: Optional Chaining & AbortController
        document.getElementById('btnOpenChampionsCup')
            ?.addEventListener('click', handleOpenChampionsCup, {signal});

        document.getElementById('btnViewCCStats')
            ?.addEventListener('click', handleViewCCStats, {signal});

        // ========== EURO CUP EVENT LISTENERS ==========
        document.getElementById('btnViewECBracket')
            ?.addEventListener('click', handleViewECBracket, {signal});

        document.getElementById('btnViewECSchedule')
            ?.addEventListener('click', handleViewECSchedule, {signal});

        // ========== PREMIUM CUP EVENT LISTENERS ==========
        document.getElementById('btnUpgradePremium')
            ?.addEventListener('click', handleUpgradePremium, {signal});

        // ========== HISTORY EVENT LISTENERS ==========
        document.getElementById('btnViewHistory')
            ?.addEventListener('click', handleViewHistory, {signal});

        console.log('Cup-Modul initialisiert ✓');
    } catch (error) {
        // ✅ ES2025: Strukturierte Error Chain
        const initError = new Error('Cup module initialization failed');
        // @ts-ignore
        initError.cause = error;
        console.error('❌ Cup init error:', initError);
        throw initError;
    }
}

/**
 * Cleanup Cup-Modul
 * ✅ ES2025: AbortController macht manuelles Event-Tracking überflüssig
 */
export function cleanup() {
    console.log('Cup-Modul cleanup wird ausgeführt...');

    // ✅ ES2025: Ein Aufruf entfernt ALLE Event Listener
    cupAbortController.abort();
    cupAbortController = new AbortController();

    console.log('Cup-Modul cleanup ✓');
}