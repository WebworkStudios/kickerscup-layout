// =====================================================
// KICKERSCUP - LINEUP SYSTEM (PRODUCTION-READY v2.3)
// ✅ FIX: Memory Leak in Event-Listener-Management
// ✅ FIX: Race Condition bei Formationswechsel
// ✅ FIX: iOS AudioContext suspended state
// ✅ FIX: Validation-Panel öffnet bei Fehlern automatisch
// ✅ FIX: Player-Map für O(1)-Lookups
// ✅ FIX: Landscape-Hint mit localStorage-Flag
// ✅ FIX: Konsistente Undo für alle destruktiven Aktionen
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
    MIN_ANNOUNCEMENT_INTERVAL_MS: 2000,
    LANDSCAPE_HINT_STORAGE_KEY: 'kickerscup_landscape_hint_dismissed'
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

const DEBUG = false;

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
        this.audioContextResumed = false; // ✅ FIX: Track iOS resume state

        // UI State - ✅ FIX: Definiere alle State-Properties im Constructor
        this.isFormationChanging = false;
        this.isSaving = false;

        // ✅ FIX: Player Map für O(1) Lookups
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

    // ✅ FIX: Player Map Methoden
    buildPlayerMap(players) {
        this.playerMap.clear();
        players.forEach(p => this.playerMap.set(p.id, p));
    }

    getPlayerById(id) {
        return this.playerMap.get(id);
    }
}

const state = new LineupState();
const config = LineupConfig;

// ✅ FIX: Besseres Event-Listener-Management mit WeakMap
const listenerRegistry = new WeakMap();
let globalListeners = []; // Nur für document/window Listener

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

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ✅ FIX: Verbessertes Event-Listener-Management
function addTrackedEventListener(element, event, handler, options) {
    if (!element) return;

    element.addEventListener(event, handler, options);

    // Für globale Objekte (document, window)
    if (element === document || element === window) {
        globalListeners.push({ element, event, handler, options });
        return;
    }

    // Für DOM-Elemente: WeakMap verwenden
    if (!listenerRegistry.has(element)) {
        listenerRegistry.set(element, []);
    }
    listenerRegistry.get(element).push({ event, handler, options });
}

// ✅ FIX: Cleanup für ein spezifisches Element
function removeElementListeners(element) {
    if (!element || !listenerRegistry.has(element)) return;

    const listeners = listenerRegistry.get(element);
    listeners.forEach(({ event, handler, options }) => {
        element.removeEventListener(event, handler, options);
    });
    listenerRegistry.delete(element);
}

// ✅ FIX: Cleanup aller globalen Listener
function removeAllGlobalListeners() {
    globalListeners.forEach(({ element, event, handler, options }) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    globalListeners = [];
}

function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (let item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

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

function hapticFeedback(pattern = 10) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// =====================================================
// AUDIO SYSTEM - ✅ FIX: iOS AudioContext Support
// =====================================================

function initAudioContext() {
    const AudioContextConstructor = window.AudioContext || window['webkitAudioContext'];

    if (!state.audioContext && AudioContextConstructor) {
        state.audioContext = new AudioContextConstructor();
    }
}

// ✅ FIX: Separates Resume für iOS nach User-Interaktion
function resumeAudioContext() {
    if (state.audioContext &&
        state.audioContext.state === 'suspended' &&
        !state.audioContextResumed) {
        state.audioContext.resume().then(() => {
            state.audioContextResumed = true;
            debug('AudioContext resumed after user interaction');
        }).catch(err => {
            debug('AudioContext resume failed:', err);
        });
    }
}

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
    } catch (e) {
        debug('Audio playback error:', e);
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
        return { text: '', severe: false };
    }

    const compatibility = config.positionCompatibility[mainPosition];
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

function getStatusBadgeHTML(player) {
    if (player.status === 'fit') return '';

    const icon = player.status === 'injured' ? '🚑' : '⛔';
    const label = player.status === 'injured' ? 'Verletzt' : 'Gesperrt';

    return `<div class="player-status-badge status-${escapeHtml(player.status)}" 
                 aria-label="${label}">${icon}</div>`;
}

// =====================================================
// LANDSCAPE HINT - ✅ FIX: Mit localStorage-Dismiss
// =====================================================

function isLandscapeHintDismissed() {
    try {
        return localStorage.getItem(CONFIG.LANDSCAPE_HINT_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

function dismissLandscapeHint() {
    try {
        localStorage.setItem(CONFIG.LANDSCAPE_HINT_STORAGE_KEY, 'true');
    } catch {
        // localStorage nicht verfügbar
    }
    const hint = document.getElementById('landscapeHint');
    if (hint) {
        hint.style.display = 'none';
    }
}

function initLandscapeHint() {
    const hint = document.getElementById('landscapeHint');
    if (!hint) return;

    // Wenn bereits dismissed, verstecken
    if (isLandscapeHintDismissed()) {
        hint.style.display = 'none';
        return;
    }

    // Close-Button hinzufügen wenn nicht vorhanden
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

function renderFormationSlots(preservePlayers = false) {
    const container = document.getElementById('fieldSlots');
    if (!container) return;

    const formation = config.formations[state.currentFormation];
    if (!formation) return;

    const playerBackup = preservePlayers
        ? new Map(state.fieldSlots.map((slot, index) => [index, slot.player]))
        : new Map();

    state.fieldSlots = formation.positions.map((pos, index) => {
        return {
            id: `field-${index}`,
            position: pos.position,
            x: pos.x,
            y: pos.y,
            player: playerBackup.get(index) || null
        };
    });

    container.innerHTML = state.fieldSlots.map((slot, index) => {
        const positionName = POSITION_NAMES[slot.position] || slot.position;

        return `
            <div class="field-slot" 
                 id="${slot.id}"
                 data-slot-index="${index}"
                 data-slot-type="field"
                 data-position="${escapeHtml(slot.position)}"
                 role="button"
                 tabindex="0"
                 aria-label="${escapeHtml(positionName)}, leer"
                 style="left: ${slot.x}%; top: ${slot.y}%; transform: translate(-50%, -50%);">
                <div class="slot-position">${escapeHtml(slot.position)}</div>
                <div class="slot-placeholder" aria-hidden="true">⚽</div>
            </div>
        `;
    }).join('');
}

function renderBenchSlots() {
    const container = document.getElementById('benchSlots');
    if (!container) return;

    state.benchSlots = Array.from({ length: CONFIG.MAX_BENCH }, (_, i) => ({
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

        if (oldValue !== rounded) {
            const change = rounded > oldValue ? 'gestiegen' : 'gesunken';
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

function updateBenchCount() {
    const benchPlayers = state.benchSlots.filter(slot => slot.player);
    const countElement = document.getElementById('benchCount');
    if (countElement) {
        countElement.textContent = `(${benchPlayers.length}/${CONFIG.MAX_BENCH})`;
    }
}

// =====================================================
// VALIDATION - ✅ FIX: Auto-Open bei Fehlern
// =====================================================

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

    const hasErrors = messages.filter(m => m.type === 'error').length > 0;
    const isValid = !hasErrors;

    if (validationTitle) {
        validationTitle.textContent = isValid ? 'Aufstellung gültig' : 'Aufstellung ungültig';
    }

    validationPanel.classList.toggle('valid', isValid);
    validationPanel.classList.toggle('invalid', !isValid);

    // ✅ FIX: Bei Fehlern automatisch öffnen
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

// =====================================================
// PLAYER PLACEMENT & UNDO
// =====================================================

function placePlayer(player, slotType, slotIndex, skipUndo = false) {
    // ✅ FIX: iOS AudioContext aktivieren bei User-Interaktion
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

function removePlayerFromLineup(playerId) {
    let oldPosition = null;

    state.fieldSlots.forEach((slot, index) => {
        if (slot.player && slot.player.id === playerId) {
            oldPosition = { type: 'field', index };
            slot.player = null;
            renderSlot('field', index);
        }
    });

    state.benchSlots.forEach((slot, index) => {
        if (slot.player && slot.player.id === playerId) {
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

function removePlayerWithAnimation(playerId) {
    // ✅ FIX: iOS AudioContext aktivieren
    resumeAudioContext();

    // ✅ FIX: O(1) Lookup statt O(n)
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

function showUndoToast(message, undoCallback) {
    // Entferne existierende Toasts
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
    // ✅ FIX: iOS AudioContext aktivieren
    resumeAudioContext();

    const card = e.target.closest('.player-card');
    if (!card) return;

    const playerId = parseInt(card.dataset.playerId);
    // ✅ FIX: O(1) Lookup
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
        const positionName = POSITION_NAMES[position] || position;
        // ✅ FIX: XSS-sichere Ausgabe
        slot.setAttribute('data-error-hint',
            `${escapeHtml(state.selectedPlayer.main_position)} kann nicht ${escapeHtml(positionName)} spielen`);
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
    // ✅ FIX: iOS AudioContext aktivieren bei Touch
    resumeAudioContext();

    const card = e.target.closest('.player-card');
    if (!card || card.classList.contains('unavailable')) return;

    if (e.target.closest('.quick-remove-btn')) return;

    const playerId = parseInt(card.dataset.playerId);
    // ✅ FIX: O(1) Lookup
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
            const positionName = POSITION_NAMES[position] || position;
            slot.setAttribute('data-error-hint',
                `${escapeHtml(state.draggedPlayer.main_position)} kann nicht ${escapeHtml(positionName)} spielen`);
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

    // ✅ FIX: Visuelles Feedback bei Abbruch
    announceToScreenReader('Ziehen abgebrochen');
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

// ✅ FIX: Race-Condition-Schutz
async function handleFormationChange(e) {
    const newFormation = e.target.value;

    // Early return bei gleicher Formation
    if (newFormation === state.currentFormation) return;

    // ✅ FIX: Race-Condition verhindern
    if (state.isFormationChanging) {
        e.target.value = state.currentFormation; // Reset dropdown
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

    // ✅ FIX: State SOFORT setzen um Doppelklicks zu verhindern
    state.isFormationChanging = true;
    setLoadingState(e.target, true);

    try {
        const oldPlayers = state.fieldSlots.map(s => ({
            player: s.player,
            originalPosition: s.position
        })).filter(s => s.player);

        // Backup für Undo
        const oldFormation = state.currentFormation;
        const oldFieldSlots = state.fieldSlots.map(s => ({ ...s }));
        const oldBenchSlots = state.benchSlots.map(s => ({ ...s }));

        state.currentFormation = newFormation;
        renderFormationSlots();

        let migratedCount = 0;
        let toBenchCount = 0;
        const movedToBench = [];

        oldPlayers.forEach(({ player, originalPosition }) => {
            let targetSlot = state.fieldSlots.findIndex(s =>
                !s.player && s.position === originalPosition
            );

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
                const emptyBench = state.benchSlots.findIndex(s => !s.player);
                if (emptyBench !== -1) {
                    state.benchSlots[emptyBench].player = player;
                    renderSlot('bench', emptyBench);
                    toBenchCount++;
                    movedToBench.push(player.name);
                }
            }
        });

        updatePlacedPlayersSet();
        renderAvailablePlayers();
        updateTeamStrength();
        updateBenchCount();
        validateLineup();
        attachSlotEventListeners();

        let message = `${newFormation}: ${migratedCount} Spieler übernommen`;
        if (toBenchCount > 0) {
            message += `, ${toBenchCount} auf Bank`;
        }
        showToast(message, 'success');
        announceToScreenReader(message);

        // ✅ FIX: Undo für Formationswechsel
        if (toBenchCount > 0) {
            showUndoToast(`${movedToBench.join(', ')} auf Bank verschoben`, () => {
                // Restore old state
                state.currentFormation = oldFormation;
                document.getElementById('formationSelect').value = oldFormation;
                state.fieldSlots = oldFieldSlots;
                state.benchSlots = oldBenchSlots;

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
        }

    } finally {
        state.isFormationChanging = false;
        setLoadingState(e.target, false);
    }
}

function clearLineup() {
    // Backup für Undo
    const oldFieldSlots = state.fieldSlots.map(s => ({ ...s }));
    const oldBenchSlots = state.benchSlots.map(s => ({ ...s }));
    const hadPlayers = state.fieldSlots.some(s => s.player) ||
        state.benchSlots.some(s => s.player);

    if (!hadPlayers) {
        showToast('Aufstellung ist bereits leer', 'info');
        return;
    }

    // ✅ FIX: Confirm-Dialog entfernt, stattdessen Undo
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

    // ✅ FIX: Undo für Reset
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

// ✅ FIX: Erweiterte Schema-Validierung
function validateLineupSchema(lineup) {
    if (!lineup || typeof lineup !== 'object') return false;
    if (typeof lineup.formation !== 'string') return false;
    if (!Array.isArray(lineup.field) || !Array.isArray(lineup.bench)) return false;
    if (lineup.field.length !== CONFIG.MAX_PLAYERS) return false;
    if (lineup.bench.length !== CONFIG.MAX_BENCH) return false;

    // ✅ FIX: Prüfen ob Formation existiert
    if (!config.formations[lineup.formation]) return false;

    // ✅ FIX: Prüfen auf doppelte IDs
    const allIds = [...lineup.field, ...lineup.bench].filter(id => id !== null);
    const uniqueIds = new Set(allIds);
    if (allIds.length !== uniqueIds.size) return false;

    // ✅ FIX: Prüfen ob alle IDs valide Spieler sind
    for (const id of allIds) {
        if (!state.getPlayerById(id)) return false;
    }

    return true;
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
                // ✅ FIX: O(1) Lookup
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

// ✅ FIX: Verbesserte Slot-Event-Listener-Verwaltung
function attachSlotEventListeners() {
    document.querySelectorAll('.field-slot, .bench-slot').forEach(slot => {
        // Entferne alte Listener für dieses Element
        removeElementListeners(slot);

        // Füge neue Listener hinzu
        addTrackedEventListener(slot, 'dragenter', handleDragEnter, false);
        addTrackedEventListener(slot, 'dragover', handleDragOver, false);
        addTrackedEventListener(slot, 'dragleave', handleDragLeave, false);
        addTrackedEventListener(slot, 'drop', handleDrop, false);
        addTrackedEventListener(slot, 'keydown', handleSlotKeyboard, false);
    });
}

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
        addTrackedEventListener(formationSelect, 'change', handleFormationChange);
    }

    const clearBtn = document.getElementById('clearLineup');
    const saveBtn = document.getElementById('saveLineup');

    if (clearBtn) addTrackedEventListener(clearBtn, 'click', clearLineup);
    if (saveBtn) addTrackedEventListener(saveBtn, 'click', saveLineup);

    const validationHeader = document.getElementById('validationHeader');
    const validationPanel = document.getElementById('validationPanel');
    const validationToggle = document.getElementById('validationToggle');

    if (validationHeader && validationPanel) {
        addTrackedEventListener(validationHeader, 'click', () => {
            const isCollapsed = validationPanel.classList.toggle('collapsed');
            validationToggle.setAttribute('aria-expanded', !isCollapsed);
            validationPanel.querySelector('.validation-content')
                .setAttribute('aria-hidden', isCollapsed);
            toggleValidationPanel(isCollapsed);
        });

        addTrackedEventListener(validationHeader, 'keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                validationHeader.click();
            }
        });

        // Default: Collapsed on mobile, aber öffnet bei Fehlern automatisch
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
        addTrackedEventListener(searchInput, 'input', debouncedSearch);
    }
    if (positionFilter) {
        addTrackedEventListener(positionFilter, 'change', renderAvailablePlayers);
    }
    if (sortSelect) {
        addTrackedEventListener(sortSelect, 'change', renderAvailablePlayers);
    }

    addTrackedEventListener(document, 'dragstart', (e) => {
        if (e.target.closest('.player-card')) {
            handleDragStart(e);
        }
    });

    addTrackedEventListener(document, 'dragend', (e) => {
        if (e.target.closest('.player-card')) {
            handleDragEnd(e);
        }
    });

    if (isTouchDevice) {
        addTrackedEventListener(document, 'touchstart', (e) => {
            if (e.target.closest('.player-card')) {
                handleTouchStart(e);
            }
        }, { passive: false });

        addTrackedEventListener(document, 'touchmove', handleTouchMoveRAF, { passive: false });
        addTrackedEventListener(document, 'touchend', handleTouchEnd);
        addTrackedEventListener(document, 'touchcancel', handleTouchCancel);
    }

    addTrackedEventListener(document, 'click', (e) => {
        const removeBtn = e.target.closest('.quick-remove-btn');
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const playerId = parseInt(removeBtn.dataset.playerId);
            removePlayerWithAnimation(playerId);
        }
    });

    addTrackedEventListener(document, 'mousedown', (e) => {
        if (e.target.closest('.quick-remove-btn')) {
            e.stopPropagation();
        }
    });

    addTrackedEventListener(document, 'touchstart', (e) => {
        if (e.target.closest('.quick-remove-btn')) {
            e.stopPropagation();
        }
    }, { passive: false });

    addTrackedEventListener(window, 'orientationchange', handleOrientationChange);
    addTrackedEventListener(window, 'resize', handleOrientationChange);

    attachSlotEventListeners();
}

// =====================================================
// MODULE LIFECYCLE
// =====================================================

export function init() {
    debug('🚀 Lineup System wird initialisiert...');

    initAudioContext();
    state.availablePlayers = [...config.examplePlayers];

    // ✅ FIX: Player Map für O(1) Lookups aufbauen
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

    // ✅ FIX: Landscape-Hint mit Dismiss-Funktion initialisieren
    initLandscapeHint();

    debug('✅ Lineup System vollständig initialisiert');
    announceToScreenReader('Aufstellungs-Seite geladen', 'polite');
}

export function cleanup() {
    debug('🧹 Lineup System Cleanup wird durchgeführt...');

    // ✅ FIX: Verbesserte Cleanup-Logik
    removeAllGlobalListeners();

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
        state.audioContext.close().catch(() => {});
        state.audioContext = null;
        state.audioContextResumed = false;
    }

    compatibilityCache.clear();
    lastAnnouncement = 0;

    // Entferne dynamisch erstellte Toasts
    document.querySelectorAll('.toast-undo').forEach(t => t.remove());

    debug('✅ Lineup System Cleanup abgeschlossen');
}