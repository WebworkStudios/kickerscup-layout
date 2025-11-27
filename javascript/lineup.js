// =====================================================
// KICKERSCUP - LINEUP SYSTEM (COMPLETE & FIXED)
// Alle Features + funktionierendes Drag & Drop
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

    // Touch-Drag State
    let touchStartPos = null;
    let ghostElement = null;
    let draggedPlayer = null;
    let isDragging = false;

    // Performance
    let placedPlayerIds = new Set();

    // Audio Context
    let audioContext = null;

    const config = window.LineupConfig;

    /**
     * Helper: Event Listener registrieren (für Cleanup)
     */
    function addEventListener(element, event, handler, options) {
        if (!element) return;
        element.addEventListener(event, handler, options);
        eventListeners.push({ element, event, handler, options });
    }

    /**
     * Initialize Audio Context
     */
    function initAudioContext() {
        if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Play Success Sound
     */
    function playSuccessSound() {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    /**
     * Play Error Sound
     */
    function playErrorSound() {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 200;
        oscillator.type = 'sawtooth';

        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    }

    /**
     * Play Remove Sound
     */
    function playRemoveSound() {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 600;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.08);
    }

    /**
     * Show Toast Notification
     */
    function showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Show Floating Success Message
     */
    function showFloatingSuccess(playerName) {
        const existing = document.querySelector('.floating-success');
        if (existing) existing.remove();

        const floatingMsg = document.createElement('div');
        floatingMsg.className = 'floating-success';
        floatingMsg.innerHTML = `
            <span class="floating-success-icon">✓</span>
            <span class="floating-success-text">${playerName} platziert</span>
        `;

        document.body.appendChild(floatingMsg);

        requestAnimationFrame(() => {
            floatingMsg.classList.add('show');
        });

        setTimeout(() => {
            floatingMsg.classList.remove('show');
            setTimeout(() => floatingMsg.remove(), 500);
        }, 2000);
    }

    /**
     * Animate Number
     */
    function animateNumber(element, from, to, duration = 400) {
        const startTime = performance.now();
        const diff = to - from;
        const steps = 20;

        element.classList.add('updating');

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const current = Math.round(from + diff * progress);
            element.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.classList.remove('updating');
            }
        }

        requestAnimationFrame(update);
    }

    /**
     * Calculate Position Factor
     */
    function calculatePositionFactor(playerPosition, slotPosition) {
        const compatibility = config.positionCompatibility[playerPosition];
        if (!compatibility) return 0.8;

        const factor = compatibility[slotPosition];
        if (factor === undefined) return 0.8;

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
     * Update Placed Players Set
     */
    function updatePlacedPlayersSet() {
        placedPlayerIds.clear();
        fieldSlots.forEach(slot => {
            if (slot.player) placedPlayerIds.add(slot.player.id);
        });
        benchSlots.forEach(slot => {
            if (slot.player) placedPlayerIds.add(slot.player.id);
        });
    }

    /**
     * Update Player Visibility (Selective Re-Rendering)
     */
    function updatePlayerVisibility(playerId, isPlaced) {
        const card = document.querySelector(`.available-players-list .player-card[data-player-id="${playerId}"]`);
        if (!card) return;

        if (isPlaced) {
            card.classList.add('placing');
            setTimeout(() => {
                card.style.display = 'none';
                card.classList.remove('placing');
            }, 300);
        } else {
            card.style.display = 'block';
            requestAnimationFrame(() => {
                card.classList.add('returning');
                setTimeout(() => card.classList.remove('returning'), 300);
            });
        }
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

        const searchTerm = document.getElementById('playerSearch')?.value.toLowerCase() || '';
        const positionFilter = document.getElementById('positionFilter')?.value || '';
        const sortBy = document.getElementById('sortSelect')?.value || 'strength';

        let available = availablePlayers.filter(p => !placedPlayerIds.has(p.id));

        available = available.filter(player => {
            const matchesSearch = player.name.toLowerCase().includes(searchTerm);
            const matchesPosition = !positionFilter || player.main_position === positionFilter;
            return matchesSearch && matchesPosition;
        });

        available.sort((a, b) => {
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

        container.innerHTML = available.map((player, index) => {
            const card = renderPlayerCard(player);
            return `<div class="player-card-wrapper" style="animation-delay: ${index * 0.02}s">${card}</div>`;
        }).join('');
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
                showToast('Spieler kann diese Position nicht spielen', 'error');
                playErrorSound();
                return false;
            }
        }

        // Remove player from old position if exists
        const oldPosition = removePlayerFromLineup(player.id);

        // Place player
        slot.player = player;
        placedPlayerIds.add(player.id);

        // Update UI with animation
        renderSlot(slotType, slotIndex, true);

        // Only hide from available list if not moving from another position
        if (!oldPosition) {
            updatePlayerVisibility(player.id, true);
        }

        updateTeamStrength();
        updateBenchCount();
        validateLineup();

        // Feedback
        showFloatingSuccess(player.name);
        playSuccessSound();

        return true;
    }

    /**
     * Remove Player from Lineup
     */
    function removePlayerFromLineup(playerId) {
        let oldPosition = null;

        // Check field slots
        fieldSlots.forEach((slot, index) => {
            if (slot.player && slot.player.id === playerId) {
                oldPosition = { type: 'field', index };
                slot.player = null;
                renderSlot('field', index);
            }
        });

        // Check bench slots
        benchSlots.forEach((slot, index) => {
            if (slot.player && slot.player.id === playerId) {
                oldPosition = { type: 'bench', index };
                slot.player = null;
                renderSlot('bench', index);
            }
        });

        if (oldPosition) {
            placedPlayerIds.delete(playerId);
        }

        return oldPosition;
    }

    /**
     * Remove Player with Animation
     */
    function removePlayerWithAnimation(playerId) {
        const player = availablePlayers.find(p => p.id === playerId);
        if (!player) return;

        removePlayerFromLineup(playerId);
        updatePlayerVisibility(playerId, false);
        updateTeamStrength();
        updateBenchCount();
        validateLineup();

        showToast(`${player.name} entfernt`, 'info');
        playRemoveSound();
    }

    /**
     * Render Single Slot
     */
    function renderSlot(slotType, slotIndex, animate = false) {
        const slots = slotType === 'field' ? fieldSlots : benchSlots;
        const slot = slots[slotIndex];
        const element = document.getElementById(slot.id);

        if (!element) return;

        if (slot.player) {
            element.classList.add('occupied');
            if (animate) {
                element.classList.add('just-filled');
                setTimeout(() => element.classList.remove('just-filled'), 500);
            }
            const slotPosition = slotType === 'field' ? slot.position : null;
            element.innerHTML = `
                <div class="field-player-card">
                    ${renderPlayerCard(slot.player, slotPosition)}
                    <button class="quick-remove-btn" data-player-id="${slot.player.id}" title="Entfernen">×</button>
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
        const oldStrength = parseInt(document.getElementById('teamStrength')?.textContent.replace(/\./g, '') || '0');

        const totalStrength = fieldSlots.reduce((sum, slot) => {
            if (slot.player) {
                return sum + calculateEffectiveStrength(slot.player, slot.position);
            }
            return sum;
        }, 0);

        const element = document.getElementById('teamStrength');
        if (element) {
            if (oldStrength !== totalStrength) {
                animateNumber(element, oldStrength, totalStrength);
            }
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

    // ========================================
    // TOUCH-DRAG IMPLEMENTATION
    // ========================================

    /**
     * Create Ghost Element
     */
    function createGhost(card, touch) {
        ghostElement = card.cloneNode(true);
        ghostElement.classList.add('ghost-dragging');

        const rect = card.getBoundingClientRect();
        ghostElement.style.position = 'fixed';
        ghostElement.style.width = rect.width + 'px';
        ghostElement.style.left = (touch.clientX - rect.width / 2) + 'px';
        ghostElement.style.top = (touch.clientY - rect.height / 2) + 'px';
        ghostElement.style.zIndex = '9999';
        ghostElement.style.pointerEvents = 'none';

        document.body.appendChild(ghostElement);
    }

    /**
     * Remove Ghost Element
     */
    function removeGhost() {
        if (ghostElement && ghostElement.parentNode) {
            ghostElement.parentNode.removeChild(ghostElement);
        }
        ghostElement = null;
    }

    /**
     * Handle Touch Start
     */
    function handleTouchStart(e) {
        const card = e.target.closest('.player-card');
        if (!card || card.classList.contains('unavailable')) return;

        const playerId = parseInt(card.dataset.playerId);
        draggedPlayer = availablePlayers.find(p => p.id === playerId);

        if (!draggedPlayer || draggedPlayer.status !== 'fit') {
            return;
        }

        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };

        setTimeout(() => {
            if (touchStartPos && !isDragging) {
                isDragging = true;
                createGhost(card, touch);
                card.classList.add('dragging');
            }
        }, 150);
    }

    /**
     * Handle Touch Move
     */
    function handleTouchMove(e) {
        if (!isDragging || !ghostElement) return;

        e.preventDefault();

        const touch = e.touches[0];

        const rect = ghostElement.getBoundingClientRect();
        ghostElement.style.left = (touch.clientX - rect.width / 2) + 'px';
        ghostElement.style.top = (touch.clientY - rect.height / 2) + 'px';

        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const slot = element?.closest('.field-slot, .bench-slot');

        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        if (slot && draggedPlayer) {
            const slotType = slot.dataset.slotType;
            const position = slot.dataset.position;

            if (slotType === 'field') {
                if (canPlayPosition(draggedPlayer, position)) {
                    slot.classList.add('drag-over');
                }
            } else {
                slot.classList.add('drag-over');
            }
        }
    }

    /**
     * Handle Touch End
     */
    function handleTouchEnd(e) {
        if (!isDragging) {
            touchStartPos = null;
            return;
        }

        const touch = e.changedTouches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const slot = element?.closest('.field-slot, .bench-slot');

        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        if (slot && draggedPlayer) {
            const slotType = slot.dataset.slotType;
            const slotIndex = parseInt(slot.dataset.slotIndex);

            placePlayer(draggedPlayer, slotType, slotIndex);
        }

        removeGhost();
        touchStartPos = null;
        draggedPlayer = null;
        isDragging = false;
    }

    /**
     * Handle Touch Cancel
     */
    function handleTouchCancel() {
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        removeGhost();
        touchStartPos = null;
        draggedPlayer = null;
        isDragging = false;
    }

    // ========================================
    // DESKTOP DRAG & DROP HANDLERS (FIXED)
    // ========================================

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
        e.dataTransfer.setData('text/plain', player.id);
    }

    /**
     * Handle Drag End
     */
    function handleDragEnd(e) {
        const card = e.target.closest('.player-card');
        if (card) {
            card.classList.remove('dragging');
        }

        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
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
            const slotType = slot.dataset.slotType;
            const position = slot.dataset.position;

            if (slotType === 'field') {
                if (canPlayPosition(selectedPlayer, position)) {
                    slot.classList.add('drag-over');
                }
            } else {
                slot.classList.add('drag-over');
            }
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
     * Handle Drop (FIXED VERSION)
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        const slot = e.target.closest('.field-slot, .bench-slot');
        if (!slot) {
            selectedPlayer = null;
            return;
        }

        slot.classList.remove('drag-over');

        if (!selectedPlayer) return;

        const slotType = slot.dataset.slotType;
        const slotIndex = parseInt(slot.dataset.slotIndex);

        placePlayer(selectedPlayer, slotType, slotIndex);
        selectedPlayer = null;
    }

    /**
     * Handle Formation Change
     */
    function handleFormationChange(e) {
        const newFormation = e.target.value;

        if (confirm(`Möchten Sie die Formation zu ${newFormation} ändern? Die aktuelle Aufstellung wird zurückgesetzt.`)) {
            currentFormation = newFormation;

            fieldSlots.forEach(slot => slot.player = null);

            renderFormationSlots();
            updatePlacedPlayersSet();
            renderAvailablePlayers();
            updateTeamStrength();
            validateLineup();

            attachSlotEventListeners();
        } else {
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
        updatePlacedPlayersSet();
        renderAvailablePlayers();
        updateTeamStrength();
        validateLineup();

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
            showToast('Aufstellung gespeichert', 'success');
            playSuccessSound();
        } catch (error) {
            console.error('Save error:', error);
            showToast('Fehler beim Speichern', 'error');
            playErrorSound();
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

            currentFormation = lineup.formation;
            document.getElementById('formationSelect').value = currentFormation;

            renderFormationSlots();

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

            updatePlacedPlayersSet();
            renderAvailablePlayers();
            updateTeamStrength();
            updateBenchCount();
            validateLineup();

            attachSlotEventListeners();

            return true;
        } catch (error) {
            console.error('Load error:', error);
            return false;
        }
    }

    /**
     * Attach Event Listeners to Slots (FIXED)
     */
    function attachSlotEventListeners() {
        // Entferne alle existierenden Event Listener von Slots
        document.querySelectorAll('.field-slot, .bench-slot').forEach(slot => {
            const clone = slot.cloneNode(true);
            slot.parentNode.replaceChild(clone, slot);
        });

        // Füge neue Event Listener hinzu
        document.querySelectorAll('.field-slot, .bench-slot').forEach(slot => {
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('dragleave', handleDragLeave);
            slot.addEventListener('drop', handleDrop);
        });
    }

    /**
     * Initialize Event Listeners
     */
    function initEventListeners() {
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

        // Desktop: Drag events on document level
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

        // Touch events
        if (isTouchDevice) {
            addEventListener(document, 'touchstart', (e) => {
                if (e.target.closest('.player-card')) {
                    handleTouchStart(e);
                }
            }, { passive: false });

            addEventListener(document, 'touchmove', handleTouchMove, { passive: false });
            addEventListener(document, 'touchend', handleTouchEnd);
            addEventListener(document, 'touchcancel', handleTouchCancel);
        }

        // Quick remove button handler (Event Delegation)
        addEventListener(document, 'click', (e) => {
            const removeBtn = e.target.closest('.quick-remove-btn');
            if (removeBtn) {
                e.stopPropagation();
                const playerId = parseInt(removeBtn.dataset.playerId);
                removePlayerWithAnimation(playerId);
            }
        });

        // Attach slot listeners
        attachSlotEventListeners();
    }

    /**
     * Initialize Module
     */
    function init() {
        // Initialize audio
        initAudioContext();

        // Load players from config
        availablePlayers = [...config.examplePlayers];

        // Render initial state
        renderFormationSlots();
        renderBenchSlots();

        // Try to load saved lineup
        const loaded = loadLineup();

        if (!loaded) {
            updatePlacedPlayersSet();
            renderAvailablePlayers();
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

        // Cleanup touch state
        removeGhost();
        touchStartPos = null;
        draggedPlayer = null;
        isDragging = false;

        // Reset state
        fieldSlots = [];
        benchSlots = [];
        selectedPlayer = null;
        selectedSlot = null;
        placedPlayerIds.clear();

        // Close audio context
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        console.log('🧹 Lineup System Cleanup durchgeführt');
    }

    // Expose für ModuleManager
    window.__KICKERSCUP_MODULE__ = {
        init,
        cleanup
    };

})();