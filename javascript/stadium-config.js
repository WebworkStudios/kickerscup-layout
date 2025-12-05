// =====================================================
// KICKERSCUP - STADIUM CONFIGURATION (EXTENDED)
// Zentrale Konfiguration für Stadion-Features
// ✅ OPTIMIERT: Logen fix in SUED, vereinfachtes Rasen-System
// =====================================================

/**
 * Stadion-Kapazität und Verteilung
 */
export const CAPACITY_CONFIG = {
    MAX_CAPACITY: 150000,

    // Startwerte: 20.000 Plätze (5.000 pro Block)
    INITIAL_CAPACITY: 20000,
    INITIAL_PER_BLOCK: 5000,

    DISTRIBUTION: {
        BOXES: 0.05,      // 5% = 7.500 Plätze (bei max. Ausbau)
        STANDING: 0.35,   // 35% = 52.500 Plätze
        SEATED: 0.60      // 60% = 90.000 Plätze
    },

    // Logen sind fest in der SÜDKURVE platziert
    FIXED_BOX_BLOCK: 'SUED',

    // Block-Namen (entsprechend dem Layout)
    BLOCKS: ['NORD', 'OST', 'SUED', 'WEST']
};

/**
 * Spielbetrieb und Bauzeiten
 */
export const TIMING_CONFIG = {
    // Aktiver Spielbetrieb: Tag 1-27 des Monats
    GAME_SEASON: {
        START_DAY: 1,
        END_DAY: 27
    },

    // Bauzeit-Einheit: 1 Spieltages-Woche (SW) = 7 Ingame-Tage
    DAYS_PER_BUILD_WEEK: 7,

    // Maximale parallele Bauprojekte
    MAX_PARALLEL_BUILDS: 2
};

/**
 * Feature: Block-Dächer (4 separate Einheiten)
 */
export const ROOF_CONFIG = {
    type: 'block-specific',

    // Bauzeit pro Dach
    buildWeeks: 3,  // 3 SW = 21 Tage

    // Kosten pro Dach
    cost: 500000,

    // Bonus: Reduzierung der Rasenabnutzung
    pitchWearReduction: 0.10,  // -10% pro Dach

    // Wartungskosten pro Dach/Monat
    maintenanceCost: 5000
};

/**
 * Feature: Flutlicht (3 Stufen, Stadium-Wide)
 */
export const FLOODLIGHT_CONFIG = {
    type: 'stadium-wide',

    stages: [
        {
            id: 0,
            name: 'Keine',
            buildWeeks: 0,
            cost: 0,
            tvRevenueMultiplier: 1.0,
            maintenanceCost: 0
        },
        {
            id: 1,
            name: 'Klein',
            buildWeeks: 2,  // 2 SW = 14 Tage
            cost: 200000,
            tvRevenueMultiplier: 1.15,  // +15% TV-Einnahmen
            maintenanceCost: 3000
        },
        {
            id: 2,
            name: 'Mittel',
            buildWeeks: 3,  // 3 SW = 21 Tage
            cost: 400000,
            tvRevenueMultiplier: 1.30,  // +30% TV-Einnahmen
            maintenanceCost: 6000
        },
        {
            id: 3,
            name: 'Groß',
            buildWeeks: 4,  // 4 SW = 28 Tage
            cost: 800000,
            tvRevenueMultiplier: 1.50,  // +50% TV-Einnahmen
            maintenanceCost: 10000
        }
    ]
};

/**
 * Feature: Rasen (NUR British Premium - Zustand verschlechtert sich)
 */
export const PITCH_CONFIG = {
    type: 'stadium-wide',

    // Es gibt nur EINEN Rasen-Typ: British Premium
    name: 'British Premium',
    description: 'Perfekte Qualität - verschlechtert sich über Zeit',
    texture: 'british',
    color: '#2d5016',  // Sattes Grün

    // Rasen-Zustand (0-100%)
    MAX_CONDITION: 100,
    MIN_CONDITION: 0,

    // Abnutzung pro Spiel (Basiswert)
    BASE_WEAR_PER_MATCH: 10,

    // Renovation bringt zurück auf 100%
    renovation: {
        cost: 150000,
        buildWeeks: 2,  // 2 SW = 14 Tage
        maintenanceCost: 50000  // Pro Monat
    }
};

/**
 * Feature: Werbung (4 Banden mit realistischen Werbebannern)
 */
export const ADVERTISING_CONFIG = {
    type: 'block-specific',

    // Banden-Platzierung: Längsseiten (OST/WEST) und Kurven (NORD/SUED)
    blocks: ['NORD', 'OST', 'SUED', 'WEST'],
    bannerTypes: {
        NORD: 'curve',      // Kurze Seite (Kurven-Bande)
        OST: 'longside',    // Lange Seite (Längs-Bande)
        SUED: 'curve',      // Kurze Seite (Kurven-Bande)
        WEST: 'longside'    // Lange Seite (Längs-Bande)
    },

    // Installation
    buildWeeks: 1,  // 1 SW = 7 Tage
    cost: 50000,

    // Wartungskosten pro Feld/Monat
    maintenanceCost: 1000,

    // Banner-Slots pro Bande (rotierend während des Spiels)
    bannersPerBlock: {
        longside: 3,  // Längsseiten: 3 rotierende Banner
        curve: 2      // Kurven: 2 rotierende Banner
    },

    // Rotation: Banner wechseln alle X Sekunden (im Spiel)
    rotationInterval: 30  // Sekunden
};

/**
 * Feature: Tribünen-Ausbau (flexibel in Schritten)
 */
export const EXPANSION_CONFIG = {
    // Minimaler Ausbau-Schritt
    minStep: 500,

    // Maximaler Ausbau-Schritt
    maxStep: 5000,

    // Kosten pro Platz (Basis)
    costPerSeat: 250,

    // Bauzeit-Berechnung: 1 SW pro 1.000 Plätze (gerundet)
    buildWeeksPerThousand: 1,
    minBuildWeeks: 1,  // Minimum 1 SW auch bei kleinen Ausbauten

    // Block-spezifische Multiplikatoren
    blockMultipliers: {
        NORD: 1.0,   // Standard
        OST: 1.2,    // +20% (Haupttribüne)
        SUED: 1.5,   // +50% (Südkurve mit Logen)
        WEST: 1.2    // +20% (Haupttribüne)
    },

    // Bauzeit-Einschränkung
    buildSeasonRestriction: {
        allowedDays: [28, 29, 30, 31],  // Nur Ende des Monats
        warningMessage: 'Tribünen-Ausbau ist nur während der Saisonpause (Tag 28-31) möglich!'
    },

    // Ausbau-Stufen für UI-Orientierung (optional)
    stages: [
        { id: 0, name: 'Klein', capacity: 5000, buildWeeks: 0 },
        { id: 1, name: 'Mittel', capacity: 10000, buildWeeks: 7 },
        { id: 2, name: 'Groß', capacity: 20000, buildWeeks: 14 },
        { id: 3, name: 'Sehr Groß', capacity: 30000, buildWeeks: 21 },
        { id: 4, name: 'Maximum', capacity: 37500, buildWeeks: 28 }
    ]
};

/**
 * Sponsor-Kategorien und verfügbare Firmen
 */
export const SPONSOR_CONFIG = {
    // Vertragslaufzeit in Saisons
    contractDuration: 1,

    // Liga-Position Multiplikatoren für Vergütung
    leaguePositionMultipliers: {
        1: 1.30,   // Platz 1-3: +30%
        2: 1.30,
        3: 1.30,
        4: 1.15,   // Platz 4-8: +15%
        5: 1.15,
        6: 1.15,
        7: 1.15,
        8: 1.15,
        9: 1.0,    // Platz 9-14: Standard
        10: 1.0,
        11: 1.0,
        12: 1.0,
        13: 1.0,
        14: 1.0,
        15: 0.85,  // Platz 15-18: -15%
        16: 0.85,
        17: 0.85,
        18: 0.85
    },

    // Kategorien mit verschiedenen Zahlungsbereitschaft
    tiers: {
        international: {
            name: 'International',
            icon: '🌍',
            multiplier: 3.0,
            color: '#FFD700',
            minCapacity: 80000,  // Erst ab 80k Stadion-Kapazität
            examples: ['Amazon', 'Nike', 'Coca-Cola']
        },
        national: {
            name: 'National',
            icon: '🏴',
            multiplier: 2.0,
            color: '#00c78b',
            minCapacity: 40000,
            examples: ['MediaMarkt', 'Telekom', 'Volksbank']
        },
        regional: {
            name: 'Regional',
            icon: '🏙️',
            multiplier: 1.0,
            color: '#4a90e2',
            minCapacity: 20000,
            examples: ['Stadtwerke', 'Sparkasse', 'Regional-Radio']
        },
        local: {
            name: 'Lokal',
            icon: '🏘️',
            multiplier: 0.5,
            color: '#888888',
            minCapacity: 0,
            examples: ['Bäckerei', 'Autowerkstatt', 'Friseur']
        }
    },

    // Verfügbare Sponsoren mit realistischen Namen und Branchen
    availableSponsors: [
        // International (ab 80k Kapazität)
        {
            id: 1,
            name: 'TechGiant Global',
            shortName: 'TECHGIANT',
            tier: 'international',
            industry: 'Technologie',
            slogan: 'Innovation für alle',
            website: 'www.techgiant-global.com',
            color: '#0066cc',
            basePayment: {
                initial: 500000,
                perGoal: 15000,
                perWin: 25000,
                leagueTitle: 500000,
                cupTitle: 250000
            }
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
            basePayment: {
                initial: 450000,
                perGoal: 12000,
                perWin: 30000,
                leagueTitle: 600000,
                cupTitle: 300000
            }
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
            basePayment: {
                initial: 400000,
                perGoal: 20000,
                perWin: 20000,
                leagueTitle: 550000,
                cupTitle: 275000
            }
        },

        // National (ab 40k Kapazität)
        {
            id: 4,
            name: 'Elektro-Markt',
            shortName: 'ELEKTRO-MARKT',
            tier: 'national',
            industry: 'Elektronik',
            slogan: 'Technik zum besten Preis',
            website: 'www.elektro-markt.de',
            color: '#ff6600',
            basePayment: {
                initial: 300000,
                perGoal: 10000,
                perWin: 18000,
                leagueTitle: 400000,
                cupTitle: 200000
            }
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
            basePayment: {
                initial: 350000,
                perGoal: 8000,
                perWin: 20000,
                leagueTitle: 450000,
                cupTitle: 225000
            }
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
            basePayment: {
                initial: 280000,
                perGoal: 9000,
                perWin: 17000,
                leagueTitle: 380000,
                cupTitle: 190000
            }
        },

        // Regional (ab 20k Kapazität)
        {
            id: 7,
            name: 'Stadtwerke Regional',
            shortName: 'STADTWERKE',
            tier: 'regional',
            industry: 'Energie',
            slogan: 'Energie für unsere Region',
            website: 'www.stadtwerke-regional.de',
            color: '#009933',
            basePayment: {
                initial: 150000,
                perGoal: 5000,
                perWin: 10000,
                leagueTitle: 200000,
                cupTitle: 100000
            }
        },
        {
            id: 8,
            name: 'Sparkasse Zentral',
            shortName: 'SPARKASSE',
            tier: 'regional',
            industry: 'Finanzen',
            slogan: 'Wenn\'s um Geld geht',
            website: 'www.sparkasse-zentral.de',
            color: '#ff0000',
            basePayment: {
                initial: 180000,
                perGoal: 6000,
                perWin: 12000,
                leagueTitle: 250000,
                cupTitle: 125000
            }
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
            basePayment: {
                initial: 120000,
                perGoal: 4000,
                perWin: 8000,
                leagueTitle: 150000,
                cupTitle: 75000
            }
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
            basePayment: {
                initial: 100000,
                perGoal: 3500,
                perWin: 7000,
                leagueTitle: 120000,
                cupTitle: 60000
            }
        },

        // Lokal (ab 0 Kapazität)
        {
            id: 11,
            name: 'Bäckerei Schmidt',
            shortName: 'BÄCKEREI SCHMIDT',
            tier: 'local',
            industry: 'Lebensmittel',
            slogan: 'Frisch gebacken seit 1985',
            website: 'Tel. 12345',
            color: '#8b4513',
            basePayment: {
                initial: 50000,
                perGoal: 1500,
                perWin: 3000,
                leagueTitle: 50000,
                cupTitle: 25000
            }
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
            basePayment: {
                initial: 60000,
                perGoal: 2000,
                perWin: 4000,
                leagueTitle: 60000,
                cupTitle: 30000
            }
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
            basePayment: {
                initial: 40000,
                perGoal: 1200,
                perWin: 2500,
                leagueTitle: 40000,
                cupTitle: 20000
            }
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
            basePayment: {
                initial: 45000,
                perGoal: 1300,
                perWin: 2800,
                leagueTitle: 45000,
                cupTitle: 22500
            }
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
            basePayment: {
                initial: 55000,
                perGoal: 1800,
                perWin: 3500,
                leagueTitle: 55000,
                cupTitle: 27500
            }
        }
    ],

    // Basis-Einnahmen pro Banner pro Heimspiel
    baseRevenuePerBanner: 5000
};

/**
 * Initiale Stadion-Konfiguration (Startwerte)
 */
export const INITIAL_STADIUM_STATE = {
    capacity: {
        total: 20000,  // Start: 20.000 Plätze
        boxes: {
            total: 1000,  // 5% = 1.000 Logen (fix in SUED)
            placement: 'SUED'  // Fest in Südkurve
        },
        standing: 7000,  // 35% Stehplätze zu Beginn
        seated: 12000,   // 60% Sitzplätze zu Beginn
        distribution: {
            NORD: {
                capacity: 5000,
                stage: 0,
                standing: 1750,
                seated: 3250,
                boxes: 0
            },
            OST: {
                capacity: 5000,
                stage: 0,
                standing: 1750,
                seated: 3250,
                boxes: 0
            },
            SUED: {
                capacity: 5000,
                stage: 0,
                standing: 1750,
                seated: 2250,
                boxes: 1000  // Logen fix hier
            },
            WEST: {
                capacity: 5000,
                stage: 0,
                standing: 1750,
                seated: 3250,
                boxes: 0
            }
        }
    },

    features: {
        roofs: {
            NORD: false,
            OST: false,
            SUED: false,
            WEST: false
        },
        floodlight: 0,  // 0 = Keine
        pitch: {
            condition: 100  // 100% = Perfekter Zustand (British Premium)
        },
        advertising: {
            NORD: false,
            OST: false,
            SUED: false,
            WEST: false
        },
        sponsors: {
            NORD: null,  // Sponsor-ID oder null
            OST: null,
            SUED: null,
            WEST: null
        }
    },

    construction: {
        queue: [],
        active: 0
    },

    // Vorsaison-Daten für Sponsor-Prognosen
    previousSeason: {
        season: '2023/24',
        leaguePosition: 9,
        totalGames: 34,
        totalGoals: 52,
        totalWins: 15,
        leagueTitle: false,
        cupTitle: false
    },

    // Spielkalender (Mock-Daten)
    currentDay: 12,
    currentMonth: 8,
    season: '2024/25'
};

/**
 * UI-Texte und Labels
 */
export const UI_TEXTS = {
    blocks: {
        NORD: 'Nordkurve',
        OST: 'Osttribüne',
        SUED: 'Südkurve',
        WEST: 'Westtribüne'
    },

    constructionStatus: {
        active: '🔨 Im Bau',
        queued: '⏳ In Warteschlange',
        completed: '✅ Abgeschlossen'
    }
};

/**
 * Utility: Berechnet Bauzeit in Tagen
 */
export const calculateBuildDays = (weeks) => {
    return weeks * TIMING_CONFIG.DAYS_PER_BUILD_WEEK;
};

/**
 * Utility: Formatiert Geldbeträge
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

/**
 * Utility: Formatiert Kapazitätszahlen
 */
export const formatCapacity = (number) => {
    return new Intl.NumberFormat('de-DE').format(number);
};

/**
 * Utility: Berechnet Kapazitäts-Verteilung (Steh/Sitz/Logen)
 */
export const calculateCapacityDistribution = (totalCapacity, hasBoxes) => {
    const boxRatio = hasBoxes ? CAPACITY_CONFIG.DISTRIBUTION.BOXES : 0;
    const standingRatio = CAPACITY_CONFIG.DISTRIBUTION.STANDING;
    const seatedRatio = CAPACITY_CONFIG.DISTRIBUTION.SEATED;

    const boxes = Math.round(totalCapacity * boxRatio);
    const remaining = totalCapacity - boxes;

    // Verhältnis zwischen Steh-/Sitzplätzen beibehalten
    const totalRatio = standingRatio + seatedRatio;
    const standing = Math.round(remaining * (standingRatio / totalRatio));
    const seated = remaining - standing;

    return { standing, seated, boxes };
};

/**
 * Utility: Berechnet Ausbau-Kosten
 */
export const calculateExpansionCost = (block, additionalSeats) => {
    const baseCost = additionalSeats * EXPANSION_CONFIG.costPerSeat;
    const multiplier = EXPANSION_CONFIG.blockMultipliers[block];
    return Math.round(baseCost * multiplier);
};

/**
 * Utility: Berechnet Bauzeit für Ausbau
 */
export const calculateExpansionBuildWeeks = (additionalSeats) => {
    const weeks = Math.ceil(additionalSeats / 1000) * EXPANSION_CONFIG.buildWeeksPerThousand;
    return Math.max(weeks, EXPANSION_CONFIG.minBuildWeeks);
};