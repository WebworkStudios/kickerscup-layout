// =====================================================
// KICKERSCUP - TEAM MANAGEMENT SYSTEM
// Kaderverwaltung & Spieler-Management
// =====================================================

const TeamManagement = (() => {
    // Private variables
    let players = [];
    let currentSort = 'position';
    let selectedPlayer = null;

    // Mock-Daten für Spieler
    const mockPlayers = [
        {
            id: 1,
            name: 'Marco Reus',
            position: 'ST',
            age: 28,
            rating: 88,
            value: '12.5M',
            goals: 15,
            assists: 8,
            speed: 89,
            shooting: 91,
            passing: 85,
            defense: 52,
            physical: 78,
            performance: 'Hervorragend',
            contract: 'Vertrag bis 2026',
            status: 'ok',
            isCaptain: true
        },
        {
            id: 2,
            name: 'Joshua Kimmich',
            position: 'CM',
            age: 26,
            rating: 87,
            value: '11.2M',
            goals: 3,
            assists: 12,
            speed: 75,
            shooting: 72,
            passing: 92,
            defense: 85,
            physical: 81,
            performance: 'Sehr gut',
            contract: 'Vertrag bis 2025',
            status: 'ok',
            isCaptain: false
        },
        {
            id: 3,
            name: 'Manuel Neuer',
            position: 'TW',
            age: 35,
            rating: 90,
            value: '8.5M',
            goals: 0,
            assists: 0,
            speed: 58,
            shooting: 35,
            passing: 78,
            defense: 95,
            physical: 88,
            performance: 'Weltklasse',
            contract: 'Vertrag bis 2024',
            status: 'ok',
            isCaptain: false
        },
        {
            id: 4,
            name: 'Timo Werner',
            position: 'ST',
            age: 25,
            rating: 82,
            value: '7.8M',
            goals: 9,
            assists: 4,
            speed: 94,
            shooting: 80,
            passing: 75,
            defense: 45,
            physical: 76,
            performance: 'Gut',
            contract: 'Vertrag bis 2025',
            status: 'injured',
            isCaptain: false
        },
        {
            id: 5,
            name: 'Antonio Rüdiger',
            position: 'IV',
            age: 29,
            rating: 85,
            value: '9.2M',
            goals: 2,
            assists: 1,
            speed: 82,
            shooting: 55,
            passing: 72,
            defense: 92,
            physical: 90,
            performance: 'Sehr gut',
            contract: 'Vertrag bis 2026',
            status: 'ok',
            isCaptain: false
        },
        {
            id: 6,
            name: 'Leon Goretzka',
            position: 'CM',
            age: 27,
            rating: 86,
            value: '10.5M',
            goals: 7,
            assists: 5,
            speed: 78,
            shooting: 83,
            passing: 84,
            defense: 79,
            physical: 87,
            performance: 'Hervorragend',
            contract: 'Vertrag bis 2025',
            status: 'ok',
            isCaptain: false
        },
        {
            id: 7,
            name: 'Serge Gnabry',
            position: 'RF',
            age: 26,
            rating: 84,
            value: '9.8M',
            goals: 11,
            assists: 7,
            speed: 91,
            shooting: 85,
            passing: 80,
            defense: 48,
            physical: 74,
            performance: 'Sehr gut',
            contract: 'Vertrag bis 2025',
            status: 'suspended',
            isCaptain: false
        },
        {
            id: 8,
            name: 'Niklas Süle',
            position: 'IV',
            age: 26,
            rating: 84,
            value: '8.9M',
            goals: 1,
            assists: 0,
            speed: 72,
            shooting: 48,
            passing: 68,
            defense: 90,
            physical: 92,
            performance: 'Gut',
            contract: 'Vertrag bis 2024',
            status: 'ok',
            isCaptain: false
        }
    ];

    /**
     * Initialisiert das Team Management System
     */
    function init() {
        // Lade Spieler-Daten
        players = [...mockPlayers];

        // Rendere Spieler-Grid
        renderPlayers();

        // Initialisiere Event Listeners
        initEventListeners();

        console.log('✅ Team Management System initialisiert');
    }

    /**
     * Initialisiert Event Listeners
     */
    function initEventListeners() {
        // Sort-Buttons
        const sortButtons = document.querySelectorAll('.btn-sort');
        sortButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sortType = btn.getAttribute('data-sort');
                handleSort(sortType);
                
                // Update Active State
                sortButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Modal Close
        const modal = document.getElementById('playerModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closePlayerModal();
                }
            });
        }

        // ESC-Taste zum Schließen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closePlayerModal();
            }
        });
    }

    /**
     * Rendert alle Spieler im Grid
     */
    function renderPlayers() {
        const grid = document.getElementById('playerGrid');
        if (!grid) return;

        grid.innerHTML = '';

        players.forEach(player => {
            const playerCard = createPlayerCard(player);
            grid.appendChild(playerCard);
        });
    }

    /**
     * Erstellt eine Spieler-Karte
     * @param {Object} player - Spieler-Daten
     * @returns {HTMLElement} - Player Card Element
     */
    function createPlayerCard(player) {
        const card = document.createElement('div');
        card.className = `player-card glass ${player.isCaptain ? 'captain' : ''}`;
        card.onclick = () => openPlayerModal(player);

        card.innerHTML = `
            <div class="player-header">
                <div class="player-image">${getPlayerInitials(player.name)}</div>
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div class="player-meta">
                        <span class="player-position">${player.position}</span>
                        <span>${player.age} Jahre</span>
                    </div>
                </div>
            </div>

            <div class="player-stats">
                <div class="stat-item">
                    <span class="stat-item-label">Rating</span>
                    <span class="stat-item-value">${player.rating}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-item-label">Tore</span>
                    <span class="stat-item-value">${player.goals}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-item-label">Assists</span>
                    <span class="stat-item-value">${player.assists}</span>
                </div>
            </div>

            <div class="player-performance">
                ${player.performance}
            </div>

            <div class="player-contract">
                ${player.contract}
            </div>

            <div class="player-status">
                <span>Marktwert: ${player.value}</span>
                <span class="status-badge status-${player.status}">
                    ${getStatusText(player.status)}
                </span>
            </div>
        `;

        return card;
    }

    /**
     * Öffnet das Spieler-Detail Modal
     * @param {Object} player - Spieler-Daten
     */
    function openPlayerModal(player) {
        selectedPlayer = player;
        
        const modal = document.getElementById('playerModal');
        if (!modal) return;

        // Update Modal Content
        document.getElementById('modalPlayerName').textContent = player.name;
        document.getElementById('modalPlayerInfo').textContent = 
            `${player.position} • ${player.age} Jahre • ${player.contract}`;
        
        document.getElementById('modalRating').textContent = player.rating;
        document.getElementById('modalValue').textContent = player.value;
        document.getElementById('modalGoals').textContent = player.goals;
        document.getElementById('modalAssists').textContent = player.assists;
        
        document.getElementById('modalSpeed').textContent = player.speed;
        document.getElementById('modalShooting').textContent = player.shooting;
        document.getElementById('modalPassing').textContent = player.passing;
        document.getElementById('modalDefense').textContent = player.defense;
        document.getElementById('modalPhysical').textContent = player.physical;

        // Update Progress Bars
        updateProgressBars(player);

        // Show Modal
        modal.classList.add('active');
    }

    /**
     * Schließt das Spieler-Detail Modal
     */
    function closePlayerModal() {
        const modal = document.getElementById('playerModal');
        if (modal) {
            modal.classList.remove('active');
        }
        selectedPlayer = null;
    }

    /**
     * Aktualisiert die Progress Bars im Modal
     * @param {Object} player - Spieler-Daten
     */
    function updateProgressBars(player) {
        const progressBars = document.querySelectorAll('.progress-fill');
        const stats = [player.speed, player.shooting, player.passing, player.defense, player.physical];
        
        progressBars.forEach((bar, index) => {
            if (stats[index] !== undefined) {
                bar.style.width = stats[index] + '%';
            }
        });
    }

    /**
     * Sortiert Spieler nach Kriterium
     * @param {string} sortType - Sortier-Typ
     */
    function handleSort(sortType) {
        currentSort = sortType;

        switch (sortType) {
            case 'position':
                players.sort((a, b) => {
                    const posOrder = ['TW', 'IV', 'LV', 'RV', 'DM', 'CM', 'LM', 'RM', 'OM', 'LF', 'RF', 'ST'];
                    return posOrder.indexOf(a.position) - posOrder.indexOf(b.position);
                });
                break;
            case 'rating':
                players.sort((a, b) => b.rating - a.rating);
                break;
            case 'age':
                players.sort((a, b) => a.age - b.age);
                break;
            case 'value':
                players.sort((a, b) => {
                    const aValue = parseFloat(a.value.replace('M', ''));
                    const bValue = parseFloat(b.value.replace('M', ''));
                    return bValue - aValue;
                });
                break;
        }

        renderPlayers();
    }

    /**
     * Hilfsfunktion: Extrahiert Initialen aus Namen
     * @param {string} name - Spielername
     * @returns {string} - Initialen
     */
    function getPlayerInitials(name) {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return parts[0][0] + parts[parts.length - 1][0];
        }
        return name.substring(0, 2).toUpperCase();
    }

    /**
     * Hilfsfunktion: Gibt Status-Text zurück
     * @param {string} status - Status-Code
     * @returns {string} - Status-Text
     */
    function getStatusText(status) {
        const statusMap = {
            ok: 'Fit',
            injured: 'Verletzt',
            suspended: 'Gesperrt'
        };
        return statusMap[status] || status;
    }

    /**
     * Public API: Gibt alle Spieler zurück
     * @returns {Array} - Spieler-Array
     */
    function getPlayers() {
        return [...players];
    }

    /**
     * Public API: Gibt ausgewählten Spieler zurück
     * @returns {Object|null} - Spieler-Objekt
     */
    function getSelectedPlayer() {
        return selectedPlayer;
    }

    // Public API
    return {
        init,
        getPlayers,
        getSelectedPlayer,
        closePlayerModal: () => closePlayerModal()
    };
})();

// Global verfügbar machen
window.closePlayerModal = TeamManagement.closePlayerModal;

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
