// =====================================================
// KICKERSCUP - TRAINING SYSTEM (ESM) - ERWEITERT
// Mannschaftstraining + Einzeltraining Integration
// =====================================================

// =====================================================
// MANNSCHAFTSTRAINING (bestehender Code)
// =====================================================

let selectedTrainings = [null, null, null, null];
const eventListeners = [];

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

const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;
    element.addEventListener(event, handler, options);
    eventListeners.push({element, event, handler, options});
};

const findTrainingById = (trainingId) => {
    for (const [catKey, category] of Object.entries(trainingCategories)) {
        const option = category.options.find(opt => opt.id === trainingId);
        if (option) {
            return {...option, color: category.color, icon: category.icon, categoryName: category.name};
        }
    }
    return null;
};

const formatImpact = (value) => {
    if (value > 0) return `+${value}`;
    if (value < 0) return `${value}`;
    return '0';
};

const selectTrainingForDay = (trainingId, dayIndex) => {
    const training = findTrainingById(trainingId);
    if (!training) return;

    selectedTrainings[dayIndex] = {id: trainingId, ...training};
    renderTimeline();
    renderTotalImpact();
    updateSaveButtonState();
};

const removeTraining = (dayIndex) => {
    selectedTrainings[dayIndex] = null;
    renderTimeline();
    renderTotalImpact();
    updateSaveButtonState();
};

const updateSaveButtonState = () => {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        const hasAnyTraining = selectedTrainings.some(t => t !== null);
        saveBtn.disabled = !hasAnyTraining;
    }
};

const renderTotalImpact = () => {
    const container = document.getElementById('totalImpactSummary');
    if (!container) {
        console.warn('totalImpactSummary container nicht gefunden');
        return;
    }

    const total = {kondition: 0, form: 0, frische: 0, motivation: 0};

    selectedTrainings.forEach(training => {
        if (training && training.impacts) {
            total.kondition += training.impacts.kondition;
            total.form += training.impacts.form;
            total.frische += training.impacts.frische;
            total.motivation += training.impacts.motivation;
        }
    });

    container.innerHTML = `
        <h3 class="total-impact-title">📊 Gesamtbilanz</h3>
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

const renderTrainingCards = () => {
    const container = document.getElementById('trainingCardsGrid');
    if (!container) {
        console.warn('trainingCardsGrid container nicht gefunden');
        return;
    }

    let html = '';
    Object.entries(trainingCategories).forEach(([key, category]) => {
        html += `<h3 class="category-divider">${category.icon} ${category.name}</h3>`;
        html += category.options.map(option => `
            <div class="training-card" data-training-id="${option.id}"
                 style="--card-color: ${category.color}; --slot-color: ${category.color}; --card-glow: ${category.color}40;">
                <div class="card-icon">${category.icon}</div>
                <h4 class="card-title">${option.name}</h4>
                <p class="card-subtitle">${option.effect}</p>
                <p class="card-subtitle category-name">${category.name}</p>
            </div>
        `).join('');
    });

    container.innerHTML = html;
    console.log('TrainingCards gerendert:', container.children.length, 'Elemente');
};

const renderTimeline = () => {
    const container = document.getElementById('timelineSlots');
    if (!container) {
        console.warn('timelineSlots container nicht gefunden');
        return;
    }

    const slots = [
        {day: '1. Einheit', index: 0},
        {day: '2. Einheit', index: 1},
        {day: '3. Einheit', index: 2},
        {day: '4. Einheit', index: 3}
    ];

    container.innerHTML = slots.map((slot) => {
        const training = selectedTrainings[slot.index] ? findTrainingById(selectedTrainings[slot.index].id) : null;
        const colorStyle = training ? `style="--slot-color: ${training.color};"` : '';
        const filledClass = training ? 'filled' : '';

        return `
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
    }).join('');

    console.log('Timeline gerendert');
};

const saveTrainingPlan = async () => {
    const plan = {
        trainings: selectedTrainings.filter(t => t !== null).map(t => ({id: t.id, name: t.name})),
        totalImpact: {kondition: 0, form: 0, frische: 0, motivation: 0}
    };

    selectedTrainings.forEach(t => {
        if (t && t.impacts) {
            plan.totalImpact.kondition += t.impacts.kondition;
            plan.totalImpact.form += t.impacts.form;
            plan.totalImpact.frische += t.impacts.frische;
            plan.totalImpact.motivation += t.impacts.motivation;
        }
    });

    try {
        console.log('Trainingsplan gespeichert:', plan);
        showToast(`✅ Trainingsplan gespeichert! Gesamte Auswirkungen: Kondition ${formatImpact(plan.totalImpact.kondition)}, Frische ${formatImpact(plan.totalImpact.frische)}...`, 'success');
    } catch (error) {
        showToast('❌ Fehler beim Speichern', 'error');
    }
};

// =====================================================
// EINZELTRAINING (NEU)
// =====================================================

let individualAssignments = new Map();
let activeSlot = null;

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

// Verwende SAMPLE_PLAYERS falls vorhanden, sonst Fallback
let players = typeof SAMPLE_PLAYERS !== 'undefined' ? SAMPLE_PLAYERS : DEFAULT_PLAYERS;
let currentFilter = 'all';

// FALLBACK: Positionskategorien direkt hier definieren
const DEFAULT_POSITION_CATEGORIES = {
    TW: ['TW'],
    DEF: ['LV', 'IV', 'RV'],
    MIT: ['LM', 'ZDM', 'ZOM', 'RM'],
    STU: ['LS', 'MS', 'RS', 'ST']
};

const POSITION_CATS = typeof POSITION_CATEGORIES !== 'undefined' ? POSITION_CATEGORIES : DEFAULT_POSITION_CATEGORIES;

// DEBUG: Spieler-Initialisierung prüfen
console.log('🔍 DEBUG: SAMPLE_PLAYERS verfügbar?', typeof SAMPLE_PLAYERS !== 'undefined');
console.log('🔍 DEBUG: Anzahl Spieler:', players.length);
if (players.length > 0) {
    console.log('✅ DEBUG: Erste 3 Spieler:', players.slice(0, 3));
    console.log('✅ DEBUG: Verwende', typeof SAMPLE_PLAYERS !== 'undefined' ? 'SAMPLE_PLAYERS' : 'DEFAULT_PLAYERS');
} else {
    console.error('❌ DEBUG: KEINE SPIELER GELADEN! Prüfe ob individual-training-config.js vor training.js geladen wurde.');
}

const initIndividualTraining = () => {
    const panel = document.getElementById('individual-training-panel');
    if (!panel) {
        console.warn('individual-training-panel nicht gefunden');
        return;
    }

    console.log('Einzeltraining initialisiert');
    console.log('🔍 DEBUG in initIndividualTraining: Spieler verfügbar:', players.length);

    // Lade gespeicherte Zuweisungen
    loadIndividualFromStorage();

    // Initial-Rendering
    updateIndividualUI();
    updateNextExecution();
};

const openPlayerModal = (slotId) => {
    console.log('🔍 DEBUG openPlayerModal: Slot', slotId);
    console.log('🔍 DEBUG: Anzahl Spieler beim Modal-Öffnen:', players.length);

    activeSlot = slotId;
    currentFilter = 'all'; // Reset filter

    // Filter-Buttons zurücksetzen
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
        }
    });

    renderPlayerList();

    const modal = document.getElementById('player-select-modal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';

        const searchInput = document.getElementById('player-search-input');
        if (searchInput) {
            searchInput.value = '';
            // Focus nach kurzer Verzögerung für bessere UX
            setTimeout(() => searchInput.focus(), 100);
        }
    }
};

const openTrainingModal = (slotId) => {
    const assignment = individualAssignments.get(slotId);
    if (!assignment) return;

    activeSlot = slotId;
    const playerNameSpan = document.getElementById('it-modal-player-name');
    if (playerNameSpan) playerNameSpan.textContent = assignment.player.name;

    renderIndividualTrainingGrid(assignment.training?.id);

    const modal = document.getElementById('it-training-select-modal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
};

const closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    });
    activeSlot = null;
    currentFilter = 'all';
};

const renderPlayerList = () => {
    const container = document.getElementById('player-list');
    if (!container) {
        console.error('❌ DEBUG renderPlayerList: Container #player-list nicht gefunden!');
        return;
    }

    console.log('🔍 DEBUG renderPlayerList: Container gefunden');
    console.log('🔍 DEBUG renderPlayerList: Spieler-Array:', players);
    console.log('🔍 DEBUG renderPlayerList: Spieler-Anzahl:', players.length);

    const assignedPlayerIds = new Set(
        Array.from(individualAssignments.values()).map(a => a.player.id)
    );

    let html = '';
    players.forEach(player => {
        const isAssigned = assignedPlayerIds.has(player.id);
        const disabledClass = isAssigned ? 'disabled' : '';

        html += `
            <div class="player-list-item ${disabledClass}" 
                 data-player-id="${player.id}" 
                 data-position="${player.position}"
                 ${isAssigned ? 'title="Bereits im Training"' : ''}>
                <div class="player-avatar">
                    <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23333' width='100' height='100'/><text x='50' y='55' text-anchor='middle' fill='%23888' font-size='40'>👤</text></svg>" 
                         alt="${player.name}" class="avatar-img">
                </div>
                <span class="player-name">${player.name}</span>
                <span class="player-position">${player.position}</span>
                <span class="player-strength">${player.strength}</span>
            </div>
        `;
    });

    console.log('🔍 DEBUG renderPlayerList: HTML-Länge:', html.length);
    container.innerHTML = html;
    console.log('🔍 DEBUG renderPlayerList: Container innerHTML gesetzt');

    // Event Listeners für Spieler-Auswahl
    const playerItems = container.querySelectorAll('.player-list-item:not(.disabled)');
    console.log('🔍 DEBUG renderPlayerList: Gefundene Player-Items:', playerItems.length);

    playerItems.forEach(item => {
        item.addEventListener('click', () => {
            const playerId = parseInt(item.dataset.playerId);
            selectPlayer(playerId);
        });
    });

    console.log('✅ Player list gerendert:', players.length, 'Spieler');
};

const renderIndividualTrainingGrid = (selectedTrainingId = null) => {
    const container = document.getElementById('it-training-grid');
    if (!container || typeof INDIVIDUAL_TRAINING_CONFIG === 'undefined') {
        console.warn('Training-Grid oder Config nicht gefunden');
        return;
    }

    const trainings = INDIVIDUAL_TRAINING_CONFIG.helpers.getAllTrainings();
    let html = '';

    trainings.forEach(training => {
        const selectedClass = training.id === selectedTrainingId ? 'selected' : '';
        const effectsHtml = INDIVIDUAL_TRAINING_CONFIG.helpers.renderEffectBadges(training.effects, true);

        html += `
            <div class="it-training-tile ${selectedClass}" 
                 data-training-id="${training.id}"
                 title="${training.description}">
                <span class="it-training-tile-icon">${training.icon}</span>
                <span class="it-training-tile-name">${training.name}</span>
                <div class="it-training-tile-effects">${effectsHtml}</div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Event Listeners für Training-Auswahl
    container.querySelectorAll('.it-training-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const trainingId = parseInt(tile.dataset.trainingId);
            selectIndividualTraining(trainingId);
        });
    });
};

const selectPlayer = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player || activeSlot === null) return;

    // Prüfen ob bereits zugewiesen
    for (const [slotId, assignment] of individualAssignments) {
        if (assignment.player.id === playerId) {
            showToast('Spieler bereits im Training', 'warning');
            return;
        }
    }

    individualAssignments.set(activeSlot, {player, training: null});
    closeModals();
    updateIndividualUI();
    saveIndividualToStorage();

    // Training-Modal öffnen
    setTimeout(() => openTrainingModal(activeSlot), 350);

    console.log('Spieler ausgewählt:', player.name, 'für Slot', activeSlot);
};

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

const removeIndividualPlayer = (slotId) => {
    const assignment = individualAssignments.get(slotId);
    if (!assignment) return;

    individualAssignments.delete(slotId);
    updateIndividualUI();
    saveIndividualToStorage();

    showToast(`${assignment.player.name} entfernt`, 'info');
};

const updateIndividualUI = () => {
    const slots = document.querySelectorAll('.individual-slot');

    slots.forEach(slot => {
        const slotId = parseInt(slot.dataset.slot);
        const assignment = individualAssignments.get(slotId);

        const emptyState = slot.querySelector('.slot-empty-state');
        const filledState = slot.querySelector('.slot-filled-state');

        if (assignment) {
            slot.classList.add('filled');
            if (emptyState) emptyState.style.display = 'none';
            if (filledState) {
                filledState.style.display = 'flex';

                const playerName = filledState.querySelector('.player-name');
                const positionBadge = filledState.querySelector('.player-position-badge');
                const statKondition = filledState.querySelector('.stat-kondition');
                const statForm = filledState.querySelector('.stat-form');
                const statFrische = filledState.querySelector('.stat-frische');
                const statMotivation = filledState.querySelector('.stat-motivation');

                if (playerName) playerName.textContent = assignment.player.name;
                if (positionBadge) positionBadge.textContent = assignment.player.position;
                if (statKondition) statKondition.textContent = assignment.player.kondition || 0;
                if (statForm) statForm.textContent = assignment.player.form || 0;
                if (statFrische) statFrische.textContent = assignment.player.frische || 0;
                if (statMotivation) statMotivation.textContent = assignment.player.motivation || 0;

                const trainingSelected = filledState.querySelector('.it-training-selected');
                const trainingIcon = filledState.querySelector('.training-icon');
                const trainingName = filledState.querySelector('.training-name');
                const trainingEffects = filledState.querySelector('.training-effects');

                if (assignment.training) {
                    if (trainingSelected) trainingSelected.classList.remove('no-training');
                    if (trainingIcon) trainingIcon.textContent = assignment.training.icon;
                    if (trainingName) trainingName.textContent = assignment.training.name;
                    if (trainingEffects && typeof INDIVIDUAL_TRAINING_CONFIG !== 'undefined') {
                        trainingEffects.innerHTML = INDIVIDUAL_TRAINING_CONFIG.helpers.renderEffectBadges(assignment.training.effects);
                    }
                } else {
                    if (trainingSelected) trainingSelected.classList.add('no-training');
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

    // Summary Update
    const playersCount = document.getElementById('it-players-count');
    if (playersCount) {
        playersCount.textContent = `${individualAssignments.size} / 4`;
    }

    const confirmBtn = document.getElementById('btn-confirm-individual');
    if (confirmBtn) {
        const validCount = Array.from(individualAssignments.values()).filter(a => a.training).length;
        confirmBtn.disabled = validCount === 0;
    }
};

const updateNextExecution = () => {
    const nextExecution = document.getElementById('it-next-execution');
    if (!nextExecution || typeof INDIVIDUAL_TRAINING_CONFIG === 'undefined') return;

    const now = new Date();
    const [hours, minutes] = INDIVIDUAL_TRAINING_CONFIG.settings.executionTime.split(':').map(Number);

    const executionToday = new Date(now);
    executionToday.setHours(hours, minutes, 0, 0);

    const isToday = now < executionToday;
    const timeStr = INDIVIDUAL_TRAINING_CONFIG.settings.executionTime;

    nextExecution.textContent = isToday ? `Heute, ${timeStr} Uhr` : `Morgen, ${timeStr} Uhr`;
};

const confirmIndividualTraining = () => {
    const validAssignments = Array.from(individualAssignments.values()).filter(a => a.training !== null);

    if (validAssignments.length === 0) {
        showToast('Bitte mindestens einen Spieler mit Training zuweisen', 'warning');
        return;
    }

    for (const [slotId, assignment] of individualAssignments) {
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

const resetIndividualTraining = () => {
    if (individualAssignments.size === 0) return;

    if (confirm('Alle Trainingszuweisungen löschen?')) {
        individualAssignments.clear();
        updateIndividualUI();
        saveIndividualToStorage();
        showToast('Training zurückgesetzt', 'info');
    }
};

const saveIndividualToStorage = () => {
    if (typeof INDIVIDUAL_TRAINING_CONFIG === 'undefined') return;

    const data = Array.from(individualAssignments.entries()).map(([slotId, assignment]) => ({
        slotId,
        playerId: assignment.player.id,
        trainingId: assignment.training?.id || null
    }));

    try {
        localStorage.setItem(INDIVIDUAL_TRAINING_CONFIG.settings.storageKey, JSON.stringify(data));
    } catch (e) {
        console.warn('Speichern fehlgeschlagen:', e);
    }
};

const loadIndividualFromStorage = () => {
    if (typeof INDIVIDUAL_TRAINING_CONFIG === 'undefined') return;

    try {
        const saved = localStorage.getItem(INDIVIDUAL_TRAINING_CONFIG.settings.storageKey);
        if (!saved) return;

        const data = JSON.parse(saved);

        data.forEach(item => {
            const player = players.find(p => p.id === item.playerId);
            const training = item.trainingId ? INDIVIDUAL_TRAINING_CONFIG.helpers.getTrainingById(item.trainingId) : null;

            if (player) {
                individualAssignments.set(item.slotId, {player, training});
            }
        });

    } catch (e) {
        console.warn('Laden fehlgeschlagen:', e);
    }
};

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================

const showToast = (message, type = 'info') => {
    let container = document.getElementById('toast-container');

    // Container erstellen falls nicht vorhanden
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {success: '✓', error: '✕', warning: '⚠', info: 'ℹ'};

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// =====================================================
// TAB SYSTEM
// =====================================================

const initTabs = () => {
    const tabs = document.querySelectorAll('.training-tab');
    const panels = document.querySelectorAll('.tab-panel');

    console.log('Tabs gefunden:', tabs.length);
    console.log('Panels gefunden:', panels.length);

    if (tabs.length === 0 || panels.length === 0) {
        console.warn('Tabs oder Panels nicht gefunden!');
        return;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const targetTab = tab.dataset.tab;
            console.log('Tab geklickt:', targetTab);

            // Alle Tabs deaktivieren
            tabs.forEach(t => t.classList.remove('active'));

            // Alle Panels verstecken
            panels.forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none';
            });

            // Aktiven Tab markieren
            tab.classList.add('active');

            // Ziel-Panel anzeigen
            const targetPanel = document.getElementById(`${targetTab}-panel`);
            if (targetPanel) {
                targetPanel.classList.add('active');
                targetPanel.style.display = 'block';
                console.log('Panel aktiviert:', targetPanel.id);
            } else {
                console.warn('Panel nicht gefunden:', `${targetTab}-panel`);
            }
        });
    });

    // Initial das erste Panel anzeigen
    if (panels.length > 0) {
        panels[0].style.display = 'block';
    }
};

// =====================================================
// FILTER & SEARCH FUNCTIONS (VERBESSERT)
// =====================================================

const filterPlayersByPosition = (filter) => {
    currentFilter = filter;
    const items = document.querySelectorAll('.player-list-item');

    console.log('Filtere nach:', filter);

    items.forEach(item => {
        const position = item.dataset.position;

        if (filter === 'all') {
            item.style.display = '';
        } else {
            const positions = POSITION_CATS[filter] || [];
            item.style.display = positions.includes(position) ? '' : 'none';
        }
    });

    // Zähle sichtbare Spieler
    const visibleCount = Array.from(items).filter(item => item.style.display !== 'none').length;
    console.log('Sichtbare Spieler:', visibleCount);
};

const searchPlayers = (searchTerm) => {
    const term = searchTerm.toLowerCase().trim();
    const items = document.querySelectorAll('.player-list-item');

    console.log('Suche nach:', term);

    let visibleCount = 0;

    items.forEach(item => {
        const nameElement = item.querySelector('.player-name');
        const name = nameElement ? nameElement.textContent.toLowerCase() : '';
        const position = item.dataset.position || '';

        // Kombiniere Suche mit aktivem Filter
        let matchesSearch = term === '' || name.includes(term) || position.toLowerCase().includes(term);
        let matchesFilter = true;

        if (currentFilter !== 'all') {
            const positions = POSITION_CATS[currentFilter] || [];
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
// EVENT HANDLERS
// =====================================================

const handleDocumentClick = (e) => {
    const target = e.target;

    // Mannschaftstraining: Training Card clicked
    if (target.closest('.training-card')) {
        const trainingId = target.closest('.training-card').dataset.trainingId;
        const emptyDayIndex = selectedTrainings.findIndex(t => t === null);

        if (emptyDayIndex !== -1) {
            selectTrainingForDay(trainingId, emptyDayIndex);
        } else {
            showToast('Alle Slots sind belegt. Entferne zuerst eine Einheit.', 'warning');
        }
    }

    // Mannschaftstraining: Remove Training
    if (target.closest('.slot-card-remove')) {
        const dayIndex = parseInt(target.closest('.slot-card-remove').dataset.day);
        removeTraining(dayIndex);
    }

    // Einzeltraining: Leerer Slot clicked
    const emptySlot = target.closest('.individual-slot:not(.filled)');
    if (emptySlot) {
        const slotId = parseInt(emptySlot.dataset.slot);
        openPlayerModal(slotId);
    }

    // Einzeltraining: Training ändern
    if (target.closest('.btn-change-training')) {
        e.stopPropagation();
        const slot = target.closest('.individual-slot');
        if (slot) openTrainingModal(parseInt(slot.dataset.slot));
    }

    // Einzeltraining: Spieler entfernen
    if (target.closest('.btn-remove-player')) {
        e.stopPropagation();
        const slot = target.closest('.individual-slot');
        if (slot) removeIndividualPlayer(parseInt(slot.dataset.slot));
    }

    // Einzeltraining: Training-Selected clicked
    if (target.closest('.it-training-selected')) {
        e.stopPropagation();
        const slot = target.closest('.individual-slot');
        if (slot) openTrainingModal(parseInt(slot.dataset.slot));
    }

    // Modal schließen
    if (target.classList.contains('modal-close')) {
        closeModals();
    }

    if (target.classList.contains('modal-overlay')) {
        closeModals();
    }

    // Filter Buttons (VERBESSERT)
    if (target.closest('.filter-btn')) {
        const btn = target.closest('.filter-btn');
        const filter = btn.dataset.filter;

        console.log('Filter-Button geklickt:', filter);

        // Aktiviere den geklickten Button
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Wende Filter an
        filterPlayersByPosition(filter);
    }
};

// =====================================================
// INITIALIZATION
// =====================================================

export function init() {
    console.log('Training-Modul wird initialisiert...');

    // Tab System ZUERST initialisieren
    initTabs();

    // Mannschaftstraining
    renderTrainingCards();
    renderTimeline();
    renderTotalImpact();

    // Einzeltraining
    initIndividualTraining();

    // Event Listeners
    addEventListener(document, 'click', handleDocumentClick);

    // Keyboard: ESC schließt Modals
    addEventListener(document, 'keydown', (e) => {
        if (e.key === 'Escape') closeModals();
    });

    // Spieler-Suche (VERBESSERT)
    const searchInput = document.getElementById('player-search-input');
    if (searchInput) {
        // Input Event für Live-Suche
        addEventListener(searchInput, 'input', (e) => {
            searchPlayers(e.target.value);
        });

        // Verhindere Form-Submit
        addEventListener(searchInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });

        console.log('Spieler-Suche initialisiert');
    }

    // Buttons
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) addEventListener(saveBtn, 'click', saveTrainingPlan);

    const confirmBtn = document.getElementById('btn-confirm-individual');
    if (confirmBtn) addEventListener(confirmBtn, 'click', confirmIndividualTraining);

    const resetBtn = document.getElementById('btn-reset-individual');
    if (resetBtn) addEventListener(resetBtn, 'click', resetIndividualTraining);

    console.log('Training-Modul initialisiert ✓');
}

export function cleanup() {
    eventListeners.forEach(({element, event, handler, options}) => {
        if (element) element.removeEventListener(event, handler, options);
    });
    eventListeners.length = 0;

    selectedTrainings = [null, null, null, null];
    individualAssignments.clear();
    activeSlot = null;
    currentFilter = 'all';

    console.log('Training-Modul cleanup ✓');
}