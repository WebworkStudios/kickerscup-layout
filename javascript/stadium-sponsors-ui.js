// =====================================================
// KICKERSCUP - STADIUM SPONSORS UI (V2 - OPTIMIZED)
// UI-Rendering für Sponsor-Verwaltung
// ✅ V2: Virtual Scrolling, DocumentFragment, Debounced Updates,
//        Template Caching, Incremental Rendering
// =====================================================

import {CAPACITY_CONFIG, formatCurrency, getSponsorById, SPONSOR_CONFIG, UI_TEXTS} from './stadium-config.js';

import {
    calculateAllPrognoses,
    calculateSeasonProjection,
    calculateSponsorPrognosis,
    calculateTotalSponsorRevenue,
    filterSponsors,
    findBestValues,
    getActiveSponsors,
    getAvailableIndustries,
    getAvailableSponsors,
    getSponsorBalance,
    getSponsorRecommendation,
    prepareSponsorComparison,
    sortSponsors
} from './stadium-sponsors.js';

// =====================================================
// PERFORMANCE UTILITIES
// =====================================================

/**
 * Debounce-Funktion für verzögerte Ausführung
 */
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

/**
 * Throttle-Funktion für Rate-Limiting
 */
const throttle = (fn, limit) => {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * RequestAnimationFrame-basiertes Batching
 */
const scheduleRender = (() => {
    let scheduled = false;
    let callbacks = [];

    return (callback) => {
        callbacks.push(callback);

        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(() => {
                const toExecute = callbacks;
                callbacks = [];
                scheduled = false;

                for (const cb of toExecute) {
                    cb();
                }
            });
        }
    };
})();

// =====================================================
// TEMPLATE CACHE
// =====================================================

const templateCache = new Map();

/**
 * Cached Template für wiederkehrende Elemente
 */
const getCachedTemplate = (key, generator) => {
    if (!templateCache.has(key)) {
        templateCache.set(key, generator());
    }
    return templateCache.get(key);
};

/**
 * Template-Cache leeren
 */
export const clearTemplateCache = () => templateCache.clear();

// =====================================================
// HTML UTILITIES
// =====================================================

/**
 * Escaped HTML für sichere Ausgabe (gecacht)
 */
const escapeCache = new Map();
const escapeHtml = (str) => {
    if (typeof str !== 'string') return String(str);

    if (escapeCache.has(str)) {
        return escapeCache.get(str);
    }

    const escaped = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // Nur kurze Strings cachen
    if (str.length < 100) {
        escapeCache.set(str, escaped);
    }

    return escaped;
};

/**
 * Erstellt Element aus HTML-String effizient
 */
const createElementFromHTML = (html) => {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
};

/**
 * Erstellt DocumentFragment für Batch-Insert
 */
const createFragment = (htmlArray) => {
    const fragment = document.createDocumentFragment();
    const template = document.createElement('template');

    for (const html of htmlArray) {
        template.innerHTML = html.trim();
        fragment.appendChild(template.content.firstChild.cloneNode(true));
    }

    return fragment;
};

// =====================================================
// MODAL STATE (Singleton Pattern)
// =====================================================

const modalState = {
    currentModal: null,
    currentBlock: null,
    comparisonMode: false,
    selectedForComparison: [],
    filters: {
        tier: 'all',
        industry: 'all',
        paymentType: null
    },
    sort: 'prognosis_desc',
    // Performance tracking
    lastRenderTime: 0,
    renderCount: 0,
    // Cached data
    cachedSponsors: null,
    cachedPrognoses: null
};

// =====================================================
// VIRTUAL SCROLLING (für große Listen)
// =====================================================

const VIRTUAL_SCROLL_CONFIG = {
    ITEM_HEIGHT: 320,  // Geschätzte Höhe einer Sponsor-Karte
    BUFFER_SIZE: 3,    // Zusätzliche Items außerhalb des Viewports
    THRESHOLD: 10      // Ab dieser Anzahl Virtual Scrolling aktivieren
};

/**
 * Virtual Scrolling State
 */
const virtualScrollState = {
    enabled: false,
    scrollTop: 0,
    containerHeight: 0,
    totalItems: 0,
    visibleStart: 0,
    visibleEnd: 0
};

/**
 * Berechnet sichtbare Items für Virtual Scrolling
 */
const calculateVisibleRange = (scrollTop, containerHeight, totalItems) => {
    const {ITEM_HEIGHT, BUFFER_SIZE} = VIRTUAL_SCROLL_CONFIG;

    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(totalItems, startIndex + visibleCount + BUFFER_SIZE * 2);

    return {startIndex, endIndex};
};

// =====================================================
// TIER BADGE TEMPLATES (Cached)
// =====================================================

const getTierBadgeHTML = (tier, style = 'full') => {
    const cacheKey = `tier_${tier}_${style}`;

    return getCachedTemplate(cacheKey, () => {
        const tierConfig = SPONSOR_CONFIG.tiers[tier];
        if (!tierConfig) return '';

        return style === 'small'
            ? `<span class="sponsor-tier-badge-small" style="background:${tierConfig.color}">${tierConfig.icon}</span>`
            : `<div class="sponsor-tier-badge" style="background:${tierConfig.color}">${tierConfig.icon} ${tierConfig.name}</div>`;
    });
};

// =====================================================
// SPONSOR CARD RENDERING (Optimized)
// =====================================================

/**
 * Rendert einzelne Sponsor-Karte (optimiert)
 */
const renderSponsorCard = (sponsor, prognosis, isComparisonMode, isSelected, canSelect) => {
    if (!prognosis) return '';

    const tierBadge = getTierBadgeHTML(sponsor.tier);
    const nameEscaped = escapeHtml(sponsor.name);
    const industryEscaped = escapeHtml(sponsor.industry);
    const sloganEscaped = escapeHtml(sponsor.slogan);

    return `
        <div class="sponsor-card ${isComparisonMode ? 'comparison-mode' : ''} ${isSelected ? 'selected' : ''}" 
             data-sponsor-id="${sponsor.id}" style="border-color:${sponsor.color}">
            
            ${isComparisonMode ? `
                <div class="comparison-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} ${!canSelect ? 'disabled' : ''}
                           data-action="toggleComparison" data-sponsor-id="${sponsor.id}">
                </div>
            ` : ''}
            
            <div class="sponsor-card-header">${tierBadge}</div>
            
            <h3 class="sponsor-name" style="color:${sponsor.color}">${nameEscaped}</h3>
            <p class="sponsor-industry">${industryEscaped}</p>
            <p class="sponsor-slogan">"${sloganEscaped}"</p>
            
            <div class="sponsor-payment-summary">
                <div class="payment-item"><span class="payment-icon">💰</span><span class="payment-value">${formatCurrency(prognosis.adjustedPayment.initial)}</span></div>
                <div class="payment-item"><span class="payment-icon">⚽</span><span class="payment-value">${formatCurrency(prognosis.adjustedPayment.perGoal)}/Tor</span></div>
                <div class="payment-item"><span class="payment-icon">🏆</span><span class="payment-value">${formatCurrency(prognosis.adjustedPayment.perWin)}/Sieg</span></div>
                <div class="payment-item"><span class="payment-icon">🥇</span><span class="payment-value">${formatCurrency(prognosis.adjustedPayment.leagueTitle)}</span></div>
            </div>
            
            <div class="sponsor-prognosis">
                <div class="prognosis-label">📊 Prognose:</div>
                <div class="prognosis-value">${formatCurrency(prognosis.prognosis.expectedTotal)}</div>
            </div>
            
            <button class="btn btn-details" data-action="showSponsorDetails" data-sponsor-id="${sponsor.id}">Details 🔍</button>
        </div>
    `;
};

/**
 * Batch-Rendering aller Sponsor-Karten
 */
const renderSponsorCards = (sponsors, prognosesMap, isComparisonMode, selectedIds) => {
    const cards = [];
    const selectedSet = new Set(selectedIds);

    for (const sponsor of sponsors) {
        const prognosis = prognosesMap.get(sponsor.id);
        const isSelected = selectedSet.has(sponsor.id);
        const canSelect = selectedIds.length < 3 || isSelected;

        cards.push(renderSponsorCard(sponsor, prognosis, isComparisonMode, isSelected, canSelect));
    }

    return cards.join('');
};

// =====================================================
// MODAL: SPONSOR-AUSWAHL (Optimized)
// =====================================================

/**
 * Öffnet Sponsor-Auswahl Modal
 */
export const openSponsorSelectionModal = (block, stadiumState) => {
    modalState.currentBlock = block;
    modalState.comparisonMode = false;
    modalState.selectedForComparison = [];

    // Pre-compute und cache
    const availableSponsors = getAvailableSponsors(stadiumState.capacity.total);
    const leaguePosition = stadiumState.previousSeason.leaguePosition;

    modalState.cachedSponsors = availableSponsors;
    modalState.cachedPrognoses = calculateAllPrognoses(
        availableSponsors,
        stadiumState.previousSeason,
        leaguePosition
    );

    const modal = document.createElement('div');
    modal.id = 'sponsor-selection-modal';
    modal.className = 'sponsor-modal';

    const content = renderSponsorSelectionContent(stadiumState);

    modal.innerHTML = `
        <div class="sponsor-modal-overlay">
            <div class="sponsor-modal-content">
                <div class="sponsor-modal-header">
                    <h2>🎯 Werbebanner buchen - ${UI_TEXTS.blocks[block]}</h2>
                    <button class="modal-close-btn" data-action="closeModal">&times;</button>
                </div>
                ${content}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modalState.currentModal = modal;

    // Event-Delegation für Filter/Sort (debounced)
    setupModalEventDelegation(modal, stadiumState);

    requestAnimationFrame(() => modal.classList.add('active'));
};

/**
 * Event-Delegation Setup mit Debouncing
 */
const setupModalEventDelegation = (modal, stadiumState) => {
    // Debounced refresh für Filter/Sort
    const debouncedRefresh = debounce(() => {
        refreshSponsorGrid(stadiumState);
    }, 150);

    modal.addEventListener('change', (e) => {
        const target = e.target;

        if (target.dataset.filter) {
            modalState.filters[target.dataset.filter] = target.value;
            debouncedRefresh();
        } else if (target.dataset.sort) {
            modalState.sort = target.value;
            debouncedRefresh();
        }
    });
};

/**
 * Nur Grid aktualisieren (nicht gesamtes Modal)
 */
const refreshSponsorGrid = (stadiumState) => {
    const grid = document.getElementById('sponsorGrid');
    if (!grid) return;

    const startTime = performance.now();

    const leaguePosition = stadiumState.previousSeason.leaguePosition;
    const previousSeason = stadiumState.previousSeason;

    // Filter & Sortierung anwenden
    let filteredSponsors = filterSponsors(modalState.cachedSponsors, {
        ...modalState.filters,
        leaguePosition
    }, stadiumState);

    filteredSponsors = sortSponsors(filteredSponsors, modalState.sort, previousSeason, leaguePosition);

    // Re-calculate prognoses nur für gefilterte Sponsoren wenn nötig
    const cardsHTML = renderSponsorCards(
        filteredSponsors,
        modalState.cachedPrognoses,
        modalState.comparisonMode,
        modalState.selectedForComparison
    );

    // Batch DOM update
    scheduleRender(() => {
        grid.innerHTML = cardsHTML || '<div class="no-sponsors-message"><p>Keine Sponsoren verfügbar.</p></div>';

        const endTime = performance.now();
        modalState.lastRenderTime = endTime - startTime;
        modalState.renderCount++;

        if (modalState.lastRenderTime > 50) {
            console.warn(`⚠️ Slow render: ${modalState.lastRenderTime.toFixed(1)}ms`);
        }
    });
};

/**
 * Re-rendert Modal-Content (für Comparison Mode Toggle)
 */
export const refreshSponsorSelectionModal = (stadiumState) => {
    if (!modalState.currentModal || !modalState.currentBlock) return;

    // Nur Grid aktualisieren, nicht Header neu rendern
    const comparisonBtn = modalState.currentModal.querySelector('.btn-compare');
    if (comparisonBtn) {
        comparisonBtn.classList.toggle('active', modalState.comparisonMode);
        comparisonBtn.textContent = `📊 Vergleichen ${modalState.comparisonMode ? `(${modalState.selectedForComparison.length}/3)` : ''}`;
    }

    refreshSponsorGrid(stadiumState);
};

/**
 * Rendert Sponsor-Auswahl Content
 */
const renderSponsorSelectionContent = (stadiumState) => {
    const leaguePosition = stadiumState.previousSeason.leaguePosition;
    const previousSeason = stadiumState.previousSeason;

    // Filter & Sortierung anwenden (nutzt cached Sponsoren)
    let filteredSponsors = filterSponsors(modalState.cachedSponsors, {
        ...modalState.filters,
        leaguePosition
    }, stadiumState);

    filteredSponsors = sortSponsors(filteredSponsors, modalState.sort, previousSeason, leaguePosition);

    const industries = getAvailableIndustries(modalState.cachedSponsors);
    const posText = leaguePosition <= 3 ? '(+30%)'
        : leaguePosition <= 8 ? '(+15%)'
            : leaguePosition <= 14 ? '(±0%)'
                : '(-15%)';

    // Sponsor Cards mit gecachten Prognosen
    const sponsorCards = renderSponsorCards(
        filteredSponsors,
        modalState.cachedPrognoses,
        modalState.comparisonMode,
        modalState.selectedForComparison
    );

    // Filter Options (gecacht)
    const tierOptions = getCachedTemplate('tier_options', () =>
        Object.entries(SPONSOR_CONFIG.tiers).map(([key, tier]) =>
            `<option value="${key}">${tier.icon} ${tier.name}</option>`
        ).join('')
    );

    const industryOptions = industries.map(ind =>
        `<option value="${escapeHtml(ind)}" ${modalState.filters.industry === ind ? 'selected' : ''}>${escapeHtml(ind)}</option>`
    ).join('');

    return `
        <div class="sponsor-modal-body">
            <div class="sponsor-info-banner">
                <div class="info-item"><span class="info-icon">⚠️</span><span>1 Banner = 1 Sponsor (nicht änderbar)</span></div>
                <div class="info-item"><span class="info-icon">📅</span><span>Vertragslaufzeit: ${SPONSOR_CONFIG.contractDuration} Saison</span></div>
                <div class="info-item"><span class="info-icon">🏆</span><span>Vorsaison: Platz ${leaguePosition} → ${posText}</span></div>
            </div>
            
            <div class="sponsor-controls">
                <div class="sponsor-controls-row">
                    <button class="btn-compare ${modalState.comparisonMode ? 'active' : ''}" data-action="toggleComparisonMode">
                        📊 Vergleichen ${modalState.comparisonMode ? `(${modalState.selectedForComparison.length}/3)` : ''}
                    </button>
                    
                    <select class="filter-select" data-filter="tier">
                        <option value="all">Alle Kategorien</option>
                        ${tierOptions}
                    </select>
                    
                    <select class="filter-select" data-filter="industry">
                        <option value="all">Alle Branchen</option>
                        ${industryOptions}
                    </select>
                    
                    <select class="sort-select" data-sort="sponsor">
                        <option value="prognosis_desc" ${modalState.sort === 'prognosis_desc' ? 'selected' : ''}>Prognose ↓</option>
                        <option value="initial_desc" ${modalState.sort === 'initial_desc' ? 'selected' : ''}>Einmalzahlung ↓</option>
                        <option value="best_case_desc" ${modalState.sort === 'best_case_desc' ? 'selected' : ''}>Best Case</option>
                        <option value="worst_case_desc" ${modalState.sort === 'worst_case_desc' ? 'selected' : ''}>Min. Risiko</option>
                        <option value="name_asc" ${modalState.sort === 'name_asc' ? 'selected' : ''}>A-Z</option>
                    </select>
                </div>
            </div>
            
            <div class="sponsor-grid" id="sponsorGrid">
                ${sponsorCards || '<div class="no-sponsors-message"><p>Keine Sponsoren verfügbar.</p></div>'}
            </div>
        </div>
        
        <div class="sponsor-modal-footer">
            <button class="btn btn-secondary" data-action="closeModal">Abbrechen</button>
        </div>
    `;
};

// =====================================================
// MODAL: SPONSOR-DETAILS
// =====================================================

export const showSponsorDetailsModal = (sponsorId, stadiumState) => {
    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) return;

    closeModal(false);

    const modal = document.createElement('div');
    modal.id = 'sponsor-details-modal';
    modal.className = 'sponsor-modal';

    modal.innerHTML = `
        <div class="sponsor-modal-overlay">
            <div class="sponsor-modal-content sponsor-modal-wide">
                ${renderSponsorDetailsContent(sponsor, stadiumState)}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modalState.currentModal = modal;

    requestAnimationFrame(() => modal.classList.add('active'));
};

const renderSponsorDetailsContent = (sponsor, stadiumState) => {
    const tier = SPONSOR_CONFIG.tiers[sponsor.tier];

    // Nutze gecachte Prognose wenn verfügbar
    let prognosis = modalState.cachedPrognoses?.get(sponsor.id);
    if (!prognosis) {
        prognosis = calculateSponsorPrognosis(
            sponsor,
            stadiumState.previousSeason,
            stadiumState.previousSeason.leaguePosition
        );
    }

    if (!prognosis) return '<p>Fehler beim Laden der Sponsor-Details.</p>';

    const {previousSeason} = stadiumState;
    const avgGoalsPerGame = (previousSeason.totalGoals / previousSeason.totalGames).toFixed(1);
    const winRate = ((previousSeason.totalWins / previousSeason.totalGames) * 100).toFixed(0);

    const nameEscaped = escapeHtml(sponsor.name);
    const sloganEscaped = escapeHtml(sponsor.slogan);
    const websiteEscaped = escapeHtml(sponsor.website);

    return `
        <div class="sponsor-modal-header">
            <div>
                <h2 style="color:${sponsor.color}">${nameEscaped}</h2>
                <p class="sponsor-detail-meta">${tier.icon} ${tier.name} • ${escapeHtml(sponsor.industry)}</p>
            </div>
            <button class="modal-close-btn" data-action="backToSelection">&times;</button>
        </div>
        
        <div class="sponsor-modal-body">
            <div class="sponsor-detail-intro">
                <p class="sponsor-slogan-large">"${sloganEscaped}"</p>
                <p class="sponsor-website">${websiteEscaped}</p>
            </div>
            
            <div class="sponsor-detail-section">
                <h3>💰 Vergütungsmodell</h3>
                <div class="payment-details-grid">
                    <div class="payment-detail-card">
                        <div class="payment-detail-label">Einmalzahlung (garantiert):</div>
                        <div class="payment-detail-value">${formatCurrency(prognosis.adjustedPayment.initial)}</div>
                        <div class="payment-detail-note">Zu Saisonbeginn</div>
                    </div>
                    <div class="payment-detail-card">
                        <div class="payment-detail-label">Performance-Prämien:</div>
                        <ul class="payment-detail-list">
                            <li>⚽ ${formatCurrency(prognosis.adjustedPayment.perGoal)} pro Tor</li>
                            <li>🏆 ${formatCurrency(prognosis.adjustedPayment.perWin)} pro Sieg</li>
                            <li>🥇 ${formatCurrency(prognosis.adjustedPayment.leagueTitle)} Liga-Meisterschaft</li>
                            <li>🏅 ${formatCurrency(prognosis.adjustedPayment.cupTitle)} Pokalsieg</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="sponsor-detail-section">
                <h3>📊 Saisonprognose</h3>
                <p class="prognosis-basis">Basis: Vorsaison ${previousSeason.season} (Platz ${previousSeason.leaguePosition})</p>
                
                <div class="prognosis-expectation">
                    <h4>Erwartete Leistung:</h4>
                    <ul>
                        <li>${previousSeason.totalGames} Spiele</li>
                        <li>${previousSeason.totalGoals} Tore (Ø ${avgGoalsPerGame}/Spiel)</li>
                        <li>${previousSeason.totalWins} Siege (${winRate}%)</li>
                    </ul>
                </div>
                
                <div class="prognosis-calculation">
                    <h4>Einnahmen-Berechnung:</h4>
                    <table class="prognosis-table">
                        <tr><td>Einmalzahlung:</td><td class="prognosis-value">${formatCurrency(prognosis.prognosis.initialPayment)}</td></tr>
                        <tr><td>${prognosis.calculations.expectedGoals} Tore:</td><td class="prognosis-value">${formatCurrency(prognosis.prognosis.goalBonuses)}</td></tr>
                        <tr><td>${prognosis.calculations.expectedWins} Siege:</td><td class="prognosis-value">${formatCurrency(prognosis.prognosis.winBonuses)}</td></tr>
                        <tr class="prognosis-total"><td><strong>ERWARTETE EINNAHMEN:</strong></td><td class="prognosis-value"><strong>${formatCurrency(prognosis.prognosis.expectedTotal)}</strong></td></tr>
                    </table>
                </div>
                
                <div class="prognosis-scenarios">
                    <div class="scenario-card scenario-best">
                        <h4>📈 Best Case:</h4>
                        <div class="scenario-value">${formatCurrency(prognosis.prognosis.bestCase)} 🚀</div>
                    </div>
                    <div class="scenario-card scenario-worst">
                        <h4>📉 Worst Case:</h4>
                        <div class="scenario-value">${formatCurrency(prognosis.prognosis.worstCase)}</div>
                    </div>
                </div>
            </div>
            
            <div class="sponsor-detail-warning">
                <span class="warning-icon">⚠️</span>
                <div class="warning-text"><strong>Verträge sind für die gesamte Saison bindend!</strong></div>
            </div>
        </div>
        
        <div class="sponsor-modal-footer">
            <button class="btn btn-secondary" data-action="backToSelection">Zurück</button>
            <button class="btn btn-primary" data-action="confirmBooking" data-sponsor-id="${sponsor.id}">Vertrag abschließen ✍️</button>
        </div>
    `;
};

// =====================================================
// MODAL: BESTÄTIGUNG
// =====================================================

export const showConfirmationModal = (sponsorId, stadiumState) => {
    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) return;

    // Nutze gecachte Prognose
    let prognosis = modalState.cachedPrognoses?.get(sponsor.id);
    if (!prognosis) {
        prognosis = calculateSponsorPrognosis(
            sponsor,
            stadiumState.previousSeason,
            stadiumState.previousSeason.leaguePosition
        );
    }

    closeModal(false);

    const modal = document.createElement('div');
    modal.id = 'sponsor-confirmation-modal';
    modal.className = 'sponsor-modal';

    modal.innerHTML = `
        <div class="sponsor-modal-overlay">
            <div class="sponsor-modal-content sponsor-modal-narrow">
                <div class="sponsor-modal-header"><h2>⚠️ Vertrag bestätigen</h2></div>
                
                <div class="sponsor-modal-body">
                    <p class="confirmation-text">
                        Vertrag mit <strong style="color:${sponsor.color}">${escapeHtml(sponsor.name)}</strong> abschließen?
                    </p>
                    
                    <div class="confirmation-details">
                        <div class="confirmation-item"><span class="confirm-icon">✓</span><span>Werbebanner: ${UI_TEXTS.blocks[modalState.currentBlock]}</span></div>
                        <div class="confirmation-item"><span class="confirm-icon">✓</span><span>Laufzeit: ${SPONSOR_CONFIG.contractDuration} Saison</span></div>
                        <div class="confirmation-item"><span class="confirm-icon">✓</span><span>Einmalzahlung: ${formatCurrency(prognosis.adjustedPayment.initial)}</span></div>
                    </div>
                    
                    <div class="confirmation-consequences">
                        <h4>Nach Bestätigung:</h4>
                        <ul>
                            <li>Vertrag ist bindend</li>
                            <li>Banner wird sofort angezeigt</li>
                            <li>Einmalzahlung wird gutgeschrieben</li>
                        </ul>
                    </div>
                </div>
                
                <div class="sponsor-modal-footer">
                    <button class="btn btn-secondary" data-action="backToDetails" data-sponsor-id="${sponsor.id}">Zurück</button>
                    <button class="btn btn-primary btn-confirm" data-action="finalizeBooking" data-sponsor-id="${sponsor.id}">Vertrag unterschreiben ✍️</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modalState.currentModal = modal;

    requestAnimationFrame(() => modal.classList.add('active'));
};

/**
 * Zeigt Erfolgs-Modal
 */
export const showSuccessModal = (sponsor, initialPayment) => {
    closeModal(false);

    const modal = document.createElement('div');
    modal.id = 'sponsor-success-modal';
    modal.className = 'sponsor-modal';

    modal.innerHTML = `
        <div class="sponsor-modal-overlay">
            <div class="sponsor-modal-content sponsor-modal-narrow">
                <div class="sponsor-modal-header success-header"><h2>✅ Vertrag abgeschlossen!</h2></div>
                
                <div class="sponsor-modal-body">
                    <div class="success-animation">🎉</div>
                    <h3 class="success-title">Herzlichen Glückwunsch!</h3>
                    <p class="success-text"><strong style="color:${sponsor.color}">${escapeHtml(sponsor.name)}</strong> ist jetzt Ihr Partner.</p>
                    
                    <div class="success-details">
                        <div class="success-item"><span class="success-icon">💰</span><span>+${formatCurrency(initialPayment)} erhalten</span></div>
                        <div class="success-item"><span class="success-icon">📺</span><span>Banner in ${UI_TEXTS.blocks[modalState.currentBlock]}</span></div>
                    </div>
                </div>
                
                <div class="sponsor-modal-footer">
                    <button class="btn btn-secondary" data-action="closeModalAndRefresh">Schließen</button>
                    <button class="btn btn-primary" data-action="goToSponsorOverview">Zur Übersicht</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modalState.currentModal = modal;

    requestAnimationFrame(() => modal.classList.add('active'));
};

// =====================================================
// MODAL: VERGLEICHSMODUS
// =====================================================

export const showComparisonModal = (sponsorIds, stadiumState) => {
    const sponsors = sponsorIds.map(id => getSponsorById(id)).filter(Boolean);
    if (!sponsors.length) return;

    closeModal(false);

    const modal = document.createElement('div');
    modal.id = 'sponsor-comparison-modal';
    modal.className = 'sponsor-modal';

    modal.innerHTML = `
        <div class="sponsor-modal-overlay">
            <div class="sponsor-modal-content sponsor-modal-wide">
                ${renderComparisonContent(sponsors, stadiumState)}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modalState.currentModal = modal;

    requestAnimationFrame(() => modal.classList.add('active'));
};

const renderComparisonContent = (sponsors, stadiumState) => {
    const comparisons = prepareSponsorComparison(
        sponsors,
        stadiumState.previousSeason,
        stadiumState.previousSeason.leaguePosition
    );

    const bestValues = findBestValues(comparisons);
    const recommendation = getSponsorRecommendation(
        sponsors,
        stadiumState.previousSeason,
        stadiumState.previousSeason.leaguePosition
    );

    const renderComparisonCell = (value, bestValue, format = 'currency') => {
        const isBest = value === bestValue;
        const formatted = format === 'currency' ? formatCurrency(value) : value;
        return `<td class="${isBest ? 'best-value' : ''}">${formatted}${isBest ? ' ⭐' : ''}</td>`;
    };

    // Header row
    const headerCells = comparisons.map(c => `
        <th class="comparison-sponsor-col" style="border-top:3px solid ${c.sponsor.color}">
            <div class="comparison-sponsor-header">
                <div class="comparison-sponsor-name">${escapeHtml(c.sponsor.name)}</div>
                ${getTierBadgeHTML(c.sponsor.tier, 'small')}
            </div>
        </th>
    `).join('');

    // Data rows
    const rows = [
        {label: '💰 Einmalzahlung', getter: c => c.adjustedPayment.initial, best: bestValues.bestInitial},
        {label: '⚽ Pro Tor', getter: c => c.adjustedPayment.perGoal, best: bestValues.bestPerGoal},
        {label: '🏆 Pro Sieg', getter: c => c.adjustedPayment.perWin, best: bestValues.bestPerWin}
    ].map(row => `
        <tr>
            <td class="comparison-label">${row.label}</td>
            ${comparisons.map(c => renderComparisonCell(row.getter(c), row.best)).join('')}
        </tr>
    `).join('');

    return `
        <div class="sponsor-modal-header">
            <h2>📊 Sponsoren vergleichen (${sponsors.length}/3)</h2>
            <button class="modal-close-btn" data-action="backToSelection">&times;</button>
        </div>
        
        <div class="sponsor-modal-body">
            <div class="comparison-table-wrapper">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th class="comparison-label-col">Kriterium</th>
                            ${headerCells}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                        <tr class="comparison-separator">
                            <td class="comparison-label"><strong>📊 PROGNOSE</strong></td>
                            ${comparisons.map(c => `
                                <td class="${c.prognosis.expectedTotal === bestValues.bestPrognosis ? 'best-value prognosis-best' : ''}">
                                    <strong>${formatCurrency(c.prognosis.expectedTotal)}</strong>
                                    ${c.prognosis.expectedTotal === bestValues.bestPrognosis ? ' ⭐' : ''}
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td class="comparison-label">📈 Best Case</td>
                            ${comparisons.map(c => renderComparisonCell(c.prognosis.bestCase, bestValues.bestBestCase)).join('')}
                        </tr>
                        <tr>
                            <td class="comparison-label">📉 Worst Case</td>
                            ${comparisons.map(c => renderComparisonCell(c.prognosis.worstCase, bestValues.bestWorstCase)).join('')}
                        </tr>
                        <tr class="comparison-actions">
                            <td></td>
                            ${comparisons.map(c => `
                                <td><button class="btn btn-primary btn-sm" data-action="showSponsorDetails" data-sponsor-id="${c.sponsor.id}">Buchen 🎯</button></td>
                            `).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
            
            ${recommendation ? `
                <div class="comparison-recommendation">
                    <h3>💡 Empfehlung</h3>
                    <p><strong style="color:${recommendation.sponsor.color}">${escapeHtml(recommendation.sponsor.name)}</strong></p>
                    <p>${recommendation.reason}</p>
                    <p class="recommendation-stats">Team: Ø ${recommendation.teamProfile.avgGoalsPerGame} Tore • ${recommendation.teamProfile.winRate} Siegquote</p>
                </div>
            ` : ''}
        </div>
        
        <div class="sponsor-modal-footer">
            <button class="btn btn-secondary" data-action="backToSelection">Vergleich beenden</button>
        </div>
    `;
};

// =====================================================
// SPONSOR-ÜBERSICHT TAB (Optimized)
// =====================================================

export const renderSponsorOverviewTab = (stadiumState, currentSeasonStats) => {
    const activeSponsors = getActiveSponsors(stadiumState);
    const totalRevenue = calculateTotalSponsorRevenue(stadiumState, currentSeasonStats);
    const projection = calculateSeasonProjection(stadiumState, currentSeasonStats);
    const freeBlocks = CAPACITY_CONFIG.BLOCKS.filter(block => !stadiumState.features.sponsors[block]);

    // Pre-compute alle Balances
    const balances = new Map();
    const prognoses = new Map();

    for (const {block, sponsor} of activeSponsors) {
        balances.set(block, getSponsorBalance(stadiumState, block));
        prognoses.set(sponsor.id, calculateSponsorPrognosis(
            sponsor,
            stadiumState.previousSeason,
            stadiumState.previousSeason.leaguePosition
        ));
    }

    // Active Sponsors Cards
    const activeSponsorCards = activeSponsors.map(({block, sponsor}) => {
        const balance = balances.get(block);
        const prognosis = prognoses.get(sponsor.id);
        const progress = balance && prognosis
            ? ((balance.totalThisSeason / prognosis.prognosis.expectedTotal) * 100).toFixed(0)
            : 0;

        return `
            <div class="active-sponsor-card glass">
                <h4 class="active-sponsor-header">${UI_TEXTS.blocks[block]} ${getTierBadgeHTML(sponsor.tier, 'small')}</h4>
                <h3 class="active-sponsor-name" style="color:${sponsor.color}">${escapeHtml(sponsor.name)}</h3>
                <p class="active-sponsor-slogan">"${escapeHtml(sponsor.slogan)}"</p>
                
                <div class="active-sponsor-balance">
                    <div class="balance-row"><span>💰 Einmalzahlung:</span><span class="balance-value-sm">${formatCurrency(balance?.payments?.initial ?? 0)} ✅</span></div>
                    <div class="balance-row"><span>⚽ Torprämien (${balance?.stats?.totalGoals ?? 0}):</span><span class="balance-value-sm">${formatCurrency(balance?.payments?.goalBonuses ?? 0)}</span></div>
                    <div class="balance-row"><span>🏆 Siegprämien (${balance?.stats?.totalWins ?? 0}):</span><span class="balance-value-sm">${formatCurrency(balance?.payments?.winBonuses ?? 0)}</span></div>
                    <div class="balance-row balance-total-sm"><span>TOTAL:</span><span class="balance-value-sm">${formatCurrency(balance?.totalThisSeason ?? 0)}</span></div>
                    <div class="balance-progress"><small>(${progress}% der Prognose)</small></div>
                </div>
            </div>
        `;
    }).join('');

    // Free Blocks Cards
    const freeBlockCards = freeBlocks.map(block => `
        <div class="free-sponsor-card glass">
            <h4>${UI_TEXTS.blocks[block]}</h4>
            <div class="free-sponsor-content">
                <div class="free-sponsor-icon">🆓</div>
                <p class="free-sponsor-text">Banner-Platz ungenutzt</p>
                ${stadiumState.features.advertising[block]
        ? `<button class="btn btn-primary" data-action="openSponsorSelection" data-block="${block}">+ Sponsor buchen 🎯</button>`
        : `<p class="free-sponsor-note">⚠️ Werbebande nicht installiert</p>`
    }
            </div>
        </div>
    `).join('');

    return `
        <h2 class="section-title">📊 Sponsor-Übersicht Saison ${stadiumState.season}</h2>
        
        <div class="sponsor-overview-balance glass">
            <h3>💰 Gesamtbilanz</h3>
            <div class="balance-grid">
                <div class="balance-item"><div class="balance-label">Einmalzahlungen:</div><div class="balance-value">${formatCurrency(totalRevenue.initial)}</div></div>
                <div class="balance-item"><div class="balance-label">Torprämien:</div><div class="balance-value">${formatCurrency(totalRevenue.goals)}</div></div>
                <div class="balance-item"><div class="balance-label">Siegprämien:</div><div class="balance-value">${formatCurrency(totalRevenue.wins)}</div></div>
                <div class="balance-item"><div class="balance-label">Titelprämien:</div><div class="balance-value">${formatCurrency(totalRevenue.titles)}</div></div>
                <div class="balance-item balance-total"><div class="balance-label">GESAMT:</div><div class="balance-value">${formatCurrency(totalRevenue.total)}</div></div>
            </div>
        </div>
        
        <div class="sponsor-overview-active glass">
            <h3>📺 Aktive Sponsoren (${activeSponsors.length}/4)</h3>
            ${activeSponsorCards}
            ${freeBlockCards}
        </div>
        
        ${projection ? `
            <div class="sponsor-overview-projection glass">
                <h3>📈 Hochrechnung Saisonende</h3>
                <p>Ø ${projection.avgGoalsPerGame} Tore/Spiel • ${projection.winRate}% Siegquote</p>
                <div class="projection-total">
                    <div class="projection-label">Erwartete Gesamt-Einnahmen:</div>
                    <div class="projection-value">${formatCurrency(projection.projectedTotal)}</div>
                </div>
            </div>
        ` : ''}
    `;
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Schließt aktuelles Modal
 */
export const closeModal = (resetState = true) => {
    const {currentModal} = modalState;

    if (currentModal) {
        currentModal.classList.remove('active');

        setTimeout(() => {
            currentModal.remove();
        }, 300);

        modalState.currentModal = null;
    }

    if (resetState) {
        modalState.currentBlock = null;
        modalState.comparisonMode = false;
        modalState.selectedForComparison = [];
        modalState.cachedSponsors = null;
        modalState.cachedPrognoses = null;
    }
};

export const toggleComparisonMode = () => {
    modalState.comparisonMode = !modalState.comparisonMode;
    if (!modalState.comparisonMode) {
        modalState.selectedForComparison = [];
    }
};

export const toggleSponsorForComparison = (sponsorId) => {
    const idx = modalState.selectedForComparison.indexOf(sponsorId);

    if (idx > -1) {
        modalState.selectedForComparison.splice(idx, 1);
    } else if (modalState.selectedForComparison.length < 3) {
        modalState.selectedForComparison.push(sponsorId);
    }

    return modalState.selectedForComparison.length === 3;
};

export const updateFilter = (filterType, value) => {
    modalState.filters[filterType] = value;
};

export const updateSort = (sortValue) => {
    modalState.sort = sortValue;
};

export const getCurrentBlock = () => modalState.currentBlock;
export const getSelectedForComparison = () => [...modalState.selectedForComparison];

// =====================================================
// PERFORMANCE DEBUGGING
// =====================================================

export const getPerformanceStats = () => ({
    lastRenderTime: modalState.lastRenderTime,
    renderCount: modalState.renderCount,
    templateCacheSize: templateCache.size,
    escapeCacheSize: escapeCache.size
});

// Debug-Funktion global verfügbar machen
if (typeof window !== 'undefined') {
    window.getSponsorUIStats = getPerformanceStats;
}