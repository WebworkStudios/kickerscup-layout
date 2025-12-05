// =====================================================
// KICKERSCUP - STADIUM SPONSORS CORE LOGIC (V2 - OPTIMIZED)
// Business-Logik für Sponsor-Verwaltung
// ✅ V2: Verbessertes Caching, Session-Memoization, Lazy Evaluation
// =====================================================

import {BLOCKS, getSponsorById, isValidBlock, SPONSOR_CONFIG} from './stadium-config.js';

// =====================================================
// OPTIMIZED CACHING SYSTEM
// =====================================================

// Session-basierter Cache (lebt so lange wie das Modal offen ist)
const sessionCache = {
    prognosis: new Map(),
    adjusted: new Map(),
    filtered: new Map(),
    sorted: new Map(),
    lastStateHash: null
};

// Cache-Konfiguration
const CACHE_CONFIG = {
    MAX_PROGNOSIS_ENTRIES: 100,
    MAX_FILTERED_ENTRIES: 20,
    MAX_SORTED_ENTRIES: 10
};

/**
 * Generiert stabilen Hash für State-basiertes Cache-Invalidation
 */
const hashState = (stadiumState) => {
    const {previousSeason, capacity} = stadiumState;
    return `${previousSeason.leaguePosition}_${previousSeason.totalGoals}_${previousSeason.totalWins}_${capacity.total}`;
};

/**
 * Prüft und invalidiert Cache bei State-Änderung
 */
const validateCache = (stadiumState) => {
    const currentHash = hashState(stadiumState);
    if (sessionCache.lastStateHash !== currentHash) {
        clearAllCaches();
        sessionCache.lastStateHash = currentHash;
    }
};

/**
 * Generiert Cache-Key für Prognose (vereinfacht und stabil)
 */
const getPrognosisCacheKey = (sponsorId, leaguePosition) =>
    `${sponsorId}_${leaguePosition}`;

/**
 * Generiert Cache-Key für Filter
 */
const getFilterCacheKey = (filters, leaguePosition, capacity) =>
    `${filters.tier}_${filters.industry}_${filters.paymentType}_${leaguePosition}_${capacity}`;

/**
 * Generiert Cache-Key für Sortierung
 */
const getSortCacheKey = (filterKey, sortBy) => `${filterKey}_${sortBy}`;

/**
 * LRU-artiges Cache-Management
 */
const addToCache = (cache, key, value, maxSize) => {
    if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
    cache.set(key, value);
    return value;
};

/**
 * Alle Caches leeren
 */
export const clearAllCaches = () => {
    sessionCache.prognosis.clear();
    sessionCache.adjusted.clear();
    sessionCache.filtered.clear();
    sessionCache.sorted.clear();
};

/**
 * Legacy-Export für Kompatibilität
 */
export const clearPrognosisCache = clearAllCaches;

// =====================================================
// OPTIMIZED SPONSOR CALCULATIONS
// =====================================================

/**
 * Gibt verfügbare Sponsoren basierend auf Stadion-Kapazität zurück
 * OPTIMIERT: Ergebnis wird nicht gecacht da schnell genug
 */
export const getAvailableSponsors = (currentCapacity) => {
    const capacity = Math.max(0, currentCapacity);
    const {tiers, availableSponsors} = SPONSOR_CONFIG;

    return availableSponsors.filter(sponsor => {
        const tier = tiers[sponsor.tier];
        return tier && capacity >= tier.minCapacity;
    });
};

/**
 * Berechnet modifizierte Vergütung basierend auf Liga-Position
 * OPTIMIERT: Mit Caching
 */
export const calculateAdjustedPayment = (sponsor, leaguePosition) => {
    if (!sponsor?.basePayment) {
        console.warn('calculateAdjustedPayment: Invalid sponsor', sponsor);
        return {initial: 0, perGoal: 0, perWin: 0, leagueTitle: 0, cupTitle: 0};
    }

    const cacheKey = `${sponsor.id}_${leaguePosition}`;

    if (sessionCache.adjusted.has(cacheKey)) {
        return sessionCache.adjusted.get(cacheKey);
    }

    const multiplier = SPONSOR_CONFIG.getLeagueMultiplier(leaguePosition);
    const {basePayment} = sponsor;

    const result = {
        initial: Math.round(basePayment.initial * multiplier),
        perGoal: Math.round(basePayment.perGoal * multiplier),
        perWin: Math.round(basePayment.perWin * multiplier),
        leagueTitle: Math.round(basePayment.leagueTitle * multiplier),
        cupTitle: Math.round(basePayment.cupTitle * multiplier)
    };

    sessionCache.adjusted.set(cacheKey, result);
    return result;
};

/**
 * Berechnet Prognose basierend auf Vorsaison-Daten
 * OPTIMIERT: Stabiler Cache-Key, Pre-computed adjusted payment
 */
export const calculateSponsorPrognosis = (sponsor, previousSeasonData, leaguePosition) => {
    if (!sponsor || !previousSeasonData) {
        console.warn('calculateSponsorPrognosis: Missing data');
        return null;
    }

    const cacheKey = getPrognosisCacheKey(sponsor.id, leaguePosition);

    if (sessionCache.prognosis.has(cacheKey)) {
        return sessionCache.prognosis.get(cacheKey);
    }

    const adjustedPayment = calculateAdjustedPayment(sponsor, leaguePosition);
    const {totalGoals, totalWins} = previousSeasonData;

    // Pre-compute all values
    const initialPayment = adjustedPayment.initial;
    const goalBonuses = totalGoals * adjustedPayment.perGoal;
    const winBonuses = totalWins * adjustedPayment.perWin;
    const expectedTotal = initialPayment + goalBonuses + winBonuses;

    // Best Case (+50% Performance + beide Titel)
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
            leagueTitleBonus: adjustedPayment.leagueTitle,
            cupTitleBonus: adjustedPayment.cupTitle,
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

    return addToCache(sessionCache.prognosis, cacheKey, result, CACHE_CONFIG.MAX_PROGNOSIS_ENTRIES);
};

/**
 * Batch-Berechnung aller Prognosen für eine Sponsor-Liste
 * OPTIMIERT: Vermeidet wiederholte Lookups
 */
export const calculateAllPrognoses = (sponsors, previousSeasonData, leaguePosition) => {
    const results = new Map();

    for (const sponsor of sponsors) {
        const prognosis = calculateSponsorPrognosis(sponsor, previousSeasonData, leaguePosition);
        if (prognosis) {
            results.set(sponsor.id, prognosis);
        }
    }

    return results;
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
 * OPTIMIERT: Verwendet for...of statt forEach
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

    for (const {sponsor} of activeSponsors) {
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

    const {gamesPlayed, goals, wins} = currentSeasonStats;
    const totalGames = stadiumState.previousSeason?.totalGames ?? 34;
    const leaguePosition = stadiumState.previousSeason?.leaguePosition ?? 9;

    const avgGoalsPerGame = goals / gamesPlayed;
    const winRate = wins / gamesPlayed;

    const projectedTotalGoals = Math.round(avgGoalsPerGame * totalGames);
    const projectedTotalWins = Math.round(winRate * totalGames);

    let projectedTotal = 0;

    for (const {sponsor} of activeSponsors) {
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
    clearAllCaches();

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

    return {sponsor: sponsor.name, goals, amount};
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

    return {sponsor: sponsor.name, amount};
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

    return {sponsor: sponsor.name, titleType, amount};
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

    const {payments} = data;

    // Optimiert: Einzelner Durchlauf für alle Summen
    let totalGoalBonuses = 0;
    let totalGoals = 0;
    for (const entry of payments.goals) {
        totalGoalBonuses += entry.amount;
        totalGoals += entry.goals;
    }

    let totalWinBonuses = 0;
    for (const entry of payments.wins) {
        totalWinBonuses += entry.amount;
    }

    let totalTitleBonuses = 0;
    for (const entry of payments.titles) {
        totalTitleBonuses += entry.amount;
    }

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
// OPTIMIZED FILTER & SORTIERUNG
// =====================================================

/**
 * Filtert Sponsoren nach Kriterien
 * OPTIMIERT: Cached Ergebnisse
 */
export const filterSponsors = (sponsors, filters, stadiumState = null) => {
    // Cache-Key generieren
    const leaguePos = filters.leaguePosition ?? 9;
    const capacity = stadiumState?.capacity?.total ?? 20000;
    const cacheKey = getFilterCacheKey(filters, leaguePos, capacity);

    if (sessionCache.filtered.has(cacheKey)) {
        return sessionCache.filtered.get(cacheKey);
    }

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

    return addToCache(sessionCache.filtered, cacheKey, filtered, CACHE_CONFIG.MAX_FILTERED_ENTRIES);
};

/**
 * Sortiert Sponsoren
 * OPTIMIERT: Pre-computed Prognosen, gecachte Ergebnisse
 */
export const sortSponsors = (sponsors, sortBy, previousSeasonData, leaguePosition) => {
    // Für einfache Sortierungen kein Cache nötig
    if (sortBy === 'name_asc') {
        return [...sponsors].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    }

    // Pre-compute alle Prognosen einmalig
    const prognosisMap = calculateAllPrognoses(sponsors, previousSeasonData, leaguePosition);

    const sorted = [...sponsors];

    switch (sortBy) {
        case 'prognosis_desc':
            sorted.sort((a, b) => {
                const aP = prognosisMap.get(a.id)?.prognosis?.expectedTotal ?? 0;
                const bP = prognosisMap.get(b.id)?.prognosis?.expectedTotal ?? 0;
                return bP - aP;
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
                const aP = prognosisMap.get(a.id)?.prognosis?.bestCase ?? 0;
                const bP = prognosisMap.get(b.id)?.prognosis?.bestCase ?? 0;
                return bP - aP;
            });
            break;
        case 'worst_case_desc':
            sorted.sort((a, b) => {
                const aP = prognosisMap.get(a.id)?.prognosis?.worstCase ?? 0;
                const bP = prognosisMap.get(b.id)?.prognosis?.worstCase ?? 0;
                return bP - aP;
            });
            break;
        default:
            // Standard: Nach Prognose
            sorted.sort((a, b) => {
                const aP = prognosisMap.get(a.id)?.prognosis?.expectedTotal ?? 0;
                const bP = prognosisMap.get(b.id)?.prognosis?.expectedTotal ?? 0;
                return bP - aP;
            });
    }

    return sorted;
};

/**
 * Gibt alle verfügbaren Branchen zurück
 * OPTIMIERT: Set für O(1) Lookup
 */
export const getAvailableIndustries = (sponsors) => {
    const industries = new Set();
    for (const s of sponsors) {
        industries.add(s.industry);
    }
    return [...industries].sort((a, b) => a.localeCompare(b, 'de'));
};

// =====================================================
// VERGLEICHSMODUS
// =====================================================

/**
 * Bereitet Sponsor-Daten für Vergleich vor
 * OPTIMIERT: Nutzt gecachte Prognosen
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
 * OPTIMIERT: Einzelner Durchlauf
 */
export const findBestValues = (comparisonData) => {
    if (!comparisonData?.length) return null;

    let bestInitial = -Infinity;
    let bestPerGoal = -Infinity;
    let bestPerWin = -Infinity;
    let bestPrognosis = -Infinity;
    let bestBestCase = -Infinity;
    let bestWorstCase = -Infinity;

    for (const d of comparisonData) {
        if (d.adjustedPayment.initial > bestInitial) bestInitial = d.adjustedPayment.initial;
        if (d.adjustedPayment.perGoal > bestPerGoal) bestPerGoal = d.adjustedPayment.perGoal;
        if (d.adjustedPayment.perWin > bestPerWin) bestPerWin = d.adjustedPayment.perWin;
        if (d.prognosis.expectedTotal > bestPrognosis) bestPrognosis = d.prognosis.expectedTotal;
        if (d.prognosis.bestCase > bestBestCase) bestBestCase = d.prognosis.bestCase;
        if (d.prognosis.worstCase > bestWorstCase) bestWorstCase = d.prognosis.worstCase;
    }

    return {
        bestInitial,
        bestPerGoal,
        bestPerWin,
        bestPrognosis,
        bestBestCase,
        bestWorstCase
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

    const {totalGoals, totalWins, totalGames} = previousSeasonData;
    const avgGoalsPerGame = totalGoals / totalGames;
    const winRate = totalWins / totalGames;

    const comparisons = prepareSponsorComparison(sponsors, previousSeasonData, leaguePosition);

    let recommendation;
    let reason;

    if (avgGoalsPerGame >= 2.5) {
        comparisons.sort((a, b) => b.adjustedPayment.perGoal - a.adjustedPayment.perGoal);
        recommendation = comparisons[0].sponsor;
        reason = 'Bei durchschnittlich 2.5+ Toren pro Spiel optimiert diese Wahl die Torprämien.';
    } else if (winRate >= 0.60) {
        comparisons.sort((a, b) => b.adjustedPayment.perWin - a.adjustedPayment.perWin);
        recommendation = comparisons[0].sponsor;
        reason = 'Bei 60%+ Siegquote bietet dieser Sponsor die besten Siegprämien.';
    } else {
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