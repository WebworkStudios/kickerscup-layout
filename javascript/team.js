// =====================================================
// KICKERSCUP - TEAM MANAGEMENT SYSTEM (REFACTORED)
// Kompatibel mit ModuleManager + Event Delegation
// =====================================================

(function () {
    'use strict';

    const TeamManagement = (() => {
        // Private State
        let players = [];
        let currentSort = 'lineup';
        let eventListeners = [];

        // Mock-Daten
        const mockPlayers = [
            {
                id: 1,
                firstName: 'Max',
                lastName: 'Müller',
                position: 'TW',
                age: 28,
                strength: 85,
                stamina: 90,
                form: 88,
                freshness: 95,
                motivation: 92,
                contractYears: 3,
                gamesPlayed: 145,
                status: 'OK',
                isStarter: true,
                isCaptain: false
            },
            {
                id: 2,
                firstName: 'Tom',
                lastName: 'Schmidt',
                position: 'LV',
                age: 25,
                strength: 78,
                stamina: 85,
                form: 82,
                freshness: 90,
                motivation: 88,
                contractYears: 2,
                gamesPlayed: 98,
                status: 'OK',
                isStarter: true,
                isCaptain: false
            },
            {
                id: 3,
                firstName: 'Leon',
                lastName: 'Wagner',
                position: 'IV',
                age: 29,
                strength: 88,
                stamina: 82,
                form: 90,
                freshness: 88,
                motivation: 90,
                contractYears: 4,
                gamesPlayed: 187,
                status: 'OK',
                isStarter: true,
                isCaptain: true
            },
            {
                id: 4,
                firstName: 'Felix',
                lastName: 'Fischer',
                position: 'IV',
                age: 27,
                strength: 85,
                stamina: 84,
                form: 87,
                freshness: 92,
                motivation: 89,
                contractYears: 3,
                gamesPlayed: 156,
                status: 'OK',
                isStarter: true,
                isCaptain: false
            },
            {
                id: 5,
                firstName: 'Jan',
                lastName: 'Weber',
                position: 'RV',
                age: 24,
                strength: 80,
                stamina: 88,
                form: 85,
                freshness: 94,
                motivation: 91,
                contractYears: 2,
                gamesPlayed: 76,
                status: 'OK',
                isStarter: true,
                isCaptain: false
            },
            {
                id: 6,
                firstName: 'Lukas',
                lastName: 'Becker',
                position: 'DM',
                age: 26,
                strength: 82,
                stamina: 90,
                form: 86,
                freshness: 89,
                motivation: 87,
                contractYears: 3,
                gamesPlayed: 134,
                status: 'OK',
                isStarter: true,
                isCaptain: false
            },
            {
                id: 7,
                firstName: 'Jonas',
                lastName: 'Schulz',
                position: 'OM',
                age: 23,
                strength: 84,
                stamina: 86,
                form: 90,
                freshness: 96,
                motivation: 93,
                contractYears: 4,
                gamesPlayed: 89,
                status: 'OK',
                isStarter: true,
                isCaptain: false
            },
            {
                id: 8,
                firstName: 'Paul',
                lastName: 'Hoffmann',
                position: 'LM',
                age: 25,
                strength: 81,
                stamina: 92,
                form: 84,
                freshness: 91,
                motivation: 88,
                contractYears: 2,
                gamesPlayed: 112,
                status: 'OK',
                isStarter: true,
                isCaptain: false
            },
            {
                id: 9,
                firstName: 'David',
                lastName: 'Klein',
                position: 'RM',
                age: 24,
                strength: 79,
                stamina: 91,
                form: 83,
                freshness: 93,
                motivation: 90,
                contractYears: 3,
                gamesPlayed: 95,
                status: 'OK',
                isStarter: true,
                isCaptain: false
            },
            {
                id: 10,
                firstName: 'Marco',
                lastName: 'Richter',
                position: 'ST',
                age: 27,
                strength: 90,
                stamina: 85,
                form: 92,
                freshness: 87,
                motivation: 94,
                contractYears: 4,
                gamesPlayed: 165,
                status: 'OK',
                isStarter: true,
                isCaptain: false
            },
            {
                id: 11,
                firstName: 'Tim',
                lastName: 'Braun',
                position: 'ST',
                age: 22,
                strength: 86,
                stamina: 88,
                form: 88,
                freshness: 95,
                motivation: 91,
                contractYears: 3,
                gamesPlayed: 67,
                status: 'OK',
                isStarter: true,
                isCaptain: false
            },
            {
                id: 12,
                firstName: 'Niklas',
                lastName: 'Lang',
                position: 'TW',
                age: 32,
                strength: 80,
                stamina: 75,
                form: 78,
                freshness: 82,
                motivation: 85,
                contractYears: 1,
                gamesPlayed: 203,
                status: 'OK',
                isStarter: false,
                isCaptain: false
            },
            {
                id: 13,
                firstName: 'Simon',
                lastName: 'Krause',
                position: 'IV',
                age: 30,
                strength: 82,
                stamina: 78,
                form: 80,
                freshness: 85,
                motivation: 83,
                contractYears: 2,
                gamesPlayed: 178,
                status: 'OK',
                isStarter: false,
                isCaptain: false
            },
            {
                id: 14,
                firstName: 'Moritz',
                lastName: 'Zimmermann',
                position: 'LI',
                age: 21,
                strength: 75,
                stamina: 85,
                form: 79,
                freshness: 97,
                motivation: 89,
                contractYears: 4,
                gamesPlayed: 45,
                status: 'OK',
                isStarter: false,
                isCaptain: false
            },
            {
                id: 15,
                firstName: 'Elias',
                lastName: 'Krüger',
                position: 'DM',
                age: 28,
                strength: 81,
                stamina: 84,
                form: 82,
                freshness: 88,
                motivation: 86,
                contractYears: 2,
                gamesPlayed: 142,
                status: 'verletzt',
                isStarter: false,
                isCaptain: false
            },
            {
                id: 16,
                firstName: 'Noah',
                lastName: 'Hartmann',
                position: 'OM',
                age: 26,
                strength: 83,
                stamina: 87,
                form: 85,
                freshness: 90,
                motivation: 88,
                contractYears: 3,
                gamesPlayed: 118,
                status: 'OK',
                isStarter: false,
                isCaptain: false
            },
            {
                id: 17,
                firstName: 'Ben',
                lastName: 'Wolf',
                position: 'LS',
                age: 25,
                strength: 84,
                stamina: 86,
                form: 87,
                freshness: 92,
                motivation: 90,
                contractYears: 2,
                gamesPlayed: 89,
                status: 'OK',
                isStarter: false,
                isCaptain: false
            },
            {
                id: 18,
                firstName: 'Finn',
                lastName: 'Schröder',
                position: 'RS',
                age: 23,
                strength: 82,
                stamina: 89,
                form: 86,
                freshness: 94,
                motivation: 91,
                contractYears: 3,
                gamesPlayed: 72,
                status: 'gesperrt',
                isStarter: false,
                isCaptain: false
            }
        ];

        /**
         * Helper: Event Listener registrieren (für Cleanup)
         */
        function addEventListener(element, event, handler, options) {
            if (!element) return;
            element.addEventListener(event, handler, options);
            eventListeners.push({element, event, handler, options});
        }

        /**
         * Berechnet den Einsatzwert
         */
        function calculatePerformance(player) {
            return Math.round((player.strength + player.stamina + player.form + player.freshness + player.motivation) / 5);
        }

        /**
         * Rendert Spieler-Grid
         */
        function renderPlayers() {
            const grid = document.getElementById('playerGrid');
            if (!grid) return;

            grid.innerHTML = '';

            let sortedPlayers = [...players];

            // Sortierung
            switch (currentSort) {
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

            // Fragment für bessere Performance
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

            grid.appendChild(fragment);
        }

        /**
         * Update Team Stats
         */
        function updateTeamStats() {
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
        }

        /**
         * Zeigt Spieler-Detail Modal
         */
        function showPlayerDetail(playerId) {
            const player = players.find(p => p.id === playerId);
            if (!player) return;

            const performance = calculatePerformance(player);

            const elements = {
                modalPlayerName: document.getElementById('modalPlayerName'),
                modalPosition: document.getElementById('modalPosition'),
                modalAge: document.getElementById('modalAge'),
                modalStrength: document.getElementById('modalStrength'),
                modalStamina: document.getElementById('modalStamina'),
                modalForm: document.getElementById('modalForm'),
                modalFreshness: document.getElementById('modalFreshness'),
                modalMotivation: document.getElementById('modalMotivation'),
                modalPerformance: document.getElementById('modalPerformance'),
                modalContract: document.getElementById('modalContract'),
                modalGames: document.getElementById('modalGames'),
                modalStatus: document.getElementById('modalStatus'),
                progressStrength: document.getElementById('progressStrength'),
                progressStamina: document.getElementById('progressStamina'),
                progressForm: document.getElementById('progressForm'),
                progressFreshness: document.getElementById('progressFreshness'),
                progressMotivation: document.getElementById('progressMotivation')
            };

            if (elements.modalPlayerName) elements.modalPlayerName.textContent = `${player.firstName} ${player.lastName}`;
            if (elements.modalPosition) elements.modalPosition.textContent = player.position;
            if (elements.modalAge) elements.modalAge.textContent = `${player.age} Jahre`;
            if (elements.modalStrength) elements.modalStrength.textContent = player.strength;
            if (elements.modalStamina) elements.modalStamina.textContent = player.stamina;
            if (elements.modalForm) elements.modalForm.textContent = player.form;
            if (elements.modalFreshness) elements.modalFreshness.textContent = player.freshness;
            if (elements.modalMotivation) elements.modalMotivation.textContent = player.motivation;
            if (elements.modalPerformance) elements.modalPerformance.textContent = performance;
            if (elements.modalContract) elements.modalContract.textContent = `${player.contractYears} ${player.contractYears === 1 ? 'Jahr' : 'Jahre'}`;
            if (elements.modalGames) elements.modalGames.textContent = `${player.gamesPlayed} Spiele`;
            if (elements.modalStatus) elements.modalStatus.textContent = player.status === 'OK' ? 'Einsatzbereit' :
                player.status === 'verletzt' ? 'Verletzt' : 'Gesperrt';

            // Progress bars
            if (elements.progressStrength) elements.progressStrength.style.width = `${player.strength}%`;
            if (elements.progressStamina) elements.progressStamina.style.width = `${player.stamina}%`;
            if (elements.progressForm) elements.progressForm.style.width = `${player.form}%`;
            if (elements.progressFreshness) elements.progressFreshness.style.width = `${player.freshness}%`;
            if (elements.progressMotivation) elements.progressMotivation.style.width = `${player.motivation}%`;

            const modal = document.getElementById('playerModal');
            if (modal) modal.classList.add('active');
        }

        /**
         * Schließt Modal
         */
        function closeModal() {
            const modal = document.getElementById('playerModal');
            if (modal) modal.classList.remove('active');
        }

        /**
         * Sortiert Spieler
         */
        function sortBy(type) {
            currentSort = type;

            // Update Sort-Buttons
            document.querySelectorAll('.btn-sort').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.value === type) {
                    btn.classList.add('active');
                }
            });

            renderPlayers();
        }

        /**
         * Verlängert alle Verträge
         */
        function extendAllContracts() {
            if (confirm('Möchten Sie wirklich alle Verträge um eine Saison verlängern?')) {
                players.forEach(player => player.contractYears++);
                renderPlayers();
                alert('✅ Alle Verträge wurden um eine Saison verlängert!');
            }
        }

        /**
         * Zahlt Teamprämie aus
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
         * Zeigt Kapitän-Auswahl
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
         * Verleiht Spieler
         */
        function lendPlayers() {
            alert('📤 Spielerverleihe-System wird demnächst verfügbar sein.');
        }

        /**
         * Event Delegation Handler
         */
        function handleDocumentClick(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;

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
            }
        }

        /**
         * Player Card Click Handler
         */
        function handlePlayerCardClick(e) {
            const card = e.target.closest('.player-card');
            if (!card) return;

            const playerId = parseInt(card.dataset.playerId);
            if (playerId) {
                showPlayerDetail(playerId);
            }
        }

        /**
         * Initialisiert das Modul
         */
        function init() {
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

            console.log('✅ Team Management System initialisiert');
        }

        /**
         * Cleanup beim Verlassen
         */
        function cleanup() {
            // Entferne alle Event Listener
            eventListeners.forEach(({element, event, handler, options}) => {
                if (element) {
                    element.removeEventListener(event, handler, options);
                }
            });
            eventListeners = [];

            // Reset State
            players = [];
            currentSort = 'lineup';

            console.log('🧹 Team Management Cleanup durchgeführt');
        }

        // Public API
        return {
            init,
            cleanup
        };
    })();

    // Expose für ModuleManager
    window.__KICKERSCUP_MODULE__ = TeamManagement;

})();