// =====================================================
// KICKERSCUP - LINEUP SYSTEM
// Aufstellungs-Management mit Drag&Drop & Touch
// =====================================================

(function () {
    'use strict';

    // State
    let currentFormation = '4-4-2';
    let fieldSlots = [];
    let benchSlots = [];
    let availablePlayers = [];
    let selectedPlayer = null;
    let selectedSlot = null;
    let eventListeners = [];
    let isTouchDevice = false;

    // Initialize from config
    const config = window.LineupConfig;

    /**
     * Helper: Event Listener registrieren
     */
    function addEventListener(element, event, handler, options) {
        if (!element) return;
        element.addEventListener(event, handler, options);
        eventListeners.push({ element, event, handler, options });
    }

    /**
     * Calculate Position Factor
     */
    function calculatePositionFactor(playerPosition, slotPosition) {
        const compatibility = config.positionCompatibility[playerPosition];
        if (!compatibility) return 0.8; // Default fallback

        const factor = compatibility[slotPosition];
        if (factor === undefined) return 0.8; // Fallback

        return factor;
    }

    /**
     * Calculate Form Factor
     */
    function calculateFormFactor(form) {
        return 0.95 + (form - 5) * 0.01;
    }

    /**
     * Calculate Fitness Factor
     */
    function calculateFitnessFactor(fitness) {
        return fitness / 100;
    }

    /**
     * Calculate Effective Strength
     */
    function calculateEffectiveStrength(player, slotPosition) {
        const positionFactor = calculatePositionFactor(player.main_position, slotPosition);
        const formFactor = calculateFormFactor(player.form);
        const fitnessFactor = calculateFitnessFactor(player.fitness);

        return Math.round(player.base_strength * positionFactor * formFactor * fitnessFactor);
    }

    /**
     * Get Position Penalty Description
     */
    function getPositionPenalty(playerPosition, slotPosition) {
        const factor = calculatePositionFactor(playerPosition, slotPosition);

        if (factor === 0) return { text: '🚫 Verboten', severe: true, penalty: 100 };
        if (factor === 1.0) return { text: '', severe: false, penalty: 0 };

        const penalty = Math.round((1 - factor) * 100);
        return {
            text: `⚠️ -${penalty}% Position`,
            severe: penalty >= 20,
            penalty
        };
    }

    /**
     * Check if Player can play Position
     */
    function canPlayPosition(player, position) {
        return calculatePositionFactor(player.main_position, position) > 0;
    }

    /**
     * Render Formation Slots
     */
    function renderFormationSlots() {
        const container = document.getElementById('fieldSlots');
        if (!container) return;

        const formation = config.formations[currentFormation];
        if (!formation) return;

        fieldSlots = formation.positions.map((pos, index) => ({
            id: `field-${index}`,
            position: pos.position,
            x: pos.x,
            y: pos.y,
            player: null
        }));

        container.innerHTML = fieldSlots.map((slot, index) => `
            <div class="field-slot" 
                 id="${slot.id}"
                 data-slot-index="${index}"
                 data-slot-type="field"
                 data-position="${slot.position}"
                 style="left: ${slot.x}%; top: ${slot.y}%; transform: translate(-50%, -50%);">
                <div class="slot-position">${slot.position}</div>
                <div class="slot-placeholder">⚽</div>
            </div>
        `).join('');
    }

    /**
     * Render Bench Slots
     */
    function renderBenchSlots() {
        const container = document.getElementById('benchSlots');
        if (!container) return;

        benchSlots = Array.from({ length: 9 }, (_, i) => ({
            id: `bench-${i}`,
            player: null
        }));

        container.innerHTML = benchSlots.map((slot, index) => `
            <div class="bench-slot"
                 id="${slot.id}"
                 data-slot-index="${index}"
                 data-slot-type="bench">
                <div class="bench-placeholder">+</div>
            </div>
        `).join('');

        updateBenchCount();
    }

    /**
     * Render Player Card
     */
    function renderPlayerCard(player, slotPosition = null) {
        const effectiveStrength = slotPosition
            ? calculateEffectiveStrength(player, slotPosition)
            : player.base_strength;

        const penalty = slotPosition
            ? getPositionPenalty(player.main_position, slotPosition)
            : { text: '', severe: false };

        const isUnavailable = player.status !== 'fit';
        const canPlay = slotPosition ? canPlayPosition(player, slotPosition) : true;

        return `
            <div class="player-card ${isUnavailable || !canPlay ? 'unavailable' : ''}" 
                 data-player-id="${player.id}"
                 draggable="${!isUnavailable && canPlay}">
                <div class="player-card-header">
                    <div class="player-card-name">${player.name}</div>
                    <div class="player-card-position">${player.main_position}</div>
                </div>
                <div class="player-card-stats">
                    <div class="player-stat">
                        <span class="player-stat-label">Basis</span>
                        <span class="player-stat-value">${player.base_strength}</span>
                    </div>
                    <div class="player-stat">
                        <span class="player-stat-label">Effektiv</span>
                        <span class="player-stat-value">${effectiveStrength}</span>
                    </div>
                    <div class="player-stat">
                        <span class="player-stat-label">Form</span>
                        <span class="player-stat-value">${player.form}</span>
                    </div>
                    <div class="player-stat">
                        <span class="player-stat-label">Fitness</span>
                        <span class="player-stat-value">${player.fitness}%</span>
                    </div>
                </div>
                ${penalty.text ? `<div class="player-card-penalty ${penalty.severe ? 'severe' : ''}">${penalty.text}</div>` : ''}
                ${isUnavailable ? `<span class="player-status-badge status-${player.status}">${player.status === 'injured' ? 'Verletzt' : 'Gesperrt'}</span>` : ''}
            </div>
        `;
    }

    /**
     * Render Available Players
     */
    function renderAvailablePlayers() {
        const container = document.getElementById('availablePlayersList');
        if (!container) return;

        // Filter players not in lineup
        const placedPlayerIds = new Set([
            ...fieldSlots.filter(s => s.player).map(s => s.player.id),
            ...benchSlots.filter(s => s.player).map(s => s.player.id)
        ]);

        const available = availablePlayers.filter(p => !placedPlayerIds.has(p.id));

        // Apply filters
        const searchTerm = document.getElementById('playerSearch')?.value.toLowerCase() || '';
        const positionFilter = document.getElementById('positionFilter')?.value || '';
        const sortBy = document.getElementById('sortSelect')?.value || 'strength';

        let filtered = available.filter(player => {
            const matchesSearch = player.name.toLowerCase().includes(searchTerm);
            const matchesPosition = !positionFilter || player.main_position === positionFilter;
            return matchesSearch && matchesPosition;
        });

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'strength':
                    return b.base_strength - a.base_strength;
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'position':
                    return a.main_position.localeCompare(b.main_position);
                default:
                    return 0;
            }
        });

        container.innerHTML = filtered.map(player => renderPlayerCard(player)).join('');
    }

    /**
     * Place Player in Slot
     */
    function placePlayer(player, slotType, slotIndex) {
        const slots = slotType === 'field' ? fieldSlots : benchSlots;
        const slot = slots[slotIndex];

        if (!slot) return false;

        // Check if position is valid for field slots
        if (slotType === 'field') {
            if (!canPlayPosition(player, slot.position)) {
                showToast('❌ Spieler kann diese Position nicht spielen', 'error');
                return false;
            }
        }

        // Remove player from old position if exists
        removePlayerFromLineup(player.id);

        // Place player
        slot.player = player;

        // Update UI
        renderSlot(slotType, slotIndex);
        renderAvailablePlayers();
        updateTeamStrength();
        validateLineup();

        return true;
    }

    /**
     * Remove Player from Lineup
     */
    function removePlayerFromLineup(playerId) {
        // Check field slots
        fieldSlots.forEach((slot, index) => {
            if (slot.player && slot.player.id === playerId) {
                slot.player = null;
                renderSlot('field', index);
            }
        });

        // Check bench slots
        benchSlots.forEach((slot, index) => {
            if (slot.player && slot.player.id === playerId) {
                slot.player = null;
                renderSlot('bench', index);
            }
        });

        renderAvailablePlayers();
        updateTeamStrength();
        updateBenchCount();
        validateLineup();
    }

    /**
     * Render Single Slot
     */
    function renderSlot(slotType, slotIndex) {
        const slots = slotType === 'field' ? fieldSlots : benchSlots;
        const slot = slots[slotIndex];
        const element = document.getElementById(slot.id);

        if (!element) return;

        if (slot.player) {
            element.classList.add('occupied');
            const slotPosition = slotType === 'field' ? slot.position : null;
            element.innerHTML = `
                <div class="field-player-card">
                    ${renderPlayerCard(slot.player, slotPosition)}
                </div>
            `;
        } else {
            element.classList.remove('occupied');
            if (slotType === 'field') {
                element.innerHTML = `
                    <div class="slot-position">${slot.position}</div>
                    <div class="slot-placeholder">⚽</div>
                `;
            } else {
                element.innerHTML = '<div class="bench-placeholder">+</div>';
            }
        }
    }

    /**
     * Update Team Strength
     */
    function updateTeamStrength() {
        const totalStrength = fieldSlots.reduce((sum, slot) => {
            if (slot.player) {
                return sum + calculateEffectiveStrength(slot.player, slot.position);
            }
            return sum;
        }, 0);

        const element = document.getElementById('teamStrength');
        if (element) {
            element.textContent = totalStrength.toLocaleString();
        }
    }

    /**
     * Update Bench Count
     */
    function updateBenchCount() {
        const count = benchSlots.filter(s => s.player).length;
        const element = document.getElementById('benchCount');
        if (element) {
            element.textContent = `(${count}/9)`;
        }
    }

    /**
     * Validate Lineup
     */
    function validateLineup() {
        const errors = [];
        const warnings = [];

        // Count players
        const fieldCount = fieldSlots.filter(s => s.player).length;
        const benchCount = benchSlots.filter(s => s.player).length;
        const totalCount = fieldCount + benchCount;

        // Check minimum players
        if (totalCount < config.validation.minPlayersInSquad) {
            errors.push({
                icon: '❌',
                text: `Mindestens ${config.validation.minPlayersInSquad} Spieler im Spielbericht erforderlich (aktuell: ${totalCount})`
            });
        }

        // Check maximum players
        if (totalCount > config.validation.maxPlayersInSquad) {
            errors.push({
                icon: '❌',
                text: `Maximal ${config.validation.maxPlayersInSquad} Spieler im Spielbericht erlaubt (aktuell: ${totalCount})`
            });
        }

        // Check starting eleven
        if (fieldCount < 11) {
            warnings.push({
                icon: '⚠️',
                text: `Aufstellung unvollständig: ${11 - fieldCount} Positionen offen`
            });
        }

        // Check injured/banned players
        [...fieldSlots, ...benchSlots].forEach(slot => {
            if (slot.player && slot.player.status !== 'fit') {
                errors.push({
                    icon: '🚑',
                    text: `${slot.player.name} ist ${slot.player.status === 'injured' ? 'verletzt' : 'gesperrt'} und kann nicht eingesetzt werden`
                });
            }
        });

        // Check position penalties
        fieldSlots.forEach(slot => {
            if (slot.player) {
                const penalty = getPositionPenalty(slot.player.main_position, slot.position);
                if (penalty.penalty >= 10 && penalty.penalty < 20) {
                    warnings.push({
                        icon: '⚠️',
                        text: `${slot.player.name} auf ${slot.position}: ${penalty.text}`
                    });
                } else if (penalty.penalty >= 20) {
                    warnings.push({
                        icon: '🔴',
                        text: `${slot.player.name} auf ${slot.position}: Hoher Positionsabzug (${penalty.penalty}%)`
                    });
                }
            }
        });

        // Render validation
        renderValidation(errors, warnings);
    }

    /**
     * Render Validation Messages
     */
    function renderValidation(errors, warnings) {
        const panel = document.getElementById('validationPanel');
        const header = document.getElementById('validationHeader');
        const list = document.getElementById('validationList');

        if (!panel || !header || !list) return;

        // Update panel state
        panel.classList.remove('has-errors', 'has-warnings');

        if (errors.length > 0) {
            panel.classList.add('has-errors');
        } else if (warnings.length > 0) {
            panel.classList.add('has-warnings');
        }

        // Update header
        const icon = header.querySelector('.validation-icon');
        const title = header.querySelector('.validation-title');

        if (errors.length > 0) {
            icon.textContent = '❌';
            title.textContent = `${errors.length} Fehler`;
        } else if (warnings.length > 0) {
            icon.textContent = '⚠️';
            title.textContent = `${warnings.length} Warnungen`;
        } else {
            icon.textContent = '✓';
            title.textContent = 'Aufstellung gültig';
        }

        // Render messages
        const allMessages = [
            ...errors.map(e => ({ ...e, type: 'error' })),
            ...warnings.map(w => ({ ...w, type: 'warning' }))
        ];

        if (allMessages.length === 0) {
            list.innerHTML = '<li class="validation-item">Keine Probleme gefunden</li>';
        } else {
            list.innerHTML = allMessages.map(msg => `
                <li class="validation-item ${msg.type}">
                    <span class="validation-item-icon">${msg.icon}</span>
                    <span>${msg.text}</span>
                </li>
            `).join('');
        }
    }

    /**
     * Show Toast Message
     */
    function showToast(message, type = 'info') {
        // Simple alert for now - can be enhanced
        const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${icon} ${message}`);
    }

    /**
     * Handle Drag Start
     */
    function handleDragStart(e) {
        const card = e.target.closest('.player-card');
        if (!card) return;

        const playerId = parseInt(card.dataset.playerId);
        const player = availablePlayers.find(p => p.id === playerId);

        if (!player || player.status !== 'fit') {
            e.preventDefault();
            return;
        }

        selectedPlayer = player;
        card.classList.add('dragging');

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', card.innerHTML);
    }

    /**
     * Handle Drag End
     */
    function handleDragEnd(e) {
        const card = e.target.closest('.player-card');
        if (card) {
            card.classList.remove('dragging');
        }
        selectedPlayer = null;
    }

    /**
     * Handle Drag Over
     */
    function handleDragOver(e) {
        if (!selectedPlayer) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const slot = e.target.closest('.field-slot, .bench-slot');
        if (slot) {
            slot.classList.add('drag-over');
        }
    }

    /**
     * Handle Drag Leave
     */
    function handleDragLeave(e) {
        const slot = e.target.closest('.field-slot, .bench-slot');
        if (slot) {
            slot.classList.remove('drag-over');
        }
    }

    /**
     * Handle Drop
     */
    function handleDrop(e) {
        e.preventDefault();

        const slot = e.target.closest('.field-slot, .bench-slot');
        if (!slot) return;

        slot.classList.remove('drag-over');

        if (!selectedPlayer) return;

        const slotType = slot.dataset.slotType;
        const slotIndex = parseInt(slot.dataset.slotIndex);

        placePlayer(selectedPlayer, slotType, slotIndex);
        selectedPlayer = null;
    }

    /**
     * Handle Touch/Click on Player
     */
    function handlePlayerClick(e) {
        if (!isTouchDevice) return;

        const card = e.target.closest('.player-card');
        if (!card) return;

        const playerId = parseInt(card.dataset.playerId);
        const player = availablePlayers.find(p => p.id === playerId);

        if (!player || player.status !== 'fit') return;

        // Deselect if clicking same player
        if (selectedPlayer && selectedPlayer.id === player.id) {
            selectedPlayer = null;
            card.classList.remove('selected');
            document.querySelectorAll('.field-slot, .bench-slot').forEach(s => s.classList.remove('selected'));
            hideTouchInstructions();
            return;
        }

        // Select new player
        selectedPlayer = player;
        document.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Highlight valid slots
        document.querySelectorAll('.field-slot').forEach(slot => {
            const position = slot.dataset.position;
            if (canPlayPosition(player, position)) {
                slot.classList.add('selected');
            }
        });

        document.querySelectorAll('.bench-slot').forEach(slot => {
            slot.classList.add('selected');
        });

        showTouchInstructions();
    }

    /**
     * Handle Touch/Click on Slot
     */
    function handleSlotClick(e) {
        if (!isTouchDevice || !selectedPlayer) return;

        const slot = e.target.closest('.field-slot, .bench-slot');
        if (!slot) return;

        const slotType = slot.dataset.slotType;
        const slotIndex = parseInt(slot.dataset.slotIndex);

        if (placePlayer(selectedPlayer, slotType, slotIndex)) {
            // Success
            selectedPlayer = null;
            document.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
            document.querySelectorAll('.field-slot, .bench-slot').forEach(s => s.classList.remove('selected'));
            hideTouchInstructions();
        }
    }

    /**
     * Show Touch Instructions
     */
    function showTouchInstructions() {
        const element = document.getElementById('touchInstructions');
        if (element) {
            element.classList.add('active');
        }
    }

    /**
     * Hide Touch Instructions
     */
    function hideTouchInstructions() {
        const element = document.getElementById('touchInstructions');
        if (element) {
            element.classList.remove('active');
        }
    }

    /**
     * Handle Formation Change
     */
    function handleFormationChange(e) {
        const newFormation = e.target.value;

        if (confirm(`Möchten Sie die Formation zu ${newFormation} ändern? Die aktuelle Aufstellung wird zurückgesetzt.`)) {
            currentFormation = newFormation;

            // Clear lineup
            fieldSlots.forEach(slot => slot.player = null);

            // Re-render
            renderFormationSlots();
            renderAvailablePlayers();
            updateTeamStrength();
            validateLineup();

            // Re-attach event listeners to new slots
            attachSlotEventListeners();
        } else {
            // Reset dropdown
            e.target.value = currentFormation;
        }
    }

    /**
     * Clear Lineup
     */
    function clearLineup() {
        if (!confirm('Möchten Sie die gesamte Aufstellung zurücksetzen?')) return;

        fieldSlots.forEach(slot => slot.player = null);
        benchSlots.forEach(slot => slot.player = null);

        renderFormationSlots();
        renderBenchSlots();
        renderAvailablePlayers();
        updateTeamStrength();
        validateLineup();

        // Re-attach event listeners
        attachSlotEventListeners();

        showToast('Aufstellung zurückgesetzt', 'success');
    }

    /**
     * Save Lineup to localStorage
     */
    function saveLineup() {
        const lineup = {
            formation: currentFormation,
            date: new Date().toISOString(),
            field: fieldSlots.map(slot => slot.player ? slot.player.id : null),
            bench: benchSlots.map(slot => slot.player ? slot.player.id : null)
        };

        try {
            localStorage.setItem('kickerscup_lineup', JSON.stringify(lineup));
            showToast('✅ Aufstellung gespeichert', 'success');
            alert('✅ Aufstellung erfolgreich gespeichert!');
        } catch (error) {
            console.error('Save error:', error);
            showToast('❌ Fehler beim Speichern', 'error');
            alert('❌ Fehler beim Speichern der Aufstellung');
        }
    }

    /**
     * Load Lineup from localStorage
     */
    function loadLineup() {
        try {
            const saved = localStorage.getItem('kickerscup_lineup');
            if (!saved) return false;

            const lineup = JSON.parse(saved);

            // Set formation
            currentFormation = lineup.formation;
            document.getElementById('formationSelect').value = currentFormation;

            // Render formation
            renderFormationSlots();

            // Place players
            lineup.field.forEach((playerId, index) => {
                if (playerId) {
                    const player = availablePlayers.find(p => p.id === playerId);
                    if (player) {
                        fieldSlots[index].player = player;
                        renderSlot('field', index);
                    }
                }
            });

            lineup.bench.forEach((playerId, index) => {
                if (playerId) {
                    const player = availablePlayers.find(p => p.id === playerId);
                    if (player) {
                        benchSlots[index].player = player;
                        renderSlot('bench', index);
                    }
                }
            });

            renderAvailablePlayers();
            updateTeamStrength();
            updateBenchCount();
            validateLineup();

            // Re-attach event listeners
            attachSlotEventListeners();

            return true;
        } catch (error) {
            console.error('Load error:', error);
            return false;
        }
    }

    /**
     * Attach Event Listeners to Slots
     */
    function attachSlotEventListeners() {
        // Drag & Drop listeners
        document.querySelectorAll('.field-slot, .bench-slot').forEach(slot => {
            addEventListener(slot, 'dragover', handleDragOver);
            addEventListener(slot, 'dragleave', handleDragLeave);
            addEventListener(slot, 'drop', handleDrop);

            if (isTouchDevice) {
                addEventListener(slot, 'click', handleSlotClick);
            }
        });
    }

    /**
     * Initialize Event Listeners
     */
    function initEventListeners() {
        // Detect touch device
        isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Formation selector
        const formationSelect = document.getElementById('formationSelect');
        if (formationSelect) {
            addEventListener(formationSelect, 'change', handleFormationChange);
        }

        // Action buttons
        const clearBtn = document.getElementById('clearLineup');
        const saveBtn = document.getElementById('saveLineup');

        if (clearBtn) addEventListener(clearBtn, 'click', clearLineup);
        if (saveBtn) addEventListener(saveBtn, 'click', saveLineup);

        // Validation toggle
        const validationHeader = document.getElementById('validationHeader');
        const validationPanel = document.getElementById('validationPanel');

        if (validationHeader && validationPanel) {
            addEventListener(validationHeader, 'click', () => {
                validationPanel.classList.toggle('collapsed');
            });
        }

        // Player search and filters
        const searchInput = document.getElementById('playerSearch');
        const positionFilter = document.getElementById('positionFilter');
        const sortSelect = document.getElementById('sortSelect');

        if (searchInput) {
            addEventListener(searchInput, 'input', renderAvailablePlayers);
        }
        if (positionFilter) {
            addEventListener(positionFilter, 'change', renderAvailablePlayers);
        }
        if (sortSelect) {
            addEventListener(sortSelect, 'change', renderAvailablePlayers);
        }

        // Delegate player drag events
        addEventListener(document, 'dragstart', (e) => {
            if (e.target.closest('.player-card')) {
                handleDragStart(e);
            }
        });

        addEventListener(document, 'dragend', (e) => {
            if (e.target.closest('.player-card')) {
                handleDragEnd(e);
            }
        });

        // Touch mode - player selection
        if (isTouchDevice) {
            addEventListener(document, 'click', (e) => {
                if (e.target.closest('.player-card')) {
                    handlePlayerClick(e);
                }
            });
        }

        // Attach slot listeners
        attachSlotEventListeners();
    }

    /**
     * Initialize Module
     */
    function init() {
        // Load players from config
        availablePlayers = [...config.examplePlayers];

        // Render initial state
        renderFormationSlots();
        renderBenchSlots();
        renderAvailablePlayers();

        // Try to load saved lineup
        const loaded = loadLineup();

        if (!loaded) {
            updateTeamStrength();
            validateLineup();
        }

        // Setup event listeners
        initEventListeners();

        console.log('✅ Lineup System initialisiert');
    }

    /**
     * Cleanup
     */
    function cleanup() {
        // Remove all event listeners
        eventListeners.forEach(({ element, event, handler, options }) => {
            if (element) {
                element.removeEventListener(event, handler, options);
            }
        });
        eventListeners = [];

        // Reset state
        fieldSlots = [];
        benchSlots = [];
        selectedPlayer = null;
        selectedSlot = null;

        console.log('🧹 Lineup System Cleanup durchgeführt');
    }

    // Expose für ModuleManager
    window.__KICKERSCUP_MODULE__ = {
        init,
        cleanup
    };

})();