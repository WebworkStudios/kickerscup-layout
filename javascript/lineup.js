// =====================================================
// KICKERSCUP - LINEUP SYSTEM (ES2025 MODERNIZED)
// ✅ ES2025: AbortController für Event Management
// ✅ ES2025: Player Map für O(1) Lookups
// ✅ ES2025: Strukturiertes Error Handling
// ✅ ES2025: Optional Chaining & Nullish Coalescing
// ✅ ES2025: Immutable Configuration Objects
// =====================================================

import {LineupConfig} from './lineup-config.js';

// =====================================================
// CONFIGURATION & CONSTANTS (ES2025 - Immutable)
// =====================================================

const CONFIG = Object.freeze({
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
    MIN_ANNOUNCEMENT_INTERVAL_MS: 2000,
    LANDSCAPE_HINT_STORAGE_KEY: 'kickerscup_landscape_hint_dismissed'
});

const ANIMATION_DURATIONS = Object.freeze({
    JUST_FILLED: 500,
    DRAG_START_PULSE: 150,
    TOAST_DISPLAY: 5000,
    ORIENTATION_CHANGE_DELAY: 150
});

const POSITION_NAMES = Object.freeze({
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
});

const DEBUG = false;

// =====================================================
// STATE MANAGEMENT (ES2025 Enhanced)
// =====================================================

/**
 * @class LineupState
 * ✅ ES2025: Enhanced with Player Map for O(1) lookups
 */
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
        this.audioContextResumed = false;

        // UI State
        this.isFormationChanging = false;
        this.isSaving = false;

        // ✅ ES2025: Player Map für O(1) Lookups
        this.playerMap = new Map();
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

    /**
     * ✅ ES2025: Build Player Map for O(1) lookups
     * @param {Array} players - Array of player objects
     */
    buildPlayerMap(players) {
        this.playerMap.clear();
        players.forEach(p => this.playerMap.set(p.id, p));
    }

    /**
     * ✅ ES2025: Get player by ID with O(1) complexity
     * @param {number} id - Player ID
     * @returns {Object|undefined} Player object or undefined
     */
    getPlayerById(id) {
        return this.playerMap.get(id);
    }
}

const state = new LineupState();
const config = LineupConfig;

// =====================================================
// EVENT MANAGEMENT (ES2025 - AbortController Pattern)
// =====================================================

/**
 * ✅ ES2025: AbortController ersetzt Array-basiertes Event Tracking
 * Automatisches Cleanup aller Events bei abort()
 */
let abortController = new AbortController();

/**
 * ✅ ES2025: Simplified addEventListener mit AbortSignal
 * Alle Events werden automatisch beim cleanup() entfernt
 *
 * @param {EventTarget} element - DOM element or global object
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object|boolean} options - Event options
 */
function addEventListener(element, event, handler, options = false) {
    if (!element) return;

    // ✅ ES2025: Convert boolean to object and add signal
    const eventOptions = typeof options === 'boolean'
        ? { capture: options, signal: abortController.signal }
        : { ...options, signal: abortController.signal };

    element.addEventListener(event, handler, eventOptions);
}

// Module-level variables
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

function debug(...args) {
    if (DEBUG) console.log(...args);
}

/**
 * XSS-safe HTML escaping
 * @param {string} unsafe - Unsafe string
 * @returns {string} Escaped string
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
 * Check if two sets are equal
 */
function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (let item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Announce message to screen reader
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
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
 * Trigger haptic feedback
 * @param {number|Array} pattern - Vibration pattern
 */
function hapticFeedback(pattern = 10) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// =====================================================
// AUDIO SYSTEM - iOS AudioContext Support
// =====================================================

/**
 * Initialize AudioContext
 */
function initAudioContext() {
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;

    if (!state.audioContext && AudioContextConstructor) {
        try {
            state.audioContext = new AudioContextConstructor();
        } catch (error) {
            debug('AudioContext initialization failed:', error);
        }
    }
}

/**
 * ✅ ES2025: Resume AudioContext after user interaction (iOS fix)
 */
async function resumeAudioContext() {
    if (state.audioContext?.state === 'suspended' && !state.audioContextResumed) {
        try {
            await state.audioContext.resume();
            state.audioContextResumed = true;
            debug('AudioContext resumed after user interaction');
        } catch (error) {
            debug('AudioContext resume failed:', error);
        }
    }
}

/**
 * Play tone with AudioContext
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {string} type - Oscillator type
 * @param {number} volume - Volume (0-1)
 */
function playTone(frequency, duration, type = 'sine', volume = 0.1) {
    if (!state.audioContext || state.audioContext.state !== 'running') return;

    try {
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
    } catch (error) {
        debug('Audio playback error:', error);
    }
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
    hapticFeedback(25);
}

// =====================================================
// POSITION COMPATIBILITY & STRENGTH
// =====================================================

/**
 * Check if player can play a position
 * @param {Object} player - Player object
 * @param {string} targetPosition - Target position code
 * @returns {boolean} True if player can play position
 */
function canPlayPosition(player, targetPosition) {
    const cacheKey = `${player.main_position}-${targetPosition}`;

    if (compatibilityCache.has(cacheKey)) {
        return compatibilityCache.get(cacheKey);
    }

    const mainPos = player.main_position;
    const compatibility = config.positionCompatibility?.[mainPos];

    if (!compatibility) {
        compatibilityCache.set(cacheKey, false);
        return false;
    }

    const compatibilityValue = compatibility[targetPosition];
    const result = compatibilityValue !== undefined && compatibilityValue > 0;

    compatibilityCache.set(cacheKey, result);
    return result;
}

/**
 * Get position penalty information
 * @param {string} mainPosition - Player's main position
 * @param {string} targetPosition - Target position
 * @returns {Object} Penalty info with text and severity
 */
function getPositionPenalty(mainPosition, targetPosition) {
    if (mainPosition === targetPosition) {
        return { text: '', severe: false };
    }

    const compatibility = config.positionCompatibility?.[mainPosition];
    if (!compatibility) return { text: '', severe: true };

    const value = compatibility[targetPosition];

    if (value === undefined || value === 0) {
        return { text: '🚫 Kann Position nicht spielen', severe: true };
    } else if (value < 0.7) {
        return { text: `⚠️ Fehlbesetzung (${Math.round(value * 100 - 100)}%)`, severe: true };
    } else if (value < 0.9) {
        return { text: `⚠️ Leicht abgestraft (-${Math.round((1 - value) * 100)}%)`, severe: false };
    }

    return { text: '', severe: false };
}

/**
 * Calculate effective strength for a player in a position
 * @param {Object} player - Player object
 * @param {string} position - Position code
 * @returns {number} Effective strength value
 */
function calculateEffectiveStrength(player, position) {
    const baseStrength = Math.round(player.strength * 10);
    const mainPos = player.main_position;

    if (mainPos === position) {
        return baseStrength;
    }

    const compatibility = config.positionCompatibility?.[mainPos];
    if (!compatibility) return 0;

    const compatibilityValue = compatibility[position];
    if (compatibilityValue === undefined || compatibilityValue === 0) {
        return 0;
    }

    return Math.round(baseStrength * compatibilityValue);
}

/**
 * Get status badge HTML for player
 * @param {Object} player - Player object
 * @returns {string} HTML string for status badge
 */
function getStatusBadgeHTML(player) {
    if (player.status === 'fit') return '';

    const icon = player.status === 'injured' ? '🚑' : '⛔';
    const label = player.status === 'injured' ? 'Verletzt' : 'Gesperrt';

    return `<div class="player-status-badge status-${escapeHtml(player.status)}" 
                 aria-label="${label}">${icon}</div>`;
}

// =====================================================
// LANDSCAPE HINT - localStorage-based dismiss
// =====================================================

/**
 * Check if landscape hint was dismissed
 * @returns {boolean} True if dismissed
 */
function isLandscapeHintDismissed() {
    try {
        return localStorage.getItem(CONFIG.LANDSCAPE_HINT_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

/**
 * Dismiss landscape hint
 */
function dismissLandscapeHint() {
    try {
        localStorage.setItem(CONFIG.LANDSCAPE_HINT_STORAGE_KEY, 'true');
    } catch {
        debug('localStorage not available');
    }

    const hint = document.getElementById('landscapeHint');
    if (hint) {
        hint.style.display = 'none';
    }
}

/**
 * Initialize landscape hint with dismiss button
 */
function initLandscapeHint() {
    const hint = document.getElementById('landscapeHint');
    if (!hint) return;

    // If already dismissed, hide it
    if (isLandscapeHintDismissed()) {
        hint.style.display = 'none';
        return;
    }

    // Add close button if not present
    if (!hint.querySelector('.landscape-hint-close')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'landscape-hint-close';
        closeBtn.setAttribute('aria-label', 'Hinweis schließen');
        closeBtn.innerHTML = '×';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            dismissLandscapeHint();
        };
        hint.querySelector('.landscape-hint-content')?.appendChild(closeBtn);
    }
}

// =====================================================
// RENDERING FUNCTIONS
// =====================================================

/**
 * Render formation slots on the field
 * @param {boolean} preservePlayers - Whether to preserve player assignments
 */
function renderFormationSlots(preservePlayers = false) {
    const container = document.getElementById('fieldSlots');
    if (!container) return;

    const formation = config.formations?.[state.currentFormation];
    if (!formation) return;

    const playerBackup = preservePlayers
        ? new Map(state.fieldSlots.map((slot, index) => [index, slot.player]))
        : new Map();

    state.fieldSlots = formation.positions.map((pos, index) => ({
        id: `field-${index}`,
        position: pos.position,
        x: pos.x,
        y: pos.y,
        player: preservePlayers ? (playerBackup.get(index) || null) : null
    }));

    container.innerHTML = state.fieldSlots.map((slot, index) => {
        const positionName = POSITION_NAMES[slot.position] ?? slot.position;
        return `
            <div class="field-slot" 
                 id="${slot.id}"
                 data-slot-type="field"
                 data-slot-index="${index}"
                 data-position="${slot.position}"
                 style="left: ${slot.x}%; top: ${slot.y}%; transform: translate(-50%, -50%);"
                 role="button"
                 tabindex="0"
                 aria-label="${escapeHtml(positionName)}, leer">
                <div class="slot-position">${escapeHtml(slot.position)}</div>
                <div class="slot-placeholder" aria-hidden="true">⚽</div>
            </div>
        `;
    }).join('');
}

/**
 * Render bench slots
 */
function renderBenchSlots() {
    const container = document.getElementById('benchSlots');
    if (!container) return;

    state.benchSlots = Array.from({ length: CONFIG.MAX_BENCH }, (_, index) => ({
        id: `bench-${index}`,
        player: null
    }));

    container.innerHTML = state.benchSlots.map((slot, index) => `
        <div class="bench-slot"
             id="${slot.id}"
             data-slot-type="bench"
             data-slot-index="${index}"
             role="button"
             tabindex="0"
             aria-label="Bank-Position ${index + 1}, leer">
            <div class="bench-placeholder" aria-hidden="true">+</div>
        </div>
    `).join('');
}

/**
 * Render player card HTML
 * @param {Object} player - Player object
 * @param {string|null} slotPosition - Position on field (null for bench)
 * @param {boolean} isFieldCard - Is this a field card (compact) or available card
 * @returns {string} HTML string
 */
function renderPlayerCard(player, slotPosition = null, isFieldCard = false) {
    const effectiveStrength = slotPosition
        ? calculateEffectiveStrength(player, slotPosition)
        : Math.round(player.strength * 10);

    const penalty = slotPosition
        ? getPositionPenalty(player.main_position, slotPosition)
        : { text: '', severe: false };

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

/**
 * Render a single slot (field or bench)
 * @param {string} slotType - 'field' or 'bench'
 * @param {number} slotIndex - Slot index
 * @param {boolean} animate - Whether to animate
 */
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
                <div class="slot-position">${escapeHtml(slot.position)}</div>
                <div class="slot-placeholder" aria-hidden="true">⚽</div>
            `;
        } else {
            element.innerHTML = '<div class="bench-placeholder" aria-hidden="true">+</div>';
        }

        element.setAttribute('aria-label', `${escapeHtml(positionName)}, leer`);
    }
}

/**
 * Render available players list
 */
function renderAvailablePlayers() {
    const container = document.getElementById('availablePlayersList');
    if (!container) return;

    const searchTerm = document.getElementById('playerSearch')?.value.toLowerCase() ?? '';
    const positionFilter = document.getElementById('positionFilter')?.value ?? '';
    const sortBy = document.getElementById('sortSelect')?.value ?? 'strength';

    let filtered = state.availablePlayers.filter(player => {
        if (state.placedPlayerIds.has(player.id)) return false;

        const matchesSearch = !searchTerm ||
            player.name.toLowerCase().includes(searchTerm) ||
            player.main_position.toLowerCase().includes(searchTerm);

        let matchesPosition = true;
        if (positionFilter) {
            if (['DEF', 'MID', 'ATT'].includes(positionFilter)) {
                matchesPosition = config.positionCategories?.[player.main_position]?.category === positionFilter;
            } else {
                matchesPosition = player.main_position === positionFilter;
            }
        }

        return matchesSearch && matchesPosition;
    });

    // Sort players
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'age':
                return a.age - b.age;
            case 'position':
                return a.main_position.localeCompare(b.main_position);
            case 'strength':
            default:
                return b.strength - a.strength;
        }
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-players-message">
                <p>Keine verfügbaren Spieler gefunden</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(player =>
        renderPlayerCard(player, null, false)
    ).join('');
}

/**
 * Update visibility of a specific player in available players list
 * @param {number} playerId - Player ID
 * @param {boolean} placed - Whether player is placed
 */
function updatePlayerVisibility(playerId, placed) {
    const cards = document.querySelectorAll(`.player-card[data-player-id="${playerId}"]`);
    cards.forEach(card => {
        if (card.closest('#availablePlayersList')) {
            card.style.display = placed ? 'none' : '';
        }
    });
}

/**
 * Update placed players set
 */
function updatePlacedPlayersSet() {
    state.placedPlayerIds.clear();

    state.fieldSlots.forEach(slot => {
        if (slot.player) {
            state.placedPlayerIds.add(slot.player.id);
        }
    });

    state.benchSlots.forEach(slot => {
        if (slot.player) {
            state.placedPlayerIds.add(slot.player.id);
        }
    });
}

/**
 * Update team strength display
 */
function updateTeamStrength() {
    const strengthElement = document.getElementById('teamStrength');
    const contextElement = document.getElementById('strengthContext');

    if (!strengthElement) return;

    const fieldPlayers = state.fieldSlots.filter(slot => slot.player);

    if (fieldPlayers.length === 0) {
        strengthElement.textContent = '0';
        if (contextElement) {
            contextElement.textContent = '';
        }
        state.cachedStrength = 0;
        state.lastFieldPlayerIds.clear();
        return;
    }

    // ✅ ES2025: Cache optimization
    const currentIds = new Set(fieldPlayers.map(s => s.player.id));
    const now = Date.now();

    if (state.cachedStrength !== null &&
        setsEqual(currentIds, state.lastFieldPlayerIds) &&
        now - state.strengthCacheTime < CONFIG.CACHE_STRENGTH_DURATION_MS) {
        return;
    }

    const totalStrength = fieldPlayers.reduce((sum, slot) => {
        return sum + calculateEffectiveStrength(slot.player, slot.position);
    }, 0);

    const rounded = Math.round(totalStrength);
    strengthElement.textContent = rounded.toString();

    if (state.cachedStrength !== null && state.cachedStrength !== rounded) {
        strengthElement.classList.add('strength-changed');
        setTimeout(() => strengthElement.classList.remove('strength-changed'), 500);

        if (rounded !== state.cachedStrength) {
            const change = rounded > state.cachedStrength ? 'gestiegen' : 'gesunken';
            announceToScreenReader(`Teamstärke ${change} auf ${rounded}`);
        }
    }

    if (contextElement) {
        const average = Math.round(rounded / fieldPlayers.length);
        contextElement.textContent = `(Ø ${average})`;
    }

    state.cachedStrength = rounded;
    state.lastFieldPlayerIds = currentIds;
    state.strengthCacheTime = now;
}

/**
 * Update bench count display
 */
function updateBenchCount() {
    const benchPlayers = state.benchSlots.filter(slot => slot.player);
    const countElement = document.getElementById('benchCount');
    if (countElement) {
        countElement.textContent = `(${benchPlayers.length}/${CONFIG.MAX_BENCH})`;
    }
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate lineup and display results
 */
function validateLineup() {
    const validationPanel = document.getElementById('validationPanel');
    const validationList = document.getElementById('validationList');
    const validationTitle = document.querySelector('.validation-title');
    const validationToggle = document.getElementById('validationToggle');
    const validationContent = document.querySelector('.validation-content');

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
            text: `Aufstellung unvollständig. Aktuell ${fieldPlayers.length}/${CONFIG.MAX_PLAYERS} Spieler`
        });
    }

    const goalkeeper = state.fieldSlots.find(slot => slot.position === 'TW' && slot.player);
    if (!goalkeeper) {
        messages.push({
            type: 'error',
            icon: '❌',
            text: 'Kein Torwart aufgestellt'
        });
    }

    // Check for misplaced players
    fieldPlayers.forEach(slot => {
        if (!canPlayPosition(slot.player, slot.position)) {
            messages.push({
                type: 'error',
                icon: '🚫',
                text: `${slot.player.name} kann ${POSITION_NAMES[slot.position]} nicht spielen`
            });
        }
    });

    const hasErrors = messages.some(m => m.type === 'error');
    const isValid = fieldPlayers.length >= CONFIG.MIN_PLAYERS && goalkeeper && !hasErrors;

    if (validationTitle) {
        validationTitle.textContent = isValid ? 'Aufstellung gültig' : 'Aufstellung ungültig';
    }

    validationPanel.classList.toggle('valid', isValid);
    validationPanel.classList.toggle('invalid', !isValid);

    // ✅ Auto-open panel on errors
    if (hasErrors && validationPanel.classList.contains('collapsed')) {
        validationPanel.classList.remove('collapsed');
        if (validationToggle) {
            validationToggle.setAttribute('aria-expanded', 'true');
        }
        if (validationContent) {
            validationContent.setAttribute('aria-hidden', 'false');
        }
        toggleValidationPanel(false);
    }

    if (messages.length === 0) {
        validationList.innerHTML = `
            <li class="validation-item" role="listitem">
                <span class="validation-item-icon" aria-hidden="true">✅</span>
                <span>Alle Prüfungen bestanden!</span>
            </li>
        `;
    } else {
        const allMessages = [...messages];
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

    if (!isValid) {
        announceToScreenReader(`Aufstellung ungültig. ${messages.length} Problem(e) gefunden.`, 'assertive');
    }
}

/**
 * Toggle validation panel collapsed state
 * @param {boolean} collapsed - Whether panel should be collapsed
 */
function toggleValidationPanel(collapsed) {
    const content = document.querySelector('.validation-content');
    const focusableElements = content?.querySelectorAll('button, a, input, [tabindex]');

    if (focusableElements) {
        focusableElements.forEach(el => {
            el.setAttribute('tabindex', collapsed ? '-1' : '0');
        });
    }
}

// =====================================================
// PLAYER PLACEMENT & UNDO
// =====================================================

/**
 * Place a player in a slot
 * @param {Object} player - Player object
 * @param {string} slotType - 'field' or 'bench'
 * @param {number} slotIndex - Slot index
 * @param {boolean} skipUndo - Skip undo tracking
 * @returns {boolean} Success status
 */
function placePlayer(player, slotType, slotIndex, skipUndo = false) {
    // ✅ iOS AudioContext activation
    resumeAudioContext();

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

    if (!skipUndo) {
        state.undoStack.push({
            action: 'place',
            player: player,
            newPosition: { type: slotType, index: slotIndex },
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

/**
 * Remove player from lineup
 * @param {number} playerId - Player ID
 * @returns {Object|null} Old position or null
 */
function removePlayerFromLineup(playerId) {
    let oldPosition = null;

    state.fieldSlots.forEach((slot, index) => {
        if (slot.player?.id === playerId) {
            oldPosition = { type: 'field', index };
            slot.player = null;
            renderSlot('field', index);
        }
    });

    state.benchSlots.forEach((slot, index) => {
        if (slot.player?.id === playerId) {
            oldPosition = { type: 'bench', index };
            slot.player = null;
            renderSlot('bench', index);
        }
    });

    if (oldPosition) {
        state.placedPlayerIds.delete(playerId);
    }

    return oldPosition;
}

/**
 * Remove player with animation and undo option
 * @param {number} playerId - Player ID
 */
function removePlayerWithAnimation(playerId) {
    resumeAudioContext();

    // ✅ ES2025: O(1) Lookup
    const player = state.getPlayerById(playerId);
    if (!player) return;

    const oldPosition = removePlayerFromLineup(playerId);

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

/**
 * Show undo toast notification
 * @param {string} message - Message to display
 * @param {Function} undoCallback - Callback for undo action
 */
function showUndoToast(message, undoCallback) {
    // Remove existing toasts
    document.querySelectorAll('.toast-undo').forEach(t => t.remove());

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

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (info, success, error, warning)
 */
function showToast(message, type = 'info') {
    debug(`[Toast ${type}]:`, message);
    announceToScreenReader(message, type === 'error' ? 'assertive' : 'polite');
}

/**
 * Show scroll indicator
 * @param {string} direction - 'up' or 'down'
 */
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

/**
 * Hide scroll indicator
 */
function hideScrollIndicator() {
    if (scrollIndicatorElement) {
        scrollIndicatorElement.classList.remove('active');
    }
}

/**
 * Set loading state for element
 * @param {HTMLElement} element - Element to set loading state on
 * @param {boolean} isLoading - Whether element is loading
 */
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

/**
 * Handle drag start event
 * @param {DragEvent} e - Drag event
 */
function handleDragStart(e) {
    resumeAudioContext();

    const card = e.target.closest('.player-card');
    if (!card) return;

    const playerId = parseInt(card.dataset.playerId);
    // ✅ ES2025: O(1) Lookup
    const player = state.getPlayerById(playerId);

    if (!player || player.status !== 'fit') {
        e.preventDefault();
        return;
    }

    state.selectedPlayer = player;
    card.classList.add('dragging');

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', player.id);
}

/**
 * Handle drag end event
 * @param {DragEvent} e - Drag event
 */
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

/**
 * Handle drag enter event
 * @param {DragEvent} e - Drag event
 */
function handleDragEnter(e) {
    e.preventDefault();
}

/**
 * Handle drag over event
 * @param {DragEvent} e - Drag event
 */
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
        const positionName = POSITION_NAMES[position] ?? position;
        slot.setAttribute('data-error-hint',
            `${escapeHtml(state.selectedPlayer.main_position)} kann nicht ${escapeHtml(positionName)} spielen`);
        e.dataTransfer.dropEffect = 'none';
    }
}

/**
 * Handle drag leave event
 * @param {DragEvent} e - Drag event
 */
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

/**
 * Handle drop event
 * @param {DragEvent} e - Drag event
 */
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

/**
 * Create ghost element for touch dragging
 * @param {HTMLElement} card - Player card element
 * @param {Touch} touch - Touch object
 */
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

/**
 * Remove ghost element
 */
function removeGhost() {
    if (state.ghostElement?.parentNode) {
        state.ghostElement.parentNode.removeChild(state.ghostElement);
    }
    state.ghostElement = null;
}

/**
 * Handle touch start event
 * @param {TouchEvent} e - Touch event
 */
function handleTouchStart(e) {
    resumeAudioContext();

    const card = e.target.closest('.player-card');
    if (!card || card.classList.contains('unavailable')) return;

    if (e.target.closest('.quick-remove-btn')) return;

    const playerId = parseInt(card.dataset.playerId);
    // ✅ ES2025: O(1) Lookup
    state.draggedPlayer = state.getPlayerById(playerId);

    if (!state.draggedPlayer || state.draggedPlayer.status !== 'fit') {
        return;
    }

    const touch = e.touches[0];
    state.touchStartPos = { x: touch.clientX, y: touch.clientY };

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

/**
 * Handle touch move event
 * @param {TouchEvent} e - Touch event
 */
function handleTouchMove(e) {
    if (!state.isDragging || !state.ghostElement) return;

    e.preventDefault();

    const touch = e.touches[0];
    const rect = state.ghostElement.getBoundingClientRect();

    state.ghostElement.style.left = (touch.clientX - rect.width / 2) + 'px';
    state.ghostElement.style.top = (touch.clientY - rect.height / 2) + 'px';

    const viewportHeight = window.innerHeight;
    const touchY = touch.clientY;

    if (touchY < CONFIG.AUTO_SCROLL_ZONE_PX) {
        const intensity = Math.pow(1 - (touchY / CONFIG.AUTO_SCROLL_ZONE_PX), 2);
        const speed = Math.ceil(CONFIG.AUTO_SCROLL_BASE_SPEED +
            (CONFIG.AUTO_SCROLL_MAX_SPEED - CONFIG.AUTO_SCROLL_BASE_SPEED) * intensity);
        window.scrollBy({ top: -speed, behavior: 'auto' });
        showScrollIndicator('up');
    } else if (touchY > viewportHeight - CONFIG.AUTO_SCROLL_ZONE_PX) {
        const distanceFromBottom = viewportHeight - touchY;
        const intensity = Math.pow(1 - (distanceFromBottom / CONFIG.AUTO_SCROLL_ZONE_PX), 2);
        const speed = Math.ceil(CONFIG.AUTO_SCROLL_BASE_SPEED +
            (CONFIG.AUTO_SCROLL_MAX_SPEED - CONFIG.AUTO_SCROLL_BASE_SPEED) * intensity);
        window.scrollBy({ top: speed, behavior: 'auto' });
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
            const positionName = POSITION_NAMES[position] ?? position;
            slot.setAttribute('data-error-hint',
                `${escapeHtml(state.draggedPlayer.main_position)} kann nicht ${escapeHtml(positionName)} spielen`);
        }
    }
}

/**
 * Handle touch move with requestAnimationFrame
 * @param {TouchEvent} e - Touch event
 */
function handleTouchMoveRAF(e) {
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
        handleTouchMove(e);
        rafId = null;
    });
}

/**
 * Handle touch end event
 * @param {TouchEvent} e - Touch event
 */
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

/**
 * Handle touch cancel event
 */
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

    announceToScreenReader('Ziehen abgebrochen');
}

// =====================================================
// KEYBOARD NAVIGATION
// =====================================================

/**
 * Handle keyboard navigation in slots
 * @param {KeyboardEvent} e - Keyboard event
 */
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

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        navigateSlots(slot, e.key);
    }
}

/**
 * Navigate between slots with arrow keys
 * @param {HTMLElement} currentSlot - Current slot element
 * @param {string} direction - Arrow key direction
 */
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

/**
 * Handle formation change
 * ✅ ES2025: async/await with race condition protection
 * @param {Event} e - Change event
 */
async function handleFormationChange(e) {
    const newFormation = e.target.value;

    if (newFormation === state.currentFormation) return;

    // ✅ Race condition protection
    if (state.isFormationChanging) {
        e.target.value = state.currentFormation;
        return;
    }

    const fieldPlayers = state.fieldSlots.filter(s => s.player);

    if (fieldPlayers.length === 0) {
        state.currentFormation = newFormation;
        renderFormationSlots();
        attachSlotEventListeners();
        validateLineup();
        announceToScreenReader(`Formation geändert zu ${newFormation}`);
        return;
    }

    // ✅ Set state immediately to prevent double-clicks
    state.isFormationChanging = true;
    setLoadingState(e.target, true);

    try {
        const oldPlayers = state.fieldSlots.map(s => ({
            player: s.player,
            originalPosition: s.position
        })).filter(s => s.player);

        // Backup for undo
        const oldFormation = state.currentFormation;
        const oldFieldSlots = state.fieldSlots.map(s => ({ ...s }));
        const oldBenchSlots = state.benchSlots.map(s => ({ ...s }));

        state.currentFormation = newFormation;
        renderFormationSlots();

        const newFormationData = config.formations?.[newFormation];
        if (!newFormationData) return;

        const positionMap = new Map();
        newFormationData.positions.forEach((pos, index) => {
            if (!positionMap.has(pos.position)) {
                positionMap.set(pos.position, []);
            }
            positionMap.get(pos.position).push(index);
        });

        oldPlayers.forEach(({ player, originalPosition }) => {
            const matchingSlots = positionMap.get(originalPosition) ?? [];

            if (matchingSlots.length > 0) {
                const slotIndex = matchingSlots.shift();
                state.fieldSlots[slotIndex].player = player;
                renderSlot('field', slotIndex);
            } else {
                const emptyBenchIndex = state.benchSlots.findIndex(s => !s.player);
                if (emptyBenchIndex !== -1) {
                    state.benchSlots[emptyBenchIndex].player = player;
                    renderSlot('bench', emptyBenchIndex);
                }
            }
        });

        updatePlacedPlayersSet();
        updateTeamStrength();
        updateBenchCount();
        validateLineup();
        attachSlotEventListeners();

        announceToScreenReader(`Formation geändert zu ${newFormation}`);
        showToast(`Formation auf ${newFormation} geändert`, 'success');

        // ✅ Undo for formation change
        showUndoToast(`Formation geändert zu ${newFormation}`, () => {
            state.currentFormation = oldFormation;
            state.fieldSlots = oldFieldSlots;
            state.benchSlots = oldBenchSlots;

            if (document.getElementById('formationSelect')) {
                document.getElementById('formationSelect').value = oldFormation;
            }

            renderFormationSlots(true);

            state.fieldSlots.forEach((slot, index) => {
                if (slot.player) renderSlot('field', index);
            });

            state.benchSlots.forEach((slot, index) => {
                if (slot.player) renderSlot('bench', index);
            });

            updatePlacedPlayersSet();
            updateTeamStrength();
            updateBenchCount();
            validateLineup();
            attachSlotEventListeners();
        });

    } finally {
        state.isFormationChanging = false;
        setLoadingState(e.target, false);
    }
}

/**
 * Clear lineup with undo option
 */
function clearLineup() {
    // Backup for undo
    const oldFieldSlots = state.fieldSlots.map(s => ({ ...s }));
    const oldBenchSlots = state.benchSlots.map(s => ({ ...s }));
    const hadPlayers = state.fieldSlots.some(s => s.player) ||
        state.benchSlots.some(s => s.player);

    if (!hadPlayers) {
        showToast('Aufstellung ist bereits leer', 'info');
        return;
    }

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

    // ✅ Undo for reset
    showUndoToast('Aufstellung zurückgesetzt', () => {
        state.fieldSlots = oldFieldSlots;
        state.benchSlots = oldBenchSlots;

        renderFormationSlots(true);
        renderBenchSlots();

        state.fieldSlots.forEach((slot, index) => {
            if (slot.player) renderSlot('field', index);
        });
        state.benchSlots.forEach((slot, index) => {
            if (slot.player) renderSlot('bench', index);
        });

        updatePlacedPlayersSet();
        updateTeamStrength();
        updateBenchCount();
        validateLineup();
        attachSlotEventListeners();

        announceToScreenReader('Aufstellung wiederhergestellt');
    });
}

/**
 * Check if lineup is ready to be saved
 * @returns {Object} Ready status and message
 */
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
        return { ready: false, message: 'Es muss mindestens ein Torwart aufgestellt sein.' };
    }

    return { ready: true, message: 'Speicherung möglich' };
}

/**
 * Save lineup to localStorage
 */
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

/**
 * ✅ ES2025: Enhanced schema validation
 * @param {Object} lineup - Lineup object to validate
 * @returns {boolean} Valid status
 */
function validateLineupSchema(lineup) {
    if (!lineup || typeof lineup !== 'object') return false;
    if (typeof lineup.formation !== 'string') return false;
    if (!Array.isArray(lineup.field) || !Array.isArray(lineup.bench)) return false;
    if (lineup.field.length !== CONFIG.MAX_PLAYERS) return false;
    if (lineup.bench.length !== CONFIG.MAX_BENCH) return false;

    // Check if formation exists
    if (!config.formations?.[lineup.formation]) return false;

    // Check for duplicate IDs
    const allIds = [...lineup.field, ...lineup.bench].filter(id => id !== null);
    const uniqueIds = new Set(allIds);
    if (allIds.length !== uniqueIds.size) return false;

    // Check if all IDs are valid players
    for (const id of allIds) {
        if (!state.getPlayerById(id)) return false;
    }

    return true;
}

/**
 * Load lineup from localStorage
 * @returns {boolean} Success status
 */
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
                // ✅ ES2025: O(1) Lookup
                const player = state.getPlayerById(playerId);
                if (player) {
                    state.fieldSlots[index].player = player;
                    renderSlot('field', index);
                }
            }
        });

        lineup.bench.forEach((playerId, index) => {
            if (playerId) {
                const player = state.getPlayerById(playerId);
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

/**
 * Attach event listeners to slots
 */
function attachSlotEventListeners() {
    document.querySelectorAll('.field-slot, .bench-slot').forEach(slot => {
        addEventListener(slot, 'dragenter', handleDragEnter, false);
        addEventListener(slot, 'dragover', handleDragOver, false);
        addEventListener(slot, 'dragleave', handleDragLeave, false);
        addEventListener(slot, 'drop', handleDrop, false);
        addEventListener(slot, 'keydown', handleSlotKeyboard, false);
    });
}

/**
 * Handle orientation change
 */
function handleOrientationChange() {
    if (orientationTimeout) {
        clearTimeout(orientationTimeout);
    }

    orientationTimeout = setTimeout(() => {
        debug('🔄 Orientation changed, re-rendering formation...');

        renderFormationSlots(true);

        state.fieldSlots.forEach((slot, index) => {
            if (slot.player) {
                renderSlot('field', index, false);
            }
        });

        state.benchSlots.forEach((slot, index) => {
            if (slot.player) {
                renderSlot('bench', index, false);
            }
        });

        updateTeamStrength();
        updateBenchCount();
        validateLineup();

        attachSlotEventListeners();

        orientationTimeout = null;

        debug('✅ Orientation change complete');
    }, ANIMATION_DURATIONS.ORIENTATION_CHANGE_DELAY);
}

/**
 * Initialize all event listeners
 */
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
        }, { passive: false });

        addEventListener(document, 'touchmove', handleTouchMoveRAF, { passive: false });
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
    }, { passive: false });

    addEventListener(window, 'orientationchange', handleOrientationChange);
    addEventListener(window, 'resize', handleOrientationChange);

    attachSlotEventListeners();
}

// =====================================================
// MODULE LIFECYCLE
// =====================================================

/**
 * ✅ ES2025: Initialize lineup system
 * @export
 */
export function init() {
    debug('🚀 Lineup System wird initialisiert...');

    initAudioContext();
    state.availablePlayers = [...config.examplePlayers];

    // ✅ ES2025: Build Player Map for O(1) lookups
    state.buildPlayerMap(state.availablePlayers);

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
    initLandscapeHint();

    debug('✅ Lineup System vollständig initialisiert');
    announceToScreenReader('Aufstellungs-Seite geladen', 'polite');
}

/**
 * ✅ ES2025: Cleanup with AbortController
 * @export
 */
export function cleanup() {
    debug('🧹 Lineup System Cleanup wird durchgeführt...');

    // ✅ ES2025: AbortController - Cleanup ALL events with one call
    abortController.abort();
    abortController = new AbortController();

    removeGhost();
    hideScrollIndicator();

    if (scrollIndicatorElement?.parentNode) {
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
        state.audioContext.close().catch(() => {});
        state.audioContext = null;
        state.audioContextResumed = false;
    }

    compatibilityCache.clear();
    lastAnnouncement = 0;

    // Remove dynamically created toasts
    document.querySelectorAll('.toast-undo').forEach(t => t.remove());

    debug('✅ Lineup System Cleanup abgeschlossen');
}