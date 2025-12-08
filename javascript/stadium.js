// =====================================================
// KICKERSCUP - STADIUM MANAGEMENT SYSTEM (V3.0 - ES2025)
// Stadion-Verwaltung mit Block-Click-Modals + Pitch-Renovation
// ✅ V3.0: Vollständige ES2025-Modernisierung
// ✅ AbortController für Event Cleanup
// ✅ Promise.allSettled für robuste Operations
// ✅ Error Causes für strukturiertes Debugging
// ✅ Immutable Configuration mit Object.freeze
// ✅ Optional Chaining & Nullish Coalescing
// ✅ Konsistentes DOM-Handling ohne Caching
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
// IMMUTABLE CONFIGURATION
// ✅ ES2025: Object.freeze für Configuration
// =====================================================

const CONFIG = Object.freeze({
    STORAGE_KEY: 'kickerscup_stadium_state',
    DEBOUNCE_DELAY: 150,
    SLIDER_THROTTLE: 16,
    RENDER_BATCH_SIZE: 10
});

const TIMING = Object.freeze({
    GAME_SEASON: Object.freeze({
        START_DAY: 1,
        END_DAY: 27
    }),
    MAX_PARALLEL_BUILDS: 2
});

// =====================================================
// PERFORMANCE UTILITIES
// ✅ ES2025: WeakMap für besseres Memory Management
// =====================================================

const debouncedFunctions = new WeakMap();
const throttledFunctions = new WeakMap();

/**
 * Debounce mit WeakMap-Caching
 * ✅ ES2025: Verhindert Duplicate Wrappers
 */
const debounce = (fn, delay) => {
    if (debouncedFunctions.has(fn)) {
        return debouncedFunctions.get(fn);
    }

    let timeoutId;
    const debounced = (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };

    debouncedFunctions.set(fn, debounced);
    return debounced;
};

/**
 * Throttle mit WeakMap-Caching
 * ✅ ES2025: Optimiertes Rate-Limiting
 */
const throttle = (fn, limit) => {
    if (throttledFunctions.has(fn)) {
        return throttledFunctions.get(fn);
    }

    let inThrottle = false;
    let lastArgs = null;

    const throttled = (...args) => {
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

    throttledFunctions.set(fn, throttled);
    return throttled;
};

/**
 * RequestAnimationFrame-basiertes Batching
 * ✅ ES2025: Optimiertes DOM-Update-Batching
 */
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
                    try {
                        fn();
                    } catch (error) {
                        const batchError = new Error('DOM batch update failed');
                        batchError.cause = error;
                        console.error('❌ Batch update error:', batchError);
                    }
                }
            });
        }
    };
})();

// =====================================================
// PRIVATE STATE
// ✅ ES2025: Klare Trennung zwischen Config (frozen) und State (mutable)
// =====================================================

let stadiumState = null;
let currentModal = null;
let isInitialized = false;

// ✅ ES2025: AbortController für Event Cleanup
let eventController = new AbortController();

// Mock für Testing/Development
const currentSeasonStats = {
    gamesPlayed: 12,
    goals: 23,
    wins: 8,
    leagueTitle: false,
    cupTitle: false
};

// =====================================================
// STATE MANAGEMENT
// ✅ ES2025: Strukturiertes Error Handling mit Error Causes
// =====================================================

/**
 * Lädt Stadium State aus LocalStorage
 * ✅ ES2025: Error Causes für besseres Debugging
 */
const loadStadiumState = () => {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);

        if (stored) {
            const parsed = JSON.parse(stored);
            const validation = validateState(parsed);

            if (!validation.valid) {
                console.warn('⚠️ State validation failed:', validation.errors);
                stadiumState = repairState(parsed);
                saveStadiumStateImmediate();
            } else {
                stadiumState = parsed;
            }
            return stadiumState;
        }
    } catch (error) {
        const loadError = new Error('Failed to load stadium state');
        loadError.cause = error;
        console.error('❌ Load error:', loadError);
    }

    stadiumState = createInitialState();
    saveStadiumStateImmediate();
    return stadiumState;
};

/**
 * Speichert State debounced
 * ✅ ES2025: Optimiertes Debouncing
 */
const saveStadiumState = debounce(() => {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(stadiumState));
    } catch (error) {
        const saveError = new Error('Failed to save stadium state');
        saveError.cause = error;
        console.error('❌ Save error:', saveError);
    }
}, CONFIG.DEBOUNCE_DELAY);

/**
 * Speichert State sofort (für kritische Operations)
 */
const saveStadiumStateImmediate = () => {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(stadiumState));
    } catch (error) {
        const saveError = new Error('Failed to save stadium state immediately');
        saveError.cause = error;
        console.error('❌ Immediate save error:', saveError);
    }
};

// =====================================================
// DOM UTILITIES
// ✅ ES2025: Kein Caching, Optional Chaining für Safety
// =====================================================

/**
 * Sicheres Text-Update mit Optional Chaining
 * ✅ ES2025: Defensive DOM-Manipulation
 */
const safeSetText = (id, text) => {
    const element = document.getElementById(id);
    if (element?.textContent !== undefined) {
        element.textContent = text;
    }
};

/**
 * Sicheres Style-Update mit Optional Chaining
 * ✅ ES2025: Defensive Style-Manipulation
 */
const safeSetStyle = (id, property, value) => {
    const element = document.getElementById(id);
    if (element?.style) {
        element.style[property] = value;
    }
};

/**
 * Sicheres HTML-Update mit Optional Chaining
 * ✅ ES2025: Defensive HTML-Manipulation
 */
const safeSetHTML = (id, html) => {
    const element = document.getElementById(id);
    if (element) {
        element.innerHTML = html;
    }
};

/**
 * Batch-Update mehrerer Text-Elemente
 * ✅ ES2025: Optimiertes Multi-Element Update
 */
const batchSetText = (updates) => {
    batchDOMUpdates(() => {
        for (const [id, text] of updates) {
            safeSetText(id, text);
        }
    });
};

// =====================================================
// BAUZEITEN-SYSTEM
// ✅ ES2025: Strukturierte Error Recovery
// =====================================================

/**
 * Prüft ob Spielsaison aktiv ist
 * ✅ ES2025: Nullish Coalescing für Default Values
 */
const isGameSeasonActive = () => {
    const currentDay = stadiumState?.currentDay ?? 1;
    return currentDay >= TIMING.GAME_SEASON.START_DAY
        && currentDay <= TIMING.GAME_SEASON.END_DAY;
};

/**
 * Aktualisiert Rasen-Typ basierend auf Condition
 * ✅ FIX: British -> Normal -> Dirt (Kuhkoppel)
 */
const updatePitchType = () => {
    const condition = stadiumState?.features?.pitch?.condition ?? 100;

    // Bestimme Rasen-Typ basierend auf Condition
    let pitchType;
    if (condition >= 70) {
        pitchType = 'british'; // Premium-Rasen
    } else if (condition >= 40) {
        pitchType = 'normal';  // Standard-Rasen
    } else {
        pitchType = 'dirt';    // Kuhkoppel
    }

    // Speichere Typ im State (für Persistenz)
    if (!stadiumState.features.pitch.type) {
        stadiumState.features.pitch.type = pitchType;
    } else if (stadiumState.features.pitch.type !== pitchType) {
        stadiumState.features.pitch.type = pitchType;
        console.log(`🌱 Rasen-Typ geändert: ${pitchType} (${condition}%)`);
    }
};

/**
 * Tick des Build-Timers
 * ✅ ES2025: Promise.allSettled für robuste Completion Handling
 */
const tickBuildTimer = async () => {
    if (!isGameSeasonActive()) return;

    const queue = stadiumState?.construction?.queue;
    if (!queue?.length) return;

    let hasChanges = false;
    const completedProjects = [];

    // Tick active projects
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

    // ✅ ES2025: Promise.allSettled für parallele Completions
    if (completedProjects.length > 0) {
        const completionResults = await Promise.allSettled(
            completedProjects.map(project => completeConstruction(project))
        );

        // Log failures but continue
        for (const [index, result] of completionResults.entries()) {
            if (result.status === 'rejected') {
                const project = completedProjects[index];
                console.error(`❌ Failed to complete ${project.name}:`, result.reason);
            }
        }
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

/**
 * Startet wartende Projekte
 * ✅ ES2025: Nullish Coalescing
 */
const startQueuedProjects = () => {
    const {queue, active} = stadiumState?.construction ?? {queue: [], active: 0};
    const slotsAvailable = TIMING.MAX_PARALLEL_BUILDS - active;

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

/**
 * Schließt Bauprojekt ab
 * ✅ ES2025: Error Causes für strukturiertes Error Handling
 */
const completeConstruction = async (project) => {
    try {
        const handlers = new Map([
            ['roof', () => {
                stadiumState.features.roofs[project.block] = true;
            }],
            ['floodlight', () => {
                stadiumState.features.floodlight = project.targetStage;
            }],
            ['pitch_renovation', () => {
                stadiumState.features.pitch.condition = 100;
                // ✅ FIX: Rasen-Typ zurücksetzen auf British
                stadiumState.features.pitch.type = 'british';
            }],
            ['advertising', () => {
                stadiumState.features.advertising[project.block] = true;
            }],
            ['expansion', () => applyExpansion(project)]
        ]);

        const handler = handlers.get(project.type);

        if (!handler) {
            throw new Error(`Unknown project type: ${project.type}`);
        }

        handler();

        if (project.type === 'expansion') {
            clearAllCaches();
        }

        showNotification(`✅ ${project.name} abgeschlossen!`);

    } catch (error) {
        const contextError = new Error(`Failed to complete construction: ${project.name}`);
        contextError.cause = error;
        console.error('❌ Construction completion error:', contextError);
        throw contextError;
    }
};

/**
 * Wendet Tribünen-Ausbau an
 * ✅ ES2025: Optional Chaining für sichere Property Access
 */
const applyExpansion = (project) => {
    const {block, additionalSeats} = project;
    const dist = stadiumState?.capacity?.distribution?.[block];

    if (!dist) {
        throw new Error(`Invalid block distribution: ${block}`);
    }

    dist.capacity += additionalSeats;

    const hasBoxes = block === CAPACITY_CONFIG.FIXED_BOX_BLOCK;
    const newDist = calculateCapacityDistribution(dist.capacity, hasBoxes);

    Object.assign(dist, newDist);
    recalculateTotalCapacity();
};

/**
 * Berechnet Gesamt-Kapazität neu
 * ✅ ES2025: Array.reduce für elegantere Summierung
 */
const recalculateTotalCapacity = () => {
    const totals = BLOCKS.reduce((acc, block) => {
        const dist = stadiumState.capacity.distribution[block];
        return {
            total: acc.total + dist.capacity,
            standing: acc.standing + dist.standing,
            seated: acc.seated + dist.seated,
            boxes: acc.boxes + (dist.boxes ?? 0)
        };
    }, {total: 0, standing: 0, seated: 0, boxes: 0});

    Object.assign(stadiumState.capacity, totals);
    stadiumState.capacity.boxes.total = totals.boxes;
};

/**
 * Fügt Bauprojekt zur Queue hinzu
 * ✅ ES2025: Strukturierte Project-Erstellung
 */
const addConstructionProject = (projectData) => {
    const canStartImmediately = stadiumState.construction.active < TIMING.MAX_PARALLEL_BUILDS;

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
// ✅ ES2025: Error Handling mit Error Causes
// =====================================================

/**
 * Öffnet Block-Ausbau Modal
 * ✅ ES2025: Strukturierte Validation
 */
const openBlockExpansionModal = (block) => {
    try {
        if (!isValidBlock(block)) {
            throw new Error(`Invalid block: ${block}`);
        }

        const dist = stadiumState?.capacity?.distribution?.[block];
        if (!dist) {
            throw new Error(`Block distribution not found: ${block}`);
        }

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

        modal.innerHTML = renderBlockExpansionModalContent(block, dist, initialValue, maxStep);

        document.body.appendChild(modal);
        currentModal = modal;

        setupBlockExpansionModal(modal, block, currentCapacity, maxStep);

        requestAnimationFrame(() => modal.classList.add('active'));

    } catch (error) {
        const modalError = new Error('Failed to open block expansion modal');
        modalError.cause = error;
        console.error('❌ Modal error:', modalError);
        showNotification('❌ Fehler beim Öffnen des Ausbau-Menüs');
    }
};

/**
 * Rendert Block-Ausbau Modal Content
 * ✅ ES2025: Template-basiertes Rendering
 */
const renderBlockExpansionModalContent = (block, dist, initialValue, maxStep) => {
    const {minStep} = EXPANSION_CONFIG;

    return `
        <div class="stadium-modal-content">
            <div class="stadium-modal-header">
                <h2>🏗️ ${UI_TEXTS.blocks[block]} ausbauen</h2>
                <button class="stadium-modal-close" data-action="closeStadiumModal">&times;</button>
            </div>
            
            <div class="stadium-modal-body">
                <div class="block-info-section">
                    <div class="block-info-row">
                        <span class="block-info-label">Kapazität:</span>
                        <span class="block-info-value">${formatCapacity(dist.capacity)}</span>
                    </div>
                    <div class="block-info-row">
                        <span class="block-info-label">Stehplätze:</span>
                        <span class="block-info-value">${formatCapacity(dist.standing)}</span>
                    </div>
                    <div class="block-info-row">
                        <span class="block-info-label">Sitzplätze:</span>
                        <span class="block-info-value">${formatCapacity(dist.seated)}</span>
                    </div>
                    ${dist.boxes > 0 ? `
                        <div class="block-info-row">
                            <span class="block-info-label">Logen:</span>
                            <span class="block-info-value">${formatCapacity(dist.boxes)}</span>
                        </div>
                    ` : ''}
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
};

/**
 * Setup Block-Ausbau Modal Events
 * ✅ ES2025: Throttled Updates mit WeakMap-Caching
 */
const setupBlockExpansionModal = (modal, block, currentCapacity, maxStep) => {
    const slider = modal.querySelector('#capacitySlider');
    const confirmBtn = modal.querySelector('#confirmExpansionBtn');

    if (!slider || !confirmBtn) {
        console.error('❌ Modal elements not found');
        return;
    }

    // ✅ ES2025: Throttled Update für bessere Performance
    const updatePreview = (additionalSeats) => {
        updateExpansionPreview(block, currentCapacity, additionalSeats, maxStep);
    };
    const throttledUpdate = throttle(updatePreview, CONFIG.SLIDER_THROTTLE);

    slider.addEventListener('input', () => {
        throttledUpdate(parseInt(slider.value, 10));
    }, {signal: eventController.signal});

    confirmBtn.addEventListener('click', () => {
        confirmBlockExpansion(block, parseInt(slider.value, 10));
    }, {signal: eventController.signal});

    // Initial preview
    updatePreview(parseInt(slider.value, 10));
};

/**
 * Aktualisiert Expansion Preview
 * ✅ ES2025: Batch DOM Updates
 */
const updateExpansionPreview = (block, currentCapacity, additionalSeats, maxStep) => {
    const newCapacity = currentCapacity + additionalSeats;
    const cost = calculateExpansionCost(block, additionalSeats);
    const buildWeeks = calculateExpansionBuildWeeks(additionalSeats);
    const buildDays = calculateBuildDays(buildWeeks);

    const hasBoxes = block === CAPACITY_CONFIG.FIXED_BOX_BLOCK;
    const newDist = calculateCapacityDistribution(newCapacity, hasBoxes);

    batchDOMUpdates(() => {
        safeSetText('sliderValue', `+${formatCapacity(additionalSeats)}`);

        const slider = document.getElementById('capacitySlider');
        if (slider) {
            slider.style.setProperty('--slider-progress', `${(additionalSeats / maxStep) * 100}%`);
        }

        const previewHTML = `
            <h3>📊 Vorschau</h3>
            <div class="preview-row">
                <span class="preview-label">Neue Kapazität:</span>
                <span class="preview-value highlight">${formatCapacity(currentCapacity)} → ${formatCapacity(newCapacity)}</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">Stehplätze:</span>
                <span class="preview-value">${formatCapacity(newDist.standing)}</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">Sitzplätze:</span>
                <span class="preview-value">${formatCapacity(newDist.seated)}</span>
            </div>
            ${newDist.boxes > 0 ? `
                <div class="preview-row">
                    <span class="preview-label">Logen:</span>
                    <span class="preview-value">${formatCapacity(newDist.boxes)}</span>
                </div>
            ` : ''}
            <div class="preview-row">
                <span class="preview-label">Kosten:</span>
                <span class="preview-value highlight">${formatCurrency(cost)}</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">Bauzeit:</span>
                <span class="preview-value">${buildWeeks} SW (${buildDays} Tage)</span>
            </div>
        `;

        safeSetHTML('expansionPreview', previewHTML);
    });
};

/**
 * Bestätigt Block-Ausbau
 * ✅ ES2025: Strukturierte Confirmation
 */
const confirmBlockExpansion = (block, additionalSeats) => {
    const cost = calculateExpansionCost(block, additionalSeats);
    const buildWeeks = calculateExpansionBuildWeeks(additionalSeats);
    const buildDays = calculateBuildDays(buildWeeks);

    const confirmMessage = `Tribünen-Ausbau ${UI_TEXTS.blocks[block]}?\n\n+${formatCapacity(additionalSeats)} Plätze\n${formatCurrency(cost)}\n${buildDays} Tage`;

    if (!confirm(confirmMessage)) {
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
 * ✅ ES2025: Strukturiertes Modal Rendering
 */
const openPitchRenovationModal = () => {
    try {
        const condition = stadiumState?.features?.pitch?.condition ?? 100;
        const {cost, buildWeeks} = PITCH_CONFIG.renovation;
        const buildDays = calculateBuildDays(buildWeeks);

        const conditionClass = condition >= 70 ? 'excellent'
            : condition >= 40 ? 'good'
                : 'poor';

        const modal = document.createElement('div');
        modal.className = 'stadium-modal';
        modal.id = 'pitchRenovationModal';

        modal.innerHTML = renderPitchRenovationModalContent(condition, conditionClass, cost, buildDays);

        document.body.appendChild(modal);
        currentModal = modal;

        // ✅ ES2025: Optional Chaining für Event Setup
        const confirmBtn = modal.querySelector('#confirmRenovationBtn');
        confirmBtn?.addEventListener('click', confirmPitchRenovation, {signal: eventController.signal});

        requestAnimationFrame(() => modal.classList.add('active'));

    } catch (error) {
        const modalError = new Error('Failed to open pitch renovation modal');
        modalError.cause = error;
        console.error('❌ Modal error:', modalError);
        showNotification('❌ Fehler beim Öffnen des Rasen-Menüs');
    }
};

/**
 * Rendert Pitch-Renovation Modal Content
 * ✅ ES2025: Template-basiertes Rendering
 */
const renderPitchRenovationModalContent = (condition, conditionClass, cost, buildDays) => {
    return `
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
};

/**
 * Bestätigt Pitch-Renovation
 */
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

/**
 * Schließt Stadium Modal
 * ✅ ES2025: Optional Chaining für sichere DOM-Manipulation
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
// ✅ ES2025: Map für strukturierte Handler
// =====================================================

/**
 * Baut Dach für Block
 */
const buildRoof = (block) => {
    try {
        if (!isValidBlock(block)) {
            throw new Error(`Invalid block: ${block}`);
        }

        if (stadiumState?.features?.roofs?.[block]) {
            showNotification(`❌ ${UI_TEXTS.blocks[block]} hat bereits ein Dach!`);
            return;
        }

        const {cost, buildWeeks} = ROOF_CONFIG;
        const duration = calculateBuildDays(buildWeeks);

        if (!confirm(`Dach für ${UI_TEXTS.blocks[block]}?\n\n${formatCurrency(cost)}\n${duration} Tage`)) {
            return;
        }

        addConstructionProject({
            type: 'roof',
            name: `Dach ${UI_TEXTS.blocks[block]}`,
            block,
            duration,
            cost
        });

        showNotification(`🔨 Dachbau gestartet!`);

    } catch (error) {
        const roofError = new Error('Failed to build roof');
        roofError.cause = error;
        console.error('❌ Roof construction error:', roofError);
        showNotification('❌ Fehler beim Dachbau');
    }
};

/**
 * Upgraded Flutlicht
 */
const upgradeFloodlight = () => {
    try {
        const currentStage = stadiumState?.features?.floodlight ?? 0;
        const nextStage = currentStage + 1;

        if (nextStage >= FLOODLIGHT_CONFIG.stages.length) {
            showNotification('❌ Flutlicht bereits maximal!');
            return;
        }

        const stage = FLOODLIGHT_CONFIG.stages[nextStage];
        const duration = calculateBuildDays(stage.buildWeeks);
        const tvBonus = ((stage.tvRevenueMultiplier - 1) * 100).toFixed(0);

        if (!confirm(`Flutlicht → "${stage.name}"?\n\n${formatCurrency(stage.cost)}\n${duration} Tage\n+${tvBonus}% TV`)) {
            return;
        }

        addConstructionProject({
            type: 'floodlight',
            name: `Flutlicht: ${stage.name}`,
            targetStage: nextStage,
            duration,
            cost: stage.cost
        });

        showNotification(`🔨 Flutlicht-Upgrade gestartet!`);

    } catch (error) {
        const floodlightError = new Error('Failed to upgrade floodlight');
        floodlightError.cause = error;
        console.error('❌ Floodlight upgrade error:', floodlightError);
        showNotification('❌ Fehler beim Flutlicht-Upgrade');
    }
};

/**
 * Installiert Werbebande
 */
const installAdvertising = (block) => {
    try {
        if (!isValidBlock(block)) {
            throw new Error(`Invalid block: ${block}`);
        }

        if (stadiumState?.features?.advertising?.[block]) {
            showNotification(`❌ ${UI_TEXTS.blocks[block]} hat bereits Werbung!`);
            return;
        }

        const {cost, buildWeeks} = ADVERTISING_CONFIG;
        const duration = calculateBuildDays(buildWeeks);

        if (!confirm(`Werbung für ${UI_TEXTS.blocks[block]}?\n\n${formatCurrency(cost)}\n${duration} Tage`)) {
            return;
        }

        addConstructionProject({
            type: 'advertising',
            name: `Werbung ${UI_TEXTS.blocks[block]}`,
            block,
            duration,
            cost
        });

        showNotification(`🔨 Werbeinstallation gestartet!`);

    } catch (error) {
        const adError = new Error('Failed to install advertising');
        adError.cause = error;
        console.error('❌ Advertising installation error:', adError);
        showNotification('❌ Fehler bei Werbeinstallation');
    }
};

/**
 * Öffnet Sponsor-Verwaltung
 */
const manageSponsor = (block) => {
    try {
        if (!isValidBlock(block)) {
            throw new Error(`Invalid block: ${block}`);
        }

        if (!hasBlockAdvertising(stadiumState, block)) {
            showNotification(`❌ Bitte zuerst Werbebande installieren!`);
            return;
        }

        if (hasBlockSponsor(stadiumState, block)) {
            showNotification(`ℹ️ ${UI_TEXTS.blocks[block]} hat bereits einen Sponsor.`);
            return;
        }

        openSponsorSelectionModal(block, stadiumState);

    } catch (error) {
        const sponsorError = new Error('Failed to manage sponsor');
        sponsorError.cause = error;
        console.error('❌ Sponsor management error:', sponsorError);
        showNotification('❌ Fehler bei Sponsor-Verwaltung');
    }
};

/**
 * Finalisiert Sponsor-Buchung
 * ✅ ES2025: Strukturiertes Error Handling
 */
const finalizeSponsorBooking = (sponsorId) => {
    const block = getCurrentBlock();

    try {
        const result = bookSponsor(stadiumState, block, sponsorId);

        if (result.success) {
            saveStadiumStateImmediate();
            showSuccessModal(result.sponsor, result.initialPayment);

            // Deferred UI update nach Modal-Animation
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
        const bookingError = new Error('Failed to finalize sponsor booking');
        bookingError.cause = error;
        console.error('❌ Sponsor booking error:', bookingError);
        showNotification(`❌ ${error.message}`);
        closeModal();
    }
};

// =====================================================
// RENDERING
// ✅ ES2025: Batch-Updates mit Optional Chaining
// =====================================================

/**
 * Rendert Stadium Overview
 * ✅ FIX: Pitch Type wird jetzt dynamisch gesetzt
 */
const renderStadiumOverview = () => {
    try {
        const {capacity, features} = stadiumState ?? {};
        if (!capacity || !features) {
            console.warn('⚠️ Invalid stadium state for rendering');
            return;
        }

        const stage = FLOODLIGHT_CONFIG.stages[features.floodlight];
        const condition = features.pitch?.condition ?? 100;

        // ✅ FIX: Pitch Type Name basierend auf Condition
        let pitchTypeName;
        if (condition >= 70) {
            pitchTypeName = 'British Premium';
        } else if (condition >= 40) {
            pitchTypeName = 'Normal';
        } else {
            pitchTypeName = 'Kuhkoppel';
        }

        // ✅ FIX: Condition Color
        const conditionColor = condition > 70 ? '#68d391'
            : condition > 40 ? '#f6ad55'
                : '#fc8181';

        // ✅ ES2025: Batch alle Updates zusammen
        batchDOMUpdates(() => {
            // Hauptkapazitäten
            const capacityUpdates = [
                ['totalCapacity', formatCapacity(capacity.total)],
                ['standingCapacity', formatCapacity(capacity.standing)],
                ['seatedCapacity', formatCapacity(capacity.seated)],
                ['boxesCapacity', formatCapacity(capacity.boxes?.total ?? 0)],
                ['floodlightStage', stage.name],
                ['floodlightStage2', stage.name],
                ['pitchType', pitchTypeName] // ✅ FIX: Dynamischer Name
            ];

            batchSetText(capacityUpdates);

            // ✅ FIX: Pitch Condition mit Style
            const pitchConditionEl = document.getElementById('pitchCondition');
            if (pitchConditionEl) {
                pitchConditionEl.textContent = `${condition}%`;
                pitchConditionEl.style.color = conditionColor;
            }

            // Block-Updates
            for (const block of BLOCKS) {
                const dist = capacity.distribution[block];

                safeSetText(`block${block}Capacity`, formatCapacity(dist.capacity));
                safeSetText(`block${block}Roof`, features.roofs[block] ? '✅ Ja' : '❌ Nein');
                safeSetText(`block${block}Ad`, features.advertising[block] ? '✅ Ja' : '❌ Nein');
            }
        });

        // ✅ FIX: Visualisierung aktualisieren (inkl. Pitch Type)
        updateStadiumVisualization();

    } catch (error) {
        const renderError = new Error('Failed to render stadium overview');
        renderError.cause = error;
        console.error('❌ Render error:', renderError);
    }
};

/**
 * Aktualisiert Stadium-Visualisierung
 * ✅ FIX: Pitch Type CSS-Klasse wird jetzt dynamisch gesetzt
 */
const updateStadiumVisualization = () => {
    const {features} = stadiumState ?? {};
    if (!features) return;

    for (const block of BLOCKS) {
        const blockEl = document.querySelector(`.stadium-block[data-block="${block}"]`);
        if (!blockEl) continue;

        // Roof Icon
        const roofIcon = blockEl.querySelector('.roof-icon');
        if (roofIcon) {
            roofIcon.style.display = features.roofs[block] ? 'block' : 'none';
        }

        // Boxes Icon (nur SUED)
        const boxesIcon = blockEl.querySelector('.boxes-icon');
        if (boxesIcon && block === CAPACITY_CONFIG.FIXED_BOX_BLOCK) {
            boxesIcon.style.display = 'block';
        }

        // Advertising Class
        blockEl.classList.toggle('has-advertising', features.advertising[block]);
    }

    // ✅ FIX: Pitch Type dynamisch basierend auf Condition
    const pitchEl = document.querySelector('.stadium-pitch');
    if (pitchEl) {
        const condition = features.pitch?.condition ?? 100;

        // Entferne alle Pitch-Type Klassen
        pitchEl.classList.remove('pitch-british', 'pitch-normal', 'pitch-dirt');

        // Setze richtige Klasse basierend auf Condition
        if (condition >= 70) {
            pitchEl.classList.add('pitch-british');
        } else if (condition >= 40) {
            pitchEl.classList.add('pitch-normal');
        } else {
            pitchEl.classList.add('pitch-dirt');
        }
    }
};

/**
 * Rendert Construction Queue
 * ✅ ES2025: Template-basiertes Rendering
 */
const renderConstructionQueue = () => {
    const queueContainer = document.getElementById('constructionQueue');
    if (!queueContainer) return;

    const queue = stadiumState?.construction?.queue ?? [];

    if (queue.length === 0) {
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
                    <div class="detail-row">
                        <span>Verbleibend:</span>
                        <span>${project.remainingDays} Tage</span>
                    </div>
                    <div class="detail-row">
                        <span>Kosten:</span>
                        <span>${formatCurrency(project.cost)}</span>
                    </div>
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

/**
 * Wechselt Feature-Tab
 * ✅ ES2025: Batch DOM Updates
 */
const switchFeatureTab = (tabName) => {
    const tabIdMap = {
        blocks: 'tabBlocks',
        infrastructure: 'tabInfrastructure',
        sponsors: 'tabSponsors',
        construction: 'tabConstruction'
    };

    batchDOMUpdates(() => {
        // Update buttons
        document.querySelectorAll('.feature-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Hide all content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show target content
        const targetContent = document.getElementById(tabIdMap[tabName]);
        if (targetContent) {
            targetContent.classList.add('active');

            // Lazy-load sponsor overview
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
// ✅ ES2025: Map für strukturierte Action Handlers
// =====================================================

const ACTION_HANDLERS = new Map([
    ['openBlockExpansion', (target) => openBlockExpansionModal(target.dataset.block)],
    ['openPitchRenovation', () => openPitchRenovationModal()],
    ['closeStadiumModal', () => closeStadiumModal()],
    ['buildRoof', (target) => buildRoof(target.dataset.block)],
    ['upgradeFloodlight', () => upgradeFloodlight()],
    ['installAdvertising', (target) => installAdvertising(target.dataset.block)],
    ['manageSponsor', (target) => manageSponsor(target.dataset.block)],
    ['openSponsorSelection', (target) => openSponsorSelectionModal(target.dataset.block, stadiumState)],
    ['showSponsorDetails', (target) => showSponsorDetailsModal(parseInt(target.dataset.sponsorId, 10), stadiumState)],
    ['confirmBooking', (target) => showConfirmationModal(parseInt(target.dataset.sponsorId, 10), stadiumState)],
    ['finalizeBooking', (target) => finalizeSponsorBooking(parseInt(target.dataset.sponsorId, 10))],
    ['toggleComparisonMode', () => {
        toggleComparisonMode();
        refreshSponsorSelectionModal(stadiumState);
    }],
    ['toggleComparison', (target) => {
        const sponsorId = parseInt(target.dataset.sponsorId, 10);
        if (toggleSponsorForComparison(sponsorId)) {
            showComparisonModal(getSelectedForComparison(), stadiumState);
        } else {
            refreshSponsorSelectionModal(stadiumState);
        }
    }],
    ['closeModal', () => closeModal()],
    ['closeModalAndRefresh', () => {
        closeModal();
        renderStadiumOverview();
        switchFeatureTab('sponsors');
    }],
    ['backToSelection', () => {
        closeModal(false);
        setTimeout(() => openSponsorSelectionModal(getCurrentBlock(), stadiumState), 100);
    }],
    ['backToDetails', (target) => {
        closeModal(false);
        setTimeout(() => showSponsorDetailsModal(parseInt(target.dataset.sponsorId, 10), stadiumState), 100);
    }],
    ['goToSponsorOverview', () => {
        closeModal();
        switchFeatureTab('sponsors');
    }],
    ['simulateDay', () => simulateDay()]
]);

/**
 * Globaler Click-Handler
 * ✅ ES2025: Map-basierte Handler-Lookup
 */
const handleClick = (e) => {
    // Tab-Switching
    const tabTarget = e.target.closest('[data-tab]');
    if (tabTarget) {
        switchFeatureTab(tabTarget.dataset.tab);
        return;
    }

    // Action-Handler
    const actionTarget = e.target.closest('[data-action]');
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;
    const handler = ACTION_HANDLERS.get(action);

    if (handler) {
        try {
            handler(actionTarget);
        } catch (error) {
            const handlerError = new Error(`Action handler failed: ${action}`);
            handlerError.cause = error;
            console.error('❌ Handler error:', handlerError);
            showNotification('❌ Aktion fehlgeschlagen');
        }
    } else {
        console.warn(`⚠️ Unknown action: ${action}`);
    }
};

/**
 * Simuliert einen Tag
 * ✅ ES2025: Async/Await für Tick-Timer
 */
/**
 * Simuliert einen Tag
 * ✅ FIX: Render Stadium Overview nach Rasen-Abnutzung
 */
const simulateDay = async () => {
    try {
        stadiumState.currentDay++;

        if (stadiumState.currentDay > 31) {
            stadiumState.currentDay = 1;
            stadiumState.currentMonth++;
        }

        // Rasen-Abnutzung bei Spieltagen
        if (stadiumState.currentDay % 7 === 0) {
            const roofCount = Object.values(stadiumState.features.roofs).filter(Boolean).length;
            const wearReduction = roofCount * ROOF_CONFIG.pitchWearReduction;
            const actualWear = PITCH_CONFIG.BASE_WEAR_PER_MATCH * (1 - wearReduction);

            stadiumState.features.pitch.condition = Math.max(
                0,
                stadiumState.features.pitch.condition - actualWear
            );

            // ✅ FIX: Rasen-Typ basierend auf Condition aktualisieren
            updatePitchType();
        }

        await tickBuildTimer();
        saveStadiumState();

        // ✅ FIX: Stadium Overview neu rendern um Rasen-Zustand zu zeigen
        safeSetText('currentDay', stadiumState.currentDay);
        renderStadiumOverview();

    } catch (error) {
        const simulateError = new Error('Failed to simulate day');
        simulateError.cause = error;
        console.error('❌ Simulation error:', simulateError);
        showNotification('❌ Tag-Simulation fehlgeschlagen');
    }
};

// =====================================================
// MODULE LIFECYCLE
// ✅ ES2025: AbortController für Event Cleanup
// =====================================================

/**
 * Initialisiert Stadium-Modul
 * ✅ ES2025: Strukturiertes Init mit Error Handling
 */
export function init() {
    if (isInitialized) {
        console.warn('⚠️ Stadium-Modul bereits initialisiert');
        return;
    }

    console.log('🎬 Initialisiere Stadium-Modul (V3.0 ES2025)');

    try {
        // ✅ ES2025: Reset AbortController wenn aborted
        if (eventController.signal.aborted) {
            eventController = new AbortController();
        }

        // Load state
        loadStadiumState();

        // ✅ ES2025: Delayed rendering für Safari-Kompatibilität
        const doInitialRender = () => {
            try {
                batchDOMUpdates(() => {
                    renderStadiumOverview();
                    renderConstructionQueue();
                });
            } catch (error) {
                const renderError = new Error('Initial render failed');
                renderError.cause = error;
                console.error('❌ Initial render error:', renderError);
                throw renderError;
            }
        };

        // Check if DOM ready
        const testElement = document.getElementById('totalCapacity');

        if (testElement) {
            doInitialRender();
        } else {
            // ✅ ES2025: Exponential backoff für DOM-Readiness
            console.log('⏳ Warte auf DOM-Bereitschaft...');

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
                    setTimeout(tryRender, 10 * Math.pow(2, attempts));
                }
            };

            setTimeout(tryRender, 10);
        }

        // ✅ ES2025: Event Listener mit AbortController
        const signal = eventController.signal;
        document.addEventListener('click', handleClick, {signal});

        isInitialized = true;
        console.log('✅ Stadium-Modul bereit (V3.0 ES2025)');

    } catch (error) {
        const initError = new Error('Stadium module initialization failed');
        initError.cause = error;
        console.error('❌ Critical init error:', initError);
        throw initError;
    }
}

/**
 * Cleanup Stadium-Modul
 * ✅ ES2025: Vollständiger Cleanup mit AbortController
 */
export function cleanup() {
    console.log('🧹 Cleanup Stadium-Modul (V3.0)');

    try {
        // ✅ ES2025: Ein Aufruf entfernt ALLE Events
        eventController.abort();
        eventController = new AbortController();

        closeStadiumModal();
        closeModal();

        clearAllCaches();
        clearTemplateCache();

        // Clear WeakMaps (GC will handle cleanup)
        debouncedFunctions.clear?.();
        throttledFunctions.clear?.();

        stadiumState = null;
        currentModal = null;
        isInitialized = false;

        console.log('✅ Stadium-Modul cleanup abgeschlossen');

    } catch (error) {
        const cleanupError = new Error('Stadium cleanup failed');
        cleanupError.cause = error;
        console.error('❌ Cleanup error:', cleanupError);
    }
}

/**
 * Performance Stats für Debugging
 * ✅ ES2025: Strukturierte Stats
 */
export const getPerformanceStats = () => ({
    isInitialized,
    stateLoaded: stadiumState !== null,
    modalOpen: currentModal !== null,
    constructionActive: stadiumState?.construction?.active ?? 0,
    constructionQueued: stadiumState?.construction?.queue?.length ?? 0,
    eventControllerAborted: eventController.signal.aborted
});

// Debug-Funktion global verfügbar machen
if (typeof window !== 'undefined') {
    window.getStadiumStats = getPerformanceStats;
}
