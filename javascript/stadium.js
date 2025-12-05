// =====================================================
// KICKERSCUP - STADIUM MANAGEMENT SYSTEM (V2.1 - SAFARI FIX)
// Stadion-Verwaltung mit Block-Click-Modals + Pitch-Renovation
// ✅ V2.1: Safari-kompatibler DOM-Cache, verzögertes Rendering
// =====================================================

import {
    ADVERTISING_CONFIG,
    BLOCKS,
    calculateBuildDays,
    calculateCapacityDistribution,
    calculateExpansionBuildWeeks,
    calculateExpansionCost,
    CAPACITY_CONFIG,
    createInitialState,
    EXPANSION_CONFIG,
    FLOODLIGHT_CONFIG,
    formatCapacity,
    formatCurrency,
    isValidBlock,
    PITCH_CONFIG,
    repairState,
    ROOF_CONFIG,
    TIMING_CONFIG,
    UI_TEXTS,
    validateState
} from './stadium-config.js';

import {bookSponsor, clearAllCaches, hasBlockAdvertising, hasBlockSponsor} from './stadium-sponsors.js';

import {
    clearTemplateCache,
    closeModal,
    getCurrentBlock,
    getSelectedForComparison,
    openSponsorSelectionModal,
    refreshSponsorSelectionModal,
    renderSponsorOverviewTab,
    showComparisonModal,
    showConfirmationModal,
    showSponsorDetailsModal,
    showSuccessModal,
    toggleComparisonMode,
    toggleSponsorForComparison
} from './stadium-sponsors-ui.js';

// =====================================================
// PERFORMANCE UTILITIES
// =====================================================

const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

const throttle = (fn, limit) => {
    let inThrottle = false;
    let lastArgs = null;

    return (...args) => {
        lastArgs = args;

        if (!inThrottle) {
            fn(...args);
            inThrottle = true;

            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    fn(...lastArgs);
                    lastArgs = null;
                }
            }, limit);
        }
    };
};

const batchDOMUpdates = (() => {
    let scheduled = false;
    let updates = [];

    return (updateFn) => {
        updates.push(updateFn);

        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(() => {
                const toExecute = updates;
                updates = [];
                scheduled = false;

                for (const fn of toExecute) {
                    fn();
                }
            });
        }
    };
})();

// =====================================================
// CONSTANTS
// =====================================================

const STORAGE_KEY = 'kickerscup_stadium_state';
const DEBOUNCE_DELAY = 150;
const SLIDER_THROTTLE = 16;

// =====================================================
// PRIVATE STATE
// =====================================================

let stadiumState = null;
let currentModal = null;
let isInitialized = false;
let eventController = new AbortController();

// =====================================================
// DOM CACHING - SAFARI FIX
// =====================================================

// SAFARI FIX: Kein Cache für DOM-Elemente mehr
// Stattdessen: Direkter Zugriff mit Null-Check

/**
 * Holt DOM-Element sicher (Safari-kompatibel)
 * Kein Caching mehr, da Safari timing-sensitiv ist
 */
const getElement = (id) => {
    return document.getElementById(id);
};

/**
 * Holt Block-Element sicher
 */
const getBlockElement = (block, type) => {
    const idMap = {
        capacity: `block${block}Capacity`,
        roof: `block${block}Roof`,
        ad: `block${block}Ad`
    };

    if (type === 'element') {
        return document.querySelector(`.stadium-block[data-block="${block}"]`);
    }

    return document.getElementById(idMap[type]);
};

/**
 * Sicheres Text-Update mit Null-Check
 */
const safeSetText = (element, text) => {
    if (element && element.textContent !== undefined) {
        element.textContent = text;
    }
};

/**
 * Sicheres Style-Update mit Null-Check
 */
const safeSetStyle = (element, property, value) => {
    if (element && element.style) {
        element.style[property] = value;
    }
};

const currentSeasonStats = {
    gamesPlayed: 12,
    goals: 23,
    wins: 8,
    leagueTitle: false,
    cupTitle: false
};

// =====================================================
// STATE MANAGEMENT
// =====================================================

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
            } else {
                stadiumState = parsed;
            }
            return stadiumState;
        }
    } catch (error) {
        console.error('❌ Fehler beim Laden:', error);
    }

    stadiumState = createInitialState();
    saveStadiumStateImmediate();
    return stadiumState;
};

const saveStadiumState = debounce(() => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stadiumState));
    } catch (error) {
        console.error('❌ Fehler beim Speichern:', error);
    }
}, DEBOUNCE_DELAY);

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

const isGameSeasonActive = () => {
    const {currentDay} = stadiumState;
    const {START_DAY, END_DAY} = TIMING_CONFIG.GAME_SEASON;
    return currentDay >= START_DAY && currentDay <= END_DAY;
};

const tickBuildTimer = () => {
    if (!isGameSeasonActive()) return;

    const {queue} = stadiumState.construction;
    let hasChanges = false;
    const completedProjects = [];

    for (let i = queue.length - 1; i >= 0; i--) {
        const project = queue[i];

        if (project.status === 'active') {
            project.remainingDays--;
            hasChanges = true;

            if (project.remainingDays <= 0) {
                completedProjects.push(project);
                queue.splice(i, 1);
                stadiumState.construction.active--;
            }
        }
    }

    for (const project of completedProjects) {
        completeConstruction(project);
    }

    startQueuedProjects();

    if (hasChanges) {
        saveStadiumState();
        batchDOMUpdates(() => {
            renderConstructionQueue();
            renderStadiumOverview();
        });
    }
};

const startQueuedProjects = () => {
    const {queue, active} = stadiumState.construction;
    const slotsAvailable = TIMING_CONFIG.MAX_PARALLEL_BUILDS - active;

    if (slotsAvailable <= 0) return;

    let started = 0;
    for (const project of queue) {
        if (project.status === 'queued' && started < slotsAvailable) {
            project.status = 'active';
            project.startDay = stadiumState.currentDay;
            stadiumState.construction.active++;
            started++;
        }
    }
};

const completeConstruction = (project) => {
    const handlers = {
        roof: () => {
            stadiumState.features.roofs[project.block] = true;
        },
        floodlight: () => {
            stadiumState.features.floodlight = project.targetStage;
        },
        pitch_renovation: () => {
            stadiumState.features.pitch.condition = 100;
        },
        advertising: () => {
            stadiumState.features.advertising[project.block] = true;
        },
        expansion: () => applyExpansion(project)
    };

    const handler = handlers[project.type];
    if (handler) handler();

    if (project.type === 'expansion') {
        clearAllCaches();
    }

    showNotification(`✅ ${project.name} abgeschlossen!`);
};

const applyExpansion = (project) => {
    const {block, additionalSeats} = project;
    const dist = stadiumState.capacity.distribution[block];

    dist.capacity += additionalSeats;

    const hasBoxes = block === CAPACITY_CONFIG.FIXED_BOX_BLOCK;
    const newDist = calculateCapacityDistribution(dist.capacity, hasBoxes);

    Object.assign(dist, newDist);
    recalculateTotalCapacity();
};

const recalculateTotalCapacity = () => {
    let total = 0, standing = 0, seated = 0, boxes = 0;

    for (const block of BLOCKS) {
        const dist = stadiumState.capacity.distribution[block];
        total += dist.capacity;
        standing += dist.standing;
        seated += dist.seated;
        boxes += dist.boxes || 0;
    }

    Object.assign(stadiumState.capacity, {total, standing, seated});
    stadiumState.capacity.boxes.total = boxes;
};

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
};

// =====================================================
// NOTIFICATION SYSTEM
// =====================================================

const showNotification = (message) => {
    alert(message);
};

// =====================================================
// MODAL SYSTEM
// =====================================================

const openBlockExpansionModal = (block) => {
    if (!isValidBlock(block)) return;

    const dist = stadiumState.capacity.distribution[block];
    const currentCapacity = dist.capacity;
    const maxCapacity = CAPACITY_CONFIG.MAX_CAPACITY / 4;

    if (currentCapacity >= maxCapacity) {
        showNotification(`❌ ${UI_TEXTS.blocks[block]} ist bereits maximal ausgebaut!`);
        return;
    }

    const {minStep, maxStep: configMaxStep} = EXPANSION_CONFIG;
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

    const slider = modal.querySelector('#capacitySlider');
    const confirmBtn = modal.querySelector('#confirmExpansionBtn');

    // Throttled Slider Update
    const throttledUpdatePreview = throttle(() => {
        const additionalSeats = parseInt(slider.value, 10);
        updateExpansionPreview(block, currentCapacity, additionalSeats, maxStep);
    }, SLIDER_THROTTLE);

    slider.addEventListener('input', throttledUpdatePreview, {signal: eventController.signal});

    confirmBtn.addEventListener('click', () => {
        confirmBlockExpansion(block, parseInt(slider.value, 10));
    }, {signal: eventController.signal});

    updateExpansionPreview(block, currentCapacity, initialValue, maxStep);

    requestAnimationFrame(() => modal.classList.add('active'));
};

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

    batchDOMUpdates(() => {
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
    });
};

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

const openPitchRenovationModal = () => {
    const {condition} = stadiumState.features.pitch;
    const {cost, buildWeeks} = PITCH_CONFIG.renovation;
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
        confirmBtn.addEventListener('click', confirmPitchRenovation, {signal: eventController.signal});
    }

    requestAnimationFrame(() => modal.classList.add('active'));
};

const confirmPitchRenovation = () => {
    const {cost, buildWeeks} = PITCH_CONFIG.renovation;
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

    const {cost, buildWeeks} = ROOF_CONFIG;
    const duration = calculateBuildDays(buildWeeks);

    if (!confirm(`Dach für ${UI_TEXTS.blocks[block]}?\n\n${formatCurrency(cost)}\n${duration} Tage`)) return;

    addConstructionProject({type: 'roof', name: `Dach ${UI_TEXTS.blocks[block]}`, block, duration, cost});
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

    addConstructionProject({
        type: 'floodlight',
        name: `Flutlicht: ${stage.name}`,
        targetStage: nextStage,
        duration,
        cost: stage.cost
    });
    showNotification(`🔨 Flutlicht-Upgrade gestartet!`);
};

const installAdvertising = (block) => {
    if (!isValidBlock(block)) return;

    if (stadiumState.features.advertising[block]) {
        showNotification(`❌ ${UI_TEXTS.blocks[block]} hat bereits Werbung!`);
        return;
    }

    const {cost, buildWeeks} = ADVERTISING_CONFIG;
    const duration = calculateBuildDays(buildWeeks);

    if (!confirm(`Werbung für ${UI_TEXTS.blocks[block]}?\n\n${formatCurrency(cost)}\n${duration} Tage`)) return;

    addConstructionProject({type: 'advertising', name: `Werbung ${UI_TEXTS.blocks[block]}`, block, duration, cost});
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
                batchDOMUpdates(() => {
                    renderStadiumOverview();
                    const container = document.getElementById('sponsorOverviewContainer');
                    if (container) {
                        container.innerHTML = renderSponsorOverviewTab(stadiumState, currentSeasonStats);
                    }
                });
            }, 500);
        }
    } catch (error) {
        showNotification(`❌ ${error.message}`);
        closeModal();
    }
};

// =====================================================
// RENDERING - SAFARI FIX
// =====================================================

/**
 * SAFARI FIX: Direkter DOM-Zugriff ohne Caching
 * Jeder Aufruf holt frische Element-Referenzen
 */
const renderStadiumOverview = () => {
    const {capacity, features} = stadiumState;
    const stage = FLOODLIGHT_CONFIG.stages[features.floodlight];
    const condition = features.pitch.condition;
    const conditionColor = condition > 70 ? '#68d391' : condition > 40 ? '#f6ad55' : '#fc8181';

    // SAFARI FIX: Direkte getElementById-Aufrufe statt gecachte Referenzen
    batchDOMUpdates(() => {
        // Hauptkapazitäten
        safeSetText(getElement('totalCapacity'), formatCapacity(capacity.total));
        safeSetText(getElement('standingCapacity'), formatCapacity(capacity.standing));
        safeSetText(getElement('seatedCapacity'), formatCapacity(capacity.seated));
        safeSetText(getElement('boxesCapacity'), formatCapacity(capacity.boxes.total));

        // Flutlicht & Rasen
        safeSetText(getElement('floodlightStage'), stage.name);
        safeSetText(getElement('floodlightStage2'), stage.name);
        safeSetText(getElement('pitchType'), 'British');

        const pitchConditionEl = getElement('pitchCondition');
        if (pitchConditionEl) {
            pitchConditionEl.textContent = `${condition}%`;
            pitchConditionEl.style.color = conditionColor;
        }

        // Block-Kapazitäten - SAFARI FIX: Jedes Element einzeln abrufen
        for (const block of BLOCKS) {
            const dist = capacity.distribution[block];

            // Kapazität
            const capacityEl = getElement(`block${block}Capacity`);
            if (capacityEl) {
                capacityEl.textContent = formatCapacity(dist.capacity);
            }

            // Dach-Status
            const roofEl = getElement(`block${block}Roof`);
            if (roofEl) {
                roofEl.textContent = features.roofs[block] ? '✅ Ja' : '❌ Nein';
            }

            // Werbung-Status
            const adEl = getElement(`block${block}Ad`);
            if (adEl) {
                adEl.textContent = features.advertising[block] ? '✅ Ja' : '❌ Nein';
            }
        }
    });

    // Visualisierung separat aktualisieren
    batchDOMUpdates(() => {
        updateStadiumVisualization();
    });
};

const updateStadiumVisualization = () => {
    const {features} = stadiumState;

    for (const block of BLOCKS) {
        const blockEl = document.querySelector(`.stadium-block[data-block="${block}"]`);
        if (!blockEl) continue;

        const roofIcon = blockEl.querySelector('.roof-icon');
        if (roofIcon) roofIcon.style.display = features.roofs[block] ? 'block' : 'none';

        const boxesIcon = blockEl.querySelector('.boxes-icon');
        if (boxesIcon && block === CAPACITY_CONFIG.FIXED_BOX_BLOCK) {
            boxesIcon.style.display = 'block';
        }

        blockEl.classList.toggle('has-advertising', features.advertising[block]);
    }

    const pitchEl = document.querySelector('.stadium-pitch');
    if (pitchEl) {
        pitchEl.classList.remove('pitch-normal', 'pitch-dirt');
        pitchEl.classList.add('pitch-british');
    }
};

const renderConstructionQueue = () => {
    const queueContainer = getElement('constructionQueue');
    if (!queueContainer) return;

    const {queue} = stadiumState.construction;

    if (!queue.length) {
        queueContainer.innerHTML = '<p class="no-construction">Keine laufenden Bauprojekte</p>';
        return;
    }

    const cardsHTML = queue.map(project => {
        const progress = ((project.duration - project.remainingDays) / project.duration) * 100;
        const statusText = UI_TEXTS.constructionStatus[project.status];

        return `
            <div class="construction-card glass">
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
            </div>
        `;
    }).join('');

    batchDOMUpdates(() => {
        queueContainer.innerHTML = cardsHTML;
    });
};

const switchFeatureTab = (tabName) => {
    const tabIdMap = {
        blocks: 'tabBlocks',
        infrastructure: 'tabInfrastructure',
        sponsors: 'tabSponsors',
        construction: 'tabConstruction'
    };

    batchDOMUpdates(() => {
        document.querySelectorAll('.feature-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

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
    });
};

// =====================================================
// EVENT HANDLING
// =====================================================

const actionHandlers = {
    openBlockExpansion: (target) => openBlockExpansionModal(target.dataset.block),
    openPitchRenovation: () => openPitchRenovationModal(),
    closeStadiumModal: () => closeStadiumModal(),
    buildRoof: (target) => buildRoof(target.dataset.block),
    upgradeFloodlight: () => upgradeFloodlight(),
    installAdvertising: (target) => installAdvertising(target.dataset.block),
    manageSponsor: (target) => manageSponsor(target.dataset.block),
    openSponsorSelection: (target) => openSponsorSelectionModal(target.dataset.block, stadiumState),
    showSponsorDetails: (target) => showSponsorDetailsModal(parseInt(target.dataset.sponsorId, 10), stadiumState),
    confirmBooking: (target) => showConfirmationModal(parseInt(target.dataset.sponsorId, 10), stadiumState),
    finalizeBooking: (target) => finalizeSponsorBooking(parseInt(target.dataset.sponsorId, 10)),
    toggleComparisonMode: () => {
        toggleComparisonMode();
        refreshSponsorSelectionModal(stadiumState);
    },
    toggleComparison: (target) => {
        const sponsorId = parseInt(target.dataset.sponsorId, 10);
        if (toggleSponsorForComparison(sponsorId)) {
            showComparisonModal(getSelectedForComparison(), stadiumState);
        } else {
            refreshSponsorSelectionModal(stadiumState);
        }
    },
    closeModal: () => closeModal(),
    closeModalAndRefresh: () => {
        closeModal();
        renderStadiumOverview();
        switchFeatureTab('sponsors');
    },
    backToSelection: () => {
        closeModal(false);
        setTimeout(() => openSponsorSelectionModal(getCurrentBlock(), stadiumState), 100);
    },
    backToDetails: (target) => {
        closeModal(false);
        setTimeout(() => showSponsorDetailsModal(parseInt(target.dataset.sponsorId, 10), stadiumState), 100);
    },
    goToSponsorOverview: () => {
        closeModal();
        switchFeatureTab('sponsors');
    },
    simulateDay: () => simulateDay()
};

const handleClick = (e) => {
    const tabTarget = e.target.closest('[data-tab]');
    if (tabTarget) {
        switchFeatureTab(tabTarget.dataset.tab);
        return;
    }

    const actionTarget = e.target.closest('[data-action]');
    if (!actionTarget) return;

    const handler = actionHandlers[actionTarget.dataset.action];
    if (handler) {
        handler(actionTarget);
    }
};

const simulateDay = () => {
    stadiumState.currentDay++;

    if (stadiumState.currentDay > 31) {
        stadiumState.currentDay = 1;
        stadiumState.currentMonth++;
    }

    if (stadiumState.currentDay % 7 === 0) {
        const roofCount = Object.values(stadiumState.features.roofs).filter(Boolean).length;
        const wearReduction = roofCount * ROOF_CONFIG.pitchWearReduction;
        const actualWear = PITCH_CONFIG.BASE_WEAR_PER_MATCH * (1 - wearReduction);

        stadiumState.features.pitch.condition = Math.max(0, stadiumState.features.pitch.condition - actualWear);
    }

    tickBuildTimer();
    saveStadiumState();

    const currentDayEl = getElement('currentDay');
    if (currentDayEl) {
        currentDayEl.textContent = stadiumState.currentDay;
    }
};

// =====================================================
// MODULE LIFECYCLE - SAFARI FIX
// =====================================================

export function init() {
    if (isInitialized) {
        console.warn('Stadium-Modul bereits initialisiert');
        return;
    }

    console.log('🎬 Initialisiere Stadium-Modul (V2.1 Safari Fix)');

    if (eventController.signal.aborted) {
        eventController = new AbortController();
    }

    loadStadiumState();

    // SAFARI FIX: Verzögertes Rendering, um sicherzustellen dass DOM bereit ist
    // Safari braucht manchmal etwas länger, bis alle Elemente verfügbar sind
    const doInitialRender = () => {
        batchDOMUpdates(() => {
            renderStadiumOverview();
            renderConstructionQueue();
        });
    };

    // Prüfen ob DOM-Elemente bereits verfügbar sind
    const testElement = document.getElementById('totalCapacity');

    if (testElement) {
        // DOM ist bereit - sofort rendern
        doInitialRender();
    } else {
        // SAFARI FIX: DOM noch nicht bereit - mit kleiner Verzögerung versuchen
        console.log('⏳ Safari-Modus: Warte auf DOM...');

        // Mehrere Versuche mit steigender Verzögerung
        let attempts = 0;
        const maxAttempts = 5;

        const tryRender = () => {
            attempts++;
            const el = document.getElementById('totalCapacity');

            if (el || attempts >= maxAttempts) {
                if (el) {
                    console.log(`✅ DOM bereit nach ${attempts} Versuch(en)`);
                } else {
                    console.warn('⚠️ DOM-Elemente nicht gefunden - rendere trotzdem');
                }
                doInitialRender();
            } else {
                // Exponentielles Backoff: 10ms, 20ms, 40ms, 80ms, 160ms
                setTimeout(tryRender, 10 * Math.pow(2, attempts));
            }
        };

        // Ersten Versuch nach 10ms starten
        setTimeout(tryRender, 10);
    }

    document.addEventListener('click', handleClick, {signal: eventController.signal});

    isInitialized = true;
    console.log('✅ Stadium-Modul bereit (V2.1 Safari Fix)');
}

export function cleanup() {
    console.log('🧹 Cleanup Stadium-Modul');

    eventController.abort();

    closeStadiumModal();
    closeModal();

    clearAllCaches();
    clearTemplateCache();

    stadiumState = null;
    currentModal = null;
    isInitialized = false;
}

export const getPerformanceStats = () => ({
    isInitialized,
    stateLoaded: stadiumState !== null
});

if (typeof window !== 'undefined') {
    window.getStadiumStats = getPerformanceStats;
}