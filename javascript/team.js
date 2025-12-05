// =====================================================
// KICKERSCUP - TEAM MANAGEMENT SYSTEM (ESM)
// Mit Tab-System und erweiterten Statistiken
// =====================================================

// Private State
let players = [];
let currentSort = 'lineup';
const eventListeners = [];

// Mock-Daten mit erweiterten Statistiken (Saison & Karriere)
const mockPlayers = [
    {
        id: 1, firstName: 'Max', lastName: 'Müller', position: 'TW', age: 28,
        strength: 8, stamina: 90, form: 25, freshness: 95, motivation: 10,
        contractYears: 3, gamesPlayed: 145, status: 'OK', isStarter: true, isCaptain: false,
        // Saisonstatistiken
        seasonStats: { goals: 0, assists: 1, yellowCards: 2, yellowRedCards: 0, redCards: 0, games: 12, minutes: 1080 },
        // Karrierestatistiken
        careerStats: { goals: 0, assists: 8, yellowCards: 23, yellowRedCards: 1, redCards: 0, games: 145, minutes: 13050 }
    },
    {
        id: 2, firstName: 'Tom', lastName: 'Schmidt', position: 'LV', age: 25,
        strength: 7, stamina: 85, form: 22, freshness: 90, motivation: 9,
        contractYears: 2, gamesPlayed: 98, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: { goals: 1, assists: 3, yellowCards: 3, yellowRedCards: 0, redCards: 0, games: 11, minutes: 945 },
        careerStats: { goals: 4, assists: 18, yellowCards: 32, yellowRedCards: 2, redCards: 1, games: 98, minutes: 8234 }
    },
    {
        id: 3, firstName: 'Leon', lastName: 'Wagner', position: 'IV', age: 29,
        strength: 9, stamina: 82, form: 27, freshness: 88, motivation: 10,
        contractYears: 4, gamesPlayed: 187, status: 'OK', isStarter: true, isCaptain: true,
        seasonStats: { goals: 2, assists: 0, yellowCards: 4, yellowRedCards: 1, redCards: 0, games: 12, minutes: 1080 },
        careerStats: { goals: 12, assists: 5, yellowCards: 54, yellowRedCards: 3, redCards: 2, games: 187, minutes: 16245 }
    },
    {
        id: 4, firstName: 'Felix', lastName: 'Fischer', position: 'IV', age: 27,
        strength: 8, stamina: 84, form: 24, freshness: 92, motivation: 9,
        contractYears: 3, gamesPlayed: 142, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: { goals: 1, assists: 1, yellowCards: 2, yellowRedCards: 0, redCards: 0, games: 12, minutes: 1080 },
        careerStats: { goals: 8, assists: 7, yellowCards: 41, yellowRedCards: 1, redCards: 1, games: 142, minutes: 12456 }
    },
    {
        id: 5, firstName: 'Lukas', lastName: 'Becker', position: 'RV', age: 24,
        strength: 7, stamina: 88, form: 21, freshness: 93, motivation: 9,
        contractYears: 2, gamesPlayed: 76, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: { goals: 0, assists: 4, yellowCards: 1, yellowRedCards: 0, redCards: 0, games: 12, minutes: 1080 },
        careerStats: { goals: 2, assists: 14, yellowCards: 18, yellowRedCards: 0, redCards: 0, games: 76, minutes: 6345 }
    },
    {
        id: 6, firstName: 'Jonas', lastName: 'Hoffmann', position: 'DM', age: 26,
        strength: 8, stamina: 86, form: 23, freshness: 89, motivation: 9,
        contractYears: 3, gamesPlayed: 112, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: { goals: 1, assists: 2, yellowCards: 5, yellowRedCards: 0, redCards: 0, games: 12, minutes: 1080 },
        careerStats: { goals: 6, assists: 15, yellowCards: 38, yellowRedCards: 2, redCards: 0, games: 112, minutes: 9567 }
    },
    {
        id: 7, firstName: 'Tim', lastName: 'Weber', position: 'DM', age: 28,
        strength: 8, stamina: 84, form: 24, freshness: 87, motivation: 10,
        contractYears: 4, gamesPlayed: 156, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: { goals: 2, assists: 3, yellowCards: 3, yellowRedCards: 0, redCards: 0, games: 12, minutes: 1080 },
        careerStats: { goals: 11, assists: 22, yellowCards: 45, yellowRedCards: 1, redCards: 1, games: 156, minutes: 13234 }
    },
    {
        id: 8, firstName: 'Paul', lastName: 'Schneider', position: 'LM', age: 23,
        strength: 7, stamina: 89, form: 20, freshness: 94, motivation: 8,
        contractYears: 2, gamesPlayed: 54, status: 'verletzt', isStarter: true, isCaptain: false,
        seasonStats: { goals: 3, assists: 5, yellowCards: 1, yellowRedCards: 0, redCards: 0, games: 9, minutes: 687 },
        careerStats: { goals: 14, assists: 18, yellowCards: 12, yellowRedCards: 0, redCards: 0, games: 54, minutes: 4234 }
    },
    {
        id: 9, firstName: 'David', lastName: 'Richter', position: 'OM', age: 27,
        strength: 9, stamina: 83, form: 26, freshness: 88, motivation: 10,
        contractYears: 3, gamesPlayed: 134, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: { goals: 5, assists: 8, yellowCards: 2, yellowRedCards: 0, redCards: 0, games: 12, minutes: 1080 },
        careerStats: { goals: 34, assists: 45, yellowCards: 28, yellowRedCards: 1, redCards: 0, games: 134, minutes: 11456 }
    },
    {
        id: 10, firstName: 'Marco', lastName: 'Klein', position: 'RM', age: 25,
        strength: 7, stamina: 87, form: 22, freshness: 91, motivation: 9,
        contractYears: 2, gamesPlayed: 89, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: { goals: 2, assists: 6, yellowCards: 2, yellowRedCards: 0, redCards: 0, games: 12, minutes: 1080 },
        careerStats: { goals: 18, assists: 23, yellowCards: 19, yellowRedCards: 0, redCards: 0, games: 89, minutes: 7234 }
    },
    {
        id: 11, firstName: 'Kevin', lastName: 'Krause', position: 'ST', age: 29,
        strength: 9, stamina: 81, form: 28, freshness: 86, motivation: 11,
        contractYears: 4, gamesPlayed: 189, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: { goals: 9, assists: 4, yellowCards: 3, yellowRedCards: 0, redCards: 0, games: 12, minutes: 1080 },
        careerStats: { goals: 87, assists: 28, yellowCards: 34, yellowRedCards: 2, redCards: 1, games: 189, minutes: 15678 }
    },
    {
        id: 12, firstName: 'Jan', lastName: 'Meyer', position: 'TW', age: 22,
        strength: 6, stamina: 88, form: 18, freshness: 96, motivation: 8,
        contractYears: 1, gamesPlayed: 23, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: { goals: 0, assists: 0, yellowCards: 0, yellowRedCards: 0, redCards: 0, games: 0, minutes: 0 },
        careerStats: { goals: 0, assists: 2, yellowCards: 3, yellowRedCards: 0, redCards: 0, games: 23, minutes: 2070 }
    },
    {
        id: 13, firstName: 'Niklas', lastName: 'Koch', position: 'IV', age: 24,
        strength: 7, stamina: 85, form: 19, freshness: 92, motivation: 8,
        contractYears: 2, gamesPlayed: 67, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: { goals: 0, assists: 0, yellowCards: 1, yellowRedCards: 0, redCards: 0, games: 3, minutes: 124 },
        careerStats: { goals: 3, assists: 2, yellowCards: 15, yellowRedCards: 1, redCards: 0, games: 67, minutes: 5234 }
    },
    {
        id: 14, firstName: 'Ben', lastName: 'Wolf', position: 'DM', age: 21,
        strength: 6, stamina: 90, form: 17, freshness: 97, motivation: 7,
        contractYears: 1, gamesPlayed: 12, status: 'gesperrt', isStarter: false, isCaptain: false,
        seasonStats: { goals: 0, assists: 1, yellowCards: 2, yellowRedCards: 1, redCards: 0, games: 5, minutes: 234 },
        careerStats: { goals: 1, assists: 2, yellowCards: 4, yellowRedCards: 1, redCards: 0, games: 12, minutes: 876 }
    },
    {
        id: 15, firstName: 'Erik', lastName: 'Braun', position: 'OM', age: 23,
        strength: 7, stamina: 86, form: 19, freshness: 93, motivation: 8,
        contractYears: 2, gamesPlayed: 45, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: { goals: 1, assists: 2, yellowCards: 1, yellowRedCards: 0, redCards: 0, games: 6, minutes: 345 },
        careerStats: { goals: 8, assists: 12, yellowCards: 9, yellowRedCards: 0, redCards: 0, games: 45, minutes: 3234 }
    },
    {
        id: 16, firstName: 'Noah', lastName: 'Lang', position: 'ST', age: 22,
        strength: 7, stamina: 88, form: 20, freshness: 94, motivation: 9,
        contractYears: 1, gamesPlayed: 38, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: { goals: 3, assists: 1, yellowCards: 0, yellowRedCards: 0, redCards: 0, games: 8, minutes: 456 },
        careerStats: { goals: 12, assists: 5, yellowCards: 6, yellowRedCards: 0, redCards: 0, games: 38, minutes: 2567 }
    },
    {
        id: 17, firstName: 'Fabian', lastName: 'Schulz', position: 'LV', age: 20,
        strength: 6, stamina: 91, form: 16, freshness: 98, motivation: 7,
        contractYears: 1, gamesPlayed: 8, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: { goals: 0, assists: 0, yellowCards: 0, yellowRedCards: 0, redCards: 0, games: 1, minutes: 45 },
        careerStats: { goals: 0, assists: 1, yellowCards: 1, yellowRedCards: 0, redCards: 0, games: 8, minutes: 456 }
    },
    {
        id: 18, firstName: 'Moritz', lastName: 'Zimmermann', position: 'RV', age: 27,
        strength: 7, stamina: 83, form: 21, freshness: 88, motivation: 9,
        contractYears: 3, gamesPlayed: 98, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: { goals: 1, assists: 2, yellowCards: 2, yellowRedCards: 0, redCards: 0, games: 4, minutes: 278 },
        careerStats: { goals: 5, assists: 11, yellowCards: 24, yellowRedCards: 1, redCards: 0, games: 98, minutes: 7654 }
    },
    {
        id: 19, firstName: 'Simon', lastName: 'Vogel', position: 'LM', age: 21,
        strength: 6, stamina: 92, form: 17, freshness: 95, motivation: 8,
        contractYears: 1, gamesPlayed: 15, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: { goals: 0, assists: 1, yellowCards: 0, yellowRedCards: 0, redCards: 0, games: 3, minutes: 123 },
        careerStats: { goals: 2, assists: 4, yellowCards: 2, yellowRedCards: 0, redCards: 0, games: 15, minutes: 987 }
    },
    {
        id: 20, firstName: 'Alexander', lastName: 'König', position: 'RM', age: 26,
        strength: 7, stamina: 85, form: 21, freshness: 90, motivation: 9,
        contractYears: 2, gamesPlayed: 72, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: { goals: 1, assists: 3, yellowCards: 1, yellowRedCards: 0, redCards: 0, games: 5, minutes: 312 },
        careerStats: { goals: 9, assists: 15, yellowCards: 14, yellowRedCards: 0, redCards: 0, games: 72, minutes: 5678 }
    },
    {
        id: 21, firstName: 'Julian', lastName: 'Herrmann', position: 'ST', age: 24,
        strength: 8, stamina: 84, form: 22, freshness: 91, motivation: 9,
        contractYears: 2, gamesPlayed: 67, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: { goals: 2, assists: 1, yellowCards: 1, yellowRedCards: 0, redCards: 0, games: 7, minutes: 423 },
        careerStats: { goals: 23, assists: 8, yellowCards: 12, yellowRedCards: 0, redCards: 0, games: 67, minutes: 4987 }
    },
    {
        id: 22, firstName: 'Patrick', lastName: 'Lange', position: 'OM', age: 30,
        strength: 8, stamina: 78, form: 20, freshness: 83, motivation: 8,
        contractYears: 1, gamesPlayed: 156, status: 'gesperrt', isStarter: false, isCaptain: false,
        seasonStats: { goals: 1, assists: 4, yellowCards: 3, yellowRedCards: 1, redCards: 0, games: 10, minutes: 678 },
        careerStats: { goals: 28, assists: 52, yellowCards: 48, yellowRedCards: 3, redCards: 1, games: 156, minutes: 12345 }
    }
];

/**
 * Helper: Event Listener registrieren
 */
const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;
    element.addEventListener(event, handler, options);
    eventListeners.push({element, event, handler, options});
};

/**
 * Berechnet den Einsatzwert (Performance) - ORIGINAL PHP FORMEL
 */
const calculatePerformance = (player) => {
    const Spielstaerke = player.strength;
    const Form = player.form;
    const Kondition = player.stamina;
    let Frische = player.freshness;
    const Motivation = player.motivation;
    const Alter = player.age;

    const Status = player.isStarter ? 1 : 0;
    const Aufstellungen = player.gamesPlayed > 0 ? 1 : 0;
    const WertPO = 1;

    if (Frische <= 0) {
        Frische = 0;
    } else {
        if (Frische <= 100) {
            Frische = Frische / 120;
        } else {
            Frische = 1;
        }
    }

    let WAlter;
    if (Alter < 20) {
        WAlter = 0.9;
    } else if (Alter < 24) {
        WAlter = 1;
    } else if (Alter < 29) {
        WAlter = 1.1;
    } else if (Alter < 33) {
        WAlter = 1;
    } else {
        WAlter = 0.9;
    }

    let SpielerEinsatzWert = ((Spielstaerke - 1) + (Form / 3) + ((Kondition * 10) / 100))
        * WAlter
        * Frische
        * (((Motivation * 2) + 7) / 27)
        + ((Status + Aufstellungen + 1) / 20);

    if (Spielstaerke > 15) {
        SpielerEinsatzWert = SpielerEinsatzWert * 1.25;
    } else if (Spielstaerke === 15) {
        SpielerEinsatzWert = SpielerEinsatzWert * 1.20;
    } else if (Spielstaerke === 14) {
        SpielerEinsatzWert = SpielerEinsatzWert * 1.14;
    } else if (Spielstaerke === 13) {
        SpielerEinsatzWert = SpielerEinsatzWert * 1.10;
    } else if (Spielstaerke === 12) {
        SpielerEinsatzWert = SpielerEinsatzWert * 1.06;
    } else if (Spielstaerke === 11) {
        SpielerEinsatzWert = SpielerEinsatzWert * 1.04;
    } else if (Spielstaerke === 10) {
        SpielerEinsatzWert = SpielerEinsatzWert * 1.02;
    } else if (Spielstaerke === 9) {
        SpielerEinsatzWert = SpielerEinsatzWert * 1.25;
    } else if (Spielstaerke === 8) {
        SpielerEinsatzWert = SpielerEinsatzWert * 0.90;
    } else if (Spielstaerke === 7) {
        SpielerEinsatzWert = SpielerEinsatzWert * 0.80;
    } else if (Spielstaerke === 6) {
        SpielerEinsatzWert = SpielerEinsatzWert * 0.75;
    } else if (Spielstaerke === 5) {
        SpielerEinsatzWert = SpielerEinsatzWert * 0.70;
    } else if (Spielstaerke === 4) {
        SpielerEinsatzWert = SpielerEinsatzWert * 0.65;
    } else if (Spielstaerke === 3) {
        SpielerEinsatzWert = SpielerEinsatzWert * 0.6;
    }

    const EinsatzWert = SpielerEinsatzWert * WertPO;
    return parseFloat(EinsatzWert.toFixed(2));
};

/**
 * Formatiert Spielminuten (z.B. 1080 -> "1.080" oder 13050 -> "13.050")
 */
const formatMinutes = (minutes) => {
    return minutes.toLocaleString('de-DE');
};

/**
 * Rendert Spieler-Grid
 */
const renderPlayers = () => {
    const grid = document.getElementById('playerGrid');
    if (!grid) return;

    const sortedPlayers = getSortedPlayers();
    const fragment = document.createDocumentFragment();

    sortedPlayers.forEach(player => {
        const performance = calculatePerformance(player);
        const statusClass = player.status === 'OK' ? 'status-ok' :
            player.status === 'verletzt' ? 'status-injured' : 'status-suspended';
        const statusText = player.status === 'OK' ? 'Einsatzbereit' :
            player.status === 'verletzt' ? 'Verletzt' : 'Gesperrt';

        const card = document.createElement('div');
        card.className = `player-card glass ${player.isCaptain ? 'captain' : ''}`;
        card.dataset.playerId = player.id;

        card.innerHTML = `
            ${player.isCaptain ? '<div class="captain-badge">Ⓒ</div>' : ''}
            <div class="player-header">
                <div class="player-image">${player.firstName.charAt(0)}${player.lastName.charAt(0)}</div>
                <div class="player-info">
                    <div class="player-name">${player.firstName} ${player.lastName}</div>
                    <div class="player-meta">
                        <span class="player-position">${player.position}</span>
                        <span>Alter: ${player.age}</span>
                    </div>
                </div>
            </div>

            <div class="player-stats">
                <div class="stat-item">
                    <span class="stat-item-label">Stärke</span>
                    <span class="stat-item-value">${player.strength}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-item-label">Kondition</span>
                    <span class="stat-item-value">${player.stamina}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-item-label">Form</span>
                    <span class="stat-item-value">${player.form}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-item-label">Frische</span>
                    <span class="stat-item-value">${player.freshness}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-item-label">Motivation</span>
                    <span class="stat-item-value">${player.motivation}</span>
                </div>
            </div>

            <div class="player-performance">
                Einsatzwert: ${performance}
            </div>

            <div class="player-contract">
                Vertrag: ${player.contractYears} ${player.contractYears === 1 ? 'Jahr' : 'Jahre'}
            </div>

            <div class="player-status">
                <span>${player.isStarter ? '⚽ Stamm' : '📋 Bank'} · ${player.gamesPlayed} Spiele</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        `;

        fragment.appendChild(card);
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);
};

/**
 * Sortiert Spieler basierend auf currentSort
 */
const getSortedPlayers = () => {
    const sorted = [...players];
    const posOrder = ['TW', 'LV', 'IV', 'RV', 'LI', 'DM', 'OM', 'LM', 'RM', 'ST', 'LS', 'RS'];

    switch (currentSort) {
        case 'lineup':
            sorted.sort((a, b) => b.isStarter - a.isStarter);
            break;
        case 'position':
            sorted.sort((a, b) => posOrder.indexOf(a.position) - posOrder.indexOf(b.position));
            break;
        case 'performance':
            sorted.sort((a, b) => calculatePerformance(b) - calculatePerformance(a));
            break;
        case 'name':
            sorted.sort((a, b) => a.lastName.localeCompare(b.lastName));
            break;
    }

    return sorted;
};

/**
 * Aktualisiert Team-Statistiken
 */
const updateTeamStats = () => {
    const gk = players.filter(p => p.position === 'TW').reduce((sum, p) => sum + calculatePerformance(p), 0);
    const def = players.filter(p => ['LV', 'IV', 'RV', 'LI'].includes(p.position)).reduce((sum, p) => sum + calculatePerformance(p), 0);
    const mid = players.filter(p => ['DM', 'OM', 'LM', 'RM'].includes(p.position)).reduce((sum, p) => sum + calculatePerformance(p), 0);
    const att = players.filter(p => ['ST', 'LS', 'RS'].includes(p.position)).reduce((sum, p) => sum + calculatePerformance(p), 0);
    const total = players.reduce((sum, p) => sum + calculatePerformance(p), 0);

    const elements = {
        statGK: document.getElementById('statGK'),
        statDEF: document.getElementById('statDEF'),
        statMID: document.getElementById('statMID'),
        statATT: document.getElementById('statATT'),
        statTOTAL: document.getElementById('statTOTAL')
    };

    if (elements.statGK) elements.statGK.textContent = gk.toLocaleString();
    if (elements.statDEF) elements.statDEF.textContent = def.toLocaleString();
    if (elements.statMID) elements.statMID.textContent = mid.toLocaleString();
    if (elements.statATT) elements.statATT.textContent = att.toLocaleString();
    if (elements.statTOTAL) elements.statTOTAL.textContent = total.toLocaleString();
};

/**
 * Zeigt Spieler-Details im Modal
 */
const showPlayerDetail = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const performance = calculatePerformance(player);

    // Header-Daten
    const elements = {
        modalPlayerName: document.getElementById('modalPlayerName'),
        modalPosition: document.getElementById('modalPosition'),
        modalAge: document.getElementById('modalAge'),
        // Übersicht Tab
        modalStrength: document.getElementById('modalStrength'),
        modalStamina: document.getElementById('modalStamina'),
        modalForm: document.getElementById('modalForm'),
        modalFreshness: document.getElementById('modalFreshness'),
        modalMotivation: document.getElementById('modalMotivation'),
        modalPerformance: document.getElementById('modalPerformance'),
        modalContract: document.getElementById('modalContract'),
        modalGames: document.getElementById('modalGames'),
        modalStatus: document.getElementById('modalStatus'),
        // Progress Bars
        progressStrength: document.getElementById('progressStrength'),
        progressStamina: document.getElementById('progressStamina'),
        progressForm: document.getElementById('progressForm'),
        progressFreshness: document.getElementById('progressFreshness'),
        progressMotivation: document.getElementById('progressMotivation'),
        progressStrengthLabel: document.getElementById('progressStrengthLabel'),
        progressStaminaLabel: document.getElementById('progressStaminaLabel'),
        progressFormLabel: document.getElementById('progressFormLabel'),
        progressFreshnessLabel: document.getElementById('progressFreshnessLabel'),
        progressMotivationLabel: document.getElementById('progressMotivationLabel'),
        // Statistiken Tab
        statSeasonGoals: document.getElementById('statSeasonGoals'),
        statCareerGoals: document.getElementById('statCareerGoals'),
        statSeasonAssists: document.getElementById('statSeasonAssists'),
        statCareerAssists: document.getElementById('statCareerAssists'),
        statSeasonYellow: document.getElementById('statSeasonYellow'),
        statCareerYellow: document.getElementById('statCareerYellow'),
        statSeasonYellowRed: document.getElementById('statSeasonYellowRed'),
        statCareerYellowRed: document.getElementById('statCareerYellowRed'),
        statSeasonRed: document.getElementById('statSeasonRed'),
        statCareerRed: document.getElementById('statCareerRed'),
        statSeasonGames: document.getElementById('statSeasonGames'),
        statCareerGames: document.getElementById('statCareerGames'),
        statSeasonMinutes: document.getElementById('statSeasonMinutes'),
        statCareerMinutes: document.getElementById('statCareerMinutes')
    };

    // Fülle Header
    if (elements.modalPlayerName) elements.modalPlayerName.textContent = `${player.firstName} ${player.lastName}`;
    if (elements.modalPosition) elements.modalPosition.textContent = player.position;
    if (elements.modalAge) elements.modalAge.textContent = `${player.age} Jahre`;

    // Fülle Übersicht Tab
    if (elements.modalStrength) elements.modalStrength.textContent = String(player.strength);
    if (elements.modalStamina) elements.modalStamina.textContent = String(player.stamina);
    if (elements.modalForm) elements.modalForm.textContent = String(player.form);
    if (elements.modalFreshness) elements.modalFreshness.textContent = String(player.freshness);
    if (elements.modalMotivation) elements.modalMotivation.textContent = String(player.motivation);
    if (elements.modalPerformance) elements.modalPerformance.textContent = String(performance);
    if (elements.modalContract) elements.modalContract.textContent =
        `${player.contractYears} ${player.contractYears === 1 ? 'Jahr' : 'Jahre'}`;
    if (elements.modalGames) elements.modalGames.textContent = `${player.gamesPlayed} Spiele`;
    if (elements.modalStatus) elements.modalStatus.textContent =
        player.status === 'OK' ? 'Einsatzbereit' :
            player.status === 'verletzt' ? 'Verletzt' : 'Gesperrt';

    // Progress Bars
    if (elements.progressStrengthLabel) elements.progressStrengthLabel.textContent = String(player.strength);
    if (elements.progressStaminaLabel) elements.progressStaminaLabel.textContent = String(player.stamina);
    if (elements.progressFormLabel) elements.progressFormLabel.textContent = String(player.form);
    if (elements.progressFreshnessLabel) elements.progressFreshnessLabel.textContent = String(player.freshness);
    if (elements.progressMotivationLabel) elements.progressMotivationLabel.textContent = String(player.motivation);

    const scaleStrength = player.strength * 10;
    const scaleStamina = player.stamina;
    const scaleForm = (player.form / 30) * 100;
    const scaleFreshness = player.freshness;
    const scaleMotivation = (player.motivation / 12) * 100;

    if (elements.progressStrength) elements.progressStrength.style.width = `${Math.min(100, scaleStrength)}%`;
    if (elements.progressStamina) elements.progressStamina.style.width = `${Math.min(100, scaleStamina)}%`;
    if (elements.progressForm) elements.progressForm.style.width = `${Math.min(100, scaleForm)}%`;
    if (elements.progressFreshness) elements.progressFreshness.style.width = `${Math.min(100, scaleFreshness)}%`;
    if (elements.progressMotivation) elements.progressMotivation.style.width = `${Math.min(100, scaleMotivation)}%`;

    // Fülle Statistiken Tab
    if (elements.statSeasonGoals) elements.statSeasonGoals.textContent = String(player.seasonStats.goals);
    if (elements.statCareerGoals) elements.statCareerGoals.textContent = String(player.careerStats.goals);
    if (elements.statSeasonAssists) elements.statSeasonAssists.textContent = String(player.seasonStats.assists);
    if (elements.statCareerAssists) elements.statCareerAssists.textContent = String(player.careerStats.assists);
    if (elements.statSeasonYellow) elements.statSeasonYellow.textContent = String(player.seasonStats.yellowCards);
    if (elements.statCareerYellow) elements.statCareerYellow.textContent = String(player.careerStats.yellowCards);
    if (elements.statSeasonYellowRed) elements.statSeasonYellowRed.textContent = String(player.seasonStats.yellowRedCards);
    if (elements.statCareerYellowRed) elements.statCareerYellowRed.textContent = String(player.careerStats.yellowRedCards);
    if (elements.statSeasonRed) elements.statSeasonRed.textContent = String(player.seasonStats.redCards);
    if (elements.statCareerRed) elements.statCareerRed.textContent = String(player.careerStats.redCards);
    if (elements.statSeasonGames) elements.statSeasonGames.textContent = String(player.seasonStats.games);
    if (elements.statCareerGames) elements.statCareerGames.textContent = String(player.careerStats.games);
    if (elements.statSeasonMinutes) elements.statSeasonMinutes.textContent = formatMinutes(player.seasonStats.minutes);
    if (elements.statCareerMinutes) elements.statCareerMinutes.textContent = formatMinutes(player.careerStats.minutes);

    // Modal anzeigen
    const modal = document.getElementById('playerModal');
    if (modal) modal.classList.add('active');

    // Setze aktiven Tab auf "Übersicht"
    switchTab('overview');
};

/**
 * Tab-Wechsel
 */
const switchTab = (tabName) => {
    // Tab Buttons
    document.querySelectorAll('.modal-tab').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Tab Content
    document.querySelectorAll('.modal-tab-content').forEach(content => {
        if (content.id === `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
};

/**
 * Schließt Modal
 */
const closeModal = () => {
    const modal = document.getElementById('playerModal');
    if (modal) modal.classList.remove('active');
};

/**
 * Sortiert Spieler
 */
const sortBy = (type) => {
    currentSort = type;

    document.querySelectorAll('.btn-sort').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === type) {
            btn.classList.add('active');
        }
    });

    renderPlayers();
};

/**
 * Verlängert alle Verträge
 */
const extendAllContracts = () => {
    if (confirm('Möchten Sie wirklich alle Verträge um eine Saison verlängern?')) {
        players.forEach(player => player.contractYears++);
        renderPlayers();
        alert('✅ Alle Verträge wurden um eine Saison verlängert!');
    }
};

/**
 * Zahlt Teamprämie aus
 */
const payTeamBonus = () => {
    if (confirm('Möchten Sie eine Teamprämie auszahlen? Dies erhöht die Motivation aller Spieler.')) {
        players.forEach(player => {
            player.motivation = Math.min(12, player.motivation + 2);
        });
        renderPlayers();
        updateTeamStats();
        alert('💰 Teamprämie ausgezahlt! Motivation aller Spieler wurde gesteigert.');
    }
};

/**
 * Zeigt Kapitän-Auswahl
 */
const showCaptainSelection = () => {
    const captainList = players
        .filter(p => p.isStarter)
        .map((p, i) => `${i + 1}. ${p.firstName} ${p.lastName} (${p.position})`)
        .join('\n');

    const selection = prompt(`Wählen Sie den neuen Kapitän:\n\n${captainList}\n\nGeben Sie die Nummer ein:`);

    if (selection) {
        const index = parseInt(selection) - 1;
        const starters = players.filter(p => p.isStarter);

        if (index >= 0 && index < starters.length) {
            players.forEach(p => p.isCaptain = false);
            starters[index].isCaptain = true;
            renderPlayers();
            alert(`⭐ ${starters[index].firstName} ${starters[index].lastName} ist jetzt der Kapitän!`);
        } else {
            alert('❌ Ungültige Auswahl!');
        }
    }
};

/**
 * Verleiht Spieler
 */
const lendPlayers = () => {
    alert('📤 Spielerverleihe-System wird demnächst verfügbar sein.');
};

/**
 * Event Delegation Handler
 */
const handleDocumentClick = (e) => {
    const target = e.target.closest('[data-action], [data-tab]');
    if (!target) return;

    // Tab-Wechsel
    if (target.dataset.tab) {
        switchTab(target.dataset.tab);
        return;
    }

    // Actions
    const action = target.dataset.action;
    const value = target.dataset.value;

    switch (action) {
        case 'sort':
            sortBy(value);
            break;
        case 'extendContracts':
            extendAllContracts();
            break;
        case 'payBonus':
            payTeamBonus();
            break;
        case 'selectCaptain':
            showCaptainSelection();
            break;
        case 'lendPlayers':
            lendPlayers();
            break;
        case 'closeModal':
            closeModal();
            break;
        case 'extendPlayerContract':
            alert('Vertragsverlängerung für einzelnen Spieler wird implementiert.');
            break;
    }
};

/**
 * Player Card Click Handler
 */
const handlePlayerCardClick = (e) => {
    const card = e.target.closest('.player-card');
    if (!card) return;

    const playerId = parseInt(card.dataset.playerId);
    if (playerId) {
        showPlayerDetail(playerId);
    }
};

/**
 * Initialisiert das Modul
 */
export function init() {
    console.log('🎬 Initialisiere Team-Modul mit Tab-System');

    players = [...mockPlayers];
    renderPlayers();
    updateTeamStats();

    // Event Delegation für alle Buttons
    addEventListener(document, 'click', handleDocumentClick);

    // Event Delegation für Player Cards
    const playerGrid = document.getElementById('playerGrid');
    if (playerGrid) {
        addEventListener(playerGrid, 'click', handlePlayerCardClick);
    }

    // ESC-Taste für Modal
    addEventListener(document, 'keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    console.log('✅ Team-Modul bereit mit erweiterten Statistiken');
}

/**
 * Cleanup beim Verlassen
 */
export function cleanup() {
    console.log('🧹 Cleanup Team-Modul');

    eventListeners.forEach(({element, event, handler, options}) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners.length = 0;

    players = [];
    currentSort = 'lineup';
}