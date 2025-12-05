// =====================================================
// KICKERSCUP - STADIUM MANAGEMENT SYSTEM (ESM) - OPTIMIZED
// Stadion-Verwaltung mit Block-Click-Modals + Pitch-Renovation
// ✅ Logen fix in SUED, Expansion via Slider, vereinfachtes Rasen-System
// =====================================================

import {
    CAPACITY_CONFIG,
    TIMING_CONFIG,
    ROOF_CONFIG,
    FLOODLIGHT_CONFIG,
    PITCH_CONFIG,
    ADVERTISING_CONFIG,
    EXPANSION_CONFIG,
    INITIAL_STADIUM_STATE,
    UI_TEXTS,
    calculateBuildDays,
    formatCurrency,
    formatCapacity,
    calculateCapacityDistribution,
    calculateExpansionCost,
    calculateExpansionBuildWeeks
} from './stadium-config.js';

// Sponsor-Imports
import {
    bookSponsor,
    hasBlockSponsor,
    hasBlockAdvertising
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
// PRIVATE STATE
// =====================================================

let stadiumState = null;
const eventListeners = [];
let buildTimerInterval = null;
let currentModal = null;

// Mock current season stats für Sponsor-Übersicht
const currentSeasonStats = {
    gamesPlayed: 12,
    goals: 23,
    wins: 8,
    leagueTitle: false,
    cupTitle: false
};

// LocalStorage Key
const STORAGE_KEY = 'kickerscup_stadium_state';

// =====================================================
// HELPER: EVENT LISTENERS
// =====================================================

const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;
    element.addEventListener(event, handler, options);
    eventListeners.push({ element, event, handler, options });
};

// =====================================================
// STATE MANAGEMENT
// =====================================================

/**
 * Lädt Stadion-State aus LocalStorage oder initialisiert neu
 */
const loadStadiumState = () => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
        try {
            stadiumState = JSON.parse(stored);
            console.log('✓ Stadion-State aus LocalStorage geladen');
            return stadiumState;
        } catch (error) {
            console.error('❌ Fehler beim Laden des Stadium-States:', error);
        }
    }

    // Fallback: Initialer Zustand
    stadiumState = JSON.parse(JSON.stringify(INITIAL_STADIUM_STATE));
    saveStadiumState();
    console.log('✓ Neuer Stadion-State initialisiert');
    return stadiumState;
};

/**
 * Speichert Stadion-State in LocalStorage
 */
const saveStadiumState = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stadiumState));
    } catch (error) {
        console.error('❌ Fehler beim Speichern des Stadium-States:', error);
    }
};

// =====================================================
// BAUZEITEN-SYSTEM
// =====================================================

/**
 * Prüft ob aktuell Spielbetrieb ist (Tag 1-27)
 */
const isGameSeasonActive = () => {
    const day = stadiumState.currentDay;
    return day >= TIMING_CONFIG.GAME_SEASON.START_DAY &&
        day <= TIMING_CONFIG.GAME_SEASON.END_DAY;
};

/**
 * Aktualisiert Bau-Queue (wird einmal pro Tag aufgerufen)
 */
const tickBuildTimer = () => {
    if (!isGameSeasonActive()) {
        console.log('⏸️ Bauarbeiten pausiert (außerhalb Spielbetrieb)');
        return;
    }

    const queue = stadiumState.construction.queue;

    queue.forEach((project, index) => {
        if (project.status === 'active') {
            project.remainingDays--;

            if (project.remainingDays <= 0) {
                completeConstruction(project);
                queue.splice(index, 1);
                stadiumState.construction.active--;
            }
        }
    });

    // Starte wartende Projekte wenn Platz frei
    startQueuedProjects();

    saveStadiumState();
    renderConstructionQueue();
    renderStadiumOverview();
};

/**
 * Startet wartende Bauprojekte
 */
const startQueuedProjects = () => {
    const queue = stadiumState.construction.queue;
    const active = stadiumState.construction.active;

    if (active >= TIMING_CONFIG.MAX_PARALLEL_BUILDS) return;

    const queued = queue.filter(p => p.status === 'queued');
    const slotsAvailable = TIMING_CONFIG.MAX_PARALLEL_BUILDS - active;

    queued.slice(0, slotsAvailable).forEach(project => {
        project.status = 'active';
        project.startDay = stadiumState.currentDay;
        stadiumState.construction.active++;
        console.log(`🔨 Baustart: ${project.name}`);
    });
};

/**
 * Schließt ein Bauprojekt ab
 */
const completeConstruction = (project) => {
    console.log(`✅ Bauabschluss: ${project.name}`);

    switch (project.type) {
        case 'roof':
            stadiumState.features.roofs[project.block] = true;
            break;

        case 'floodlight':
            stadiumState.features.floodlight = project.targetStage;
            break;

        case 'pitch_renovation':
            stadiumState.features.pitch.condition = 100;
            break;

        case 'advertising':
            stadiumState.features.advertising[project.block] = true;
            break;

        case 'expansion':
            applyExpansion(project);
            break;
    }

    alert(`✅ Bauprojekt abgeschlossen!\n\n${project.name} ist nun verfügbar.`);
};

/**
 * Wendet Tribünen-Ausbau an (nach Bauabschluss)
 */
const applyExpansion = (project) => {
    const block = project.block;
    const additionalSeats = project.additionalSeats;

    // Update Kapazität
    stadiumState.capacity.distribution[block].capacity += additionalSeats;

    // Berechne neue Verteilung für diesen Block
    const hasBoxes = block === CAPACITY_CONFIG.FIXED_BOX_BLOCK;
    const newCapacity = stadiumState.capacity.distribution[block].capacity;
    const dist = calculateCapacityDistribution(newCapacity, hasBoxes);

    stadiumState.capacity.distribution[block].standing = dist.standing;
    stadiumState.capacity.distribution[block].seated = dist.seated;
    stadiumState.capacity.distribution[block].boxes = dist.boxes;

    // Berechne Gesamt-Kapazität neu
    recalculateTotalCapacity();

    console.log(`✅ Tribünen-Ausbau ${UI_TEXTS.blocks[block]} abgeschlossen (+${formatCapacity(additionalSeats)} Plätze)`);
};

/**
 * Berechnet Gesamt-Kapazität neu
 */
const recalculateTotalCapacity = () => {
    let totalCapacity = 0;
    let totalStanding = 0;
    let totalSeated = 0;
    let totalBoxes = 0;

    CAPACITY_CONFIG.BLOCKS.forEach(block => {
        const dist = stadiumState.capacity.distribution[block];
        totalCapacity += dist.capacity;
        totalStanding += dist.standing;
        totalSeated += dist.seated;
        totalBoxes += dist.boxes || 0;
    });

    stadiumState.capacity.total = totalCapacity;
    stadiumState.capacity.standing = totalStanding;
    stadiumState.capacity.seated = totalSeated;
    stadiumState.capacity.boxes.total = totalBoxes;
};

/**
 * Fügt ein neues Bauprojekt zur Queue hinzu
 */
const addConstructionProject = (projectData) => {
    // Prüfe Parallel-Bau-Limit
    const canStartImmediately = stadiumState.construction.active < TIMING_CONFIG.MAX_PARALLEL_BUILDS;

    const project = {
        id: `${projectData.type}_${Date.now()}`,
        type: projectData.type,
        name: projectData.name,
        block: projectData.block || null,
        targetStage: projectData.targetStage || null,
        additionalSeats: projectData.additionalSeats || null,
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

    saveStadiumState();
    renderConstructionQueue();

    console.log(`📋 Bauprojekt hinzugefügt: ${project.name} (${project.status})`);
};

// =====================================================
// MODAL SYSTEM: BLOCK-EXPANSION
// =====================================================

/**
 * Öffnet Block-Expansion Modal mit Slider
 */
const openBlockExpansionModal = (block) => {
    const dist = stadiumState.capacity.distribution[block];
    const currentCapacity = dist.capacity;
    const maxCapacity = CAPACITY_CONFIG.MAX_CAPACITY / 4; // 37.500 pro Block
    const minStep = EXPANSION_CONFIG.minStep;
    const maxStep = Math.min(
        EXPANSION_CONFIG.maxStep,
        maxCapacity - currentCapacity
    );

    if (currentCapacity >= maxCapacity) {
        alert(`❌ ${UI_TEXTS.blocks[block]} ist bereits maximal ausgebaut!`);
        return;
    }

    // Erstelle Modal
    const modal = document.createElement('div');
    modal.className = 'stadium-modal';
    modal.id = 'blockExpansionModal';

    // Initial-Wert für Slider
    const initialValue = Math.min(1000, maxStep);

    modal.innerHTML = `
        <div class="stadium-modal-content">
            <div class="stadium-modal-header">
                <h2>🏗️ ${UI_TEXTS.blocks[block]} ausbauen</h2>
                <button class="stadium-modal-close" data-action="closeStadiumModal">&times;</button>
            </div>
            
            <div class="stadium-modal-body">
                <div class="block-info-section">
                    <div class="block-info-row">
                        <span class="block-info-label">Aktuelle Kapazität:</span>
                        <span class="block-info-value">${formatCapacity(currentCapacity)}</span>
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
                    
                    <input type="range" 
                           class="capacity-slider" 
                           id="capacitySlider"
                           min="${minStep}" 
                           max="${maxStep}" 
                           step="${minStep}"
                           value="${initialValue}"
                           style="--slider-progress: ${(initialValue / maxStep) * 100}%">
                    
                    <div class="slider-bounds">
                        <span>Min: ${formatCapacity(minStep)}</span>
                        <span>Max: ${formatCapacity(maxStep)}</span>
                    </div>
                </div>
                
                <div class="expansion-preview" id="expansionPreview">
                    <!-- Wird dynamisch aktualisiert -->
                </div>
            </div>
            
            <div class="stadium-modal-footer">
                <button class="btn btn-secondary" data-action="closeStadiumModal">Abbrechen</button>
                <button class="btn btn-primary" id="confirmExpansionBtn">
                    🔨 Ausbau starten
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    currentModal = modal;

    // Slider Event
    const slider = modal.querySelector('#capacitySlider');
    const updatePreview = () => {
        const additionalSeats = parseInt(slider.value);
        updateExpansionPreview(block, currentCapacity, additionalSeats);

        // Update Slider-Progress CSS Variable
        const progress = ((additionalSeats - minStep) / (maxStep - minStep)) * 100;
        slider.style.setProperty('--slider-progress', `${progress}%`);
    };

    slider.addEventListener('input', updatePreview);

    // Confirm Button
    const confirmBtn = modal.querySelector('#confirmExpansionBtn');
    confirmBtn.addEventListener('click', () => {
        const additionalSeats = parseInt(slider.value);
        confirmBlockExpansion(block, additionalSeats);
    });

    // Initial Preview
    updatePreview();

    // Fade-in
    setTimeout(() => modal.classList.add('active'), 10);
};

/**
 * Aktualisiert Expansion-Preview
 */
const updateExpansionPreview = (block, currentCapacity, additionalSeats) => {
    const previewEl = document.getElementById('expansionPreview');
    const sliderValueEl = document.getElementById('sliderValue');

    if (!previewEl || !sliderValueEl) return;

    const newCapacity = currentCapacity + additionalSeats;
    const cost = calculateExpansionCost(block, additionalSeats);
    const buildWeeks = calculateExpansionBuildWeeks(additionalSeats);
    const buildDays = calculateBuildDays(buildWeeks);

    // Neue Verteilung berechnen
    const hasBoxes = block === CAPACITY_CONFIG.FIXED_BOX_BLOCK;
    const newDist = calculateCapacityDistribution(newCapacity, hasBoxes);

    sliderValueEl.textContent = `+${formatCapacity(additionalSeats)}`;

    previewEl.innerHTML = `
        <h3>📊 Vorschau</h3>
        
        <div class="preview-row">
            <span class="preview-label">Neue Kapazität:</span>
            <span class="preview-value highlight">
                ${formatCapacity(currentCapacity)}
                <span class="preview-arrow">→</span>
                ${formatCapacity(newCapacity)}
            </span>
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
};

/**
 * Bestätigt Block-Expansion
 */
const confirmBlockExpansion = (block, additionalSeats) => {
    const cost = calculateExpansionCost(block, additionalSeats);
    const buildWeeks = calculateExpansionBuildWeeks(additionalSeats);
    const buildDays = calculateBuildDays(buildWeeks);

    if (!confirm(
        `Tribünen-Ausbau ${UI_TEXTS.blocks[block]} starten?\n\n` +
        `Ausbau: +${formatCapacity(additionalSeats)} Plätze\n` +
        `Kosten: ${formatCurrency(cost)}\n` +
        `Bauzeit: ${buildWeeks} SW (${buildDays} Tage)`
    )) {
        return;
    }

    addConstructionProject({
        type: 'expansion',
        name: `Tribünen-Ausbau ${UI_TEXTS.blocks[block]} (+${formatCapacity(additionalSeats)})`,
        block: block,
        additionalSeats: additionalSeats,
        duration: buildDays,
        cost: cost
    });

    closeStadiumModal();
    alert(`🔨 Tribünen-Ausbau ${UI_TEXTS.blocks[block]} gestartet!\n\nBauzeit: ${buildDays} Tage`);
};

// =====================================================
// MODAL SYSTEM: PITCH-RENOVATION
// =====================================================

/**
 * Öffnet Pitch-Renovation Modal
 */
const openPitchRenovationModal = () => {
    const condition = stadiumState.features.pitch.condition;
    const cost = PITCH_CONFIG.renovation.cost;
    const buildWeeks = PITCH_CONFIG.renovation.buildWeeks;
    const buildDays = calculateBuildDays(buildWeeks);

    // Condition-Klasse für Farbe
    let conditionClass = 'excellent';
    if (condition < 70) conditionClass = 'good';
    if (condition < 40) conditionClass = 'poor';

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
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 15px;">
                        ${PITCH_CONFIG.description}
                    </p>
                    
                    <div class="pitch-condition-bar">
                        <div class="pitch-condition-fill ${conditionClass}" style="width: ${condition}%"></div>
                    </div>
                    
                    <div class="pitch-condition-text">
                        Aktueller Zustand: <strong>${condition}%</strong>
                    </div>
                    
                    <div class="pitch-degradation-info">
                        ⚠️ Rasen verschlechtert sich um ~${PITCH_CONFIG.BASE_WEAR_PER_MATCH}% pro Spiel<br>
                        💰 Wartung: ${formatCurrency(PITCH_CONFIG.renovation.maintenanceCost)} pro Monat
                    </div>
                </div>
                
                ${condition < 100 ? `
                    <div class="renovation-info">
                        <h4>🔨 Renovation durchführen:</h4>
                        <ul>
                            <li>Zustand wird auf 100% wiederhergestellt</li>
                            <li>Kosten: ${formatCurrency(cost)}</li>
                            <li>Bauzeit: ${buildWeeks} SW (${buildDays} Tage)</li>
                            <li>Während der Bauzeit: Kein Heimspiel möglich</li>
                        </ul>
                    </div>
                ` : `
                    <div class="renovation-info">
                        <h4>✅ Rasen in perfektem Zustand!</h4>
                        <ul>
                            <li>Keine Renovation notwendig</li>
                            <li>Regelmäßige Wartung gewährleistet beste Qualität</li>
                        </ul>
                    </div>
                `}
                
                ${condition < 40 ? `
                    <div class="modal-warning">
                        <span class="modal-warning-icon">⚠️</span>
                        <div class="modal-warning-text">
                            <strong>Kritischer Zustand!</strong><br>
                            Schlechter Rasen erhöht das Verletzungsrisiko und senkt die Team-Performance.
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="stadium-modal-footer">
                <button class="btn btn-secondary" data-action="closeStadiumModal">Schließen</button>
                ${condition < 100 ? `
                    <button class="btn btn-primary" id="confirmRenovationBtn">
                        🔨 Renovation starten
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    currentModal = modal;

    // Confirm Button
    const confirmBtn = modal.querySelector('#confirmRenovationBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => confirmPitchRenovation());
    }

    // Fade-in
    setTimeout(() => modal.classList.add('active'), 10);
};

/**
 * Bestätigt Rasen-Renovation
 */
const confirmPitchRenovation = () => {
    const cost = PITCH_CONFIG.renovation.cost;
    const buildWeeks = PITCH_CONFIG.renovation.buildWeeks;
    const buildDays = calculateBuildDays(buildWeeks);

    if (!confirm(
        `Rasen renovieren?\n\n` +
        `Kosten: ${formatCurrency(cost)}\n` +
        `Bauzeit: ${buildWeeks} SW (${buildDays} Tage)\n` +
        `Zustand: ${stadiumState.features.pitch.condition}% → 100%\n\n` +
        `⚠️ Während der Bauzeit: Kein Heimspiel möglich!`
    )) {
        return;
    }

    addConstructionProject({
        type: 'pitch_renovation',
        name: `Rasen-Renovation (British Premium)`,
        duration: buildDays,
        cost: cost
    });

    closeStadiumModal();
    alert(`🔨 Rasen-Renovation gestartet!\n\nBauzeit: ${buildDays} Tage`);
};

/**
 * Schließt Stadium-Modal
 */
const closeStadiumModal = () => {
    if (currentModal) {
        currentModal.classList.remove('active');
        setTimeout(() => {
            currentModal.remove();
            currentModal = null;
        }, 300);
    }
};

// =====================================================
// FEATURE-MANAGEMENT (vereinfacht)
// =====================================================

/**
 * Baut ein Dach auf einem Block
 */
const buildRoof = (block) => {
    if (stadiumState.features.roofs[block]) {
        alert(`❌ ${UI_TEXTS.blocks[block]} hat bereits ein Dach!`);
        return;
    }

    const cost = ROOF_CONFIG.cost;
    const duration = calculateBuildDays(ROOF_CONFIG.buildWeeks);

    if (!confirm(`Dach für ${UI_TEXTS.blocks[block]} bauen?\n\nKosten: ${formatCurrency(cost)}\nBauzeit: ${ROOF_CONFIG.buildWeeks} SW (${duration} Tage)`)) {
        return;
    }

    addConstructionProject({
        type: 'roof',
        name: `Dach ${UI_TEXTS.blocks[block]}`,
        block: block,
        duration: duration,
        cost: cost
    });

    alert(`🔨 Dachbau für ${UI_TEXTS.blocks[block]} gestartet!`);
};

/**
 * Upgraded Flutlicht
 */
const upgradeFloodlight = () => {
    const currentStage = stadiumState.features.floodlight;
    const nextStage = currentStage + 1;

    if (nextStage >= FLOODLIGHT_CONFIG.stages.length) {
        alert('❌ Flutlicht ist bereits maximal ausgebaut!');
        return;
    }

    const stageConfig = FLOODLIGHT_CONFIG.stages[nextStage];
    const cost = stageConfig.cost;
    const duration = calculateBuildDays(stageConfig.buildWeeks);

    if (!confirm(`Flutlicht auf "${stageConfig.name}" upgraden?\n\nKosten: ${formatCurrency(cost)}\nBauzeit: ${stageConfig.buildWeeks} SW (${duration} Tage)\nTV-Bonus: +${((stageConfig.tvRevenueMultiplier - 1) * 100).toFixed(0)}%`)) {
        return;
    }

    addConstructionProject({
        type: 'floodlight',
        name: `Flutlicht: ${stageConfig.name}`,
        targetStage: nextStage,
        duration: duration,
        cost: cost
    });

    alert(`🔨 Flutlicht-Upgrade gestartet!`);
};

/**
 * Installiert Werbung auf einem Block
 */
const installAdvertising = (block) => {
    if (stadiumState.features.advertising[block]) {
        alert(`❌ ${UI_TEXTS.blocks[block]} hat bereits Werbung!`);
        return;
    }

    const cost = ADVERTISING_CONFIG.cost;
    const duration = calculateBuildDays(ADVERTISING_CONFIG.buildWeeks);

    if (!confirm(`Werbung für ${UI_TEXTS.blocks[block]} installieren?\n\nKosten: ${formatCurrency(cost)}\nBauzeit: ${ADVERTISING_CONFIG.buildWeeks} SW (${duration} Tage)`)) {
        return;
    }

    addConstructionProject({
        type: 'advertising',
        name: `Werbung ${UI_TEXTS.blocks[block]}`,
        block: block,
        duration: duration,
        cost: cost
    });

    alert(`🔨 Werbeinstallation für ${UI_TEXTS.blocks[block]} gestartet!`);
};

// =====================================================
// SPONSOR-MANAGEMENT
// =====================================================

/**
 * Öffnet Sponsor-Verwaltung für einen Block
 */
const manageSponsor = (block) => {
    // Prüfe ob Werbebande installiert ist
    if (!hasBlockAdvertising(stadiumState, block)) {
        alert(`❌ Bitte installiere zuerst die Werbebande für ${UI_TEXTS.blocks[block]}!`);
        return;
    }

    // Prüfe ob bereits Sponsor vorhanden
    if (hasBlockSponsor(stadiumState, block)) {
        alert(`ℹ️ ${UI_TEXTS.blocks[block]} hat bereits einen Sponsor.\n\nVerträge können während der Saison nicht geändert werden.`);
        return;
    }

    // Öffne Sponsor-Auswahl
    openSponsorSelectionModal(block, stadiumState);
};

/**
 * Finalisiert Sponsor-Buchung
 */
const finalizeSponsorBooking = (sponsorId) => {
    const block = getCurrentBlock();

    try {
        const result = bookSponsor(stadiumState, block, sponsorId);

        if (result.success) {
            saveStadiumState();
            showSuccessModal(result.sponsor, result.initialPayment);

            // Update UI
            setTimeout(() => {
                renderStadiumOverview();
                renderSponsorOverviewTab(stadiumState, currentSeasonStats);
            }, 500);
        }
    } catch (error) {
        alert(`❌ Fehler beim Buchen: ${error.message}`);
        closeModal();
    }
};

// =====================================================
// RENDERING
// =====================================================

/**
 * Rendert Stadion-Übersicht
 */
const renderStadiumOverview = () => {
    // Kapazität
    const totalCapacity = document.getElementById('totalCapacity');
    const standingCapacity = document.getElementById('standingCapacity');
    const seatedCapacity = document.getElementById('seatedCapacity');
    const boxesCapacity = document.getElementById('boxesCapacity');

    if (totalCapacity) totalCapacity.textContent = formatCapacity(stadiumState.capacity.total);
    if (standingCapacity) standingCapacity.textContent = formatCapacity(stadiumState.capacity.standing);
    if (seatedCapacity) seatedCapacity.textContent = formatCapacity(stadiumState.capacity.seated);
    if (boxesCapacity) boxesCapacity.textContent = formatCapacity(stadiumState.capacity.boxes.total);

    // Block-Details
    CAPACITY_CONFIG.BLOCKS.forEach(block => {
        const dist = stadiumState.capacity.distribution[block];
        const blockCapEl = document.getElementById(`block${block}Capacity`);

        if (blockCapEl) {
            blockCapEl.textContent = formatCapacity(dist.capacity);
        }

        // Roof-Status
        const roofEl = document.getElementById(`block${block}Roof`);
        if (roofEl) {
            roofEl.textContent = stadiumState.features.roofs[block] ? '✅ Ja' : '❌ Nein';
        }

        // Advertising-Status
        const adEl = document.getElementById(`block${block}Ad`);
        if (adEl) {
            adEl.textContent = stadiumState.features.advertising[block] ? '✅ Ja' : '❌ Nein';
        }
    });

    // Floodlight
    const floodlightEl = document.getElementById('floodlightStage');
    const floodlightEl2 = document.getElementById('floodlightStage2');
    const stage = FLOODLIGHT_CONFIG.stages[stadiumState.features.floodlight];

    if (floodlightEl) floodlightEl.textContent = stage.name;
    if (floodlightEl2) floodlightEl2.textContent = stage.name;

    // Pitch
    const pitchTypeEl = document.getElementById('pitchType');
    const pitchConditionEl = document.getElementById('pitchCondition');

    if (pitchTypeEl) {
        pitchTypeEl.textContent = 'British';
    }

    if (pitchConditionEl) {
        const condition = stadiumState.features.pitch.condition;
        pitchConditionEl.textContent = `${condition}%`;

        // Farbe basierend auf Zustand
        if (condition > 70) {
            pitchConditionEl.style.color = '#68d391';
        } else if (condition > 40) {
            pitchConditionEl.style.color = '#f6ad55';
        } else {
            pitchConditionEl.style.color = '#fc8181';
        }
    }

    // Stadion-Visualisierung aktualisieren
    updateStadiumVisualization();
};

/**
 * Aktualisiert Stadion-Visualisierung (Farben, Icons)
 */
const updateStadiumVisualization = () => {
    CAPACITY_CONFIG.BLOCKS.forEach(block => {
        const blockEl = document.querySelector(`.stadium-block[data-block="${block}"]`);
        if (!blockEl) return;

        // Dach-Icon
        const roofIcon = blockEl.querySelector('.roof-icon');
        if (roofIcon) {
            roofIcon.style.display = stadiumState.features.roofs[block] ? 'block' : 'none';
        }

        // Logen-Icon (nur SUED)
        const boxesIcon = blockEl.querySelector('.boxes-icon');
        if (boxesIcon && block === CAPACITY_CONFIG.FIXED_BOX_BLOCK) {
            boxesIcon.style.display = 'block';
        }

        // Werbe-Banden-Indikator
        if (stadiumState.features.advertising[block]) {
            blockEl.classList.add('has-advertising');
        } else {
            blockEl.classList.remove('has-advertising');
        }
    });

    // Rasen-Textur (immer British)
    const pitchEl = document.querySelector('.stadium-pitch');
    if (pitchEl) {
        pitchEl.classList.remove('pitch-normal', 'pitch-dirt');
        pitchEl.classList.add('pitch-british');
    }
};

/**
 * Rendert Bau-Queue
 */
const renderConstructionQueue = () => {
    const queueContainer = document.getElementById('constructionQueue');
    if (!queueContainer) return;

    const queue = stadiumState.construction.queue;

    if (queue.length === 0) {
        queueContainer.innerHTML = '<p class="no-construction">Keine laufenden Bauprojekte</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    queue.forEach(project => {
        const card = document.createElement('div');
        card.className = 'construction-card glass';

        const progress = ((project.duration - project.remainingDays) / project.duration) * 100;
        const statusText = project.status === 'active' ? UI_TEXTS.constructionStatus.active : UI_TEXTS.constructionStatus.queued;

        card.innerHTML = `
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
                    <span>Gesamtdauer:</span>
                    <span>${project.duration} Tage</span>
                </div>
                <div class="detail-row">
                    <span>Kosten:</span>
                    <span>${formatCurrency(project.cost)}</span>
                </div>
            </div>
            
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
            
            <div class="progress-text">${Math.round(progress)}% abgeschlossen</div>
        `;

        fragment.appendChild(card);
    });

    queueContainer.innerHTML = '';
    queueContainer.appendChild(fragment);
};

/**
 * Wechselt zwischen Feature-Tabs
 */
const switchFeatureTab = (tabName) => {
    // Tab-ID Mapping
    const tabIdMap = {
        'blocks': 'tabBlocks',
        'infrastructure': 'tabInfrastructure',
        'sponsors': 'tabSponsors',
        'construction': 'tabConstruction'
    };

    // Tab Buttons aktualisieren
    document.querySelectorAll('.feature-tab').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Tab Content aktualisieren
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = document.getElementById(tabIdMap[tabName]);
    if (targetContent) {
        targetContent.classList.add('active');

        // Wenn Sponsor-Tab, rendere Übersicht
        if (tabName === 'sponsors') {
            const container = document.getElementById('sponsorOverviewContainer');
            if (container) {
                container.innerHTML = renderSponsorOverviewTab(stadiumState, currentSeasonStats);
            }
        }
    }
};

// =====================================================
// EVENT HANDLERS
// =====================================================

/**
 * Event Delegation Handler
 */
const handleDocumentClick = (e) => {
    const target = e.target.closest('[data-action], [data-tab], [data-filter], [data-sort]');
    if (!target) return;

    // Feature-Tab Wechsel
    if (target.dataset.tab) {
        switchFeatureTab(target.dataset.tab);
        return;
    }

    // Filter - RE-RENDER MODAL WITHOUT CLOSING
    if (target.dataset.filter) {
        updateFilter(target.dataset.filter, target.value);
        refreshSponsorSelectionModal(stadiumState);
        return;
    }

    // Sortierung - RE-RENDER MODAL WITHOUT CLOSING
    if (target.dataset.sort) {
        updateSort(target.value);
        refreshSponsorSelectionModal(stadiumState);
        return;
    }

    const action = target.dataset.action;
    const block = target.dataset.block;
    const value = target.dataset.value;
    const sponsorId = target.dataset.sponsorId ? parseInt(target.dataset.sponsorId) : null;

    switch (action) {
        case 'openBlockExpansion':
            openBlockExpansionModal(block);
            break;

        case 'openPitchRenovation':
            openPitchRenovationModal();
            break;

        case 'closeStadiumModal':
            closeStadiumModal();
            break;

        case 'buildRoof':
            buildRoof(block);
            break;

        case 'upgradeFloodlight':
            upgradeFloodlight();
            break;

        case 'installAdvertising':
            installAdvertising(block);
            break;

        case 'manageSponsor':
            manageSponsor(block);
            break;

        case 'openSponsorSelection':
            openSponsorSelectionModal(block, stadiumState);
            break;

        case 'showSponsorDetails':
            showSponsorDetailsModal(sponsorId, stadiumState);
            break;

        case 'confirmBooking':
            showConfirmationModal(sponsorId, stadiumState);
            break;

        case 'finalizeBooking':
            finalizeSponsorBooking(sponsorId);
            break;

        case 'toggleComparisonMode':
            toggleComparisonMode();
            refreshSponsorSelectionModal(stadiumState);
            break;

        case 'toggleComparison':
            const shouldShowComparison = toggleSponsorForComparison(sponsorId);
            if (shouldShowComparison) {
                showComparisonModal(getSelectedForComparison(), stadiumState);
            } else {
                refreshSponsorSelectionModal(stadiumState);
            }
            break;

        case 'closeModal':
        case 'closeModalAndRefresh':
            closeModal();
            if (action === 'closeModalAndRefresh') {
                renderStadiumOverview();
                switchFeatureTab('sponsors');
            }
            break;

        case 'backToSelection':
            const block2 = getCurrentBlock();
            closeModal(false); // Don't reset state
            setTimeout(() => openSponsorSelectionModal(block2, stadiumState), 100);
            break;

        case 'backToDetails':
            closeModal(false); // Don't reset state
            setTimeout(() => showSponsorDetailsModal(sponsorId, stadiumState), 100);
            break;

        case 'goToSponsorOverview':
            closeModal();
            switchFeatureTab('sponsors');
            break;

        case 'simulateDay':
            simulateDay();
            break;
    }
};

/**
 * Simuliert einen Spieltag (für Testing)
 */
const simulateDay = () => {
    stadiumState.currentDay++;

    if (stadiumState.currentDay > 31) {
        stadiumState.currentDay = 1;
        stadiumState.currentMonth++;
    }

    // Rasen verschlechtert sich
    if (stadiumState.currentDay % 7 === 0) { // Jede Woche ca. 1 Spiel
        const roofCount = Object.values(stadiumState.features.roofs).filter(Boolean).length;
        const wearReduction = roofCount * ROOF_CONFIG.pitchWearReduction;
        const actualWear = PITCH_CONFIG.BASE_WEAR_PER_MATCH * (1 - wearReduction);

        stadiumState.features.pitch.condition = Math.max(
            0,
            stadiumState.features.pitch.condition - actualWear
        );
    }

    tickBuildTimer();
    saveStadiumState();

    const dayEl = document.getElementById('currentDay');
    if (dayEl) dayEl.textContent = stadiumState.currentDay;

    console.log(`📅 Simuliert: Tag ${stadiumState.currentDay}, Rasen: ${stadiumState.features.pitch.condition.toFixed(1)}%`);
};

// =====================================================
// MODULE LIFECYCLE
// =====================================================

/**
 * Initialisiert das Modul
 */
export function init() {
    console.log('🎬 Initialisiere Stadium-Modul (Optimized)');

    loadStadiumState();
    renderStadiumOverview();
    renderConstructionQueue();

    // Event Delegation
    addEventListener(document, 'click', handleDocumentClick);

    // Change Events für Select-Elemente
    addEventListener(document, 'change', handleDocumentClick);

    console.log('✅ Stadium-Modul bereit');
}

/**
 * Cleanup beim Verlassen
 */
export function cleanup() {
    console.log('🧹 Cleanup Stadium-Modul');

    eventListeners.forEach(({ element, event, handler, options }) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners.length = 0;

    if (buildTimerInterval) {
        clearInterval(buildTimerInterval);
        buildTimerInterval = null;
    }

    // Schließe offene Modals
    closeStadiumModal();
    closeModal();

    stadiumState = null;
}