// =====================================================
// KICKERSCUP - LINEUP SYSTEM (UPDATED + PORTRAIT FIX)
// Angepasste Spieler-Cards: Field (kompakt) vs Squad (vollständig)
// ✅ PORTRAIT FIX: Y-Koordinaten werden im JavaScript angepasst
// ✅ RESPONSIVE FIX: Aufrufe zu externer responsive-lineup.js entfernt
// ✅ TYPE FIX: Assigned expression type number is not assignable to type string behoben
// ✅ FIX 1: validateLineup erlaubt jetzt 7-10 Spieler mit einer WARNUNG statt einem FEHLER.
// ✅ FIX 2: saveLineup erzwingt die Mindestanforderung von 7 Spielern (6 Feld + 1 TW).
// =====================================================

import {LineupConfig} from './lineup-config.js';

// State
let currentFormation = '4-4-2';
let fieldSlots = [];
let benchSlots = [];
let availablePlayers = [];
let selectedPlayer = null;
let currentDragOverSlot = null;
let eventListeners = [];
let isTouchDevice = false;

// Touch-Drag State
let touchStartPos = null;
let ghostElement = null;
let draggedPlayer = null;
let isDragging = false;
let lastTouchMoveTime = 0;
const TOUCH_MOVE_THROTTLE = 16;

// Auto-Scroll State
let scrollIndicatorElement = null;
let isScrolling = false;

// Performance
let placedPlayerIds = new Set();

// Audio Context
let audioContext = null;

const config = LineupConfig;

/**
 * Helper: Event Listener registrieren (für Cleanup)
 */
function addEventListener(element, event, handler, options) {
    if (!element) return;
    element.addEventListener(event, handler, options);
    eventListeners.push({element, event, handler, options});
}

/**
 * Initialize Audio Context
 */
function initAudioContext() {
    const AudioContextConstructor = window.AudioContext || window['webkitAudioContext'];

    if (!audioContext && AudioContextConstructor) {
        audioContext = new AudioContextConstructor();
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
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
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

    oscillator.frequency.value = 400;
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
}

// ========================================
// POSITION COMPATIBILITY & STRENGTH
// ========================================

/**
 * Check if Player Can Play Position
 */
function canPlayPosition(player, targetPosition) {
    const mainPos = player.main_position;
    const compatibility = config.positionCompatibility[mainPos];

    if (!compatibility) return false;

    const compatibilityValue = compatibility[targetPosition];

    return compatibilityValue !== undefined && compatibilityValue > 0;
}

/**
 * Get Position Penalty
 */
function getPositionPenalty(mainPosition, targetPosition) {
    if (mainPosition === targetPosition) {
        return {text: '', severe: false};
    }

    const compatibility = config.positionCompatibility[mainPosition];
    if (!compatibility) return {text: '', severe: true};

    const value = compatibility[targetPosition];

    if (value === undefined || value === 0) {
        return {text: '🚫 Kann Position nicht spielen', severe: true};
    } else if (value < 0.7) {
        return {text: `⚠️ Fehlbesetzung (${Math.round(value * 100 - 100)}%)`, severe: true};
    } else if (value < 0.9) {
        return {text: `⚠️ Leicht abgestraft (-${Math.round((1 - value) * 100)}%)`, severe: false};
    }

    return {text: '', severe: false};
}

/**
 * Calculate Effective Strength
 */
function calculateEffectiveStrength(player, position) {
    const baseStrength = Math.round(player.strength * 10);
    const mainPos = player.main_position;

    if (mainPos === position) {
        return baseStrength;
    }

    const compatibility = config.positionCompatibility[mainPos];
    if (!compatibility) return 0;

    const compatibilityValue = compatibility[position];
    if (compatibilityValue === undefined || compatibilityValue === 0) {
        return 0;
    }

    return Math.round(baseStrength * compatibilityValue);
}

// ========================================
// RENDERING FUNCTIONS
// ========================================

/**
 * ✅ PORTRAIT FIX: Render Formation Slots mit Y-Anpassung
 */
function renderFormationSlots() {
    const container = document.getElementById('fieldSlots');
    if (!container) return;

    const formation = config.formations[currentFormation];
    if (!formation) return;

    // ✅ PORTRAIT-DETECTION
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    fieldSlots = formation.positions.map((pos, index) => {
        let adjustedY = pos.y;

        // ✅ Y-ANPASSUNG NUR IM PORTRAIT AUF MOBILE
        if (isPortrait && isMobile) {
            // TORWART: Tiefer (+3%)
            if (pos.position === 'TW') {
                adjustedY = Math.min(93, pos.y + 3);
            }
            // ABWEHR: Leicht nach oben (-2%)
            else if (['LV', 'RV', 'IV', 'LI'].includes(pos.position)) {
                adjustedY = Math.max(5, pos.y - 2);
            }
            // DEFENSIVES MITTELFELD: Minimal nach oben (-2%)
            else if (pos.position === 'ZDM') {
                adjustedY = Math.max(5, pos.y - 2);
            }
            // STURM: Höher (-3%)
            else if (['LS', 'MS', 'RS', 'ST'].includes(pos.position)) {
                adjustedY = Math.max(5, pos.y - 3);
            }
            // ZENTRALES MITTELFELD (ZOM) + SEITLICHES MITTELFELD (LM, RM): Bleibt
        }

        return {
            id: `field-${index}`,
            position: pos.position,
            x: pos.x,
            y: adjustedY,  // ✅ Angepasste Y-Koordinate
            player: null
        };
    });

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

    benchSlots = Array.from({length: 9}, (_, i) => ({
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
 * Render Player Card - UPDATED mit zwei verschiedenen Ansichten
 */
function renderPlayerCard(player, slotPosition = null, isFieldCard = false) {
    const effectiveStrength = slotPosition
        ? calculateEffectiveStrength(player, slotPosition)
        : Math.round(player.strength * 10);

    const penalty = slotPosition
        ? getPositionPenalty(player.main_position, slotPosition)
        : {text: '', severe: false};

    const isUnavailable = player.status !== 'fit';
    const canPlay = slotPosition ? canPlayPosition(player, slotPosition) : true;

    // FIELD CARD - Nur Einsatzwert und Alter (KOMPAKT: EW statt Einsatzwert)
    if (isFieldCard) {
        return `
            <div class="player-card field-card-compact ${isUnavailable || !canPlay ? 'unavailable' : ''}"
                 data-player-id="${player.id}"
                 draggable="${!isUnavailable && canPlay}">
                
                ${isUnavailable ? `<div class="player-status-badge status-${player.status}">${player.status === 'injured' ? '🚑' : '⛔'}</div>` : ''}
                
                <button class="quick-remove-btn" data-player-id="${player.id}" aria-label="Spieler entfernen">×</button>
                
                <div class="player-card-header">
                    <div class="player-card-name">${player.name}</div>
                    <div class="player-card-position">${player.main_position}</div>
                </div>
                
                <div class="player-card-field-stats">
                    <div class="field-stat-item">
                        <span class="field-stat-label">EW</span>
                        <span class="field-stat-value">${effectiveStrength}</span>
                    </div>
                    <div class="field-stat-item">
                        <span class="field-stat-label">Alter</span>
                        <span class="field-stat-value">${player.age}</span>
                    </div>
                </div>
                
                ${penalty.text ? `<div class="player-card-penalty ${penalty.severe ? 'severe' : ''}">${penalty.text}</div>` : ''}
            </div>
        `;
    }

    // SQUAD CARD - Vollständige Anzeige für Available Players & Bench
    return `
        <div class="player-card squad-card-full ${isUnavailable ? 'unavailable' : ''}"
             data-player-id="${player.id}"
             draggable="${!isUnavailable}">
            
            ${isUnavailable ? `<div class="player-status-badge status-${player.status}">${player.status === 'injured' ? '🚑' : '⛔'}</div>` : ''}
            
            <div class="player-card-header">
                <div class="player-card-name">${player.name}</div>
                <div class="player-card-position">${player.main_position}</div>
            </div>
            
            <div class="player-card-stats-grid">
                <div class="player-stat-row highlight">
                    <span class="player-stat-label">Einsatzwert</span>
                    <span class="player-stat-value">${effectiveStrength}</span>
                </div>
                <div class="player-stat-row">
                    <span class="player-stat-label">Alter</span>
                    <span class="player-stat-value">${player.age}</span>
                </div>
                <div class="player-stat-row">
                    <span class="player-stat-label">Kondition</span>
                    <span class="player-stat-value">${player.stamina}%</span>
                </div>
                <div class="player-stat-row">
                    <span class="player-stat-label">Form</span>
                    <span class="player-stat-value">${player.form}%</span>
                </div>
            </div>
        </div>
    `;
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
        // Beide nutzen Field Card (kompakt mit EW + Alter)
        const slotPosition = slotType === 'field' ? slot.position : null;
        // ✅ FIX: Wrapper entfernt, renderPlayerCard enthält bereits den Button
        element.innerHTML = renderPlayerCard(slot.player, slotPosition, true);
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
 * Render Available Players
 */
function renderAvailablePlayers() {
    const container = document.getElementById('availablePlayersList');
    if (!container) return;

    const searchTerm = document.getElementById('playerSearch')?.value.toLowerCase() || '';
    const positionFilter = document.getElementById('positionFilter')?.value || 'all';
    const sortBy = document.getElementById('sortSelect')?.value || 'strength';

    let filtered = availablePlayers.filter(player => {
        if (placedPlayerIds.has(player.id)) return false;

        const matchesSearch = !searchTerm ||
            player.name.toLowerCase().includes(searchTerm) ||
            player.main_position.toLowerCase().includes(searchTerm);

        const matchesPosition = positionFilter === 'all' ||
            config.positionCategories[player.main_position]?.category === positionFilter ||
            player.main_position === positionFilter;

        return matchesSearch && matchesPosition;
    });

    // Sortierung
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'strength':
                return b.strength - a.strength;
            case 'name':
                return a.name.localeCompare(b.name);
            case 'age':
                return a.age - b.age;
            case 'position':
                return a.main_position.localeCompare(b.main_position);
            default:
                return 0;
        }
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-players">Keine Spieler verfügbar</div>';
        return;
    }

    container.innerHTML = filtered.map(player =>
        `<div class="player-mini-card-wrapper">${renderPlayerCard(player, null, false)}</div>`
    ).join('');
}

/**
 * Update Placed Players Set
 */
function updatePlacedPlayersSet() {
    placedPlayerIds.clear();

    fieldSlots.forEach(slot => {
        if (slot.player) {
            placedPlayerIds.add(slot.player.id);
        }
    });

    benchSlots.forEach(slot => {
        if (slot.player) {
            placedPlayerIds.add(slot.player.id);
        }
    });
}

/**
 * Update Player Visibility
 */
function updatePlayerVisibility(playerId, isPlaced) {
    if (isPlaced) {
        placedPlayerIds.add(playerId);
    } else {
        placedPlayerIds.delete(playerId);
    }
    renderAvailablePlayers();
}

/**
 * Update Team Strength
 */
function updateTeamStrength() {
    const fieldPlayers = fieldSlots.filter(slot => slot.player);

    if (fieldPlayers.length === 0) {
        document.getElementById('teamStrength').textContent = '0';
        return;
    }

    const totalStrength = fieldPlayers.reduce((sum, slot) => {
        const effectiveStrength = calculateEffectiveStrength(slot.player, slot.position);
        return sum + effectiveStrength;
    }, 0);

    const averageStrength = Math.round(totalStrength / fieldPlayers.length);

    const strengthElement = document.getElementById('teamStrength');
    if (strengthElement) {
        strengthElement.textContent = String(averageStrength);
        strengthElement.classList.add('updating');
        setTimeout(() => strengthElement.classList.remove('updating'), 400);
    }
}

/**
 * Update Bench Count
 */
function updateBenchCount() {
    const benchPlayers = benchSlots.filter(slot => slot.player);
    const countElement = document.getElementById('benchCount');
    if (countElement) {
        countElement.textContent = `(${benchPlayers.length}/9)`;
    }
}

/**
 * Validate Lineup - ANGEPASST, um 7-10 Spieler als WARNING zu behandeln
 */
function validateLineup() {
    const validationPanel = document.getElementById('validationPanel');
    const validationList = document.getElementById('validationList');
    const validationTitle = document.querySelector('.validation-title');

    if (!validationPanel || !validationList) return;

    const messages = [];
    const fieldPlayers = fieldSlots.filter(slot => slot.player);

    // NEU: Check Spieleranzahl auf dem Feld (min. 7, ideal 11)
    if (fieldPlayers.length < 7) {
        messages.push({
            type: 'error',
            icon: '❌',
            text: `Zu wenig Spieler. Mindestens 7 (inkl. TW) benötigt. Aktuell: ${fieldPlayers.length}`
        });
    } else if (fieldPlayers.length < 11) {
        messages.push({
            type: 'warning',
            icon: '⚠️',
            text: `Aufstellung unvollständig. Nur ${fieldPlayers.length}/11 Spieler aufgestellt`
        });
    }

    // Check: Torwart vorhanden?
    const goalkeeper = fieldSlots.find(slot => slot.position === 'TW' && slot.player);
    if (!goalkeeper) {
        messages.push({
            type: 'error',
            icon: '🥅',
            text: 'Kein Torwart aufgestellt'
        });
    }

    // Check: Fehlbesetzungen
    const misplacements = fieldPlayers.filter(slot => {
        const penalty = getPositionPenalty(slot.player.main_position, slot.position);
        return penalty.severe;
    });

    if (misplacements.length > 0) {
        messages.push({
            type: 'warning',
            icon: '⚠️',
            text: `${misplacements.length} Fehlbesetzung(en) vorhanden`
        });
    }

    // Check: Fitness
    const injuredOrBanned = fieldPlayers.filter(slot =>
        slot.player.status !== 'fit'
    );

    if (injuredOrBanned.length > 0) {
        messages.push({
            type: 'error',
            icon: '🚑',
            text: `${injuredOrBanned.length} verletzte/gesperrte Spieler im Team`
        });
    }

    // Update UI
    // Eine Aufstellung ist jetzt gültig, solange KEIN Fehler vorliegt (d.h. auch mit Warnings)
    const isValid = messages.filter(m => m.type === 'error').length === 0;

    if (validationTitle) {
        validationTitle.textContent = isValid ? 'Aufstellung gültig' : 'Aufstellung ungültig';
    }

    validationPanel.classList.toggle('valid', isValid);
    validationPanel.classList.toggle('invalid', !isValid);

    if (messages.length === 0) {
        validationList.innerHTML = `
            <li class="validation-item">
                <span class="validation-item-icon">✅</span>
                <span>Alle Prüfungen bestanden!</span>
            </li>
        `;
    } else {
        const allMessages = messages;
        if (isValid && messages.filter(m => m.type === 'warning').length === 0) {
            allMessages.push({
                type: 'success',
                icon: '✓',
                text: 'Aufstellung ist komplett und spielbereit'
            });
        } else if (isValid) {
            allMessages.push({
                type: 'success',
                icon: '✓',
                text: 'Aufstellung ist gültig, aber unvollständig'
            });
        }


        validationList.innerHTML = allMessages.map(msg => `
            <li class="validation-item ${msg.type}">
                <span class="validation-item-icon">${msg.icon}</span>
                <span>${msg.text}</span>
            </li>
        `).join('');
    }
}

// ========================================
// PLAYER PLACEMENT
// ========================================

/**
 * Place Player in Slot
 */
function placePlayer(player, slotType, slotIndex) {
    if (!player || player.status !== 'fit') {
        showToast('Spieler ist nicht fit genug', 'error');
        playErrorSound();
        return false;
    }

    const slots = slotType === 'field' ? fieldSlots : benchSlots;
    const slot = slots[slotIndex];

    if (!slot) return false;

    if (slotType === 'field') {
        if (!canPlayPosition(player, slot.position)) {
            showToast('Spieler kann diese Position nicht spielen', 'error');
            playErrorSound();
            return false;
        }
    }

    const oldPosition = removePlayerFromLineup(player.id);

    slot.player = player;
    placedPlayerIds.add(player.id);

    renderSlot(slotType, slotIndex, true);

    if (!oldPosition) {
        updatePlayerVisibility(player.id, true);
    }

    updateTeamStrength();
    updateBenchCount();
    validateLineup();

    showFloatingSuccess(player.name);
    playSuccessSound();

    return true;
}

/**
 * Remove Player from Lineup
 */
function removePlayerFromLineup(playerId) {
    let oldPosition = null;

    fieldSlots.forEach((slot, index) => {
        if (slot.player && slot.player.id === playerId) {
            oldPosition = {type: 'field', index};
            slot.player = null;
            renderSlot('field', index);
        }
    });

    benchSlots.forEach((slot, index) => {
        if (slot.player && slot.player.id === playerId) {
            oldPosition = {type: 'bench', index};
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

// ========================================
// UI HELPERS
// ========================================

/**
 * Show Toast Message
 */
function showToast(message, type = 'info') {
    console.log(`[Toast ${type}]:`, message);
}

/**
 * Show Floating Success
 */
function showFloatingSuccess(playerName) {
    console.log(`✅ ${playerName} platziert`);
}

/**
 * Show/Hide Scroll Indicator
 */
function showScrollIndicator(direction) {
    if (!scrollIndicatorElement) {
        scrollIndicatorElement = document.createElement('div');
        scrollIndicatorElement.className = 'scroll-indicator';
        scrollIndicatorElement.innerHTML = `
            <span class="scroll-arrow">⬆</span>
            <span class="scroll-text">Scrollen</span>
        `;
        document.body.appendChild(scrollIndicatorElement);
    }

    scrollIndicatorElement.className = `scroll-indicator ${direction} active`;
}

function hideScrollIndicator() {
    if (scrollIndicatorElement) {
        scrollIndicatorElement.classList.remove('active');
    }
}

// ========================================
// DRAG & DROP HANDLERS
// ========================================

function handleDragStart(e) {
    const card = e.target.closest('.player-card') || e.target.closest('.player-mini-card');
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

function handleDragEnd(e) {
    const card = e.target.closest('.player-card') || e.target.closest('.player-mini-card');
    if (card) {
        card.classList.remove('dragging');
    }

    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });

    currentDragOverSlot = null;
    selectedPlayer = null;
}

function handleDragEnter(e) {
    e.preventDefault();
}

function handleDragOver(e) {
    if (!selectedPlayer) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const slot = e.currentTarget;

    if (currentDragOverSlot === slot) {
        return;
    }

    if (currentDragOverSlot && currentDragOverSlot !== slot) {
        currentDragOverSlot.classList.remove('drag-over');
    }

    const slotType = slot.dataset.slotType;
    const position = slot.dataset.position;

    let canDrop;
    if (slotType === 'field') {
        canDrop = canPlayPosition(selectedPlayer, position);
    } else {
        canDrop = true;
    }

    if (canDrop) {
        slot.classList.add('drag-over');
        currentDragOverSlot = slot;
        e.dataTransfer.dropEffect = 'move';
    } else {
        e.dataTransfer.dropEffect = 'none';
    }
}

function handleDragLeave(e) {
    const slot = e.currentTarget;
    const relatedTarget = e.relatedTarget;

    if (relatedTarget && slot.contains(relatedTarget)) {
        return;
    }

    slot.classList.remove('drag-over');

    if (currentDragOverSlot === slot) {
        currentDragOverSlot = null;
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const slot = e.currentTarget;
    slot.classList.remove('drag-over');

    if (!selectedPlayer) {
        currentDragOverSlot = null;
        return;
    }

    const slotType = slot.dataset.slotType;
    // ✅ FIX: Konvertiert den String-Wert explizit in eine Zahl
    const slotIndex = +slot.dataset.slotIndex;

    placePlayer(selectedPlayer, slotType, slotIndex);

    currentDragOverSlot = null;
    selectedPlayer = null;
}

// ========================================
// TOUCH HANDLERS
// ========================================

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

function removeGhost() {
    if (ghostElement && ghostElement.parentNode) {
        ghostElement.parentNode.removeChild(ghostElement);
    }
    ghostElement = null;
}

function handleTouchStart(e) {
    const card = e.target.closest('.player-card') || e.target.closest('.player-mini-card');
    if (!card || card.classList.contains('unavailable')) return;

    const playerId = parseInt(card.dataset.playerId);
    draggedPlayer = availablePlayers.find(p => p.id === playerId);

    if (!draggedPlayer || draggedPlayer.status !== 'fit') {
        return;
    }

    const touch = e.touches[0];
    touchStartPos = {x: touch.clientX, y: touch.clientY};

    setTimeout(() => {
        if (touchStartPos && !isDragging) {
            isDragging = true;
            createGhost(card, touch);
            card.classList.add('dragging');
        }
    }, 150);
}

function handleTouchMove(e) {
    if (!isDragging || !ghostElement) return;

    e.preventDefault();

    const touch = e.touches[0];
    const rect = ghostElement.getBoundingClientRect();

    ghostElement.style.left = (touch.clientX - rect.width / 2) + 'px';
    ghostElement.style.top = (touch.clientY - rect.height / 2) + 'px';

    // Auto-Scroll Logic
    const viewportHeight = window.innerHeight;
    const scrollZoneSize = 120;
    const baseScrollSpeed = 15;
    const maxScrollSpeed = 35;
    const touchY = touch.clientY;

    if (touchY < scrollZoneSize) {
        const intensity = Math.pow(1 - (touchY / scrollZoneSize), 2);
        const speed = Math.ceil(baseScrollSpeed + (maxScrollSpeed - baseScrollSpeed) * intensity);
        window.scrollBy({top: -speed, behavior: 'auto'});
        showScrollIndicator('up');
    } else if (touchY > viewportHeight - scrollZoneSize) {
        const distanceFromBottom = viewportHeight - touchY;
        const intensity = Math.pow(1 - (distanceFromBottom / scrollZoneSize), 2);
        const speed = Math.ceil(baseScrollSpeed + (maxScrollSpeed - baseScrollSpeed) * intensity);
        window.scrollBy({top: speed, behavior: 'auto'});
        showScrollIndicator('down');
    } else {
        hideScrollIndicator();
    }

    ghostElement.style.pointerEvents = 'none';
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    ghostElement.style.pointerEvents = '';

    const slot = element?.closest('.field-slot, .bench-slot');

    if (currentDragOverSlot && currentDragOverSlot !== slot) {
        currentDragOverSlot.classList.remove('drag-over');
        currentDragOverSlot = null;
    }

    if (slot && draggedPlayer) {
        const slotType = slot.dataset.slotType;
        const position = slot.dataset.position;

        let canDrop;
        if (slotType === 'field') {
            canDrop = canPlayPosition(draggedPlayer, position);
        } else {
            canDrop = true;
        }

        if (canDrop) {
            slot.classList.add('drag-over');
            currentDragOverSlot = slot;
        }
    }
}

function handleTouchMoveThrottled(e) {
    const now = Date.now();
    if (now - lastTouchMoveTime < TOUCH_MOVE_THROTTLE) {
        return;
    }
    lastTouchMoveTime = now;
    handleTouchMove(e);
}

function handleTouchEnd(e) {
    if (!isDragging) {
        touchStartPos = null;
        return;
    }

    const touch = e.changedTouches[0];

    ghostElement.style.pointerEvents = 'none';
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    ghostElement.style.pointerEvents = '';

    const slot = element?.closest('.field-slot, .bench-slot');

    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

    if (slot && draggedPlayer) {
        const slotType = slot.dataset.slotType;
        // ✅ FIX: Konvertiert den String-Wert explizit in eine Zahl
        const slotIndex = +slot.dataset.slotIndex;

        placePlayer(draggedPlayer, slotType, slotIndex);
    }

    removeGhost();
    hideScrollIndicator();
    touchStartPos = null;
    draggedPlayer = null;
    isDragging = false;
    currentDragOverSlot = null;
}

function handleTouchCancel() {
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    removeGhost();
    hideScrollIndicator();
    touchStartPos = null;
    draggedPlayer = null;
    isDragging = false;
    currentDragOverSlot = null;
}

// ========================================
// EVENT LISTENERS & INITIALIZATION
// ========================================

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
 * NEU: Checkt die Mindestanforderungen fürs Speichern (7 Spieler, davon 1 TW)
 */
function checkSaveReadiness() {
    // Zählt alle platzierten Spieler (Feld)
    const fieldPlayersCount = fieldSlots.filter(slot => slot.player).length;

    // 1. Mindestens 7 Spieler auf dem Feld
    if (fieldPlayersCount < 7) {
        return {ready: false, message: `Zum Speichern müssen mindestens 7 Spieler auf dem Feld aufgestellt sein. Aktuell: ${fieldPlayersCount}`};
    }

    // 2. Mindestens ein Torwart aufgestellt (auf der TW-Position)
    const goalkeeper = fieldSlots.find(slot => slot.position === 'TW' && slot.player);
    if (!goalkeeper) {
        return {ready: false, message: 'Es muss mindestens ein Torwart aufgestellt sein.'};
    }

    return {ready: true, message: 'Speicherung möglich'};
}

function saveLineup() {

    // Speicherprüfung durchführen
    const saveCheck = checkSaveReadiness();

    if (!saveCheck.ready) {
        showToast(saveCheck.message, 'error');
        playErrorSound();
        return; // Speicherung abbrechen
    }

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

function attachSlotEventListeners() {
    document.querySelectorAll('.field-slot, .bench-slot').forEach(slot => {
        const clone = slot.cloneNode(true);
        slot.parentNode.replaceChild(clone, slot);
    });

    document.querySelectorAll('.field-slot, .bench-slot').forEach(slot => {
        slot.addEventListener('dragenter', handleDragEnter, false);
        slot.addEventListener('dragover', handleDragOver, false);
        slot.addEventListener('dragleave', handleDragLeave, false);
        slot.addEventListener('drop', handleDrop, false);
    });
}

/**
 * ✅ PORTRAIT FIX: Orientation Change Handler
 */
function handleOrientationChange() {
    // Warte kurz bis Orientierung vollständig geändert
    setTimeout(() => {
        console.log('🔄 Orientation changed, re-rendering formation...');

        // Re-render Formation Slots mit neuen Y-Koordinaten
        renderFormationSlots();

        // Falls Spieler auf dem Feld sind, re-platzieren
        fieldSlots.forEach((slot, index) => {
            if (slot.player) {
                renderSlot('field', index);
            }
        });

        // Bench re-rendern
        benchSlots.forEach((slot, index) => {
            if (slot.player) {
                renderSlot('bench', index);
            }
        });

        updateTeamStrength();
        updateBenchCount();
        validateLineup();

        // Event Listeners neu anhängen
        attachSlotEventListeners();
    }, 100);
}

function initEventListeners() {
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const formationSelect = document.getElementById('formationSelect');
    if (formationSelect) {
        addEventListener(formationSelect, 'change', handleFormationChange);
    }

    const clearBtn = document.getElementById('clearLineup');
    const saveBtn = document.getElementById('saveLineup');

    if (clearBtn) addEventListener(clearBtn, 'click', clearLineup);
    if (saveBtn) addEventListener(saveBtn, 'click', saveLineup);

    const validationHeader = document.getElementById('validationHeader');
    const validationPanel = document.getElementById('validationPanel');

    if (validationHeader && validationPanel) {
        addEventListener(validationHeader, 'click', () => {
            validationPanel.classList.toggle('collapsed');
        });
    }

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

    addEventListener(document, 'dragstart', (e) => {
        if (e.target.closest('.player-card') || e.target.closest('.player-mini-card')) {
            handleDragStart(e);
        }
    });

    addEventListener(document, 'dragend', (e) => {
        if (e.target.closest('.player-card') || e.target.closest('.player-mini-card')) {
            handleDragEnd(e);
        }
    });

    if (isTouchDevice) {
        addEventListener(document, 'touchstart', (e) => {
            if (e.target.closest('.player-card') || e.target.closest('.player-mini-card')) {
                handleTouchStart(e);
            }
        }, {passive: false});

        addEventListener(document, 'touchmove', handleTouchMoveThrottled, {passive: false});
        addEventListener(document, 'touchend', handleTouchEnd);
        addEventListener(document, 'touchcancel', handleTouchCancel);
    }

    addEventListener(document, 'click', (e) => {
        const removeBtn = e.target.closest('.quick-remove-btn');
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const playerId = parseInt(removeBtn.dataset.playerId);
            console.log('🗑️ Remove Button geklickt für Spieler ID:', playerId);
            removePlayerWithAnimation(playerId);
        }
    });

    // Verhindere Drag beim Klick auf Remove Button
    addEventListener(document, 'mousedown', (e) => {
        if (e.target.closest('.quick-remove-btn')) {
            e.stopPropagation();
        }
    });

    addEventListener(document, 'touchstart', (e) => {
        if (e.target.closest('.quick-remove-btn')) {
            e.stopPropagation();
        }
    }, {passive: false});

    // ✅ PORTRAIT FIX: Orientation Change Listeners
    addEventListener(window, 'orientationchange', handleOrientationChange);
    addEventListener(window, 'resize', handleOrientationChange);

    attachSlotEventListeners();
}

// [LINTER FIX] Unterdrückt die Warnung "Unused function init" (wird extern verwendet)
/* eslint-disable-next-line no-unused-vars */
export function init() {
    console.log('🚀 Lineup System wird initialisiert...');

    initAudioContext();
    availablePlayers = [...config.examplePlayers];

    renderFormationSlots();
    renderBenchSlots();

    const loaded = loadLineup();

    if (!loaded) {
        updatePlacedPlayersSet();
        renderAvailablePlayers();
        updateTeamStrength();
        validateLineup();
    }

    initEventListeners();

    console.log('✅ Lineup System vollständig initialisiert');
}


export function cleanup() {
    console.log('🧹 Lineup System Cleanup wird durchgeführt...');

    // Event Listeners entfernen
    eventListeners.forEach(({element, event, handler, options}) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners = [];

    // Ghost-Elemente entfernen
    removeGhost();
    hideScrollIndicator();

    if (scrollIndicatorElement && scrollIndicatorElement.parentNode) {
        scrollIndicatorElement.parentNode.removeChild(scrollIndicatorElement);
        scrollIndicatorElement = null;
    }

    // State zurücksetzen
    touchStartPos = null;
    draggedPlayer = null;
    isDragging = false;
    isScrolling = false;

    fieldSlots = [];
    benchSlots = [];
    selectedPlayer = null;
    currentDragOverSlot = null;
    placedPlayerIds.clear();

    // Audio Context schließen
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    console.log('✅ Lineup System Cleanup abgeschlossen');
}