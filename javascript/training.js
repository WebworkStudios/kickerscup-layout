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
            { id: 'brutale_kondition', name: 'Brutale Kondition', effect: '+4 Kondition, -3 Frische', impacts: {kondition: 4, form: -1, frische: -3, motivation: 0} },
            { id: 'harte_kondition', name: 'harte Kondition', effect: '+3 Kondition, -2 Frische', impacts: {kondition: 3, form: -1, frische: -2, motivation: 0} },
            { id: 'zirkeltraining', name: 'Zirkeltraining', effect: '+3 Kondition, -2 Frische', impacts: {kondition: 3, form: 0, frische: -2, motivation: 0} },
            { id: 'waldlauf', name: 'Waldlauf', effect: '+2 Kondition, -1 Frische, +1 Motivation', impacts: {kondition: 2, form: 0, frische: -1, motivation: 1} },
            { id: 'zweikampf', name: 'Zweikampf', effect: '+2 Kondition, +1 Form, -2 Frische', impacts: {kondition: 2, form: 1, frische: -2, motivation: 0} },
            { id: 'leichte_kondition', name: 'leichte Kondition', effect: '+1 Kondition', impacts: {kondition: 1, form: 0, frische: 0, motivation: 0} },
        ]
    },
    technik: {
        name: 'Technik',
        icon: '⚽',
        color: '#ed8936',
        options: [
            { id: 'balltechnik', name: 'Balltechnik', effect: '+2 Form, +3 Frische, -3 Kondition', impacts: {kondition: -3, form: 2, frische: 3, motivation: 0} },
            { id: 'torschuss', name: 'Torschuss', effect: '+1 Frische, -1 Kondition', impacts: {kondition: -1, form: 0, frische: 1, motivation: 0} },
            { id: 'standardsituationen', name: 'Standardsituationen', effect: '+1 Form', impacts: {kondition: 0, form: 1, frische: 0, motivation: 0} },
        ]
    },
    taktik: {
        name: 'Taktik',
        icon: '🧠',
        color: '#4299e1',
        options: [
            { id: 'trainingsspiel', name: 'Trainingsspiel', effect: '+1 Kondition, +1 Form, -1 Frische', impacts: {kondition: 1, form: 1, frische: -1, motivation: 0} },
            { id: 'viererkette', name: 'Viererkette', effect: '+1 Form, +1 Frische, -1 Kondition', impacts: {kondition: -1, form: 1, frische: 1, motivation: 0} },
        ]
    },
    regeneration: {
        name: 'Erholung',
        icon: '😴',
        color: '#38b2ac',
        options: [
            { id: 'regeneration', name: 'Regeneration', effect: '+4 Frische, -2 Kondition', impacts: {kondition: -2, form: 0, frische: 4, motivation: 0} },
            { id: 'spritzigkeit', name: 'Spritzigkeit', effect: '+3 Frische, +1 Kondition', impacts: {kondition: 1, form: 0, frische: 3, motivation: 0} },
            { id: 'freizeit', name: 'Freizeit', effect: '+1 Frische, +1 Motivation, -2 Kondition', impacts: {kondition: -2, form: 0, frische: 1, motivation: 1} },
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
            return { ...option, color: category.color, icon: category.icon, categoryName: category.name };
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

    selectedTrainings[dayIndex] = { id: trainingId, ...training };
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

    const total = { kondition: 0, form: 0, frische: 0, motivation: 0 };

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
        trainings: selectedTrainings.filter(t => t !== null).map(t => ({ id: t.id, name: t.name })),
        totalImpact: { kondition: 0, form: 0, frische: 0, motivation: 0 }
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
let players = typeof SAMPLE_PLAYERS !== 'undefined' ? SAMPLE_PLAYERS : [];

const initIndividualTraining = () => {
    const panel = document.getElementById('individual-training-panel');
    if (!panel) {
        console.warn('individual-training-panel nicht gefunden');
        return;
    }

    console.log('Einzeltraining initialisiert');

    // Lade gespeicherte Zuweisungen
    loadIndividualFromStorage();

    // Initial-Rendering
    updateIndividualUI();
    updateNextExecution();
};

const openPlayerModal = (slotId) => {
    activeSlot = slotId;
    renderPlayerList();
    const modal = document.getElementById('player-select-modal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        const searchInput = document.getElementById('player-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
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
};

const renderPlayerList = () => {
    const container = document.getElementById('player-list');
    if (!container) return;

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

    container.innerHTML = html;

    // Event Listeners
    container.querySelectorAll('.player-list-item:not(.disabled)').forEach(item => {
        item.addEventListener('click', () => {
            const playerId = parseInt(item.dataset.playerId);
            selectPlayer(playerId);
        });
    });
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

    // Event Listeners
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

    individualAssignments.set(activeSlot, { player, training: null });
    closeModals();
    updateIndividualUI();
    saveIndividualToStorage();

    // Training-Modal öffnen
    setTimeout(() => openTrainingModal(activeSlot), 350);
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
                const statStrength = filledState.querySelector('.stat-strength');
                const statKondition = filledState.querySelector('.stat-kondition');
                const statFrische = filledState.querySelector('.stat-frische');

                if (playerName) playerName.textContent = assignment.player.name;
                if (positionBadge) positionBadge.textContent = assignment.player.position;
                if (statStrength) statStrength.textContent = assignment.player.strength;
                if (statKondition) statKondition.textContent = assignment.player.kondition;
                if (statFrische) statFrische.textContent = assignment.player.frische;

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
                individualAssignments.set(item.slotId, { player, training });
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

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

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

    // Filter Buttons
    if (target.closest('.filter-btn')) {
        const btn = target.closest('.filter-btn');
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterPlayersByPosition(btn.dataset.filter);
    }
};

const filterPlayersByPosition = (filter) => {
    const items = document.querySelectorAll('.player-list-item');

    items.forEach(item => {
        const position = item.dataset.position;

        if (filter === 'all') {
            item.style.display = '';
        } else {
            const positions = typeof POSITION_CATEGORIES !== 'undefined' ? POSITION_CATEGORIES[filter] : [];
            item.style.display = positions.includes(position) ? '' : 'none';
        }
    });
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

    // Spieler-Suche
    const searchInput = document.getElementById('player-search-input');
    if (searchInput) {
        addEventListener(searchInput, 'input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.player-list-item').forEach(item => {
                const name = item.querySelector('.player-name').textContent.toLowerCase();
                item.style.display = name.includes(term) ? '' : 'none';
            });
        });
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

    console.log('Training-Modul cleanup ✓');
}