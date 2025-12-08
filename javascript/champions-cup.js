// =====================================================
// KICKERSCUP - CHAMPIONS CUP MODULE (ESM) - ES2025 MODERNIZED
// Dedizierte ChampionsCup Seite mit Gruppenphase & K.o.-Baum
// ✅ AbortController für Event Cleanup
// ✅ Error Causes für strukturiertes Error Handling
// ✅ Object.freeze() für immutable Configuration
// ✅ Optional Chaining für sichere Property-Zugriffe
// =====================================================

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = Object.freeze({
    DEFAULT_TAB: 'groups',
    USER_GROUP: 'H',
    DEFAULT_MATCHDAY: 4,
    MAX_MATCHDAY: 6,
    MIN_MATCHDAY: 1,
    DEFAULT_ZOOM: 1.0,
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 2.0,
    ZOOM_STEP: 0.1
});

// =====================================================
// STATE MANAGEMENT (ES2025 Modernized)
// =====================================================

let abortController = new AbortController();
let currentTab = CONFIG.DEFAULT_TAB;
let currentGroup = CONFIG.USER_GROUP;
let currentMatchday = CONFIG.DEFAULT_MATCHDAY;
let zoomLevel = CONFIG.DEFAULT_ZOOM;

// =====================================================
// GROUP GENERATOR (A-Z, AA-AF = 32 Gruppen)
// =====================================================

/**
 * Generiert alle 32 Gruppennamen
 * A-Z (26) + AA-AF (6) = 32 Gruppen
 * ✅ ES2025: Result ist immutable
 */
const generateGroupNames = () => {
    const groups = [];

    // A-Z (26 Gruppen)
    for (let i = 0; i < 26; i++) {
        groups.push(String.fromCharCode(65 + i)); // A=65, Z=90
    }

    // AA-AF (6 weitere Gruppen)
    for (let i = 0; i < 6; i++) {
        groups.push('A' + String.fromCharCode(65 + i));
    }

    return groups;
};

// ✅ ES2025: Immutable Configuration
const ALL_GROUPS = Object.freeze(generateGroupNames());

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

/**
 * Generiert Mock-Daten für eine Gruppe
 * ✅ ES2025: Strukturiertes Error Handling
 */
const generateGroupData = (groupName) => {
    try {
        const isUserGroup = groupName === currentGroup;

        // Mock Teams
        const teams = [
            {id: 1, name: isUserGroup ? 'FC Thunderbolts' : `Team ${groupName}1`, flag: '⚽', isUser: isUserGroup},
            {id: 2, name: `Team ${groupName}2`, flag: '🏴', isUser: false},
            {id: 3, name: `Team ${groupName}3`, flag: '🏳️', isUser: false},
            {id: 4, name: `Team ${groupName}4`, flag: '🚩', isUser: false}
        ];

        // Mock Tabelle
        const table = teams.map((team, index) => ({
            rank: index + 1,
            team: team.name,
            flag: team.flag,
            isUser: team.isUser,
            played: 4,
            won: 4 - index,
            drawn: index === 2 ? 1 : 0,
            lost: index,
            goalsFor: 12 - (index * 2),
            goalsAgainst: 3 + index,
            goalDiff: (12 - (index * 2)) - (3 + index),
            points: (4 - index) * 3 + (index === 2 ? 1 : 0)
        }));

        // Nach Punkten sortieren
        table.sort((a, b) => b.points - a.points);

        // Mock Fixtures
        const fixtures = generateFixtures(teams, groupName);

        return {table, fixtures};
    } catch (error) {
        const contextError = new Error(`Failed to generate group data: ${groupName}`);
        contextError.cause = error;
        console.error('❌ Group data generation failed:', contextError);
        throw contextError;
    }
};

/**
 * Generiert Spielpaarungen für eine Gruppe
 */
const generateFixtures = (teams, groupName) => {
    const fixtures = [];

    // Spieltag 1-6 (Jeder gegen Jeden = 6 Spiele)
    const matchdays = [
        {day: 1, date: '10. Dez', matches: [[0, 1], [2, 3]]},
        {day: 2, date: '11. Dez', matches: [[0, 2], [1, 3]]},
        {day: 3, date: '12. Dez', matches: [[0, 3], [1, 2]]},
        {day: 4, date: '13. Dez', matches: [[1, 0], [3, 2]]},
        {day: 5, date: '14. Dez', matches: [[2, 0], [3, 1]]},
        {day: 6, date: '15. Dez', matches: [[3, 0], [2, 1]]}
    ];

    matchdays.forEach(md => {
        md.matches.forEach(([home, away]) => {
            const homeTeam = teams[home];
            const awayTeam = teams[away];
            const isPlayed = md.day <= currentMatchday;
            const isUserMatch = homeTeam.isUser || awayTeam.isUser;

            fixtures.push({
                matchday: md.day,
                date: md.date,
                homeTeam: homeTeam.name,
                homeFlag: homeTeam.flag,
                awayTeam: awayTeam.name,
                awayFlag: awayTeam.flag,
                homeScore: isPlayed ? Math.floor(Math.random() * 4) : null,
                awayScore: isPlayed ? Math.floor(Math.random() * 4) : null,
                isPlayed,
                isUserMatch
            });
        });
    });

    return fixtures;
};

/**
 * Generiert Mock K.o.-Baum Daten
 */
const generateKnockoutData = () => {
    const rounds = {
        round32: [],
        round16: [],
        quarter: [],
        semi: [],
        final: []
    };

    // Runde der letzten 32 (32 Spiele)
    for (let i = 0; i < 32; i++) {
        const isUserMatch = i === 7; // User ist im 8. Spiel
        rounds.round32.push({
            id: `r32-${i}`,
            homeTeam: i === 7 ? 'FC Thunderbolts' : `Team ${i * 2 + 1}`,
            awayTeam: `Team ${i * 2 + 2}`,
            homeScore: 2,
            awayScore: i === 7 ? 0 : 1,
            date: '15. Dez',
            winner: i === 7 ? 'home' : (Math.random() > 0.5 ? 'home' : 'away'),
            isUserMatch
        });
    }

    // Achtelfinale (16 Spiele)
    for (let i = 0; i < 16; i++) {
        const isUserMatch = i === 3;
        rounds.round16.push({
            id: `r16-${i}`,
            homeTeam: i === 3 ? 'FC Thunderbolts' : `Sieger R32-${i * 2 + 1}`,
            awayTeam: `Sieger R32-${i * 2 + 2}`,
            homeScore: null,
            awayScore: null,
            date: '18. Dez',
            winner: null,
            isUserMatch,
            upcoming: true
        });
    }

    // Viertelfinale (8 Spiele)
    for (let i = 0; i < 8; i++) {
        rounds.quarter.push({
            id: `quarter-${i}`,
            homeTeam: `Sieger R16-${i * 2 + 1}`,
            awayTeam: `Sieger R16-${i * 2 + 2}`,
            homeScore: null,
            awayScore: null,
            date: '21. Dez',
            winner: null,
            upcoming: true
        });
    }

    // Halbfinale (4 Spiele)
    for (let i = 0; i < 4; i++) {
        rounds.semi.push({
            id: `semi-${i}`,
            homeTeam: `Sieger VF-${i * 2 + 1}`,
            awayTeam: `Sieger VF-${i * 2 + 2}`,
            homeScore: null,
            awayScore: null,
            date: '24. Dez',
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
        date: '27. Dez',
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
        date: '27. Dez',
        winner: null,
        upcoming: true,
        isThirdPlace: true
    });

    return rounds;
};

// =====================================================
// EVENT LISTENER HELPER (ES2025 Modernized)
// =====================================================

/**
 * Event Listener mit AbortController registrieren
 * ✅ ES2025: Automatisches Cleanup via AbortController
 */
const addEventListener = (element, event, handler) => {
    element?.addEventListener(event, handler, {
        signal: abortController.signal
    });
};

// =====================================================
// TAB NAVIGATION
// =====================================================

const switchTab = (tabName) => {
    currentTab = tabName;

    // Tab Buttons aktualisieren
    document.querySelectorAll('.cc-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Tab Content aktualisieren
    document.querySelectorAll('.cc-tab-content').forEach(content => {
        if (content.id === `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Bei Wechsel zu K.o.-Baum: Baum rendern
    if (tabName === 'knockout') {
        renderKnockoutBracket();
    }
};

// =====================================================
// GROUP NAVIGATION
// =====================================================

const initGroupNavigation = () => {
    try {
        // Dropdown füllen
        const groupSelect = document.getElementById('groupSelect');
        if (groupSelect) {
            groupSelect.innerHTML = ALL_GROUPS.map(group =>
                `<option value="${group}" ${group === currentGroup ? 'selected' : ''}>
                    Gruppe ${group}
                </option>`
            ).join('');

            addEventListener(groupSelect, 'change', (e) => {
                switchToGroup(e.target.value);
            });
        }

        // Quick Navigation Grid
        const quickNav = document.getElementById('groupQuickNav');
        if (quickNav) {
            quickNav.innerHTML = ALL_GROUPS.map(group => {
                const isUserGroup = group === currentGroup;
                const isActive = group === currentGroup;
                return `
                    <button 
                        class="group-nav-btn ${isActive ? 'active' : ''} ${isUserGroup ? 'user-group' : ''}"
                        data-group="${group}"
                    >
                        ${group}
                    </button>
                `;
            }).join('');

            // Event Listeners für Quick Nav Buttons
            quickNav.querySelectorAll('.group-nav-btn').forEach(btn => {
                addEventListener(btn, 'click', () => {
                    switchToGroup(btn.dataset.group);
                });
            });
        }

        // "Meine Gruppe" Button
        const btnJumpToUser = document.getElementById('btnJumpToUserGroup');
        if (btnJumpToUser) {
            addEventListener(btnJumpToUser, 'click', () => {
                switchToGroup(currentGroup);
            });
        }
    } catch (error) {
        const contextError = new Error('Failed to initialize group navigation');
        contextError.cause = error;
        console.error('❌ Group navigation initialization failed:', contextError);
        throw contextError;
    }
};

const switchToGroup = (groupName) => {
    try {
        // Quick Nav aktualisieren
        document.querySelectorAll('.group-nav-btn').forEach(btn => {
            if (btn.dataset.group === groupName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Dropdown aktualisieren
        const groupSelect = document.getElementById('groupSelect');
        if (groupSelect) {
            groupSelect.value = groupName;
        }

        // Gruppe rendern
        renderGroup(groupName);
    } catch (error) {
        const contextError = new Error(`Failed to switch to group: ${groupName}`);
        contextError.cause = error;
        console.error('❌ Group switch failed:', contextError);
        // Don't throw - allow partial functionality
    }
};

// =====================================================
// GROUP RENDERING
// =====================================================

const renderGroup = (groupName) => {
    try {
        const {table, fixtures} = generateGroupData(groupName);

        // Group Header aktualisieren
        const groupNameEl = document.getElementById('currentGroupName');
        if (groupNameEl) {
            groupNameEl.textContent = `Gruppe ${groupName}`;
        }

        // Tabelle rendern
        renderGroupTable(table);

        // Fixtures rendern
        renderGroupFixtures(fixtures, currentMatchday);
    } catch (error) {
        const contextError = new Error(`Failed to render group: ${groupName}`);
        contextError.cause = error;
        console.error('❌ Group rendering failed:', contextError);
        throw contextError;
    }
};

const renderGroupTable = (table) => {
    const tbody = document.getElementById('groupTableBody');
    if (!tbody) return;

    tbody.innerHTML = table.map(team => {
        const isQualified = team.rank <= 2;
        const isEliminated = team.rank > 2;
        const goalDiff = team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff;

        return `
            <tr class="${isQualified ? 'qualified' : ''} ${isEliminated ? 'eliminated' : ''} ${team.isUser ? 'user-team' : ''}">
                <td class="col-rank">
                    <span class="rank-number">${team.rank}</span>
                </td>
                <td class="col-team">
                    <div class="team-name">
                        <span class="team-flag">${team.flag}</span>
                        <span>${team.team}</span>
                    </div>
                </td>
                <td class="col-stat">${team.played}</td>
                <td class="col-stat">${team.won}</td>
                <td class="col-stat">${team.drawn}</td>
                <td class="col-stat">${team.lost}</td>
                <td class="col-stat">${team.goalsFor}:${team.goalsAgainst}</td>
                <td class="col-stat">${goalDiff}</td>
                <td class="col-points">${team.points}</td>
            </tr>
        `;
    }).join('');
};

const renderGroupFixtures = (fixtures, matchday) => {
    const fixturesList = document.getElementById('fixturesList');
    if (!fixturesList) return;

    // Filter fixtures für aktuellen Spieltag
    const matchdayFixtures = fixtures.filter(f => f.matchday === matchday);

    fixturesList.innerHTML = matchdayFixtures.map(fixture => {
        const scoreDisplay = fixture.isPlayed
            ? `${fixture.homeScore} : ${fixture.awayScore}`
            : 'vs';

        return `
            <div class="fixture-item ${fixture.isUserMatch ? 'user-match' : ''}">
                <div class="fixture-date">
                    <span>📅</span>
                    <span>${fixture.date} • 18:00 Uhr</span>
                </div>
                <div class="fixture-match">
                    <div class="fixture-team home">
                        <span class="fixture-team-flag">${fixture.homeFlag}</span>
                        <span>${fixture.homeTeam}</span>
                    </div>
                    <div class="fixture-score ${fixture.isPlayed ? '' : 'upcoming'}">
                        ${scoreDisplay}
                    </div>
                    <div class="fixture-team away">
                        <span>${fixture.awayTeam}</span>
                        <span class="fixture-team-flag">${fixture.awayFlag}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Matchday Display aktualisieren
    const fixturesMatchday = document.getElementById('fixturesMatchday');
    if (fixturesMatchday) {
        fixturesMatchday.textContent = `Spieltag ${matchday}`;
    }

    // Navigation Buttons Status
    const btnPrev = document.getElementById('btnPrevMatchday');
    const btnNext = document.getElementById('btnNextMatchday');

    if (btnPrev) {
        btnPrev.disabled = matchday === CONFIG.MIN_MATCHDAY;
    }
    if (btnNext) {
        btnNext.disabled = matchday === CONFIG.MAX_MATCHDAY;
    }
};

// =====================================================
// MATCHDAY NAVIGATION
// =====================================================

const initMatchdayNavigation = () => {
    const btnPrev = document.getElementById('btnPrevMatchday');
    const btnNext = document.getElementById('btnNextMatchday');

    if (btnPrev) {
        addEventListener(btnPrev, 'click', () => {
            if (currentMatchday > CONFIG.MIN_MATCHDAY) {
                currentMatchday--;
                const currentGroupName = document.getElementById('groupSelect')?.value ?? currentGroup;
                const {fixtures} = generateGroupData(currentGroupName);
                renderGroupFixtures(fixtures, currentMatchday);
            }
        });
    }

    if (btnNext) {
        addEventListener(btnNext, 'click', () => {
            if (currentMatchday < CONFIG.MAX_MATCHDAY) {
                currentMatchday++;
                const currentGroupName = document.getElementById('groupSelect')?.value ?? currentGroup;
                const {fixtures} = generateGroupData(currentGroupName);
                renderGroupFixtures(fixtures, currentMatchday);
            }
        });
    }
};

// =====================================================
// K.O.-BAUM RENDERING
// =====================================================

const renderKnockoutBracket = () => {
    try {
        const rounds = generateKnockoutData();

        // Render each round
        renderKnockoutRound('round32Matches', rounds.round32);
        renderKnockoutRound('round16Matches', rounds.round16);
        renderKnockoutRound('quarterMatches', rounds.quarter);
        renderKnockoutRound('semiMatches', rounds.semi);
        renderKnockoutRound('finalMatches', rounds.final);
    } catch (error) {
        const contextError = new Error('Failed to render knockout bracket');
        contextError.cause = error;
        console.error('❌ Knockout bracket rendering failed:', contextError);
        throw contextError;
    }
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
            zoomLevel = Math.min(zoomLevel + CONFIG.ZOOM_STEP, CONFIG.MAX_ZOOM);
            updateZoom();
        });
    }

    if (btnZoomOut) {
        addEventListener(btnZoomOut, 'click', () => {
            zoomLevel = Math.max(zoomLevel - CONFIG.ZOOM_STEP, CONFIG.MIN_ZOOM);
            updateZoom();
        });
    }

    if (btnResetView) {
        addEventListener(btnResetView, 'click', () => {
            zoomLevel = CONFIG.DEFAULT_ZOOM;
            updateZoom();

            // Scroll zu User-Match
            const userMatch = document.querySelector('.bracket-match.user-match');
            userMatch?.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'center'});
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
    console.log('ChampionsCup-Modul wird initialisiert...');

    try {
        // Tab Navigation
        document.querySelectorAll('.cc-tab').forEach(tab => {
            addEventListener(tab, 'click', () => {
                switchTab(tab.dataset.tab);
            });
        });

        // Group Navigation
        initGroupNavigation();
        initMatchdayNavigation();

        // Initial: User's Group anzeigen
        renderGroup(currentGroup);

        // Zoom Controls
        initZoomControls();

        // Stage Selector
        initStageSelector();

        // Back Navigation
        initBackNavigation();

        console.log('ChampionsCup-Modul initialisiert ✓');
    } catch (error) {
        const contextError = new Error('ChampionsCup module initialization failed');
        contextError.cause = error;
        console.error('❌ Initialization failed:', contextError);
        throw contextError;
    }
}

export function cleanup() {
    console.log('ChampionsCup-Modul cleanup wird ausgeführt...');

    // ✅ ES2025: Ein Aufruf entfernt ALLE Event Listener
    abortController.abort();
    abortController = new AbortController();

    // State zurücksetzen
    currentTab = CONFIG.DEFAULT_TAB;
    currentMatchday = CONFIG.DEFAULT_MATCHDAY;
    zoomLevel = CONFIG.DEFAULT_ZOOM;

    console.log('ChampionsCup-Modul cleanup ✓');
}