// =====================================================
// KICKERSCUP - STADIUM MANAGEMENT SYSTEM (ESM)
// Stadion-Verwaltung mit Bauzeiten, Features, Sponsoren + TRIBÜNEN-AUSBAU
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
    getNextExpansionStage,
    calculateExpansionCost
} from './stadium-config-extended.js';

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
 * Prüft ob Tribünen-Ausbau erlaubt ist (nur Tag 28-31)
 */
const isExpansionAllowed = () => {
    const day = stadiumState.currentDay;
    return EXPANSION_CONFIG.buildSeasonRestriction.allowedDays.includes(day);
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
            stadiumState.features.pitch.quality = project.targetQuality;
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
    const newStage = project.targetStage;
    const stageConfig = EXPANSION_CONFIG.stages[newStage];

    // Update Stage
    stadiumState.capacity.distribution[block].stage = newStage;
    stadiumState.capacity.distribution[block].capacity = stageConfig.capacity;

    // Berechne neue Verteilung für diesen Block
    const hasBoxes = stadiumState.capacity.boxes.placement === block;
    const dist = calculateCapacityDistribution(stageConfig.capacity, hasBoxes);

    stadiumState.capacity.distribution[block].standing = dist.standing;
    stadiumState.capacity.distribution[block].seated = dist.seated;
    stadiumState.capacity.distribution[block].boxes = dist.boxes;

    // Berechne Gesamt-Kapazität neu
    recalculateTotalCapacity();

    console.log(`✅ Tribünen-Ausbau ${UI_TEXTS.blocks[block]} auf ${stageConfig.name} abgeschlossen`);
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
        targetQuality: projectData.targetQuality || null,
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
// TRIBÜNEN-AUSBAU
// =====================================================

/**
 * Baut eine Tribüne aus
 */
const expandBlock = (block) => {
    // Prüfe Saisonpause
    if (!isExpansionAllowed()) {
        alert(`❌ ${EXPANSION_CONFIG.buildSeasonRestriction.warningMessage}`);
        return;
    }

    const currentStage = stadiumState.capacity.distribution[block].stage;
    const nextStage = getNextExpansionStage(currentStage);

    if (!nextStage) {
        alert(`❌ ${UI_TEXTS.blocks[block]} ist bereits maximal ausgebaut!`);
        return;
    }

    const cost = calculateExpansionCost(block, nextStage);
    const duration = calculateBuildDays(nextStage.buildWeeks);
    const multiplier = EXPANSION_CONFIG.blockMultipliers[block];
    const multiplierText = multiplier !== 1.0 ? ` (×${multiplier.toFixed(2)})` : '';

    const currentCap = stadiumState.capacity.distribution[block].capacity;
    const newCap = nextStage.capacity;
    const increase = newCap - currentCap;

    if (!confirm(`Tribünen-Ausbau ${UI_TEXTS.blocks[block]}?\n\n` +
        `Ausbau: ${nextStage.name}\n` +
        `Kapazität: ${formatCapacity(currentCap)} → ${formatCapacity(newCap)} (+${formatCapacity(increase)})\n` +
        `Kosten: ${formatCurrency(cost)}${multiplierText}\n` +
        `Bauzeit: ${nextStage.buildWeeks} SW (${duration} Tage)\n\n` +
        `⚠️ Bau startet nach Saisonpause!`)) {
        return;
    }

    addConstructionProject({
        type: 'expansion',
        name: `Tribünen-Ausbau ${UI_TEXTS.blocks[block]} - ${nextStage.name}`,
        block: block,
        targetStage: nextStage.id,
        duration: duration,
        cost: cost
    });

    alert(`🔨 Tribünen-Ausbau ${UI_TEXTS.blocks[block]} gestartet!\n\nBauzeit: ${duration} Tage`);
};

// =====================================================
// FEATURE-MANAGEMENT
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
 * Renoviert Rasen
 */
const renovatePitch = (targetQuality) => {
    const currentQuality = stadiumState.features.pitch.quality;

    if (currentQuality === targetQuality) {
        alert('❌ Rasen hat bereits diese Qualität!');
        return;
    }

    const qualityConfig = PITCH_CONFIG.states[targetQuality];
    const cost = qualityConfig.renovationCost;
    const duration = calculateBuildDays(qualityConfig.renovationTime);

    if (!confirm(`Rasen auf "${qualityConfig.name}" umbauen?\n\nKosten: ${formatCurrency(cost)}\nBauzeit: ${qualityConfig.renovationTime} SW (${duration} Tage)\nWartung: ${formatCurrency(qualityConfig.maintenanceCost)}/Monat`)) {
        return;
    }

    addConstructionProject({
        type: 'pitch_renovation',
        name: `Rasen: ${qualityConfig.name}`,
        targetQuality: targetQuality,
        duration: duration,
        cost: cost
    });

    alert(`🔨 Rasen-Umbau gestartet!`);
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

/**
 * Ändert Logen-Platzierung (nur OST/WEST)
 */
const changeBoxPlacement = (targetBlock) => {
    if (!CAPACITY_CONFIG.ALLOWED_BOX_BLOCKS.includes(targetBlock)) {
        alert('❌ Logen können nur in OST oder WEST platziert werden!');
        return;
    }

    const currentBlock = stadiumState.capacity.boxes.placement;

    if (currentBlock === targetBlock) {
        alert(`❌ Logen sind bereits in ${UI_TEXTS.blocks[targetBlock]}!`);
        return;
    }

    // Erste Logenbau
    if (!currentBlock) {
        const boxTotal = Math.round(stadiumState.capacity.total * CAPACITY_CONFIG.DISTRIBUTION.BOXES);

        if (!confirm(`Logen erstmalig in ${UI_TEXTS.blocks[targetBlock]} errichten?\n\n` +
            `7.500 Logenplätze (5% der Gesamtkapazität)\n` +
            `Reduziert Steh-/Sitzplätze in dieser Tribüne\n\n` +
            `Hinweis: Logen können später zwischen OST/WEST verschoben werden.`)) {
            return;
        }

        stadiumState.capacity.boxes.placement = targetBlock;
        stadiumState.capacity.boxes.total = boxTotal;

        // Neuberechnung der Verteilung für Target-Block
        const blockCap = stadiumState.capacity.distribution[targetBlock].capacity;
        const dist = calculateCapacityDistribution(blockCap, true);

        stadiumState.capacity.distribution[targetBlock].boxes = dist.boxes;
        stadiumState.capacity.distribution[targetBlock].standing = dist.standing;
        stadiumState.capacity.distribution[targetBlock].seated = dist.seated;

        recalculateTotalCapacity();
        saveStadiumState();
        renderStadiumOverview();

        alert(`✅ Logen erfolgreich in ${UI_TEXTS.blocks[targetBlock]} errichtet!`);
        return;
    }

    // Logen verschieben
    if (!confirm(`Logen von ${UI_TEXTS.blocks[currentBlock]} nach ${UI_TEXTS.blocks[targetBlock]} verlegen?\n\nHinweis: Diese Änderung ist sofort wirksam.`)) {
        return;
    }

    // Alte Position: Logen entfernen
    const oldBlockCap = stadiumState.capacity.distribution[currentBlock].capacity;
    const oldDist = calculateCapacityDistribution(oldBlockCap, false);

    stadiumState.capacity.distribution[currentBlock].boxes = 0;
    stadiumState.capacity.distribution[currentBlock].standing = oldDist.standing;
    stadiumState.capacity.distribution[currentBlock].seated = oldDist.seated;

    // Neue Position: Logen hinzufügen
    const newBlockCap = stadiumState.capacity.distribution[targetBlock].capacity;
    const newDist = calculateCapacityDistribution(newBlockCap, true);

    stadiumState.capacity.distribution[targetBlock].boxes = newDist.boxes;
    stadiumState.capacity.distribution[targetBlock].standing = newDist.standing;
    stadiumState.capacity.distribution[targetBlock].seated = newDist.seated;

    stadiumState.capacity.boxes.placement = targetBlock;

    recalculateTotalCapacity();
    saveStadiumState();
    renderStadiumOverview();

    alert(`✅ Logen erfolgreich nach ${UI_TEXTS.blocks[targetBlock]} verlegt!`);
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
    if (boxesCapacity) boxesCapacity.textContent = stadiumState.capacity.boxes.placement
        ? `${formatCapacity(stadiumState.capacity.boxes.total)} (${UI_TEXTS.blocks[stadiumState.capacity.boxes.placement]})`
        : '0';

    // Block-Details
    CAPACITY_CONFIG.BLOCKS.forEach(block => {
        const dist = stadiumState.capacity.distribution[block];
        const blockCapEl = document.getElementById(`block${block}Capacity`);

        if (blockCapEl) {
            const totalBlock = dist.capacity;
            const stage = EXPANSION_CONFIG.stages[dist.stage];
            blockCapEl.textContent = `${formatCapacity(totalBlock)} (${stage.name})`;
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
    const pitchQualityEl = document.getElementById('pitchQuality');
    const pitchQualityEl2 = document.getElementById('pitchQuality2');
    const pitchConditionEl = document.getElementById('pitchCondition');
    const pitchConditionEl2 = document.getElementById('pitchCondition2');

    if (pitchQualityEl) {
        pitchQualityEl.textContent = PITCH_CONFIG.states[stadiumState.features.pitch.quality].name;
    }
    if (pitchQualityEl2) {
        pitchQualityEl2.textContent = PITCH_CONFIG.states[stadiumState.features.pitch.quality].name;
    }

    if (pitchConditionEl) {
        const condition = stadiumState.features.pitch.condition;
        pitchConditionEl.textContent = `${condition}%`;
        pitchConditionEl.style.color = condition > 70 ? '#68d391' : condition > 40 ? '#f6ad55' : '#fc8181';
    }
    if (pitchConditionEl2) {
        const condition = stadiumState.features.pitch.condition;
        pitchConditionEl2.textContent = `${condition}%`;
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

        // Logen-Icon
        const boxesIcon = blockEl.querySelector('.boxes-icon');
        if (boxesIcon) {
            const hasBoxes = stadiumState.capacity.boxes.placement === block &&
                stadiumState.capacity.boxes.total > 0;
            boxesIcon.style.display = hasBoxes ? 'block' : 'none';
        }

        // Werbe-Banden-Indikator
        if (stadiumState.features.advertising[block]) {
            blockEl.classList.add('has-advertising');
        } else {
            blockEl.classList.remove('has-advertising');
        }
    });

    // Rasen-Textur aktualisieren
    const pitchEl = document.querySelector('.stadium-pitch');
    if (pitchEl) {
        const quality = stadiumState.features.pitch.quality;
        const pitchConfig = PITCH_CONFIG.states[quality];

        // Entferne alte Textur-Klassen
        pitchEl.classList.remove('pitch-british', 'pitch-normal', 'pitch-dirt');

        // Füge neue Textur-Klasse hinzu
        pitchEl.classList.add(`pitch-${pitchConfig.texture}`);
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
        'expansion': 'tabExpansion',
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

        // Wenn Expansion-Tab, rendere Übersicht
        if (tabName === 'expansion') {
            renderExpansionOverview();
        }
    }
};

/**
 * Rendert Tribünen-Ausbau-Übersicht
 */
const renderExpansionOverview = () => {
    const container = document.getElementById('expansionOverviewContainer');
    if (!container) return;

    const isAllowed = isExpansionAllowed();
    const warningClass = isAllowed ? '' : 'expansion-warning';

    let html = `
        <div class="expansion-info ${warningClass}">
            ${isAllowed ?
        '<p>✅ Saisonpause aktiv - Tribünen-Ausbau ist möglich!</p>' :
        `<p>⚠️ ${EXPANSION_CONFIG.buildSeasonRestriction.warningMessage}</p>`
    }
        </div>
        
        <div class="expansion-blocks-grid">
    `;

    CAPACITY_CONFIG.BLOCKS.forEach(block => {
        const dist = stadiumState.capacity.distribution[block];
        const currentStage = EXPANSION_CONFIG.stages[dist.stage];
        const nextStage = getNextExpansionStage(dist.stage);
        const multiplier = EXPANSION_CONFIG.blockMultipliers[block];

        html += `
            <div class="expansion-block-card glass">
                <h3>${UI_TEXTS.blocks[block]}</h3>
                
                <div class="expansion-current">
                    <div class="expansion-label">Aktuell:</div>
                    <div class="expansion-stage">${currentStage.name}</div>
                    <div class="expansion-capacity">${formatCapacity(currentStage.capacity)} Plätze</div>
                    <div class="expansion-breakdown">
                        • ${formatCapacity(dist.standing)} Stehplätze<br>
                        • ${formatCapacity(dist.seated)} Sitzplätze<br>
                        ${dist.boxes > 0 ? `• ${formatCapacity(dist.boxes)} Logen<br>` : ''}
                    </div>
                </div>
                
                ${nextStage ? `
                    <div class="expansion-arrow">⬇️</div>
                    
                    <div class="expansion-next">
                        <div class="expansion-label">Nächster Ausbau:</div>
                        <div class="expansion-stage">${nextStage.name}</div>
                        <div class="expansion-capacity">${formatCapacity(nextStage.capacity)} Plätze (+${formatCapacity(nextStage.capacity - currentStage.capacity)})</div>
                        <div class="expansion-cost">${formatCurrency(calculateExpansionCost(block, nextStage))}${multiplier !== 1.0 ? ` (×${multiplier.toFixed(2)})` : ''}</div>
                        <div class="expansion-time">${nextStage.buildWeeks} SW (${calculateBuildDays(nextStage.buildWeeks)} Tage)</div>
                    </div>
                    
                    <button class="btn btn-primary" 
                            data-action="expandBlock" 
                            data-block="${block}"
                            ${!isAllowed ? 'disabled' : ''}>
                        ${isAllowed ? '🔨 Ausbau starten' : '⏸️ Nur in Saisonpause'}
                    </button>
                ` : `
                    <div class="expansion-maxed">
                        ✅ Maximal ausgebaut!
                    </div>
                `}
            </div>
        `;
    });

    html += '</div>';

    container.innerHTML = html;
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
        case 'expandBlock':
            expandBlock(block);
            break;

        case 'buildRoof':
            buildRoof(block);
            break;

        case 'upgradeFloodlight':
            upgradeFloodlight();
            break;

        case 'renovatePitch':
            renovatePitch(parseInt(value));
            break;

        case 'installAdvertising':
            installAdvertising(block);
            break;

        case 'changeBoxPlacement':
            changeBoxPlacement(block);
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
            const block4 = getCurrentBlock();
            closeModal(false); // Don't reset state
            setTimeout(() => openSponsorSelectionModal(block4, stadiumState), 100);
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

    tickBuildTimer();
    saveStadiumState();

    const dayEl = document.getElementById('currentDay');
    if (dayEl) dayEl.textContent = stadiumState.currentDay;

    // Refresh Expansion Tab wenn geöffnet
    const expansionTab = document.getElementById('tabExpansion');
    if (expansionTab && expansionTab.classList.contains('active')) {
        renderExpansionOverview();
    }

    console.log(`📅 Simuliert: Tag ${stadiumState.currentDay}`);
};

// =====================================================
// MODULE LIFECYCLE
// =====================================================

/**
 * Initialisiert das Modul
 */
export function init() {
    console.log('🎬 Initialisiere Stadium-Modul mit Sponsor-System + Tribünen-Ausbau');

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
    closeModal();

    stadiumState = null;
}