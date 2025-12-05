// =====================================================
// KICKERSCUP - STADIUM CONFIGURATION (EXTENDED)
// Zentrale Konfiguration für Stadion-Features + SPONSOREN
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
 * Feature: Werbung (4 Banden - 1 Banner pro Tribüne)
 */
export const ADVERTISING_CONFIG = {
    type: 'block-specific',

    // Installation
    buildWeeks: 1,  // 1 SW = 7 Tage
    cost: 50000,

    // Wartungskosten pro Bande/Monat
    maintenanceCost: 1000
};

/**
 * Sponsor-Kategorien und verfügbare Firmen
 */
export const SPONSOR_CONFIG = {
    // Kategorien mit verschiedenen Zahlungsbereitschaft
    tiers: {
        international: {
            name: 'International',
            color: '#FFD700',
            icon: '🌍',
            minCapacity: 80000,  // Erst ab 80k Stadion-Kapazität
            description: 'Weltweite Premium-Marken'
        },
        national: {
            name: 'National',
            color: '#00c78b',
            icon: '🏴',
            minCapacity: 40000,
            description: 'Führende nationale Unternehmen'
        },
        regional: {
            name: 'Regional',
            color: '#4a90e2',
            icon: '🏙️',
            minCapacity: 20000,
            description: 'Regionale Marktführer'
        },
        local: {
            name: 'Lokal',
            color: '#888888',
            icon: '🏘️',
            minCapacity: 0,
            description: 'Lokale Betriebe'
        }
    },

    // Liga-Position Multiplikatoren (aus Vorsaison)
    leaguePositionMultipliers: {
        1: 1.30,   // Meister: +30%
        2: 1.30,   // Vizemeister: +30%
        3: 1.30,   // Platz 3: +30%
        4: 1.15,   // Platz 4-8: +15%
        5: 1.15,
        6: 1.15,
        7: 1.15,
        8: 1.15,
        9: 1.00,   // Platz 9-14: Standard
        10: 1.00,
        11: 1.00,
        12: 1.00,
        13: 1.00,
        14: 1.00,
        15: 0.85,  // Platz 15-18: -15%
        16: 0.85,
        17: 0.85,
        18: 0.85
    },

    // Verfügbare Sponsoren mit realistischen Namen und Branchen
    availableSponsors: [
        // ========== INTERNATIONAL (ab 80k Kapazität) ==========
        {
            id: 1,
            name: 'TechGiant Global',
            shortName: 'TECHGIANT',
            tier: 'international',
            industry: 'Technologie',
            slogan: 'Innovation für alle',
            website: 'www.techgiant-global.com',
            color: '#0066cc',
            // Basis-Vergütung (wird mit Liga-Position multipliziert)
            basePayment: {
                initial: 250000,        // Einmalzahlung
                perGoal: 8000,          // Pro Tor (alle Spiele)
                perWin: 15000,          // Pro Sieg (alle Spiele)
                leagueTitle: 1000000,   // Liga-Meisterschaft
                cupTitle: 750000        // Pokalsieg
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
                initial: 200000,
                perGoal: 6000,
                perWin: 20000,
                leagueTitle: 800000,
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
                initial: 300000,
                perGoal: 10000,
                perWin: 12000,
                leagueTitle: 1200000,
                cupTitle: 800000
            }
        },

        // ========== NATIONAL (ab 40k Kapazität) ==========
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
                initial: 150000,
                perGoal: 5000,
                perWin: 50000,          // Hoch! Fokus auf Siege
                leagueTitle: 500000,
                cupTitle: 400000
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
                initial: 180000,
                perGoal: 7000,
                perWin: 25000,
                leagueTitle: 600000,
                cupTitle: 450000
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
                initial: 200000,
                perGoal: 4000,
                perWin: 30000,
                leagueTitle: 700000,
                cupTitle: 500000
            }
        },
        {
            id: 7,
            name: 'BierBrauerei König',
            shortName: 'BIER KÖNIG',
            tier: 'national',
            industry: 'Getränke',
            slogan: 'Das Bier der Champions',
            website: 'www.bier-koenig.de',
            color: '#f39c12',
            basePayment: {
                initial: 120000,
                perGoal: 8000,          // Hoch! Tore = Feiern = Bier
                perWin: 20000,
                leagueTitle: 400000,
                cupTitle: 300000
            }
        },

        // ========== REGIONAL (ab 20k Kapazität) ==========
        {
            id: 8,
            name: 'Stadtwerke Regional',
            shortName: 'STADTWERKE',
            tier: 'regional',
            industry: 'Energie',
            slogan: 'Energie für unsere Region',
            website: 'www.stadtwerke-regional.de',
            color: '#009933',
            basePayment: {
                initial: 80000,
                perGoal: 3000,
                perWin: 10000,
                leagueTitle: 200000,
                cupTitle: 150000
            }
        },
        {
            id: 9,
            name: 'Sparkasse Zentral',
            shortName: 'SPARKASSE',
            tier: 'regional',
            industry: 'Finanzen',
            slogan: 'Wenn\'s um Geld geht',
            website: 'www.sparkasse-zentral.de',
            color: '#ff0000',
            basePayment: {
                initial: 100000,
                perGoal: 2500,
                perWin: 15000,
                leagueTitle: 250000,
                cupTitle: 180000
            }
        },
        {
            id: 10,
            name: 'Radio Regional 98.5',
            shortName: 'RADIO 98.5',
            tier: 'regional',
            industry: 'Medien',
            slogan: 'Dein Soundtrack',
            website: 'www.radio-regional.de',
            color: '#ffcc00',
            basePayment: {
                initial: 60000,
                perGoal: 4000,
                perWin: 8000,
                leagueTitle: 150000,
                cupTitle: 100000
            }
        },
        {
            id: 11,
            name: 'Fitness-Studio Premium',
            shortName: 'FITNESS+',
            tier: 'regional',
            industry: 'Fitness',
            slogan: 'Dein Weg zur Topform',
            website: 'www.fitness-premium.de',
            color: '#cc3300',
            basePayment: {
                initial: 50000,
                perGoal: 3500,
                perWin: 12000,
                leagueTitle: 180000,
                cupTitle: 120000
            }
        },
        {
            id: 12,
            name: 'Möbelhaus Comfort',
            shortName: 'COMFORT',
            tier: 'regional',
            industry: 'Möbel',
            slogan: 'Wohnträume werden wahr',
            website: 'www.comfort-moebel.de',
            color: '#8b4513',
            basePayment: {
                initial: 70000,
                perGoal: 2000,
                perWin: 9000,
                leagueTitle: 160000,
                cupTitle: 110000
            }
        },

        // ========== LOKAL (ab 0 Kapazität) ==========
        {
            id: 13,
            name: 'Bäckerei Schmidt',
            shortName: 'BÄCKEREI SCHMIDT',
            tier: 'local',
            industry: 'Lebensmittel',
            slogan: 'Frisch gebacken seit 1985',
            website: 'Tel. 12345',
            color: '#d2691e',
            basePayment: {
                initial: 20000,
                perGoal: 1000,
                perWin: 3000,
                leagueTitle: 50000,
                cupTitle: 30000
            }
        },
        {
            id: 14,
            name: 'Autowerkstatt Meyer',
            shortName: 'KFZ MEYER',
            tier: 'local',
            industry: 'Handwerk',
            slogan: 'Meisterbetrieb • Alle Marken',
            website: 'www.meyer-kfz.de',
            color: '#333333',
            basePayment: {
                initial: 25000,
                perGoal: 800,
                perWin: 4000,
                leagueTitle: 60000,
                cupTitle: 40000
            }
        },
        {
            id: 15,
            name: 'Friseur Styling',
            shortName: 'HAIR & STYLE',
            tier: 'local',
            industry: 'Dienstleistung',
            slogan: 'Ihr Friseur des Vertrauens',
            website: 'Tel. 67890',
            color: '#ff1493',
            basePayment: {
                initial: 15000,
                perGoal: 500,
                perWin: 2000,
                leagueTitle: 40000,
                cupTitle: 25000
            }
        },
        {
            id: 16,
            name: 'Metzgerei Wagner',
            shortName: 'METZGEREI WAGNER',
            tier: 'local',
            industry: 'Lebensmittel',
            slogan: 'Qualität aus eigener Schlachtung',
            website: 'Marktplatz 5',
            color: '#8b0000',
            basePayment: {
                initial: 18000,
                perGoal: 600,
                perWin: 2500,
                leagueTitle: 45000,
                cupTitle: 28000
            }
        },
        {
            id: 17,
            name: 'Apotheke Zentrum',
            shortName: 'APOTHEKE',
            tier: 'local',
            industry: 'Gesundheit',
            slogan: 'Ihre Gesundheit ist uns wichtig',
            website: 'www.apotheke-zentrum.de',
            color: '#dc143c',
            basePayment: {
                initial: 22000,
                perGoal: 700,
                perWin: 3500,
                leagueTitle: 55000,
                cupTitle: 35000
            }
        },
        {
            id: 18,
            name: 'Blumenladen Flora',
            shortName: 'FLORA',
            tier: 'local',
            industry: 'Einzelhandel',
            slogan: 'Blumen für jeden Anlass',
            website: 'Tel. 11223',
            color: '#ff69b4',
            basePayment: {
                initial: 12000,
                perGoal: 400,
                perWin: 1500,
                leagueTitle: 35000,
                cupTitle: 20000
            }
        }
    ],

    // Vertragslaufzeit
    contractDuration: 1  // Saisons
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
                standing: 2500,
                seated: 2500,
                boxes: 0
            },
            OST: {
                standing: 2500,
                seated: 2500,
                boxes: 0
            },
            SUED: {
                standing: 2500,
                seated: 2500,
                boxes: 0
            },
            WEST: {
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

    // Spielkalender (Mock-Daten)
    currentDay: 12,
    currentMonth: 8,
    season: '2024/25',

    // Vorsaison-Daten für Sponsor-Prognose
    previousSeason: {
        leaguePosition: 5,      // Platz 5 letzte Saison
        totalGames: 34,         // Gesamt-Spiele
        totalGoals: 68,         // Gesamt-Tore
        totalWins: 18,          // Gesamt-Siege
        leagueTitle: false,     // Keine Meisterschaft
        cupTitle: false         // Kein Pokalsieg
    }
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
