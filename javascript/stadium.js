// =====================================================
// KICKERSCUP - STADIUM MANAGEMENT SYSTEM (OPTIMIZED)
// Stadion-Verwaltung mit Block-Click-Modals + Pitch-Renovation
// ✅ OPTIMIERT: Event-Delegation, DOM-Batching, State-Management
// =====================================================

import {
    CAPACITY_CONFIG,
    TIMING_CONFIG,
    ROOF_CONFIG,
    FLOODLIGHT_CONFIG,
    PITCH_CONFIG,
    ADVERTISING_CONFIG,
    EXPANSION_CONFIG,
    UI_TEXTS,
    BLOCKS,
    calculateBuildDays,
    formatCurrency,
    formatCapacity,
    calculateCapacityDistribution,
    calculateExpansionCost,
    calculateExpansionBuildWeeks,
    createInitialState,
    validateState,
    repairState,
    isValidBlock
} from './stadium-config.js';

import {
    bookSponsor,
    hasBlockSponsor,
    hasBlockAdvertising,
    clearPrognosisCache
} from './stadium-sponsors.js';

import {
    openSponsorSelectionModal,
    refreshSponsorSelectionModal,
    showSponsorDetailsModal,
    showConfirmationModal,
    showSuccessModal,
    showComparisonModal,
    renderSponsorOverviewTab,
    closeModal,
    toggleComparisonMode,
    toggleSponsorForComparison,
    updateFilter,
    updateSort,
    getCurrentBlock,
    getSelectedForComparison
} from './stadium-sponsors-ui.js';

// =====================================================
// CONSTANTS
// =====================================================

const STORAGE_KEY = 'kickerscup_stadium_state';
const DEBOUNCE_DELAY = 150;

// =====================================================
// PRIVATE STATE
// =====================================================

let stadiumState = null;
let currentModal = null;
let isInitialized = false;

// Event Listener Tracking für sauberes Cleanup
let eventController = new AbortController();

// Mock current season stats
const currentSeasonStats = {
    gamesPlayed: 12,
    goals: 23,
    wins: 8,
    leagueTitle: false,
    cupTitle: false
};

// =====================================================
// UTILITY: DEBOUNCE
// =====================================================

const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

// =====================================================
// STATE MANAGEMENT
// =====================================================

/**
 * Lädt Stadion-State aus LocalStorage mit Validierung
 */
const loadStadiumState = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
            const parsed = JSON.parse(stored);
            const validation = validateState(parsed);

            if (!validation.valid) {
                console.warn('State validation failed:', validation.errors);
                stadiumState = repairState(parsed);
                saveStadiumStateImmediate();
                console.log('✓ Stadium-State repariert');
            } else {
                stadiumState = parsed;
                console.log('✓ Stadium-State geladen');
            }
            return stadiumState;
        }
    } catch (error) {
        console.error('❌ Fehler beim Laden des Stadium-States:', error);
    }

    // Fallback: Neuer State
    stadiumState = createInitialState();
    saveStadiumStateImmediate();
    console.log('✓ Neuer Stadium-State initialisiert');
    return stadiumState;
};

/**
 * Speichert Stadion-State (debounced)
 */
const saveStadiumState = debounce(() => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stadiumState));
    } catch (error) {
        console.error('❌ Fehler beim Speichern:', error);
    }
}, DEBOUNCE_DELAY);

/**
 * Speichert sofort (für kritische Operationen)
 */
const saveStadiumStateImmediate = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stadiumState));
    } catch (error) {
        console.error('❌ Fehler beim Speichern:', error);
    }
};

// =====================================================
// BAUZEITEN-SYSTEM
// =====================================================

/**
 * Prüft ob Spielbetrieb aktiv ist (Tag 1-27)
 */
const isGameSeasonActive = () => {
    const { currentDay } = stadiumState;
    const { START_DAY, END_DAY } = TIMING_CONFIG.GAME_SEASON;
    return currentDay >= START_DAY && currentDay <= END_DAY;
};

/**
 * Aktualisiert Bau-Queue (pro Tag)
 */
const tickBuildTimer = () => {
    if (!isGameSeasonActive()) {
        console.log('⏸️ Bauarbeiten pausiert');
        return;
    }

    const { queue } = stadiumState.construction;
    let hasChanges = false;

    // Rückwärts iterieren für sicheres Entfernen
    for (let i = queue.length - 1; i >= 0; i--) {
        const project = queue[i];

        if (project.status === 'active') {
            project.remainingDays--;
            hasChanges = true;

            if (project.remainingDays <= 0) {
                completeConstruction(project);
                queue.splice(i, 1);
                stadiumState.construction.active--;
            }
        }
    }

    // Starte wartende Projekte
    startQueuedProjects();

    if (hasChanges) {
        saveStadiumState();
        renderConstructionQueue();
        renderStadiumOverview();
    }
};

/**
 * Startet wartende Bauprojekte
 */
const startQueuedProjects = () => {
    const { queue, active } = stadiumState.construction;
    const slotsAvailable = TIMING_CONFIG.MAX_PARALLEL_BUILDS - active;

    if (slotsAvailable <= 0) return;

    let started = 0;
    for (const project of queue) {
        if (project.status === 'queued' && started < slotsAvailable) {
            project.status = 'active';
            project.startDay = stadiumState.currentDay;
            stadiumState.construction.active++;
            started++;
            console.log(`🔨 Baustart: ${project.name}`);
        }
    }
};

/**
 * Schließt Bauprojekt ab
 */
const completeConstruction = (project) => {
    console.log(`✅ Bauabschluss: ${project.name}`);

    const handlers = {
        roof: () => { stadiumState.features.roofs[project.block] = true; },
        floodlight: () => { stadiumState.features.floodlight = project.targetStage; },
        pitch_renovation: () => { stadiumState.features.pitch.condition = 100; },
        advertising: () => { stadiumState.features.advertising[project.block] = true; },
        expansion: () => applyExpansion(project)
    };

    const handler = handlers[project.type];
    if (handler) handler();

    // Cache invalidieren bei relevanten Änderungen
    if (project.type === 'expansion') {
        clearPrognosisCache();
    }

    showNotification(`✅ ${project.name} abgeschlossen!`);
};

/**
 * Wendet Tribünen-Ausbau an
 */
const applyExpansion = (project) => {
    const { block, additionalSeats } = project;
    const dist = stadiumState.capacity.distribution[block];

    dist.capacity += additionalSeats;

    const hasBoxes = block === CAPACITY_CONFIG.FIXED_BOX_BLOCK;
    const newDist = calculateCapacityDistribution(dist.capacity, hasBoxes);

    Object.assign(dist, newDist);
    recalculateTotalCapacity();

    console.log(`✅ Tribünen-Ausbau ${UI_TEXTS.blocks[block]} (+${formatCapacity(additionalSeats)})`);
};

/**
 * Berechnet Gesamt-Kapazität neu
 */
const recalculateTotalCapacity = () => {
    let total = 0, standing = 0, seated = 0, boxes = 0;

    for (const block of BLOCKS) {
        const dist = stadiumState.capacity.distribution[block];
        total += dist.capacity;
        standing += dist.standing;
        seated += dist.seated;
        boxes += dist.boxes || 0;
    }

    Object.assign(stadiumState.capacity, { total, standing, seated });
    stadiumState.capacity.boxes.total = boxes;
};

/**
 * Fügt Bauprojekt zur Queue hinzu
 */
const addConstructionProject = (projectData) => {
    const canStartImmediately = stadiumState.construction.active < TIMING_CONFIG.MAX_PARALLEL_BUILDS;

    const project = {
        id: `${projectData.type}_${Date.now()}`,
        type: projectData.type,
        name: projectData.name,
        block: projectData.block ?? null,
        targetStage: projectData.targetStage ?? null,
        additionalSeats: projectData.additionalSeats ?? null,
        startDay: canStartImmediately ? stadiumState.currentDay : null,
        duration: projectData.duration,
        remainingDays: projectData.duration,
        cost: projectData.cost,
        status: canStartImmediately ? 'active' : 'queued'
    };

    stadiumState.construction.queue.push(project);

    if (canStartImmediately) {
        stadiumState.construction.active++;
    }

    saveStadiumStateImmediate();
    renderConstructionQueue();

    console.log(`📋 Bauprojekt: ${project.name} (${project.status})`);
};

// =====================================================
// NOTIFICATION SYSTEM
// =====================================================

const showNotification = (message) => {
    // Einfache Alert-Fallback, kann später durch Toast ersetzt werden
    alert(message);
};

// =====================================================
// MODAL SYSTEM
// =====================================================

/**
 * Öffnet Block-Expansion Modal
 */
const openBlockExpansionModal = (block) => {
    if (!isValidBlock(block)) {
        console.error('Invalid block:', block);
        return;
    }

    const dist = stadiumState.capacity.distribution[block];
    const currentCapacity = dist.capacity;
    const maxCapacity = CAPACITY_CONFIG.MAX_CAPACITY / 4;

    if (currentCapacity >= maxCapacity) {
        showNotification(`❌ ${UI_TEXTS.blocks[block]} ist bereits maximal ausgebaut!`);
        return;
    }

    const { minStep, maxStep: configMaxStep } = EXPANSION_CONFIG;
    const maxStep = Math.min(configMaxStep, maxCapacity - currentCapacity);
    const initialValue = Math.min(1000, maxStep);

    const modal = document.createElement('div');
    modal.className = 'stadium-modal';
    modal.id = 'blockExpansionModal';

    modal.innerHTML = `
        <div class="stadium-modal-content">
            <div class="stadium-modal-header">
                <h2>🏗️ ${UI_TEXTS.blocks[block]} ausbauen</h2>
                <button class="stadium-modal-close" data-action="closeStadiumModal">&times;</button>
            </div>
            
            <div class="stadium-modal-body">
                <div class="block-info-section">
                    <div class="block-info-row"><span class="block-info-label">Kapazität:</span><span class="block-info-value">${formatCapacity(currentCapacity)}</span></div>
                    <div class="block-info-row"><span class="block-info-label">Stehplätze:</span><span class="block-info-value">${formatCapacity(dist.standing)}</span></div>
                    <div class="block-info-row"><span class="block-info-label">Sitzplätze:</span><span class="block-info-value">${formatCapacity(dist.seated)}</span></div>
                    ${dist.boxes > 0 ? `<div class="block-info-row"><span class="block-info-label">Logen:</span><span class="block-info-value">${formatCapacity(dist.boxes)}</span></div>` : ''}
                </div>
                
                <div class="expansion-slider-section">
                    <div class="slider-label">
                        <span>Ausbau-Umfang:</span>
                        <span class="slider-current-value" id="sliderValue">+${formatCapacity(initialValue)}</span>
                    </div>
                    
                    <input type="range" class="capacity-slider" id="capacitySlider"
                           min="${minStep}" max="${maxStep}" step="${minStep}" value="${initialValue}"
                           style="--slider-progress:${(initialValue / maxStep) * 100}%">
                    
                    <div class="slider-bounds">
                        <span>Min: ${formatCapacity(minStep)}</span>
                        <span>Max: ${formatCapacity(maxStep)}</span>
                    </div>
                </div>
                
                <div class="expansion-preview" id="expansionPreview"></div>
            </div>
            
            <div class="stadium-modal-footer">
                <button class="btn btn-secondary" data-action="closeStadiumModal">Abbrechen</button>
                <button class="btn btn-primary" id="confirmExpansionBtn">🔨 Ausbau starten</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    currentModal = modal;

    // Event Listeners mit AbortController
    const slider = modal.querySelector('#capacitySlider');
    const confirmBtn = modal.querySelector('#confirmExpansionBtn');

    const updatePreview = () => {
        const additionalSeats = parseInt(slider.value, 10);
        updateExpansionPreview(block, currentCapacity, additionalSeats, maxStep);
    };

    slider.addEventListener('input', updatePreview, { signal: eventController.signal });
    confirmBtn.addEventListener('click', () => {
        confirmBlockExpansion(block, parseInt(slider.value, 10));
    }, { signal: eventController.signal });

    updatePreview();
    requestAnimationFrame(() => modal.classList.add('active'));
};

/**
 * Aktualisiert Expansion-Preview
 */
const updateExpansionPreview = (block, currentCapacity, additionalSeats, maxStep) => {
    const previewEl = document.getElementById('expansionPreview');
    const sliderValueEl = document.getElementById('sliderValue');
    const slider = document.getElementById('capacitySlider');

    if (!previewEl || !sliderValueEl || !slider) return;

    const newCapacity = currentCapacity + additionalSeats;
    const cost = calculateExpansionCost(block, additionalSeats);
    const buildWeeks = calculateExpansionBuildWeeks(additionalSeats);
    const buildDays = calculateBuildDays(buildWeeks);

    const hasBoxes = block === CAPACITY_CONFIG.FIXED_BOX_BLOCK;
    const newDist = calculateCapacityDistribution(newCapacity, hasBoxes);

    // Update UI
    sliderValueEl.textContent = `+${formatCapacity(additionalSeats)}`;
    slider.style.setProperty('--slider-progress', `${(additionalSeats / maxStep) * 100}%`);

    previewEl.innerHTML = `
        <h3>📊 Vorschau</h3>
        <div class="preview-row"><span class="preview-label">Neue Kapazität:</span><span class="preview-value highlight">${formatCapacity(currentCapacity)} → ${formatCapacity(newCapacity)}</span></div>
        <div class="preview-row"><span class="preview-label">Stehplätze:</span><span class="preview-value">${formatCapacity(newDist.standing)}</span></div>
        <div class="preview-row"><span class="preview-label">Sitzplätze:</span><span class="preview-value">${formatCapacity(newDist.seated)}</span></div>
        ${newDist.boxes > 0 ? `<div class="preview-row"><span class="preview-label">Logen:</span><span class="preview-value">${formatCapacity(newDist.boxes)}</span></div>` : ''}
        <div class="preview-row"><span class="preview-label">Kosten:</span><span class="preview-value highlight">${formatCurrency(cost)}</span></div>
        <div class="preview-row"><span class="preview-label">Bauzeit:</span><span class="preview-value">${buildWeeks} SW (${buildDays} Tage)</span></div>
    `;
};

/**
 * Bestätigt Block-Expansion
 */
const confirmBlockExpansion = (block, additionalSeats) => {
    const cost = calculateExpansionCost(block, additionalSeats);
    const buildWeeks = calculateExpansionBuildWeeks(additionalSeats);
    const buildDays = calculateBuildDays(buildWeeks);

    if (!confirm(`Tribünen-Ausbau ${UI_TEXTS.blocks[block]}?\n\n+${formatCapacity(additionalSeats)} Plätze\n${formatCurrency(cost)}\n${buildDays} Tage`)) {
        return;
    }

    addConstructionProject({
        type: 'expansion',
        name: `Tribünen-Ausbau ${UI_TEXTS.blocks[block]} (+${formatCapacity(additionalSeats)})`,
        block,
        additionalSeats,
        duration: buildDays,
        cost
    });

    closeStadiumModal();
    showNotification(`🔨 Tribünen-Ausbau gestartet!`);
};

/**
 * Öffnet Pitch-Renovation Modal
 */
const openPitchRenovationModal = () => {
    const { condition } = stadiumState.features.pitch;
    const { cost, buildWeeks } = PITCH_CONFIG.renovation;
    const buildDays = calculateBuildDays(buildWeeks);

    const conditionClass = condition >= 70 ? 'excellent' : condition >= 40 ? 'good' : 'poor';

    const modal = document.createElement('div');
    modal.className = 'stadium-modal';
    modal.id = 'pitchRenovationModal';

    modal.innerHTML = `
        <div class="stadium-modal-content">
            <div class="stadium-modal-header">
                <h2>🌱 Rasen-Renovation</h2>
                <button class="stadium-modal-close" data-action="closeStadiumModal">&times;</button>
            </div>
            
            <div class="stadium-modal-body">
                <div class="pitch-status-section">
                    <div class="pitch-type">${PITCH_CONFIG.name}</div>
                    <p style="font-size:13px;color:var(--text-muted);margin-bottom:15px">${PITCH_CONFIG.description}</p>
                    
                    <div class="pitch-condition-bar">
                        <div class="pitch-condition-fill ${conditionClass}" style="width:${condition}%"></div>
                    </div>
                    
                    <div class="pitch-condition-text">Zustand: <strong>${condition}%</strong></div>
                    <div class="pitch-degradation-info">⚠️ -${PITCH_CONFIG.BASE_WEAR_PER_MATCH}% pro Spiel</div>
                </div>
                
                ${condition < 100 ? `
                    <div class="renovation-info">
                        <h4>🔨 Renovation:</h4>
                        <ul>
                            <li>Zustand → 100%</li>
                            <li>Kosten: ${formatCurrency(cost)}</li>
                            <li>Bauzeit: ${buildDays} Tage</li>
                        </ul>
                    </div>
                ` : '<div class="renovation-info"><h4>✅ Rasen in perfektem Zustand!</h4></div>'}
                
                ${condition < 40 ? `
                    <div class="modal-warning">
                        <span class="modal-warning-icon">⚠️</span>
                        <div class="modal-warning-text"><strong>Kritischer Zustand!</strong> Erhöhtes Verletzungsrisiko.</div>
                    </div>
                ` : ''}
            </div>
            
            <div class="stadium-modal-footer">
                <button class="btn btn-secondary" data-action="closeStadiumModal">Schließen</button>
                ${condition < 100 ? `<button class="btn btn-primary" id="confirmRenovationBtn">🔨 Renovation starten</button>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    currentModal = modal;

    const confirmBtn = modal.querySelector('#confirmRenovationBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmPitchRenovation, { signal: eventController.signal });
    }

    requestAnimationFrame(() => modal.classList.add('active'));
};

/**
 * Bestätigt Rasen-Renovation
 */
const confirmPitchRenovation = () => {
    const { cost, buildWeeks } = PITCH_CONFIG.renovation;
    const buildDays = calculateBuildDays(buildWeeks);

    if (!confirm(`Rasen renovieren?\n\n${formatCurrency(cost)}\n${buildDays} Tage`)) {
        return;
    }

    addConstructionProject({
        type: 'pitch_renovation',
        name: 'Rasen-Renovation (British Premium)',
        duration: buildDays,
        cost
    });

    closeStadiumModal();
    showNotification(`🔨 Rasen-Renovation gestartet!`);
};

/**
 * Schließt Stadium-Modal
 */
const closeStadiumModal = () => {
    if (!currentModal) return;

    currentModal.classList.remove('active');
    setTimeout(() => {
        currentModal?.remove();
        currentModal = null;
    }, 300);
};

// =====================================================
// FEATURE MANAGEMENT
// =====================================================

const buildRoof = (block) => {
    if (!isValidBlock(block)) return;

    if (stadiumState.features.roofs[block]) {
        showNotification(`❌ ${UI_TEXTS.blocks[block]} hat bereits ein Dach!`);
        return;
    }

    const { cost, buildWeeks } = ROOF_CONFIG;
    const duration = calculateBuildDays(buildWeeks);

    if (!confirm(`Dach für ${UI_TEXTS.blocks[block]}?\n\n${formatCurrency(cost)}\n${duration} Tage`)) return;

    addConstructionProject({ type: 'roof', name: `Dach ${UI_TEXTS.blocks[block]}`, block, duration, cost });
    showNotification(`🔨 Dachbau gestartet!`);
};

const upgradeFloodlight = () => {
    const nextStage = stadiumState.features.floodlight + 1;

    if (nextStage >= FLOODLIGHT_CONFIG.stages.length) {
        showNotification('❌ Flutlicht bereits maximal!');
        return;
    }

    const stage = FLOODLIGHT_CONFIG.stages[nextStage];
    const duration = calculateBuildDays(stage.buildWeeks);

    if (!confirm(`Flutlicht → "${stage.name}"?\n\n${formatCurrency(stage.cost)}\n${duration} Tage\n+${((stage.tvRevenueMultiplier - 1) * 100).toFixed(0)}% TV`)) return;

    addConstructionProject({ type: 'floodlight', name: `Flutlicht: ${stage.name}`, targetStage: nextStage, duration, cost: stage.cost });
    showNotification(`🔨 Flutlicht-Upgrade gestartet!`);
};

const installAdvertising = (block) => {
    if (!isValidBlock(block)) return;

    if (stadiumState.features.advertising[block]) {
        showNotification(`❌ ${UI_TEXTS.blocks[block]} hat bereits Werbung!`);
        return;
    }

    const { cost, buildWeeks } = ADVERTISING_CONFIG;
    const duration = calculateBuildDays(buildWeeks);

    if (!confirm(`Werbung für ${UI_TEXTS.blocks[block]}?\n\n${formatCurrency(cost)}\n${duration} Tage`)) return;

    addConstructionProject({ type: 'advertising', name: `Werbung ${UI_TEXTS.blocks[block]}`, block, duration, cost });
    showNotification(`🔨 Werbeinstallation gestartet!`);
};

const manageSponsor = (block) => {
    if (!isValidBlock(block)) return;

    if (!hasBlockAdvertising(stadiumState, block)) {
        showNotification(`❌ Bitte zuerst Werbebande installieren!`);
        return;
    }

    if (hasBlockSponsor(stadiumState, block)) {
        showNotification(`ℹ️ ${UI_TEXTS.blocks[block]} hat bereits einen Sponsor.`);
        return;
    }

    openSponsorSelectionModal(block, stadiumState);
};

const finalizeSponsorBooking = (sponsorId) => {
    const block = getCurrentBlock();

    try {
        const result = bookSponsor(stadiumState, block, sponsorId);

        if (result.success) {
            saveStadiumStateImmediate();
            showSuccessModal(result.sponsor, result.initialPayment);

            setTimeout(() => {
                renderStadiumOverview();
                const container = document.getElementById('sponsorOverviewContainer');
                if (container) {
                    container.innerHTML = renderSponsorOverviewTab(stadiumState, currentSeasonStats);
                }
            }, 500);
        }
    } catch (error) {
        showNotification(`❌ ${error.message}`);
        closeModal();
    }
};

// =====================================================
// RENDERING (Batched DOM Updates)
// =====================================================

const renderStadiumOverview = () => {
    // Batch all DOM reads first
    const elements = {
        totalCapacity: document.getElementById('totalCapacity'),
        standingCapacity: document.getElementById('standingCapacity'),
        seatedCapacity: document.getElementById('seatedCapacity'),
        boxesCapacity: document.getElementById('boxesCapacity'),
        floodlightStage: document.getElementById('floodlightStage'),
        floodlightStage2: document.getElementById('floodlightStage2'),
        pitchType: document.getElementById('pitchType'),
        pitchCondition: document.getElementById('pitchCondition')
    };

    const blockElements = {};
    for (const block of BLOCKS) {
        blockElements[block] = {
            capacity: document.getElementById(`block${block}Capacity`),
            roof: document.getElementById(`block${block}Roof`),
            ad: document.getElementById(`block${block}Ad`)
        };
    }

    // Prepare values
    const { capacity, features } = stadiumState;
    const stage = FLOODLIGHT_CONFIG.stages[features.floodlight];
    const condition = features.pitch.condition;

    // Batch all DOM writes
    requestAnimationFrame(() => {
        // Main stats
        if (elements.totalCapacity) elements.totalCapacity.textContent = formatCapacity(capacity.total);
        if (elements.standingCapacity) elements.standingCapacity.textContent = formatCapacity(capacity.standing);
        if (elements.seatedCapacity) elements.seatedCapacity.textContent = formatCapacity(capacity.seated);
        if (elements.boxesCapacity) elements.boxesCapacity.textContent = formatCapacity(capacity.boxes.total);

        // Floodlight
        if (elements.floodlightStage) elements.floodlightStage.textContent = stage.name;
        if (elements.floodlightStage2) elements.floodlightStage2.textContent = stage.name;

        // Pitch
        if (elements.pitchType) elements.pitchType.textContent = 'British';
        if (elements.pitchCondition) {
            elements.pitchCondition.textContent = `${condition}%`;
            elements.pitchCondition.style.color = condition > 70 ? '#68d391' : condition > 40 ? '#f6ad55' : '#fc8181';
        }

        // Block details
        for (const block of BLOCKS) {
            const dist = capacity.distribution[block];
            const els = blockElements[block];

            if (els.capacity) els.capacity.textContent = formatCapacity(dist.capacity);
            if (els.roof) els.roof.textContent = features.roofs[block] ? '✅ Ja' : '❌ Nein';
            if (els.ad) els.ad.textContent = features.advertising[block] ? '✅ Ja' : '❌ Nein';
        }

        updateStadiumVisualization();
    });
};

const updateStadiumVisualization = () => {
    const { features } = stadiumState;

    for (const block of BLOCKS) {
        const blockEl = document.querySelector(`.stadium-block[data-block="${block}"]`);
        if (!blockEl) continue;

        // Roof icon
        const roofIcon = blockEl.querySelector('.roof-icon');
        if (roofIcon) roofIcon.style.display = features.roofs[block] ? 'block' : 'none';

        // Boxes icon
        const boxesIcon = blockEl.querySelector('.boxes-icon');
        if (boxesIcon && block === CAPACITY_CONFIG.FIXED_BOX_BLOCK) {
            boxesIcon.style.display = 'block';
        }

        // Advertising indicator
        blockEl.classList.toggle('has-advertising', features.advertising[block]);
    }

    // Pitch texture
    const pitchEl = document.querySelector('.stadium-pitch');
    if (pitchEl) {
        pitchEl.classList.remove('pitch-normal', 'pitch-dirt');
        pitchEl.classList.add('pitch-british');
    }
};

const renderConstructionQueue = () => {
    const queueContainer = document.getElementById('constructionQueue');
    if (!queueContainer) return;

    const { queue } = stadiumState.construction;

    if (!queue.length) {
        queueContainer.innerHTML = '<p class="no-construction">Keine laufenden Bauprojekte</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    for (const project of queue) {
        const progress = ((project.duration - project.remainingDays) / project.duration) * 100;
        const statusText = UI_TEXTS.constructionStatus[project.status];

        const card = document.createElement('div');
        card.className = 'construction-card glass';
        card.innerHTML = `
            <div class="construction-header">
                <h4>${project.name}</h4>
                <span class="construction-status ${project.status}">${statusText}</span>
            </div>
            <div class="construction-details">
                <div class="detail-row"><span>Verbleibend:</span><span>${project.remainingDays} Tage</span></div>
                <div class="detail-row"><span>Kosten:</span><span>${formatCurrency(project.cost)}</span></div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width:${progress}%"></div>
            </div>
            <div class="progress-text">${Math.round(progress)}% abgeschlossen</div>
        `;

        fragment.appendChild(card);
    }

    queueContainer.innerHTML = '';
    queueContainer.appendChild(fragment);
};

const switchFeatureTab = (tabName) => {
    const tabIdMap = {
        blocks: 'tabBlocks',
        infrastructure: 'tabInfrastructure',
        sponsors: 'tabSponsors',
        construction: 'tabConstruction'
    };

    // Update buttons
    document.querySelectorAll('.feature-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = document.getElementById(tabIdMap[tabName]);
    if (targetContent) {
        targetContent.classList.add('active');

        if (tabName === 'sponsors') {
            const container = document.getElementById('sponsorOverviewContainer');
            if (container) {
                container.innerHTML = renderSponsorOverviewTab(stadiumState, currentSeasonStats);
            }
        }
    }
};

// =====================================================
// EVENT HANDLING (Centralized Delegation)
// =====================================================

const handleClick = (e) => {
    const target = e.target.closest('[data-action], [data-tab]');
    if (!target) return;

    // Tab switching
    if (target.dataset.tab) {
        switchFeatureTab(target.dataset.tab);
        return;
    }

    const { action } = target.dataset;
    const block = target.dataset.block;
    const sponsorId = target.dataset.sponsorId ? parseInt(target.dataset.sponsorId, 10) : null;

    const actions = {
        openBlockExpansion: () => openBlockExpansionModal(block),
        openPitchRenovation: () => openPitchRenovationModal(),
        closeStadiumModal: () => closeStadiumModal(),
        buildRoof: () => buildRoof(block),
        upgradeFloodlight: () => upgradeFloodlight(),
        installAdvertising: () => installAdvertising(block),
        manageSponsor: () => manageSponsor(block),
        openSponsorSelection: () => openSponsorSelectionModal(block, stadiumState),
        showSponsorDetails: () => showSponsorDetailsModal(sponsorId, stadiumState),
        confirmBooking: () => showConfirmationModal(sponsorId, stadiumState),
        finalizeBooking: () => finalizeSponsorBooking(sponsorId),
        toggleComparisonMode: () => { toggleComparisonMode(); refreshSponsorSelectionModal(stadiumState); },
        toggleComparison: () => {
            if (toggleSponsorForComparison(sponsorId)) {
                showComparisonModal(getSelectedForComparison(), stadiumState);
            } else {
                refreshSponsorSelectionModal(stadiumState);
            }
        },
        closeModal: () => closeModal(),
        closeModalAndRefresh: () => { closeModal(); renderStadiumOverview(); switchFeatureTab('sponsors'); },
        backToSelection: () => { closeModal(false); setTimeout(() => openSponsorSelectionModal(getCurrentBlock(), stadiumState), 100); },
        backToDetails: () => { closeModal(false); setTimeout(() => showSponsorDetailsModal(sponsorId, stadiumState), 100); },
        goToSponsorOverview: () => { closeModal(); switchFeatureTab('sponsors'); },
        simulateDay: () => simulateDay()
    };

    const actionFn = actions[action];
    if (actionFn) actionFn();
};

const handleChange = (e) => {
    const target = e.target;

    if (target.dataset.filter) {
        updateFilter(target.dataset.filter, target.value);
        refreshSponsorSelectionModal(stadiumState);
    } else if (target.dataset.sort) {
        updateSort(target.value);
        refreshSponsorSelectionModal(stadiumState);
    }
};

const simulateDay = () => {
    stadiumState.currentDay++;

    if (stadiumState.currentDay > 31) {
        stadiumState.currentDay = 1;
        stadiumState.currentMonth++;
    }

    // Rasen verschlechtert sich wöchentlich
    if (stadiumState.currentDay % 7 === 0) {
        const roofCount = Object.values(stadiumState.features.roofs).filter(Boolean).length;
        const wearReduction = roofCount * ROOF_CONFIG.pitchWearReduction;
        const actualWear = PITCH_CONFIG.BASE_WEAR_PER_MATCH * (1 - wearReduction);

        stadiumState.features.pitch.condition = Math.max(0, stadiumState.features.pitch.condition - actualWear);
    }

    tickBuildTimer();
    saveStadiumState();

    const dayEl = document.getElementById('currentDay');
    if (dayEl) dayEl.textContent = stadiumState.currentDay;

    console.log(`📅 Tag ${stadiumState.currentDay}, Rasen: ${stadiumState.features.pitch.condition.toFixed(1)}%`);
};

// =====================================================
// MODULE LIFECYCLE
// =====================================================

export function init() {
    if (isInitialized) {
        console.warn('Stadium-Modul bereits initialisiert');
        return;
    }

    console.log('🎬 Initialisiere Stadium-Modul');

    // Neuen AbortController erstellen falls alter aborted wurde
    if (eventController.signal.aborted) {
        eventController = new AbortController();
    }

    loadStadiumState();
    renderStadiumOverview();
    renderConstructionQueue();

    // Event Delegation mit AbortController
    document.addEventListener('click', handleClick, { signal: eventController.signal });
    document.addEventListener('change', handleChange, { signal: eventController.signal });

    isInitialized = true;
    console.log('✅ Stadium-Modul bereit');
}

export function cleanup() {
    console.log('🧹 Cleanup Stadium-Modul');

    // Alle Events auf einmal entfernen
    eventController.abort();

    // Modals schließen
    closeStadiumModal();
    closeModal();

    // State zurücksetzen
    stadiumState = null;
    currentModal = null;
    isInitialized = false;
}