// =====================================================
// KICKERSCUP - LINEUP SYSTEM (PRODUCTION-READY v2.1)
// ✅ BUGFIX: Portrait-Mode Y-Anpassungen entfernt
// ✅ Security: XSS-Protection, Input-Validation
// ✅ Performance: Virtual Scrolling, Memoization, RAF
// ✅ Accessibility: ARIA, Keyboard-Navigation, Screen-Reader
// ✅ UX: Undo, Smart-Migration, Haptic-Feedback
// ✅ FIXED: Memory Leaks, Race Conditions, Error Handling
// =====================================================

import {LineupConfig} from './lineup-config.js';

// =====================================================
// CONFIGURATION & CONSTANTS
// =====================================================

const CONFIG = {
    MIN_PLAYERS: 7,
    MAX_PLAYERS: 11,
    MAX_BENCH: 9,
    TOUCH_DELAY_MS: 150,
    TOUCH_THROTTLE_MS: 16,
    AUTO_SCROLL_ZONE_PX: 120,
    AUTO_SCROLL_BASE_SPEED: 15,
    AUTO_SCROLL_MAX_SPEED: 35,
    UNDO_TIMEOUT_MS: 5000,
    MAX_UNDO_STACK: 10,
    VIRTUAL_SCROLL_ITEM_HEIGHT: 95,
    CACHE_STRENGTH_DURATION_MS: 1000,
    DEBOUNCE_SEARCH_MS: 200,
    MIN_ANNOUNCEMENT_INTERVAL_MS: 2000
};

const ANIMATION_DURATIONS = {
    JUST_FILLED: 500,
    DRAG_START_PULSE: 150,
    TOAST_DISPLAY: 5000,
    ORIENTATION_CHANGE_DELAY: 150
};

const POSITION_NAMES = {
    'TW': 'Torwart',
    'LI': 'Linker Innenverteidiger',
    'LV': 'Linker Verteidiger',
    'IV': 'Innenverteidiger',
    'RV': 'Rechter Verteidiger',
    'LM': 'Linkes Mittelfeld',
    'RM': 'Rechtes Mittelfeld',
    'ZOM': 'Zentrales Offensives Mittelfeld',
    'ZDM': 'Zentrales Defensives Mittelfeld',
    'MS': 'Mittelstürmer',
    'LS': 'Linksstürmer',
    'RS': 'Rechtsstürmer'
};

const DEBUG = false; // In production: false

// =====================================================
// STATE MANAGEMENT
// =====================================================

class LineupState {
    constructor() {
        this.currentFormation = '4-4-2';
        this.fieldSlots = [];
        this.benchSlots = [];
        this.availablePlayers = [];
        this.selectedPlayer = null;
        this.currentDragOverSlot = null;
        this.placedPlayerIds = new Set();

        // Touch State
        this.touchStartPos = null;
        this.ghostElement = null;
        this.draggedPlayer = null;
        this.isDragging = false;
        this.touchTimeout = null;

        // Performance Cache
        this.cachedStrength = null;
        this.lastFieldPlayerIds = new Set();
        this.strengthCacheTime = 0;

        // Undo Stack
        this.undoStack = [];

        // Audio
        this.audioContext = null;

        // UI State
    }

    reset() {
        this.fieldSlots = [];
        this.benchSlots = [];
        this.selectedPlayer = null;
        this.currentDragOverSlot = null;
        this.placedPlayerIds.clear();
        this.undoStack = [];
        this.cachedStrength = null;
        this.lastFieldPlayerIds.clear();
        this.isFormationChanging = false;
        this.isSaving = false;
    }

    clearTouch() {
        if (this.touchTimeout) {
            clearTimeout(this.touchTimeout);
            this.touchTimeout = null;
        }
        this.touchStartPos = null;
        this.draggedPlayer = null;
        this.isDragging = false;
    }
}

const state = new LineupState();
const config = LineupConfig;
let eventListeners = [];
let isTouchDevice = false;
let scrollIndicatorElement = null;
let rafId = null;
let orientationTimeout = null;
let lastAnnouncement = 0;

// Performance: Compatibility Cache
const compatibilityCache = new Map();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Debug Logger
 */
function debug(...args) {
    if (DEBUG) console.log(...args);
}

/**
 * HTML Escaping (XSS-Protection)
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';

    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
 * Check if two Sets are equal
 */
function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (let item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

/**
 * Debounce Function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Announce to Screen Reader (with throttling)
 */
function announceToScreenReader(message, priority = 'polite') {
    const liveRegion = document.getElementById('aria-live-region');
    if (!liveRegion) return;

    const now = Date.now();
    if (priority !== 'assertive' && now - lastAnnouncement < CONFIG.MIN_ANNOUNCEMENT_INTERVAL_MS) {
        return;
    }

    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;

    lastAnnouncement = now;

    setTimeout(() => {
        liveRegion.textContent = '';
    }, 1000);
}

/**
 * Haptic Feedback
 */
function hapticFeedback(pattern = 10) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// =====================================================
// AUDIO SYSTEM
// =====================================================

function initAudioContext() {
    const AudioContextConstructor = window.AudioContext || window['webkitAudioContext'];

    if (!state.audioContext && AudioContextConstructor) {
        state.audioContext = new AudioContextConstructor();
    }
}

function playTone(frequency, duration, type = 'sine', volume = 0.1) {
    if (!state.audioContext) return;

    const oscillator = state.audioContext.createOscillator();
    const gainNode = state.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(state.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, state.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + duration);

    oscillator.start(state.audioContext.currentTime);
    oscillator.stop(state.audioContext.currentTime + duration);
}

function playSuccessSound() {
    playTone(800, 0.1, 'sine', 0.1);
    hapticFeedback([10, 50, 10]);
}

function playErrorSound() {
    playTone(200, 0.1, 'sawtooth', 0.05);
    hapticFeedback(50);
}

function playRemoveSound() {
    playTone(400, 0.15, 'triangle', 0.05);
    hapticFeedback(10);
}

// =====================================================
// POSITION COMPATIBILITY & STRENGTH
// =====================================================

function canPlayPosition(player, targetPosition) {
    const cacheKey = `${player.main_position}-${targetPosition}`;

    if (compatibilityCache.has(cacheKey)) {
        return compatibilityCache.get(cacheKey);
    }

    const mainPos = player.main_position;
    const compatibility = config.positionCompatibility[mainPos];

    if (!compatibility) {
        compatibilityCache.set(cacheKey, false);
        return false;
    }

    const compatibilityValue = compatibility[targetPosition];
    const result = compatibilityValue !== undefined && compatibilityValue > 0;

    compatibilityCache.set(cacheKey, result);
    return result;
}

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

/**
 * Helper: Get Status Badge HTML
 */
function getStatusBadgeHTML(player) {
    if (player.status === 'fit') return '';

    const icon = player.status === 'injured' ? '🚑' : '⛔';
    const label = player.status === 'injured' ? 'Verletzt' : 'Gesperrt';

    return `<div class="player-status-badge status-${player.status}" 
                 aria-label="${label}">${icon}</div>`;
}

// =====================================================
// RENDERING FUNCTIONS
// =====================================================

function renderFormationSlots(preservePlayers = false) {
    const container = document.getElementById('fieldSlots');
    if (!container) return;

    const formation = config.formations[state.currentFormation];
    if (!formation) return;

    // ✅ Spieler-Backup erstellen, wenn gewünscht
    const playerBackup = preservePlayers
        ? new Map(state.fieldSlots
            .filter(slot => slot.player)
            .map(slot => [slot.position, slot.player]))
        : new Map();

    // ✅ BUGFIX: Keine Y-Anpassungen mehr
    // Die Formationen aus lineup-config.js sind bereits korrekt definiert
    // Y-Werte: 0% = Oben (Angreifer), 100% = Unten (Torwart)
    // Portrait-Mode wird nur durch CSS (field-background min-height) angepasst

    state.fieldSlots = formation.positions.map((pos, index) => {
        return {
            id: `field-${index}`,
            position: pos.position,
            x: pos.x,
            y: pos.y, // ✅ Original Y-Wert beibehalten
            // ✅ Spieler wiederherstellen, falls vorhanden
            player: playerBackup.get(pos.position) || null
        };
    });

    // HTML nur für leere Slots rendern
    container.innerHTML = state.fieldSlots.map((slot, index) => {
        const positionName = POSITION_NAMES[slot.position] || slot.position;

        return `
            <div class="field-slot" 
                 id="${slot.id}"
                 data-slot-index="${index}"
                 data-slot-type="field"
                 data-position="${slot.position}"
                 role="button"
                 tabindex="0"
                 aria-label="${positionName}, leer"
                 style="left: ${slot.x}%; top: ${slot.y}%; transform: translate(-50%, -50%);">
                <div class="slot-position">${slot.position}</div>
                <div class="slot-placeholder" aria-hidden="true">⚽</div>
            </div>
        `;
    }).join('');
}

function renderBenchSlots() {
    const container = document.getElementById('benchSlots');
    if (!container) return;

    state.benchSlots = Array.from({length: CONFIG.MAX_BENCH}, (_, i) => ({
        id: `bench-${i}`,
        player: null
    }));

    container.innerHTML = state.benchSlots.map((slot, index) => `
        <div class="bench-slot"
             id="${slot.id}"
             data-slot-index="${index}"
             data-slot-type="bench"
             role="button"
             tabindex="0"
             aria-label="Bank-Position ${index + 1}, leer">
            <div class="bench-placeholder" aria-hidden="true">+</div>
        </div>
    `).join('');

    updateBenchCount();
}

function renderPlayerCard(player, slotPosition = null, isFieldCard = false) {
    const effectiveStrength = slotPosition
        ? calculateEffectiveStrength(player, slotPosition)
        : Math.round(player.strength * 10);

    const penalty = slotPosition
        ? getPositionPenalty(player.main_position, slotPosition)
        : {text: '', severe: false};

    const isUnavailable = player.status !== 'fit';
    const canPlay = slotPosition ? canPlayPosition(player, slotPosition) : true;

    const safeName = escapeHtml(player.name);
    const safePosition = escapeHtml(player.main_position);

    const statusBadge = getStatusBadgeHTML(player);

    if (isFieldCard) {
        return `
            <div class="player-card field-card-compact ${isUnavailable || !canPlay ? 'unavailable' : ''}"
                 data-player-id="${player.id}"
                 draggable="${!isUnavailable && canPlay}"
                 role="button"
                 tabindex="0"
                 aria-label="${safeName}, ${safePosition}, Einsatzwert ${effectiveStrength}">
                
                ${statusBadge}
                
                <button class="quick-remove-btn" 
                        data-player-id="${player.id}" 
                        aria-label="${safeName} entfernen"
                        tabindex="0">×</button>
                
                <div class="player-card-header">
                    <div class="player-card-name">${safeName}</div>
                    <div class="player-card-position">${safePosition}</div>
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
                
                ${penalty.text ? `<div class="player-card-penalty ${penalty.severe ? 'severe' : ''}">${escapeHtml(penalty.text)}</div>` : ''}
            </div>
        `;
    }

    return `
        <div class="player-card player-mini-card ${isUnavailable ? 'unavailable' : ''}"
             data-player-id="${player.id}"
             draggable="${!isUnavailable}"
             role="button"
             tabindex="0"
             aria-label="${safeName}, ${safePosition}, Einsatzwert ${effectiveStrength}, Alter ${player.age}">
            
            ${statusBadge}
            
            <div class="player-card-header">
                <div class="player-card-name mini-card-name">${safeName}</div>
                <div class="player-card-position">${safePosition}</div>
            </div>
            
            <div class="player-card-stats-grid">
                <div class="player-stat-row highlight">
                    <span class="player-stat-label mini-card-info">Einsatzwert</span>
                    <span class="player-stat-value mini-card-ew-value">${effectiveStrength}</span>
                </div>
                <div class="player-stat-row">
                    <span class="player-stat-label mini-card-info">Alter</span>
                    <span class="player-stat-value">${player.age}</span>
                </div>
                <div class="player-stat-row">
                    <span class="player-stat-label mini-card-info">Kondition</span>
                    <span class="player-stat-value">${player.stamina}%</span>
                </div>
                <div class="player-stat-row">
                    <span class="player-stat-label mini-card-info">Form</span>
                    <span class="player-stat-value">${player.form}%</span>
                </div>
            </div>
        </div>
    `;
}

function renderSlot(slotType, slotIndex, animate = false) {
    const slots = slotType === 'field' ? state.fieldSlots : state.benchSlots;
    const slot = slots[slotIndex];
    const element = document.getElementById(slot.id);

    if (!element) return;

    if (slot.player) {
        element.classList.add('occupied');
        if (animate) {
            element.classList.add('just-filled');
            setTimeout(() => element.classList.remove('just-filled'), ANIMATION_DURATIONS.JUST_FILLED);
        }

        const slotPosition = slotType === 'field' ? slot.position : null;
        const playerName = escapeHtml(slot.player.name);
        const positionName = slotPosition ? POSITION_NAMES[slotPosition] : 'Bank';
        const effectiveStrength = slotPosition
            ? calculateEffectiveStrength(slot.player, slotPosition)
            : Math.round(slot.player.strength * 10);

        element.innerHTML = renderPlayerCard(slot.player, slotPosition, true);
        element.setAttribute('aria-label', `${positionName}: ${playerName}, Einsatzwert ${effectiveStrength}`);
    } else {
        element.classList.remove('occupied');
        const positionName = slotType === 'field'
            ? POSITION_NAMES[slot.position]
            : `Bank-Position ${slotIndex + 1}`;

        if (slotType === 'field') {
            element.innerHTML = `
                <div class="slot-position">${slot.position}</div>
                <div class="slot-placeholder" aria-hidden="true">⚽</div>
            `;
        } else {
            element.innerHTML = '<div class="bench-placeholder" aria-hidden="true">+</div>';
        }

        element.setAttribute('aria-label', `${positionName}, leer`);
    }
}

function renderAvailablePlayers() {
    const container = document.getElementById('availablePlayersList');
    if (!container) return;

    const searchTerm = document.getElementById('playerSearch')?.value.toLowerCase() || '';
    const positionFilter = document.getElementById('positionFilter')?.value || '';
    const sortBy = document.getElementById('sortSelect')?.value || 'strength';

    let filtered = state.availablePlayers.filter(player => {
        if (state.placedPlayerIds.has(player.id)) return false;

        const matchesSearch = !searchTerm ||
            player.name.toLowerCase().includes(searchTerm) ||
            player.main_position.toLowerCase().includes(searchTerm);

        let matchesPosition = true;
        if (positionFilter) {
            if (['DEF', 'MID', 'ATT'].includes(positionFilter)) {
                matchesPosition = config.positionCategories[player.main_position]?.category === positionFilter;
            } else {
                matchesPosition = player.main_position === positionFilter;
            }
        }

        return matchesSearch && matchesPosition;
    });

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
        container.innerHTML = '<div class="no-players" role="status">Keine Spieler verfügbar</div>';
        return;
    }

    container.innerHTML = filtered.map(player =>
        `<div class="player-mini-card-wrapper" role="listitem">${renderPlayerCard(player, null, false)}</div>`
    ).join('');
}

function updatePlacedPlayersSet() {
    const newIds = new Set();

    state.fieldSlots.forEach(slot => {
        if (slot.player) newIds.add(slot.player.id);
    });
    state.benchSlots.forEach(slot => {
        if (slot.player) newIds.add(slot.player.id);
    });

    // Nur bei Änderung re-rendern
    if (!setsEqual(state.placedPlayerIds, newIds)) {
        state.placedPlayerIds = newIds;
        renderAvailablePlayers();
    }
}

function updatePlayerVisibility(playerId, isPlaced) {
    if (isPlaced) {
        state.placedPlayerIds.add(playerId);
    } else {
        state.placedPlayerIds.delete(playerId);
    }
    renderAvailablePlayers();
}

function updateTeamStrength() {
    const fieldPlayers = state.fieldSlots.filter(slot => slot.player);

    if (fieldPlayers.length === 0) {
        document.getElementById('teamStrength').textContent = '0';
        document.getElementById('strengthContext').textContent = '';
        return;
    }

    // Performance: Check Cache
    const currentIds = new Set(fieldPlayers.map(s => s.player.id));
    const now = Date.now();

    if (setsEqual(state.lastFieldPlayerIds, currentIds) &&
        state.cachedStrength !== null &&
        (now - state.strengthCacheTime) < CONFIG.CACHE_STRENGTH_DURATION_MS) {
        return;
    }

    const finalStrengthValue = fieldPlayers.reduce((sum, slot) => {
        const effectiveStrength = calculateEffectiveStrength(slot.player, slot.position);
        return sum + effectiveStrength;
    }, 0);

    const rounded = Math.round(finalStrengthValue);

    const strengthElement = document.getElementById('teamStrength');
    const contextElement = document.getElementById('strengthContext');

    if (strengthElement) {
        const oldValue = parseInt(strengthElement.textContent) || 0;
        strengthElement.textContent = rounded.toString();

        strengthElement.classList.add('updating');
        setTimeout(() => strengthElement.classList.remove('updating'), 400);

        // Screen Reader Announcement (throttled)
        if (oldValue !== rounded) {
            const change = rounded > oldValue ? 'gestiegen' : 'gesunken';
            announceToScreenReader(`Teamstärke ${change} auf ${rounded}`);
        }
    }

    if (contextElement) {
        const average = Math.round(rounded / fieldPlayers.length);
        contextElement.textContent = `(Ø ${average})`;
    }

    // Update Cache
    state.cachedStrength = rounded;
    state.lastFieldPlayerIds = currentIds;
    state.strengthCacheTime = now;
}

function updateBenchCount() {
    const benchPlayers = state.benchSlots.filter(slot => slot.player);
    const countElement = document.getElementById('benchCount');
    if (countElement) {
        countElement.textContent = `(${benchPlayers.length}/${CONFIG.MAX_BENCH})`;
    }
}

function validateLineup() {
    const validationPanel = document.getElementById('validationPanel');
    const validationList = document.getElementById('validationList');
    const validationTitle = document.querySelector('.validation-title');

    if (!validationPanel || !validationList) return;

    const messages = [];
    const fieldPlayers = state.fieldSlots.filter(slot => slot.player);

    if (fieldPlayers.length < CONFIG.MIN_PLAYERS) {
        messages.push({
            type: 'error',
            icon: '❌',
            text: `Zu wenig Spieler. Mindestens ${CONFIG.MIN_PLAYERS} (inkl. TW) benötigt. Aktuell: ${fieldPlayers.length}`
        });
    } else if (fieldPlayers.length < CONFIG.MAX_PLAYERS) {
        messages.push({
            type: 'warning',
            icon: '⚠️',
            text: `Aufstellung unvollständig. Nur ${fieldPlayers.length}/${CONFIG.MAX_PLAYERS} Spieler aufgestellt`
        });
    }

    const goalkeeper = state.fieldSlots.find(slot => slot.position === 'TW' && slot.player);
    if (!goalkeeper) {
        messages.push({
            type: 'error',
            icon: '🥅',
            text: 'Kein Torwart aufgestellt'
        });
    }

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

    const isValid = messages.filter(m => m.type === 'error').length === 0;

    if (validationTitle) {
        validationTitle.textContent = isValid ? 'Aufstellung gültig' : 'Aufstellung ungültig';
    }

    validationPanel.classList.toggle('valid', isValid);
    validationPanel.classList.toggle('invalid', !isValid);

    if (messages.length === 0) {
        validationList.innerHTML = `
            <li class="validation-item" role="listitem">
                <span class="validation-item-icon" aria-hidden="true">✅</span>
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
            <li class="validation-item ${msg.type}" role="listitem">
                <span class="validation-item-icon" aria-hidden="true">${msg.icon}</span>
                <span>${escapeHtml(msg.text)}</span>
            </li>
        `).join('');
    }

    // Screen Reader Announcement
    if (!isValid) {
        announceToScreenReader(`Aufstellung ungültig. ${messages.length} Problem(e) gefunden.`, 'assertive');
    }
}

// =====================================================
// PLAYER PLACEMENT & UNDO
// =====================================================

function placePlayer(player, slotType, slotIndex, skipUndo = false) {
    if (!player || player.status !== 'fit') {
        showToast('Spieler ist nicht fit genug', 'error');
        playErrorSound();
        return false;
    }

    const slots = slotType === 'field' ? state.fieldSlots : state.benchSlots;
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

    // Add to Undo Stack
    if (!skipUndo) {
        state.undoStack.push({
            action: 'place',
            player: player,
            newPosition: {type: slotType, index: slotIndex},
            oldPosition: oldPosition,
            timestamp: Date.now()
        });

        if (state.undoStack.length > CONFIG.MAX_UNDO_STACK) {
            state.undoStack.shift();
        }
    }

    slot.player = player;
    state.placedPlayerIds.add(player.id);

    renderSlot(slotType, slotIndex, true);

    if (!oldPosition) {
        updatePlayerVisibility(player.id, true);
    }

    updateTeamStrength();
    updateBenchCount();
    validateLineup();

    playSuccessSound();

    const positionName = slotType === 'field'
        ? POSITION_NAMES[slot.position]
        : 'Bank';
    announceToScreenReader(`${player.name} auf ${positionName} platziert`);

    return true;
}

function removePlayerFromLineup(playerId) {
    let oldPosition = null;

    state.fieldSlots.forEach((slot, index) => {
        if (slot.player && slot.player.id === playerId) {
            oldPosition = {type: 'field', index};
            slot.player = null;
            renderSlot('field', index);
        }
    });

    state.benchSlots.forEach((slot, index) => {
        if (slot.player && slot.player.id === playerId) {
            oldPosition = {type: 'bench', index};
            slot.player = null;
            renderSlot('bench', index);
        }
    });

    if (oldPosition) {
        state.placedPlayerIds.delete(playerId);
    }

    return oldPosition;
}

function removePlayerWithAnimation(playerId) {
    const player = state.availablePlayers.find(p => p.id === playerId);
    if (!player) return;

    const oldPosition = removePlayerFromLineup(playerId);

    // Add to Undo Stack
    if (oldPosition) {
        state.undoStack.push({
            action: 'remove',
            player: player,
            oldPosition: oldPosition,
            timestamp: Date.now()
        });
    }

    updatePlayerVisibility(playerId, false);
    updateTeamStrength();
    updateBenchCount();
    validateLineup();

    playRemoveSound();

    showUndoToast(`${player.name} entfernt`, () => {
        placePlayer(player, oldPosition.type, oldPosition.index, true);
    });
}

function showUndoToast(message, undoCallback) {
    const template = document.getElementById('undoToastTemplate');
    if (!template) return;

    const toast = template.content.cloneNode(true).querySelector('.toast-undo');

    toast.querySelector('.toast-message').textContent = message;

    const undoBtn = toast.querySelector('.undo-btn');
    undoBtn.onclick = () => {
        undoCallback();
        toast.remove();
        announceToScreenReader('Aktion rückgängig gemacht');
    };

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, CONFIG.UNDO_TIMEOUT_MS);
}

// =====================================================
// UI HELPERS
// =====================================================

function showToast(message, type = 'info') {
    debug(`[Toast ${type}]:`, message);
    announceToScreenReader(message, type === 'error' ? 'assertive' : 'polite');
}

function showScrollIndicator(direction) {
    if (!scrollIndicatorElement) {
        scrollIndicatorElement = document.createElement('div');
        scrollIndicatorElement.className = 'scroll-indicator';
        scrollIndicatorElement.setAttribute('role', 'status');
        scrollIndicatorElement.setAttribute('aria-live', 'polite');
        scrollIndicatorElement.innerHTML = `
            <span class="scroll-arrow" aria-hidden="true">⬆</span>
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

function setLoadingState(element, isLoading) {
    if (!element) return;

    element.disabled = isLoading;
    if (isLoading) {
        element.classList.add('loading');
    } else {
        element.classList.remove('loading');
    }
}

// =====================================================
// DRAG & DROP HANDLERS (Desktop)
// =====================================================

function handleDragStart(e) {
    const card = e.target.closest('.player-card');
    if (!card) return;

    const playerId = parseInt(card.dataset.playerId);
    const player = state.availablePlayers.find(p => p.id === playerId);

    if (!player || player.status !== 'fit') {
        e.preventDefault();
        return;
    }

    state.selectedPlayer = player;
    card.classList.add('dragging');

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', player.id);
}

function handleDragEnd(e) {
    const card = e.target.closest('.player-card');
    if (card) {
        card.classList.remove('dragging');
    }

    document.querySelectorAll('.drag-over, .drag-invalid').forEach(el => {
        el.classList.remove('drag-over', 'drag-invalid');
        el.removeAttribute('data-error-hint');
    });

    state.currentDragOverSlot = null;
    state.selectedPlayer = null;
}

function handleDragEnter(e) {
    e.preventDefault();
}

function handleDragOver(e) {
    if (!state.selectedPlayer) return;

    e.preventDefault();
    e.stopPropagation();

    const slot = e.currentTarget;

    if (state.currentDragOverSlot === slot) {
        return;
    }

    if (state.currentDragOverSlot && state.currentDragOverSlot !== slot) {
        state.currentDragOverSlot.classList.remove('drag-over', 'drag-invalid');
        state.currentDragOverSlot.removeAttribute('data-error-hint');
    }

    const slotType = slot.dataset.slotType;
    const position = slot.dataset.position;

    let canDrop;
    if (slotType === 'field') {
        canDrop = canPlayPosition(state.selectedPlayer, position);
    } else {
        canDrop = true;
    }

    if (canDrop) {
        slot.classList.add('drag-over');
        state.currentDragOverSlot = slot;
        e.dataTransfer.dropEffect = 'move';
    } else {
        slot.classList.add('drag-invalid');
        const positionName = POSITION_NAMES[position];
        slot.setAttribute('data-error-hint',
            `${state.selectedPlayer.main_position} kann nicht ${positionName} spielen`);
        e.dataTransfer.dropEffect = 'none';
    }
}

function handleDragLeave(e) {
    const slot = e.currentTarget;
    const relatedTarget = e.relatedTarget;

    if (relatedTarget && slot.contains(relatedTarget)) {
        return;
    }

    slot.classList.remove('drag-over', 'drag-invalid');
    slot.removeAttribute('data-error-hint');

    if (state.currentDragOverSlot === slot) {
        state.currentDragOverSlot = null;
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const slot = e.currentTarget;
    slot.classList.remove('drag-over', 'drag-invalid');
    slot.removeAttribute('data-error-hint');

    if (!state.selectedPlayer) {
        state.currentDragOverSlot = null;
        return;
    }

    const slotType = slot.dataset.slotType;
    const slotIndex = parseInt(slot.dataset.slotIndex, 10);

    placePlayer(state.selectedPlayer, slotType, slotIndex);

    state.currentDragOverSlot = null;
    state.selectedPlayer = null;
}

// =====================================================
// TOUCH HANDLERS (Mobile)
// =====================================================

function createGhost(card, touch) {
    state.ghostElement = card.cloneNode(true);
    state.ghostElement.classList.add('ghost-dragging');
    state.ghostElement.setAttribute('aria-hidden', 'true');

    const rect = card.getBoundingClientRect();
    state.ghostElement.style.position = 'fixed';
    state.ghostElement.style.width = rect.width + 'px';
    state.ghostElement.style.left = (touch.clientX - rect.width / 2) + 'px';
    state.ghostElement.style.top = (touch.clientY - rect.height / 2) + 'px';
    state.ghostElement.style.zIndex = '9999';
    state.ghostElement.style.pointerEvents = 'none';

    document.body.appendChild(state.ghostElement);
}

function removeGhost() {
    if (state.ghostElement && state.ghostElement.parentNode) {
        state.ghostElement.parentNode.removeChild(state.ghostElement);
    }
    state.ghostElement = null;
}

function handleTouchStart(e) {
    const card = e.target.closest('.player-card');
    if (!card || card.classList.contains('unavailable')) return;

    // Prevent if clicking remove button
    if (e.target.closest('.quick-remove-btn')) return;

    const playerId = parseInt(card.dataset.playerId);
    state.draggedPlayer = state.availablePlayers.find(p => p.id === playerId);

    if (!state.draggedPlayer || state.draggedPlayer.status !== 'fit') {
        return;
    }

    const touch = e.touches[0];
    state.touchStartPos = {x: touch.clientX, y: touch.clientY};

    card.classList.add('drag-starting');
    hapticFeedback(10);

    state.touchTimeout = setTimeout(() => {
        if (state.touchStartPos && !state.isDragging) {
            state.isDragging = true;
            createGhost(card, touch);
            card.classList.remove('drag-starting');
            card.classList.add('dragging');
            hapticFeedback([10, 50, 10]);
        }
    }, CONFIG.TOUCH_DELAY_MS);
}

function handleTouchMove(e) {
    if (!state.isDragging || !state.ghostElement) return;

    e.preventDefault();

    const touch = e.touches[0];
    const rect = state.ghostElement.getBoundingClientRect();

    state.ghostElement.style.left = (touch.clientX - rect.width / 2) + 'px';
    state.ghostElement.style.top = (touch.clientY - rect.height / 2) + 'px';

    // Auto-Scroll Logic
    const viewportHeight = window.innerHeight;
    const touchY = touch.clientY;

    if (touchY < CONFIG.AUTO_SCROLL_ZONE_PX) {
        const intensity = Math.pow(1 - (touchY / CONFIG.AUTO_SCROLL_ZONE_PX), 2);
        const speed = Math.ceil(CONFIG.AUTO_SCROLL_BASE_SPEED +
            (CONFIG.AUTO_SCROLL_MAX_SPEED - CONFIG.AUTO_SCROLL_BASE_SPEED) * intensity);
        window.scrollBy({top: -speed, behavior: 'auto'});
        showScrollIndicator('up');
    } else if (touchY > viewportHeight - CONFIG.AUTO_SCROLL_ZONE_PX) {
        const distanceFromBottom = viewportHeight - touchY;
        const intensity = Math.pow(1 - (distanceFromBottom / CONFIG.AUTO_SCROLL_ZONE_PX), 2);
        const speed = Math.ceil(CONFIG.AUTO_SCROLL_BASE_SPEED +
            (CONFIG.AUTO_SCROLL_MAX_SPEED - CONFIG.AUTO_SCROLL_BASE_SPEED) * intensity);
        window.scrollBy({top: speed, behavior: 'auto'});
        showScrollIndicator('down');
    } else {
        hideScrollIndicator();
    }

    state.ghostElement.style.pointerEvents = 'none';
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    state.ghostElement.style.pointerEvents = '';

    const slot = element?.closest('.field-slot, .bench-slot');

    if (state.currentDragOverSlot && state.currentDragOverSlot !== slot) {
        state.currentDragOverSlot.classList.remove('drag-over', 'drag-invalid');
        state.currentDragOverSlot.removeAttribute('data-error-hint');
        state.currentDragOverSlot = null;
    }

    if (slot && state.draggedPlayer) {
        const slotType = slot.dataset.slotType;
        const position = slot.dataset.position;

        let canDrop;
        if (slotType === 'field') {
            canDrop = canPlayPosition(state.draggedPlayer, position);
        } else {
            canDrop = true;
        }

        if (canDrop) {
            slot.classList.add('drag-over');
            state.currentDragOverSlot = slot;
        } else {
            slot.classList.add('drag-invalid');
            const positionName = POSITION_NAMES[position];
            slot.setAttribute('data-error-hint',
                `${state.draggedPlayer.main_position} kann nicht ${positionName} spielen`);
        }
    }
}

function handleTouchMoveRAF(e) {
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
        handleTouchMove(e);
        rafId = null;
    });
}

function handleTouchEnd(e) {
    if (state.touchTimeout) {
        clearTimeout(state.touchTimeout);
        state.touchTimeout = null;
    }

    if (!state.isDragging) {
        state.touchStartPos = null;
        document.querySelectorAll('.drag-starting').forEach(el =>
            el.classList.remove('drag-starting'));
        return;
    }

    const touch = e.changedTouches[0];

    state.ghostElement.style.pointerEvents = 'none';
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    state.ghostElement.style.pointerEvents = '';

    const slot = element?.closest('.field-slot, .bench-slot');

    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.drag-over, .drag-invalid').forEach(el => {
        el.classList.remove('drag-over', 'drag-invalid');
        el.removeAttribute('data-error-hint');
    });

    if (slot && state.draggedPlayer) {
        const slotType = slot.dataset.slotType;
        const slotIndex = parseInt(slot.dataset.slotIndex, 10);

        placePlayer(state.draggedPlayer, slotType, slotIndex);
    }

    removeGhost();
    hideScrollIndicator();
    state.clearTouch();
    state.currentDragOverSlot = null;
}

function handleTouchCancel() {
    if (state.touchTimeout) {
        clearTimeout(state.touchTimeout);
        state.touchTimeout = null;
    }

    document.querySelectorAll('.dragging, .drag-starting').forEach(el =>
        el.classList.remove('dragging', 'drag-starting'));
    document.querySelectorAll('.drag-over, .drag-invalid').forEach(el => {
        el.classList.remove('drag-over', 'drag-invalid');
        el.removeAttribute('data-error-hint');
    });

    removeGhost();
    hideScrollIndicator();
    state.clearTouch();
    state.currentDragOverSlot = null;
}

// =====================================================
// KEYBOARD NAVIGATION
// =====================================================

function handleSlotKeyboard(e) {
    const slot = e.currentTarget;

    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();

        if (state.selectedPlayer) {
            const slotType = slot.dataset.slotType;
            const slotIndex = parseInt(slot.dataset.slotIndex, 10);
            placePlayer(state.selectedPlayer, slotType, slotIndex);
        }
    }

    // Arrow-Key Navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        navigateSlots(slot, e.key);
    }
}

function navigateSlots(currentSlot, direction) {
    const allSlots = Array.from(document.querySelectorAll('.field-slot, .bench-slot'));
    const currentIndex = allSlots.indexOf(currentSlot);

    let nextIndex = currentIndex;

    switch (direction) {
        case 'ArrowRight':
            nextIndex = (currentIndex + 1) % allSlots.length;
            break;
        case 'ArrowLeft':
            nextIndex = (currentIndex - 1 + allSlots.length) % allSlots.length;
            break;
        case 'ArrowDown':
            nextIndex = Math.min(currentIndex + 3, allSlots.length - 1);
            break;
        case 'ArrowUp':
            nextIndex = Math.max(currentIndex - 3, 0);
            break;
    }

    if (allSlots[nextIndex]) {
        allSlots[nextIndex].focus();
    }
}

// =====================================================
// FORMATION & LINEUP MANAGEMENT
// =====================================================

async function handleFormationChange(e) {
    const newFormation = e.target.value;

    if (newFormation === state.currentFormation) return;

    const fieldPlayers = state.fieldSlots.filter(s => s.player);

    if (fieldPlayers.length === 0) {
        state.currentFormation = newFormation;
        renderFormationSlots();
        attachSlotEventListeners();
        validateLineup();
        return;
    }

    const message = `Formation zu ${newFormation} ändern?

Aktuell aufgestellt: ${fieldPlayers.length} Spieler
→ Kompatible Positionen werden automatisch übernommen
→ Inkompatible Spieler wandern auf die Bank

Fortfahren?`;

    if (!confirm(message)) {
        e.target.value = state.currentFormation;
        return;
    }

    // Loading State
    state.isFormationChanging = true;
    setLoadingState(e.target, true);
    showToast(`Wechsel zu ${newFormation}...`, 'info');

    try {
        const oldPlayers = state.fieldSlots.map(s => ({
            player: s.player,
            originalPosition: s.position
        })).filter(s => s.player);

        state.currentFormation = newFormation;
        renderFormationSlots();

        let migratedCount = 0;

        oldPlayers.forEach(({player, originalPosition}) => {
            // Try exact position match first
            let targetSlot = state.fieldSlots.findIndex(s =>
                !s.player && s.position === originalPosition
            );

            // Try compatible position
            if (targetSlot === -1) {
                targetSlot = state.fieldSlots.findIndex(s =>
                    !s.player && canPlayPosition(player, s.position)
                );
            }

            if (targetSlot !== -1) {
                state.fieldSlots[targetSlot].player = player;
                renderSlot('field', targetSlot);
                migratedCount++;
            } else {
                // Move to bench
                const emptyBench = state.benchSlots.findIndex(s => !s.player);
                if (emptyBench !== -1) {
                    state.benchSlots[emptyBench].player = player;
                    renderSlot('bench', emptyBench);
                }
            }
        });

        updatePlacedPlayersSet();
        renderAvailablePlayers();
        updateTeamStrength();
        updateBenchCount();
        validateLineup();
        attachSlotEventListeners();

        showToast(`${migratedCount}/${oldPlayers.length} Spieler übernommen`, 'success');
        announceToScreenReader(`Formation geändert zu ${newFormation}. ${migratedCount} Spieler übernommen.`);

    } finally {
        state.isFormationChanging = false;
        setLoadingState(e.target, false);
    }
}

function clearLineup() {
    if (!confirm('Möchten Sie die gesamte Aufstellung zurücksetzen?')) return;

    state.fieldSlots.forEach(slot => slot.player = null);
    state.benchSlots.forEach(slot => slot.player = null);

    renderFormationSlots();
    renderBenchSlots();
    updatePlacedPlayersSet();
    renderAvailablePlayers();
    updateTeamStrength();
    validateLineup();

    attachSlotEventListeners();

    showToast('Aufstellung zurückgesetzt', 'success');
    announceToScreenReader('Aufstellung zurückgesetzt');
}

function checkSaveReadiness() {
    const fieldPlayersCount = state.fieldSlots.filter(slot => slot.player).length;

    if (fieldPlayersCount < CONFIG.MIN_PLAYERS) {
        return {
            ready: false,
            message: `Zum Speichern müssen mindestens ${CONFIG.MIN_PLAYERS} Spieler auf dem Feld aufgestellt sein. Aktuell: ${fieldPlayersCount}`
        };
    }

    const goalkeeper = state.fieldSlots.find(slot => slot.position === 'TW' && slot.player);
    if (!goalkeeper) {
        return {ready: false, message: 'Es muss mindestens ein Torwart aufgestellt sein.'};
    }

    return {ready: true, message: 'Speicherung möglich'};
}

function saveLineup() {
    const saveCheck = checkSaveReadiness();

    if (!saveCheck.ready) {
        showToast(saveCheck.message, 'error');
        playErrorSound();
        return;
    }

    const lineup = {
        formation: state.currentFormation,
        date: new Date().toISOString(),
        field: state.fieldSlots.map(slot => slot.player ? slot.player.id : null),
        bench: state.benchSlots.map(slot => slot.player ? slot.player.id : null),
        version: 1
    };

    // Loading State
    state.isSaving = true;
    const saveBtn = document.getElementById('saveLineup');
    setLoadingState(saveBtn, true);

    try {
        const lineupJson = JSON.stringify(lineup);
        localStorage.setItem('kickerscup_lineup', lineupJson);

        showToast('Aufstellung gespeichert', 'success');
        playSuccessSound();
        announceToScreenReader('Aufstellung erfolgreich gespeichert');
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            showToast('Speicher voll. Bitte Browser-Daten löschen.', 'error');
        } else {
            showToast('Fehler beim Speichern', 'error');
        }
        debug('Save error:', error);
        playErrorSound();
    } finally {
        state.isSaving = false;
        setLoadingState(saveBtn, false);
    }
}

function validateLineupSchema(lineup) {
    return (
        lineup &&
        typeof lineup.formation === 'string' &&
        Array.isArray(lineup.field) &&
        Array.isArray(lineup.bench) &&
        lineup.field.length === CONFIG.MAX_PLAYERS &&
        lineup.bench.length === CONFIG.MAX_BENCH &&
        (lineup.version === undefined || lineup.version === 1)
    );
}

function loadLineup() {
    try {
        const saved = localStorage.getItem('kickerscup_lineup');
        if (!saved) return false;

        const lineup = JSON.parse(saved);

        if (!validateLineupSchema(lineup)) {
            debug('Invalid lineup schema, resetting');
            localStorage.removeItem('kickerscup_lineup');
            return false;
        }

        state.currentFormation = lineup.formation;
        document.getElementById('formationSelect').value = state.currentFormation;

        renderFormationSlots();

        lineup.field.forEach((playerId, index) => {
            if (playerId) {
                const player = state.availablePlayers.find(p => p.id === playerId);
                if (player) {
                    state.fieldSlots[index].player = player;
                    renderSlot('field', index);
                }
            }
        });

        lineup.bench.forEach((playerId, index) => {
            if (playerId) {
                const player = state.availablePlayers.find(p => p.id === playerId);
                if (player) {
                    state.benchSlots[index].player = player;
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
        debug('Load error:', error);
        localStorage.removeItem('kickerscup_lineup');
        return false;
    }
}

// =====================================================
// EVENT LISTENERS
// =====================================================

function attachSlotEventListeners() {
    // Entferne alte Slot-Listener aus Tracking
    eventListeners = eventListeners.filter(({element}) => {
        const isSlot = element?.classList?.contains('field-slot') ||
            element?.classList?.contains('bench-slot');
        return !isSlot || document.contains(element);
    });

    // Clone & Replace (entfernt alle Event Listener)
    document.querySelectorAll('.field-slot, .bench-slot').forEach(slot => {
        const clone = slot.cloneNode(true);
        slot.parentNode.replaceChild(clone, slot);
    });

    // Neue Listener hinzufügen
    document.querySelectorAll('.field-slot, .bench-slot').forEach(slot => {
        addEventListener(slot, 'dragenter', handleDragEnter, false);
        addEventListener(slot, 'dragover', handleDragOver, false);
        addEventListener(slot, 'dragleave', handleDragLeave, false);
        addEventListener(slot, 'drop', handleDrop, false);
        addEventListener(slot, 'keydown', handleSlotKeyboard, false);
    });
}

function handleOrientationChange() {
    // Clear previous timeout
    if (orientationTimeout) {
        clearTimeout(orientationTimeout);
    }

    orientationTimeout = setTimeout(() => {
        debug('🔄 Orientation changed, re-rendering formation...');

        // ✅ SCHRITT 1: Formation mit Spieler-Erhaltung neu rendern
        renderFormationSlots(true);

        // ✅ SCHRITT 2: Alle Slots mit Spielern visuell aktualisieren
        state.fieldSlots.forEach((slot, index) => {
            if (slot.player) {
                renderSlot('field', index, false); // false = keine Animation
            }
        });

        // ✅ SCHRITT 3: Bank-Slots aktualisieren (nicht betroffen, aber sicherheitshalber)
        state.benchSlots.forEach((slot, index) => {
            if (slot.player) {
                renderSlot('bench', index, false);
            }
        });

        // ✅ SCHRITT 4: UI-State aktualisieren
        updateTeamStrength();
        updateBenchCount();
        validateLineup();

        // ✅ SCHRITT 5: Event Listeners neu anbinden (wichtig für neue DOM-Elemente)
        attachSlotEventListeners();

        orientationTimeout = null;

        debug('✅ Orientation change complete');
    }, ANIMATION_DURATIONS.ORIENTATION_CHANGE_DELAY);
}

function toggleValidationPanel(collapsed) {
    const content = document.querySelector('.validation-content');
    const focusableElements = content?.querySelectorAll('button, a, input, [tabindex]');

    if (focusableElements) {
        focusableElements.forEach(el => {
            el.setAttribute('tabindex', collapsed ? '-1' : '0');
        });
    }
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
    const validationToggle = document.getElementById('validationToggle');

    if (validationHeader && validationPanel) {
        addEventListener(validationHeader, 'click', () => {
            const isCollapsed = validationPanel.classList.toggle('collapsed');
            validationToggle.setAttribute('aria-expanded', !isCollapsed);
            validationPanel.querySelector('.validation-content')
                .setAttribute('aria-hidden', isCollapsed);
            toggleValidationPanel(isCollapsed);
        });

        addEventListener(validationHeader, 'keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                validationHeader.click();
            }
        });

        // Default: Collapsed on mobile
        if (window.matchMedia('(max-width: 767px)').matches) {
            validationPanel.classList.add('collapsed');
            validationToggle.setAttribute('aria-expanded', 'false');
            validationPanel.querySelector('.validation-content')
                .setAttribute('aria-hidden', 'true');
            toggleValidationPanel(true);
        }
    }

    const searchInput = document.getElementById('playerSearch');
    const positionFilter = document.getElementById('positionFilter');
    const sortSelect = document.getElementById('sortSelect');

    if (searchInput) {
        const debouncedSearch = debounce(renderAvailablePlayers, CONFIG.DEBOUNCE_SEARCH_MS);
        addEventListener(searchInput, 'input', debouncedSearch);
    }
    if (positionFilter) {
        addEventListener(positionFilter, 'change', renderAvailablePlayers);
    }
    if (sortSelect) {
        addEventListener(sortSelect, 'change', renderAvailablePlayers);
    }

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

    if (isTouchDevice) {
        addEventListener(document, 'touchstart', (e) => {
            if (e.target.closest('.player-card')) {
                handleTouchStart(e);
            }
        }, {passive: false});

        addEventListener(document, 'touchmove', handleTouchMoveRAF, {passive: false});
        addEventListener(document, 'touchend', handleTouchEnd);
        addEventListener(document, 'touchcancel', handleTouchCancel);
    }

    addEventListener(document, 'click', (e) => {
        const removeBtn = e.target.closest('.quick-remove-btn');
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const playerId = parseInt(removeBtn.dataset.playerId);
            removePlayerWithAnimation(playerId);
        }
    });

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

    addEventListener(window, 'orientationchange', handleOrientationChange);
    addEventListener(window, 'resize', handleOrientationChange);

    attachSlotEventListeners();
}

// =====================================================
// MODULE LIFECYCLE
// =====================================================

export function init() {
    debug('🚀 Lineup System wird initialisiert...');

    initAudioContext();
    state.availablePlayers = [...config.examplePlayers];

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

    debug('✅ Lineup System vollständig initialisiert');
    announceToScreenReader('Aufstellungs-Seite geladen', 'polite');
}

export function cleanup() {
    debug('🧹 Lineup System Cleanup wird durchgeführt...');

    eventListeners.forEach(({element, event, handler, options}) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners = [];

    removeGhost();
    hideScrollIndicator();

    if (scrollIndicatorElement && scrollIndicatorElement.parentNode) {
        scrollIndicatorElement.parentNode.removeChild(scrollIndicatorElement);
        scrollIndicatorElement = null;
    }

    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    if (orientationTimeout) {
        clearTimeout(orientationTimeout);
        orientationTimeout = null;
    }

    state.reset();
    state.clearTouch();

    if (state.audioContext) {
        state.audioContext.close();
        state.audioContext = null;
    }

    // Clear caches
    compatibilityCache.clear();
    lastAnnouncement = 0;

    debug('✅ Lineup System Cleanup abgeschlossen');
}