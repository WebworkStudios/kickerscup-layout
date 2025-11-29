// =====================================================
// KICKERSCUP - LINEUP SYSTEM (ESM) - AKTUALISIERT
// RESTAURIERT: Touch-Steuerung, Audio- & Toast-Feedback
// =====================================================

import { LineupConfig } from './lineup-config.js';

// State Management
let currentFormation = '4-4-2';
let fieldSlots = [];
let benchSlots = [];
let placedPlayerIds = new Set();
let availablePlayers = [];
let draggedPlayerId = null; // ID des aktuell gezogenen Spielers
let selectedPlayer = null; // KORREKTUR VOM VORHERIGEN FEHLER
const eventListeners = [];

// *** RESTAURIERT: Touch, Scroll, Audio State ***
let isTouchDevice = false; 

// Touch-Drag State
let touchStartPos = null;
let ghostElement = null;
let draggedPlayer = null;
let isDragging = false;
let lastTouchMoveTime = 0;
const TOUCH_MOVE_THROTTLE = 16;
let touchDragStartTime = 0;

// Auto-Scroll State
let scrollIndicatorElement = null;
let isScrolling = false;
const SCROLL_THRESHOLD = 80; // Pixel von oben/unten, um Scrollen auszulösen
const BASE_SCROLL_SPEED = 5;
const MAX_SCROLL_SPEED = 30;

// Audio Context
let audioContext = null;
let currentDragOverSlot = null;
// *** ENDE RESTAURIERT ***

// Constants (copied from old logic/config structure for internal use)
const config = LineupConfig;
// KRITISCHE KORREKTUR: Verwende Standardwerte, falls validation in der config fehlt
const validation = LineupConfig.validation || {
    maxBenchPlayers: 9, 
    startingEleven: 11
};


/**
 * Helper: Event Listener registrieren
 */
const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;
    element.addEventListener(event, handler, options);
    eventListeners.push({ element, event, handler, options });
};

/**
 * Helper: Findet einen Spieler anhand der ID
 */
const getPlayerById = (playerId) => {
    return availablePlayers.find(p => p.id === playerId);
};

/**
 * Initialize Field Slots based on formation
 */
const initializeFieldSlots = () => {
    const formation = config.formations[currentFormation];
    fieldSlots = formation.positions.map(pos => ({
        position: pos.position,
        x: pos.x,
        y: pos.y,
        player: null
    }));
};

/**
 * Initialize Bench Slots
 */
const initializeBenchSlots = () => {
    // KORREKTUR: Verwendet die nun sicher initialisierte validation Konstante
    benchSlots = Array(validation.maxBenchPlayers).fill(null).map(() => ({ player: null }));
};


// ----------------------------------------------------------------------------------
// RENDER FUNKTIONEN
// ----------------------------------------------------------------------------------

/**
 * Render Player Card (Shared Helper)
 */
const renderPlayerCard = (player, compact = false) => {
    if (!player) return '';

    const positionAbbrev = player.main_position;
    const strength = player.strength;
    const isUnavailable = player.status !== 'fit';
    const classes = isUnavailable ? 'unavailable' : '';
    const draggable = !isUnavailable;

    let content;
    if (compact) {
        // Field Card (compact)
        content = `
            <div class="card-strength">${strength}</div>
            <div class="card-name">${player.name}</div>
        `;
    } else {
        // Squad Card (full)
        content = `
            <div class="card-left">
                <div class="card-strength-full">${strength}</div>
                <div class="card-position">${positionAbbrev}</div>
            </div>
            <div class="card-right">
                <div class="card-name">${player.name}</div>
                <div class="card-info">
                    <span class="info-item">Alter: ${player.age}</span>
                    <span class="info-item">Form: ${player.form}%</span>
                    <span class="info-item status-${player.status}">Status: ${player.status}</span>
                </div>
            </div>
        `;
    }

    return `
        <div class="player-card ${compact ? 'field-card-compact' : 'squad-card'} ${classes}"
             data-player-id="${player.id}"
             data-position="${positionAbbrev}"
             draggable="${draggable}"
             data-draggable="${draggable}">
            ${content}
        </div>
    `;
};


/**
 * Render Formation Slots on Field
 */
const renderFormationSlots = () => {
    const field = document.getElementById('fieldSlots');
    if (!field) return;

    field.innerHTML = fieldSlots.map((slot, index) => {
        const playerCard = slot.player ? renderPlayerCard(slot.player, true) : '';
        // KORRIGIERT: Verwende LineupConfig.positionLabels
        const positionName = config.positionLabels[slot.position];

        return `
            <div class="field-slot"
                 data-slot-type="field"
                 data-index="${index}"
                 data-position="${slot.position}"
                 style="left: ${slot.x}%; top: ${slot.y}%;">
                ${playerCard}
                ${!slot.player ? `<div class="slot-placeholder">?</div>` : ''}
                <div class="slot-position" title="${positionName}">${slot.position}</div>
            </div>
        `;
    }).join('');
};

/**
 * Render Bench Slots
 */
const renderBenchSlots = () => {
    const bench = document.getElementById('benchSlots');
    const benchCountEl = document.getElementById('benchCount');
    if (!bench) return;

    bench.innerHTML = benchSlots.map((slot, index) => {
        const playerCard = slot.player ? renderPlayerCard(slot.player, false) : '';
        const isEmpty = !slot.player;

        return `
            <div class="bench-slot ${isEmpty ? 'empty' : ''}"
                 data-slot-type="bench"
                 data-index="${index}"
                 data-position="Bank"
                 draggable="false">
                ${playerCard}
                ${isEmpty ? `<div class="slot-placeholder">+</div>` : ''}
            </div>
        `;
    }).join('');

    const currentCount = benchSlots.filter(s => s.player).length;
    if (benchCountEl) {
         // Verwendet die nun sicher initialisierte validation Konstante
         benchCountEl.textContent = `(${currentCount}/${validation.maxBenchPlayers})`; 
    }
};

/**
 * Render Available Players
 */
const renderAvailablePlayers = () => {
    const list = document.getElementById('availablePlayersList');
    if (!list) return;

    // Filter, Sort, and Map players not currently placed
    const unplacedPlayers = availablePlayers
        .filter(p => !placedPlayerIds.has(p.id));

    list.innerHTML = unplacedPlayers.map(p => renderPlayerCard(p, false)).join('');
};

// ----------------------------------------------------------------------------------
// STATE & LOGIC FUNKTIONEN
// ----------------------------------------------------------------------------------

/**
 * Calculates compatibility score
 */
const getCompatibilityScore = (player, slotPosition) => {
    const playerMainPos = player.main_position;
    const targetComp = config.positionCompatibility[playerMainPos];

    if (!targetComp) return 0;
    
    // Check for status penalties
    let baseScore = targetComp[slotPosition] || 0;
    
    if (player.status === 'injured') {
        baseScore *= 0.5; // Major penalty
    } else if (player.status === 'banned') {
        baseScore = 0; // Cannot play
    } else if (player.freshness < 50) {
        baseScore *= 0.8; // Minor penalty
    }

    return Math.max(0, baseScore);
};

/**
 * Can player play this position?
 */
const canPlayPosition = (player, slotPosition) => {
    const score = getCompatibilityScore(player, slotPosition);
    return score > 0;
};

/**
 * Places player in a slot (Field or Bench)
 */
const placePlayerInSlot = (playerId, slotType, index) => {
    const player = getPlayerById(playerId);
    if (!player) return false;

    // 1. Check if slot is occupied
    const targetSlots = slotType === 'field' ? fieldSlots : benchSlots;
    if (targetSlots[index].player) {
        // If occupied, swap players if it's a field slot or show error for bench
        if (slotType === 'field') {
            const swappedPlayerId = targetSlots[index].player.id;
            
            // Move swapped player to bench (first available slot)
            const firstEmptyBenchSlotIndex = benchSlots.findIndex(s => !s.player);
            if (firstEmptyBenchSlotIndex !== -1) {
                benchSlots[firstEmptyBenchSlotIndex].player = getPlayerById(swappedPlayerId);
                // The newly placed player (playerId) is replacing the swapped player (swappedPlayerId)
                placedPlayerIds.delete(swappedPlayerId); // Will be added back in the bench check
                
                showToast(`${player.name} ersetzt ${targetSlots[index].player.name}.`, 'info');
            } else {
                // Bench full, put swapped player back in available list
                showToast('Bank ist voll! Platzieren Sie den Spieler zuerst auf der Bank.', 'error');
                return false;
            }
        } else {
             // Bench swap is not allowed in this simple implementation, only placing from available list.
             // If a player is already there, it's an error.
             showToast('Bankplatz ist bereits belegt.', 'error');
             return false;
        }
    }
    
    // 2. Place the new player
    targetSlots[index].player = player;
    placedPlayerIds.add(playerId);

    // 3. Update UI
    updateAndRenderAll();
    saveLineup(); 

    return true;
};

/**
 * Removes a player from a slot (Field or Bench) and moves them to available list
 */
const removePlayerFromSlots = (playerId) => {
    let removedPlayer = null;

    // Search Field Slots
    const fieldIndex = fieldSlots.findIndex(s => s.player && s.player.id === playerId);
    if (fieldIndex !== -1) {
        removedPlayer = fieldSlots[fieldIndex].player;
        fieldSlots[fieldIndex].player = null;
    }

    // Search Bench Slots
    const benchIndex = benchSlots.findIndex(s => s.player && s.player.id === playerId);
    if (benchIndex !== -1) {
        removedPlayer = benchSlots[benchIndex].player;
        benchSlots[benchIndex].player = null;
    }

    if (removedPlayer) {
        placedPlayerIds.delete(playerId);
        updateAndRenderAll();
        playRemoveSound(); 
    }

    return removedPlayer;
};


/**
 * Handle Player Card Click (Tapping on card in Field or Bench)
 */
const handlePlayerCardClick = (playerId) => {
    const playerCard = document.querySelector(`.player-card[data-player-id="${playerId}"]`);
    if (!playerCard) return;

    const player = getPlayerById(playerId);
    if (!player) return;

    // Check if player is unavailable
    if (player.status !== 'fit') {
        showToast(`${player.name} ist ${player.status === 'injured' ? 'verletzt 🤕' : 'gesperrt 🚫'} und kann nicht spielen.`, 'error');
        playErrorSound();
        return;
    }

    // Toggle Selection
    if (selectedPlayer === playerId) {
        // Deselect
        selectedPlayer = null;
        playerCard.classList.remove('selected');
        document.querySelectorAll('.player-card.selected').forEach(card => card.classList.remove('selected'));
        // Hide selection-mode hints if any
        document.body.classList.remove('selection-mode');
        // If it was already on the field/bench, remove it
        removePlayerFromSlots(playerId); 
        showToast(`${player.name} entfernt.`, 'info');
    } else {
        // Select new player
        document.querySelectorAll('.player-card.selected').forEach(card => card.classList.remove('selected'));
        selectedPlayer = playerId;
        playerCard.classList.add('selected');
        document.body.classList.add('selection-mode');
        
        // If player is already placed, remove him first (so he appears in the available list)
        removePlayerFromSlots(playerId); 
        showToast(`${player.name} ausgewählt. Tippe auf eine Position zum Platzieren.`, 'info');
    }

    updateAndRenderAll();
};

/**
 * Handle Slot Click (Tapping on empty slot in Field or Bench)
 */
const handleSlotClick = (e) => {
    if (selectedPlayer === null) return;

    const targetSlot = e.target.closest('.field-slot, .bench-slot');
    if (!targetSlot) return;

    const slotType = targetSlot.dataset.slotType;
    const index = parseInt(targetSlot.dataset.index);
    const position = targetSlot.dataset.position;

    const playerToDrop = getPlayerById(selectedPlayer);
    if (!playerToDrop) return;
    
    // Position check
    const canDrop = slotType === 'field' ? canPlayPosition(playerToDrop, position) : true;
    
    if (!canDrop) {
        showToast('Position nicht optimal oder Spieler ist gesperrt/verletzt!', 'error'); 
        playErrorSound();
        return;
    }

    // Place the player
    placePlayerInSlot(selectedPlayer, slotType, index);
    
    showToast(`${playerToDrop.name} auf ${position || 'Bank'} platziert!`, 'success'); 
    playSuccessSound(); 
    
    // Deselect player after placing
    selectedPlayer = null;
    document.querySelectorAll('.player-card.selected').forEach(card => card.classList.remove('selected'));
    document.body.classList.remove('selection-mode');
};

/**
 * Sets up delegation listeners for drag events (Desktop only)
 */
const setupDragAndDropDelegationListeners = () => {
    // Delegation Container IDs
    const containers = [
        'availablePlayersList', 
        'lineupField', 
        'benchSlots'
    ];
    
    const dragStartHandler = (e) => {
        if (isTouchDevice) {
            e.preventDefault(); 
            return;
        }
        
        const card = e.target.closest('.player-card, .field-card-compact');
        if (card && card.dataset.draggable === 'true') {
            const playerId = card.dataset.playerId;
            draggedPlayerId = parseInt(playerId);
            e.dataTransfer.setData('text/plain', playerId);
            e.dataTransfer.effectAllowed = 'move';
            
            // Temporarily remove player from its current slot
            removePlayerFromSlots(draggedPlayerId);
        } else {
             e.preventDefault(); 
        }
    };

    const dragOverHandler = (e) => {
        const targetSlot = e.target.closest('.field-slot, .bench-slot');
        if (!targetSlot) {
            e.preventDefault();
            return;
        }
        
        const playerId = parseInt(e.dataTransfer.getData('text/plain'));
        const player = getPlayerById(playerId);
        if (!player) {
            e.preventDefault();
            return;
        }

        const slotType = targetSlot.dataset.slotType;
        const position = targetSlot.dataset.position;
        const canDrop = slotType === 'field' ? canPlayPosition(player, position) : true;

        if (canDrop) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            // Visual feedback: drag-over class
            document.querySelectorAll('.field-slot.drag-over, .bench-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
            targetSlot.classList.add('drag-over');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    };
    
    const dragLeaveHandler = (e) => {
        const targetSlot = e.target.closest('.field-slot, .bench-slot');
        if (targetSlot) {
            targetSlot.classList.remove('drag-over');
        }
    };


    const dropHandler = (e) => {
        e.preventDefault();

        const targetSlot = e.target.closest('.field-slot, .bench-slot');
        if (!targetSlot) {
            updateAndRenderAll(); // Redraw to restore drag source if dropped outside
            return;
        }

        const slotType = targetSlot.dataset.slotType;
        const index = parseInt(targetSlot.dataset.index);
        const playerId = parseInt(e.dataTransfer.getData('text/plain'));
        
        if (isNaN(playerId)) return;
        
        const playerToDrop = getPlayerById(playerId);
        if (!playerToDrop) return;
        
        // Position check
        const position = targetSlot.dataset.position;
        const canDrop = slotType === 'field' ? canPlayPosition(playerToDrop, position) : true;
        
        // Cleanup Drag-Over
        document.querySelectorAll('.field-slot.drag-over, .bench-slot.drag-over').forEach(el => el.classList.remove('drag-over'));

        if (!canDrop) {
            showToast('Position nicht optimal oder Spieler ist gesperrt/verletzt!', 'error'); 
            playErrorSound(); 
            updateAndRenderAll();
            return;
        }

        // Platziere den Spieler
        placePlayerInSlot(playerToDrop.id, slotType, index);
        
        showToast(`${playerToDrop.name} auf ${position || 'Bank'} platziert!`, 'success'); 
        playSuccessSound(); 
    };
    
    const dragEndHandler = () => {
        draggedPlayerId = null;
        // Stellt sicher, dass der Drag-Over-Zustand entfernt wird
        document.querySelectorAll('.field-slot.drag-over, .bench-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
        // Stellt sicher, dass alle nicht platzierten Spieler wieder sichtbar sind (falls Drag abgebrochen wurde)
        updateAndRenderAll();
    };

    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            // Drag delegation on all player cards inside these containers
            addEventListener(container, 'dragstart', dragStartHandler);
            
            // Drop delegation on the field/bench slots inside these containers
            if (id === 'lineupField' || id === 'benchSlots') {
                 addEventListener(container, 'dragover', dragOverHandler);
                 addEventListener(container, 'dragleave', dragLeaveHandler);
                 addEventListener(container, 'drop', dropHandler);
            }
        }
    });
    
    // Global drag end
    addEventListener(document, 'dragend', dragEndHandler);
};

// ----------------------------------------------------------------------------------
// RESTAURIERT: AUDIO & TOAST FUNKTIONEN
// ----------------------------------------------------------------------------------

/**
 * Initialize Audio Context
 */
function initAudioContext() {
    if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
        // Starte den Kontext nur bei einer Nutzerinteraktion (wird in init() gemacht)
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

// ----------------------------------------------------------------------------------
// RESTAURIERT: TOUCH DRAG & DROP FUNKTIONEN (MOBILE)
// ----------------------------------------------------------------------------------

/**
 * Helper: Findet das Slot-Element an einer bestimmten Koordinate (wichtig für Touch)
 */
const getRelevantTargetSlot = (x, y) => {
    if (ghostElement) {
        ghostElement.style.pointerEvents = 'none';
    }
    const element = document.elementFromPoint(x, y);
    if (ghostElement) {
        ghostElement.style.pointerEvents = '';
    }
    return element?.closest('.field-slot, .bench-slot');
};

/**
 * Erstellt das Ghost-Element (Kopie der Spielerkarte) für den Touch-Drag
 */
const createGhost = (card) => {
    if (ghostElement) removeGhost();

    ghostElement = card.cloneNode(true);
    ghostElement.classList.add('dragging-ghost');
    ghostElement.style.position = 'fixed';
    ghostElement.style.pointerEvents = 'none';
    ghostElement.style.zIndex = '10000';
    document.body.appendChild(ghostElement);

    ghostElement.style.width = `${card.offsetWidth}px`;
    ghostElement.style.height = `${card.offsetHeight}px`;
    
    // Initial position to avoid flicker
    const rect = card.getBoundingClientRect();
    updateGhostPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
};

/**
 * Aktualisiert die Position des Ghost-Elements
 */
const updateGhostPosition = (x, y) => {
    if (ghostElement) {
        const halfWidth = ghostElement.offsetWidth / 2;
        const halfHeight = ghostElement.offsetHeight / 2;

        ghostElement.style.left = `${x - halfWidth}px`;
        ghostElement.style.top = `${y - halfHeight}px`;

        ghostElement.style.transform = 'scale(1.05) rotate(1deg)';
    }
};

/**
 * Entfernt das Ghost-Element
 */
const removeGhost = () => {
    if (ghostElement) {
        ghostElement.classList.add('fade-out-drop');
        ghostElement.style.transform = 'scale(0.8) rotate(-5deg)';
        ghostElement.style.opacity = '0';

        setTimeout(() => {
            if (ghostElement && ghostElement.parentNode) {
                ghostElement.parentNode.removeChild(ghostElement);
            }
            ghostElement = null;
        }, 250);
    }
    draggedPlayer = null;
};


/**
 * Show Scroll Indicator
 */
function showScrollIndicator(direction) {
    if (!scrollIndicatorElement) {
        scrollIndicatorElement = document.createElement('div');
        scrollIndicatorElement.className = 'scroll-indicator';
        document.body.appendChild(scrollIndicatorElement);
    }

    isScrolling = true;
    scrollIndicatorElement.className = `scroll-indicator active ${direction}`;
    scrollIndicatorElement.innerHTML = direction === 'up'
        ? '<span class="scroll-arrow">↑</span><span class="scroll-text">Scrolle nach oben</span>'
        : '<span class="scroll-arrow">↓</span><span class="scroll-text">Scrolle nach unten</span>';
}

/**
 * Hide Scroll Indicator
 */
function hideScrollIndicator() {
    if (scrollIndicatorElement && isScrolling) {
        scrollIndicatorElement.classList.remove('active');
        isScrolling = false;
    }
}

/**
 * Überprüft die Position des Fingers und löst ggf. Auto-Scrolling aus (während Touch-Move)
 */
const checkAndDoScroll = (clientY) => {
    const viewportHeight = window.innerHeight;
    const scrollUpThreshold = SCROLL_THRESHOLD;
    const scrollDownThreshold = viewportHeight - SCROLL_THRESHOLD;

    const baseScrollSpeed = BASE_SCROLL_SPEED;
    const maxScrollSpeed = MAX_SCROLL_SPEED;

    // SCROLL DOWN
    if (clientY > scrollDownThreshold) {
        const intensity = Math.min(1, (clientY - scrollDownThreshold) / SCROLL_THRESHOLD);
        const speed = Math.ceil(baseScrollSpeed + (maxScrollSpeed - baseScrollSpeed) * intensity);
        window.scrollBy({ top: speed, behavior: 'auto' });
        showScrollIndicator('down');
    }
    // SCROLL UP
    else if (clientY < scrollUpThreshold) {
        const intensity = Math.min(1, (scrollUpThreshold - clientY) / SCROLL_THRESHOLD);
        const speed = Math.ceil(baseScrollSpeed + (maxScrollSpeed - baseScrollSpeed) * intensity) * -1;
        window.scrollBy({ top: speed, behavior: 'auto' });
        showScrollIndicator('up');
    }
    // STOP SCROLL
    else {
        hideScrollIndicator();
    }
};

/**
 * TOUCH START: Startet den Drag-Vorgang auf Touch-Geräten
 */
const handleTouchStart = (e) => {
    if (e.touches.length !== 1) {
        return;
    }

    const card = e.target.closest('.player-card, .field-card-compact');
    if (!card || card.classList.contains('unavailable')) {
        return;
    }

    const playerId = parseInt(card.dataset.playerId);
    draggedPlayer = getPlayerById(playerId);

    if (!draggedPlayer) return;

    touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDragStartTime = Date.now();
    isDragging = false; 
    draggedPlayerId = playerId;

    // Remove player visually from its slot for a clean drag start. 
    // We update the render only at the end for performance.
    const removedPlayer = removePlayerFromSlots(playerId); 
    if (removedPlayer) {
        // Redraw immediately to reflect the empty slot
        updateAndRenderAll();
    }
    
    // Verzögerung, um Klicks von Drag zu unterscheiden
    // If no drag occurs within 250ms, treat it as a click/tap
    setTimeout(() => {
        if (draggedPlayer && !isDragging && Date.now() - touchDragStartTime < 250) {
            handlePlayerCardClick(playerId);
        }
    }, 250);

    // Globaler Listener für Drag und Drop
    addEventListener(document, 'touchmove', handleTouchMove, { passive: false });
    addEventListener(document, 'touchend', handleTouchEnd);
};

/**
 * TOUCH MOVE: Bewegt das Ghost-Element und löst Auto-Scrolling aus
 */
const handleTouchMove = (e) => {
    if (!draggedPlayer) return;

    if (e.touches.length !== 1) {
        handleTouchEnd(); 
        return;
    }

    const now = Date.now();
    if (now - lastTouchMoveTime < TOUCH_MOVE_THROTTLE) {
        return; 
    }
    lastTouchMoveTime = now;

    const touch = e.touches[0];
    const { clientX, clientY } = touch;

    // 1. Start Drag, wenn die Bewegung signifikant ist
    if (!isDragging) {
        const dx = clientX - touchStartPos.x;
        const dy = clientY - touchStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 10) { // 10 Pixel Toleranz
            isDragging = true;
            // The card is now in the availablePlayersList after removePlayerFromSlots and updateAndRenderAll in touchStart.
            const cardElement = document.querySelector(`.player-card.squad-card[data-player-id="${draggedPlayerId}"]`) ||
                                document.querySelector(`.player-card.field-card-compact[data-player-id="${draggedPlayerId}"]`);

            if (cardElement) {
                 createGhost(cardElement);
            }
            
            // Remove selection if player was in selection mode
            selectedPlayer = null;
            document.body.classList.remove('selection-mode');
        } else {
            return; 
        }
    }

    // Beim Drag: NATIVES SCROLLEN VERHINDERN
    e.preventDefault();

    // 2. Ghost Position aktualisieren
    updateGhostPosition(clientX, clientY);

    // 3. Auto-Scrolling prüfen
    checkAndDoScroll(clientY);

    // 4. Slot-Erkennung (Highlighting)
    const newTargetSlot = getRelevantTargetSlot(clientX, clientY);

    if (currentDragOverSlot && currentDragOverSlot !== newTargetSlot) {
        currentDragOverSlot.classList.remove('drag-over');
        currentDragOverSlot = null;
    }

    if (newTargetSlot) {
        const slotType = newTargetSlot.dataset.slotType;
        const position = newTargetSlot.dataset.position;
        let canDrop = false;

        if (slotType === 'field') {
            canDrop = canPlayPosition(draggedPlayer, position);
        } else {
            canDrop = true; // Bench always allows drop if space is available (checked in handleDrop/placePlayerInSlot)
        }

        if (canDrop) {
            if (currentDragOverSlot !== newTargetSlot) {
                newTargetSlot.classList.add('drag-over');
                currentDragOverSlot = newTargetSlot;
            }
        } else {
            newTargetSlot.classList.remove('drag-over');
            currentDragOverSlot = null;
        }
    } else {
        currentDragOverSlot = null;
    }
};

/**
 * TOUCH END: Beendet den Drag-Vorgang und führt den Drop aus
 */
const handleTouchEnd = () => {
    if (!draggedPlayer) return;

    hideScrollIndicator();
    
    // 1. If a drag operation was in progress
    if (isDragging) {
        if (currentDragOverSlot) {
            // Simulate Drop operation
            const slotType = currentDragOverSlot.dataset.slotType;
            const index = parseInt(currentDragOverSlot.dataset.index);
            const position = currentDragOverSlot.dataset.position;
            
            const canDrop = slotType === 'field' ? canPlayPosition(draggedPlayer, position) : true;
            
            // Cleanup Drag-Over
            currentDragOverSlot.classList.remove('drag-over');
            currentDragOverSlot = null;

            if (canDrop) {
                // Platziere den Spieler
                placePlayerInSlot(draggedPlayerId, slotType, index);
                showToast(`${draggedPlayer.name} auf ${position || 'Bank'} platziert!`, 'success'); 
                playSuccessSound(); 
            } else {
                // Invalid drop position after drag
                showToast('Position nicht optimal!', 'error'); 
                playErrorSound();
                updateAndRenderAll(); // Redraws the unplaced player in the available list
            }
        } else {
            // Drop outside a valid slot
            showToast('Spieler nicht platziert. Drag abgebrochen.', 'info');
            playErrorSound();
            updateAndRenderAll(); // Stellt sicher, dass die Ansicht aktuell ist (Spieler ist in der Available List)
        }
    } else if (Date.now() - touchDragStartTime < 250) {
        // 2. Kurzer Tap/Click (wird im Timeout in handleTouchStart behandelt)
    }
    
    // Ghost muss immer entfernt werden, falls er erstellt wurde
    removeGhost(); 

    // Aufräumen des Drag-State
    draggedPlayer = null;
    draggedPlayerId = null;
    isDragging = false;
    touchStartPos = null;

    // Event Listener entfernen
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
};


// ----------------------------------------------------------------------------------
// UI/Validation/Persistence
// ----------------------------------------------------------------------------------

/**
 * Calculates Team Strength
 */
const calculateTeamStrength = () => {
    const totalStrength = fieldSlots.reduce((sum, slot) => {
        if (slot.player) {
            const score = getCompatibilityScore(slot.player, slot.position);
            // Stärke des Spielers * Kompatibilitätsscore
            return sum + (slot.player.strength * score); 
        }
        return sum;
    }, 0);
    
    // Max strength calculation for normalization (einfache Summe der besten 11, mit 1.0 Comp)
    // For simplicity, we just return the raw score for now.
    return Math.round(totalStrength * 10) / 10;
};

/**
 * Update Team Strength Display
 */
const updateTeamStrength = () => {
    const strength = calculateTeamStrength();
    const strengthEl = document.getElementById('teamStrength');
    if (strengthEl) {
        strengthEl.textContent = strength.toFixed(1);
    }
};

/**
 * Validate Lineup
 */
const validateLineup = () => {
    const fieldPlayers = fieldSlots.filter(s => s.player).length;
    const benchPlayers = benchSlots.filter(s => s.player).length;
    
    const messages = [];

    // Rule 1: Correct number of starting players
    if (fieldPlayers !== validation.startingEleven) {
        messages.push(`Es müssen genau ${validation.startingEleven} Spieler auf dem Feld stehen. (Aktuell: ${fieldPlayers})`);
    }

    // Rule 2: No Goalkeeper on field? Add message.
    const hasGoalkeeper = fieldSlots.some(s => s.position === 'TW' && s.player);
    if (fieldSlots.length > 0 && !hasGoalkeeper) {
         messages.push('Es fehlt ein Torwart (TW) auf dem Feld.');
    }
    
    // Rule 3: Check all field players for good compatibility
    fieldSlots.forEach(slot => {
        if (slot.player) {
            const score = getCompatibilityScore(slot.player, slot.position);
            if (score < 0.8) {
                messages.push(`${slot.player.name} (${slot.player.main_position}) hat eine schlechte Kompatibilität (${(score * 100).toFixed(0)}%) auf Position ${slot.position}.`);
            }
        }
    });
    
    // Rule 4: Check for injured/banned players accidentally placed
    fieldSlots.forEach(slot => {
        if (slot.player && slot.player.status !== 'fit') {
            messages.push(`${slot.player.name} ist ${slot.player.status === 'injured' ? 'verletzt' : 'gesperrt'} und darf nicht spielen!`);
        }
    });
    
    // Update UI
    const panel = document.getElementById('validationPanel');
    const header = document.getElementById('validationHeader');
    const title = document.querySelector('#validationHeader .validation-title');
    const icon = document.querySelector('#validationHeader .validation-icon');
    const list = document.getElementById('validationList');
    
    if (messages.length > 0) {
        panel.classList.add('invalid');
        panel.classList.remove('valid');
        title.textContent = `${messages.length} Fehler gefunden`;
        icon.textContent = '❌';
        list.innerHTML = messages.map(msg => `<li>${msg}</li>`).join('');
    } else {
        panel.classList.remove('invalid');
        panel.classList.add('valid');
        title.textContent = 'Aufstellung gültig';
        icon.textContent = '✓';
        list.innerHTML = '<li>Die Aufstellung ist gültig und spielbereit.</li>';
    }
};

/**
 * Update placedPlayerIds set based on current slots
 */
const updatePlacedPlayersSet = () => {
    placedPlayerIds.clear();
    fieldSlots.forEach(s => {
        if (s.player) placedPlayerIds.add(s.player.id);
    });
    benchSlots.forEach(s => {
        if (s.player) placedPlayerIds.add(s.player.id);
    });
};

/**
 * Main update and render function
 */
const updateAndRenderAll = () => {
    // 1. Update State
    updatePlacedPlayersSet();

    // 2. Render
    renderFormationSlots();
    renderBenchSlots();
    renderAvailablePlayers();

    // 3. Post-Render Updates
    updateTeamStrength();
    validateLineup();
};


/**
 * Change Formation
 */
const changeFormation = (newFormation) => {
    if (currentFormation === newFormation) return;
    
    // Move all current field players to the bench/available list
    const playersToMove = fieldSlots.map(s => s.player).filter(p => p);
    
    // Clear field slots
    fieldSlots = [];
    
    // Try to move all players to bench first
    let currentBenchIndex = benchSlots.findIndex(s => !s.player);
    for (const player of playersToMove) {
        if (currentBenchIndex !== -1 && currentBenchIndex < benchSlots.length) {
            benchSlots[currentBenchIndex].player = player;
            currentBenchIndex++;
        }
        // If bench is full, the player is automatically in the available list
    }
    
    // Update current formation
    currentFormation = newFormation;
    initializeFieldSlots();
    
    showToast(`Formation auf ${newFormation} geändert. Spieler auf die Bank verschoben.`, 'info');
    
    updateAndRenderAll();
};


/**
 * Persistence (Save/Load)
 */
const saveLineup = () => {
    const lineupData = {
        formation: currentFormation,
        fieldSlots: fieldSlots.map(s => ({
            position: s.position,
            playerId: s.player ? s.player.id : null
        })),
        benchSlots: benchSlots.map(s => (s.player ? s.player.id : null))
    };

    try {
        localStorage.setItem('kickerscupLineup', JSON.stringify(lineupData));
        showToast('Aufstellung erfolgreich gespeichert!', 'success');
    } catch (e) {
        showToast('Fehler beim Speichern der Aufstellung.', 'error');
    }
};

const loadLineup = () => {
    try {
        const storedData = localStorage.getItem('kickerscupLineup');
        if (!storedData) return false;

        const data = JSON.parse(storedData);
        
        // 1. Load Formation
        currentFormation = data.formation || '4-4-2';
        document.getElementById('formationSelect').value = currentFormation;
        initializeFieldSlots(); // Recreates empty field slots for the new formation

        // 2. Place Field Players
        if (data.fieldSlots && data.fieldSlots.length === fieldSlots.length) {
            data.fieldSlots.forEach((savedSlot, index) => {
                if (savedSlot.playerId !== null) {
                    const player = getPlayerById(savedSlot.playerId);
                    if (player) {
                        fieldSlots[index].player = player;
                    }
                }
            });
        }
        
        // 3. Place Bench Players
        initializeBenchSlots(); // Recreates empty bench slots
        if (data.benchSlots) {
             data.benchSlots.forEach((playerId, index) => {
                if (playerId !== null && index < benchSlots.length) {
                    const player = getPlayerById(playerId);
                    if (player) {
                        benchSlots[index].player = player;
                    }
                }
            });
        }
        
        updateAndRenderAll();
        showToast('Gespeicherte Aufstellung geladen.', 'info');
        return true;

    } catch (e) {
        console.error('Fehler beim Laden der Aufstellung:', e);
        return false;
    }
};

/**
 * Reset Lineup
 */
const clearLineup = () => {
    // Clear all slots
    initializeFieldSlots();
    initializeBenchSlots();
    
    // Clear saved data
    localStorage.removeItem('kickerscupLineup');
    
    showToast('Aufstellung zurückgesetzt.', 'info');
    
    updateAndRenderAll();
};

/**
 * Handle initial event listeners (Button/Selects)
 */
const initEventListeners = () => {
    const formationSelect = document.getElementById('formationSelect');
    if (formationSelect) {
        addEventListener(formationSelect, 'change', (e) => {
            changeFormation(e.target.value);
        });
    }

    const saveBtn = document.getElementById('saveLineupBtn');
    if (saveBtn) {
        addEventListener(saveBtn, 'click', saveLineup);
    }
    
    const clearBtn = document.getElementById('clearLineup');
    if (clearBtn) {
        addEventListener(clearBtn, 'click', clearLineup);
    }
    
    // Validation Panel Toggle
    const validationToggle = document.getElementById('validationToggle');
    if (validationToggle) {
        addEventListener(validationToggle, 'click', () => {
            document.getElementById('validationPanel').classList.toggle('expanded');
        });
    }

    // Click/Tap handling (Field/Bench Slots) for selection mode
    const fieldContainer = document.getElementById('fieldSlots');
    const benchContainer = document.getElementById('benchSlots');
    if (fieldContainer) {
        addEventListener(fieldContainer, 'click', handleSlotClick);
    }
    if (benchContainer) {
        addEventListener(benchContainer, 'click', handleSlotClick);
    }
    
    // Click/Tap handling (Player Cards) - delegated to containers
    const containers = [
        document.getElementById('availablePlayersList'),
        document.getElementById('fieldSlots'),
        document.getElementById('benchSlots')
    ];
    
    containers.forEach(container => {
        if (container) {
            addEventListener(container, 'click', (e) => {
                const card = e.target.closest('.player-card, .field-card-compact');
                if (card) {
                    // Prevent click/tap handling if a drag just occurred (handled in touchEnd)
                    if (isTouchDevice && isDragging) return;
                    
                    const playerId = parseInt(card.dataset.playerId);
                    handlePlayerCardClick(playerId);
                }
            });
        }
    });

    // 2. Drag & Drop handlers (Desktop)
    setupDragAndDropDelegationListeners();
    
    // 3. Touch Listeners für Karten (Delegierung)
    if (isTouchDevice) {
        const globalContainers = [
             document.getElementById('availablePlayersList'),
             document.getElementById('fieldSlots'), 
             document.getElementById('benchSlots')
        ];

        // Globaler Touchstart-Listener für alle Karten/Slots
        globalContainers.forEach(container => {
            if (container) {
                addEventListener(container, 'touchstart', (e) => {
                    const card = e.target.closest('.player-card, .field-card-compact');
                    if (card) {
                        handleTouchStart(e);
                    }
                }, { passive: false });
            }
        });
        
        // Touch-Anweisungen zeigen
        const instructions = document.getElementById('touchInstructions');
        if (instructions) {
             instructions.classList.add('active');
        }
    }
};


/**
 * Initialize Lineup System
 * EXPORT für ModuleManager
 */
export function init() {
    // 1. Init
    initAudioContext(); 
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0; // Touch-Erkennung
    
    // Load players from config (Using examplePlayers now)
    availablePlayers = [...config.mockPlayers];

    // Initialize slots
    initializeFieldSlots();
    initializeBenchSlots();

    // Try to load saved lineup
    const loaded = loadLineup();

    // Render initial view / update state if nothing was loaded
    if (!loaded) {
        updateAndRenderAll();
    }

    // Event Listeners (Must run after initial render/load)
    initEventListeners();
}

/**
 * Cleanup beim Verlassen
 * EXPORT für ModuleManager
 */
export function cleanup() {
    // Event Listeners entfernen
    eventListeners.forEach(({ element, event, handler, options }) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners.length = 0;

    // Cleanup für Touch/Audio/Ghost
    removeGhost();
    hideScrollIndicator();

    if (scrollIndicatorElement && scrollIndicatorElement.parentNode) {
        scrollIndicatorElement.parentNode.removeChild(scrollIndicatorElement);
        scrollIndicatorElement = null;
    }

    if (audioContext) {
        // audioContext.close(); // Optional, depending on application lifecycle
        // audioContext = null;
    }
    
    // Touch/Drag/Select State zurücksetzen
    isDragging = false;
    draggedPlayer = null;
    touchStartPos = null;
    selectedPlayer = null; 

    // Reset state variables
    fieldSlots = [];
    benchSlots = [];
    placedPlayerIds.clear();
    availablePlayers = [];
    draggedPlayerId = null; 
}