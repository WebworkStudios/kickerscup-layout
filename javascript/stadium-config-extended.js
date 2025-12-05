// =====================================================
// KICKERSCUP - STADIUM CONFIGURATION (EXTENDED)
// Zentrale Konfiguration für Stadion-Features + Sponsoren + Tribünen-Ausbau
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

    // Logen können nur in OST oder WEST platziert werden
    ALLOWED_BOX_BLOCKS: ['OST', 'WEST'],

    // Block-Namen (entsprechend dem Layout)
    BLOCKS: ['NORD', 'OST', 'SUED', 'WEST']
};

/**
 * Tribünen-Ausbau-System
 * Schrittweiser Ausbau von 20k bis 150k Plätzen
 */
export const EXPANSION_CONFIG = {
    // Ausbaustufen pro Block (4 Blöcke × 7 Stufen = 28 Ausbauschritte gesamt)
    stages: [
        {
            id: 0,
            capacity: 5000,      // Start: 5.000 pro Block = 20.000 gesamt
            name: 'Basis',
            cost: 0,
            buildWeeks: 0,
            description: 'Ursprüngliche Tribüne'
        },
        {
            id: 1,
            capacity: 10000,     // +5.000 = 10.000 pro Block = 40.000 gesamt
            name: 'Stufe 1',
            cost: 800000,
            buildWeeks: 4,
            description: 'Erste Erweiterung'
        },
        {
            id: 2,
            capacity: 15000,     // +5.000 = 15.000 pro Block = 60.000 gesamt
            name: 'Stufe 2',
            cost: 1200000,
            buildWeeks: 5,
            description: 'Mittlere Erweiterung'
        },
        {
            id: 3,
            capacity: 20000,     // +5.000 = 20.000 pro Block = 80.000 gesamt
            name: 'Stufe 3',
            cost: 1800000,
            buildWeeks: 6,
            description: 'Große Erweiterung'
        },
        {
            id: 4,
            capacity: 27500,     // +7.500 = 27.500 pro Block = 110.000 gesamt
            name: 'Stufe 4',
            cost: 2500000,
            buildWeeks: 7,
            description: 'Premium-Erweiterung'
        },
        {
            id: 5,
            capacity: 32500,     // +5.000 = 32.500 pro Block = 130.000 gesamt
            name: 'Stufe 5',
            cost: 3200000,
            buildWeeks: 8,
            description: 'Elite-Erweiterung'
        },
        {
            id: 6,
            capacity: 37500,     // +5.000 = 37.500 pro Block = 150.000 gesamt (MAX)
            name: 'Maximum',
            cost: 4000000,
            buildWeeks: 10,
            description: 'Maximaler Ausbau'
        }
    ],

    // Block-spezifische Besonderheiten
    blockMultipliers: {
        NORD: 1.0,      // Standard-Kurve
        OST: 1.15,      // Haupttribüne (teurer wegen Infrastruktur)
        SUED: 1.0,      // Standard-Kurve
        WEST: 1.1       // Gegengerade (leicht teurer)
    },

    // Ausbau nur während Saisonpause (Tag 28-31)
    buildSeasonRestriction: {
        allowedDays: [28, 29, 30, 31],
        warningMessage: 'Tribünen-Ausbau ist nur während der Saisonpause (Tag 28-31) möglich!'
    }
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

// Extrahiere Konstante für Wiederverwendung
const DAYS_PER_WEEK = TIMING_CONFIG.DAYS_PER_BUILD_WEEK;

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
 * Feature: Rasen (3 Zustände, Stadium-Wide)
 */
export const PITCH_CONFIG = {
    type: 'stadium-wide',

    states: [
        {
            id: 0,
            name: 'Premium Rasen',
            description: 'British Premium (perfekte Qualität)',
            texture: 'british',
            degradationMultiplier: 0.5,  // Halbe Abnutzung
            maintenanceCost: 50000,      // Pro Monat
            renovationTime: 2,           // 2 SW = 14 Tage
            renovationCost: 150000,
            color: '#2d5016'  // Sattes Grün
        },
        {
            id: 1,
            name: 'Standard Rasen',
            description: 'Normal (gute Qualität)',
            texture: 'normal',
            degradationMultiplier: 1.0,  // Normale Abnutzung
            maintenanceCost: 30000,
            renovationTime: 1,           // 1 SW = 7 Tage
            renovationCost: 80000,
            color: '#3d6b1f'  // Mittelgrün
        },
        {
            id: 2,
            name: 'Kuhkoppel',
            description: 'Acker (schlechte Qualität)',
            texture: 'dirt',
            degradationMultiplier: 2.0,  // Doppelte Abnutzung
            maintenanceCost: 10000,
            renovationTime: 1,           // 1 SW = 7 Tage
            renovationCost: 50000,
            color: '#6b5628'  // Braun/Erde
        }
    ],

    // Rasen-Zustand (0-100%)
    MAX_CONDITION: 100,
    MIN_CONDITION: 0,

    // Abnutzung pro Spiel (Basiswert)
    BASE_WEAR_PER_MATCH: 10
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
 * Sponsor-Kategorien und verfügbare Firmen
 */
export const SPONSOR_CONFIG = {
    // Vertragslaufzeit
    contractDuration: 1,  // 1 Saison

    // Liga-Position beeinflusst Sponsor-Vergütung
    leaguePositionMultipliers: {
        1: 1.30,   // Platz 1-3: +30%
        2: 1.30,
        3: 1.30,
        4: 1.15,   // Platz 4-8: +15%
        5: 1.15,
        6: 1.15,
        7: 1.15,
        8: 1.15,
        9: 1.0,    // Platz 9-14: ±0%
        10: 1.0,
        11: 1.0,
        12: 1.0,
        13: 1.0,
        14: 1.0,
        15: 0.85,  // Platz 15+: -15%
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
                leagueTitle: 1000000,
                cupTitle: 500000
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
                initial: 600000,
                perGoal: 12000,
                perWin: 30000,
                leagueTitle: 1200000,
                cupTitle: 600000
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
                initial: 450000,
                perGoal: 18000,
                perWin: 22000,
                leagueTitle: 1500000,
                cupTitle: 750000
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
                leagueTitle: 600000,
                cupTitle: 300000
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
                leagueTitle: 700000,
                cupTitle: 350000
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
                initial: 320000,
                perGoal: 9000,
                perWin: 19000,
                leagueTitle: 650000,
                cupTitle: 325000
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
                leagueTitle: 300000,
                cupTitle: 150000
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
                perGoal: 4500,
                perWin: 11000,
                leagueTitle: 350000,
                cupTitle: 175000
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
                perGoal: 6000,
                perWin: 9000,
                leagueTitle: 250000,
                cupTitle: 125000
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
                initial: 140000,
                perGoal: 5500,
                perWin: 9500,
                leagueTitle: 280000,
                cupTitle: 140000
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
                perGoal: 2000,
                perWin: 4000,
                leagueTitle: 100000,
                cupTitle: 50000
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
                perGoal: 2500,
                perWin: 4500,
                leagueTitle: 120000,
                cupTitle: 60000
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
                initial: 45000,
                perGoal: 1800,
                perWin: 3800,
                leagueTitle: 90000,
                cupTitle: 45000
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
                initial: 55000,
                perGoal: 2200,
                perWin: 4200,
                leagueTitle: 110000,
                cupTitle: 55000
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
                initial: 65000,
                perGoal: 2300,
                perWin: 4300,
                leagueTitle: 130000,
                cupTitle: 65000
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
            total: 0,  // Keine Logen am Anfang
            placement: null  // Wird bei erstem Logenbau festgelegt
        },
        standing: 10000,  // 50% Stehplätze zu Beginn
        seated: 10000,    // 50% Sitzplätze zu Beginn
        distribution: {
            NORD: {
                stage: 0,       // Ausbaustufe
                capacity: 5000,
                standing: 2500,
                seated: 2500,
                boxes: 0
            },
            OST: {
                stage: 0,
                capacity: 5000,
                standing: 2500,
                seated: 2500,
                boxes: 0
            },
            SUED: {
                stage: 0,
                capacity: 5000,
                standing: 2500,
                seated: 2500,
                boxes: 0
            },
            WEST: {
                stage: 0,
                capacity: 5000,
                standing: 2500,
                seated: 2500,
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
            quality: 1,  // 1 = Normal
            condition: 100  // 100% = Perfekter Zustand
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

    // Vorsaison-Daten (für Sponsor-Berechnungen)
    previousSeason: {
        season: '2023/24',
        leaguePosition: 9,
        totalGames: 34,
        totalGoals: 45,
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
    },

    pitchQuality: {
        0: 'British Rasen',
        1: 'Normal',
        2: 'Kuhkoppel'
    }
};

/**
 * Utility: Berechnet Bauzeit in Tagen
 */
export const calculateBuildDays = (weeks) => {
    return weeks * DAYS_PER_WEEK;
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
 * Utility: Berechnet Kapazitäts-Verteilung für eine Ausbaustufe
 */
export const calculateCapacityDistribution = (totalCapacity, hasBoxes = false) => {
    const dist = CAPACITY_CONFIG.DISTRIBUTION;

    if (hasBoxes) {
        const boxes = Math.round(totalCapacity * dist.BOXES);
        const standing = Math.round((totalCapacity - boxes) * (dist.STANDING / (dist.STANDING + dist.SEATED)));
        const seated = totalCapacity - boxes - standing;
        return { boxes, standing, seated };
    }

    const standing = Math.round(totalCapacity * (dist.STANDING / (dist.STANDING + dist.SEATED)));
    const seated = totalCapacity - standing;
    return { boxes: 0, standing, seated };
};

/**
 * Utility: Gibt nächste verfügbare Ausbaustufe für einen Block zurück
 */
export const getNextExpansionStage = (currentStage) => {
    if (currentStage >= EXPANSION_CONFIG.stages.length - 1) {
        return null; // Max erreicht
    }

    return EXPANSION_CONFIG.stages[currentStage + 1];
};

/**
 * Utility: Berechnet Gesamtkosten für Tribünen-Ausbau
 */
export const calculateExpansionCost = (block, stageConfig) => {
    const multiplier = EXPANSION_CONFIG.blockMultipliers[block] || 1.0;
    return Math.round(stageConfig.cost * multiplier);
};