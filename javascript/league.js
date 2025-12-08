// =====================================================
// KICKERSCUP - LEAGUE SYSTEM (ESM) - ES2025 MODERNIZED
// Spielplan, Tabellen & Ligaverwaltung
// ✅ AbortController für Event Management
// ✅ Error Causes für strukturiertes Error Handling
// ✅ Object.freeze für immutable Configuration
// ✅ Strukturiertes Logging
// ✅ JSDoc Type Annotations
// =====================================================

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * @typedef {Object} Team
 * @property {string} name - Team name
 * @property {string} emoji - Team emoji icon
 * @property {number} strength - Team strength (1-10)
 * @property {boolean} [isPlayer] - Whether this is the player's team
 * @property {number} wins - Number of wins
 * @property {number} draws - Number of draws
 * @property {number} losses - Number of losses
 * @property {number} goalsFor - Goals scored
 * @property {number} goalsAgainst - Goals conceded
 * @property {number} points - Total points
 * @property {number} goalDiff - Goal difference
 * @property {Array<'W'|'D'|'L'>} form - Last 5 results
 */

/**
 * @typedef {Object} Match
 * @property {number} matchday - Matchday number
 * @property {Team} home - Home team
 * @property {Team} away - Away team
 * @property {string} date - Match date/time
 * @property {boolean} hasBeenPlayed - Whether match has been played
 * @property {number} homeGoals - Home team goals
 * @property {number} awayGoals - Away team goals
 */

// =====================================================
// CONFIGURATION - ES2025: Immutable
// =====================================================

const CONFIG = Object.freeze({
    MATCHDATES: Object.freeze([
        'Sa. 15:30',
        'Sa. 18:30',
        'So. 15:30',
        'So. 17:30'
    ]),
    MAX_MATCHDAYS: 17,
    TEAMS_PER_LEAGUE: 18,
    MATCHES_PER_MATCHDAY: 9,
    FORM_HISTORY_LENGTH: 5,
    POSITION_ZONES: Object.freeze({
        CHAMPIONS_LEAGUE: Object.freeze({start: 1, end: 2}),
        EUROPA_LEAGUE: Object.freeze({start: 3, end: 6}),
        RELEGATION: Object.freeze({start: 16, end: 18})
    }),
    RESULT_LABELS: Object.freeze({
        WIN: 'Sieg',
        DRAW: 'Unentschieden',
        LOSS: 'Niederlage'
    }),
    FORM_LABELS: Object.freeze({
        W: 'S',
        D: 'U',
        L: 'N'
    })
});

// =====================================================
// STATE MANAGEMENT
// =====================================================

let currentLeague = 1;
let currentMatchday = 1;
let currentTableType = 'overall';

// ✅ ES2025: AbortController für Event Management
let leagueAbortController = new AbortController();

// =====================================================
// ERROR CLASSES - ES2025: Custom Errors with Causes
// =====================================================

/**
 * Custom error for league data validation
 */
class LeagueDataError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'LeagueDataError';
        this.cause = cause;
    }
}

/**
 * Custom error for rendering operations
 */
class LeagueRenderError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'LeagueRenderError';
        this.cause = cause;
    }
}

// =====================================================
// DATA GENERATION - ES2025: With Error Handling
// =====================================================

/**
 * Generates league teams with player team
 * ✅ ES2025: Input validation with Error Causes
 *
 * @param {number} leagueNumber - League number (1-5)
 * @returns {(*&{strength: number, wins: number, draws: number, losses: number, goalsFor: number, goalsAgainst: number, points: number, goalDiff: number, form: []})[]}
 * @throws {LeagueDataError} If league number is invalid
 */
const generateLeagueTeams = (leagueNumber) => {
    if (typeof leagueNumber !== 'number' || leagueNumber < 1 || leagueNumber > 5) {
        throw new LeagueDataError('Invalid league number', {
            leagueNumber,
            expected: '1-5',
            received: typeof leagueNumber
        });
    }

    console.log(`📊 Generiere Teams für Liga ${leagueNumber}...`);

    const baseTeams = Object.freeze([
        {name: 'FC Thunderbolts', emoji: '⚡', strength: 8, isPlayer: true},
        {name: 'Bayern München', emoji: '🔴', strength: 9},
        {name: 'Borussia Dortmund', emoji: '🟡', strength: 8},
        {name: 'RB Leipzig', emoji: '⚪', strength: 7},
        {name: 'Bayer Leverkusen', emoji: '🔴', strength: 7},
        {name: 'Union Berlin', emoji: '🔴', strength: 6},
        {name: 'SC Freiburg', emoji: '⚫', strength: 6},
        {name: 'Eintracht Frankfurt', emoji: '🦅', strength: 7},
        {name: 'VfL Wolfsburg', emoji: '🟢', strength: 6},
        {name: 'Borussia M\'gladbach', emoji: '⚫', strength: 6},
        {name: 'FSV Mainz 05', emoji: '🔴', strength: 5},
        {name: 'VfL Bochum', emoji: '🔵', strength: 5},
        {name: 'FC Augsburg', emoji: '🟢', strength: 5},
        {name: 'TSG Hoffenheim', emoji: '🔵', strength: 6},
        {name: 'VfB Stuttgart', emoji: '🔴', strength: 6},
        {name: 'Werder Bremen', emoji: '🟢', strength: 5},
        {name: 'FC Köln', emoji: '🔴', strength: 5},
        {name: 'Hertha BSC', emoji: '🔵', strength: 4}
    ]);

    // Adjust strength based on league
    const teams = baseTeams.map(team => ({
        ...team,
        strength: Math.max(1, team.strength - (leagueNumber - 1)),
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        goalDiff: 0,
        form: []
    }));

    console.log(`  ✓ ${teams.length} Teams generiert`);
    return teams;
};

/**
 * Generates full season schedule
 * ✅ ES2025: Error handling and validation
 *
 * @param {Array<Team>} teams - Array of teams
 * @returns {Array<Match>}
 * @throws {LeagueDataError} If teams array is invalid
 */
const generateSchedule = (teams) => {
    if (!Array.isArray(teams) || teams.length === 0) {
        throw new LeagueDataError('Invalid teams data', {
            teams,
            expectedType: 'Array',
            expectedMinLength: 1
        });
    }

    console.log(`📅 Generiere Spielplan für ${CONFIG.MAX_MATCHDAYS} Spieltage...`);

    const schedule = [];

    // Generate matches for each matchday
    for (let matchday = 1; matchday <= CONFIG.MAX_MATCHDAYS; matchday++) {
        const matches = [];
        const teamsUsed = new Set();

        for (let i = 0; i < teams.length; i++) {
            if (teamsUsed.has(i)) continue;

            for (let j = i + 1; j < teams.length; j++) {
                if (teamsUsed.has(j)) continue;
                if (matches.length >= CONFIG.MATCHES_PER_MATCHDAY) break;

                const match = {
                    matchday,
                    home: teams[i],
                    away: teams[j],
                    date: CONFIG.MATCHDATES[matches.length % CONFIG.MATCHDATES.length],
                    hasBeenPlayed: matchday < currentMatchday,
                    homeGoals: 0,
                    awayGoals: 0
                };

                // Simulate past matches
                if (match.hasBeenPlayed) {
                    match.homeGoals = Math.floor(Math.random() * 4);
                    match.awayGoals = Math.floor(Math.random() * 4);
                }

                matches.push(match);
                teamsUsed.add(i);
                teamsUsed.add(j);
                break;
            }
        }

        schedule.push(...matches);
    }

    console.log(`  ✓ ${schedule.length} Spiele generiert`);
    return schedule;
};

/**
 * Calculate league table from matches
 * ✅ ES2025: Robust error handling and validation
 *
 * @param {Array<Team>} teams - Array of teams
 * @param {Array<Match>} schedule - Array of matches
 * @param {string} tableType - Type of table ('overall', 'home', 'away')
 * @returns {(*&{wins: number, draws: number, losses: number, goalsFor: number, goalsAgainst: number, points: number, goalDiff: number, form: []})[]}
 * @throws {LeagueDataError} If input data is invalid
 */
const calculateTable = (teams, schedule, tableType) => {
    if (!Array.isArray(teams) || teams.length === 0) {
        throw new LeagueDataError('Invalid teams data for table calculation', {
            teams,
            expectedType: 'Array'
        });
    }

    if (!Array.isArray(schedule)) {
        throw new LeagueDataError('Invalid schedule data', {
            schedule,
            expectedType: 'Array'
        });
    }

    const validTableTypes = ['overall', 'home', 'away'];
    if (!validTableTypes.includes(tableType)) {
        throw new LeagueDataError('Invalid table type', {
            tableType,
            validTypes: validTableTypes
        });
    }

    console.log(`📊 Berechne ${tableType} Tabelle...`);

    // Initialize table with fresh stats
    const table = teams.map(team => ({
        ...team,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        goalDiff: 0,
        form: []
    }));

    // Process only played matches
    const playedMatches = schedule.filter(m => m.hasBeenPlayed);
    console.log(`  → Verarbeite ${playedMatches.length} gespielte Spiele`);

    playedMatches.forEach(match => {
        const homeTeam = table.find(t => t.name === match.home.name);
        const awayTeam = table.find(t => t.name === match.away.name);

        // Update home team stats
        if (homeTeam && (tableType === 'overall' || tableType === 'home')) {
            homeTeam.goalsFor += match.homeGoals;
            homeTeam.goalsAgainst += match.awayGoals;

            if (match.homeGoals > match.awayGoals) {
                homeTeam.wins++;
                homeTeam.points += 3;
                if (tableType === 'overall') homeTeam.form.push('W');
            } else if (match.homeGoals === match.awayGoals) {
                homeTeam.draws++;
                homeTeam.points += 1;
                if (tableType === 'overall') homeTeam.form.push('D');
            } else {
                homeTeam.losses++;
                if (tableType === 'overall') homeTeam.form.push('L');
            }
        }

        // Update away team stats
        if (awayTeam && (tableType === 'overall' || tableType === 'away')) {
            awayTeam.goalsFor += match.awayGoals;
            awayTeam.goalsAgainst += match.homeGoals;

            if (match.awayGoals > match.homeGoals) {
                awayTeam.wins++;
                awayTeam.points += 3;
                if (tableType === 'overall') awayTeam.form.push('W');
            } else if (match.awayGoals === match.homeGoals) {
                awayTeam.draws++;
                awayTeam.points += 1;
                if (tableType === 'overall') awayTeam.form.push('D');
            } else {
                awayTeam.losses++;
                if (tableType === 'overall') awayTeam.form.push('L');
            }
        }
    });

    // Calculate goal difference and limit form history
    table.forEach(team => {
        team.goalDiff = team.goalsFor - team.goalsAgainst;
        team.form = team.form.slice(-CONFIG.FORM_HISTORY_LENGTH);
    });

    // Sort table by points, goal difference, goals scored
    table.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
    });

    // Filter out teams with no matches for home/away tables
    const filteredTable = tableType !== 'overall'
        ? table.filter(team => team.wins + team.draws + team.losses > 0)
        : table;

    console.log(`  ✓ Tabelle berechnet (${filteredTable.length} Teams)`);
    return filteredTable;
};

// =====================================================
// UI TEMPLATES - ES2025: Centralized & Reusable
// =====================================================

const UI_TEMPLATES = Object.freeze({
    /**
     * Team display template
     * @param {Team} team
     * @returns {string}
     */
    team: (team) => `
        <div class="team-logo-match">${team.emoji}</div>
        <div class="team-name-league">${team.name}</div>
        <div class="team-strength-league">⭐ ${team.strength}</div>
    `,

    /**
     * Match result badge
     * @param {Match} match
     * @param {boolean} isPlayerMatch
     * @returns {string}
     */
    resultBadge: (match, isPlayerMatch) => {
        if (!match.hasBeenPlayed || !isPlayerMatch) return '';

        const playerIsHome = match.home.isPlayer;
        const playerGoals = playerIsHome ? match.homeGoals : match.awayGoals;
        const opponentGoals = playerIsHome ? match.awayGoals : match.homeGoals;

        let resultClass, resultText;
        if (playerGoals > opponentGoals) {
            resultClass = 'result-win';
            resultText = CONFIG.RESULT_LABELS.WIN;
        } else if (playerGoals === opponentGoals) {
            resultClass = 'result-draw';
            resultText = CONFIG.RESULT_LABELS.DRAW;
        } else {
            resultClass = 'result-loss';
            resultText = CONFIG.RESULT_LABELS.LOSS;
        }

        return `
            <div class="match-result">
                <span class="match-result-badge ${resultClass}">${resultText}</span>
            </div>
        `;
    },

    /**
     * Match score or "vs" label
     * @param {Match} match
     * @returns {string}
     */
    matchScore: (match) => {
        if (match.hasBeenPlayed) {
            return `<div class="match-score">${match.homeGoals} : ${match.awayGoals}</div>`;
        }
        return '<div class="match-vs-label">vs</div>';
    },

    /**
     * Form indicators
     * @param {Array<'W'|'D'|'L'>} form
     * @returns {string}
     */
    formIndicators: (form) => {
        return form.map(result => {
            const className = result === 'W' ? 'win' : result === 'D' ? 'draw' : 'loss';
            const label = CONFIG.FORM_LABELS[result];
            return `<div class="form-indicator ${className}">${label}</div>`;
        }).join('');
    }
});

// =====================================================
// RENDERING FUNCTIONS - ES2025: With Error Boundaries
// =====================================================

/**
 * Render schedule for current matchday
 * ✅ ES2025: Error boundary with structured errors
 *
 * @param {Array<Match>} schedule
 * @throws {LeagueRenderError} If rendering fails
 */
const renderSchedule = (schedule) => {
    const container = document.getElementById('scheduleContainer');

    if (!container) {
        throw new LeagueRenderError('Schedule container not found', {
            elementId: 'scheduleContainer',
            schedule
        });
    }

    try {
        console.log(`🎨 Rendere Spielplan für Spieltag ${currentMatchday}...`);

        const matches = schedule.filter(m => m.matchday === currentMatchday);
        console.log(`  → ${matches.length} Spiele zu rendern`);

        container.innerHTML = matches.map(match => {
            const isPlayerMatch = match.home.isPlayer || match.away.isPlayer;

            return `
                <div class="match-card glass ${isPlayerMatch ? 'player-match' : ''}">
                    <div class="match-time">${match.date}</div>
                    <div class="match-teams">
                        <div class="match-team home ${match.home.isPlayer ? 'player-team' : ''}">
                            ${UI_TEMPLATES.team(match.home)}
                        </div>
                        
                        <div class="match-vs">
                            ${UI_TEMPLATES.matchScore(match)}
                        </div>
                        
                        <div class="match-team away ${match.away.isPlayer ? 'player-team' : ''}">
                            ${UI_TEMPLATES.team(match.away)}
                        </div>
                    </div>
                    ${UI_TEMPLATES.resultBadge(match, isPlayerMatch)}
                </div>
            `;
        }).join('');

        console.log(`  ✓ Spielplan gerendert`);
    } catch (error) {
        throw new LeagueRenderError('Failed to render schedule', {
            cause: error,
            matchday: currentMatchday,
            matchCount: schedule.length
        });
    }
};

/**
 * Render league table
 * ✅ ES2025: Error boundary with validation
 *
 * @param {Array<Team>} table
 * @throws {LeagueRenderError} If rendering fails
 */
const renderTable = (table) => {
    const tbody = document.querySelector('#leagueTable tbody');

    if (!tbody) {
        throw new LeagueRenderError('Table body not found', {
            selector: '#leagueTable tbody',
            table
        });
    }

    try {
        console.log(`🎨 Rendere Tabelle (${table.length} Teams)...`);

        tbody.innerHTML = table.map((entry, index) => {
            const position = index + 1;

            // Determine position class
            let positionClass = '';
            if (position <= CONFIG.POSITION_ZONES.CHAMPIONS_LEAGUE.end) {
                positionClass = 'pos-champions';
            } else if (position <= CONFIG.POSITION_ZONES.EUROPA_LEAGUE.end) {
                positionClass = 'pos-europa';
            } else if (position >= CONFIG.POSITION_ZONES.RELEGATION.start) {
                positionClass = 'pos-relegation';
            }

            const isPlayerRowClass = entry.isPlayer ? 'player-team' : '';
            const diffClass = entry.goalDiff > 0 ? 'positive' : entry.goalDiff < 0 ? 'negative' : '';

            return `
                <tr class="${isPlayerRowClass} ${positionClass}">
                    <td class="table-pos">${position}</td>
                    <td class="table-team">
                        <div class="table-team-cell">
                            <span class="table-team-logo">${entry.emoji}</span>
                            <span class="table-team-name">${entry.name}</span>
                        </div>
                    </td>
                    <td class="table-stat">${entry.wins + entry.draws + entry.losses}</td>
                    <td class="table-stat">${entry.wins}</td>
                    <td class="table-stat">${entry.draws}</td>
                    <td class="table-stat">${entry.losses}</td>
                    <td class="table-stat table-goals">${entry.goalsFor}:${entry.goalsAgainst}</td>
                    <td class="table-stat table-diff ${diffClass}">
                        ${entry.goalDiff >= 0 ? '+' : ''}${entry.goalDiff}
                    </td>
                    <td class="table-stat table-points">${entry.points}</td>
                    <td>
                        <div class="table-form">
                            ${UI_TEMPLATES.formIndicators(entry.form)}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        console.log(`  ✓ Tabelle gerendert`);
    } catch (error) {
        throw new LeagueRenderError('Failed to render table', {
            cause: error,
            tableType: currentTableType,
            teamCount: table.length
        });
    }
};

/**
 * Update matchday display and button states
 */
const updateMatchdayDisplay = () => {
    const display = document.getElementById('currentMatchday');
    if (display) {
        display.textContent = `Spieltag ${currentMatchday}`;
    }

    const prevBtn = document.getElementById('prevMatchday');
    const nextBtn = document.getElementById('nextMatchday');

    if (prevBtn) prevBtn.disabled = currentMatchday === 1;
    if (nextBtn) nextBtn.disabled = currentMatchday >= CONFIG.MAX_MATCHDAYS;
};

// =====================================================
// MAIN ACTIONS
// =====================================================

/**
 * Load league data and render
 * ✅ ES2025: Comprehensive error handling
 *
 * @param {number} leagueNumber
 */
const loadLeague = (leagueNumber) => {
    try {
        console.log(`🏆 Lade Liga ${leagueNumber}...`);
        currentLeague = leagueNumber;

        const teams = generateLeagueTeams(leagueNumber);
        const schedule = generateSchedule(teams);

        renderSchedule(schedule);
        updateMatchdayDisplay();

        const table = calculateTable(teams, schedule, currentTableType);
        renderTable(table);

        // Update active button
        document.querySelectorAll('.league-selector-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.league) === leagueNumber);
        });

        console.log(`✅ Liga ${leagueNumber} erfolgreich geladen`);
    } catch (error) {
        const wrappedError = new Error(`Failed to load league ${leagueNumber}`);
        wrappedError.cause = error;
        console.error('❌ Fehler beim Laden der Liga:', error);
        throw wrappedError;
    }
};

/**
 * Change matchday and refresh display
 * ✅ ES2025: Validation and error handling
 *
 * @param {number} direction - Direction to change (-1 or +1)
 */
const changeMatchday = (direction) => {
    const newMatchday = currentMatchday + direction;

    if (newMatchday < 1 || newMatchday > CONFIG.MAX_MATCHDAYS) {
        console.warn(`⚠️ Ungültiger Spieltag: ${newMatchday}`);
        return;
    }

    try {
        console.log(`📅 Wechsle zu Spieltag ${newMatchday}...`);
        currentMatchday = newMatchday;

        // Regenerate data with new matchday
        const teams = generateLeagueTeams(currentLeague);
        const schedule = generateSchedule(teams);

        renderSchedule(schedule);
        updateMatchdayDisplay();

        const table = calculateTable(teams, schedule, currentTableType);
        renderTable(table);

        console.log(`✅ Spieltag ${newMatchday} geladen`);
    } catch (error) {
        const wrappedError = new Error(`Failed to change matchday to ${newMatchday}`);
        wrappedError.cause = error;
        console.error('❌ Fehler beim Spieltagwechsel:', error);
        throw wrappedError;
    }
};

/**
 * Change table type (overall/home/away)
 * ✅ ES2025: Validation
 *
 * @param {string} type - Table type
 */
const changeTableType = (type) => {
    const validTypes = ['overall', 'home', 'away'];

    if (!validTypes.includes(type)) {
        console.warn(`⚠️ Ungültiger Tabellentyp: ${type}`);
        return;
    }

    try {
        console.log(`📊 Wechsle zu ${type} Tabelle...`);
        currentTableType = type;

        document.querySelectorAll('.table-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.table === type);
        });

        const teams = generateLeagueTeams(currentLeague);
        const schedule = generateSchedule(teams);
        const table = calculateTable(teams, schedule, type);

        renderTable(table);
        console.log(`✅ ${type} Tabelle geladen`);
    } catch (error) {
        const wrappedError = new Error(`Failed to change table type to ${type}`);
        wrappedError.cause = error;
        console.error('❌ Fehler beim Tabellenwechsel:', error);
        throw wrappedError;
    }
};

// =====================================================
// EVENT LISTENERS - ES2025: AbortController Pattern
// =====================================================

/**
 * Initialize event listeners with AbortController
 * ✅ ES2025: Automatic cleanup via signal
 */
const initEventListeners = () => {
    const signal = leagueAbortController.signal;

    console.log('🎧 Registriere Event Listener...');

    // League selector buttons
    document.querySelectorAll('.league-selector-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const league = parseInt(btn.dataset.league);
            loadLeague(league);
        }, {signal});
    });

    // Matchday navigation
    const prevBtn = document.getElementById('prevMatchday');
    const nextBtn = document.getElementById('nextMatchday');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => changeMatchday(-1), {signal});
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => changeMatchday(1), {signal});
    }

    // Table tabs
    document.querySelectorAll('.table-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.table;
            changeTableType(type);
        }, {signal});
    });

    console.log('  ✓ Event Listener registriert');
};

// =====================================================
// MODULE LIFECYCLE - EXPORT für ModuleManager
// =====================================================

/**
 * Initialize League System
 * ✅ ES2025: Error boundary at module level
 *
 * @export
 */
export function init() {
    try {
        console.log('🚀 Initialisiere League System...');

        initEventListeners();

        // Simulate matchday 2 to show played matches in table
        if (currentMatchday === 1) {
            changeMatchday(1);
        }

        loadLeague(1);

        console.log('✅ League System initialisiert');
    } catch (error) {
        const wrappedError = new Error('League system initialization failed');
        wrappedError.cause = error;
        console.error('❌ Kritischer Fehler bei League-Initialisierung:', error);
        throw wrappedError;
    }
}

/**
 * Cleanup beim Verlassen
 * ✅ ES2025: AbortController für automatisches Event Cleanup
 *
 * @export
 */
export function cleanup() {
    console.log('🧹 League System Cleanup...');

    // ✅ ES2025: Ein Aufruf entfernt ALLE Event Listener
    leagueAbortController.abort();
    leagueAbortController = new AbortController();

    // Reset state
    currentLeague = 1;
    currentMatchday = 1;
    currentTableType = 'overall';

    console.log('✅ League System cleanup abgeschlossen');
}
