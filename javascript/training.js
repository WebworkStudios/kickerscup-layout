// =====================================================
// KICKERSCUP - TRAINING SYSTEM (ESM) - ES2025 MODERNIZED
// Mannschaftstraining + Einzeltraining Integration
//
// Features:
// - ES2022 Error Causes
// - ES2020 Optional Chaining & Nullish Coalescing
// - AbortController for Event Management
// - Structured Error Handling
// - Immutable Operations
// =====================================================

// =====================================================
// ERROR CLASSES
// =====================================================

/**
 * Base error class for training-related errors
 */
class TrainingError extends Error {
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'TrainingError';
    }
}

/**
 * Storage operation errors with context
 */
class StorageError extends TrainingError {
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'StorageError';
    }
}

/**
 * Configuration errors
 */
class ConfigError extends TrainingError {
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'ConfigError';
    }
}

// =====================================================
// STATE MANAGEMENT
// =====================================================

let selectedTrainings = [null, null, null, null];
let individualAssignments = new Map();
let activeSlot = null;
let currentFilter = 'all';
let abortController = null;

// =====================================================
// CONFIGURATION & DATA
// =====================================================

const trainingCategories = {
    kondition: {
        name: 'Kondition',
        icon: '🏃',
        color: '#48bb78',
        options: [
            {
                id: 'brutale_kondition',
                name: 'Brutale Kondition',
                effect: '+4 Kondition, -3 Frische',
                impacts: {kondition: 4, form: -1, frische: -3, motivation: 0}
            },
            {
                id: 'harte_kondition',
                name: 'harte Kondition',
                effect: '+3 Kondition, -2 Frische',
                impacts: {kondition: 3, form: -1, frische: -2, motivation: 0}
            },
            {
                id: 'zirkeltraining',
                name: 'Zirkeltraining',
                effect: '+3 Kondition, -2 Frische',
                impacts: {kondition: 3, form: 0, frische: -2, motivation: 0}
            },
            {
                id: 'waldlauf',
                name: 'Waldlauf',
                effect: '+2 Kondition, -1 Frische, +1 Motivation',
                impacts: {kondition: 2, form: 0, frische: -1, motivation: 1}
            },
            {
                id: 'zweikampf',
                name: 'Zweikampf',
                effect: '+2 Kondition, +1 Form, -2 Frische',
                impacts: {kondition: 2, form: 1, frische: -2, motivation: 0}
            },
            {
                id: 'leichte_kondition',
                name: 'leichte Kondition',
                effect: '+1 Kondition',
                impacts: {kondition: 1, form: 0, frische: 0, motivation: 0}
            },
        ]
    },
    technik: {
        name: 'Technik',
        icon: '⚽',
        color: '#ed8936',
        options: [
            {
                id: 'balltechnik',
                name: 'Balltechnik',
                effect: '+2 Form, +3 Frische, -3 Kondition',
                impacts: {kondition: -3, form: 2, frische: 3, motivation: 0}
            },
            {
                id: 'torschuss',
                name: 'Torschuss',
                effect: '+1 Frische, -1 Kondition',
                impacts: {kondition: -1, form: 0, frische: 1, motivation: 0}
            },
            {
                id: 'standardsituationen',
                name: 'Standardsituationen',
                effect: '+1 Form',
                impacts: {kondition: 0, form: 1, frische: 0, motivation: 0}
            },
        ]
    },
    taktik: {
        name: 'Taktik',
        icon: '🧠',
        color: '#4299e1',
        options: [
            {
                id: 'trainingsspiel',
                name: 'Trainingsspiel',
                effect: '+1 Kondition, +1 Form, -1 Frische',
                impacts: {kondition: 1, form: 1, frische: -1, motivation: 0}
            },
            {
                id: 'viererkette',
                name: 'Viererkette',
                effect: '+1 Form, +1 Frische, -1 Kondition',
                impacts: {kondition: -1, form: 1, frische: 1, motivation: 0}
            },
        ]
    },
    regeneration: {
        name: 'Erholung',
        icon: '😴',
        color: '#38b2ac',
        options: [
            {
                id: 'regeneration',
                name: 'Regeneration',
                effect: '+4 Frische, -2 Kondition',
                impacts: {kondition: -2, form: 0, frische: 4, motivation: 0}
            },
            {
                id: 'spritzigkeit',
                name: 'Spritzigkeit',
                effect: '+3 Frische, +1 Kondition',
                impacts: {kondition: 1, form: 0, frische: 3, motivation: 0}
            },
            {
                id: 'freizeit',
                name: 'Freizeit',
                effect: '+1 Frische, +1 Motivation, -2 Kondition',
                impacts: {kondition: -2, form: 0, frische: 1, motivation: 1}
            },
        ]
    }
};

// FALLBACK: Spielerdaten direkt hier definieren, falls Config nicht geladen wurde
const DEFAULT_PLAYERS = [
    {id: 1, name: 'Max Müller', position: 'ST', strength: 85, kondition: 78, form: 7, frische: 92, motivation: 8},
    {id: 2, name: 'Tim Schmidt', position: 'ZOM', strength: 79, kondition: 82, form: 6, frische: 88, motivation: 7},
    {id: 3, name: 'Lukas Weber', position: 'IV', strength: 81, kondition: 75, form: 8, frische: 95, motivation: 9},
    {id: 4, name: 'Felix Braun', position: 'TW', strength: 77, kondition: 80, form: 5, frische: 90, motivation: 6},
    {id: 5, name: 'Jonas Fischer', position: 'LM', strength: 76, kondition: 85, form: 7, frische: 85, motivation: 8},
    {id: 6, name: 'David Hoffmann', position: 'RM', strength: 74, kondition: 79, form: 6, frische: 91, motivation: 7},
    {id: 7, name: 'Paul Wagner', position: 'ZDM', strength: 80, kondition: 77, form: 8, frische: 87, motivation: 8},
    {id: 8, name: 'Leon Becker', position: 'LV', strength: 73, kondition: 83, form: 5, frische: 93, motivation: 6},
    {id: 9, name: 'Finn Schulz', position: 'RV', strength: 72, kondition: 81, form: 6, frische: 89, motivation: 7},
    {id: 10, name: 'Elias Koch', position: 'MS', strength: 83, kondition: 76, form: 9, frische: 82, motivation: 9},
    {id: 11, name: 'Noah Richter', position: 'IV', strength: 78, kondition: 84, form: 7, frische: 94, motivation: 8},
    {id: 12, name: 'Ben Klein', position: 'ZOM', strength: 75, kondition: 78, form: 6, frische: 88, motivation: 7}
];

// FALLBACK: Positionskategorien direkt hier definieren
const DEFAULT_POSITION_CATEGORIES = {
    TW: ['TW'],
    DEF: ['LV', 'IV', 'RV'],
    MIT: ['LM', 'ZDM', 'ZOM', 'RM'],
    STU: ['LS', 'MS', 'RS', 'ST']
};

// Verwende externe Config falls vorhanden, sonst Fallback
const players = typeof SAMPLE_PLAYERS !== 'undefined' ? SAMPLE_PLAYERS : DEFAULT_PLAYERS;
const POSITION_CATS = typeof POSITION_CATEGORIES !== 'undefined' ? POSITION_CATEGORIES : DEFAULT_POSITION_CATEGORIES;

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Finds training by ID across all categories
 * @param {string} trainingId - The training ID to find
 * @returns {Object|null} Training object with category metadata or null
 */
const findTrainingById = (trainingId) => {
    const categories = Object.values(trainingCategories);

    for (const category of categories) {
        const option = category.options.find(opt => opt.id === trainingId);
        if (option) {
            return {
                ...option,
                color: category.color,
                icon: category.icon,
                categoryName: category.name
            };
        }
    }

    console.warn(`Training mit ID ${trainingId} nicht gefunden`);
    return null;
};

/**
 * Formats impact value with sign
 * @param {number} value - The impact value
 * @returns {string} Formatted impact string
 */
const formatImpact = (value) => {
    if (value > 0) return `+${value}`;
    if (value < 0) return `${value}`;
    return '0';
};

// =====================================================
// MANNSCHAFTSTRAINING (TEAM TRAINING)
// =====================================================

/**
 * Selects training for a specific day
 * @param {string} trainingId - The training ID
 * @param {number} dayIndex - Day index (0-3)
 */
const selectTrainingForDay = (trainingId, dayIndex) => {
    const training = findTrainingById(trainingId);

    if (!training) {
        showToast('Training nicht gefunden', 'error');
        return;
    }

    if (dayIndex < 0 || dayIndex >= selectedTrainings.length) {
        showToast('Ungültiger Tag', 'error');
        return;
    }

    selectedTrainings[dayIndex] = training;
    renderTimeline();
    renderTotalImpact();

    showToast(`${training.name} zu Tag ${dayIndex + 1} hinzugefügt`, 'success');
};

/**
 * Removes training from a specific day
 * @param {number} dayIndex - Day index (0-3)
 */
const removeTraining = (dayIndex) => {
    if (dayIndex < 0 || dayIndex >= selectedTrainings.length) {
        return;
    }

    const training = selectedTrainings[dayIndex];
    if (!training) return;

    selectedTrainings[dayIndex] = null;
    renderTimeline();
    renderTotalImpact();

    showToast(`${training.name} entfernt`, 'info');
};

/**
 * Renders training cards in the selection area
 */
const renderTrainingCards = () => {
    const container = document.getElementById('trainingCardsGrid');
    if (!container) {
        console.warn('trainingCardsGrid nicht gefunden');
        return;
    }

    let html = '';

    Object.entries(trainingCategories).forEach(([key, category]) => {
        // Category divider
        html += `<h3 class="category-divider">${category.icon} ${category.name}</h3>`;

        // Training cards
        category.options.forEach(option => {
            html += `
                <div class="training-card" data-training-id="${option.id}"
                     style="--card-color: ${category.color}; --slot-color: ${category.color}; --card-glow: ${category.color}40;">
                    <div class="card-icon">${category.icon}</div>
                    <h4 class="card-title">${option.name}</h4>
                    <p class="card-subtitle">${option.effect}</p>
                    <p class="card-subtitle category-name">${category.name}</p>
                </div>
            `;
        });
    });

    container.innerHTML = html;
    console.log('TrainingCards gerendert:', Object.keys(trainingCategories).length, 'Kategorien');
};

/**
 * Renders the timeline with selected trainings
 */
const renderTimeline = () => {
    const timeline = document.getElementById('timelineSlots');
    if (!timeline) {
        console.warn('timelineSlots nicht gefunden');
        return;
    }

    const slots = [
        {day: '1. Einheit', index: 0},
        {day: '2. Einheit', index: 1},
        {day: '3. Einheit', index: 2},
        {day: '4. Einheit', index: 3}
    ];

    let html = '';

    slots.forEach((slot) => {
        const training = selectedTrainings[slot.index] ? findTrainingById(selectedTrainings[slot.index].id) : null;
        const colorStyle = training ? `style="--slot-color: ${training.color};"` : '';
        const filledClass = training ? 'filled' : '';

        html += `
            <div class="timeline-slot" ${colorStyle}>
                <div class="slot-time">${slot.day}</div>
                <div class="slot-card-container ${filledClass}">
                    ${training ? `
                        <div class="slot-filled-card">
                            <div class="slot-card-icon">${training.icon}</div>
                            <div class="slot-card-info">
                                <div class="slot-card-title">${training.name}</div>
                                <div class="slot-card-subtitle">${training.categoryName}</div>
                            </div>
                            <button class="slot-card-remove" data-day="${slot.index}" title="Entfernen">×</button>
                        </div>
                    ` : `
                        <div class="slot-empty-card">
                            <span class="slot-empty-text">Einheit wählen</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    });

    timeline.innerHTML = html;

    // Update save button state
    updateSaveButtonState();

    console.log('Timeline gerendert');
};

/**
 * Updates save button enabled/disabled state
 */
const updateSaveButtonState = () => {
    const saveBtn = document.getElementById('saveBtn');
    if (!saveBtn) return;

    const filledSlots = selectedTrainings.filter(t => t !== null).length;
    saveBtn.disabled = filledSlots === 0;
};

/**
 * Renders total impact summary
 */
const renderTotalImpact = () => {
    const container = document.getElementById('totalImpactSummary');
    if (!container) {
        console.warn('totalImpactSummary nicht gefunden');
        return;
    }

    const total = {
        kondition: 0,
        form: 0,
        frische: 0,
        motivation: 0
    };

    selectedTrainings.forEach(training => {
        if (training && training.impacts) {
            total.kondition += training.impacts.kondition ?? 0;
            total.form += training.impacts.form ?? 0;
            total.frische += training.impacts.frische ?? 0;
            total.motivation += training.impacts.motivation ?? 0;
        }
    });

    container.innerHTML = `
        <h4 class="total-impact-title">📊 Gesamtbilanz</h4>
        <div class="impact-grid">
            <div class="impact-item">
                <span class="impact-label">Kondition</span>
                <span class="impact-value impact-${total.kondition > 0 ? 'pos' : total.kondition < 0 ? 'neg' : 'zero'}">${formatImpact(total.kondition)}</span>
            </div>
            <div class="impact-item">
                <span class="impact-label">Form</span>
                <span class="impact-value impact-${total.form > 0 ? 'pos' : total.form < 0 ? 'neg' : 'zero'}">${formatImpact(total.form)}</span>
            </div>
            <div class="impact-item">
                <span class="impact-label">Frische</span>
                <span class="impact-value impact-${total.frische > 0 ? 'pos' : total.frische < 0 ? 'neg' : 'zero'}">${formatImpact(total.frische)}</span>
            </div>
            <div class="impact-item">
                <span class="impact-label">Motivation</span>
                <span class="impact-value impact-${total.motivation > 0 ? 'pos' : total.motivation < 0 ? 'neg' : 'zero'}">${formatImpact(total.motivation)}</span>
            </div>
        </div>
    `;

    console.log('TotalImpact gerendert');
};

/**
 * Confirms and saves team training plan
 */
const confirmTrainingPlan = () => {
    const filledSlots = selectedTrainings.filter(t => t !== null).length;

    if (filledSlots === 0) {
        showToast('Bitte mindestens ein Training hinzufügen', 'warning');
        return;
    }

    try {
        const plan = {
            selectedTrainings: selectedTrainings.map(t => t?.id ?? null),
            totalImpact: {
                kondition: 0,
                form: 0,
                frische: 0,
                motivation: 0
            }
        };

        selectedTrainings.forEach(training => {
            if (training?.impacts) {
                Object.keys(plan.totalImpact).forEach(key => {
                    plan.totalImpact[key] += training.impacts[key] ?? 0;
                });
            }
        });

        console.log('Trainingsplan bestätigt:', plan);
        showToast(`✅ Trainingsplan gespeichert! ${filledSlots} Tage geplant.`, 'success');

    } catch (error) {
        const saveError = new TrainingError('Fehler beim Speichern des Trainingsplans', {
            cause: error
        });
        console.error('Training Plan Error:', saveError);
        showToast('❌ Fehler beim Speichern', 'error');
    }
};

/**
 * Resets team training plan
 */
const resetTrainingPlan = () => {
    if (selectedTrainings.every(t => t === null)) return;

    if (confirm('Trainingsplan zurücksetzen?')) {
        selectedTrainings = [null, null, null, null];
        renderTimeline();
        renderTotalImpact();
        showToast('Trainingsplan zurückgesetzt', 'info');
    }
};

// =====================================================
// EINZELTRAINING (INDIVIDUAL TRAINING)
// =====================================================

/**
 * Initializes individual training system
 */
const initIndividualTraining = () => {
    const panel = document.getElementById('individual-training-panel');
    if (!panel) {
        console.warn('individual-training-panel nicht gefunden');
        return;
    }

    console.log('Einzeltraining initialisiert - Spieler verfügbar:', players.length);

    loadIndividualFromStorage();
    updateIndividualUI();
    updateNextExecution();
};

/**
 * Opens player selection modal
 * @param {number} slotId - Slot ID (0-3)
 */
const openPlayerModal = (slotId) => {
    activeSlot = slotId;
    currentFilter = 'all';

    // Reset filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });

    renderPlayerList();

    const modal = document.getElementById('player-select-modal');
    if (!modal) return;

    modal.classList.add('active');
    modal.style.display = 'flex';

    const searchInput = document.getElementById('player-search-input');
    if (searchInput) {
        searchInput.value = '';
        setTimeout(() => searchInput.focus(), 100);
    }
};

/**
 * Opens training selection modal
 * @param {number} slotId - Slot ID (0-3)
 */
const openTrainingModal = (slotId) => {
    const assignment = individualAssignments.get(slotId);
    if (!assignment) return;

    activeSlot = slotId;

    const playerNameSpan = document.getElementById('it-modal-player-name');
    if (playerNameSpan) {
        playerNameSpan.textContent = assignment.player.name;
    }

    renderIndividualTrainingGrid(assignment.training?.id);

    const modal = document.getElementById('it-training-select-modal');
    if (!modal) return;

    modal.classList.add('active');
    modal.style.display = 'flex';
};

/**
 * Closes all modals
 */
const closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });

    activeSlot = null;
    currentFilter = 'all';
};

/**
 * Renders player list in modal
 */
const renderPlayerList = () => {
    const container = document.getElementById('player-list');
    if (!container) {
        console.error('Container #player-list nicht gefunden');
        return;
    }

    const assignedPlayerIds = new Set(
        Array.from(individualAssignments.values()).map(a => a.player.id)
    );

    const html = players.map(player => {
        const isAssigned = assignedPlayerIds.has(player.id);
        const disabledClass = isAssigned ? 'disabled' : '';
        const title = isAssigned ? 'title="Bereits im Training"' : '';

        return `
            <div class="player-list-item ${disabledClass}" 
                 data-player-id="${player.id}" 
                 data-position="${player.position}"
                 ${title}>
                <div class="player-avatar">
                    <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23333' width='100' height='100'/><text x='50' y='55' text-anchor='middle' fill='%23888' font-size='40'>👤</text></svg>" 
                         alt="${player.name}" class="avatar-img">
                </div>
                <span class="player-name">${player.name}</span>
                <span class="player-position">${player.position}</span>
                <span class="player-strength">${player.strength}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Add event listeners to non-disabled items
    const playerItems = container.querySelectorAll('.player-list-item:not(.disabled)');
    playerItems.forEach(item => {
        item.addEventListener('click', () => {
            const playerId = parseInt(item.dataset.playerId, 10);
            selectPlayer(playerId);
        });
    });

    console.log('Player list gerendert:', players.length, 'Spieler');
};

/**
 * Renders individual training grid
 * @param {number|null} selectedTrainingId - Currently selected training ID
 */
const renderIndividualTrainingGrid = (selectedTrainingId = null) => {
    const container = document.getElementById('it-training-grid');
    if (!container || typeof INDIVIDUAL_TRAINING_CONFIG === 'undefined') {
        console.warn('Training-Grid oder Config nicht gefunden');
        return;
    }

    const trainings = INDIVIDUAL_TRAINING_CONFIG.helpers.getAllTrainings();

    const html = trainings.map(training => {
        const selectedClass = training.id === selectedTrainingId ? 'selected' : '';
        const effectsHtml = INDIVIDUAL_TRAINING_CONFIG.helpers.renderEffectBadges(training.effects, true);

        return `
            <div class="it-training-tile ${selectedClass}" 
                 data-training-id="${training.id}"
                 title="${training.description}">
                <span class="it-training-tile-icon">${training.icon}</span>
                <span class="it-training-tile-name">${training.name}</span>
                <div class="it-training-tile-effects">${effectsHtml}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Add event listeners
    container.querySelectorAll('.it-training-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const trainingId = parseInt(tile.dataset.trainingId, 10);
            selectIndividualTraining(trainingId);
        });
    });
};

/**
 * Selects player for training slot
 * @param {number} playerId - Player ID
 */
const selectPlayer = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player || activeSlot === null) return;

    // Check if player is already assigned
    for (const [, assignment] of individualAssignments) {
        if (assignment.player.id === playerId) {
            showToast('Spieler bereits im Training', 'warning');
            return;
        }
    }

    individualAssignments.set(activeSlot, {player, training: null});
    closeModals();
    updateIndividualUI();
    saveIndividualToStorage();

    // Open training modal after short delay
    setTimeout(() => openTrainingModal(activeSlot), 350);

    console.log('Spieler ausgewählt:', player.name, 'für Slot', activeSlot);
};

/**
 * Selects training for active slot
 * @param {number} trainingId - Training ID
 */
const selectIndividualTraining = (trainingId) => {
    if (typeof INDIVIDUAL_TRAINING_CONFIG === 'undefined') return;

    const training = INDIVIDUAL_TRAINING_CONFIG.helpers.getTrainingById(trainingId);
    const assignment = individualAssignments.get(activeSlot);

    if (!training || !assignment) return;

    assignment.training = training;
    individualAssignments.set(activeSlot, assignment);

    closeModals();
    updateIndividualUI();
    saveIndividualToStorage();

    showToast(`${training.name} für ${assignment.player.name} ausgewählt`, 'success');
};

/**
 * Removes player from training slot
 * @param {number} slotId - Slot ID
 */
const removeIndividualPlayer = (slotId) => {
    const assignment = individualAssignments.get(slotId);
    if (!assignment) return;

    individualAssignments.delete(slotId);
    updateIndividualUI();
    saveIndividualToStorage();

    showToast(`${assignment.player.name} entfernt`, 'info');
};

/**
 * Updates individual training UI
 */
const updateIndividualUI = () => {
    const slots = document.querySelectorAll('.individual-slot');

    slots.forEach(slot => {
        const slotId = parseInt(slot.dataset.slot, 10);
        const assignment = individualAssignments.get(slotId);

        const emptyState = slot.querySelector('.slot-empty-state');
        const filledState = slot.querySelector('.slot-filled-state');

        if (assignment) {
            slot.classList.add('filled');

            if (emptyState) emptyState.style.display = 'none';

            if (filledState) {
                filledState.style.display = 'flex';

                // Update player info
                const playerName = filledState.querySelector('.player-name');
                const positionBadge = filledState.querySelector('.player-position-badge');
                const statKondition = filledState.querySelector('.stat-kondition');
                const statForm = filledState.querySelector('.stat-form');
                const statFrische = filledState.querySelector('.stat-frische');
                const statMotivation = filledState.querySelector('.stat-motivation');

                if (playerName) playerName.textContent = assignment.player.name;
                if (positionBadge) positionBadge.textContent = assignment.player.position;
                if (statKondition) statKondition.textContent = assignment.player.kondition ?? 0;
                if (statForm) statForm.textContent = assignment.player.form ?? 0;
                if (statFrische) statFrische.textContent = assignment.player.frische ?? 0;
                if (statMotivation) statMotivation.textContent = assignment.player.motivation ?? 0;

                // Update training info
                const trainingSelected = filledState.querySelector('.it-training-selected');
                const trainingIcon = filledState.querySelector('.training-icon');
                const trainingName = filledState.querySelector('.training-name');
                const trainingEffects = filledState.querySelector('.training-effects');

                if (assignment.training) {
                    trainingSelected?.classList.remove('no-training');
                    if (trainingIcon) trainingIcon.textContent = assignment.training.icon;
                    if (trainingName) trainingName.textContent = assignment.training.name;

                    if (trainingEffects && typeof INDIVIDUAL_TRAINING_CONFIG !== 'undefined') {
                        trainingEffects.innerHTML = INDIVIDUAL_TRAINING_CONFIG.helpers.renderEffectBadges(assignment.training.effects);
                    }
                } else {
                    trainingSelected?.classList.add('no-training');
                    if (trainingIcon) trainingIcon.textContent = '❓';
                    if (trainingName) trainingName.textContent = 'Training wählen';
                    if (trainingEffects) trainingEffects.innerHTML = '';
                }
            }
        } else {
            slot.classList.remove('filled');
            if (emptyState) emptyState.style.display = 'flex';
            if (filledState) filledState.style.display = 'none';
        }
    });

    // Update summary
    const playersCount = document.getElementById('it-players-count');
    if (playersCount) {
        playersCount.textContent = `${individualAssignments.size} / 4`;
    }

    const confirmBtn = document.getElementById('btn-confirm-individual');
    if (confirmBtn) {
        const validCount = Array.from(individualAssignments.values())
            .filter(a => a.training)
            .length;
        confirmBtn.disabled = validCount === 0;
    }
};

/**
 * Updates next execution time display
 */
const updateNextExecution = () => {
    const nextExecution = document.getElementById('it-next-execution');
    if (!nextExecution || typeof INDIVIDUAL_TRAINING_CONFIG === 'undefined') return;

    const now = new Date();
    const [hours, minutes] = INDIVIDUAL_TRAINING_CONFIG.settings.executionTime
        .split(':')
        .map(Number);

    const executionToday = new Date(now);
    executionToday.setHours(hours, minutes, 0, 0);

    const isToday = now < executionToday;
    const timeStr = INDIVIDUAL_TRAINING_CONFIG.settings.executionTime;

    nextExecution.textContent = isToday
        ? `Heute, ${timeStr} Uhr`
        : `Morgen, ${timeStr} Uhr`;
};

/**
 * Confirms individual training assignments
 */
const confirmIndividualTraining = () => {
    const validAssignments = Array.from(individualAssignments.values())
        .filter(a => a.training !== null);

    if (validAssignments.length === 0) {
        showToast('Bitte mindestens einen Spieler mit Training zuweisen', 'warning');
        return;
    }

    // Check if all assignments have training
    for (const [, assignment] of individualAssignments) {
        if (!assignment.training) {
            showToast(`${assignment.player.name} hat noch kein Training`, 'warning');
            return;
        }
    }

    const trainingData = validAssignments.map(a => ({
        playerId: a.player.id,
        trainingId: a.training.id
    }));

    console.log('Einzeltraining bestätigt:', trainingData);
    showToast(`Training für ${validAssignments.length} Spieler bestätigt! Ausführung um 12:45 Uhr`, 'success');
};

/**
 * Resets individual training assignments
 */
const resetIndividualTraining = () => {
    if (individualAssignments.size === 0) return;

    if (confirm('Alle Trainingszuweisungen löschen?')) {
        individualAssignments.clear();
        updateIndividualUI();
        saveIndividualToStorage();
        showToast('Training zurückgesetzt', 'info');
    }
};

/**
 * Saves individual training to localStorage with error handling
 * @throws {StorageError} If saving fails
 */
const saveIndividualToStorage = () => {
    if (typeof INDIVIDUAL_TRAINING_CONFIG === 'undefined') {
        console.warn('INDIVIDUAL_TRAINING_CONFIG nicht definiert');
        return;
    }

    try {
        const data = Array.from(individualAssignments.entries()).map(([slotId, assignment]) => ({
            slotId,
            playerId: assignment.player.id,
            trainingId: assignment.training?.id ?? null
        }));

        const jsonData = JSON.stringify(data);
        localStorage.setItem(INDIVIDUAL_TRAINING_CONFIG.settings.storageKey, jsonData);

        console.log('Training-Daten gespeichert:', data.length, 'Zuweisungen');

    } catch (error) {
        const storageError = new StorageError(
            'Training-Daten konnten nicht gespeichert werden',
            {
                cause: error,
                context: {
                    assignmentsCount: individualAssignments.size,
                    storageKey: INDIVIDUAL_TRAINING_CONFIG?.settings?.storageKey
                }
            }
        );

        console.error('Storage Error:', storageError);
        showToast('Speichern fehlgeschlagen. Bitte versuche es erneut.', 'error');

        // Optional: Report to error tracking service
        if (window.errorReporter) {
            window.errorReporter.log(storageError);
        }
    }
};

/**
 * Loads individual training from localStorage with error handling
 * @throws {StorageError} If loading fails
 */
const loadIndividualFromStorage = () => {
    if (typeof INDIVIDUAL_TRAINING_CONFIG === 'undefined') {
        console.warn('INDIVIDUAL_TRAINING_CONFIG nicht definiert');
        return;
    }

    try {
        const saved = localStorage.getItem(INDIVIDUAL_TRAINING_CONFIG.settings.storageKey);
        if (!saved) {
            console.log('Keine gespeicherten Training-Daten gefunden');
            return;
        }

        const data = JSON.parse(saved);

        data.forEach(item => {
            const player = players.find(p => p.id === item.playerId);
            const training = item.trainingId
                ? INDIVIDUAL_TRAINING_CONFIG.helpers.getTrainingById(item.trainingId)
                : null;

            if (player) {
                individualAssignments.set(item.slotId, {player, training});
            } else {
                console.warn(`Spieler mit ID ${item.playerId} nicht gefunden`);
            }
        });

        console.log('Training-Daten geladen:', individualAssignments.size, 'Zuweisungen');

    } catch (error) {
        const storageError = new StorageError(
            'Training-Daten konnten nicht geladen werden',
            {
                cause: error,
                context: {
                    storageKey: INDIVIDUAL_TRAINING_CONFIG?.settings?.storageKey
                }
            }
        );

        console.error('Storage Error:', storageError);
        showToast('Laden fehlgeschlagen. Training wird zurückgesetzt.', 'warning');

        // Clear corrupted data
        individualAssignments.clear();
    }
};

// =====================================================
// FILTER & SEARCH
// =====================================================

/**
 * Filters players by position category
 * @param {string} filter - Position category filter ('all', 'TW', 'DEF', 'MIT', 'STU')
 */
const filterPlayersByPosition = (filter) => {
    currentFilter = filter;
    const items = document.querySelectorAll('.player-list-item');

    console.log('Filter angewendet:', filter);

    items.forEach(item => {
        const position = item.dataset.position ?? '';
        let shouldShow = filter === 'all';

        if (!shouldShow) {
            const positions = POSITION_CATS[filter] ?? [];
            shouldShow = positions.includes(position);
        }

        item.style.display = shouldShow ? '' : 'none';
    });

    // Count visible players
    const visibleCount = Array.from(items)
        .filter(item => item.style.display !== 'none')
        .length;

    console.log('Sichtbare Spieler:', visibleCount);
};

/**
 * Searches players by name or position
 * @param {string} searchTerm - Search term
 */
const searchPlayers = (searchTerm) => {
    const term = searchTerm.toLowerCase().trim();
    const items = document.querySelectorAll('.player-list-item');

    console.log('Suche nach:', term);

    let visibleCount = 0;

    items.forEach(item => {
        const nameElement = item.querySelector('.player-name');
        const name = nameElement?.textContent.toLowerCase() ?? '';
        const position = item.dataset.position ?? '';

        // Combine search with active filter
        const matchesSearch = term === '' ||
            name.includes(term) ||
            position.toLowerCase().includes(term);

        let matchesFilter = true;
        if (currentFilter !== 'all') {
            const positions = POSITION_CATS[currentFilter] ?? [];
            matchesFilter = positions.includes(position);
        }

        if (matchesSearch && matchesFilter) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    console.log('Gefundene Spieler:', visibleCount);
};

// =====================================================
// TAB SYSTEM
// =====================================================

/**
 * Initializes tab navigation system
 */
const initTabs = () => {
    const tabs = document.querySelectorAll('.training-tab');
    const panels = document.querySelectorAll('.tab-panel');

    console.log('Tabs gefunden:', tabs.length, '| Panels gefunden:', panels.length);

    if (tabs.length === 0 || panels.length === 0) {
        console.warn('Tabs oder Panels nicht gefunden!');
        return;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab + '-panel'; // Add -panel suffix

            // Update active states
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');

            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
                console.log('Tab gewechselt zu:', targetId);
            } else {
                console.warn('Panel nicht gefunden:', targetId);
            }
        });
    });

    console.log('Tab-System initialisiert');
};

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type ('success', 'error', 'warning', 'info')
 */
const showToast = (message, type = 'info') => {
    let container = document.getElementById('toast-container');

    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// =====================================================
// EVENT HANDLERS
// =====================================================

/**
 * Handles document-wide click events
 * @param {MouseEvent} e - Click event
 */
const handleDocumentClick = (e) => {
    const target = e.target;

    // Team training: Training card clicked
    if (target.closest('.training-card')) {
        const trainingId = target.closest('.training-card').dataset.trainingId;
        const emptyDayIndex = selectedTrainings.findIndex(t => t === null);

        if (emptyDayIndex !== -1) {
            selectTrainingForDay(trainingId, emptyDayIndex);
        } else {
            showToast('Alle Slots sind belegt. Entferne zuerst eine Einheit.', 'warning');
        }
        return;
    }

    // Team training: Remove training
    if (target.closest('.slot-card-remove')) {
        const dayIndex = parseInt(target.closest('.slot-card-remove').dataset.day, 10);
        removeTraining(dayIndex);
        return;
    }

    // Individual training: Empty slot clicked
    const emptySlot = target.closest('.individual-slot:not(.filled)');
    if (emptySlot) {
        const slotId = parseInt(emptySlot.dataset.slot, 10);
        openPlayerModal(slotId);
        return;
    }

    // Individual training: Change training button
    if (target.closest('.btn-change-training')) {
        e.stopPropagation();
        const slot = target.closest('.individual-slot');
        if (slot) {
            const slotId = parseInt(slot.dataset.slot, 10);
            openTrainingModal(slotId);
        }
        return;
    }

    // Individual training: Remove player button
    if (target.closest('.btn-remove-player')) {
        e.stopPropagation();
        const slot = target.closest('.individual-slot');
        if (slot) {
            const slotId = parseInt(slot.dataset.slot, 10);
            removeIndividualPlayer(slotId);
        }
        return;
    }

    // Individual training: Training selected area clicked
    if (target.closest('.it-training-selected')) {
        e.stopPropagation();
        const slot = target.closest('.individual-slot');
        if (slot) {
            const slotId = parseInt(slot.dataset.slot, 10);
            openTrainingModal(slotId);
        }
        return;
    }

    // Modal close button
    if (target.classList.contains('modal-close')) {
        closeModals();
        return;
    }

    // Modal overlay (click outside)
    if (target.classList.contains('modal-overlay')) {
        closeModals();
        return;
    }

    // Filter buttons
    if (target.closest('.filter-btn')) {
        const btn = target.closest('.filter-btn');
        const filter = btn.dataset.filter;

        console.log('Filter-Button geklickt:', filter);

        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('active');
        });
        btn.classList.add('active');

        // Apply filter
        filterPlayersByPosition(filter);
    }
};

/**
 * Handles keyboard events
 * @param {KeyboardEvent} e - Keyboard event
 */
const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
        closeModals();
    }
};

/**
 * Handles search input
 * @param {InputEvent} e - Input event
 */
const handleSearchInput = (e) => {
    const searchTerm = e.target.value;
    searchPlayers(searchTerm);
};

// =====================================================
// EVENT LISTENER SETUP
// =====================================================

/**
 * Sets up all event listeners using AbortController
 */
const setupEventListeners = () => {
    // Clean up existing listeners
    abortController?.abort();

    // Create new controller
    abortController = new AbortController();
    const {signal} = abortController;

    // Document-wide events
    document.addEventListener('click', handleDocumentClick, {signal});
    document.addEventListener('keydown', handleKeyDown, {signal});

    // Search input
    const searchInput = document.getElementById('player-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput, {signal});
    }

    // Team training buttons
    const btnConfirmPlan = document.getElementById('saveBtn');
    if (btnConfirmPlan) {
        btnConfirmPlan.addEventListener('click', confirmTrainingPlan, {signal});
    }

    // Note: Reset button for team training not present in HTML
    // Individual training has btn-reset-individual

    // Individual training buttons
    const btnConfirmIndividual = document.getElementById('btn-confirm-individual');
    if (btnConfirmIndividual) {
        btnConfirmIndividual.addEventListener('click', confirmIndividualTraining, {signal});
    }

    const btnResetIndividual = document.getElementById('btn-reset-individual');
    if (btnResetIndividual) {
        btnResetIndividual.addEventListener('click', resetIndividualTraining, {signal});
    }

    console.log('Event-Listener initialisiert mit AbortController');
};

// =====================================================
// INITIALIZATION & CLEANUP
// =====================================================

/**
 * Initializes the training module
 * @throws {ConfigError} If required DOM elements are missing
 */
export function init() {
    console.log('Training-Modul wird initialisiert...');
    console.log('Spieler verfügbar:', players.length);

    // Initialize tab system first
    initTabs();

    // Team training
    renderTrainingCards();
    renderTimeline();
    renderTotalImpact();

    // Individual training
    initIndividualTraining();

    // Setup event listeners with AbortController
    setupEventListeners();

    console.log('Training-Modul initialisiert ✓');
}

/**
 * Cleans up the training module
 * Removes event listeners and clears state
 */
export function cleanup() {
    console.log('Training-Modul cleanup wird ausgeführt...');

    // Abort all event listeners
    abortController?.abort();
    abortController = null;

    // Clear state
    selectedTrainings = [null, null, null, null];
    individualAssignments.clear();
    activeSlot = null;
    currentFilter = 'all';

    console.log('Training-Modul cleanup ✓');
}