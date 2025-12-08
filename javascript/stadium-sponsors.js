// =====================================================
// KICKERSCUP - STADIUM SPONSORS CORE LOGIC (V3 - ES2025 MODERNIZED)
// Business-Logik für Sponsor-Verwaltung
// ✅ V3: ES2025 Modernisierung
// ✅ Error Causes für strukturiertes Debugging
// ✅ Object.freeze für immutable Configuration
// ✅ Optimierte Optional Chaining & Nullish Coalescing
// ✅ Konsistente Error Recovery Patterns
// =====================================================

import {BLOCKS, getSponsorById, isValidBlock, SPONSOR_CONFIG as _SPONSOR_CONFIG} from './stadium-config.js';

// =====================================================
// IMMUTABLE CONFIGURATION
// ✅ ES2025: Freeze imported configuration
// =====================================================

const SPONSOR_CONFIG = Object.freeze(_SPONSOR_CONFIG);

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

// ✅ ES2025: Frozen Cache-Konfiguration
const CACHE_CONFIG = Object.freeze({
    MAX_PROGNOSIS_ENTRIES: 100,
    MAX_FILTERED_ENTRIES: 20,
    MAX_SORTED_ENTRIES: 10
});

/**
 * Generiert stabilen Hash für State-basiertes Cache-Invalidation
 * ✅ ES2025: Nullish Coalescing für sichere Default-Werte
 */
const hashState = (stadiumState) => {
    const previousSeason = stadiumState?.previousSeason ?? {};
    const capacity = stadiumState?.capacity ?? {};

    const leaguePosition = previousSeason.leaguePosition ?? 9;
    const totalGoals = previousSeason.totalGoals ?? 0;
    const totalWins = previousSeason.totalWins ?? 0;
    const totalCapacity = capacity.total ?? 20000;

    return `${leaguePosition}_${totalGoals}_${totalWins}_${totalCapacity}`;
};

/**
 * Prüft und invalidiert Cache bei State-Änderung
 * ✅ ES2025: Error Causes für Cache-Fehler
 */
const validateCache = (stadiumState) => {
    try {
        const currentHash = hashState(stadiumState);
        if (sessionCache.lastStateHash !== currentHash) {
            clearAllCaches();
            sessionCache.lastStateHash = currentHash;
        }
    } catch (error) {
        const cacheError = new Error('Cache validation failed');
        cacheError.cause = { error, stadiumState };
        console.warn('⚠️ Cache validation error:', cacheError);
        clearAllCaches();
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
 * ✅ ES2025: Error Causes für Cache-Overflow
 */
const addToCache = (cache, key, value, maxSize) => {
    try {
        if (cache.size >= maxSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        cache.set(key, value);
        return value;
    } catch (error) {
        const cacheError = new Error('Failed to add to cache');
        cacheError.cause = { error, key, cacheSize: cache.size, maxSize };
        console.warn('⚠️ Cache add error:', cacheError);
        return value;
    }
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
 * ✅ ES2025: Defensive Validation mit Error Causes
 */
export const getAvailableSponsors = (currentCapacity) => {
    try {
        const capacity = Math.max(0, currentCapacity ?? 0);
        const {tiers, availableSponsors} = SPONSOR_CONFIG;

        if (!Array.isArray(availableSponsors)) {
            throw new Error('Invalid availableSponsors configuration');
        }

        return availableSponsors.filter(sponsor => {
            const tier = tiers?.[sponsor?.tier];
            return tier && capacity >= tier.minCapacity;
        });
    } catch (error) {
        const availableError = new Error('Failed to get available sponsors');
        availableError.cause = { error, currentCapacity };
        console.error('❌ Available sponsors error:', availableError);
        return [];
    }
};

/**
 * Berechnet modifizierte Vergütung basierend auf Liga-Position
 * ✅ ES2025: Error Causes mit strukturiertem Context
 */
export const calculateAdjustedPayment = (sponsor, leaguePosition) => {
    const defaultPayment = Object.freeze({
        initial: 0,
        perGoal: 0,
        perWin: 0,
        leagueTitle: 0,
        cupTitle: 0
    });

    if (!sponsor?.basePayment) {
        const error = new Error('Invalid sponsor data for payment calculation');
        error.cause = { sponsor, leaguePosition, missingField: 'basePayment' };
        console.warn('⚠️ Payment calculation fallback:', error);
        return defaultPayment;
    }

    const cacheKey = `${sponsor.id}_${leaguePosition}`;

    if (sessionCache.adjusted.has(cacheKey)) {
        return sessionCache.adjusted.get(cacheKey);
    }

    try {
        const multiplier = SPONSOR_CONFIG.getLeagueMultiplier?.(leaguePosition) ?? 1.0;
        const {basePayment} = sponsor;

        const result = Object.freeze({
            initial: Math.round(basePayment.initial * multiplier),
            perGoal: Math.round(basePayment.perGoal * multiplier),
            perWin: Math.round(basePayment.perWin * multiplier),
            leagueTitle: Math.round(basePayment.leagueTitle * multiplier),
            cupTitle: Math.round(basePayment.cupTitle * multiplier)
        });

        sessionCache.adjusted.set(cacheKey, result);
        return result;
    } catch (error) {
        const calcError = new Error('Adjusted payment calculation failed');
        calcError.cause = { error, sponsor, leaguePosition };
        console.error('❌ Adjusted payment error:', calcError);
        return defaultPayment;
    }
};

/**
 * Berechnet Prognose basierend auf Vorsaison-Daten
 * ✅ ES2025: Strukturierte Error Recovery
 */
export const calculateSponsorPrognosis = (sponsor, previousSeasonData, leaguePosition) => {
    if (!sponsor || !previousSeasonData) {
        const error = new Error('Missing data for sponsor prognosis');
        error.cause = {
            hasSponsor: !!sponsor,
            hasPreviousSeasonData: !!previousSeasonData,
            leaguePosition
        };
        console.warn('⚠️ Prognosis calculation skipped:', error);
        return null;
    }

    const cacheKey = getPrognosisCacheKey(sponsor.id, leaguePosition);

    if (sessionCache.prognosis.has(cacheKey)) {
        return sessionCache.prognosis.get(cacheKey);
    }

    try {
        const adjustedPayment = calculateAdjustedPayment(sponsor, leaguePosition);
        const totalGoals = previousSeasonData.totalGoals ?? 0;
        const totalWins = previousSeasonData.totalWins ?? 0;

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

        const result = Object.freeze({
            adjustedPayment,
            prognosis: Object.freeze({
                initialPayment,
                goalBonuses,
                winBonuses,
                leagueTitleBonus: adjustedPayment.leagueTitle,
                cupTitleBonus: adjustedPayment.cupTitle,
                expectedTotal,
                bestCase,
                worstCase
            }),
            calculations: Object.freeze({
                expectedGoals: totalGoals,
                expectedWins: totalWins,
                bestCaseGoals,
                bestCaseWins,
                worstCaseGoals,
                worstCaseWins
            })
        });

        return addToCache(sessionCache.prognosis, cacheKey, result, CACHE_CONFIG.MAX_PROGNOSIS_ENTRIES);
    } catch (error) {
        const prognosisError = new Error('Sponsor prognosis calculation failed');
        prognosisError.cause = { error, sponsor, previousSeasonData, leaguePosition };
        console.error('❌ Prognosis error:', prognosisError);
        return null;
    }
};

/**
 * Batch-Berechnung aller Prognosen für eine Sponsor-Liste
 * ✅ ES2025: Optimierte Map-Operation
 */
export const calculateAllPrognoses = (sponsors, previousSeasonData, leaguePosition) => {
    const results = new Map();

    if (!Array.isArray(sponsors)) {
        console.warn('⚠️ Invalid sponsors array for batch prognosis');
        return results;
    }

    for (const sponsor of sponsors) {
        try {
            const prognosis = calculateSponsorPrognosis(sponsor, previousSeasonData, leaguePosition);
            if (prognosis) {
                results.set(sponsor.id, prognosis);
            }
        } catch (error) {
            const batchError = new Error('Batch prognosis calculation failed for sponsor');
            batchError.cause = { error, sponsorId: sponsor?.id };
            console.warn('⚠️ Skipping sponsor in batch:', batchError);
        }
    }

    return results;
};

// =====================================================
// STATE HELPER FUNCTIONS
// =====================================================

/**
 * Prüft ob ein Block bereits einen Sponsor hat
 * ✅ ES2025: Defensive Validation
 */
export const hasBlockSponsor = (stadiumState, block) => {
    if (!isValidBlock(block)) {
        console.warn('⚠️ Invalid block in hasBlockSponsor:', block);
        return false;
    }
    return stadiumState?.features?.sponsors?.[block] != null;
};

/**
 * Prüft ob Werbebande installiert ist
 * ✅ ES2025: Defensive Validation
 */
export const hasBlockAdvertising = (stadiumState, block) => {
    if (!isValidBlock(block)) {
        console.warn('⚠️ Invalid block in hasBlockAdvertising:', block);
        return false;
    }
    return stadiumState?.features?.advertising?.[block] === true;
};

/**
 * Gibt alle aktiven Sponsoren zurück
 * ✅ ES2025: Error Recovery für einzelne Sponsoren
 */
export const getActiveSponsors = (stadiumState) => {
    if (!stadiumState?.features?.sponsors) {
        return [];
    }

    const result = [];

    for (const block of BLOCKS) {
        try {
            const sponsorId = stadiumState.features.sponsors[block];
            if (sponsorId != null) {
                const sponsor = getSponsorById(sponsorId);
                if (sponsor) {
                    result.push({
                        block,
                        sponsor,
                        bookedAt: stadiumState.sponsorData?.[block]?.bookedAt ?? null
                    });
                } else {
                    console.warn(`⚠️ Sponsor ${sponsorId} not found for block ${block}`);
                }
            }
        } catch (error) {
            const blockError = new Error('Failed to get active sponsor for block');
            blockError.cause = { error, block };
            console.warn('⚠️ Skipping block:', blockError);
        }
    }

    return result;
};

/**
 * Berechnet Gesamt-Einnahmen aller aktiven Sponsoren
 * ✅ ES2025: Optimierte Summierung mit Error Recovery
 */
export const calculateTotalSponsorRevenue = (stadiumState, currentSeasonStats) => {
    const activeSponsors = getActiveSponsors(stadiumState);
    const leaguePosition = stadiumState?.previousSeason?.leaguePosition ?? 9;

    const stats = {
        goals: currentSeasonStats?.goals ?? 0,
        wins: currentSeasonStats?.wins ?? 0,
        leagueTitle: currentSeasonStats?.leagueTitle ?? false,
        cupTitle: currentSeasonStats?.cupTitle ?? false
    };

    const totals = {
        initial: 0,
        goals: 0,
        wins: 0,
        titles: 0
    };

    for (const {sponsor} of activeSponsors) {
        try {
            const adjusted = calculateAdjustedPayment(sponsor, leaguePosition);

            totals.initial += adjusted.initial;
            totals.goals += stats.goals * adjusted.perGoal;
            totals.wins += stats.wins * adjusted.perWin;

            if (stats.leagueTitle) totals.titles += adjusted.leagueTitle;
            if (stats.cupTitle) totals.titles += adjusted.cupTitle;
        } catch (error) {
            const revenueError = new Error('Failed to calculate revenue for sponsor');
            revenueError.cause = { error, sponsorId: sponsor?.id };
            console.warn('⚠️ Skipping sponsor revenue:', revenueError);
        }
    }

    return {
        ...totals,
        total: totals.initial + totals.goals + totals.wins + totals.titles
    };
};

/**
 * Berechnet Hochrechnung für Saisonende
 * ✅ ES2025: Nullish Coalescing für alle Default-Werte
 */
export const calculateSeasonProjection = (stadiumState, currentSeasonStats) => {
    const activeSponsors = getActiveSponsors(stadiumState);

    const gamesPlayed = currentSeasonStats?.gamesPlayed ?? 0;
    if (activeSponsors.length === 0 || gamesPlayed === 0) {
        return null;
    }

    try {
        const goals = currentSeasonStats?.goals ?? 0;
        const wins = currentSeasonStats?.wins ?? 0;
        const totalGames = stadiumState?.previousSeason?.totalGames ?? 34;
        const leaguePosition = stadiumState?.previousSeason?.leaguePosition ?? 9;

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
    } catch (error) {
        const projectionError = new Error('Season projection calculation failed');
        projectionError.cause = { error, stadiumState, currentSeasonStats };
        console.error('❌ Projection error:', projectionError);
        return null;
    }
};

// =====================================================
// SPONSOR STATE MANAGEMENT
// =====================================================

/**
 * Bucht einen Sponsor für einen Block
 * ✅ ES2025: Strukturierte Validation mit Error Causes
 * @throws {Error} Bei ungültigen Eingaben
 */
export const bookSponsor = (stadiumState, block, sponsorId) => {
    if (!isValidBlock(block)) {
        const error = new Error(`Ungültiger Block: ${block}`);
        error.cause = { block, validBlocks: BLOCKS };
        throw error;
    }

    if (hasBlockSponsor(stadiumState, block)) {
        const error = new Error(`${block} hat bereits einen Sponsor!`);
        error.cause = {
            block,
            existingSponsorId: stadiumState?.features?.sponsors?.[block]
        };
        throw error;
    }

    if (!hasBlockAdvertising(stadiumState, block)) {
        const error = new Error(`Werbebande für ${block} nicht installiert!`);
        error.cause = { block };
        throw error;
    }

    const sponsor = getSponsorById(sponsorId);
    if (!sponsor) {
        const error = new Error(`Sponsor mit ID ${sponsorId} nicht gefunden!`);
        error.cause = { sponsorId };
        throw error;
    }

    try {
        const leaguePosition = stadiumState?.previousSeason?.leaguePosition ?? 9;
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
    } catch (error) {
        const bookingError = new Error('Failed to complete sponsor booking');
        bookingError.cause = { error, block, sponsorId, sponsor };
        console.error('❌ Booking error:', bookingError);
        throw bookingError;
    }
};

/**
 * Registriert Torprämie nach einem Spiel
 * ✅ ES2025: Optional Chaining für sichere State-Zugriffe
 */
export const registerGoalBonus = (stadiumState, block, matchId, goals) => {
    if (!hasBlockSponsor(stadiumState, block)) return null;

    try {
        const sponsorId = stadiumState.features.sponsors[block];
        const sponsor = getSponsorById(sponsorId);
        if (!sponsor) {
            console.warn(`⚠️ Sponsor ${sponsorId} not found for goal bonus`);
            return null;
        }

        const leaguePosition = stadiumState?.previousSeason?.leaguePosition ?? 9;
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
    } catch (error) {
        const bonusError = new Error('Failed to register goal bonus');
        bonusError.cause = { error, block, matchId, goals };
        console.error('❌ Goal bonus error:', bonusError);
        return null;
    }
};

/**
 * Registriert Siegprämie nach einem Spiel
 * ✅ ES2025: Optional Chaining für sichere State-Zugriffe
 */
export const registerWinBonus = (stadiumState, block, matchId) => {
    if (!hasBlockSponsor(stadiumState, block)) return null;

    try {
        const sponsorId = stadiumState.features.sponsors[block];
        const sponsor = getSponsorById(sponsorId);
        if (!sponsor) {
            console.warn(`⚠️ Sponsor ${sponsorId} not found for win bonus`);
            return null;
        }

        const leaguePosition = stadiumState?.previousSeason?.leaguePosition ?? 9;
        const adjusted = calculateAdjustedPayment(sponsor, leaguePosition);
        const amount = adjusted.perWin;

        stadiumState.sponsorData[block].payments.wins.push({
            matchId,
            amount,
            date: new Date().toISOString()
        });

        stadiumState.sponsorData[block].totalThisSeason += amount;

        return {sponsor: sponsor.name, amount};
    } catch (error) {
        const bonusError = new Error('Failed to register win bonus');
        bonusError.cause = { error, block, matchId };
        console.error('❌ Win bonus error:', bonusError);
        return null;
    }
};

/**
 * Registriert Titelprämie
 * ✅ ES2025: Defensive Validation
 */
export const registerTitleBonus = (stadiumState, block, titleType) => {
    if (!hasBlockSponsor(stadiumState, block)) return null;
    if (titleType !== 'league' && titleType !== 'cup') {
        console.warn('⚠️ Invalid title type:', titleType);
        return null;
    }

    try {
        const sponsorId = stadiumState.features.sponsors[block];
        const sponsor = getSponsorById(sponsorId);
        if (!sponsor) {
            console.warn(`⚠️ Sponsor ${sponsorId} not found for title bonus`);
            return null;
        }

        const leaguePosition = stadiumState?.previousSeason?.leaguePosition ?? 9;
        const adjusted = calculateAdjustedPayment(sponsor, leaguePosition);
        const amount = titleType === 'league' ? adjusted.leagueTitle : adjusted.cupTitle;

        stadiumState.sponsorData[block].payments.titles.push({
            type: titleType,
            amount,
            date: new Date().toISOString()
        });

        stadiumState.sponsorData[block].totalThisSeason += amount;

        return {sponsor: sponsor.name, titleType, amount};
    } catch (error) {
        const bonusError = new Error('Failed to register title bonus');
        bonusError.cause = { error, block, titleType };
        console.error('❌ Title bonus error:', bonusError);
        return null;
    }
};

/**
 * Gibt detaillierte Sponsor-Bilanz für einen Block zurück
 * ✅ ES2025: Optimierte Summierung mit einzelnem Durchlauf
 */
export const getSponsorBalance = (stadiumState, block) => {
    if (!hasBlockSponsor(stadiumState, block)) return null;

    try {
        const sponsorId = stadiumState.features.sponsors[block];
        const sponsor = getSponsorById(sponsorId);
        const data = stadiumState.sponsorData?.[block];

        if (!sponsor || !data) {
            console.warn(`⚠️ Incomplete sponsor data for block ${block}`);
            return null;
        }

        const {payments} = data;

        // Optimiert: Einzelner Durchlauf für alle Summen
        let totalGoalBonuses = 0;
        let totalGoals = 0;
        for (const entry of payments.goals ?? []) {
            totalGoalBonuses += entry.amount ?? 0;
            totalGoals += entry.goals ?? 0;
        }

        let totalWinBonuses = 0;
        for (const entry of payments.wins ?? []) {
            totalWinBonuses += entry.amount ?? 0;
        }

        let totalTitleBonuses = 0;
        for (const entry of payments.titles ?? []) {
            totalTitleBonuses += entry.amount ?? 0;
        }

        return {
            block,
            sponsor,
            bookedAt: data.bookedAt,
            payments: {
                initial: payments.initial ?? 0,
                goalBonuses: totalGoalBonuses,
                winBonuses: totalWinBonuses,
                titleBonuses: totalTitleBonuses
            },
            stats: {
                totalGoals,
                totalWins: payments.wins?.length ?? 0,
                titles: payments.titles?.length ?? 0
            },
            totalThisSeason: data.totalThisSeason ?? 0
        };
    } catch (error) {
        const balanceError = new Error('Failed to get sponsor balance');
        balanceError.cause = { error, block };
        console.error('❌ Balance error:', balanceError);
        return null;
    }
};

// =====================================================
// OPTIMIZED FILTER & SORTIERUNG
// =====================================================

/**
 * Filtert Sponsoren nach Kriterien
 * ✅ ES2025: Error Recovery für einzelne Filter-Operationen
 */
export const filterSponsors = (sponsors, filters, stadiumState = null) => {
    if (!Array.isArray(sponsors)) {
        console.warn('⚠️ Invalid sponsors array for filtering');
        return [];
    }

    try {
        // Cache-Key generieren
        const leaguePos = filters?.leaguePosition ?? 9;
        const capacity = stadiumState?.capacity?.total ?? 20000;
        const cacheKey = getFilterCacheKey(filters ?? {}, leaguePos, capacity);

        if (sessionCache.filtered.has(cacheKey)) {
            return sessionCache.filtered.get(cacheKey);
        }

        let filtered = sponsors;

        // Tier-Filter
        if (filters?.tier && filters.tier !== 'all') {
            filtered = filtered.filter(s => s?.tier === filters.tier);
        }

        // Branche-Filter
        if (filters?.industry && filters.industry !== 'all') {
            filtered = filtered.filter(s => s?.industry === filters.industry);
        }

        // Payment-Type Filter mit Sortierung
        if (filters?.paymentType) {
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
                    filtered = filtered.filter(s => s?.basePayment?.leagueTitle > 0);
                    break;
            }
        }

        return addToCache(sessionCache.filtered, cacheKey, filtered, CACHE_CONFIG.MAX_FILTERED_ENTRIES);
    } catch (error) {
        const filterError = new Error('Sponsor filtering failed');
        filterError.cause = { error, filters, sponsorCount: sponsors?.length };
        console.error('❌ Filter error:', filterError);
        return sponsors;
    }
};

/**
 * Sortiert Sponsoren
 * ✅ ES2025: Pre-computed Prognosen mit Error Recovery
 */
export const sortSponsors = (sponsors, sortBy, previousSeasonData, leaguePosition) => {
    if (!Array.isArray(sponsors)) {
        console.warn('⚠️ Invalid sponsors array for sorting');
        return [];
    }

    try {
        // Für einfache Sortierungen kein Cache nötig
        if (sortBy === 'name_asc') {
            return [...sponsors].sort((a, b) =>
                (a?.name ?? '').localeCompare(b?.name ?? '', 'de')
            );
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
    } catch (error) {
        const sortError = new Error('Sponsor sorting failed');
        sortError.cause = { error, sortBy, sponsorCount: sponsors?.length };
        console.error('❌ Sort error:', sortError);
        return sponsors;
    }
};

/**
 * Gibt alle verfügbaren Branchen zurück
 * ✅ ES2025: Set für O(1) Lookup mit Error Recovery
 */
export const getAvailableIndustries = (sponsors) => {
    if (!Array.isArray(sponsors)) {
        console.warn('⚠️ Invalid sponsors array for industries');
        return [];
    }

    try {
        const industries = new Set();
        for (const s of sponsors) {
            if (s?.industry) {
                industries.add(s.industry);
            }
        }
        return [...industries].sort((a, b) => a.localeCompare(b, 'de'));
    } catch (error) {
        const industriesError = new Error('Failed to get available industries');
        industriesError.cause = { error, sponsorCount: sponsors?.length };
        console.error('❌ Industries error:', industriesError);
        return [];
    }
};

// =====================================================
// VERGLEICHSMODUS
// =====================================================

/**
 * Bereitet Sponsor-Daten für Vergleich vor
 * ✅ ES2025: Error Recovery für einzelne Sponsoren
 */
export const prepareSponsorComparison = (sponsors, previousSeasonData, leaguePosition) => {
    if (!Array.isArray(sponsors)) {
        console.warn('⚠️ Invalid sponsors array for comparison');
        return [];
    }

    const results = [];

    for (const sponsor of sponsors) {
        try {
            const prognosis = calculateSponsorPrognosis(sponsor, previousSeasonData, leaguePosition);
            if (prognosis) {
                results.push({
                    sponsor,
                    adjustedPayment: prognosis.adjustedPayment,
                    prognosis: prognosis.prognosis,
                    calculations: prognosis.calculations
                });
            }
        } catch (error) {
            const compError = new Error('Failed to prepare sponsor for comparison');
            compError.cause = { error, sponsorId: sponsor?.id };
            console.warn('⚠️ Skipping sponsor in comparison:', compError);
        }
    }

    return results;
};

/**
 * Findet beste Werte in Vergleichs-Array
 * ✅ ES2025: Optimierter Einzeldurchlauf mit Error Recovery
 */
export const findBestValues = (comparisonData) => {
    if (!Array.isArray(comparisonData) || comparisonData.length === 0) {
        return null;
    }

    try {
        let bestInitial = -Infinity;
        let bestPerGoal = -Infinity;
        let bestPerWin = -Infinity;
        let bestPrognosis = -Infinity;
        let bestBestCase = -Infinity;
        let bestWorstCase = -Infinity;

        for (const d of comparisonData) {
            const initial = d?.adjustedPayment?.initial ?? -Infinity;
            const perGoal = d?.adjustedPayment?.perGoal ?? -Infinity;
            const perWin = d?.adjustedPayment?.perWin ?? -Infinity;
            const expectedTotal = d?.prognosis?.expectedTotal ?? -Infinity;
            const bestCase = d?.prognosis?.bestCase ?? -Infinity;
            const worstCase = d?.prognosis?.worstCase ?? -Infinity;

            if (initial > bestInitial) bestInitial = initial;
            if (perGoal > bestPerGoal) bestPerGoal = perGoal;
            if (perWin > bestPerWin) bestPerWin = perWin;
            if (expectedTotal > bestPrognosis) bestPrognosis = expectedTotal;
            if (bestCase > bestBestCase) bestBestCase = bestCase;
            if (worstCase > bestWorstCase) bestWorstCase = worstCase;
        }

        return {
            bestInitial,
            bestPerGoal,
            bestPerWin,
            bestPrognosis,
            bestBestCase,
            bestWorstCase
        };
    } catch (error) {
        const bestValuesError = new Error('Failed to find best values');
        bestValuesError.cause = { error, dataCount: comparisonData?.length };
        console.error('❌ Best values error:', bestValuesError);
        return null;
    }
};

// =====================================================
// EMPFEHLUNGS-SYSTEM
// =====================================================

/**
 * Gibt Empfehlung basierend auf Team-Profil
 * ✅ ES2025: Nullish Coalescing für alle Defaults
 */
export const getSponsorRecommendation = (sponsors, previousSeasonData, leaguePosition) => {
    if (!Array.isArray(sponsors) || sponsors.length === 0) {
        return null;
    }

    try {
        const totalGoals = previousSeasonData?.totalGoals ?? 0;
        const totalWins = previousSeasonData?.totalWins ?? 0;
        const totalGames = previousSeasonData?.totalGames ?? 34;

        const avgGoalsPerGame = totalGames > 0 ? totalGoals / totalGames : 0;
        const winRate = totalGames > 0 ? totalWins / totalGames : 0;

        const comparisons = prepareSponsorComparison(sponsors, previousSeasonData, leaguePosition);

        if (comparisons.length === 0) {
            return null;
        }

        let recommendation;
        let reason;

        if (avgGoalsPerGame >= 2.5) {
            comparisons.sort((a, b) =>
                (b?.adjustedPayment?.perGoal ?? 0) - (a?.adjustedPayment?.perGoal ?? 0)
            );
            recommendation = comparisons[0].sponsor;
            reason = 'Bei durchschnittlich 2.5+ Toren pro Spiel optimiert diese Wahl die Torprämien.';
        } else if (winRate >= 0.60) {
            comparisons.sort((a, b) =>
                (b?.adjustedPayment?.perWin ?? 0) - (a?.adjustedPayment?.perWin ?? 0)
            );
            recommendation = comparisons[0].sponsor;
            reason = 'Bei 60%+ Siegquote bietet dieser Sponsor die besten Siegprämien.';
        } else {
            comparisons.sort((a, b) =>
                (b?.prognosis?.expectedTotal ?? 0) - (a?.prognosis?.expectedTotal ?? 0)
            );
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
    } catch (error) {
        const recommendationError = new Error('Failed to get sponsor recommendation');
        recommendationError.cause = { error, previousSeasonData, leaguePosition };
        console.error('❌ Recommendation error:', recommendationError);
        return null;
    }
};
