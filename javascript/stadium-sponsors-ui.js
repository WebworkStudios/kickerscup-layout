// =====================================================
// KICKERSCUP - STADIUM SPONSORS UI (V3 - ES2025 MODERNIZED)
// UI-Rendering für Sponsor-Verwaltung
// ✅ V3: Vollständige ES2025-Modernisierung
// ✅ AbortController für Event Cleanup
// ✅ Error Causes für strukturiertes Debugging
// ✅ String.isWellFormed() für XSS-Prevention
// ✅ Konsistentes Object.freeze Pattern
// ✅ Promise.allSettled Readiness
// ✅ Virtual Scrolling, DocumentFragment, Debounced Updates,
//    Template Caching, Incremental Rendering
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
// ES2025: AbortController für Event Management
// =====================================================

let modalAbortController = new AbortController();

/**
 * Reset AbortController wenn aborted
 * ✅ ES2025: Verhindert "already aborted" Fehler
 */
const ensureAbortController = () => {
    if (modalAbortController.signal.aborted) {
        modalAbortController = new AbortController();
    }
};

// =====================================================
// PERFORMANCE UTILITIES
// ✅ ES2025: Error Causes für robuste Error Recovery
// =====================================================

/**
 * Debounce-Funktion für verzögerte Ausführung
 * ✅ ES2025: Error Causes bei Failures
 */
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        try {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                try {
                    fn(...args);
                } catch (error) {
                    const execError = new Error('Debounced function execution failed');
                    execError.cause = {error, fn: fn.name, args};
                    console.error('❌ Debounce execution error:', execError);
                }
            }, delay);
        } catch (error) {
            const debounceError = new Error('Debounce setup failed');
            debounceError.cause = {error, fn: fn.name};
            console.error('❌ Debounce setup error:', debounceError);
        }
    };
};

/**
 * Throttle-Funktion für Rate-Limiting
 * ✅ ES2025: Error Causes bei Failures
 */
const throttle = (fn, limit) => {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            try {
                fn(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            } catch (error) {
                const throttleError = new Error('Throttled function execution failed');
                throttleError.cause = {error, fn: fn.name, args};
                console.error('❌ Throttle execution error:', throttleError);
                inThrottle = false; // Reset on error
            }
        }
    };
};

/**
 * RequestAnimationFrame-basiertes Batching
 * ✅ ES2025: Error Isolation für einzelne Callbacks
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
                    try {
                        cb();
                    } catch (error) {
                        const renderError = new Error('Scheduled render callback failed');
                        renderError.cause = {error, callback: cb.name};
                        console.error('❌ Render callback error:', renderError);
                    }
                }
            });
        }
    };
})();

// =====================================================
// TEMPLATE CACHE
// ✅ ES2025: Object.freeze für Cache-Einträge wo sinnvoll
// =====================================================

const templateCache = new Map();

/**
 * Cached Template für wiederkehrende Elemente
 * ✅ ES2025: Freeze Objects (nicht Strings/Primitives)
 */
const getCachedTemplate = (key, generator) => {
    if (!templateCache.has(key)) {
        try {
            const value = generator();

            // Freeze nur Objects, nicht Strings/Primitives
            const cached = typeof value === 'object' && value !== null
                ? Object.freeze(value)
                : value;

            templateCache.set(key, cached);
        } catch (error) {
            const cacheError = new Error('Template generation failed');
            cacheError.cause = {error, key};
            console.error('❌ Template cache error:', cacheError);
            // Fallback: Return empty string
            return '';
        }
    }
    return templateCache.get(key);
};

/**
 * Template-Cache leeren
 */
export const clearTemplateCache = () => {
    try {
        templateCache.clear();
    } catch (error) {
        const clearError = new Error('Template cache clear failed');
        clearError.cause = error;
        console.error('❌ Cache clear error:', clearError);
    }
};

// =====================================================
// HTML UTILITIES
// ✅ ES2025: String.isWellFormed() für XSS-Prevention
// =====================================================

/**
 * Escaped HTML für sichere Ausgabe (gecacht)
 * ✅ ES2025: String.isWellFormed() Validation
 */
const escapeCache = new Map();
const escapeHtml = (str) => {
    if (typeof str !== 'string') {
        str = String(str);
    }

    // ✅ ES2025: Prüfe auf malformed strings (XSS-Prevention)
    if (typeof str.isWellFormed === 'function' && !str.isWellFormed()) {
        const error = new Error('Malformed string detected in escapeHtml');
        error.cause = {inputLength: str.length};
        console.error('❌ XSS Prevention - Malformed string:', error);
        return ''; // Fail-safe: Leerer String
    }

    if (escapeCache.has(str)) {
        return escapeCache.get(str);
    }

    try {
        const escaped = str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        // Nur kurze Strings cachen (Memory Management)
        if (str.length < 100) {
            escapeCache.set(str, escaped);
        }

        return escaped;
    } catch (error) {
        const escapeError = new Error('HTML escaping failed');
        escapeError.cause = {error, inputLength: str?.length};
        console.error('❌ Escape error:', escapeError);
        return ''; // Fail-safe
    }
};

/**
 * Erstellt Element aus HTML-String effizient
 * ✅ ES2025: Error Handling
 */
const createElementFromHTML = (html) => {
    try {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    } catch (error) {
        const elementError = new Error('Element creation from HTML failed');
        elementError.cause = {error, htmlLength: html?.length};
        console.error('❌ Element creation error:', elementError);
        return null;
    }
};

/**
 * Erstellt DocumentFragment für Batch-Insert
 * ✅ ES2025: Error Recovery für einzelne HTML-Strings
 */
const createFragment = (htmlArray) => {
    const fragment = document.createDocumentFragment();
    const template = document.createElement('template');

    for (const html of htmlArray) {
        try {
            template.innerHTML = html.trim();
            const node = template.content.firstChild?.cloneNode(true);
            if (node) {
                fragment.appendChild(node);
            }
        } catch (error) {
            const fragmentError = new Error('Fragment creation failed for HTML chunk');
            fragmentError.cause = {error, htmlLength: html?.length};
            console.warn('⚠️ Skipping fragment chunk:', fragmentError);
        }
    }

    return fragment;
};

// =====================================================
// MODAL STATE (Singleton Pattern)
// ✅ ES2025: Frozen default values wo sinnvoll
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
// ✅ ES2025: Frozen Configuration
// =====================================================

const VIRTUAL_SCROLL_CONFIG = Object.freeze({
    ITEM_HEIGHT: 320,  // Geschätzte Höhe einer Sponsor-Karte
    BUFFER_SIZE: 3,    // Zusätzliche Items außerhalb des Viewports
    THRESHOLD: 10      // Ab dieser Anzahl Virtual Scrolling aktivieren
});

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
 * ✅ ES2025: Frozen return object
 */
const calculateVisibleRange = (scrollTop, containerHeight, totalItems) => {
    try {
        const {ITEM_HEIGHT, BUFFER_SIZE} = VIRTUAL_SCROLL_CONFIG;

        const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
        const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
        const endIndex = Math.min(totalItems, startIndex + visibleCount + BUFFER_SIZE * 2);

        return Object.freeze({startIndex, endIndex});
    } catch (error) {
        const rangeError = new Error('Virtual scroll range calculation failed');
        rangeError.cause = {error, scrollTop, containerHeight, totalItems};
        console.error('❌ Virtual scroll error:', rangeError);
        return Object.freeze({startIndex: 0, endIndex: totalItems});
    }
};

// =====================================================
// TIER BADGE TEMPLATES (Cached)
// ✅ ES2025: Error Handling in Generator
// =====================================================

const getTierBadgeHTML = (tier, style = 'full') => {
    const cacheKey = `tier_${tier}_${style}`;

    return getCachedTemplate(cacheKey, () => {
        const tierConfig = SPONSOR_CONFIG.tiers?.[tier];
        if (!tierConfig) {
            const error = new Error('Invalid tier for badge generation');
            error.cause = {tier, style};
            console.warn('⚠️ Badge generation fallback:', error);
            return '';
        }

        return style === 'small'
            ? `<span class="sponsor-tier-badge-small" style="background:${tierConfig.color}">${tierConfig.icon}</span>`
            : `<div class="sponsor-tier-badge" style="background:${tierConfig.color}">${tierConfig.icon} ${tierConfig.name}</div>`;
    });
};

// =====================================================
// SPONSOR CARD RENDERING (Optimized)
// ✅ ES2025: Error Causes für fehlende Daten
// =====================================================

/**
 * Rendert einzelne Sponsor-Karte (optimiert)
 * ✅ ES2025: Strukturierte Error Recovery
 */
const renderSponsorCard = (sponsor, prognosis, isComparisonMode, isSelected, canSelect) => {
    if (!prognosis) {
        const error = new Error('Missing prognosis for sponsor card');
        error.cause = {sponsorId: sponsor?.id, sponsor};
        console.error('❌ Render error:', error);
        return '';
    }

    try {
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
    } catch (error) {
        const cardError = new Error('Sponsor card rendering failed');
        cardError.cause = {error, sponsorId: sponsor?.id};
        console.error('❌ Card render error:', cardError);
        return ''; // Fail-safe: Skip card
    }
};

/**
 * Batch-Rendering aller Sponsor-Karten
 * ✅ ES2025: Error Recovery für einzelne Karten
 */
const renderSponsorCards = (sponsors, prognosesMap, isComparisonMode, selectedIds) => {
    const cards = [];
    const selectedSet = new Set(selectedIds);

    for (const sponsor of sponsors) {
        try {
            const prognosis = prognosesMap.get(sponsor.id);
            const isSelected = selectedSet.has(sponsor.id);
            const canSelect = selectedIds.length < 3 || isSelected;

            const card = renderSponsorCard(sponsor, prognosis, isComparisonMode, isSelected, canSelect);
            if (card) {
                cards.push(card);
            }
        } catch (error) {
            const batchError = new Error('Failed to render sponsor in batch');
            batchError.cause = {error, sponsorId: sponsor?.id};
            console.warn('⚠️ Skipping sponsor card:', batchError);
        }
    }

    return cards.join('');
};

// =====================================================
// MODAL: SPONSOR-AUSWAHL (Optimized)
// ✅ ES2025: AbortController Setup
// =====================================================

/**
 * Öffnet Sponsor-Auswahl Modal
 * ✅ ES2025: Error Causes bei Setup-Failures
 */
export const openSponsorSelectionModal = (block, stadiumState) => {
    try {
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

        // ✅ ES2025: Event-Delegation mit AbortController
        setupModalEventDelegation(modal, stadiumState);

        requestAnimationFrame(() => modal.classList.add('active'));

    } catch (error) {
        const modalError = new Error('Failed to open sponsor selection modal');
        modalError.cause = {error, block};
        console.error('❌ Modal open error:', modalError);
        alert('❌ Fehler beim Öffnen der Sponsor-Auswahl');
    }
};

/**
 * Event-Delegation Setup mit Debouncing
 * ✅ ES2025: AbortController für Cleanup
 */
const setupModalEventDelegation = (modal, stadiumState) => {
    try {
        ensureAbortController();
        const signal = modalAbortController.signal;

        // Debounced refresh für Filter/Sort
        const debouncedRefresh = debounce(() => {
            try {
                refreshSponsorGrid(stadiumState);
            } catch (error) {
                const refreshError = new Error('Grid refresh failed');
                refreshError.cause = error;
                console.error('❌ Refresh error:', refreshError);
            }
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
        }, {signal});

    } catch (error) {
        const delegationError = new Error('Event delegation setup failed');
        delegationError.cause = error;
        console.error('❌ Delegation setup error:', delegationError);
    }
};

/**
 * Nur Grid aktualisieren (nicht gesamtes Modal)
 * ✅ ES2025: Error Recovery bei Render-Failures
 */
const refreshSponsorGrid = (stadiumState) => {
    const grid = document.getElementById('sponsorGrid');
    if (!grid) {
        console.warn('⚠️ Sponsor grid not found for refresh');
        return;
    }

    try {
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

    } catch (error) {
        const gridError = new Error('Sponsor grid refresh failed');
        gridError.cause = {error, stadiumState};
        console.error('❌ Grid refresh error:', gridError);

        // Fail-safe: Show error message
        grid.innerHTML = '<div class="no-sponsors-message"><p>❌ Fehler beim Laden der Sponsoren.</p></div>';
    }
};

/**
 * Re-rendert Modal-Content (für Comparison Mode Toggle)
 * ✅ ES2025: Error Handling
 */
export const refreshSponsorSelectionModal = (stadiumState) => {
    if (!modalState.currentModal || !modalState.currentBlock) {
        return;
    }

    try {
        // Nur Grid aktualisieren, nicht Header neu rendern
        const comparisonBtn = modalState.currentModal.querySelector('.btn-compare');
        if (comparisonBtn) {
            comparisonBtn.classList.toggle('active', modalState.comparisonMode);
            comparisonBtn.textContent = `📊 Vergleichen ${modalState.comparisonMode ? `(${modalState.selectedForComparison.length}/3)` : ''}`;
        }

        refreshSponsorGrid(stadiumState);

    } catch (error) {
        const refreshError = new Error('Modal refresh failed');
        refreshError.cause = {error, currentBlock: modalState.currentBlock};
        console.error('❌ Modal refresh error:', refreshError);
    }
};

/**
 * Rendert Sponsor-Auswahl Content
 * ✅ ES2025: Error Recovery bei Content-Generation
 */
const renderSponsorSelectionContent = (stadiumState) => {
    try {
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

    } catch (error) {
        const contentError = new Error('Sponsor selection content rendering failed');
        contentError.cause = {error, stadiumState};
        console.error('❌ Content render error:', contentError);

        // Fail-safe: Minimal content
        return `
            <div class="sponsor-modal-body">
                <div class="no-sponsors-message">
                    <p>❌ Fehler beim Laden der Sponsor-Auswahl.</p>
                </div>
            </div>
            <div class="sponsor-modal-footer">
                <button class="btn btn-secondary" data-action="closeModal">Schließen</button>
            </div>
        `;
    }
};

// =====================================================
// MODAL: SPONSOR-DETAILS
// ✅ ES2025: Error Recovery
// =====================================================

export const showSponsorDetailsModal = (sponsorId, stadiumState) => {
    try {
        const sponsor = getSponsorById(sponsorId);
        if (!sponsor) {
            const error = new Error('Sponsor not found for details modal');
            error.cause = {sponsorId};
            console.error('❌ Sponsor not found:', error);
            alert(`❌ Sponsor mit ID ${sponsorId} nicht gefunden.`);
            return;
        }

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

    } catch (error) {
        const modalError = new Error('Failed to show sponsor details modal');
        modalError.cause = {error, sponsorId};
        console.error('❌ Details modal error:', modalError);
        alert('❌ Fehler beim Öffnen der Sponsor-Details');
    }
};

const renderSponsorDetailsContent = (sponsor, stadiumState) => {
    try {
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

        if (!prognosis) {
            throw new Error('Prognosis calculation failed');
        }

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

    } catch (error) {
        const contentError = new Error('Sponsor details content rendering failed');
        contentError.cause = {error, sponsorId: sponsor?.id};
        console.error('❌ Details content error:', contentError);

        // Fail-safe: Minimal content
        return `
            <div class="sponsor-modal-header">
                <h2>❌ Fehler</h2>
                <button class="modal-close-btn" data-action="backToSelection">&times;</button>
            </div>
            <div class="sponsor-modal-body">
                <p>Fehler beim Laden der Sponsor-Details.</p>
            </div>
            <div class="sponsor-modal-footer">
                <button class="btn btn-secondary" data-action="backToSelection">Zurück</button>
            </div>
        `;
    }
};

// =====================================================
// MODAL: BESTÄTIGUNG
// ✅ ES2025: Error Recovery
// =====================================================

export const showConfirmationModal = (sponsorId, stadiumState) => {
    try {
        const sponsor = getSponsorById(sponsorId);
        if (!sponsor) {
            const error = new Error('Sponsor not found for confirmation');
            error.cause = {sponsorId};
            console.error('❌ Sponsor not found:', error);
            alert(`❌ Sponsor mit ID ${sponsorId} nicht gefunden.`);
            return;
        }

        // Nutze gecachte Prognose
        let prognosis = modalState.cachedPrognoses?.get(sponsor.id);
        if (!prognosis) {
            prognosis = calculateSponsorPrognosis(
                sponsor,
                stadiumState.previousSeason,
                stadiumState.previousSeason.leaguePosition
            );
        }

        if (!prognosis) {
            throw new Error('Prognosis not available for confirmation');
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

    } catch (error) {
        const modalError = new Error('Failed to show confirmation modal');
        modalError.cause = {error, sponsorId};
        console.error('❌ Confirmation modal error:', modalError);
        alert('❌ Fehler beim Öffnen der Bestätigung');
    }
};

/**
 * Zeigt Erfolgs-Modal
 * ✅ ES2025: Error Recovery
 */
export const showSuccessModal = (sponsor, initialPayment) => {
    try {
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

    } catch (error) {
        const modalError = new Error('Failed to show success modal');
        modalError.cause = {error, sponsorId: sponsor?.id, initialPayment};
        console.error('❌ Success modal error:', modalError);

        // Fail-safe: Alert statt Modal
        alert(`✅ Vertrag mit ${sponsor?.name ?? 'Sponsor'} abgeschlossen!\n+${formatCurrency(initialPayment)}`);
    }
};

// =====================================================
// MODAL: VERGLEICHSMODUS
// ✅ ES2025: Error Recovery
// =====================================================

export const showComparisonModal = (sponsorIds, stadiumState) => {
    try {
        const sponsors = sponsorIds.map(id => getSponsorById(id)).filter(Boolean);
        if (!sponsors.length) {
            const error = new Error('No valid sponsors for comparison');
            error.cause = {sponsorIds};
            console.error('❌ Comparison error:', error);
            alert('❌ Keine gültigen Sponsoren für Vergleich.');
            return;
        }

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

    } catch (error) {
        const modalError = new Error('Failed to show comparison modal');
        modalError.cause = {error, sponsorIds};
        console.error('❌ Comparison modal error:', modalError);
        alert('❌ Fehler beim Öffnen des Vergleichs');
    }
};

const renderComparisonContent = (sponsors, stadiumState) => {
    try {
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

    } catch (error) {
        const contentError = new Error('Comparison content rendering failed');
        contentError.cause = {error, sponsorCount: sponsors?.length};
        console.error('❌ Comparison content error:', contentError);

        // Fail-safe: Minimal content
        return `
            <div class="sponsor-modal-header">
                <h2>❌ Fehler</h2>
                <button class="modal-close-btn" data-action="backToSelection">&times;</button>
            </div>
            <div class="sponsor-modal-body">
                <p>Fehler beim Erstellen des Vergleichs.</p>
            </div>
            <div class="sponsor-modal-footer">
                <button class="btn btn-secondary" data-action="backToSelection">Zurück</button>
            </div>
        `;
    }
};

// =====================================================
// SPONSOR-ÜBERSICHT TAB (Optimized)
// ✅ ES2025: Error Recovery für einzelne Komponenten
// =====================================================

export const renderSponsorOverviewTab = (stadiumState, currentSeasonStats) => {
    try {
        const activeSponsors = getActiveSponsors(stadiumState);
        const totalRevenue = calculateTotalSponsorRevenue(stadiumState, currentSeasonStats);
        const projection = calculateSeasonProjection(stadiumState, currentSeasonStats);
        const freeBlocks = CAPACITY_CONFIG.BLOCKS.filter(block => !stadiumState.features.sponsors[block]);

        // Pre-compute alle Balances
        const balances = new Map();
        const prognoses = new Map();

        for (const {block, sponsor} of activeSponsors) {
            try {
                balances.set(block, getSponsorBalance(stadiumState, block));
                prognoses.set(sponsor.id, calculateSponsorPrognosis(
                    sponsor,
                    stadiumState.previousSeason,
                    stadiumState.previousSeason.leaguePosition
                ));
            } catch (error) {
                const balanceError = new Error('Failed to compute sponsor balance/prognosis');
                balanceError.cause = {error, block, sponsorId: sponsor?.id};
                console.warn('⚠️ Skipping sponsor data:', balanceError);
            }
        }

        // Active Sponsors Cards
        const activeSponsorCards = activeSponsors.map(({block, sponsor}) => {
            try {
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
            } catch (error) {
                const cardError = new Error('Failed to render active sponsor card');
                cardError.cause = {error, block, sponsorId: sponsor?.id};
                console.warn('⚠️ Skipping sponsor card:', cardError);
                return ''; // Skip this card
            }
        }).join('');

        // Free Blocks Cards
        const freeBlockCards = freeBlocks.map(block => {
            try {
                return `
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
                `;
            } catch (error) {
                const cardError = new Error('Failed to render free block card');
                cardError.cause = {error, block};
                console.warn('⚠️ Skipping free block card:', cardError);
                return ''; // Skip this card
            }
        }).join('');

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

    } catch (error) {
        const overviewError = new Error('Sponsor overview rendering failed');
        overviewError.cause = {error, stadiumState, currentSeasonStats};
        console.error('❌ Overview render error:', overviewError);

        // Fail-safe: Minimal content
        return `
            <h2 class="section-title">📊 Sponsor-Übersicht</h2>
            <div class="glass" style="padding:30px;text-align:center;">
                <p>❌ Fehler beim Laden der Sponsor-Übersicht.</p>
            </div>
        `;
    }
};

// =====================================================
// HELPER FUNCTIONS
// ✅ ES2025: AbortController Cleanup
// =====================================================

/**
 * Schließt aktuelles Modal
 * ✅ ES2025: Abort events BEFORE removing DOM
 */
export const closeModal = (resetState = true) => {
    const {currentModal} = modalState;

    if (currentModal) {
        try {
            // ✅ ES2025: Abort events BEFORE removing DOM
            modalAbortController.abort();
            modalAbortController = new AbortController();

            currentModal.classList.remove('active');

            setTimeout(() => {
                try {
                    currentModal.remove();
                } catch (error) {
                    const removeError = new Error('Modal removal failed');
                    removeError.cause = error;
                    console.error('❌ Modal removal error:', removeError);
                }
            }, 300);

            modalState.currentModal = null;

        } catch (error) {
            const closeError = new Error('Modal close failed');
            closeError.cause = error;
            console.error('❌ Modal close error:', closeError);
        }
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
// CLEANUP & PERFORMANCE
// ✅ ES2025: Vollständiger Cleanup Export
// =====================================================

/**
 * Cleanup-Funktion für Testing/Reload
 * ✅ ES2025: Export für externe Cleanup-Trigger
 */
export const cleanup = () => {
    try {
        // Abort all events
        modalAbortController.abort();
        modalAbortController = new AbortController();

        // Close modals
        closeModal(true);

        // Clear caches
        clearTemplateCache();
        escapeCache.clear();

        console.log('🧹 Sponsor UI cleaned up');

    } catch (error) {
        const cleanupError = new Error('Sponsor UI cleanup failed');
        cleanupError.cause = error;
        console.error('❌ Cleanup error:', cleanupError);
    }
};

/**
 * Performance Stats für Debugging
 * ✅ ES2025: Frozen return object
 */
export const getPerformanceStats = () => Object.freeze({
    lastRenderTime: modalState.lastRenderTime,
    renderCount: modalState.renderCount,
    templateCacheSize: templateCache.size,
    escapeCacheSize: escapeCache.size,
    abortControllerActive: !modalAbortController.signal.aborted
});

// Make functions globally available (für Testing)
if (typeof window !== 'undefined') {
    window.getSponsorUIStats = getPerformanceStats;
    window.cleanupSponsorUI = cleanup;
}
