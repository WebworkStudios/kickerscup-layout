// =====================================================
// KICKERSCUP - STADIUM MANAGEMENT SYSTEM (ESM)
// Stadion-Verwaltung mit Bauzeiten und Features
// =====================================================

import {
    CAPACITY_CONFIG,
    TIMING_CONFIG,
    ROOF_CONFIG,
    FLOODLIGHT_CONFIG,
    PITCH_CONFIG,
    ADVERTISING_CONFIG,
    SPONSOR_CONFIG,
    INITIAL_STADIUM_STATE,
    UI_TEXTS,
    calculateBuildDays,
    formatCurrency,
    formatCapacity
} from './stadium-config.js';

// =====================================================
// PRIVATE STATE
// =====================================================

let stadiumState = null;
const eventListeners = [];
let buildTimerInterval = null;

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
            stadiumState.features.pitch.quality = project.targetQuality;
            stadiumState.features.pitch.condition = 100;
            break;

        case 'advertising':
            stadiumState.features.advertising[project.block] = true;
            break;
    }

    alert(`✅ Bauprojekt abgeschlossen!\n\n${project.name} ist nun verfügbar.`);
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

    if (!confirm(`Werbung für ${UI_TEXTS.blocks[block]} installieren?\n\nKosten: ${formatCurrency(cost)}\nBauzeit: ${ADVERTISING_CONFIG.buildWeeks} SW (${duration} Tage)\nEinnahmen: ${formatCurrency(ADVERTISING_CONFIG.revenuePerMatch)}/Heimspiel`)) {
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
 * Gibt verfügbare Sponsoren basierend auf Stadion-Kapazität zurück
 */
const getAvailableSponsors = () => {
    const currentCapacity = stadiumState.capacity.total;

    return SPONSOR_CONFIG.availableSponsors.filter(sponsor => {
        const tier = SPONSOR_CONFIG.tiers[sponsor.tier];
        return currentCapacity >= tier.minCapacity;
    });
};

/**
 * Berechnet Einnahmen pro Sponsor-Slot
 */
const calculateSponsorRevenue = (sponsorId) => {
    const sponsor = SPONSOR_CONFIG.availableSponsors.find(s => s.id === sponsorId);
    if (!sponsor) return 0;

    const tier = SPONSOR_CONFIG.tiers[sponsor.tier];
    return SPONSOR_CONFIG.baseRevenuePerSlot * tier.multiplier;
};

/**
 * Öffnet Sponsor-Auswahl-Modal für einen Block
 */
const openSponsorSelection = (block) => {
    // Prüfe ob Werbebande installiert ist
    if (!stadiumState.features.advertising[block]) {
        alert(`❌ Bitte installiere zuerst die Werbebande für ${UI_TEXTS.blocks[block]}!`);
        return;
    }

    const bannerType = ADVERTISING_CONFIG.bannerTypes[block];
    const maxBanners = ADVERTISING_CONFIG.bannersPerBlock[bannerType];
    const currentSponsors = stadiumState.features.sponsors[block] || [];

    if (currentSponsors.length >= maxBanners) {
        alert(`❌ ${UI_TEXTS.blocks[block]} hat bereits die maximale Anzahl an Werbebannern (${maxBanners})!`);
        return;
    }

    // Zeige verfügbare Sponsoren
    const availableSponsors = getAvailableSponsors();

    // Erstelle Sponsor-Liste
    const sponsorListItems = [];
    for (let i = 0; i < availableSponsors.length; i++) {
        const sponsor = availableSponsors[i];
        const revenue = calculateSponsorRevenue(sponsor.id);
        const tier = SPONSOR_CONFIG.tiers[sponsor.tier];
        sponsorListItems.push(
            `${i + 1}. ${sponsor.name} (${tier.name})\n   "${sponsor.slogan}"\n   ${formatCurrency(revenue)}/Heimspiel`
        );
    }
    const sponsorList = sponsorListItems.join('\n\n');

    const selection = prompt(
        `🎯 WERBEBANNER für ${UI_TEXTS.blocks[block]}\n` +
        `═══════════════════════════════\n\n` +
        `Freie Banner-Plätze: ${maxBanners - currentSponsors.length}/${maxBanners}\n\n` +
        `${sponsorList}\n\n` +
        `═══════════════════════════════\n` +
        `Wähle Nummer (1-${availableSponsors.length}):`
    );

    if (selection) {
        const index = parseInt(selection) - 1;

        if (index >= 0 && index < availableSponsors.length) {
            const sponsor = availableSponsors[index];

            // Prüfe ob Sponsor bereits im Block ist
            if (currentSponsors.includes(sponsor.id)) {
                alert(`❌ ${sponsor.name} ist bereits in ${UI_TEXTS.blocks[block]}!`);
                return;
            }

            // Füge Sponsor hinzu
            stadiumState.features.sponsors[block].push(sponsor.id);
            saveStadiumState();
            renderSponsorBanners();

            const revenue = calculateSponsorRevenue(sponsor.id);
            alert(
                `✅ WERBEBANNER GEBUCHT!\n\n` +
                `${sponsor.name}\n` +
                `"${sponsor.slogan}"\n\n` +
                `Einnahmen: ${formatCurrency(revenue)}/Heimspiel`
            );
        } else {
            alert('❌ Ungültige Auswahl!');
        }
    }
};

/**
 * Entfernt einen Sponsor von einem Block
 */
const removeSponsor = (block, sponsorId) => {
    const sponsors = stadiumState.features.sponsors[block];
    const index = sponsors.indexOf(sponsorId);

    if (index > -1) {
        const sponsor = SPONSOR_CONFIG.availableSponsors.find(s => s.id === sponsorId);

        if (confirm(`${sponsor.logo} ${sponsor.name} wirklich entfernen?`)) {
            sponsors.splice(index, 1);
            saveStadiumState();
            renderSponsorBanners();
            alert(`✅ Sponsor entfernt!`);
        }
    }
};

/**
 * Rendert Sponsor-Banner in der Visualisierung (realistische Werbebanden)
 */
const renderSponsorBanners = () => {
    CAPACITY_CONFIG.BLOCKS.forEach(block => {
        const blockEl = document.querySelector(`.stadium-block[data-block="${block}"]`);
        if (!blockEl) return;

        // Entferne alte Banner
        const oldBanners = blockEl.querySelector('.advertising-board');
        if (oldBanners) oldBanners.remove();

        // Prüfe ob Werbebande installiert ist
        if (!stadiumState.features.advertising[block]) return;

        // Erstelle Werbebande-Container
        const boardContainer = document.createElement('div');
        boardContainer.className = 'advertising-board';

        const sponsorIds = stadiumState.features.sponsors[block] || [];
        const bannerType = ADVERTISING_CONFIG.bannerTypes[block];
        const maxBanners = ADVERTISING_CONFIG.bannersPerBlock[bannerType];

        // Zeige aktuell gebuchte Banner
        if (sponsorIds.length > 0) {
            // Rotiere durch die Banner (zeige den ersten)
            const currentSponsorId = sponsorIds[0];
            const sponsor = SPONSOR_CONFIG.availableSponsors.find(s => s.id === currentSponsorId);

            if (sponsor) {
                const banner = document.createElement('div');
                banner.className = 'advertising-banner';
                banner.style.backgroundColor = sponsor.color;
                banner.innerHTML = `
                    <div class="banner-content">
                        <div class="banner-name">${sponsor.shortName}</div>
                        <div class="banner-slogan">${sponsor.slogan}</div>
                        <div class="banner-website">${sponsor.website}</div>
                    </div>
                `;
                boardContainer.appendChild(banner);
            }
        } else {
            // Leere Bande - zeige Placeholder
            const placeholder = document.createElement('div');
            placeholder.className = 'advertising-banner empty';
            placeholder.innerHTML = `
                <div class="banner-content">
                    <div class="banner-placeholder">🎯 WERBUNG VERFÜGBAR</div>
                    <div class="banner-info">${maxBanners} Banner-Plätze frei</div>
                </div>
            `;
            boardContainer.appendChild(placeholder);
        }

        // Füge Indikator für weitere Banner hinzu
        if (sponsorIds.length > 1) {
            const indicator = document.createElement('div');
            indicator.className = 'banner-indicator';
            indicator.textContent = `+${sponsorIds.length - 1}`;
            boardContainer.appendChild(indicator);
        }

        blockEl.appendChild(boardContainer);
    });
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

    if (!confirm(`Logen von ${UI_TEXTS.blocks[currentBlock]} nach ${UI_TEXTS.blocks[targetBlock]} verlegen?\n\nHinweis: Diese Änderung ist sofort wirksam.`)) {
        return;
    }

    // Aktualisiere Distribution
    stadiumState.capacity.distribution[currentBlock].boxes = 0;
    stadiumState.capacity.distribution[targetBlock].boxes = 7500;
    stadiumState.capacity.boxes.placement = targetBlock;

    saveStadiumState();
    renderStadiumOverview();

    alert(`✅ Logen erfolgreich nach ${UI_TEXTS.blocks[targetBlock]} verlegt!`);
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
    if (boxesCapacity) boxesCapacity.textContent = `${formatCapacity(stadiumState.capacity.boxes.total)} (${UI_TEXTS.blocks[stadiumState.capacity.boxes.placement]})`;

    // Block-Details
    CAPACITY_CONFIG.BLOCKS.forEach(block => {
        const dist = stadiumState.capacity.distribution[block];
        const blockCapEl = document.getElementById(`block${block}Capacity`);

        if (blockCapEl) {
            const totalBlock = dist.standing + dist.seated + (dist.boxes || 0);
            blockCapEl.textContent = formatCapacity(totalBlock);
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
    if (floodlightEl) {
        const stage = FLOODLIGHT_CONFIG.stages[stadiumState.features.floodlight];
        floodlightEl.textContent = stage.name;
    }

    // Pitch
    const pitchQualityEl = document.getElementById('pitchQuality');
    const pitchConditionEl = document.getElementById('pitchCondition');

    if (pitchQualityEl) {
        pitchQualityEl.textContent = PITCH_CONFIG.states[stadiumState.features.pitch.quality].name;
    }

    if (pitchConditionEl) {
        const condition = stadiumState.features.pitch.condition;
        pitchConditionEl.textContent = `${condition}%`;
        pitchConditionEl.style.color = condition > 70 ? '#68d391' : condition > 40 ? '#f6ad55' : '#fc8181';
    }

    // Stadion-Visualisierung aktualisieren
    updateStadiumVisualization();

    // Sponsor-Banner rendern
    renderSponsorBanners();
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

            // Setze Banden-Typ als CSS-Klasse
            const bannerType = ADVERTISING_CONFIG.bannerTypes[block];
            blockEl.classList.add(`banner-${bannerType}`);
        } else {
            blockEl.classList.remove('has-advertising');
            blockEl.classList.remove('banner-curve', 'banner-longside');
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

        // Optional: Setze Hintergrundfarbe direkt
        pitchEl.style.background = `linear-gradient(135deg, ${pitchConfig.color} 0%, ${adjustBrightness(pitchConfig.color, -20)} 100%)`;
    }
};

/**
 * Helper: Helligkeit einer Farbe anpassen
 */
const adjustBrightness = (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;

    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
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
    }
};

// =====================================================
// EVENT HANDLERS
// =====================================================

/**
 * Event Delegation Handler
 */
const handleDocumentClick = (e) => {
    const target = e.target.closest('[data-action], [data-tab]');
    if (!target) return;

    // Feature-Tab Wechsel
    if (target.dataset.tab) {
        switchFeatureTab(target.dataset.tab);
        return;
    }

    const action = target.dataset.action;
    const block = target.dataset.block;
    const value = target.dataset.value;

    switch (action) {
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

        case 'manageSponsors':
            openSponsorSelection(block);
            break;

        case 'removeSponsor':
            removeSponsor(block, parseInt(value));
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

    console.log(`📅 Simuliert: Tag ${stadiumState.currentDay}`);
};

// =====================================================
// MODULE LIFECYCLE
// =====================================================

/**
 * Initialisiert das Modul
 */
export function init() {
    console.log('🎬 Initialisiere Stadium-Modul');

    loadStadiumState();
    renderStadiumOverview();
    renderConstructionQueue();

    // Event Delegation
    addEventListener(document, 'click', handleDocumentClick);

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

    stadiumState = null;
}