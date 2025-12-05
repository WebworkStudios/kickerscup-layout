// =====================================================
// KICKERSCUP - STADIUM CONFIGURATION (SAFARI-KOMPATIBEL)
// Zentrale Konfiguration für Stadion-Features
// ✅ SAFARI-FIX: Robuste Number Formatter mit Fallbacks
// =====================================================

/**
 * @typedef {Object} CapacityDistribution
 * @property {number} capacity
 * @property {number} stage
 * @property {number} standing
 * @property {number} seated
 * @property {number} boxes
 */

/**
 * @typedef {'NORD'|'OST'|'SUED'|'WEST'} BlockName
 */

// =====================================================
// CORE CONSTANTS (Object.freeze für Immutabilität)
// =====================================================

export const BLOCKS = Object.freeze(['NORD', 'OST', 'SUED', 'WEST']);

export const CAPACITY_CONFIG = Object.freeze({
    MAX_CAPACITY: 150_000,
    INITIAL_CAPACITY: 20_000,
    INITIAL_PER_BLOCK: 5_000,
    FIXED_BOX_BLOCK: 'SUED',

    DISTRIBUTION: Object.freeze({
        BOXES: 0.05,
        STANDING: 0.35,
        SEATED: 0.60
    }),

    BLOCKS
});

export const TIMING_CONFIG = Object.freeze({
    GAME_SEASON: Object.freeze({
        START_DAY: 1,
        END_DAY: 27
    }),
    DAYS_PER_BUILD_WEEK: 7,
    MAX_PARALLEL_BUILDS: 2
});

export const ROOF_CONFIG = Object.freeze({
    type: 'block-specific',
    buildWeeks: 3,
    cost: 500_000,
    pitchWearReduction: 0.10,
    maintenanceCost: 5_000
});

export const FLOODLIGHT_CONFIG = Object.freeze({
    type: 'stadium-wide',
    stages: Object.freeze([
        {id: 0, name: 'Keine', buildWeeks: 0, cost: 0, tvRevenueMultiplier: 1.0, maintenanceCost: 0},
        {id: 1, name: 'Klein', buildWeeks: 2, cost: 200_000, tvRevenueMultiplier: 1.15, maintenanceCost: 3_000},
        {id: 2, name: 'Mittel', buildWeeks: 3, cost: 400_000, tvRevenueMultiplier: 1.30, maintenanceCost: 6_000},
        {id: 3, name: 'Groß', buildWeeks: 4, cost: 800_000, tvRevenueMultiplier: 1.50, maintenanceCost: 10_000}
    ])
});

export const PITCH_CONFIG = Object.freeze({
    type: 'stadium-wide',
    name: 'British Premium',
    description: 'Perfekte Qualität - verschlechtert sich über Zeit',
    texture: 'british',
    color: '#2d5016',
    MAX_CONDITION: 100,
    MIN_CONDITION: 0,
    BASE_WEAR_PER_MATCH: 10,

    renovation: Object.freeze({
        cost: 150_000,
        buildWeeks: 2,
        maintenanceCost: 50_000
    })
});

export const ADVERTISING_CONFIG = Object.freeze({
    type: 'block-specific',
    blocks: BLOCKS,
    bannerTypes: Object.freeze({
        NORD: 'curve',
        OST: 'longside',
        SUED: 'curve',
        WEST: 'longside'
    }),
    buildWeeks: 1,
    cost: 50_000,
    maintenanceCost: 1_000,
    bannersPerBlock: Object.freeze({
        longside: 3,
        curve: 2
    }),
    rotationInterval: 30
});

export const EXPANSION_CONFIG = Object.freeze({
    minStep: 500,
    maxStep: 5_000,
    costPerSeat: 250,
    buildWeeksPerThousand: 1,
    minBuildWeeks: 1,

    blockMultipliers: Object.freeze({
        NORD: 1.0,
        OST: 1.2,
        SUED: 1.5,
        WEST: 1.2
    }),

    buildSeasonRestriction: Object.freeze({
        allowedDays: [28, 29, 30, 31],
        warningMessage: 'Tribünen-Ausbau ist nur während der Saisonpause (Tag 28-31) möglich!'
    }),

    stages: Object.freeze([
        {id: 0, name: 'Klein', capacity: 5_000, buildWeeks: 0},
        {id: 1, name: 'Mittel', capacity: 10_000, buildWeeks: 7},
        {id: 2, name: 'Groß', capacity: 20_000, buildWeeks: 14},
        {id: 3, name: 'Sehr Groß', capacity: 30_000, buildWeeks: 21},
        {id: 4, name: 'Maximum', capacity: 37_500, buildWeeks: 28}
    ])
});

// =====================================================
// SPONSOR CONFIGURATION
// =====================================================

// Liga-Position Multiplikatoren als Map für O(1) Zugriff
const LEAGUE_POSITION_MULTIPLIERS = new Map([
    [1, 1.30], [2, 1.30], [3, 1.30],
    [4, 1.15], [5, 1.15], [6, 1.15], [7, 1.15], [8, 1.15],
    [9, 1.0], [10, 1.0], [11, 1.0], [12, 1.0], [13, 1.0], [14, 1.0],
    [15, 0.85], [16, 0.85], [17, 0.85], [18, 0.85]
]);

export const SPONSOR_CONFIG = Object.freeze({
    contractDuration: 1,
    baseRevenuePerBanner: 5_000,

    getLeagueMultiplier: (position) => LEAGUE_POSITION_MULTIPLIERS.get(position) ?? 1.0,

    tiers: Object.freeze({
        international: {name: 'International', icon: '🌍', multiplier: 3.0, color: '#FFD700', minCapacity: 80_000},
        national: {name: 'National', icon: '🏴', multiplier: 2.0, color: '#00c78b', minCapacity: 40_000},
        regional: {name: 'Regional', icon: '🏙️', multiplier: 1.0, color: '#4a90e2', minCapacity: 20_000},
        local: {name: 'Lokal', icon: '🏘️', multiplier: 0.5, color: '#888888', minCapacity: 0}
    }),

    availableSponsors: Object.freeze([
        // International
        {
            id: 1,
            name: 'TechGiant Global',
            shortName: 'TECHGIANT',
            tier: 'international',
            industry: 'Technologie',
            slogan: 'Innovation für alle',
            website: 'www.techgiant-global.com',
            color: '#0066cc',
            basePayment: {initial: 500_000, perGoal: 15_000, perWin: 25_000, leagueTitle: 500_000, cupTitle: 250_000}
        },
        {
            id: 2,
            name: 'AutoMax International',
            shortName: 'AUTOMAX',
            tier: 'international',
            industry: 'Automobil',
            slogan: 'Mobilität neu gedacht',
            website: 'www.automax-world.com',
            color: '#cc0000',
            basePayment: {initial: 450_000, perGoal: 12_000, perWin: 30_000, leagueTitle: 600_000, cupTitle: 300_000}
        },
        {
            id: 3,
            name: 'SportWear Pro',
            shortName: 'SPORTWEAR',
            tier: 'international',
            industry: 'Sport',
            slogan: 'Just do more',
            website: 'www.sportwear-pro.com',
            color: '#00cc66',
            basePayment: {initial: 400_000, perGoal: 20_000, perWin: 20_000, leagueTitle: 550_000, cupTitle: 275_000}
        },
        // National
        {
            id: 4,
            name: 'Elektro-Markt',
            shortName: 'ELEKTRO-MARKT',
            tier: 'national',
            industry: 'Elektronik',
            slogan: 'Technik zum besten Preis',
            website: 'www.elektro-markt.de',
            color: '#ff6600',
            basePayment: {initial: 300_000, perGoal: 10_000, perWin: 18_000, leagueTitle: 400_000, cupTitle: 200_000}
        },
        {
            id: 5,
            name: 'National Telekom',
            shortName: 'N-TELEKOM',
            tier: 'national',
            industry: 'Telekommunikation',
            slogan: 'Verbunden mit der Zukunft',
            website: 'www.n-telekom.de',
            color: '#e20074',
            basePayment: {initial: 350_000, perGoal: 8_000, perWin: 20_000, leagueTitle: 450_000, cupTitle: 225_000}
        },
        {
            id: 6,
            name: 'Volksbank Deutschland',
            shortName: 'VOLKSBANK',
            tier: 'national',
            industry: 'Finanzen',
            slogan: 'Wir machen den Weg frei',
            website: 'www.volksbank.de',
            color: '#003d7a',
            basePayment: {initial: 280_000, perGoal: 9_000, perWin: 17_000, leagueTitle: 380_000, cupTitle: 190_000}
        },
        // Regional
        {
            id: 7,
            name: 'Stadtwerke Regional',
            shortName: 'STADTWERKE',
            tier: 'regional',
            industry: 'Energie',
            slogan: 'Energie für unsere Region',
            website: 'www.stadtwerke-regional.de',
            color: '#009933',
            basePayment: {initial: 150_000, perGoal: 5_000, perWin: 10_000, leagueTitle: 200_000, cupTitle: 100_000}
        },
        {
            id: 8,
            name: 'Sparkasse Zentral',
            shortName: 'SPARKASSE',
            tier: 'regional',
            industry: 'Finanzen',
            slogan: "Wenn's um Geld geht",
            website: 'www.sparkasse-zentral.de',
            color: '#ff0000',
            basePayment: {initial: 180_000, perGoal: 6_000, perWin: 12_000, leagueTitle: 250_000, cupTitle: 125_000}
        },
        {
            id: 9,
            name: 'Radio Regional 98.5',
            shortName: 'RADIO 98.5',
            tier: 'regional',
            industry: 'Medien',
            slogan: 'Dein Soundtrack',
            website: 'www.radio-regional.de',
            color: '#ffcc00',
            basePayment: {initial: 120_000, perGoal: 4_000, perWin: 8_000, leagueTitle: 150_000, cupTitle: 75_000}
        },
        {
            id: 10,
            name: 'Fitness-Studio Premium',
            shortName: 'FITNESS+',
            tier: 'regional',
            industry: 'Fitness',
            slogan: 'Dein Weg zur Topform',
            website: 'www.fitness-premium.de',
            color: '#cc3300',
            basePayment: {initial: 100_000, perGoal: 3_500, perWin: 7_000, leagueTitle: 120_000, cupTitle: 60_000}
        },
        // Local
        {
            id: 11,
            name: 'Bäckerei Schmidt',
            shortName: 'BÄCKEREI SCHMIDT',
            tier: 'local',
            industry: 'Lebensmittel',
            slogan: 'Frisch gebacken seit 1985',
            website: 'Tel. 12345',
            color: '#8b4513',
            basePayment: {initial: 50_000, perGoal: 1_500, perWin: 3_000, leagueTitle: 50_000, cupTitle: 25_000}
        },
        {
            id: 12,
            name: 'Autowerkstatt Meyer',
            shortName: 'KFZ MEYER',
            tier: 'local',
            industry: 'Handwerk',
            slogan: 'Meisterbetrieb • Alle Marken',
            website: 'www.meyer-kfz.de',
            color: '#333333',
            basePayment: {initial: 60_000, perGoal: 2_000, perWin: 4_000, leagueTitle: 60_000, cupTitle: 30_000}
        },
        {
            id: 13,
            name: 'Friseur Styling',
            shortName: 'HAIR & STYLE',
            tier: 'local',
            industry: 'Dienstleistung',
            slogan: 'Ihr Friseur des Vertrauens',
            website: 'Tel. 67890',
            color: '#ff1493',
            basePayment: {initial: 40_000, perGoal: 1_200, perWin: 2_500, leagueTitle: 40_000, cupTitle: 20_000}
        },
        {
            id: 14,
            name: 'Metzgerei Wagner',
            shortName: 'METZGEREI WAGNER',
            tier: 'local',
            industry: 'Lebensmittel',
            slogan: 'Qualität aus eigener Schlachtung',
            website: 'Marktplatz 5',
            color: '#8b0000',
            basePayment: {initial: 45_000, perGoal: 1_300, perWin: 2_800, leagueTitle: 45_000, cupTitle: 22_500}
        },
        {
            id: 15,
            name: 'Apotheke Zentrum',
            shortName: 'APOTHEKE',
            tier: 'local',
            industry: 'Gesundheit',
            slogan: 'Ihre Gesundheit ist uns wichtig',
            website: 'www.apotheke-zentrum.de',
            color: '#dc143c',
            basePayment: {initial: 55_000, perGoal: 1_800, perWin: 3_500, leagueTitle: 55_000, cupTitle: 27_500}
        }
    ])
});

// Sponsor-Map für O(1) Lookup
const sponsorMap = new Map(SPONSOR_CONFIG.availableSponsors.map(s => [s.id, s]));

/**
 * Schneller Sponsor-Lookup
 * @param {number} id
 * @returns {Object|undefined}
 */
export const getSponsorById = (id) => sponsorMap.get(id);

// =====================================================
// INITIAL STATE FACTORY
// =====================================================

/**
 * Erstellt einen frischen Initial-State (Deep Clone)
 * @returns {Object} Neuer Stadium-State
 */
export const createInitialState = () => ({
    capacity: {
        total: 20_000,
        boxes: {total: 1_000, placement: 'SUED'},
        standing: 7_000,
        seated: 12_000,
        distribution: {
            NORD: {capacity: 5_000, stage: 0, standing: 1_750, seated: 3_250, boxes: 0},
            OST: {capacity: 5_000, stage: 0, standing: 1_750, seated: 3_250, boxes: 0},
            SUED: {capacity: 5_000, stage: 0, standing: 1_750, seated: 2_250, boxes: 1_000},
            WEST: {capacity: 5_000, stage: 0, standing: 1_750, seated: 3_250, boxes: 0}
        }
    },
    features: {
        roofs: {NORD: false, OST: false, SUED: false, WEST: false},
        floodlight: 0,
        pitch: {condition: 100},
        advertising: {NORD: false, OST: false, SUED: false, WEST: false},
        sponsors: {NORD: null, OST: null, SUED: null, WEST: null}
    },
    construction: {queue: [], active: 0},
    previousSeason: {
        season: '2023/24',
        leaguePosition: 9,
        totalGames: 34,
        totalGoals: 52,
        totalWins: 15,
        leagueTitle: false,
        cupTitle: false
    },
    currentDay: 12,
    currentMonth: 8,
    season: '2024/25'
});

// Legacy-Export für Kompatibilität
export const INITIAL_STADIUM_STATE = createInitialState();

// =====================================================
// UI TEXTS
// =====================================================

export const UI_TEXTS = Object.freeze({
    blocks: Object.freeze({
        NORD: 'Nordkurve',
        OST: 'Osttribüne',
        SUED: 'Südkurve',
        WEST: 'Westtribüne'
    }),
    constructionStatus: Object.freeze({
        active: '🔨 Im Bau',
        queued: '⏳ In Warteschlange',
        completed: '✅ Abgeschlossen'
    })
});

// =====================================================
// UTILITY FUNCTIONS (SAFARI-KOMPATIBEL)
// =====================================================

// Intl-Formatter mit Safari-Fallback
let currencyFormatter;
let numberFormatter;

try {
    currencyFormatter = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    numberFormatter = new Intl.NumberFormat('de-DE');
} catch (error) {
    console.warn('⚠️ Intl.NumberFormat error (Safari?), using fallback');
}

/**
 * Formatiert Geldbeträge (Safari-kompatibel)
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
    const num = Number(amount);

    if (!Number.isFinite(num)) {
        console.warn('formatCurrency: Invalid amount', amount);
        return '0 €';
    }

    try {
        if (currencyFormatter) return currencyFormatter.format(num);
    } catch (error) {
        console.warn('formatCurrency error:', error);
    }

    // Fallback: Manuelle Formatierung
    return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
};

/**
 * Formatiert Kapazitätszahlen (Safari-kompatibel)
 * @param {number} num
 * @returns {string}
 */
export const formatCapacity = (num) => {
    const value = Number(num);

    if (!Number.isFinite(value)) {
        console.warn('formatCapacity: Invalid number', num);
        return '0';
    }

    try {
        if (numberFormatter) return numberFormatter.format(value);
    } catch (error) {
        console.warn('formatCapacity error:', error);
    }

    // Fallback: Manuelle Formatierung
    return value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Berechnet Bauzeit in Tagen
 * @param {number} weeks
 * @returns {number}
 */
export const calculateBuildDays = (weeks) => {
    const w = Math.max(0, Math.floor(weeks));
    return w * TIMING_CONFIG.DAYS_PER_BUILD_WEEK;
};

/**
 * Validiert Block-Namen
 * @param {string} block
 * @returns {boolean}
 */
export const isValidBlock = (block) => BLOCKS.includes(block);

/**
 * Berechnet Kapazitäts-Verteilung
 * @param {number} totalCapacity
 * @param {boolean} hasBoxes
 * @returns {{standing: number, seated: number, boxes: number}}
 */
export const calculateCapacityDistribution = (totalCapacity, hasBoxes = false) => {
    const total = Math.max(0, Math.floor(totalCapacity));
    const {BOXES, STANDING, SEATED} = CAPACITY_CONFIG.DISTRIBUTION;

    const boxes = hasBoxes ? Math.round(total * BOXES) : 0;
    const remaining = total - boxes;
    const totalRatio = STANDING + SEATED;
    const standing = Math.round(remaining * (STANDING / totalRatio));
    const seated = remaining - standing;

    return {standing, seated, boxes};
};

/**
 * Berechnet Ausbau-Kosten mit Validierung
 * @param {BlockName} block
 * @param {number} additionalSeats
 * @returns {number}
 */
export const calculateExpansionCost = (block, additionalSeats) => {
    if (!isValidBlock(block)) {
        throw new Error(`Invalid block: ${block}`);
    }

    const seats = Math.max(0, Math.floor(additionalSeats));
    const baseCost = seats * EXPANSION_CONFIG.costPerSeat;
    const multiplier = EXPANSION_CONFIG.blockMultipliers[block];

    return Math.round(baseCost * multiplier);
};

/**
 * Berechnet Bauzeit für Ausbau
 * @param {number} additionalSeats
 * @returns {number}
 */
export const calculateExpansionBuildWeeks = (additionalSeats) => {
    const seats = Math.max(0, Math.floor(additionalSeats));
    const weeks = Math.ceil(seats / 1000) * EXPANSION_CONFIG.buildWeeksPerThousand;
    return Math.max(weeks, EXPANSION_CONFIG.minBuildWeeks);
};

// =====================================================
// STATE VALIDATION
// =====================================================

/**
 * Validiert Stadium-State Struktur
 * @param {Object} state
 * @returns {{valid: boolean, errors: string[]}}
 */
export const validateState = (state) => {
    const errors = [];

    if (!state) {
        return {valid: false, errors: ['State is null or undefined']};
    }

    // Capacity checks
    if (!state.capacity?.distribution) {
        errors.push('Missing capacity.distribution');
    } else {
        for (const block of BLOCKS) {
            if (!state.capacity.distribution[block]) {
                errors.push(`Missing distribution for block: ${block}`);
            }
        }
    }

    // Features checks
    if (!state.features) {
        errors.push('Missing features object');
    } else {
        if (!state.features.roofs) errors.push('Missing features.roofs');
        if (!state.features.advertising) errors.push('Missing features.advertising');
        if (!state.features.sponsors) errors.push('Missing features.sponsors');
        if (state.features.pitch?.condition === undefined) errors.push('Missing features.pitch.condition');
    }

    // Construction checks
    if (!state.construction) {
        errors.push('Missing construction object');
    }

    return {valid: errors.length === 0, errors};
};

/**
 * Repariert/migriert einen beschädigten State
 * @param {Object} state
 * @returns {Object} Reparierter State
 */
export const repairState = (state) => {
    const initial = createInitialState();

    if (!state) return initial;

    // Deep merge mit Fallbacks
    return {
        capacity: {
            ...initial.capacity,
            ...state.capacity,
            distribution: {
                ...initial.capacity.distribution,
                ...state.capacity?.distribution
            },
            boxes: {
                ...initial.capacity.boxes,
                ...state.capacity?.boxes
            }
        },
        features: {
            ...initial.features,
            ...state.features,
            roofs: {...initial.features.roofs, ...state.features?.roofs},
            advertising: {...initial.features.advertising, ...state.features?.advertising},
            sponsors: {...initial.features.sponsors, ...state.features?.sponsors},
            pitch: {...initial.features.pitch, ...state.features?.pitch}
        },
        construction: {
            ...initial.construction,
            ...state.construction,
            queue: Array.isArray(state.construction?.queue) ? state.construction.queue : []
        },
        previousSeason: {...initial.previousSeason, ...state.previousSeason},
        currentDay: state.currentDay ?? initial.currentDay,
        currentMonth: state.currentMonth ?? initial.currentMonth,
        season: state.season ?? initial.season
    };
};