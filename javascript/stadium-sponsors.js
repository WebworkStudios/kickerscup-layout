// =====================================================
// KICKERSCUP - STADIUM SPONSORS CORE LOGIC (OPTIMIZED)
// Business-Logik für Sponsor-Verwaltung
// ✅ OPTIMIERT: Caching, Validierung, Performance
// =====================================================

import {
    SPONSOR_CONFIG,
    BLOCKS,
    getSponsorById,
    isValidBlock
} from './stadium-config.js';

// =====================================================
// CACHING
// =====================================================

// Cache für berechnete Prognosen (LRU-artig)
const prognosisCache = new Map();
const CACHE_MAX_SIZE = 50;

/**
 * Generiert Cache-Key für Prognose
 */
const getPrognosisCacheKey = (sponsorId, leaguePosition, previousSeasonHash) =>
    `${sponsorId}_${leaguePosition}_${previousSeasonHash}`;

/**
 * Einfacher Hash für Vorsaison-Daten
 */
const hashPreviousSeason = (data) =>
    `${data.totalGoals}_${data.totalWins}_${data.totalGames}`;

/**
 * Fügt zum Cache hinzu mit Größenlimit
 */
const addToCache = (key, value) => {
    if (prognosisCache.size >= CACHE_MAX_SIZE) {
        // Ältesten Eintrag entfernen
        const firstKey = prognosisCache.keys().next().value;
        prognosisCache.delete(firstKey);
    }
    prognosisCache.set(key, value);
};

/**
 * Cache leeren (bei State-Änderungen)
 */
export const clearPrognosisCache = () => prognosisCache.clear();

// =====================================================
// SPONSOR BERECHNUNG & VERFÜGBARKEIT
// =====================================================

/**
 * Gibt verfügbare Sponsoren basierend auf Stadion-Kapazität zurück
 * @param {number} currentCapacity
 * @returns {Array}
 */
export const getAvailableSponsors = (currentCapacity) => {
    const capacity = Math.max(0, currentCapacity);
    const { tiers, availableSponsors } = SPONSOR_CONFIG;

    return availableSponsors.filter(sponsor => {
        const tier = tiers[sponsor.tier];
        return tier && capacity >= tier.minCapacity;
    });
};

/**
 * Berechnet modifizierte Vergütung basierend auf Liga-Position
 * @param {Object} sponsor
 * @param {number} leaguePosition
 * @returns {Object}
 */
export const calculateAdjustedPayment = (sponsor, leaguePosition) => {
    if (!sponsor?.basePayment) {
        console.warn('calculateAdjustedPayment: Invalid sponsor', sponsor);
        return { initial: 0, perGoal: 0, perWin: 0, leagueTitle: 0, cupTitle: 0 };
    }

    const multiplier = SPONSOR_CONFIG.getLeagueMultiplier(leaguePosition);
    const { basePayment } = sponsor;

    return {
        initial: Math.round(basePayment.initial * multiplier),
        perGoal: Math.round(basePayment.perGoal * multiplier),
        perWin: Math.round(basePayment.perWin * multiplier),
        leagueTitle: Math.round(basePayment.leagueTitle * multiplier),
        cupTitle: Math.round(basePayment.cupTitle * multiplier)
    };
};

/**
 * Berechnet Prognose basierend auf Vorsaison-Daten (mit Caching)
 * @param {Object} sponsor
 * @param {Object} previousSeasonData
 * @param {number} leaguePosition
 * @returns {Object}
 */
export const calculateSponsorPrognosis = (sponsor, previousSeasonData, leaguePosition) => {
    if (!sponsor || !previousSeasonData) {
        console.warn('calculateSponsorPrognosis: Missing data');
        return null;
    }

    // Cache-Lookup
    const cacheKey = getPrognosisCacheKey(
        sponsor.id,
        leaguePosition,
        hashPreviousSeason(previousSeasonData)
    );

    if (prognosisCache.has(cacheKey)) {
        return prognosisCache.get(cacheKey);
    }

    const adjustedPayment = calculateAdjustedPayment(sponsor, leaguePosition);
    const { totalGoals, totalWins, leagueTitle, cupTitle, totalGames } = previousSeasonData;

    // Basis-Berechnung
    const initialPayment = adjustedPayment.initial;
    const goalBonuses = totalGoals * adjustedPayment.perGoal;
    const winBonuses = totalWins * adjustedPayment.perWin;
    const leagueTitleBonus = leagueTitle ? adjustedPayment.leagueTitle : 0;
    const cupTitleBonus = cupTitle ? adjustedPayment.cupTitle : 0;
    const expectedTotal = initialPayment + goalBonuses + winBonuses + leagueTitleBonus + cupTitleBonus;

    // Best Case (+50% Performance + Titel)
    const bestCaseGoals = Math.round(totalGoals * 1.5);
    const bestCaseWins = Math.round(totalWins * 1.5);
    const bestCase = initialPayment
        + (bestCaseGoals * adjustedPayment.perGoal)
        + (bestCaseWins * adjustedPayment.perWin)
        + adjustedPayment.leagueTitle
        + adjustedPayment.cupTitle;

    // Worst Case (-30% Performance, keine Titel)
    const worstCaseGoals = Math.round(totalGoals * 0.7);
    const worstCaseWins = Math.round(totalWins * 0.7);
    const worstCase = initialPayment
        + (worstCaseGoals * adjustedPayment.perGoal)
        + (worstCaseWins * adjustedPayment.perWin);

    const result = {
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
            expectedGoals: totalGoals,
            expectedWins: totalWins,
            bestCaseGoals,
            bestCaseWins,
            worstCaseGoals,
            worstCaseWins
        }
    };

    addToCache(cacheKey, result);
    return result;
};

// =====================================================
// STATE HELPER FUNCTIONS
// =====================================================

/**
 * Prüft ob ein Block bereits einen Sponsor hat
 */
export const hasBlockSponsor = (stadiumState, block) => {
    if (!isValidBlock(block)) return false;
    return stadiumState?.features?.sponsors?.[block] != null;
};

/**
 * Prüft ob Werbebande installiert ist
 */
export const hasBlockAdvertising = (stadiumState, block) => {
    if (!isValidBlock(block)) return false;
    return stadiumState?.features?.advertising?.[block] === true;
};

/**
 * Gibt alle aktiven Sponsoren zurück
 * @param {Object} stadiumState
 * @returns {Array<{block: string, sponsor: Object, bookedAt: string|null}>}
 */
export const getActiveSponsors = (stadiumState) => {
    if (!stadiumState?.features?.sponsors) return [];

    const result = [];

    for (const block of BLOCKS) {
        const sponsorId = stadiumState.features.sponsors[block];
        if (sponsorId != null) {
            const sponsor = getSponsorById(sponsorId);
            if (sponsor) {
                result.push({
                    block,
                    sponsor,
                    bookedAt: stadiumState.sponsorData?.[block]?.bookedAt ?? null
                });
            }
        }
    }

    return result;
};

/**
 * Berechnet Gesamt-Einnahmen aller aktiven Sponsoren
 */
export const calculateTotalSponsorRevenue = (stadiumState, currentSeasonStats) => {
    const activeSponsors = getActiveSponsors(stadiumState);
    const leaguePosition = stadiumState?.previousSeason?.leaguePosition ?? 9;

    let totalInitial = 0;
    let totalGoal = 0;
    let totalWin = 0;
    let totalTitle = 0;

    for (const { sponsor } of activeSponsors) {
        const adjusted = calculateAdjustedPayment(sponsor, leaguePosition);

        totalInitial += adjusted.initial;
        totalGoal += currentSeasonStats.goals * adjusted.perGoal;
        totalWin += currentSeasonStats.wins * adjusted.perWin;

        if (currentSeasonStats.leagueTitle) totalTitle += adjusted.leagueTitle;
        if (currentSeasonStats.cupTitle) totalTitle += adjusted.cupTitle;
    }

    return {
        initial: totalInitial,
        goals: totalGoal,
        wins: totalWin,
        titles: totalTitle,
        total: totalInitial + totalGoal + totalWin + totalTitle
    };
};

/**
 * Berechnet Hochrechnung für Saisonende
 */
export const calculateSeasonProjection = (stadiumState, currentSeasonStats) => {
    const activeSponsors = getActiveSponsors(stadiumState);

    if (activeSponsors.length === 0 || !currentSeasonStats?.gamesPlayed) {
        return null;
    }

    const { gamesPlayed, goals, wins } = currentSeasonStats;
    const totalGames = stadiumState.previousSeason?.totalGames ?? 34;
    const leaguePosition = stadiumState.previousSeason?.leaguePosition ?? 9;

    const avgGoalsPerGame = goals / gamesPlayed;
    const winRate = wins / gamesPlayed;

    const projectedTotalGoals = Math.round(avgGoalsPerGame * totalGames);
    const projectedTotalWins = Math.round(winRate * totalGames);

    let projectedTotal = 0;

    for (const { sponsor } of activeSponsors) {
        const adjusted = calculateAdjustedPayment(sponsor, leaguePosition);
        projectedTotal += adjusted.initial
            + projectedTotalGoals * adjusted.perGoal
            + projectedTotalWins * adjusted.perWin;
    }

    return {
        avgGoalsPerGame: Number(avgGoalsPerGame.toFixed(2)),
        winRate: Number((winRate * 100).toFixed(0)),
        projectedTotalGoals,
        projectedTotalWins,
        projectedTotal,
        gamesRemaining: totalGames - gamesPlayed
    };
};

// =====================================================
// SPONSOR STATE MANAGEMENT
// =====================================================

/**
 * Bucht einen Sponsor für einen Block
 * @throws {Error} Bei ungültigen Eingaben
 */
export const bookSponsor = (stadiumState, block, sponsorId) => {
    // Validierung
    if (!isValidBlock(block)) {
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

    const leaguePosition = stadiumState.previousSeason?.leaguePosition ?? 9;
    const adjustedPayment = calculateAdjustedPayment(sponsor, leaguePosition);

    // State mutieren
    stadiumState.features.sponsors[block] = sponsorId;

    // Sponsor-Daten initialisieren
    stadiumState.sponsorData ??= {};
    stadiumState.sponsorData[block] = {
        sponsorId,
        bookedAt: new Date().toISOString(),
        season: stadiumState.season,
        payments: {
            initial: adjustedPayment.initial,
            initialPaid: true,
            goals: [],
            wins: [],
            titles: []
        },
        totalThisSeason: adjustedPayment.initial
    };

    // Cache invalidieren
    clearPrognosisCache();

    return {
        success: true,
        sponsor,
        initialPayment: adjustedPayment.initial
    };
};

/**
 * Registriert Torprämie nach einem Spiel
 */
export const registerGoalBonus = (stadiumState, block, matchId, goals) => {
    if (!hasBlockSponsor(stadiumState, block)) return null;

    const sponsorId = stadiumState.features.sponsors[block];
    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) return null;

    const leaguePosition = stadiumState.previousSeason?.leaguePosition ?? 9;
    const adjusted = calculateAdjustedPayment(sponsor, leaguePosition);
    const amount = goals * adjusted.perGoal;

    stadiumState.sponsorData[block].payments.goals.push({
        matchId,
        goals,
        amount,
        date: new Date().toISOString()
    });

    stadiumState.sponsorData[block].totalThisSeason += amount;

    return { sponsor: sponsor.name, goals, amount };
};

/**
 * Registriert Siegprämie nach einem Spiel
 */
export const registerWinBonus = (stadiumState, block, matchId) => {
    if (!hasBlockSponsor(stadiumState, block)) return null;

    const sponsorId = stadiumState.features.sponsors[block];
    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) return null;

    const leaguePosition = stadiumState.previousSeason?.leaguePosition ?? 9;
    const adjusted = calculateAdjustedPayment(sponsor, leaguePosition);
    const amount = adjusted.perWin;

    stadiumState.sponsorData[block].payments.wins.push({
        matchId,
        amount,
        date: new Date().toISOString()
    });

    stadiumState.sponsorData[block].totalThisSeason += amount;

    return { sponsor: sponsor.name, amount };
};

/**
 * Registriert Titelprämie
 */
export const registerTitleBonus = (stadiumState, block, titleType) => {
    if (!hasBlockSponsor(stadiumState, block)) return null;
    if (titleType !== 'league' && titleType !== 'cup') return null;

    const sponsorId = stadiumState.features.sponsors[block];
    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) return null;

    const leaguePosition = stadiumState.previousSeason?.leaguePosition ?? 9;
    const adjusted = calculateAdjustedPayment(sponsor, leaguePosition);
    const amount = titleType === 'league' ? adjusted.leagueTitle : adjusted.cupTitle;

    stadiumState.sponsorData[block].payments.titles.push({
        type: titleType,
        amount,
        date: new Date().toISOString()
    });

    stadiumState.sponsorData[block].totalThisSeason += amount;

    return { sponsor: sponsor.name, titleType, amount };
};

/**
 * Gibt detaillierte Sponsor-Bilanz für einen Block zurück
 */
export const getSponsorBalance = (stadiumState, block) => {
    if (!hasBlockSponsor(stadiumState, block)) return null;

    const sponsorId = stadiumState.features.sponsors[block];
    const sponsor = getSponsorById(sponsorId);
    const data = stadiumState.sponsorData?.[block];

    if (!sponsor || !data) return null;

    const { payments } = data;

    // Reduce für bessere Performance
    const totalGoalBonuses = payments.goals.reduce((sum, e) => sum + e.amount, 0);
    const totalWinBonuses = payments.wins.reduce((sum, e) => sum + e.amount, 0);
    const totalTitleBonuses = payments.titles.reduce((sum, e) => sum + e.amount, 0);
    const totalGoals = payments.goals.reduce((sum, e) => sum + e.goals, 0);

    return {
        block,
        sponsor,
        bookedAt: data.bookedAt,
        payments: {
            initial: payments.initial,
            goalBonuses: totalGoalBonuses,
            winBonuses: totalWinBonuses,
            titleBonuses: totalTitleBonuses
        },
        stats: {
            totalGoals,
            totalWins: payments.wins.length,
            titles: payments.titles.length
        },
        totalThisSeason: data.totalThisSeason
    };
};

// =====================================================
// FILTER & SORTIERUNG (Optimiert)
// =====================================================

/**
 * Filtert Sponsoren nach Kriterien
 */
export const filterSponsors = (sponsors, filters) => {
    let filtered = sponsors;

    // Tier-Filter
    if (filters.tier && filters.tier !== 'all') {
        filtered = filtered.filter(s => s.tier === filters.tier);
    }

    // Branche-Filter
    if (filters.industry && filters.industry !== 'all') {
        filtered = filtered.filter(s => s.industry === filters.industry);
    }

    // Payment-Type Filter mit Sortierung
    if (filters.paymentType) {
        const leaguePos = filters.leaguePosition ?? 9;

        // Erstelle sortierte Kopie
        filtered = [...filtered];

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
};

/**
 * Sortiert Sponsoren
 */
export const sortSponsors = (sponsors, sortBy, previousSeasonData, leaguePosition) => {
    const sorted = [...sponsors];

    // Prognosen einmalig berechnen für Sortierung
    const prognosisMap = new Map();
    const getPrognosis = (sponsor) => {
        if (!prognosisMap.has(sponsor.id)) {
            prognosisMap.set(sponsor.id, calculateSponsorPrognosis(sponsor, previousSeasonData, leaguePosition));
        }
        return prognosisMap.get(sponsor.id);
    };

    switch (sortBy) {
        case 'prognosis_desc':
            sorted.sort((a, b) => getPrognosis(b).prognosis.expectedTotal - getPrognosis(a).prognosis.expectedTotal);
            break;
        case 'initial_desc':
            sorted.sort((a, b) => {
                const aAdj = calculateAdjustedPayment(a, leaguePosition);
                const bAdj = calculateAdjustedPayment(b, leaguePosition);
                return bAdj.initial - aAdj.initial;
            });
            break;
        case 'best_case_desc':
            sorted.sort((a, b) => getPrognosis(b).prognosis.bestCase - getPrognosis(a).prognosis.bestCase);
            break;
        case 'worst_case_desc':
            sorted.sort((a, b) => getPrognosis(b).prognosis.worstCase - getPrognosis(a).prognosis.worstCase);
            break;
        case 'name_asc':
            sorted.sort((a, b) => a.name.localeCompare(b.name, 'de'));
            break;
        default:
            // Standard: Nach Prognose
            sorted.sort((a, b) => getPrognosis(b).prognosis.expectedTotal - getPrognosis(a).prognosis.expectedTotal);
    }

    return sorted;
};

/**
 * Gibt alle verfügbaren Branchen zurück
 */
export const getAvailableIndustries = (sponsors) => {
    const industries = new Set(sponsors.map(s => s.industry));
    return [...industries].sort((a, b) => a.localeCompare(b, 'de'));
};

// =====================================================
// VERGLEICHSMODUS
// =====================================================

/**
 * Bereitet Sponsor-Daten für Vergleich vor
 */
export const prepareSponsorComparison = (sponsors, previousSeasonData, leaguePosition) => {
    return sponsors.map(sponsor => {
        const prognosis = calculateSponsorPrognosis(sponsor, previousSeasonData, leaguePosition);
        return {
            sponsor,
            adjustedPayment: prognosis.adjustedPayment,
            prognosis: prognosis.prognosis,
            calculations: prognosis.calculations
        };
    });
};

/**
 * Findet beste Werte in Vergleichs-Array
 */
export const findBestValues = (comparisonData) => {
    if (!comparisonData?.length) return null;

    return {
        bestInitial: Math.max(...comparisonData.map(d => d.adjustedPayment.initial)),
        bestPerGoal: Math.max(...comparisonData.map(d => d.adjustedPayment.perGoal)),
        bestPerWin: Math.max(...comparisonData.map(d => d.adjustedPayment.perWin)),
        bestPrognosis: Math.max(...comparisonData.map(d => d.prognosis.expectedTotal)),
        bestBestCase: Math.max(...comparisonData.map(d => d.prognosis.bestCase)),
        bestWorstCase: Math.max(...comparisonData.map(d => d.prognosis.worstCase))
    };
};

// =====================================================
// EMPFEHLUNGS-SYSTEM
// =====================================================

/**
 * Gibt Empfehlung basierend auf Team-Profil
 */
export const getSponsorRecommendation = (sponsors, previousSeasonData, leaguePosition) => {
    if (!sponsors?.length) return null;

    const { totalGoals, totalWins, totalGames } = previousSeasonData;
    const avgGoalsPerGame = totalGoals / totalGames;
    const winRate = totalWins / totalGames;

    const comparisons = prepareSponsorComparison(sponsors, previousSeasonData, leaguePosition);

    let recommendation;
    let reason;

    if (avgGoalsPerGame >= 2.5) {
        // Offensive stark
        comparisons.sort((a, b) => b.adjustedPayment.perGoal - a.adjustedPayment.perGoal);
        recommendation = comparisons[0].sponsor;
        reason = 'Bei durchschnittlich 2.5+ Toren pro Spiel optimiert diese Wahl die Torprämien.';
    } else if (winRate >= 0.60) {
        // Viele Siege
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
            winRate: `${(winRate * 100).toFixed(0)}%`
        }
    };
};