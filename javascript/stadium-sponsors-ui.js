// =====================================================
// KICKERSCUP - STADIUM SPONSORS UI (OPTIMIZED)
// UI-Rendering für Sponsor-Verwaltung
// ✅ OPTIMIERT: Template-Caching, Event-Delegation, DOM-Batching
// =====================================================

import {
    SPONSOR_CONFIG,
    CAPACITY_CONFIG,
    UI_TEXTS,
    formatCurrency,
    getSponsorById
} from './stadium-config.js';

import {
    getAvailableSponsors,
    calculateSponsorPrognosis,
    filterSponsors,
    sortSponsors,
    getAvailableIndustries,
    prepareSponsorComparison,
    findBestValues,
    getSponsorRecommendation,
    getActiveSponsors,
    calculateTotalSponsorRevenue,
    calculateSeasonProjection,
    getSponsorBalance
} from './stadium-sponsors.js';

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
    sort: 'prognosis_desc'
};

// =====================================================
// TEMPLATE HELPERS (Cached String Templates)
// =====================================================

/**
 * Escaped HTML für sichere Ausgabe
 */
const escapeHtml = (str) => {
    if (typeof str !== 'string') return String(str);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

/**
 * Erstellt Modal-Container effizient
 */
const createModalElement = (id) => {
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'sponsor-modal';
    return modal;
};

/**
 * Generiert Tier-Badge HTML
 */
const renderTierBadge = (tier, style = 'full') => {
    const tierConfig = SPONSOR_CONFIG.tiers[tier];
    if (!tierConfig) return '';

    return style === 'small'
        ? `<span class="sponsor-tier-badge-small" style="background:${tierConfig.color}">${tierConfig.icon}</span>`
        : `<div class="sponsor-tier-badge" style="background:${tierConfig.color}">${tierConfig.icon} ${tierConfig.name}</div>`;
};

// =====================================================
// MODAL: SPONSOR-AUSWAHL
// =====================================================

/**
 * Öffnet Sponsor-Auswahl Modal
 */
export const openSponsorSelectionModal = (block, stadiumState) => {
    modalState.currentBlock = block;
    modalState.comparisonMode = false;
    modalState.selectedForComparison = [];

    const modal = createModalElement('sponsor-selection-modal');
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

    // RAF für Animation
    requestAnimationFrame(() => modal.classList.add('active'));
};

/**
 * Re-rendert Modal-Content ohne Schließen
 */
export const refreshSponsorSelectionModal = (stadiumState) => {
    if (!modalState.currentModal || !modalState.currentBlock) return;

    const modalContent = modalState.currentModal.querySelector('.sponsor-modal-content');
    if (!modalContent) return;

    const content = renderSponsorSelectionContent(stadiumState);
    const header = `
        <div class="sponsor-modal-header">
            <h2>🎯 Werbebanner buchen - ${UI_TEXTS.blocks[modalState.currentBlock]}</h2>
            <button class="modal-close-btn" data-action="closeModal">&times;</button>
        </div>
    `;

    modalContent.innerHTML = header + content;
};

/**
 * Rendert Sponsor-Auswahl Content
 */
const renderSponsorSelectionContent = (stadiumState) => {
    const availableSponsors = getAvailableSponsors(stadiumState.capacity.total);
    const leaguePosition = stadiumState.previousSeason.leaguePosition;
    const previousSeason = stadiumState.previousSeason;

    // Filter & Sortierung anwenden
    let filteredSponsors = filterSponsors(availableSponsors, {
        ...modalState.filters,
        leaguePosition
    });

    filteredSponsors = sortSponsors(filteredSponsors, modalState.sort, previousSeason, leaguePosition);

    const industries = getAvailableIndustries(availableSponsors);
    const posText = leaguePosition <= 3 ? '(+30%)'
        : leaguePosition <= 8 ? '(+15%)'
            : leaguePosition <= 14 ? '(±0%)'
                : '(-15%)';

    // Sponsor Cards als Array für bessere Performance
    const sponsorCards = filteredSponsors.map(sponsor =>
        renderSponsorCard(sponsor, stadiumState)
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
                        ${Object.entries(SPONSOR_CONFIG.tiers).map(([key, tier]) => `
                            <option value="${key}" ${modalState.filters.tier === key ? 'selected' : ''}>${tier.icon} ${tier.name}</option>
                        `).join('')}
                    </select>
                    
                    <select class="filter-select" data-filter="industry">
                        <option value="all">Alle Branchen</option>
                        ${industries.map(ind => `
                            <option value="${escapeHtml(ind)}" ${modalState.filters.industry === ind ? 'selected' : ''}>${escapeHtml(ind)}</option>
                        `).join('')}
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

/**
 * Rendert einzelne Sponsor-Karte
 */
const renderSponsorCard = (sponsor, stadiumState) => {
    const tier = SPONSOR_CONFIG.tiers[sponsor.tier];
    const prognosis = calculateSponsorPrognosis(
        sponsor,
        stadiumState.previousSeason,
        stadiumState.previousSeason.leaguePosition
    );

    if (!prognosis) return '';

    const isSelected = modalState.selectedForComparison.includes(sponsor.id);
    const canSelect = modalState.selectedForComparison.length < 3 || isSelected;

    return `
        <div class="sponsor-card ${modalState.comparisonMode ? 'comparison-mode' : ''} ${isSelected ? 'selected' : ''}" 
             data-sponsor-id="${sponsor.id}" style="border-color:${sponsor.color}">
            
            ${modalState.comparisonMode ? `
                <div class="comparison-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} ${!canSelect ? 'disabled' : ''}
                           data-action="toggleComparison" data-sponsor-id="${sponsor.id}">
                </div>
            ` : ''}
            
            <div class="sponsor-card-header">${renderTierBadge(sponsor.tier)}</div>
            
            <h3 class="sponsor-name" style="color:${sponsor.color}">${escapeHtml(sponsor.name)}</h3>
            <p class="sponsor-industry">${escapeHtml(sponsor.industry)}</p>
            <p class="sponsor-slogan">"${escapeHtml(sponsor.slogan)}"</p>
            
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

// =====================================================
// MODAL: SPONSOR-DETAILS
// =====================================================

export const showSponsorDetailsModal = (sponsorId, stadiumState) => {
    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) return;

    closeModal(false);

    const modal = createModalElement('sponsor-details-modal');
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
    const prognosis = calculateSponsorPrognosis(
        sponsor,
        stadiumState.previousSeason,
        stadiumState.previousSeason.leaguePosition
    );

    if (!prognosis) return '<p>Fehler beim Laden der Sponsor-Details.</p>';

    const { previousSeason } = stadiumState;
    const avgGoalsPerGame = (previousSeason.totalGoals / previousSeason.totalGames).toFixed(1);
    const winRate = ((previousSeason.totalWins / previousSeason.totalGames) * 100).toFixed(0);

    return `
        <div class="sponsor-modal-header">
            <div>
                <h2 style="color:${sponsor.color}">${escapeHtml(sponsor.name)}</h2>
                <p class="sponsor-detail-meta">${tier.icon} ${tier.name} • ${escapeHtml(sponsor.industry)}</p>
            </div>
            <button class="modal-close-btn" data-action="backToSelection">&times;</button>
        </div>
        
        <div class="sponsor-modal-body">
            <div class="sponsor-detail-intro">
                <p class="sponsor-slogan-large">"${escapeHtml(sponsor.slogan)}"</p>
                <p class="sponsor-website">${escapeHtml(sponsor.website)}</p>
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

    const prognosis = calculateSponsorPrognosis(
        sponsor,
        stadiumState.previousSeason,
        stadiumState.previousSeason.leaguePosition
    );

    closeModal(false);

    const modal = createModalElement('sponsor-confirmation-modal');
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

    const modal = createModalElement('sponsor-success-modal');
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

    const modal = createModalElement('sponsor-comparison-modal');
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
                            ${comparisons.map(c => `
                                <th class="comparison-sponsor-col" style="border-top:3px solid ${c.sponsor.color}">
                                    <div class="comparison-sponsor-header">
                                        <div class="comparison-sponsor-name">${escapeHtml(c.sponsor.name)}</div>
                                        ${renderTierBadge(c.sponsor.tier, 'small')}
                                    </div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="comparison-label">💰 Einmalzahlung</td>
                            ${comparisons.map(c => renderComparisonCell(c.adjustedPayment.initial, bestValues.bestInitial)).join('')}
                        </tr>
                        <tr>
                            <td class="comparison-label">⚽ Pro Tor</td>
                            ${comparisons.map(c => renderComparisonCell(c.adjustedPayment.perGoal, bestValues.bestPerGoal)).join('')}
                        </tr>
                        <tr>
                            <td class="comparison-label">🏆 Pro Sieg</td>
                            ${comparisons.map(c => renderComparisonCell(c.adjustedPayment.perWin, bestValues.bestPerWin)).join('')}
                        </tr>
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
// SPONSOR-ÜBERSICHT TAB
// =====================================================

export const renderSponsorOverviewTab = (stadiumState, currentSeasonStats) => {
    const activeSponsors = getActiveSponsors(stadiumState);
    const totalRevenue = calculateTotalSponsorRevenue(stadiumState, currentSeasonStats);
    const projection = calculateSeasonProjection(stadiumState, currentSeasonStats);
    const freeBlocks = CAPACITY_CONFIG.BLOCKS.filter(block => !stadiumState.features.sponsors[block]);

    // Active Sponsors Cards
    const activeSponsorCards = activeSponsors.map(({ block, sponsor }) => {
        const balance = getSponsorBalance(stadiumState, block);
        const prognosis = calculateSponsorPrognosis(sponsor, stadiumState.previousSeason, stadiumState.previousSeason.leaguePosition);
        const progress = balance && prognosis ? ((balance.totalThisSeason / prognosis.prognosis.expectedTotal) * 100).toFixed(0) : 0;

        return `
            <div class="active-sponsor-card glass">
                <h4 class="active-sponsor-header">${UI_TEXTS.blocks[block]} ${renderTierBadge(sponsor.tier, 'small')}</h4>
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
    const { currentModal } = modalState;

    if (currentModal) {
        currentModal.classList.remove('active');

        // Cleanup nach Animation
        setTimeout(() => {
            currentModal.remove();
        }, 300);

        modalState.currentModal = null;
    }

    if (resetState) {
        modalState.currentBlock = null;
        modalState.comparisonMode = false;
        modalState.selectedForComparison = [];
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