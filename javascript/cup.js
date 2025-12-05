// =====================================================
// KICKERSCUP - CUP MODULE (ESM)
// Pokalwettbewerbe & Turniere
// =====================================================

// State Management
const eventListeners = [];

// =====================================================
// MOCK DATA (später über Backend)
// =====================================================

const MOCK_DATA = {
    championsCup: {
        status: 'active',
        phase: 'Gruppenphase',
        group: 'Gruppe H',
        position: 2,
        points: 12,
        gamesPlayed: 4,
        wins: 4,
        draws: 0,
        losses: 0
    },
    euroCup: {
        status: 'active',
        round: 'Achtelfinale',
        nextMatch: {
            day: 18,
            opponent: 'FC Valencia'
        },
        wins: 3,
        qualified: true
    },
    premiumCup: {
        status: 'locked',
        requirements: {
            isPremium: false,
            teamStrength: 38,
            requiredStrength: 45,
            hasEntryFee: true,
            entryFee: 50000,
            availableCapital: 2485750
        }
    },
    history: {
        totalTitles: 3,
        finalsReached: 5,
        totalGames: 47,
        winRate: 68,
        trophies: [
            {
                id: 'cc-2023',
                name: 'ChampionsCup Sieger',
                season: 'Saison 2023/24',
                icon: '🏆',
                count: 1
            },
            {
                id: 'ec-2023',
                name: 'EuroCup Sieger',
                season: 'Saison 2023/24 & 2022/23',
                icon: '🥇',
                count: 2
            },
            {
                id: 'pc-none',
                name: 'PremiumCup',
                season: 'Noch nicht gewonnen',
                icon: '💎',
                count: 0,
                locked: true
            }
        ]
    }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Formatiert Zahlen als Währung
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

/**
 * Event Listener mit Cleanup-Tracking registrieren
 */
const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;
    element.addEventListener(event, handler, options);
    eventListeners.push({element, event, handler, options});
};

// =====================================================
// UI UPDATE FUNCTIONS
// =====================================================

/**
 * Aktualisiert die ChampionsCup Card mit echten Daten
 */
const updateChampionsCupCard = (data) => {
    // Diese Funktion könnte in Zukunft dynamische Daten einbinden
    console.log('ChampionsCup Daten:', data);
};

/**
 * Aktualisiert die EuroCup Card mit echten Daten
 */
const updateEuroCupCard = (data) => {
    // Diese Funktion könnte in Zukunft dynamische Daten einbinden
    console.log('EuroCup Daten:', data);
};

/**
 * Aktualisiert die PremiumCup Card mit echten Daten
 */
const updatePremiumCupCard = (data) => {
    // Diese Funktion könnte in Zukunft dynamische Daten einbinden
    console.log('PremiumCup Daten:', data);
};

/**
 * Aktualisiert die History Card mit echten Daten
 */
const updateHistoryCard = (data) => {
    // Diese Funktion könnte in Zukunft dynamische Daten einbinden
    console.log('History Daten:', data);
};

// =====================================================
// CHAMPIONS CUP EVENT HANDLERS
// =====================================================

const handleOpenChampionsCup = () => {
    console.log('🏆 ChampionsCup Button geklickt');

    // Methode 1: Versuche über globale navigateTo Funktion
    if (typeof window.navigateTo === 'function') {
        console.log('✓ Navigiere via window.navigateTo');
        window.navigateTo('championscup');
        return;
    }

    // Methode 2: Simuliere Click auf Navigation-Button (falls vorhanden)
    const navBtn = document.querySelector('[data-page="championscup"]');
    if (navBtn) {
        console.log('✓ Navigiere via Navigation-Button');
        navBtn.click();
        return;
    }

    // Methode 3: Custom Event dispatchen
    console.log('✓ Navigiere via Custom Event');
    window.dispatchEvent(new CustomEvent('navigate', {
        detail: {page: 'championscup'}
    }));

    // Fallback: Info-Alert
    setTimeout(() => {
        alert('⚠️ Navigation-System nicht gefunden.\n\nBitte stelle sicher, dass das ChampionsCup-Modul registriert ist in:\n- module-manager.js\n- navigation.js');
    }, 100);
};

const handleViewCCStats = () => {
    showNotification('📊 Statistiken', 'Detaillierte ChampionsCup Statistiken werden geladen...');
    // TODO: Modal mit erweiterten Statistiken
};

// =====================================================
// EURO CUP EVENT HANDLERS
// =====================================================

const handleViewECBracket = () => {
    if (typeof window.navigateTo === 'function') {
        window.navigateTo('eurocup');
    }
};

const handleViewECSchedule = () => {
    showNotification('📅 Spielplan', 'Der EuroCup Spielplan wird geladen...');
    // TODO: Modal oder neue Ansicht mit Spielplan öffnen
};

// =====================================================
// PREMIUM CUP EVENT HANDLERS
// =====================================================

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

const handleViewHistory = () => {
    showNotification('📜 Pokal-Historie', 'Deine komplette Pokal-Geschichte wird geladen...');
    // TODO: Modal oder neue Ansicht mit vollständiger Historie
};

// =====================================================
// NOTIFICATION SYSTEM
// =====================================================

/**
 * Zeigt eine einfache Benachrichtigung (temporär mit alert)
 * TODO: Durch elegantes Toast/Modal-System ersetzen
 */
const showNotification = (title, message) => {
    alert(`${title}\n\n${message}`);
};

// =====================================================
// INITIALIZATION
// =====================================================

export function init() {
    console.log('Cup-Modul wird initialisiert...');

    // UI mit Mock-Daten aktualisieren
    updateChampionsCupCard(MOCK_DATA.championsCup);
    updateEuroCupCard(MOCK_DATA.euroCup);
    updatePremiumCupCard(MOCK_DATA.premiumCup);
    updateHistoryCard(MOCK_DATA.history);

    // ========== CHAMPIONS CUP EVENT LISTENERS ==========
    const btnOpenChampionsCup = document.getElementById('btnOpenChampionsCup');
    if (btnOpenChampionsCup) {
        addEventListener(btnOpenChampionsCup, 'click', handleOpenChampionsCup);
    }

    const btnViewCCStats = document.getElementById('btnViewCCStats');
    if (btnViewCCStats) {
        addEventListener(btnViewCCStats, 'click', handleViewCCStats);
    }

    // ========== EURO CUP EVENT LISTENERS ==========
    const btnViewECBracket = document.getElementById('btnViewECBracket');
    if (btnViewECBracket) {
        addEventListener(btnViewECBracket, 'click', handleViewECBracket);
    }

    const btnViewECSchedule = document.getElementById('btnViewECSchedule');
    if (btnViewECSchedule) {
        addEventListener(btnViewECSchedule, 'click', handleViewECSchedule);
    }

    // ========== PREMIUM CUP EVENT LISTENERS ==========
    const btnUpgradePremium = document.getElementById('btnUpgradePremium');
    if (btnUpgradePremium) {
        addEventListener(btnUpgradePremium, 'click', handleUpgradePremium);
    }

    // ========== HISTORY EVENT LISTENERS ==========
    const btnViewHistory = document.getElementById('btnViewHistory');
    if (btnViewHistory) {
        addEventListener(btnViewHistory, 'click', handleViewHistory);
    }

    console.log('Cup-Modul initialisiert ✓');
}

export function cleanup() {
    console.log('Cup-Modul cleanup wird ausgeführt...');

    // Event Listeners entfernen
    eventListeners.forEach(({element, event, handler, options}) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners.length = 0;

    console.log('Cup-Modul cleanup ✓');
}