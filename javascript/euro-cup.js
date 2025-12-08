// =====================================================
// KICKERSCUP - EURO CUP MODULE (ESM) - ES2025 MODERNIZED
// Dedizierte EuroCup Seite mit K.o.-Baum
// ✅ AbortController für Event Cleanup
// ✅ Promise.allSettled für robuste Initialisierung
// ✅ Strukturierte Error Handling mit Error Causes
// ✅ Immutable Configuration mit Object.freeze
// ✅ Fail-Fast Error Strategy
// =====================================================

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = Object.freeze({
    ZOOM_MIN: 0.5,
    ZOOM_MAX: 2.0,
    ZOOM_STEP: 0.1,
    ZOOM_DEFAULT: 1.0,
    SCROLL_BEHAVIOR: 'smooth',
    SCROLL_BLOCK: 'center',
    SCROLL_INLINE: 'center'
});

// =====================================================
// STATE MANAGEMENT
// =====================================================

let zoomLevel = CONFIG.ZOOM_DEFAULT;
let abortController = new AbortController();

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

/**
 * Generiert Mock K.o.-Baum Daten für EuroCup (64 Teams)
 * ✅ ES2025: Object.freeze für immutable Datenstrukturen
 *
 * @returns {Object} Knockout-Runden-Daten
 */
const generateKnockoutData = () => {
    const rounds = {
        round64: [],
        round32: [],
        round16: [],
        quarter: [],
        semi: [],
        final: []
    };

    // Runde der letzten 64 (32 Spiele)
    for (let i = 0; i < 32; i++) {
        const isUserMatch = i === 12; // User ist im 13. Spiel
        rounds.round64.push(Object.freeze({
            id: `r64-${i}`,
            homeTeam: i === 12 ? 'FC Thunderbolts' : `Team EC-${i * 2 + 1}`,
            awayTeam: `Team EC-${i * 2 + 2}`,
            homeScore: 3,
            awayScore: i === 12 ? 0 : (Math.random() > 0.5 ? 1 : 2),
            date: '8. Dez',
            winner: i === 12 ? 'home' : (Math.random() > 0.5 ? 'home' : 'away'),
            isUserMatch
        }));
    }

    // Runde der letzten 32 (16 Spiele)
    for (let i = 0; i < 16; i++) {
        const isUserMatch = i === 6;
        const isPlayed = i < 10;
        rounds.round32.push(Object.freeze({
            id: `r32-${i}`,
            homeTeam: i === 6 ? 'FC Thunderbolts' : `Sieger R64-${i * 2 + 1}`,
            awayTeam: `Sieger R64-${i * 2 + 2}`,
            homeScore: isPlayed ? (i === 6 ? 2 : Math.floor(Math.random() * 4)) : null,
            awayScore: isPlayed ? (i === 6 ? 1 : Math.floor(Math.random() * 3)) : null,
            date: '11. Dez',
            winner: isPlayed ? (i === 6 ? 'home' : (Math.random() > 0.5 ? 'home' : 'away')) : null,
            isUserMatch,
            upcoming: !isPlayed
        }));
    }

    // Achtelfinale (8 Spiele)
    for (let i = 0; i < 8; i++) {
        const isUserMatch = i === 3;
        const isPlayed = i < 5;
        rounds.round16.push(Object.freeze({
            id: `r16-${i}`,
            homeTeam: i === 3 ? 'FC Thunderbolts' : `Sieger R32-${i * 2 + 1}`,
            awayTeam: `Sieger R32-${i * 2 + 2}`,
            homeScore: isPlayed ? (i === 3 ? 1 : Math.floor(Math.random() * 4)) : null,
            awayScore: isPlayed ? (i === 3 ? 0 : Math.floor(Math.random() * 3)) : null,
            date: '14. Dez',
            winner: isPlayed ? (i === 3 ? 'home' : (Math.random() > 0.5 ? 'home' : 'away')) : null,
            isUserMatch,
            upcoming: !isPlayed
        }));
    }

    // Viertelfinale (4 Spiele)
    for (let i = 0; i < 4; i++) {
        const isUserMatch = i === 1;
        rounds.quarter.push(Object.freeze({
            id: `quarter-${i}`,
            homeTeam: i === 1 ? 'FC Thunderbolts' : `Sieger R16-${i * 2 + 1}`,
            awayTeam: `Sieger R16-${i * 2 + 2}`,
            homeScore: null,
            awayScore: null,
            date: '17. Dez',
            winner: null,
            isUserMatch,
            upcoming: true
        }));
    }

    // Halbfinale (2 Spiele)
    for (let i = 0; i < 2; i++) {
        rounds.semi.push(Object.freeze({
            id: `semi-${i}`,
            homeTeam: `Sieger VF-${i * 2 + 1}`,
            awayTeam: `Sieger VF-${i * 2 + 2}`,
            homeScore: null,
            awayScore: null,
            date: '19. Dez',
            winner: null,
            upcoming: true
        }));
    }

    // Finale (1 Spiel) + Spiel um Platz 3
    rounds.final.push(Object.freeze({
        id: 'final',
        homeTeam: 'Sieger HF-1',
        awayTeam: 'Sieger HF-2',
        homeScore: null,
        awayScore: null,
        date: '22. Dez',
        winner: null,
        upcoming: true,
        isFinal: true
    }));

    rounds.final.push(Object.freeze({
        id: 'third-place',
        homeTeam: 'Verlierer HF-1',
        awayTeam: 'Verlierer HF-2',
        homeScore: null,
        awayScore: null,
        date: '22. Dez',
        winner: null,
        upcoming: true,
        isThirdPlace: true
    }));

    return rounds;
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Event Listener mit AbortController-Signal registrieren
 * ✅ ES2025: Signal-basiertes Event Management (wie navigation.js)
 *
 * @param {HTMLElement|null} element - DOM Element
 * @param {string} event - Event Name
 * @param {Function} handler - Event Handler
 * @param {Object} options - Event Options
 */
const addEventListener = (element, event, handler, options = {}) => {
    if (!element) {
        console.warn(`addEventListener: Element für Event "${event}" nicht gefunden`);
        return;
    }

    element.addEventListener(event, handler, {
        ...options,
        signal: abortController.signal
    });
};

// =====================================================
// K.O.-BAUM RENDERING
// =====================================================

/**
 * Rendert den kompletten K.o.-Baum
 * ✅ ES2025: Strukturiertes Error Handling mit Error Causes
 *
 * @throws {Error} Wenn kritische Container fehlen
 */
const renderKnockoutBracket = () => {
    try {
        const rounds = generateKnockoutData();

        // Render each round mit individuellem Error Handling
        renderKnockoutRound('round64Matches', rounds.round64);
        renderKnockoutRound('round32Matches', rounds.round32);
        renderKnockoutRound('round16Matches', rounds.round16);
        renderKnockoutRound('quarterMatches', rounds.quarter);
        renderKnockoutRound('semiMatches', rounds.semi);
        renderKnockoutRound('finalMatches', rounds.final);

        console.log('✓ K.o.-Baum erfolgreich gerendert');

    } catch (error) {
        const wrappedError = new Error('Bracket rendering failed');
        wrappedError.cause = error;
        console.error('❌ K.o.-Baum Rendering fehlgeschlagen:', wrappedError);
        throw wrappedError;
    }
};

/**
 * Rendert eine einzelne K.o.-Runde
 * ✅ ES2025: Fail-Fast mit Error Causes
 *
 * @param {string} containerId - Container DOM ID
 * @param {Array} matches - Match-Daten
 * @throws {Error} Wenn Container nicht gefunden wird
 */
const renderKnockoutRound = (containerId, matches) => {
    const container = document.getElementById(containerId);

    if (!container) {
        const error = new Error(`Knockout round container not found: ${containerId}`);
        error.cause = {containerId, matchCount: matches?.length ?? 0};
        console.error('❌ Critical DOM element missing:', error);
        throw error;
    }

    try {
        container.innerHTML = matches.map(match => `
            <div class="bracket-match ${match.isUserMatch ? 'user-match' : ''} ${match.upcoming ? 'upcoming' : ''}">
                <div class="bracket-team ${match.winner === 'home' ? 'winner' : ''} ${match.isUserMatch && match.homeTeam === 'FC Thunderbolts' ? 'user' : ''}">
                    <span class="bracket-team-name">${match.homeTeam}</span>
                    ${match.homeScore !== null ? `<span class="bracket-team-score">${match.homeScore}</span>` : ''}
                </div>
                <div class="bracket-team ${match.winner === 'away' ? 'winner' : ''} ${match.isUserMatch && match.awayTeam === 'FC Thunderbolts' ? 'user' : ''}">
                    <span class="bracket-team-name">${match.awayTeam}</span>
                    ${match.awayScore !== null ? `<span class="bracket-team-score">${match.awayScore}</span>` : ''}
                </div>
                <div class="match-date">${match.date}</div>
            </div>
        `).join('');

    } catch (error) {
        const wrappedError = new Error(`Failed to render round: ${containerId}`);
        wrappedError.cause = error;
        console.error('❌ Round rendering error:', wrappedError);
        throw wrappedError;
    }
};

// =====================================================
// ZOOM CONTROLS
// =====================================================

/**
 * Aktualisiert Zoom-Level und DOM
 * ✅ ES2025: Optional Chaining für sichere DOM-Zugriffe
 */
const updateZoom = () => {
    // Clamp zoom level to valid range
    zoomLevel = Math.max(CONFIG.ZOOM_MIN, Math.min(CONFIG.ZOOM_MAX, zoomLevel));

    const bracketContainer = document.getElementById('bracketContainer');
    const zoomLevelEl = document.getElementById('zoomLevel');

    if (bracketContainer) {
        bracketContainer.style.transform = `scale(${zoomLevel})`;
    } else {
        console.warn('⚠️ Bracket container nicht gefunden für Zoom-Update');
    }

    if (zoomLevelEl) {
        zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
};

/**
 * Initialisiert Zoom-Controls
 * ✅ ES2025: Strukturiertes Error Handling
 *
 * @throws {Error} Wenn kritische Zoom-Buttons fehlen
 */
const initZoomControls = async () => {
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnResetView = document.getElementById('btnResetView');

    // Critical: All zoom buttons must exist
    if (!btnZoomIn || !btnZoomOut || !btnResetView) {
        const error = new Error('Zoom control buttons not found');
        error.cause = {
            zoomIn: !!btnZoomIn,
            zoomOut: !!btnZoomOut,
            resetView: !!btnResetView
        };
        console.error('❌ Zoom Controls fehlen:', error);
        throw error;
    }

    // Zoom In
    addEventListener(btnZoomIn, 'click', () => {
        zoomLevel = Math.min(zoomLevel + CONFIG.ZOOM_STEP, CONFIG.ZOOM_MAX);
        updateZoom();
    });

    // Zoom Out
    addEventListener(btnZoomOut, 'click', () => {
        zoomLevel = Math.max(zoomLevel - CONFIG.ZOOM_STEP, CONFIG.ZOOM_MIN);
        updateZoom();
    });

    // Reset View
    addEventListener(btnResetView, 'click', () => {
        zoomLevel = CONFIG.ZOOM_DEFAULT;
        updateZoom();

        // Scroll zu User-Match (non-critical, uses optional chaining)
        const userMatch = document.querySelector('.bracket-match.user-match');
        userMatch?.scrollIntoView({
            behavior: CONFIG.SCROLL_BEHAVIOR,
            block: CONFIG.SCROLL_BLOCK,
            inline: CONFIG.SCROLL_INLINE
        });
    });

    console.log('✓ Zoom Controls initialisiert');
};

// =====================================================
// STAGE SELECTOR
// =====================================================

/**
 * Initialisiert Stage-Selector Buttons
 * ✅ ES2025: Strukturiertes Error Handling
 *
 * @throws {Error} Wenn keine Stage-Buttons gefunden werden
 */
const initStageSelector = async () => {
    const stageBtns = document.querySelectorAll('.stage-btn');

    if (stageBtns.length === 0) {
        const error = new Error('Stage selector buttons not found');
        console.error('❌ Stage Selector fehlt:', error);
        throw error;
    }

    stageBtns.forEach(btn => {
        addEventListener(btn, 'click', () => {
            const stage = btn.dataset.stage;

            // Buttons aktualisieren
            stageBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Runden ein/ausblenden
            const allRounds = document.querySelectorAll('.bracket-round');

            if (stage === 'all') {
                allRounds.forEach(round => {
                    round.style.display = 'flex';
                });
            } else {
                allRounds.forEach(round => {
                    const roundClass = `.round-${stage.replace('round', '')}`;
                    round.style.display = round.matches(roundClass) ? 'flex' : 'none';
                });
            }
        });
    });

    console.log('✓ Stage Selector initialisiert');
};

// =====================================================
// BACK NAVIGATION
// =====================================================

/**
 * Initialisiert Back-Navigation Button
 * ✅ ES2025: Nicht-kritischer Fehler (Warning statt Throw)
 */
const initBackNavigation = async () => {
    const btnBack = document.getElementById('btnBackToCup');

    if (!btnBack) {
        // Non-critical: Back button is optional
        console.warn('⚠️ Back button nicht gefunden (nicht-kritisch)');
        return;
    }

    addEventListener(btnBack, 'click', () => {
        if (window.navigateTo) {
            window.navigateTo('cup');
        } else {
            console.error('❌ navigateTo function nicht verfügbar');
        }
    });

    console.log('✓ Back Navigation initialisiert');
};

// =====================================================
// INITIALIZATION (ES2025 Modernized)
// =====================================================

/**
 * Initialisiert EuroCup-Modul
 * ✅ ES2025: Promise.allSettled für robuste parallele Initialisierung
 * ✅ ES2025: Strukturierte Error Recovery
 *
 * @returns {Promise<void>}
 * @throws {Error} Bei kritischen Initialisierungsfehlern
 */
export async function init() {
    console.log('🚀 EuroCup-Modul wird initialisiert...');

    try {
        // Phase 1: Bracket Rendering (CRITICAL - must succeed)
        try {
            renderKnockoutBracket();
        } catch (error) {
            const criticalError = new Error('Critical: Bracket rendering failed');
            criticalError.cause = error;
            console.error('❌ KRITISCH: K.o.-Baum konnte nicht gerendert werden:', criticalError);
            throw criticalError; // Stop initialization
        }

        // Phase 2: Initialize UI Controls (parallel with individual error handling)
        // ✅ ES2025: Promise.allSettled ermöglicht partielle Initialisierung
        const results = await Promise.allSettled([
            initZoomControls(),
            initStageSelector(),
            initBackNavigation()
        ]);

        // Analyze results
        const componentNames = ['Zoom Controls', 'Stage Selector', 'Back Navigation'];
        const failures = [];

        results.forEach((result, idx) => {
            if (result.status === 'rejected') {
                failures.push({
                    component: componentNames[idx],
                    error: result.reason
                });
                console.error(`  ↳ ${componentNames[idx]} fehlgeschlagen:`, result.reason);
            }
        });

        // Check for critical failures
        // Zoom Controls (index 0) and Stage Selector (index 1) are critical
        const criticalFailures = failures.filter((_, idx) => idx < 2);

        if (criticalFailures.length > 0) {
            const error = new Error(`Critical UI components failed: ${criticalFailures.map(f => f.component).join(', ')}`);
            error.cause = {failures: criticalFailures};
            console.error('❌ Kritische UI-Komponenten fehlgeschlagen:', error);
            throw error;
        }

        // Log non-critical failures (Back Navigation)
        const nonCriticalFailures = failures.filter((_, idx) => idx >= 2);
        if (nonCriticalFailures.length > 0) {
            console.warn(`⚠️ ${nonCriticalFailures.length} nicht-kritische Komponenten fehlgeschlagen (Modul bleibt funktional)`);
        }

        console.log('✅ EuroCup-Modul erfolgreich initialisiert');

    } catch (error) {
        const wrappedError = new Error('EuroCup module initialization failed');
        wrappedError.cause = error;
        console.error('❌ EuroCup-Modul Initialisierung fehlgeschlagen:', wrappedError);
        throw wrappedError; // Bubble up to navigation.js
    }
}

// =====================================================
// CLEANUP (ES2025 Modernized)
// =====================================================

/**
 * Cleanup-Funktion für Modul-Deaktivierung
 * ✅ ES2025: Ein Aufruf entfernt ALLE Event Listener via AbortController
 *
 * @returns {Promise<void>}
 */
export async function cleanup() {
    console.log('🧹 EuroCup-Modul cleanup wird ausgeführt...');

    try {
        // ✅ ES2025: AbortController entfernt alle Events mit einem Aufruf
        abortController.abort();
        abortController = new AbortController();

        // Reset State
        zoomLevel = CONFIG.ZOOM_DEFAULT;

        console.log('✅ EuroCup-Modul cleanup abgeschlossen');

    } catch (error) {
        // Log but don't throw - cleanup should be resilient
        console.error('⚠️ Cleanup-Fehler (nicht-kritisch):', error);
    }
}