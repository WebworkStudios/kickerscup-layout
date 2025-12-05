// =====================================================
// KICKERSCUP - EURO CUP MODULE (ESM)
// Dedizierte EuroCup Seite mit K.o.-Baum
// =====================================================

// State Management
const eventListeners = [];
let zoomLevel = 1.0;

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

/**
 * Generiert Mock K.o.-Baum Daten für EuroCup (64 Teams)
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
        rounds.round64.push({
            id: `r64-${i}`,
            homeTeam: i === 12 ? 'FC Thunderbolts' : `Team EC-${i * 2 + 1}`,
            awayTeam: `Team EC-${i * 2 + 2}`,
            homeScore: 3,
            awayScore: i === 12 ? 0 : (Math.random() > 0.5 ? 1 : 2),
            date: '8. Dez',
            winner: i === 12 ? 'home' : (Math.random() > 0.5 ? 'home' : 'away'),
            isUserMatch
        });
    }

    // Runde der letzten 32 (16 Spiele)
    for (let i = 0; i < 16; i++) {
        const isUserMatch = i === 6;
        const isPlayed = i < 10;
        rounds.round32.push({
            id: `r32-${i}`,
            homeTeam: i === 6 ? 'FC Thunderbolts' : `Sieger R64-${i * 2 + 1}`,
            awayTeam: `Sieger R64-${i * 2 + 2}`,
            homeScore: isPlayed ? (i === 6 ? 2 : Math.floor(Math.random() * 4)) : null,
            awayScore: isPlayed ? (i === 6 ? 1 : Math.floor(Math.random() * 3)) : null,
            date: '11. Dez',
            winner: isPlayed ? (i === 6 ? 'home' : (Math.random() > 0.5 ? 'home' : 'away')) : null,
            isUserMatch,
            upcoming: !isPlayed
        });
    }

    // Achtelfinale (8 Spiele)
    for (let i = 0; i < 8; i++) {
        const isUserMatch = i === 3;
        const isPlayed = i < 5;
        rounds.round16.push({
            id: `r16-${i}`,
            homeTeam: i === 3 ? 'FC Thunderbolts' : `Sieger R32-${i * 2 + 1}`,
            awayTeam: `Sieger R32-${i * 2 + 2}`,
            homeScore: isPlayed ? (i === 3 ? 1 : Math.floor(Math.random() * 4)) : null,
            awayScore: isPlayed ? (i === 3 ? 0 : Math.floor(Math.random() * 3)) : null,
            date: '14. Dez',
            winner: isPlayed ? (i === 3 ? 'home' : (Math.random() > 0.5 ? 'home' : 'away')) : null,
            isUserMatch,
            upcoming: !isPlayed
        });
    }

    // Viertelfinale (4 Spiele)
    for (let i = 0; i < 4; i++) {
        const isUserMatch = i === 1;
        rounds.quarter.push({
            id: `quarter-${i}`,
            homeTeam: i === 1 ? 'FC Thunderbolts' : `Sieger R16-${i * 2 + 1}`,
            awayTeam: `Sieger R16-${i * 2 + 2}`,
            homeScore: null,
            awayScore: null,
            date: '17. Dez',
            winner: null,
            isUserMatch,
            upcoming: true
        });
    }

    // Halbfinale (2 Spiele)
    for (let i = 0; i < 2; i++) {
        rounds.semi.push({
            id: `semi-${i}`,
            homeTeam: `Sieger VF-${i * 2 + 1}`,
            awayTeam: `Sieger VF-${i * 2 + 2}`,
            homeScore: null,
            awayScore: null,
            date: '19. Dez',
            winner: null,
            upcoming: true
        });
    }

    // Finale (1 Spiel) + Spiel um Platz 3
    rounds.final.push({
        id: 'final',
        homeTeam: 'Sieger HF-1',
        awayTeam: 'Sieger HF-2',
        homeScore: null,
        awayScore: null,
        date: '22. Dez',
        winner: null,
        upcoming: true,
        isFinal: true
    });

    rounds.final.push({
        id: 'third-place',
        homeTeam: 'Verlierer HF-1',
        awayTeam: 'Verlierer HF-2',
        homeScore: null,
        awayScore: null,
        date: '22. Dez',
        winner: null,
        upcoming: true,
        isThirdPlace: true
    });

    return rounds;
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Event Listener mit Cleanup-Tracking registrieren
 */
const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;
    element.addEventListener(event, handler, options);
    eventListeners.push({element, event, handler, options});
};

// =====================================================
// K.O.-BAUM RENDERING
// =====================================================

const renderKnockoutBracket = () => {
    const rounds = generateKnockoutData();

    // Render each round
    renderKnockoutRound('round64Matches', rounds.round64);
    renderKnockoutRound('round32Matches', rounds.round32);
    renderKnockoutRound('round16Matches', rounds.round16);
    renderKnockoutRound('quarterMatches', rounds.quarter);
    renderKnockoutRound('semiMatches', rounds.semi);
    renderKnockoutRound('finalMatches', rounds.final);
};

const renderKnockoutRound = (containerId, matches) => {
    const container = document.getElementById(containerId);
    if (!container) return;

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
};

// =====================================================
// ZOOM CONTROLS
// =====================================================

const initZoomControls = () => {
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnResetView = document.getElementById('btnResetView');

    if (btnZoomIn) {
        addEventListener(btnZoomIn, 'click', () => {
            zoomLevel = Math.min(zoomLevel + 0.1, 2.0);
            updateZoom();
        });
    }

    if (btnZoomOut) {
        addEventListener(btnZoomOut, 'click', () => {
            zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
            updateZoom();
        });
    }

    if (btnResetView) {
        addEventListener(btnResetView, 'click', () => {
            zoomLevel = 1.0;
            updateZoom();

            // Scroll zu User-Match
            const userMatch = document.querySelector('.bracket-match.user-match');
            if (userMatch) {
                userMatch.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'center'});
            }
        });
    }
};

const updateZoom = () => {
    const bracketContainer = document.getElementById('bracketContainer');
    const zoomLevelEl = document.getElementById('zoomLevel');

    if (bracketContainer) {
        bracketContainer.style.transform = `scale(${zoomLevel})`;
    }

    if (zoomLevelEl) {
        zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
};

// =====================================================
// STAGE SELECTOR
// =====================================================

const initStageSelector = () => {
    const stageBtns = document.querySelectorAll('.stage-btn');

    stageBtns.forEach(btn => {
        addEventListener(btn, 'click', () => {
            const stage = btn.dataset.stage;

            // Buttons aktualisieren
            stageBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Runden ein/ausblenden
            const allRounds = document.querySelectorAll('.bracket-round');

            if (stage === 'all') {
                allRounds.forEach(round => round.style.display = 'flex');
            } else {
                allRounds.forEach(round => {
                    const roundClass = `.round-${stage.replace('round', '')}`;
                    round.style.display = round.matches(roundClass) ? 'flex' : 'none';
                });
            }
        });
    });
};

// =====================================================
// BACK NAVIGATION
// =====================================================

const initBackNavigation = () => {
    const btnBack = document.getElementById('btnBackToCup');

    if (btnBack) {
        addEventListener(btnBack, 'click', () => {
            // Navigation zurück zur Cup-Übersicht
            if (window.navigateTo) {
                window.navigateTo('cup');
            }
        });
    }
};

// =====================================================
// INITIALIZATION
// =====================================================

export function init() {
    console.log('EuroCup-Modul wird initialisiert...');

    // K.o.-Baum rendern
    renderKnockoutBracket();

    // Zoom Controls
    initZoomControls();

    // Stage Selector
    initStageSelector();

    // Back Navigation
    initBackNavigation();

    console.log('EuroCup-Modul initialisiert ✓');
}

export function cleanup() {
    console.log('EuroCup-Modul cleanup wird ausgeführt...');

    // Event Listeners entfernen
    eventListeners.forEach(({element, event, handler, options}) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners.length = 0;

    // State zurücksetzen
    zoomLevel = 1.0;

    console.log('EuroCup-Modul cleanup ✓');
}