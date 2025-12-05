// =====================================================
// KICKERSCUP - STADIUM SPONSORS CORE LOGIC (ESM)
// Business-Logik für Sponsor-Verwaltung
// =====================================================

import {
    CAPACITY_CONFIG,
    SPONSOR_CONFIG,
    formatCurrency
} from './stadium-config-extended.js';

// =====================================================
// SPONSOR BERECHNUNG & VERFÜGBARKEIT
// =====================================================

/**
 * Gibt verfügbare Sponsoren basierend auf Stadion-Kapazität zurück
 */
export function getAvailableSponsors(currentCapacity) {
    return SPONSOR_CONFIG.availableSponsors.filter(sponsor => {
        const tier = SPONSOR_CONFIG.tiers[sponsor.tier];
        return currentCapacity >= tier.minCapacity;
    });
}

/**
 * Berechnet modifizierte Vergütung basierend auf Liga-Position
 */
export function calculateAdjustedPayment(sponsor, leaguePosition) {
    const multiplier = SPONSOR_CONFIG.leaguePositionMultipliers[leaguePosition] || 1.0;
    
    return {
        initial: Math.round(sponsor.basePayment.initial * multiplier),
        perGoal: Math.round(sponsor.basePayment.perGoal * multiplier),
        perWin: Math.round(sponsor.basePayment.perWin * multiplier),
        leagueTitle: Math.round(sponsor.basePayment.leagueTitle * multiplier),
        cupTitle: Math.round(sponsor.basePayment.cupTitle * multiplier)
    };
}

/**
 * Berechnet Prognose basierend auf Vorsaison-Daten
 */
export function calculateSponsorPrognosis(sponsor, previousSeasonData, leaguePosition) {
    const adjustedPayment = calculateAdjustedPayment(sponsor, leaguePosition);
    
    // Basis: Vorsaison-Performance
    const expectedGoals = previousSeasonData.totalGoals;
    const expectedWins = previousSeasonData.totalWins;
    const expectedLeagueTitle = previousSeasonData.leagueTitle ? 1 : 0;
    const expectedCupTitle = previousSeasonData.cupTitle ? 1 : 0;
    
    // Berechnung
    const initialPayment = adjustedPayment.initial;
    const goalBonuses = expectedGoals * adjustedPayment.perGoal;
    const winBonuses = expectedWins * adjustedPayment.perWin;
    const leagueTitleBonus = expectedLeagueTitle * adjustedPayment.leagueTitle;
    const cupTitleBonus = expectedCupTitle * adjustedPayment.cupTitle;
    
    const expectedTotal = initialPayment + goalBonuses + winBonuses + leagueTitleBonus + cupTitleBonus;
    
    // Best Case (+50% Performance + Titel)
    const bestCaseGoals = Math.round(expectedGoals * 1.5);
    const bestCaseWins = Math.round(expectedWins * 1.5);
    const bestCase = initialPayment 
        + (bestCaseGoals * adjustedPayment.perGoal)
        + (bestCaseWins * adjustedPayment.perWin)
        + adjustedPayment.leagueTitle
        + adjustedPayment.cupTitle;
    
    // Worst Case (-30% Performance, keine Titel)
    const worstCaseGoals = Math.round(expectedGoals * 0.7);
    const worstCaseWins = Math.round(expectedWins * 0.7);
    const worstCase = initialPayment
        + (worstCaseGoals * adjustedPayment.perGoal)
        + (worstCaseWins * adjustedPayment.perWin);
    
    return {
        adjustedPayment,
        prognosis: {
            initialPayment,
            goalBonuses,
            winBonuses,
            leagueTitleBonus,
            cupTitleBonus,
            expectedTotal,
            bestCase,
            worstCase
        },
        calculations: {
            expectedGoals,
            expectedWins,
            bestCaseGoals,
            bestCaseWins,
            worstCaseGoals,
            worstCaseWins
        }
    };
}

/**
 * Findet Sponsor nach ID
 */
export function getSponsorById(sponsorId) {
    return SPONSOR_CONFIG.availableSponsors.find(s => s.id === sponsorId);
}

/**
 * Prüft ob ein Block bereits einen Sponsor hat
 */
export function hasBlockSponsor(stadiumState, block) {
    return stadiumState.features.sponsors[block] !== null;
}

/**
 * Prüft ob Werbebande installiert ist
 */
export function hasBlockAdvertising(stadiumState, block) {
    return stadiumState.features.advertising[block] === true;
}

/**
 * Gibt alle aktiven Sponsoren zurück
 */
export function getActiveSponsors(stadiumState) {
    const activeSponsors = [];
    
    CAPACITY_CONFIG.BLOCKS.forEach(block => {
        const sponsorId = stadiumState.features.sponsors[block];
        if (sponsorId !== null) {
            const sponsor = getSponsorById(sponsorId);
            if (sponsor) {
                activeSponsors.push({
                    block,
                    sponsor,
                    bookedAt: stadiumState.sponsorData?.[block]?.bookedAt || null
                });
            }
        }
    });
    
    return activeSponsors;
}

/**
 * Berechnet Gesamt-Einnahmen aller aktiven Sponsoren (aktueller Stand)
 */
export function calculateTotalSponsorRevenue(stadiumState, currentSeasonStats) {
    const activeSponsors = getActiveSponsors(stadiumState);
    
    let totalInitial = 0;
    let totalGoal = 0;
    let totalWin = 0;
    let totalTitle = 0;
    
    activeSponsors.forEach(({ sponsor }) => {
        const adjusted = calculateAdjustedPayment(sponsor, stadiumState.previousSeason.leaguePosition);
        
        // Einmalzahlung
        totalInitial += adjusted.initial;
        
        // Torprämien (bisherige Saison)
        totalGoal += currentSeasonStats.goals * adjusted.perGoal;
        
        // Siegprämien (bisherige Saison)
        totalWin += currentSeasonStats.wins * adjusted.perWin;
        
        // Titelprämien
        if (currentSeasonStats.leagueTitle) {
            totalTitle += adjusted.leagueTitle;
        }
        if (currentSeasonStats.cupTitle) {
            totalTitle += adjusted.cupTitle;
        }
    });
    
    return {
        initial: totalInitial,
        goals: totalGoal,
        wins: totalWin,
        titles: totalTitle,
        total: totalInitial + totalGoal + totalWin + totalTitle
    };
}

/**
 * Berechnet Hochrechnung für Saisonende
 */
export function calculateSeasonProjection(stadiumState, currentSeasonStats) {
    const activeSponsors = getActiveSponsors(stadiumState);
    
    if (activeSponsors.length === 0 || currentSeasonStats.gamesPlayed === 0) {
        return null;
    }
    
    const totalGames = stadiumState.previousSeason.totalGames; // z.B. 34
    const gamesPlayed = currentSeasonStats.gamesPlayed;
    const gamesRemaining = totalGames - gamesPlayed;
    
    // Durchschnitt berechnen
    const avgGoalsPerGame = currentSeasonStats.goals / gamesPlayed;
    const winRate = currentSeasonStats.wins / gamesPlayed;
    
    // Hochrechnung
    const projectedTotalGoals = Math.round(avgGoalsPerGame * totalGames);
    const projectedTotalWins = Math.round(winRate * totalGames);
    
    // Berechne Gesamt-Einnahmen mit Hochrechnung
    let projectedTotal = 0;
    
    activeSponsors.forEach(({ sponsor }) => {
        const adjusted = calculateAdjustedPayment(sponsor, stadiumState.previousSeason.leaguePosition);
        
        projectedTotal += adjusted.initial;
        projectedTotal += projectedTotalGoals * adjusted.perGoal;
        projectedTotal += projectedTotalWins * adjusted.perWin;
        // Titel nicht einrechnen (zu unsicher)
    });
    
    return {
        avgGoalsPerGame: parseFloat(avgGoalsPerGame.toFixed(2)),
        winRate: parseFloat((winRate * 100).toFixed(0)),
        projectedTotalGoals,
        projectedTotalWins,
        projectedTotal,
        gamesRemaining
    };
}

// =====================================================
// SPONSOR STATE MANAGEMENT
// =====================================================

/**
 * Bucht einen Sponsor für einen Block
 */
export function bookSponsor(stadiumState, block, sponsorId) {
    // Validierung
    if (!CAPACITY_CONFIG.BLOCKS.includes(block)) {
        throw new Error(`Ungültiger Block: ${block}`);
    }
    
    if (hasBlockSponsor(stadiumState, block)) {
        throw new Error(`${block} hat bereits einen Sponsor!`);
    }
    
    if (!hasBlockAdvertising(stadiumState, block)) {
        throw new Error(`Werbebande für ${block} nicht installiert!`);
    }
    
    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) {
        throw new Error(`Sponsor mit ID ${sponsorId} nicht gefunden!`);
    }
    
    // Sponsor buchen
    stadiumState.features.sponsors[block] = sponsorId;
    
    // Sponsor-Daten initialisieren
    if (!stadiumState.sponsorData) {
        stadiumState.sponsorData = {};
    }
    
    const adjustedPayment = calculateAdjustedPayment(sponsor, stadiumState.previousSeason.leaguePosition);
    
    stadiumState.sponsorData[block] = {
        sponsorId,
        bookedAt: new Date().toISOString(),
        season: stadiumState.season,
        payments: {
            initial: adjustedPayment.initial,
            initialPaid: true,
            goals: [],      // { matchId, goals, amount }
            wins: [],       // { matchId, amount }
            titles: []      // { type: 'league'|'cup', amount }
        },
        totalThisSeason: adjustedPayment.initial
    };
    
    return {
        success: true,
        sponsor,
        initialPayment: adjustedPayment.initial
    };
}

/**
 * Registriert Torprämie nach einem Spiel
 */
export function registerGoalBonus(stadiumState, block, matchId, goals) {
    if (!hasBlockSponsor(stadiumState, block)) {
        return null;
    }
    
    const sponsorId = stadiumState.features.sponsors[block];
    const sponsor = getSponsorById(sponsorId);
    const adjusted = calculateAdjustedPayment(sponsor, stadiumState.previousSeason.leaguePosition);
    
    const amount = goals * adjusted.perGoal;
    
    stadiumState.sponsorData[block].payments.goals.push({
        matchId,
        goals,
        amount,
        date: new Date().toISOString()
    });
    
    stadiumState.sponsorData[block].totalThisSeason += amount;
    
    return {
        sponsor: sponsor.name,
        goals,
        amount
    };
}

/**
 * Registriert Siegprämie nach einem Spiel
 */
export function registerWinBonus(stadiumState, block, matchId) {
    if (!hasBlockSponsor(stadiumState, block)) {
        return null;
    }
    
    const sponsorId = stadiumState.features.sponsors[block];
    const sponsor = getSponsorById(sponsorId);
    const adjusted = calculateAdjustedPayment(sponsor, stadiumState.previousSeason.leaguePosition);
    
    const amount = adjusted.perWin;
    
    stadiumState.sponsorData[block].payments.wins.push({
        matchId,
        amount,
        date: new Date().toISOString()
    });
    
    stadiumState.sponsorData[block].totalThisSeason += amount;
    
    return {
        sponsor: sponsor.name,
        amount
    };
}

/**
 * Registriert Titelprämie
 */
export function registerTitleBonus(stadiumState, block, titleType) {
    if (!hasBlockSponsor(stadiumState, block)) {
        return null;
    }
    
    const sponsorId = stadiumState.features.sponsors[block];
    const sponsor = getSponsorById(sponsorId);
    const adjusted = calculateAdjustedPayment(sponsor, stadiumState.previousSeason.leaguePosition);
    
    const amount = titleType === 'league' ? adjusted.leagueTitle : adjusted.cupTitle;
    
    stadiumState.sponsorData[block].payments.titles.push({
        type: titleType,
        amount,
        date: new Date().toISOString()
    });
    
    stadiumState.sponsorData[block].totalThisSeason += amount;
    
    return {
        sponsor: sponsor.name,
        titleType,
        amount
    };
}

/**
 * Gibt detaillierte Sponsor-Bilanz für einen Block zurück
 */
export function getSponsorBalance(stadiumState, block) {
    if (!hasBlockSponsor(stadiumState, block)) {
        return null;
    }
    
    const sponsorId = stadiumState.features.sponsors[block];
    const sponsor = getSponsorById(sponsorId);
    const data = stadiumState.sponsorData[block];
    
    // Summiere Einzelposten
    const totalGoalBonuses = data.payments.goals.reduce((sum, entry) => sum + entry.amount, 0);
    const totalWinBonuses = data.payments.wins.reduce((sum, entry) => sum + entry.amount, 0);
    const totalTitleBonuses = data.payments.titles.reduce((sum, entry) => sum + entry.amount, 0);
    
    const totalGoals = data.payments.goals.reduce((sum, entry) => sum + entry.goals, 0);
    const totalWins = data.payments.wins.length;
    
    return {
        block,
        sponsor,
        bookedAt: data.bookedAt,
        payments: {
            initial: data.payments.initial,
            goalBonuses: totalGoalBonuses,
            winBonuses: totalWinBonuses,
            titleBonuses: totalTitleBonuses
        },
        stats: {
            totalGoals,
            totalWins,
            titles: data.payments.titles.length
        },
        totalThisSeason: data.totalThisSeason
    };
}

// =====================================================
// FILTER & SORTIERUNG
// =====================================================

/**
 * Filtert Sponsoren nach Kriterien
 */
export function filterSponsors(sponsors, filters) {
    let filtered = [...sponsors];
    
    // Nach Kategorie filtern
    if (filters.tier && filters.tier !== 'all') {
        filtered = filtered.filter(s => s.tier === filters.tier);
    }
    
    // Nach Branche filtern
    if (filters.industry && filters.industry !== 'all') {
        filtered = filtered.filter(s => s.industry === filters.industry);
    }
    
    // Nach Vergütungsmodell filtern
    if (filters.paymentType) {
        const leaguePos = filters.leaguePosition || 9;
        
        switch (filters.paymentType) {
            case 'high_initial':
                filtered.sort((a, b) => {
                    const aAdj = calculateAdjustedPayment(a, leaguePos);
                    const bAdj = calculateAdjustedPayment(b, leaguePos);
                    return bAdj.initial - aAdj.initial;
                });
                filtered = filtered.slice(0, 10);
                break;
            case 'high_goal':
                filtered.sort((a, b) => {
                    const aAdj = calculateAdjustedPayment(a, leaguePos);
                    const bAdj = calculateAdjustedPayment(b, leaguePos);
                    return bAdj.perGoal - aAdj.perGoal;
                });
                filtered = filtered.slice(0, 10);
                break;
            case 'high_win':
                filtered.sort((a, b) => {
                    const aAdj = calculateAdjustedPayment(a, leaguePos);
                    const bAdj = calculateAdjustedPayment(b, leaguePos);
                    return bAdj.perWin - aAdj.perWin;
                });
                filtered = filtered.slice(0, 10);
                break;
            case 'with_title':
                filtered = filtered.filter(s => s.basePayment.leagueTitle > 0);
                break;
        }
    }
    
    return filtered;
}

/**
 * Sortiert Sponsoren
 */
export function sortSponsors(sponsors, sortBy, previousSeasonData, leaguePosition) {
    const sorted = [...sponsors];
    
    switch (sortBy) {
        case 'prognosis_desc':
            sorted.sort((a, b) => {
                const aPrognosis = calculateSponsorPrognosis(a, previousSeasonData, leaguePosition);
                const bPrognosis = calculateSponsorPrognosis(b, previousSeasonData, leaguePosition);
                return bPrognosis.prognosis.expectedTotal - aPrognosis.prognosis.expectedTotal;
            });
            break;
        
        case 'initial_desc':
            sorted.sort((a, b) => {
                const aAdj = calculateAdjustedPayment(a, leaguePosition);
                const bAdj = calculateAdjustedPayment(b, leaguePosition);
                return bAdj.initial - aAdj.initial;
            });
            break;
        
        case 'best_case_desc':
            sorted.sort((a, b) => {
                const aPrognosis = calculateSponsorPrognosis(a, previousSeasonData, leaguePosition);
                const bPrognosis = calculateSponsorPrognosis(b, previousSeasonData, leaguePosition);
                return bPrognosis.prognosis.bestCase - aPrognosis.prognosis.bestCase;
            });
            break;
        
        case 'worst_case_desc':
            sorted.sort((a, b) => {
                const aPrognosis = calculateSponsorPrognosis(a, previousSeasonData, leaguePosition);
                const bPrognosis = calculateSponsorPrognosis(b, previousSeasonData, leaguePosition);
                return bPrognosis.prognosis.worstCase - aPrognosis.prognosis.worstCase;
            });
            break;
        
        case 'name_asc':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        
        default:
            // Standard: Nach Prognose
            sorted.sort((a, b) => {
                const aPrognosis = calculateSponsorPrognosis(a, previousSeasonData, leaguePosition);
                const bPrognosis = calculateSponsorPrognosis(b, previousSeasonData, leaguePosition);
                return bPrognosis.prognosis.expectedTotal - aPrognosis.prognosis.expectedTotal;
            });
    }
    
    return sorted;
}

/**
 * Gibt alle verfügbaren Branchen zurück
 */
export function getAvailableIndustries(sponsors) {
    const industries = new Set();
    sponsors.forEach(s => industries.add(s.industry));
    return Array.from(industries).sort();
}

// =====================================================
// VERGLEICHSMODUS
// =====================================================

/**
 * Bereitet Sponsor-Daten für Vergleich vor
 */
export function prepareSponsorComparison(sponsors, previousSeasonData, leaguePosition) {
    return sponsors.map(sponsor => {
        const prognosis = calculateSponsorPrognosis(sponsor, previousSeasonData, leaguePosition);
        
        return {
            sponsor,
            adjustedPayment: prognosis.adjustedPayment,
            prognosis: prognosis.prognosis,
            calculations: prognosis.calculations
        };
    });
}

/**
 * Findet beste Werte in Vergleichs-Array
 */
export function findBestValues(comparisonData) {
    if (comparisonData.length === 0) return null;
    
    const values = {
        bestInitial: Math.max(...comparisonData.map(d => d.adjustedPayment.initial)),
        bestPerGoal: Math.max(...comparisonData.map(d => d.adjustedPayment.perGoal)),
        bestPerWin: Math.max(...comparisonData.map(d => d.adjustedPayment.perWin)),
        bestPrognosis: Math.max(...comparisonData.map(d => d.prognosis.expectedTotal)),
        bestBestCase: Math.max(...comparisonData.map(d => d.prognosis.bestCase)),
        bestWorstCase: Math.max(...comparisonData.map(d => d.prognosis.worstCase))
    };
    
    return values;
}

// =====================================================
// EMPFEHLUNGS-SYSTEM
// =====================================================

/**
 * Gibt Empfehlung basierend auf Team-Profil
 */
export function getSponsorRecommendation(sponsors, previousSeasonData, leaguePosition) {
    if (sponsors.length === 0) return null;
    
    const comparisons = prepareSponsorComparison(sponsors, previousSeasonData, leaguePosition);
    
    // Berechne Team-Profil
    const avgGoalsPerGame = previousSeasonData.totalGoals / previousSeasonData.totalGames;
    const winRate = previousSeasonData.totalWins / previousSeasonData.totalGames;
    
    let recommendation = null;
    let reason = '';
    
    if (avgGoalsPerGame >= 2.5) {
        // Offensive stark: Wähle höchste Torprämie
        comparisons.sort((a, b) => b.adjustedPayment.perGoal - a.adjustedPayment.perGoal);
        recommendation = comparisons[0].sponsor;
        reason = 'Bei durchschnittlich 2.5+ Toren pro Spiel optimiert diese Wahl die Torprämien.';
    } else if (winRate >= 0.60) {
        // Viele Siege: Wähle höchste Siegprämie
        comparisons.sort((a, b) => b.adjustedPayment.perWin - a.adjustedPayment.perWin);
        recommendation = comparisons[0].sponsor;
        reason = 'Bei 60%+ Siegquote bietet dieser Sponsor die besten Siegprämien.';
    } else {
        // Durchschnitt: Beste Gesamtprognose
        comparisons.sort((a, b) => b.prognosis.expectedTotal - a.prognosis.expectedTotal);
        recommendation = comparisons[0].sponsor;
        reason = 'Beste erwartete Gesamteinnahmen basierend auf Ihrer Performance.';
    }
    
    return {
        sponsor: recommendation,
        reason,
        teamProfile: {
            avgGoalsPerGame: avgGoalsPerGame.toFixed(2),
            winRate: (winRate * 100).toFixed(0) + '%'
        }
    };
}
