// =====================================================
// KICKERSCUP - LEAGUE SYSTEM
// Liga, Spielplan & Tabellen Management
// =====================================================

(function () {
    'use strict';

    const LeagueSystem = (() => {
        // Private State
        let currentLeague = 1;
        let currentMatchday = 1;
        let currentTableType = 'overall'; // 'overall', 'home', 'away'
        let eventListeners = [];

        // Team Emojis Pool
        const teamEmojis = ['⚽', '🔥', '⚡', '⭐', '🏆', '⚔️', '🛡️', '👑', '💎', '🎯',
            '🦁', '🦅', '🐉', '🐺', '🐯', '🦈', '🦖', '🦄'];

        /**
         * Generate League Teams
         */
        function generateLeagueTeams(leagueNumber) {
            const baseNames = [
                'FC Thunder', 'FC Phoenix', 'FC Lightning', 'FC Warriors',
                'FC Defenders', 'FC Storm', 'FC Titans', 'FC Dragons',
                'FC Eagles', 'FC Lions', 'FC Sharks', 'FC Wolves',
                'FC Knights', 'FC Vikings', 'FC Spartans', 'FC Gladiators',
                'FC Dynamo', 'FC United'
            ];

            return baseNames.map((name, index) => {
                const isPlayerTeam = leagueNumber === 1 && index === 2; // Player team in Liga 1

                return {
                    id: index + 1,
                    name: isPlayerTeam ? 'FC Thunderbolts' : name,
                    emoji: teamEmojis[index % teamEmojis.length],
                    isPlayer: isPlayerTeam,
                    strength: isPlayerTeam ? 1842 : Math.floor(Math.random() * 500) + 1500
                };
            });
        }

        /**
         * Generate Match Schedule (17 Matchdays)
         */
        function generateSchedule(teams) {
            const schedule = [];
            const numTeams = teams.length;

            // Simple round-robin algorithm
            for (let matchday = 1; matchday <= 17; matchday++) {
                const matches = [];

                for (let i = 0; i < numTeams / 2; i++) {
                    const homeIndex = (matchday + i) % numTeams;
                    const awayIndex = (numTeams - 1 - i + matchday) % numTeams;

                    const home = teams[homeIndex];
                    const away = teams[awayIndex];

                    // Generate realistic score if match has been played
                    const hasBeenPlayed = matchday <= 11; // First 11 matchdays played
                    let homeGoals = 0;
                    let awayGoals = 0;

                    if (hasBeenPlayed) {
                        homeGoals = Math.floor(Math.random() * 4);
                        awayGoals = Math.floor(Math.random() * 4);
                    }

                    matches.push({
                        matchday,
                        home,
                        away,
                        homeGoals: hasBeenPlayed ? homeGoals : null,
                        awayGoals: hasBeenPlayed ? awayGoals : null,
                        hasBeenPlayed,
                        date: hasBeenPlayed ?
                            `Gespielt am ${String(matchday).padStart(2, '0')}.${String(Math.floor(Math.random() * 2) + 10).padStart(2, '0')}.2024` :
                            `${String(matchday + 11).padStart(2, '0')}.${String(Math.floor(Math.random() * 2) + 1).padStart(2, '0')}.2025 - 15:30 Uhr`
                    });
                }

                schedule.push(...matches);
            }

            return schedule;
        }

        /**
         * Calculate Table from Schedule
         */
        function calculateTable(teams, schedule, type = 'overall') {
            const table = teams.map(team => ({
                team,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDiff: 0,
                points: 0,
                form: [] // Last 5 results
            }));

            schedule.forEach(match => {
                if (!match.hasBeenPlayed) return;

                const homeTeam = table.find(t => t.team.id === match.home.id);
                const awayTeam = table.find(t => t.team.id === match.away.id);

                if (!homeTeam || !awayTeam) return;

                // Filter by type
                if (type === 'home' && match.home.id !== homeTeam.team.id) return;
                if (type === 'away' && match.away.id !== awayTeam.team.id) return;

                // Update home team
                if (type === 'overall' || type === 'home') {
                    homeTeam.played++;
                    homeTeam.goalsFor += match.homeGoals;
                    homeTeam.goalsAgainst += match.awayGoals;

                    if (match.homeGoals > match.awayGoals) {
                        homeTeam.wins++;
                        homeTeam.points += 3;
                        homeTeam.form.push('W');
                    } else if (match.homeGoals === match.awayGoals) {
                        homeTeam.draws++;
                        homeTeam.points += 1;
                        homeTeam.form.push('D');
                    } else {
                        homeTeam.losses++;
                        homeTeam.form.push('L');
                    }
                }

                // Update away team
                if (type === 'overall' || type === 'away') {
                    awayTeam.played++;
                    awayTeam.goalsFor += match.awayGoals;
                    awayTeam.goalsAgainst += match.homeGoals;

                    if (match.awayGoals > match.homeGoals) {
                        awayTeam.wins++;
                        awayTeam.points += 3;
                        awayTeam.form.push('W');
                    } else if (match.awayGoals === match.homeGoals) {
                        awayTeam.draws++;
                        awayTeam.points += 1;
                        awayTeam.form.push('D');
                    } else {
                        awayTeam.losses++;
                        awayTeam.form.push('L');
                    }
                }
            });

            // Calculate goal difference and limit form to last 5
            table.forEach(team => {
                team.goalDiff = team.goalsFor - team.goalsAgainst;
                team.form = team.form.slice(-5);
            });

            // Sort table
            table.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
                return b.goalsFor - a.goalsFor;
            });

            return table;
        }

        /**
         * Render Schedule for current matchday
         */
        function renderSchedule(schedule) {
            const container = document.getElementById('scheduleContainer');
            if (!container) return;

            const matches = schedule.filter(m => m.matchday === currentMatchday);

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
                                <div class="team-logo-match">${match.home.emoji}</div>
                                <div class="team-name-league">${match.home.name}</div>
                                <div class="team-strength-league">⭐ ${match.home.strength}</div>
                            </div>
                            
                            <div class="match-vs">
                                ${hasResult ?
                    `<div class="match-score">
                                        <span>${match.homeGoals}</span>
                                        <span>:</span>
                                        <span>${match.awayGoals}</span>
                                    </div>` :
                    'VS'
                }
                            </div>
                            
                            <div class="match-team away ${match.away.isPlayer ? 'player-team' : ''}">
                                <div class="team-logo-match">${match.away.emoji}</div>
                                <div class="team-name-league">${match.away.name}</div>
                                <div class="team-strength-league">⭐ ${match.away.strength}</div>
                            </div>
                        </div>
                        ${resultBadge}
                    </div>
                `;
            }).join('');
        }

        /**
         * Render League Table
         */
        function renderTable(table) {
            const tbody = document.getElementById('tableBody');
            if (!tbody) return;

            tbody.innerHTML = table.map((entry, index) => {
                const position = index + 1;
                let positionClass = '';

                // Position indicators (assuming 18 teams)
                if (position <= 2) positionClass = 'pos-champions';
                else if (position <= 4) positionClass = 'pos-europa';
                else if (position >= table.length - 1) positionClass = 'pos-relegation';

                const diffClass = entry.goalDiff > 0 ? 'positive' : entry.goalDiff < 0 ? 'negative' : '';

                return `
                    <tr class="${entry.team.isPlayer ? 'player-team' : ''} ${positionClass}">
                        <td class="table-position">${position}</td>
                        <td>
                            <div class="table-team-cell">
                                <span class="table-team-logo">${entry.team.emoji}</span>
                                <span class="table-team-name">${entry.team.name}</span>
                            </div>
                        </td>
                        <td class="table-stat">${entry.played}</td>
                        <td class="table-stat">${entry.wins}</td>
                        <td class="table-stat">${entry.draws}</td>
                        <td class="table-stat">${entry.losses}</td>
                        <td class="table-stat table-goals">${entry.goalsFor}:${entry.goalsAgainst}</td>
                        <td class="table-stat table-diff ${diffClass}">${entry.goalDiff > 0 ? '+' : ''}${entry.goalDiff}</td>
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
        }

        /**
         * Update Matchday Display
         */
        function updateMatchdayDisplay() {
            const display = document.getElementById('currentMatchday');
            if (display) {
                display.textContent = `Spieltag ${currentMatchday}`;
            }

            // Update navigation buttons
            const prevBtn = document.getElementById('prevMatchday');
            const nextBtn = document.getElementById('nextMatchday');

            if (prevBtn) prevBtn.disabled = currentMatchday === 1;
            if (nextBtn) nextBtn.disabled = currentMatchday === 17;
        }

        /**
         * Load League Data
         */
        function loadLeague(leagueNumber) {
            currentLeague = leagueNumber;

            // Generate teams and schedule
            const teams = generateLeagueTeams(leagueNumber);
            const schedule = generateSchedule(teams);

            // Render schedule
            renderSchedule(schedule);
            updateMatchdayDisplay();

            // Calculate and render table
            const table = calculateTable(teams, schedule, currentTableType);
            renderTable(table);

            // Update league selector buttons
            document.querySelectorAll('.league-selector-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.league) === leagueNumber);
            });

            console.log(`✅ Liga ${leagueNumber} geladen`);
        }

        /**
         * Change Matchday
         */
        function changeMatchday(direction) {
            const newMatchday = currentMatchday + direction;
            if (newMatchday < 1 || newMatchday > 17) return;

            currentMatchday = newMatchday;

            const teams = generateLeagueTeams(currentLeague);
            const schedule = generateSchedule(teams);

            renderSchedule(schedule);
            updateMatchdayDisplay();
        }

        /**
         * Change Table Type
         */
        function changeTableType(type) {
            currentTableType = type;

            // Update tab buttons
            document.querySelectorAll('.table-tab').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.table === type);
            });

            // Recalculate and render table
            const teams = generateLeagueTeams(currentLeague);
            const schedule = generateSchedule(teams);
            const table = calculateTable(teams, schedule, type);
            renderTable(table);
        }

        /**
         * Helper: Event Listener registrieren (für Cleanup)
         */
        function addEventListener(element, event, handler, options) {
            if (!element) return;
            element.addEventListener(event, handler, options);
            eventListeners.push({element, event, handler, options});
        }

        /**
         * Initialize Event Listeners
         */
        function initEventListeners() {
            // League selector
            document.querySelectorAll('.league-selector-btn').forEach(btn => {
                addEventListener(btn, 'click', () => {
                    const league = parseInt(btn.dataset.league);
                    currentMatchday = 1; // Reset to matchday 1 when changing league
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
        }

        /**
         * Initialize League System
         */
        function init() {
            // Load initial league (Liga 1)
            loadLeague(1);

            // Setup event listeners
            initEventListeners();

            console.log('✅ League System initialisiert');
        }

        /**
         * Cleanup beim Verlassen
         */
        function cleanup() {
            // Remove all event listeners
            eventListeners.forEach(({element, event, handler, options}) => {
                if (element) {
                    element.removeEventListener(event, handler, options);
                }
            });
            eventListeners = [];

            // Reset state
            currentLeague = 1;
            currentMatchday = 1;
            currentTableType = 'overall';

            console.log('🧹 League System Cleanup durchgeführt');
        }

        // Public API
        return {
            init,
            cleanup
        };
    })();

    // Expose für ModuleManager
    window.__KICKERSCUP_MODULE__ = LeagueSystem;

})();