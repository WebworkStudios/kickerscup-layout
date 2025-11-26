// =====================================================
// KICKERSCUP - TEAM MANAGEMENT SYSTEM
// Kaderverwaltung & Spieler-Management
// =====================================================

const TeamManagement = (() => {
    // Private variables
    let players = [];
    let currentSort = 'lineup';

    // Mock-Daten für Spieler (erweitert basierend auf teamoverview.html)
    const mockPlayers = [
        { id: 1, firstName: 'Max', lastName: 'Müller', position: 'TW', age: 28, strength: 85, stamina: 90, form: 88, freshness: 95, motivation: 92, contractYears: 3, gamesPlayed: 145, status: 'OK', isStarter: true, isCaptain: false },
        { id: 2, firstName: 'Tom', lastName: 'Schmidt', position: 'LV', age: 25, strength: 78, stamina: 85, form: 82, freshness: 90, motivation: 88, contractYears: 2, gamesPlayed: 98, status: 'OK', isStarter: true, isCaptain: false },
        { id: 3, firstName: 'Leon', lastName: 'Wagner', position: 'IV', age: 29, strength: 88, stamina: 82, form: 90, freshness: 88, motivation: 90, contractYears: 4, gamesPlayed: 187, status: 'OK', isStarter: true, isCaptain: true },
        { id: 4, firstName: 'Felix', lastName: 'Fischer', position: 'IV', age: 27, strength: 85, stamina: 84, form: 87, freshness: 92, motivation: 89, contractYears: 3, gamesPlayed: 156, status: 'OK', isStarter: true, isCaptain: false },
        { id: 5, firstName: 'Jan', lastName: 'Weber', position: 'RV', age: 24, strength: 80, stamina: 88, form: 85, freshness: 94, motivation: 91, contractYears: 2, gamesPlayed: 76, status: 'OK', isStarter: true, isCaptain: false },
        { id: 6, firstName: 'Lukas', lastName: 'Becker', position: 'DM', age: 26, strength: 82, stamina: 90, form: 86, freshness: 89, motivation: 87, contractYears: 3, gamesPlayed: 134, status: 'OK', isStarter: true, isCaptain: false },
        { id: 7, firstName: 'Jonas', lastName: 'Schulz', position: 'OM', age: 23, strength: 84, stamina: 86, form: 90, freshness: 96, motivation: 93, contractYears: 4, gamesPlayed: 89, status: 'OK', isStarter: true, isCaptain: false },
        { id: 8, firstName: 'Paul', lastName: 'Hoffmann', position: 'LM', age: 25, strength: 81, stamina: 92, form: 84, freshness: 91, motivation: 88, contractYears: 2, gamesPlayed: 112, status: 'OK', isStarter: true, isCaptain: false },
        { id: 9, firstName: 'David', lastName: 'Klein', position: 'RM', age: 24, strength: 79, stamina: 91, form: 83, freshness: 93, motivation: 90, contractYears: 3, gamesPlayed: 95, status: 'OK', isStarter: true, isCaptain: false },
        { id: 10, firstName: 'Marco', lastName: 'Richter', position: 'ST', age: 27, strength: 90, stamina: 85, form: 92, freshness: 87, motivation: 94, contractYears: 4, gamesPlayed: 165, status: 'OK', isStarter: true, isCaptain: false },
        { id: 11, firstName: 'Tim', lastName: 'Braun', position: 'ST', age: 22, strength: 86, stamina: 88, form: 88, freshness: 95, motivation: 91, contractYears: 3, gamesPlayed: 67, status: 'OK', isStarter: true, isCaptain: false },
        { id: 12, firstName: 'Niklas', lastName: 'Lang', position: 'TW', age: 32, strength: 80, stamina: 75, form: 78, freshness: 82, motivation: 85, contractYears: 1, gamesPlayed: 203, status: 'OK', isStarter: false, isCaptain: false },
        { id: 13, firstName: 'Simon', lastName: 'Krause', position: 'IV', age: 30, strength: 82, stamina: 78, form: 80, freshness: 85, motivation: 83, contractYears: 2, gamesPlayed: 178, status: 'OK', isStarter: false, isCaptain: false },
        { id: 14, firstName: 'Moritz', lastName: 'Zimmermann', position: 'LI', age: 21, strength: 75, stamina: 85, form: 79, freshness: 97, motivation: 89, contractYears: 4, gamesPlayed: 45, status: 'OK', isStarter: false, isCaptain: false },
        { id: 15, firstName: 'Elias', lastName: 'Krüger', position: 'DM', age: 28, strength: 81, stamina: 84, form: 82, freshness: 88, motivation: 86, contractYears: 2, gamesPlayed: 142, status: 'verletzt', isStarter: false, isCaptain: false },
        { id: 16, firstName: 'Noah', lastName: 'Hartmann', position: 'OM', age: 26, strength: 83, stamina: 87, form: 85, freshness: 90, motivation: 88, contractYears: 3, gamesPlayed: 118, status: 'OK', isStarter: false, isCaptain: false },
        { id: 17, firstName: 'Ben', lastName: 'Wolf', position: 'LS', age: 25, strength: 84, stamina: 86, form: 87, freshness: 92, motivation: 90, contractYears: 2, gamesPlayed: 89, status: 'OK', isStarter: false, isCaptain: false },
        { id: 18, firstName: 'Finn', lastName: 'Schröder', position: 'RS', age: 23, strength: 82, stamina: 89, form: 86, freshness: 94, motivation: 91, contractYears: 3, gamesPlayed: 72, status: 'gesperrt', isStarter: false, isCaptain: false }
    ];

    /**
     * Initialisiert das Team Management System
     */
    function init() {
        // Lade Spieler-Daten
        players = [...mockPlayers];

        // Rendere Spieler-Grid
        renderPlayers();

        // Update Team Stats
        updateTeamStats();

        console.log('✅ Team Management System initialisiert');
    }

    /**
     * Berechnet den Einsatzwert eines Spielers
     */
    function calculatePerformance(player) {
        return Math.round((player.strength + player.stamina + player.form + player.freshness + player.motivation) / 5);
    }

    /**
     * Rendert alle Spieler im Grid
     */
    function renderPlayers() {
        const grid = document.getElementById('playerGrid');
        if (!grid) return;

        grid.innerHTML = '';

        let sortedPlayers = [...players];

        switch(currentSort) {
            case 'lineup':
                sortedPlayers.sort((a, b) => b.isStarter - a.isStarter);
                break;
            case 'position':
                const posOrder = ['TW', 'LV', 'IV', 'RV', 'LI', 'DM', 'OM', 'LM', 'RM', 'ST', 'LS', 'RS'];
                sortedPlayers.sort((a, b) => posOrder.indexOf(a.position) - posOrder.indexOf(b.position));
                break;
            case 'performance':
                sortedPlayers.sort((a, b) => calculatePerformance(b) - calculatePerformance(a));
                break;
            case 'name':
                sortedPlayers.sort((a, b) => a.lastName.localeCompare(b.lastName));
                break;
        }

        sortedPlayers.forEach(player => {
            const performance = calculatePerformance(player);
            const statusClass = player.status === 'OK' ? 'status-ok' :
                player.status === 'verletzt' ? 'status-injured' : 'status-suspended';
            const statusText = player.status === 'OK' ? 'Einsatzbereit' :
                player.status === 'verletzt' ? 'Verletzt' : 'Gesperrt';

            const card = document.createElement('div');
            card.className = `player-card glass ${player.isCaptain ? 'captain' : ''}`;
            card.onclick = () => showPlayerDetail(player);

            card.innerHTML = `
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

            grid.appendChild(card);
        });
    }

    /**
     * Update team stats
     */
    function updateTeamStats() {
        const gk = players.filter(p => p.position === 'TW').reduce((sum, p) => sum + calculatePerformance(p), 0);
        const def = players.filter(p => ['LV', 'IV', 'RV', 'LI'].includes(p.position)).reduce((sum, p) => sum + calculatePerformance(p), 0);
        const mid = players.filter(p => ['DM', 'OM', 'LM', 'RM'].includes(p.position)).reduce((sum, p) => sum + calculatePerformance(p), 0);
        const att = players.filter(p => ['ST', 'LS', 'RS'].includes(p.position)).reduce((sum, p) => sum + calculatePerformance(p), 0);
        const total = players.reduce((sum, p) => sum + calculatePerformance(p), 0);

        const statGK = document.getElementById('statGK');
        const statDEF = document.getElementById('statDEF');
        const statMID = document.getElementById('statMID');
        const statATT = document.getElementById('statATT');
        const statTOTAL = document.getElementById('statTOTAL');

        if (statGK) statGK.textContent = gk.toLocaleString();
        if (statDEF) statDEF.textContent = def.toLocaleString();
        if (statMID) statMID.textContent = mid.toLocaleString();
        if (statATT) statATT.textContent = att.toLocaleString();
        if (statTOTAL) statTOTAL.textContent = total.toLocaleString();
    }

    /**
     * Öffnet das Spieler-Detail Modal
     * @param {Object} player - Spieler-Daten
     */
    function showPlayerDetail(player) {
        const performance = calculatePerformance(player);

        document.getElementById('modalPlayerName').textContent = `${player.firstName} ${player.lastName}`;
        document.getElementById('modalPosition').textContent = player.position;
        document.getElementById('modalAge').textContent = `${player.age} Jahre`;
        document.getElementById('modalStrength').textContent = player.strength;
        document.getElementById('modalStamina').textContent = player.stamina;
        document.getElementById('modalForm').textContent = player.form;
        document.getElementById('modalFreshness').textContent = player.freshness;
        document.getElementById('modalMotivation').textContent = player.motivation;
        document.getElementById('modalPerformance').textContent = performance;
        document.getElementById('modalContract').textContent = `${player.contractYears} ${player.contractYears === 1 ? 'Jahr' : 'Jahre'}`;
        document.getElementById('modalGames').textContent = `${player.gamesPlayed} Spiele`;
        document.getElementById('modalStatus').textContent = player.status === 'OK' ? 'Einsatzbereit' :
            player.status === 'verletzt' ? 'Verletzt' : 'Gesperrt';

        // Progress bars
        document.getElementById('progressStrength').style.width = `${player.strength}%`;
        document.getElementById('progressStamina').style.width = `${player.stamina}%`;
        document.getElementById('progressForm').style.width = `${player.form}%`;
        document.getElementById('progressFreshness').style.width = `${player.freshness}%`;
        document.getElementById('progressMotivation').style.width = `${player.motivation}%`;

        document.getElementById('playerModal').classList.add('active');
    }

    /**
     * Schließt das Modal
     */
    function closeModal() {
        const modal = document.getElementById('playerModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Sortiert Spieler
     */
    function sortBy(type) {
        currentSort = type;
        renderPlayers();
    }

    /**
     * Extend all contracts
     */
    function extendAllContracts() {
        if (confirm('Möchten Sie wirklich alle Verträge um eine Saison verlängern?')) {
            players.forEach(player => player.contractYears++);
            renderPlayers();
            alert('✅ Alle Verträge wurden um eine Saison verlängert!');
        }
    }

    /**
     * Pay team bonus
     */
    function payTeamBonus() {
        if (confirm('Möchten Sie eine Teamprämie auszahlen? Dies erhöht die Motivation aller Spieler.')) {
            players.forEach(player => {
                player.motivation = Math.min(100, player.motivation + 5);
            });
            renderPlayers();
            updateTeamStats();
            alert('💰 Teamprämie ausgezahlt! Motivation aller Spieler wurde gesteigert.');
        }
    }

    /**
     * Show captain selection
     */
    function showCaptainSelection() {
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
    }

    /**
     * Lend players
     */
    function lendPlayers() {
        alert('📤 Spielerverleihe-System wird demnächst verfügbar sein.');
    }

    // ESC-Taste zum Schließen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Public API
    return {
        init,
        sortBy,
        closeModal,
        extendAllContracts,
        payTeamBonus,
        showCaptainSelection,
        lendPlayers
    };
})();

// Global verfügbar machen
window.sortBy = TeamManagement.sortBy;
window.closeModal = TeamManagement.closeModal;
window.extendAllContracts = TeamManagement.extendAllContracts;
window.payTeamBonus = TeamManagement.payTeamBonus;
window.showCaptainSelection = TeamManagement.showCaptainSelection;
window.lendPlayers = TeamManagement.lendPlayers;

// Auto-Initialisierung wenn Seite geladen wird
document.addEventListener('pageLoaded', (e) => {
    if (e.detail.page === 'team') {
        TeamManagement.init();
    }
});

// Falls direkt auf team.html zugegriffen wird (ohne Navigation)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('playerGrid')) {
            TeamManagement.init();
        }
    });
} else {
    if (document.getElementById('playerGrid')) {
        TeamManagement.init();
    }
}