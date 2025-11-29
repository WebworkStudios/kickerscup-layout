// =====================================================
// KICKERSCUP - LEAGUE SYSTEM (ESM) - KORRIGIERT
// Symmetrie der Match-Card und Team-Reihenfolge
// =====================================================

// State Management
let currentLeague = 1;
let currentMatchday = 1;
let currentTableType = 'overall';
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
 * Generates league teams with player team
 */
const generateLeagueTeams = (leagueNumber) => {
    const teams = [
        { name: 'FC Thunderbolts', emoji: '⚡', strength: 8, isPlayer: true },
        { name: 'Bayern München', emoji: '🔴', strength: 9 },
        { name: 'Borussia Dortmund', emoji: '🟡', strength: 8 },
        { name: 'RB Leipzig', emoji: '⚪', strength: 7 },
        { name: 'Bayer Leverkusen', emoji: '🔴', strength: 7 },
        { name: 'Union Berlin', emoji: '🔴', strength: 6 },
        { name: 'SC Freiburg', emoji: '⚫', strength: 6 },
        { name: 'Eintracht Frankfurt', emoji: '🦅', strength: 7 },
        { name: 'VfL Wolfsburg', emoji: '🟢', strength: 6 },
        { name: 'Borussia M\'gladbach', emoji: '⚫', strength: 6 },
        { name: 'FSV Mainz 05', emoji: '🔴', strength: 5 },
        { name: 'VfL Bochum', emoji: '🔵', strength: 5 },
        { name: 'FC Augsburg', emoji: '🟢', strength: 5 },
        { name: 'TSG Hoffenheim', emoji: '🔵', strength: 6 },
        { name: 'VfB Stuttgart', emoji: '🔴', strength: 6 },
        { name: 'Werder Bremen', emoji: '🟢', strength: 5 },
        { name: 'FC Köln', emoji: '🔴', strength: 5 },
        { name: 'Hertha BSC', emoji: '🔵', strength: 4 }
    ];

    // Adjust strength based on league
    return teams.map(team => ({
        ...team,
        strength: Math.max(1, team.strength - (leagueNumber - 1)),
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        form: []
    }));
};

/**
 * Generates full season schedule
 */
const generateSchedule = (teams) => {
    const schedule = [];
    const matchdates = [
        'Sa. 15:30',
        'Sa. 18:30',
        'So. 15:30',
        'So. 17:30'
    ];

    // 17 matchdays (each team plays every other team once)
    for (let matchday = 1; matchday <= 17; matchday++) {
        const matches = [];
        const teamsUsed = new Set();

        for (let i = 0; i < teams.length; i++) {
            if (teamsUsed.has(i)) continue;

            for (let j = i + 1; j < teams.length; j++) {
                if (teamsUsed.has(j)) continue;
                if (matches.length >= 9) break;

                const match = {
                    matchday,
                    home: teams[i],
                    away: teams[j],
                    date: matchdates[matches.length % matchdates.length],
                    hasBeenPlayed: matchday < currentMatchday,
                    homeGoals: 0,
                    awayGoals: 0
                };

                if (match.hasBeenPlayed) {
                    const homeScore = Math.floor(Math.random() * 4);
                    const awayScore = Math.floor(Math.random() * 4);
                    match.homeGoals = homeScore;
                    match.awayGoals = awayScore;
                }

                matches.push(match);
                teamsUsed.add(i);
                teamsUsed.add(j);
                break;
            }
        }

        schedule.push(...matches);
    }

    return schedule;
};

/**
 * Calculate league table
 */
const calculateTable = (teams, schedule, tableType) => {
    const table = teams.map(team => ({
        ...team,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        form: []
    }));

    // Nur gespielte Spiele berücksichtigen
    schedule.filter(m => m.hasBeenPlayed).forEach(match => {
        const homeTeam = table.find(t => t.name === match.home.name);
        const awayTeam = table.find(t => t.name === match.away.name);

        // --- Home Team Update Logic ---
        if (tableType === 'overall' || tableType === 'home') {
            if (homeTeam) {
                homeTeam.goalsFor += match.homeGoals;
                homeTeam.goalsAgainst += match.awayGoals;

                if (match.homeGoals > match.awayGoals) {
                    homeTeam.wins++;
                    homeTeam.points += 3;
                } else if (match.homeGoals === match.awayGoals) {
                    homeTeam.draws++;
                    homeTeam.points += 1;
                } else {
                    homeTeam.losses++;
                }
                // Form wird nur für Gesamttabelle aktualisiert, um Komplexität zu vermeiden
                if (tableType === 'overall') {
                    homeTeam.form.push(match.homeGoals > match.awayGoals ? 'W' : match.homeGoals === match.awayGoals ? 'D' : 'L');
                }
            }
        }
        
        // --- Away Team Update Logic ---
        if (tableType === 'overall' || tableType === 'away') {
            if (awayTeam) {
                awayTeam.goalsFor += match.awayGoals;
                awayTeam.goalsAgainst += match.homeGoals;

                if (match.awayGoals > match.homeGoals) {
                    awayTeam.wins++;
                    awayTeam.points += 3;
                } else if (match.awayGoals === match.homeGoals) {
                    awayTeam.draws++;
                    awayTeam.points += 1;
                } else {
                    awayTeam.losses++;
                }
                // Form wird nur für Gesamttabelle aktualisiert, um Komplexität zu vermeiden
                if (tableType === 'overall') {
                    awayTeam.form.push(match.awayGoals > match.homeGoals ? 'W' : match.awayGoals === match.homeGoals ? 'D' : 'L');
                }
            }
        }
    });

    // Calculate goal difference and limit form to last 5
    table.forEach(team => {
        team.goalDiff = team.goalsFor - team.goalsAgainst;
        // Form muss nach der Berechnung der Punkte für alle Spiele begrenzt werden.
        team.form = team.form.slice(-5);
    });

    // Sort table
    table.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
    });

    // Filter out teams with 0 points/stats if a table type is selected, 
    // but keep all for 'overall' (Important for correct player-team visibility)
    if (tableType !== 'overall') {
        return table.filter(team => team.wins + team.draws + team.losses > 0);
    }
    
    return table;
};

/**
 * Render Schedule for current matchday
 */
const renderSchedule = (schedule) => {
    const container = document.getElementById('scheduleContainer');
    if (!container) return;

    const matches = schedule.filter(m => m.matchday === currentMatchday);

    // NEU: Template für eine symmetrische Team-Anzeige (Logo -> Name -> Stärke)
    const teamTemplate = (team) => `
        <div class="team-logo-match">${team.emoji}</div>
        <div class="team-name-league">${team.name}</div>
        <div class="team-strength-league">⭐ ${team.strength}</div>
    `;

    container.innerHTML = matches.map(match => {
        const isPlayerMatch = match.home.isPlayer || match.away.isPlayer;
        const hasResult = match.hasBeenPlayed;

        let resultBadge = '';
        if (hasResult && isPlayerMatch) {
            const playerIsHome = match.home.isPlayer;
            const playerGoals = playerIsHome ? match.homeGoals : match.awayGoals;
            const opponentGoals = playerIsHome ? match.awayGoals : match.homeGoals;

            if (playerGoals > opponentGoals) {
                resultBadge = '<div class="match-result"><span class="match-result-badge result-win">Sieg</span></div>';
            } else if (playerGoals === opponentGoals) {
                resultBadge = '<div class="match-result"><span class="match-result-badge result-draw">Unentschieden</span></div>';
            } else {
                resultBadge = '<div class="match-result"><span class="match-result-badge result-loss">Niederlage</span></div>';
            }
        }

        return `
            <div class="match-card glass ${isPlayerMatch ? 'player-match' : ''}">
                <div class="match-time">${match.date}</div>
                <div class="match-teams">
                    <div class="match-team home ${match.home.isPlayer ? 'player-team' : ''}">
                        ${teamTemplate(match.home)}
                    </div>
                    
                    <div class="match-vs">
                        ${hasResult ? 
                            `<div class="match-score">${match.homeGoals} : ${match.awayGoals}</div>` : 
                            '<div class="match-vs-label">vs</div>'}
                    </div>
                    
                    <div class="match-team away ${match.away.isPlayer ? 'player-team' : ''}">
                        ${teamTemplate(match.away)}
                    </div>
                </div>
                ${resultBadge}
            </div>
        `;
    }).join('');
};

/**
 * Render League Table
 */
const renderTable = (table) => {
    const tbody = document.querySelector('#leagueTable tbody');
    if (!tbody) return;

    tbody.innerHTML = table.map((entry, index) => {
        const position = index + 1;
        
        // Korrigierte Logik für Positions-Klassen (entsprechend league.css)
        let positionClass = '';
        if (position <= 2) {
            positionClass = 'pos-champions';
        } else if (position <= 6) {
            positionClass = 'pos-europa';
        } else if (position >= 16) {
            positionClass = 'pos-relegation';
        }
        
        // Korrigierte Klasse: 'player-team' statt 'player-row'
        const isPlayerRowClass = entry.isPlayer ? 'player-team' : '';

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
                <td class="table-stat table-diff ${entry.goalDiff > 0 ? 'positive' : entry.goalDiff < 0 ? 'negative' : ''}">${entry.goalDiff >= 0 ? '+' : ''}${entry.goalDiff}</td>
                <td class="table-stat table-points">${entry.points}</td>
                <td>
                    <div class="table-form">
                        ${entry.form.map(result => {
                            const className = result === 'W' ? 'win' : result === 'D' ? 'draw' : 'loss';
                            const label = result === 'W' ? 'S' : result === 'D' ? 'U' : 'N';
                            return `<div class="form-indicator ${className}">${label}</div>`;
                        }).join('')}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};


/**
 * Update Matchday Display
 */
const updateMatchdayDisplay = () => {
    const display = document.getElementById('currentMatchday');
    if (display) {
        display.textContent = `Spieltag ${currentMatchday}`;
    }

    const prevBtn = document.getElementById('prevMatchday');
    const nextBtn = document.getElementById('nextMatchday');

    // 17 Spieltage in der Hinrunde, insgesamt 34 (hier nur 17 generiert)
    if (prevBtn) prevBtn.disabled = currentMatchday === 1;
    if (nextBtn) nextBtn.disabled = currentMatchday >= 17; 
};

/**
 * Load League Data
 */
const loadLeague = (leagueNumber) => {
    currentLeague = leagueNumber;

    // Daten werden bei jedem Wechsel neu generiert
    const teams = generateLeagueTeams(leagueNumber);
    const schedule = generateSchedule(teams);

    renderSchedule(schedule);
    updateMatchdayDisplay();

    // Tabelle mit aktuellem Typ laden
    const table = calculateTable(teams, schedule, currentTableType);
    renderTable(table);

    document.querySelectorAll('.league-selector-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.league) === leagueNumber);
    });
};

/**
 * Change Matchday
 */
const changeMatchday = (direction) => {
    const newMatchday = currentMatchday + direction;
    // Max. 17 Spieltage für die generierte Hinrunde
    if (newMatchday < 1 || newMatchday > 17) return; 

    currentMatchday = newMatchday;

    // Erneute Generierung der Daten ist nötig, da sich der gespielte Zustand (hasBeenPlayed) ändert
    const teams = generateLeagueTeams(currentLeague);
    const schedule = generateSchedule(teams);

    renderSchedule(schedule);
    updateMatchdayDisplay();
    
    // Tabelle ebenfalls neu berechnen, da sich die gespielten Spiele ändern
    const table = calculateTable(teams, schedule, currentTableType);
    renderTable(table);
};

/**
 * Change Table Type
 */
const changeTableType = (type) => {
    currentTableType = type;

    document.querySelectorAll('.table-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.table === type);
    });

    // Tabelle neu berechnen
    const teams = generateLeagueTeams(currentLeague);
    const schedule = generateSchedule(teams);
    const table = calculateTable(teams, schedule, type);

    renderTable(table);
};

/**
 * Initialize Event Listeners
 */
const initEventListeners = () => {
    // League selector buttons
    document.querySelectorAll('.league-selector-btn').forEach(btn => {
        addEventListener(btn, 'click', () => {
            const league = parseInt(btn.dataset.league);
            loadLeague(league);
        });
    });

    // Matchday navigation
    const prevBtn = document.getElementById('prevMatchday');
    const nextBtn = document.getElementById('nextMatchday');

    if (prevBtn) addEventListener(prevBtn, 'click', () => changeMatchday(-1));
    if (nextBtn) addEventListener(nextBtn, 'click', () => changeMatchday(1));

    // Table tabs
    document.querySelectorAll('.table-tab').forEach(btn => {
        addEventListener(btn, 'click', () => {
            const type = btn.dataset.table;
            changeTableType(type);
        });
    });
};

/**
 * Initialize League System
 * EXPORT für ModuleManager
 */
export function init() {
    initEventListeners();
    
    // SIMULATION: currentMatchday auf 2 setzen, 
    // damit Spieltag 1 als 'gespielt' gilt und die Tabelle gefüllt wird.
    if (currentMatchday === 1) {
        changeMatchday(1); 
    }
    
    loadLeague(1); 
}

/**
 * Cleanup beim Verlassen
 * EXPORT für ModuleManager
 */
export function cleanup() {
    // Remove all event listeners
    eventListeners.forEach(({ element, event, handler, options }) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners.length = 0;

    // Reset state
    currentLeague = 1;
    currentMatchday = 1;
    currentTableType = 'overall';
}