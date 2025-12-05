// =====================================================
// KICKERSCUP - STADIUM SPONSORS UI (ESM)
// UI-Rendering für Sponsor-Verwaltung
// =====================================================

import {
    SPONSOR_CONFIG,
    CAPACITY_CONFIG,
    UI_TEXTS,
    formatCurrency
} from './stadium-config-extended.js';

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
// MODAL STATE
// =====================================================

let currentModal = null;
let currentBlock = null;
let comparisonMode = false;
let selectedForComparison = [];
let currentFilters = {
    tier: 'all',
    industry: 'all',
    paymentType: null
};
let currentSort = 'prognosis_desc';

// =====================================================
// MODAL: SPONSOR-AUSWAHL
// =====================================================

/**
 * Öffnet Sponsor-Auswahl Modal
 */
export function openSponsorSelectionModal(block, stadiumState) {
    currentBlock = block;
    comparisonMode = false;
    selectedForComparison = [];
    
    const modal = createModal('sponsor-selection-modal');
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
    currentModal = modal;
    
    // Fade-in Animation
    setTimeout(() => modal.classList.add('active'), 10);
}

/**
 * Rendert Sponsor-Auswahl Content
 */
function renderSponsorSelectionContent(stadiumState) {
    const availableSponsors = getAvailableSponsors(stadiumState.capacity.total);
    const leaguePosition = stadiumState.previousSeason.leaguePosition;
    const previousSeason = stadiumState.previousSeason;
    
    // Filter & Sortierung anwenden
    let filteredSponsors = filterSponsors(availableSponsors, {
        ...currentFilters,
        leaguePosition
    });
    
    filteredSponsors = sortSponsors(filteredSponsors, currentSort, previousSeason, leaguePosition);
    
    const industries = getAvailableIndustries(availableSponsors);
    const posMultiplier = SPONSOR_CONFIG.leaguePositionMultipliers[leaguePosition] || 1.0;
    const posText = leaguePosition <= 3 ? '(+30%)' : 
                    leaguePosition <= 8 ? '(+15%)' : 
                    leaguePosition <= 14 ? '(±0%)' : '(-15%)';
    
    return `
        <div class="sponsor-modal-body">
            <div class="sponsor-info-banner">
                <div class="info-item">
                    <span class="info-icon">⚠️</span>
                    <span>1 Banner = 1 Sponsor (nicht änderbar nach Buchung)</span>
                </div>
                <div class="info-item">
                    <span class="info-icon">📅</span>
                    <span>Vertragslaufzeit: ${SPONSOR_CONFIG.contractDuration} Saison</span>
                </div>
                <div class="info-item">
                    <span class="info-icon">🏆</span>
                    <span>Vorsaison: Platz ${leaguePosition} → ${posText}</span>
                </div>
            </div>
            
            <div class="sponsor-controls">
                <div class="sponsor-controls-row">
                    <button class="btn-compare ${comparisonMode ? 'active' : ''}" data-action="toggleComparisonMode">
                        📊 Vergleichen ${comparisonMode ? `(${selectedForComparison.length}/3)` : ''}
                    </button>
                    
                    <select class="filter-select" data-filter="tier">
                        <option value="all">Alle Kategorien</option>
                        <option value="international" ${currentFilters.tier === 'international' ? 'selected' : ''}>🌍 International</option>
                        <option value="national" ${currentFilters.tier === 'national' ? 'selected' : ''}>🏴 National</option>
                        <option value="regional" ${currentFilters.tier === 'regional' ? 'selected' : ''}>🏙️ Regional</option>
                        <option value="local" ${currentFilters.tier === 'local' ? 'selected' : ''}>🏘️ Lokal</option>
                    </select>
                    
                    <select class="filter-select" data-filter="industry">
                        <option value="all">Alle Branchen</option>
                        ${industries.map(ind => `
                            <option value="${ind}" ${currentFilters.industry === ind ? 'selected' : ''}>${ind}</option>
                        `).join('')}
                    </select>
                    
                    <select class="sort-select" data-sort="sponsor">
                        <option value="prognosis_desc" ${currentSort === 'prognosis_desc' ? 'selected' : ''}>Prognose (hoch → tief)</option>
                        <option value="initial_desc" ${currentSort === 'initial_desc' ? 'selected' : ''}>Einmalzahlung (hoch → tief)</option>
                        <option value="best_case_desc" ${currentSort === 'best_case_desc' ? 'selected' : ''}>Best Case Potenzial</option>
                        <option value="worst_case_desc" ${currentSort === 'worst_case_desc' ? 'selected' : ''}>Minimales Risiko</option>
                        <option value="name_asc" ${currentSort === 'name_asc' ? 'selected' : ''}>Alphabetisch A-Z</option>
                    </select>
                </div>
            </div>
            
            <div class="sponsor-grid" id="sponsorGrid">
                ${filteredSponsors.map(sponsor => renderSponsorCard(sponsor, stadiumState)).join('')}
            </div>
            
            ${filteredSponsors.length === 0 ? `
                <div class="no-sponsors-message">
                    <p>Keine Sponsoren in dieser Kategorie verfügbar.</p>
                    <p>Erhöhen Sie Ihre Stadion-Kapazität für bessere Angebote!</p>
                </div>
            ` : ''}
        </div>
        
        <div class="sponsor-modal-footer">
            <button class="btn btn-secondary" data-action="closeModal">Abbrechen</button>
        </div>
    `;
}

/**
 * Rendert einzelne Sponsor-Karte
 */
function renderSponsorCard(sponsor, stadiumState) {
    const tier = SPONSOR_CONFIG.tiers[sponsor.tier];
    const prognosis = calculateSponsorPrognosis(
        sponsor, 
        stadiumState.previousSeason, 
        stadiumState.previousSeason.leaguePosition
    );
    
    const isSelected = selectedForComparison.includes(sponsor.id);
    
    return `
        <div class="sponsor-card ${comparisonMode ? 'comparison-mode' : ''} ${isSelected ? 'selected' : ''}" 
             data-sponsor-id="${sponsor.id}"
             style="border-color: ${sponsor.color}">
            
            ${comparisonMode ? `
                <div class="comparison-checkbox">
                    <input type="checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           ${selectedForComparison.length >= 3 && !isSelected ? 'disabled' : ''}
                           data-action="toggleComparison"
                           data-sponsor-id="${sponsor.id}">
                </div>
            ` : ''}
            
            <div class="sponsor-card-header">
                <div class="sponsor-tier-badge" style="background: ${tier.color}">
                    ${tier.icon} ${tier.name}
                </div>
            </div>
            
            <h3 class="sponsor-name" style="color: ${sponsor.color}">${sponsor.name}</h3>
            <p class="sponsor-industry">${sponsor.industry}</p>
            <p class="sponsor-slogan">"${sponsor.slogan}"</p>
            
            <div class="sponsor-payment-summary">
                <div class="payment-item">
                    <span class="payment-icon">💰</span>
                    <span class="payment-value">${formatCurrency(prognosis.adjustedPayment.initial)}</span>
                </div>
                <div class="payment-item">
                    <span class="payment-icon">⚽</span>
                    <span class="payment-value">${formatCurrency(prognosis.adjustedPayment.perGoal)}/Tor</span>
                </div>
                <div class="payment-item">
                    <span class="payment-icon">🏆</span>
                    <span class="payment-value">${formatCurrency(prognosis.adjustedPayment.perWin)}/Sieg</span>
                </div>
                <div class="payment-item">
                    <span class="payment-icon">🥇</span>
                    <span class="payment-value">${formatCurrency(prognosis.adjustedPayment.leagueTitle)}</span>
                </div>
            </div>
            
            <div class="sponsor-prognosis">
                <div class="prognosis-label">📊 Prognose:</div>
                <div class="prognosis-value">${formatCurrency(prognosis.prognosis.expectedTotal)}</div>
            </div>
            
            <button class="btn btn-details" data-action="showSponsorDetails" data-sponsor-id="${sponsor.id}">
                Details 🔍
            </button>
        </div>
    `;
}

// =====================================================
// MODAL: SPONSOR-DETAILS
// =====================================================

/**
 * Zeigt Sponsor-Details Modal
 */
export function showSponsorDetailsModal(sponsorId, stadiumState) {
    const sponsor = SPONSOR_CONFIG.availableSponsors.find(s => s.id === sponsorId);
    if (!sponsor) return;
    
    const modal = createModal('sponsor-details-modal');
    const content = renderSponsorDetailsContent(sponsor, stadiumState);
    
    modal.innerHTML = `
        <div class="sponsor-modal-overlay">
            <div class="sponsor-modal-content sponsor-modal-wide">
                ${content}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Schließe vorheriges Modal
    if (currentModal) {
        currentModal.remove();
    }
    currentModal = modal;
    
    setTimeout(() => modal.classList.add('active'), 10);
}

/**
 * Rendert Sponsor-Details Content
 */
function renderSponsorDetailsContent(sponsor, stadiumState) {
    const tier = SPONSOR_CONFIG.tiers[sponsor.tier];
    const prognosis = calculateSponsorPrognosis(
        sponsor,
        stadiumState.previousSeason,
        stadiumState.previousSeason.leaguePosition
    );
    
    const prevSeason = stadiumState.previousSeason;
    
    return `
        <div class="sponsor-modal-header">
            <div>
                <h2 style="color: ${sponsor.color}">${sponsor.name}</h2>
                <p class="sponsor-detail-meta">
                    ${tier.icon} ${tier.name} • ${sponsor.industry}
                </p>
            </div>
            <button class="modal-close-btn" data-action="backToSelection">&times;</button>
        </div>
        
        <div class="sponsor-modal-body">
            <div class="sponsor-detail-intro">
                <p class="sponsor-slogan-large">"${sponsor.slogan}"</p>
                <p class="sponsor-website">${sponsor.website}</p>
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
                        <div class="payment-detail-label">Performance-Prämien (alle Spiele):</div>
                        <ul class="payment-detail-list">
                            <li>⚽ ${formatCurrency(prognosis.adjustedPayment.perGoal)} pro Tor</li>
                            <li>🏆 ${formatCurrency(prognosis.adjustedPayment.perWin)} pro Sieg</li>
                            <li>🥇 ${formatCurrency(prognosis.adjustedPayment.leagueTitle)} bei Liga-Meisterschaft</li>
                            <li>🏅 ${formatCurrency(prognosis.adjustedPayment.cupTitle)} bei Pokalsieg</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="sponsor-detail-section">
                <h3>📊 Saisonprognose</h3>
                <p class="prognosis-basis">Basis: Vorsaison ${prevSeason.season || '2023/24'} (Platz ${prevSeason.leaguePosition})</p>
                
                <div class="prognosis-expectation">
                    <h4>Erwartete Leistung:</h4>
                    <ul>
                        <li>${prevSeason.totalGames} Spiele in allen Wettbewerben</li>
                        <li>${prevSeason.totalGoals} Tore (Ø ${(prevSeason.totalGoals / prevSeason.totalGames).toFixed(1)} pro Spiel)</li>
                        <li>${prevSeason.totalWins} Siege (${((prevSeason.totalWins / prevSeason.totalGames) * 100).toFixed(0)}% Siegquote)</li>
                    </ul>
                </div>
                
                <div class="prognosis-calculation">
                    <h4>Einnahmen-Berechnung:</h4>
                    <table class="prognosis-table">
                        <tr>
                            <td>Einmalzahlung:</td>
                            <td class="prognosis-value">${formatCurrency(prognosis.prognosis.initialPayment)}</td>
                        </tr>
                        <tr>
                            <td>${prognosis.calculations.expectedGoals} Tore × ${formatCurrency(prognosis.adjustedPayment.perGoal)}:</td>
                            <td class="prognosis-value">${formatCurrency(prognosis.prognosis.goalBonuses)}</td>
                        </tr>
                        <tr>
                            <td>${prognosis.calculations.expectedWins} Siege × ${formatCurrency(prognosis.adjustedPayment.perWin)}:</td>
                            <td class="prognosis-value">${formatCurrency(prognosis.prognosis.winBonuses)}</td>
                        </tr>
                        <tr>
                            <td>Titel (unwahrscheinlich):</td>
                            <td class="prognosis-value">${formatCurrency(0)}</td>
                        </tr>
                        <tr class="prognosis-total">
                            <td><strong>ERWARTETE EINNAHMEN:</strong></td>
                            <td class="prognosis-value"><strong>${formatCurrency(prognosis.prognosis.expectedTotal)}</strong></td>
                        </tr>
                    </table>
                </div>
                
                <div class="prognosis-scenarios">
                    <div class="scenario-card scenario-best">
                        <h4>📈 Best Case (+50% Performance):</h4>
                        <p>${prognosis.calculations.bestCaseGoals} Tore + ${prognosis.calculations.bestCaseWins} Siege + Titel</p>
                        <div class="scenario-value">${formatCurrency(prognosis.prognosis.bestCase)} 🚀</div>
                    </div>
                    
                    <div class="scenario-card scenario-worst">
                        <h4>📉 Worst Case (-30% Performance):</h4>
                        <p>${prognosis.calculations.worstCaseGoals} Tore + ${prognosis.calculations.worstCaseWins} Siege</p>
                        <div class="scenario-value">${formatCurrency(prognosis.prognosis.worstCase)}</div>
                    </div>
                </div>
            </div>
            
            <div class="sponsor-detail-warning">
                <span class="warning-icon">⚠️</span>
                <div class="warning-text">
                    <strong>Verträge sind nach Abschluss für die gesamte Saison bindend und können nicht gekündigt werden!</strong>
                </div>
            </div>
        </div>
        
        <div class="sponsor-modal-footer">
            <button class="btn btn-secondary" data-action="backToSelection">Zurück</button>
            <button class="btn btn-primary" data-action="confirmBooking" data-sponsor-id="${sponsor.id}">
                Vertrag abschließen ✍️
            </button>
        </div>
    `;
}

// =====================================================
// MODAL: BESTÄTIGUNG
// =====================================================

/**
 * Zeigt Bestätigungs-Modal
 */
export function showConfirmationModal(sponsorId, stadiumState) {
    const sponsor = SPONSOR_CONFIG.availableSponsors.find(s => s.id === sponsorId);
    if (!sponsor) return;
    
    const prognosis = calculateSponsorPrognosis(
        sponsor,
        stadiumState.previousSeason,
        stadiumState.previousSeason.leaguePosition
    );
    
    const modal = createModal('sponsor-confirmation-modal');
    
    modal.innerHTML = `
        <div class="sponsor-modal-overlay">
            <div class="sponsor-modal-content sponsor-modal-narrow">
                <div class="sponsor-modal-header">
                    <h2>⚠️ Vertrag bestätigen</h2>
                </div>
                
                <div class="sponsor-modal-body">
                    <p class="confirmation-text">
                        Sie sind dabei, einen Sponsorenvertrag mit<br>
                        <strong style="color: ${sponsor.color}">${sponsor.name}</strong> abzuschließen.
                    </p>
                    
                    <div class="confirmation-details">
                        <div class="confirmation-item">
                            <span class="confirm-icon">✓</span>
                            <span>Werbebanner: ${UI_TEXTS.blocks[currentBlock]}</span>
                        </div>
                        <div class="confirmation-item">
                            <span class="confirm-icon">✓</span>
                            <span>Laufzeit: ${SPONSOR_CONFIG.contractDuration} Saison (nicht kündbar)</span>
                        </div>
                        <div class="confirmation-item">
                            <span class="confirm-icon">✓</span>
                            <span>Einmalzahlung: ${formatCurrency(prognosis.adjustedPayment.initial)} (sofort)</span>
                        </div>
                        <div class="confirmation-item">
                            <span class="confirm-icon">✓</span>
                            <span>Performance-Prämien: Ja</span>
                        </div>
                    </div>
                    
                    <div class="confirmation-consequences">
                        <h4>Nach Bestätigung:</h4>
                        <ul>
                            <li>Vertrag ist bindend für die gesamte Saison</li>
                            <li>Banner wird sofort im Stadion angezeigt</li>
                            <li>Einmalzahlung wird umgehend gutgeschrieben</li>
                            <li>Keine nachträglichen Änderungen möglich</li>
                        </ul>
                    </div>
                </div>
                
                <div class="sponsor-modal-footer">
                    <button class="btn btn-secondary" data-action="backToDetails" data-sponsor-id="${sponsor.id}">Zurück</button>
                    <button class="btn btn-primary btn-confirm" data-action="finalizeBooking" data-sponsor-id="${sponsor.id}">
                        Vertrag unterschreiben ✍️
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Schließe vorheriges Modal
    if (currentModal) {
        currentModal.remove();
    }
    currentModal = modal;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
}

/**
 * Zeigt Erfolgs-Modal
 */
export function showSuccessModal(sponsor, initialPayment) {
    const modal = createModal('sponsor-success-modal');
    
    modal.innerHTML = `
        <div class="sponsor-modal-overlay">
            <div class="sponsor-modal-content sponsor-modal-narrow">
                <div class="sponsor-modal-header success-header">
                    <h2>✅ Vertrag abgeschlossen!</h2>
                </div>
                
                <div class="sponsor-modal-body">
                    <div class="success-animation">🎉</div>
                    
                    <h3 class="success-title">Herzlichen Glückwunsch!</h3>
                    
                    <p class="success-text">
                        <strong style="color: ${sponsor.color}">${sponsor.name}</strong><br>
                        ist jetzt Ihr offizieller Partner.
                    </p>
                    
                    <div class="success-details">
                        <div class="success-item">
                            <span class="success-icon">💰</span>
                            <span>+${formatCurrency(initialPayment)} Einmalzahlung erhalten</span>
                        </div>
                        <div class="success-item">
                            <span class="success-icon">📺</span>
                            <span>Banner wird in ${UI_TEXTS.blocks[currentBlock]} angezeigt</span>
                        </div>
                        <div class="success-item">
                            <span class="success-icon">📊</span>
                            <span>Performance-Tracking aktiviert</span>
                        </div>
                    </div>
                </div>
                
                <div class="sponsor-modal-footer">
                    <button class="btn btn-secondary" data-action="closeModalAndRefresh">Schließen</button>
                    <button class="btn btn-primary" data-action="goToSponsorOverview">Zur Sponsor-Übersicht</button>
                </div>
            </div>
        </div>
    `;
    
    // Schließe vorheriges Modal
    if (currentModal) {
        currentModal.remove();
    }
    currentModal = modal;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
}

// =====================================================
// MODAL: VERGLEICHSMODUS
// =====================================================

/**
 * Zeigt Vergleichs-Modal
 */
export function showComparisonModal(sponsorIds, stadiumState) {
    const sponsors = sponsorIds.map(id => 
        SPONSOR_CONFIG.availableSponsors.find(s => s.id === id)
    ).filter(Boolean);
    
    if (sponsors.length === 0) return;
    
    const modal = createModal('sponsor-comparison-modal');
    const content = renderComparisonContent(sponsors, stadiumState);
    
    modal.innerHTML = `
        <div class="sponsor-modal-overlay">
            <div class="sponsor-modal-content sponsor-modal-wide">
                ${content}
            </div>
        </div>
    `;
    
    // Schließe vorheriges Modal
    if (currentModal) {
        currentModal.remove();
    }
    currentModal = modal;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
}

/**
 * Rendert Vergleichs-Content
 */
function renderComparisonContent(sponsors, stadiumState) {
    const comparisons = prepareSponsorComparison(
        sponsors,
        stadiumState.previousSeason,
        stadiumState.previousSeason.leaguePosition
    );
    
    const bestValues = findBestValues(comparisons);
    const recommendation = getSponsorRecommendation(sponsors, stadiumState.previousSeason, stadiumState.previousSeason.leaguePosition);
    
    return `
        <div class="sponsor-modal-header">
            <h2>📊 Sponsoren vergleichen (${sponsors.length}/3 ausgewählt)</h2>
            <button class="modal-close-btn" data-action="backToSelection">&times;</button>
        </div>
        
        <div class="sponsor-modal-body">
            <div class="comparison-table-wrapper">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th class="comparison-label-col">Kriterium</th>
                            ${comparisons.map(c => `
                                <th class="comparison-sponsor-col" style="border-top: 3px solid ${c.sponsor.color}">
                                    <div class="comparison-sponsor-header">
                                        <div class="comparison-sponsor-name">${c.sponsor.name}</div>
                                        <div class="comparison-sponsor-tier">${SPONSOR_CONFIG.tiers[c.sponsor.tier].icon} ${SPONSOR_CONFIG.tiers[c.sponsor.tier].name}</div>
                                    </div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="comparison-label">💰 Einmalzahlung</td>
                            ${comparisons.map(c => `
                                <td class="${c.adjustedPayment.initial === bestValues.bestInitial ? 'best-value' : ''}">
                                    ${formatCurrency(c.adjustedPayment.initial)}
                                    ${c.adjustedPayment.initial === bestValues.bestInitial ? ' ⭐' : ''}
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td class="comparison-label">⚽ Pro Tor<br><small>→ bei ${stadiumState.previousSeason.totalGoals} Toren</small></td>
                            ${comparisons.map(c => `
                                <td class="${c.adjustedPayment.perGoal === bestValues.bestPerGoal ? 'best-value' : ''}">
                                    ${formatCurrency(c.adjustedPayment.perGoal)}
                                    <div class="comparison-calc">${formatCurrency(c.prognosis.goalBonuses)}</div>
                                    ${c.adjustedPayment.perGoal === bestValues.bestPerGoal ? ' ⭐' : ''}
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td class="comparison-label">🏆 Pro Sieg<br><small>→ bei ${stadiumState.previousSeason.totalWins} Siegen</small></td>
                            ${comparisons.map(c => `
                                <td class="${c.adjustedPayment.perWin === bestValues.bestPerWin ? 'best-value' : ''}">
                                    ${formatCurrency(c.adjustedPayment.perWin)}
                                    <div class="comparison-calc">${formatCurrency(c.prognosis.winBonuses)}</div>
                                    ${c.adjustedPayment.perWin === bestValues.bestPerWin ? ' ⭐' : ''}
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td class="comparison-label">🥇 Liga-Titel</td>
                            ${comparisons.map(c => `
                                <td>${formatCurrency(c.adjustedPayment.leagueTitle)}</td>
                            `).join('')}
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
                            ${comparisons.map(c => `
                                <td class="${c.prognosis.bestCase === bestValues.bestBestCase ? 'best-value' : ''}">
                                    ${formatCurrency(c.prognosis.bestCase)}
                                    ${c.prognosis.bestCase === bestValues.bestBestCase ? ' ⭐' : ''}
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td class="comparison-label">📉 Worst Case</td>
                            ${comparisons.map(c => `
                                <td class="${c.prognosis.worstCase === bestValues.bestWorstCase ? 'best-value' : ''}">
                                    ${formatCurrency(c.prognosis.worstCase)}
                                    ${c.prognosis.worstCase === bestValues.bestWorstCase ? ' ⭐' : ''}
                                </td>
                            `).join('')}
                        </tr>
                        <tr class="comparison-actions">
                            <td class="comparison-label"></td>
                            ${comparisons.map(c => `
                                <td>
                                    <button class="btn btn-primary btn-sm" 
                                            data-action="showSponsorDetails" 
                                            data-sponsor-id="${c.sponsor.id}">
                                        Buchen 🎯
                                    </button>
                                </td>
                            `).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
            
            ${recommendation ? `
                <div class="comparison-recommendation">
                    <h3>💡 Empfehlung</h3>
                    <p><strong style="color: ${recommendation.sponsor.color}">${recommendation.sponsor.name}</strong></p>
                    <p>${recommendation.reason}</p>
                    <p class="recommendation-stats">
                        Team-Profil: Ø ${recommendation.teamProfile.avgGoalsPerGame} Tore/Spiel • ${recommendation.teamProfile.winRate} Siegquote
                    </p>
                </div>
            ` : ''}
        </div>
        
        <div class="sponsor-modal-footer">
            <button class="btn btn-secondary" data-action="backToSelection">Vergleich beenden</button>
        </div>
    `;
}

// =====================================================
// SPONSOR-ÜBERSICHT TAB
// =====================================================

/**
 * Rendert Sponsor-Übersicht Tab Content
 */
export function renderSponsorOverviewTab(stadiumState, currentSeasonStats) {
    const activeSponsors = getActiveSponsors(stadiumState);
    const totalRevenue = calculateTotalSponsorRevenue(stadiumState, currentSeasonStats);
    const projection = calculateSeasonProjection(stadiumState, currentSeasonStats);
    
    const freeBlocks = CAPACITY_CONFIG.BLOCKS.filter(block => !stadiumState.features.sponsors[block]);
    
    return `
        <h2 class="section-title">📊 Sponsor-Übersicht Saison ${stadiumState.season}</h2>
        
        <div class="sponsor-overview-balance glass">
            <h3>💰 Gesamtbilanz</h3>
            <div class="balance-grid">
                <div class="balance-item">
                    <div class="balance-label">Einmalzahlungen (Saisonstart):</div>
                    <div class="balance-value">${formatCurrency(totalRevenue.initial)}</div>
                </div>
                
                <div class="balance-item">
                    <div class="balance-label">Torprämien bisher:</div>
                    <div class="balance-details">
                        <div>• ${currentSeasonStats.goals} Tore gesamt</div>
                        ${activeSponsors.map(({ sponsor, block }) => {
                            const balance = getSponsorBalance(stadiumState, block);
                            return `<div>• ${sponsor.name}: ${balance.stats.totalGoals} × ${formatCurrency(balance.payments.goalBonuses / balance.stats.totalGoals || 0)} = ${formatCurrency(balance.payments.goalBonuses)}</div>`;
                        }).join('')}
                        <div class="balance-sum">Summe: ${formatCurrency(totalRevenue.goals)}</div>
                    </div>
                </div>
                
                <div class="balance-item">
                    <div class="balance-label">Siegprämien bisher:</div>
                    <div class="balance-details">
                        <div>• ${currentSeasonStats.wins} Siege gesamt</div>
                        ${activeSponsors.map(({ sponsor, block }) => {
                            const balance = getSponsorBalance(stadiumState, block);
                            return `<div>• ${sponsor.name}: ${balance.stats.totalWins} × ${formatCurrency(balance.payments.winBonuses / balance.stats.totalWins || 0)} = ${formatCurrency(balance.payments.winBonuses)}</div>`;
                        }).join('')}
                        <div class="balance-sum">Summe: ${formatCurrency(totalRevenue.wins)}</div>
                    </div>
                </div>
                
                <div class="balance-item">
                    <div class="balance-label">Titelprämien:</div>
                    <div class="balance-value">${formatCurrency(totalRevenue.titles)}</div>
                </div>
                
                <div class="balance-item balance-total">
                    <div class="balance-label">GESAMT DIESE SAISON:</div>
                    <div class="balance-value">${formatCurrency(totalRevenue.total)}</div>
                </div>
            </div>
        </div>
        
        <div class="sponsor-overview-active glass">
            <h3>📺 Aktive Sponsoren (${activeSponsors.length}/4 Tribünen belegt)</h3>
            
            ${activeSponsors.map(({ block, sponsor }) => {
                const balance = getSponsorBalance(stadiumState, block);
                const prognosis = calculateSponsorPrognosis(sponsor, stadiumState.previousSeason, stadiumState.previousSeason.leaguePosition);
                const progress = (balance.totalThisSeason / prognosis.prognosis.expectedTotal * 100).toFixed(0);
                
                return `
                    <div class="active-sponsor-card glass">
                        <h4 class="active-sponsor-header">
                            ${UI_TEXTS.blocks[block]}
                            <span class="sponsor-tier-badge-small" style="background: ${SPONSOR_CONFIG.tiers[sponsor.tier].color}">
                                ${SPONSOR_CONFIG.tiers[sponsor.tier].icon}
                            </span>
                        </h4>
                        <h3 class="active-sponsor-name" style="color: ${sponsor.color}">${sponsor.name}</h3>
                        <p class="active-sponsor-slogan">"${sponsor.slogan}"</p>
                        
                        <div class="active-sponsor-balance">
                            <div class="balance-row">
                                <span>💰 Einmalzahlung:</span>
                                <span class="balance-value-sm">${formatCurrency(balance.payments.initial)} ✅</span>
                            </div>
                            <div class="balance-row">
                                <span>⚽ Torprämien (${balance.stats.totalGoals}):</span>
                                <span class="balance-value-sm">${formatCurrency(balance.payments.goalBonuses)}</span>
                            </div>
                            <div class="balance-row">
                                <span>🏆 Siegprämien (${balance.stats.totalWins}):</span>
                                <span class="balance-value-sm">${formatCurrency(balance.payments.winBonuses)}</span>
                            </div>
                            <div class="balance-row">
                                <span>🥇 Titelprämien:</span>
                                <span class="balance-value-sm">${formatCurrency(balance.payments.titleBonuses)}</span>
                            </div>
                            <div class="balance-row balance-total-sm">
                                <span>TOTAL DIESE SAISON:</span>
                                <span class="balance-value-sm">${formatCurrency(balance.totalThisSeason)}</span>
                            </div>
                            <div class="balance-progress">
                                <small>(Prognose war: ${formatCurrency(prognosis.prognosis.expectedTotal)} → ${progress}% erreicht)</small>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
            
            ${freeBlocks.map(block => `
                <div class="free-sponsor-card glass">
                    <h4>${UI_TEXTS.blocks[block]}</h4>
                    <div class="free-sponsor-content">
                        <div class="free-sponsor-icon">🆓</div>
                        <p class="free-sponsor-text">
                            Banner-Platz derzeit ungenutzt.<br>
                            Mögliche Einnahmen: ~450.000 € pro Saison
                        </p>
                        ${stadiumState.features.advertising[block] ? `
                            <button class="btn btn-primary" data-action="openSponsorSelection" data-block="${block}">
                                + Sponsor buchen 🎯
                            </button>
                        ` : `
                            <p class="free-sponsor-note">⚠️ Bitte installiere zuerst die Werbebande!</p>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${projection && currentSeasonStats.gamesPlayed > 0 ? `
            <div class="sponsor-overview-projection glass">
                <h3>📈 Hochrechnung Saisonende</h3>
                
                <div class="projection-current">
                    <h4>Bisherige Performance (${currentSeasonStats.gamesPlayed}/${stadiumState.previousSeason.totalGames} Spiele):</h4>
                    <ul>
                        <li>Ø ${projection.avgGoalsPerGame} Tore/Spiel (${currentSeasonStats.goals} Tore)</li>
                        <li>${projection.winRate}% Siegquote (${currentSeasonStats.wins} Siege)</li>
                    </ul>
                </div>
                
                <div class="projection-forecast">
                    <h4>Wenn Performance konstant bleibt:</h4>
                    <ul>
                        <li>Gesamt-Tore Saisonende: ~${projection.projectedTotalGoals}</li>
                        <li>Gesamt-Siege Saisonende: ~${projection.projectedTotalWins}</li>
                    </ul>
                </div>
                
                <div class="projection-total">
                    <div class="projection-label">Erwartete Gesamt-Einnahmen:</div>
                    <div class="projection-value">${formatCurrency(projection.projectedTotal)}</div>
                </div>
                
                ${activeSponsors.map(({ sponsor, block }) => {
                    const balance = getSponsorBalance(stadiumState, block);
                    const prognosis = calculateSponsorPrognosis(sponsor, stadiumState.previousSeason, stadiumState.previousSeason.leaguePosition);
                    const projectedSponsor = balance.payments.initial + 
                        (projection.projectedTotalGoals * prognosis.adjustedPayment.perGoal) +
                        (projection.projectedTotalWins * prognosis.adjustedPayment.perWin);
                    const percentOfPrognosis = (projectedSponsor / prognosis.prognosis.expectedTotal * 100).toFixed(0);
                    const emoji = percentOfPrognosis >= 100 ? '📈' : percentOfPrognosis >= 90 ? '📊' : '📉';
                    
                    return `
                        <div class="projection-sponsor">
                            • ${sponsor.name}: ~${formatCurrency(projectedSponsor)} ${emoji} (${percentOfPrognosis}% Prognose${percentOfPrognosis > 100 ? '!' : ''})
                        </div>
                    `;
                }).join('')}
            </div>
        ` : ''}
    `;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Erstellt Modal-Container
 */
function createModal(id) {
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'sponsor-modal';
    return modal;
}

/**
 * Schließt aktuelles Modal
 */
export function closeModal() {
    if (currentModal) {
        currentModal.classList.remove('active');
        setTimeout(() => {
            currentModal.remove();
            currentModal = null;
        }, 300);
    }
    
    // Reset state
    currentBlock = null;
    comparisonMode = false;
    selectedForComparison = [];
}

/**
 * Toggled Vergleichsmodus
 */
export function toggleComparisonMode() {
    comparisonMode = !comparisonMode;
    
    if (!comparisonMode) {
        selectedForComparison = [];
    }
}

/**
 * Togglet Sponsor in Vergleichsliste
 */
export function toggleSponsorForComparison(sponsorId) {
    const index = selectedForComparison.indexOf(sponsorId);
    
    if (index > -1) {
        selectedForComparison.splice(index, 1);
    } else {
        if (selectedForComparison.length < 3) {
            selectedForComparison.push(sponsorId);
        }
    }
    
    // Wenn 3 ausgewählt, zeige Vergleich
    if (selectedForComparison.length === 3) {
        return true; // Signal to show comparison
    }
    
    return false;
}

/**
 * Updated Filter
 */
export function updateFilter(filterType, value) {
    currentFilters[filterType] = value;
}

/**
 * Updated Sortierung
 */
export function updateSort(sortValue) {
    currentSort = sortValue;
}

/**
 * Gibt aktuellen Block zurück
 */
export function getCurrentBlock() {
    return currentBlock;
}

/**
 * Gibt ausgewählte Sponsoren für Vergleich zurück
 */
export function getSelectedForComparison() {
    return selectedForComparison;
}
