// =====================================================
// KICKERSCUP - TEAM MANAGEMENT SYSTEM (ESM) - ES2025 MODERNIZED
// Kaderverwaltung & Spieler-Management
// ✅ AbortController für automatisches Event Cleanup
// ✅ Error Causes für strukturiertes Error Handling
// ✅ Optional Chaining & Nullish Coalescing
// ✅ Object.freeze() für Immutable Data
// ✅ Strukturiertes Logging
// ✅ Performance-Optimierungen mit Map
// =====================================================

// =====================================================
// CONFIGURATION
// ✅ ES2025: Frozen Configuration
// =====================================================

const TEAM_CONFIG = Object.freeze({
    MIN_SQUAD_SIZE: 16,
    MAX_SQUAD_SIZE: 25,
    POSITIONS: Object.freeze(['TW', 'LV', 'IV', 'RV', 'LI', 'DM', 'OM', 'LM', 'RM', 'ST', 'LS', 'RS']),
    POSITION_GROUPS: Object.freeze({
        GK: ['TW'],
        DEF: ['LV', 'IV', 'RV', 'LI'],
        MID: ['DM', 'OM', 'LM', 'RM'],
        ATT: ['ST', 'LS', 'RS']
    }),
    STATUS_TYPES: Object.freeze({
        OK: 'OK',
        INJURED: 'verletzt',
        SUSPENDED: 'gesperrt'
    }),
    SORT_OPTIONS: Object.freeze(['lineup', 'position', 'performance', 'name']),
    MAX_MOTIVATION: 12,
    MAX_FORM: 30
});

// =====================================================
// STRUCTURED LOGGING
// ✅ ES2025: Konsistentes Logging mit Context
// =====================================================

const log = {
    info: (context, message, data = {}) => {
        console.log(`[Team:${context}]`, message, Object.keys(data).length > 0 ? data : '');
    },
    error: (context, error) => {
        console.error(`[Team:${context}]`, error.message, error);
    },
    debug: (context, message, data = {}) => {
        // Debug logging can be enabled by setting window.DEBUG_TEAM = true in console
        if (typeof window !== 'undefined' && window.DEBUG_TEAM) {
            console.log(`[Team:${context}:DEBUG]`, message, data);
        }
    }
};

// =====================================================
// PRIVATE STATE
// =====================================================

let players = [];
let currentSort = 'lineup';

// ✅ ES2025: Player Map für O(1) Lookups
let playerMap = new Map();

// ✅ ES2025: AbortController für automatisches Event Cleanup
let teamAbortController = new AbortController();

// ✅ HYBRID: Behalte altes Array-Tracking für nicht-delegierte Events
const eventListeners = [];

// =====================================================
// MOCK DATA
// ✅ ES2025: Deep Frozen für Immutability
// =====================================================

const mockPlayers = Object.freeze([
    Object.freeze({
        id: 1, firstName: 'Max', lastName: 'Müller', position: 'TW', age: 28,
        strength: 8, stamina: 90, form: 25, freshness: 95, motivation: 10,
        contractYears: 3, gamesPlayed: 145, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 0,
            assists: 1,
            yellowCards: 2,
            yellowRedCards: 0,
            redCards: 0,
            games: 12,
            minutes: 1080
        }),
        careerStats: Object.freeze({
            goals: 0,
            assists: 8,
            yellowCards: 23,
            yellowRedCards: 1,
            redCards: 0,
            games: 145,
            minutes: 13050
        })
    }),
    Object.freeze({
        id: 2, firstName: 'Tom', lastName: 'Schmidt', position: 'LV', age: 25,
        strength: 7, stamina: 85, form: 22, freshness: 90, motivation: 9,
        contractYears: 2, gamesPlayed: 98, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 1,
            assists: 3,
            yellowCards: 3,
            yellowRedCards: 0,
            redCards: 0,
            games: 11,
            minutes: 945
        }),
        careerStats: Object.freeze({
            goals: 4,
            assists: 18,
            yellowCards: 32,
            yellowRedCards: 2,
            redCards: 1,
            games: 98,
            minutes: 8234
        })
    }),
    Object.freeze({
        id: 3, firstName: 'Leon', lastName: 'Wagner', position: 'IV', age: 29,
        strength: 9, stamina: 82, form: 27, freshness: 88, motivation: 10,
        contractYears: 4, gamesPlayed: 187, status: 'OK', isStarter: true, isCaptain: true,
        seasonStats: Object.freeze({
            goals: 2,
            assists: 0,
            yellowCards: 4,
            yellowRedCards: 1,
            redCards: 0,
            games: 12,
            minutes: 1080
        }),
        careerStats: Object.freeze({
            goals: 12,
            assists: 5,
            yellowCards: 54,
            yellowRedCards: 3,
            redCards: 2,
            games: 187,
            minutes: 16245
        })
    }),
    Object.freeze({
        id: 4, firstName: 'Felix', lastName: 'Fischer', position: 'IV', age: 27,
        strength: 8, stamina: 84, form: 24, freshness: 92, motivation: 9,
        contractYears: 3, gamesPlayed: 142, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 1,
            assists: 1,
            yellowCards: 2,
            yellowRedCards: 0,
            redCards: 0,
            games: 12,
            minutes: 1080
        }),
        careerStats: Object.freeze({
            goals: 8,
            assists: 7,
            yellowCards: 41,
            yellowRedCards: 1,
            redCards: 1,
            games: 142,
            minutes: 12456
        })
    }),
    Object.freeze({
        id: 5, firstName: 'Lukas', lastName: 'Becker', position: 'RV', age: 24,
        strength: 7, stamina: 88, form: 21, freshness: 93, motivation: 9,
        contractYears: 2, gamesPlayed: 76, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 0,
            assists: 4,
            yellowCards: 1,
            yellowRedCards: 0,
            redCards: 0,
            games: 12,
            minutes: 1080
        }),
        careerStats: Object.freeze({
            goals: 2,
            assists: 14,
            yellowCards: 18,
            yellowRedCards: 0,
            redCards: 0,
            games: 76,
            minutes: 6345
        })
    }),
    Object.freeze({
        id: 6, firstName: 'Jonas', lastName: 'Hoffmann', position: 'DM', age: 26,
        strength: 8, stamina: 86, form: 23, freshness: 89, motivation: 9,
        contractYears: 3, gamesPlayed: 112, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 1,
            assists: 2,
            yellowCards: 5,
            yellowRedCards: 0,
            redCards: 0,
            games: 12,
            minutes: 1080
        }),
        careerStats: Object.freeze({
            goals: 6,
            assists: 15,
            yellowCards: 38,
            yellowRedCards: 2,
            redCards: 0,
            games: 112,
            minutes: 9567
        })
    }),
    Object.freeze({
        id: 7, firstName: 'Tim', lastName: 'Weber', position: 'DM', age: 28,
        strength: 8, stamina: 84, form: 24, freshness: 87, motivation: 10,
        contractYears: 4, gamesPlayed: 156, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 2,
            assists: 3,
            yellowCards: 3,
            yellowRedCards: 0,
            redCards: 0,
            games: 12,
            minutes: 1080
        }),
        careerStats: Object.freeze({
            goals: 11,
            assists: 22,
            yellowCards: 45,
            yellowRedCards: 1,
            redCards: 1,
            games: 156,
            minutes: 13234
        })
    }),
    Object.freeze({
        id: 8, firstName: 'Paul', lastName: 'Schneider', position: 'LM', age: 23,
        strength: 7, stamina: 89, form: 20, freshness: 94, motivation: 8,
        contractYears: 2, gamesPlayed: 54, status: 'verletzt', isStarter: true, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 3,
            assists: 5,
            yellowCards: 1,
            yellowRedCards: 0,
            redCards: 0,
            games: 9,
            minutes: 687
        }),
        careerStats: Object.freeze({
            goals: 14,
            assists: 18,
            yellowCards: 12,
            yellowRedCards: 0,
            redCards: 0,
            games: 54,
            minutes: 4234
        })
    }),
    Object.freeze({
        id: 9, firstName: 'David', lastName: 'Richter', position: 'OM', age: 27,
        strength: 9, stamina: 83, form: 26, freshness: 88, motivation: 10,
        contractYears: 3, gamesPlayed: 134, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 5,
            assists: 8,
            yellowCards: 2,
            yellowRedCards: 0,
            redCards: 0,
            games: 12,
            minutes: 1080
        }),
        careerStats: Object.freeze({
            goals: 34,
            assists: 45,
            yellowCards: 28,
            yellowRedCards: 1,
            redCards: 0,
            games: 134,
            minutes: 11456
        })
    }),
    Object.freeze({
        id: 10, firstName: 'Marco', lastName: 'Klein', position: 'RM', age: 25,
        strength: 7, stamina: 87, form: 22, freshness: 91, motivation: 9,
        contractYears: 2, gamesPlayed: 89, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 2,
            assists: 6,
            yellowCards: 2,
            yellowRedCards: 0,
            redCards: 0,
            games: 12,
            minutes: 1080
        }),
        careerStats: Object.freeze({
            goals: 18,
            assists: 23,
            yellowCards: 19,
            yellowRedCards: 0,
            redCards: 0,
            games: 89,
            minutes: 7234
        })
    }),
    Object.freeze({
        id: 11, firstName: 'Kevin', lastName: 'Krause', position: 'ST', age: 29,
        strength: 9, stamina: 81, form: 28, freshness: 86, motivation: 11,
        contractYears: 4, gamesPlayed: 189, status: 'OK', isStarter: true, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 9,
            assists: 4,
            yellowCards: 3,
            yellowRedCards: 0,
            redCards: 0,
            games: 12,
            minutes: 1080
        }),
        careerStats: Object.freeze({
            goals: 87,
            assists: 28,
            yellowCards: 34,
            yellowRedCards: 2,
            redCards: 1,
            games: 189,
            minutes: 15678
        })
    }),
    Object.freeze({
        id: 12, firstName: 'Jan', lastName: 'Meyer', position: 'TW', age: 22,
        strength: 6, stamina: 88, form: 18, freshness: 96, motivation: 8,
        contractYears: 1, gamesPlayed: 23, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 0,
            assists: 0,
            yellowCards: 0,
            yellowRedCards: 0,
            redCards: 0,
            games: 0,
            minutes: 0
        }),
        careerStats: Object.freeze({
            goals: 0,
            assists: 2,
            yellowCards: 3,
            yellowRedCards: 0,
            redCards: 0,
            games: 23,
            minutes: 2070
        })
    }),
    Object.freeze({
        id: 13, firstName: 'Niklas', lastName: 'Koch', position: 'IV', age: 24,
        strength: 7, stamina: 85, form: 19, freshness: 92, motivation: 8,
        contractYears: 2, gamesPlayed: 67, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 0,
            assists: 0,
            yellowCards: 1,
            yellowRedCards: 0,
            redCards: 0,
            games: 3,
            minutes: 124
        }),
        careerStats: Object.freeze({
            goals: 3,
            assists: 2,
            yellowCards: 15,
            yellowRedCards: 1,
            redCards: 0,
            games: 67,
            minutes: 5234
        })
    }),
    Object.freeze({
        id: 14, firstName: 'Ben', lastName: 'Wolf', position: 'DM', age: 21,
        strength: 6, stamina: 90, form: 17, freshness: 97, motivation: 7,
        contractYears: 1, gamesPlayed: 12, status: 'gesperrt', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 0,
            assists: 1,
            yellowCards: 2,
            yellowRedCards: 1,
            redCards: 0,
            games: 5,
            minutes: 234
        }),
        careerStats: Object.freeze({
            goals: 1,
            assists: 2,
            yellowCards: 4,
            yellowRedCards: 1,
            redCards: 0,
            games: 12,
            minutes: 876
        })
    }),
    Object.freeze({
        id: 15, firstName: 'Erik', lastName: 'Braun', position: 'OM', age: 23,
        strength: 7, stamina: 86, form: 19, freshness: 93, motivation: 8,
        contractYears: 2, gamesPlayed: 45, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 1,
            assists: 2,
            yellowCards: 1,
            yellowRedCards: 0,
            redCards: 0,
            games: 6,
            minutes: 345
        }),
        careerStats: Object.freeze({
            goals: 8,
            assists: 12,
            yellowCards: 9,
            yellowRedCards: 0,
            redCards: 0,
            games: 45,
            minutes: 3234
        })
    }),
    Object.freeze({
        id: 16, firstName: 'Noah', lastName: 'Lang', position: 'ST', age: 22,
        strength: 7, stamina: 88, form: 20, freshness: 94, motivation: 9,
        contractYears: 1, gamesPlayed: 38, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 3,
            assists: 1,
            yellowCards: 0,
            yellowRedCards: 0,
            redCards: 0,
            games: 8,
            minutes: 456
        }),
        careerStats: Object.freeze({
            goals: 12,
            assists: 5,
            yellowCards: 6,
            yellowRedCards: 0,
            redCards: 0,
            games: 38,
            minutes: 2567
        })
    }),
    Object.freeze({
        id: 17, firstName: 'Fabian', lastName: 'Schulz', position: 'LV', age: 20,
        strength: 6, stamina: 91, form: 16, freshness: 98, motivation: 7,
        contractYears: 1, gamesPlayed: 8, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 0,
            assists: 0,
            yellowCards: 0,
            yellowRedCards: 0,
            redCards: 0,
            games: 1,
            minutes: 45
        }),
        careerStats: Object.freeze({
            goals: 0,
            assists: 1,
            yellowCards: 1,
            yellowRedCards: 0,
            redCards: 0,
            games: 8,
            minutes: 456
        })
    }),
    Object.freeze({
        id: 18, firstName: 'Moritz', lastName: 'Zimmermann', position: 'RV', age: 27,
        strength: 7, stamina: 83, form: 21, freshness: 88, motivation: 9,
        contractYears: 3, gamesPlayed: 98, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 1,
            assists: 2,
            yellowCards: 2,
            yellowRedCards: 0,
            redCards: 0,
            games: 4,
            minutes: 278
        }),
        careerStats: Object.freeze({
            goals: 5,
            assists: 11,
            yellowCards: 24,
            yellowRedCards: 1,
            redCards: 0,
            games: 98,
            minutes: 7654
        })
    }),
    Object.freeze({
        id: 19, firstName: 'Simon', lastName: 'Vogel', position: 'LM', age: 21,
        strength: 6, stamina: 92, form: 17, freshness: 95, motivation: 8,
        contractYears: 1, gamesPlayed: 15, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 0,
            assists: 1,
            yellowCards: 0,
            yellowRedCards: 0,
            redCards: 0,
            games: 3,
            minutes: 123
        }),
        careerStats: Object.freeze({
            goals: 2,
            assists: 4,
            yellowCards: 2,
            yellowRedCards: 0,
            redCards: 0,
            games: 15,
            minutes: 987
        })
    }),
    Object.freeze({
        id: 20, firstName: 'Alexander', lastName: 'König', position: 'RM', age: 26,
        strength: 7, stamina: 85, form: 21, freshness: 90, motivation: 9,
        contractYears: 2, gamesPlayed: 72, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 1,
            assists: 3,
            yellowCards: 1,
            yellowRedCards: 0,
            redCards: 0,
            games: 5,
            minutes: 312
        }),
        careerStats: Object.freeze({
            goals: 9,
            assists: 15,
            yellowCards: 14,
            yellowRedCards: 0,
            redCards: 0,
            games: 72,
            minutes: 5678
        })
    }),
    Object.freeze({
        id: 21, firstName: 'Julian', lastName: 'Herrmann', position: 'ST', age: 24,
        strength: 8, stamina: 84, form: 22, freshness: 91, motivation: 9,
        contractYears: 2, gamesPlayed: 67, status: 'OK', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 2,
            assists: 1,
            yellowCards: 1,
            yellowRedCards: 0,
            redCards: 0,
            games: 7,
            minutes: 423
        }),
        careerStats: Object.freeze({
            goals: 23,
            assists: 8,
            yellowCards: 12,
            yellowRedCards: 0,
            redCards: 0,
            games: 67,
            minutes: 4987
        })
    }),
    Object.freeze({
        id: 22, firstName: 'Patrick', lastName: 'Lange', position: 'OM', age: 30,
        strength: 8, stamina: 78, form: 20, freshness: 83, motivation: 8,
        contractYears: 1, gamesPlayed: 156, status: 'gesperrt', isStarter: false, isCaptain: false,
        seasonStats: Object.freeze({
            goals: 1,
            assists: 4,
            yellowCards: 3,
            yellowRedCards: 1,
            redCards: 0,
            games: 10,
            minutes: 678
        }),
        careerStats: Object.freeze({
            goals: 28,
            assists: 52,
            yellowCards: 48,
            yellowRedCards: 3,
            redCards: 1,
            games: 156,
            minutes: 12345
        })
    })
]);

// =====================================================
// EVENT MANAGEMENT
// ✅ ES2025: Hybrid Approach (AbortController + Array Fallback)
// =====================================================

/**
 * Helper: Event Listener registrieren mit Cleanup-Tracking
 * ✅ HYBRID: Nutzt AbortController Signal wenn verfügbar
 */
const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;

    try {
        // ✅ ES2025: Füge signal hinzu wenn options ein Object ist
        if (typeof options === 'object' && !options.signal) {
            options.signal = teamAbortController.signal;
        } else if (options === false || options === true) {
            options = {capture: options, signal: teamAbortController.signal};
        }

        element.addEventListener(event, handler, options);
        eventListeners.push({element, event, handler, options});
    } catch (error) {
        const contextError = new Error('Failed to add event listener');
        contextError.cause = error;
        log.error('EventListener', contextError);
    }
};

// =====================================================
// PLAYER MAP MANAGEMENT
// ✅ ES2025: O(1) Lookups mit Map
// =====================================================

/**
 * Baut Player Map für schnelle Lookups
 */
const buildPlayerMap = () => {
    try {
        playerMap = new Map(players.map(p => [p.id, p]));
        log.debug('BuildPlayerMap', 'Player map built', {size: playerMap.size});
    } catch (error) {
        const contextError = new Error('Failed to build player map');
        contextError.cause = error;
        log.error('BuildPlayerMap', contextError);
        // Fallback: Continue without map
        playerMap = new Map();
    }
};

/**
 * Holt Spieler aus Map (O(1)) oder Array (Fallback)
 */
const getPlayerById = (playerId) => {
    return playerMap.get(playerId) ?? players.find(p => p.id === playerId);
};

// =====================================================
// PERFORMANCE CALCULATION
// Original PHP-Formel beibehalten
// =====================================================

/**
 * Berechnet den Einsatzwert (Performance) - ORIGINAL PHP FORMEL
 * ✅ ES2025: Keine Änderungen - bewährte Formel
 */
const calculatePerformance = (player) => {
    try {
        const Spielstaerke = player.strength;
        const Form = player.form;
        const Kondition = player.stamina;
        let Frische = player.freshness;
        const Motivation = player.motivation;
        const Alter = player.age;

        const Status = player.isStarter ? 1 : 0;
        const Aufstellungen = player.gamesPlayed > 0 ? 1 : 0;
        const WertPO = 1;

        if (Frische <= 0) {
            Frische = 0;
        } else {
            if (Frische <= 100) {
                Frische /= 120;
            } else {
                Frische = 1;
            }
        }

        let WAlter;
        if (Alter < 20) {
            WAlter = 0.9;
        } else if (Alter < 24) {
            WAlter = 1;
        } else if (Alter < 29) {
            WAlter = 1.1;
        } else if (Alter < 33) {
            WAlter = 1;
        } else {
            WAlter = 0.9;
        }

        let SpielerEinsatzWert = ((Spielstaerke - 1) + (Form / 3) + ((Kondition * 10) / 100))
            * WAlter
            * Frische
            * (((Motivation * 2) + 7) / 27)
            + ((Status + Aufstellungen + 1) / 20);

        if (Spielstaerke > 15) {
            SpielerEinsatzWert *= 1.25;
        } else if (Spielstaerke === 15) {
            SpielerEinsatzWert *= 1.20;
        } else if (Spielstaerke === 14) {
            SpielerEinsatzWert *= 1.14;
        } else if (Spielstaerke === 13) {
            SpielerEinsatzWert *= 1.10;
        } else if (Spielstaerke === 12) {
            SpielerEinsatzWert *= 1.06;
        } else if (Spielstaerke === 11) {
            SpielerEinsatzWert *= 1.04;
        } else if (Spielstaerke === 10) {
            SpielerEinsatzWert *= 1.02;
        } else if (Spielstaerke === 9) {
            SpielerEinsatzWert *= 1.25;
        } else if (Spielstaerke === 8) {
            SpielerEinsatzWert *= 0.90;
        } else if (Spielstaerke === 7) {
            SpielerEinsatzWert *= 0.80;
        } else if (Spielstaerke === 6) {
            SpielerEinsatzWert *= 0.75;
        } else if (Spielstaerke === 5) {
            SpielerEinsatzWert *= 0.70;
        } else if (Spielstaerke === 4) {
            SpielerEinsatzWert *= 0.65;
        } else if (Spielstaerke === 3) {
            SpielerEinsatzWert *= 0.6;
        }

        const EinsatzWert = SpielerEinsatzWert * WertPO;
        return parseFloat(EinsatzWert.toFixed(2));
    } catch (error) {
        const contextError = new Error('Failed to calculate performance');
        contextError.cause = error;
        log.error('CalculatePerformance', contextError);
        return 0;
    }
};

// =====================================================
// UTILITY FUNCTIONS
// ✅ ES2025: Optional Chaining & Nullish Coalescing
// =====================================================

/**
 * Formatiert Spielminuten (z.B. 1080 -> "1.080")
 * ✅ ES2025: Safe Number Formatting
 */
const formatMinutes = (minutes) => {
    try {
        return minutes?.toLocaleString('de-DE') ?? '0';
    } catch (error) {
        log.error('FormatMinutes', new Error('Format failed', {cause: error}));
        return String(minutes ?? 0);
    }
};

// =====================================================
// SORTING & FILTERING
// ✅ ES2025: Optimized Single-Pass Processing
// =====================================================

/**
 * Sortiert Spieler basierend auf currentSort
 * ✅ ES2025: Immutable Sort
 */
const getSortedPlayers = () => {
    try {
        const sorted = [...players];
        const posOrder = TEAM_CONFIG.POSITIONS;

        switch (currentSort) {
            case 'lineup':
                sorted.sort((a, b) => {
                    if (b.isStarter !== a.isStarter) return b.isStarter - a.isStarter;
                    return posOrder.indexOf(a.position) - posOrder.indexOf(b.position);
                });
                break;
            case 'position':
                sorted.sort((a, b) => posOrder.indexOf(a.position) - posOrder.indexOf(b.position));
                break;
            case 'performance':
                sorted.sort((a, b) => calculatePerformance(b) - calculatePerformance(a));
                break;
            case 'name':
                sorted.sort((a, b) => a.lastName.localeCompare(b.lastName));
                break;
            default:
                log.error('Sort', new Error(`Unknown sort type: ${currentSort}`));
        }

        return sorted;
    } catch (error) {
        const contextError = new Error('Failed to sort players');
        contextError.cause = error;
        log.error('GetSortedPlayers', contextError);
        return [...players]; // Return unsorted as fallback
    }
};

// =====================================================
// RENDERING FUNCTIONS
// ✅ ES2025: Optional Chaining für alle DOM-Zugriffe
// =====================================================

/**
 * Rendert Spieler-Grid
 * ✅ ES2025: DocumentFragment für Performance
 * ⚠️ UI: Ursprüngliche HTML-Struktur beibehalten
 */
const renderPlayers = () => {
    try {
        const grid = document.getElementById('playerGrid');
        if (!grid) {
            throw new Error('Player grid element not found');
        }

        const sortedPlayers = getSortedPlayers();
        const fragment = document.createDocumentFragment();

        sortedPlayers.forEach(player => {
            try {
                const performance = calculatePerformance(player);
                const statusClass = player.status === TEAM_CONFIG.STATUS_TYPES.OK ? 'status-ok' :
                    player.status === TEAM_CONFIG.STATUS_TYPES.INJURED ? 'status-injured' : 'status-suspended';
                const statusText = player.status === TEAM_CONFIG.STATUS_TYPES.OK ? 'Einsatzbereit' :
                    player.status === TEAM_CONFIG.STATUS_TYPES.INJURED ? 'Verletzt' : 'Gesperrt';

                const card = document.createElement('div');
                card.className = `player-card glass ${player.isCaptain ? 'captain' : ''}`;
                card.dataset.playerId = player.id;

                card.innerHTML = `
                    ${player.isCaptain ? '<div class="captain-badge">Ⓒ</div>' : ''}
                    <div class="player-header">
                        <div class="player-image">${player.firstName.charAt(0)}${player.lastName.charAt(0)}</div>
                        <div class="player-info">
                            <div class="player-name">${player.firstName} ${player.lastName}</div>
                            <div class="player-meta">
                                <span class="player-position">${player.position}</span>
                                <span>Alter: ${player.age}</span>
                            </div>
                        </div>
                    </div>

                    <div class="player-stats">
                        <div class="stat-item">
                            <span class="stat-item-label">Stärke</span>
                            <span class="stat-item-value">${player.strength}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-item-label">Kondition</span>
                            <span class="stat-item-value">${player.stamina}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-item-label">Form</span>
                            <span class="stat-item-value">${player.form}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-item-label">Frische</span>
                            <span class="stat-item-value">${player.freshness}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-item-label">Motivation</span>
                            <span class="stat-item-value">${player.motivation}</span>
                        </div>
                    </div>

                    <div class="player-performance">
                        Einsatzwert: ${performance}
                    </div>

                    <div class="player-contract">
                        Vertrag: ${player.contractYears} ${player.contractYears === 1 ? 'Jahr' : 'Jahre'}
                    </div>

                    <div class="player-status">
                        <span>${player.isStarter ? '⚽ Stamm' : '📋 Bank'} · ${player.gamesPlayed} Spiele</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                `;

                fragment.appendChild(card);
            } catch (error) {
                log.error('RenderPlayer', new Error(`Failed to render player ${player.id}`, {cause: error}));
            }
        });

        grid.innerHTML = '';
        grid.appendChild(fragment);

        log.debug('RenderPlayers', 'Players rendered', {count: sortedPlayers.length});
    } catch (error) {
        const contextError = new Error('Failed to render players');
        contextError.cause = error;
        log.error('RenderPlayers', contextError);
    }
};

/**
 * Aktualisiert Team-Statistiken
 * ✅ ES2025: Single-Pass mit reduce + Safe Element Access
 */
const updateTeamStats = () => {
    try {
        // ✅ ES2025: Single-Pass Categorization
        const stats = players.reduce((acc, player) => {
            const perf = calculatePerformance(player);
            const {GK, DEF, MID, ATT} = TEAM_CONFIG.POSITION_GROUPS;

            if (GK.includes(player.position)) acc.gk += perf;
            else if (DEF.includes(player.position)) acc.def += perf;
            else if (MID.includes(player.position)) acc.mid += perf;
            else if (ATT.includes(player.position)) acc.att += perf;

            acc.total += perf;
            return acc;
        }, {gk: 0, def: 0, mid: 0, att: 0, total: 0});

        // ✅ ES2025: Safe Element Updates (ESLint-compatible)
        const statGK = document.getElementById('statGK');
        const statDEF = document.getElementById('statDEF');
        const statMID = document.getElementById('statMID');
        const statATT = document.getElementById('statATT');
        const statTOTAL = document.getElementById('statTOTAL');

        if (statGK) statGK.textContent = stats.gk.toLocaleString();
        if (statDEF) statDEF.textContent = stats.def.toLocaleString();
        if (statMID) statMID.textContent = stats.mid.toLocaleString();
        if (statATT) statATT.textContent = stats.att.toLocaleString();
        if (statTOTAL) statTOTAL.textContent = stats.total.toLocaleString();

        log.debug('UpdateTeamStats', 'Stats updated', stats);
    } catch (error) {
        const contextError = new Error('Failed to update team stats');
        contextError.cause = error;
        log.error('UpdateTeamStats', contextError);
    }
};

// =====================================================
// PLAYER DETAIL MODAL
// ✅ ES2025: Comprehensive Error Handling
// =====================================================

/**
 * Zeigt Spieler-Details im Modal
 * ✅ ES2025: Safe DOM Updates (ESLint-compatible)
 */
const showPlayerDetail = (playerId) => {
    try {
        const player = getPlayerById(playerId);
        if (!player) {
            throw new Error(`Player not found: ${playerId}`);
        }

        const performance = calculatePerformance(player);

        // ✅ ES2025: Safe Element Updates - Header
        const modalPlayerName = document.getElementById('modalPlayerName');
        const modalPosition = document.getElementById('modalPosition');
        const modalAge = document.getElementById('modalAge');

        if (modalPlayerName) modalPlayerName.textContent = `${player.firstName} ${player.lastName}`;
        if (modalPosition) modalPosition.textContent = player.position;
        if (modalAge) modalAge.textContent = `${player.age} Jahre`;

        // Übersicht Tab
        const modalStrength = document.getElementById('modalStrength');
        const modalStamina = document.getElementById('modalStamina');
        const modalForm = document.getElementById('modalForm');
        const modalFreshness = document.getElementById('modalFreshness');
        const modalMotivation = document.getElementById('modalMotivation');
        const modalPerformance = document.getElementById('modalPerformance');
        const modalContract = document.getElementById('modalContract');
        const modalGames = document.getElementById('modalGames');
        const modalStatus = document.getElementById('modalStatus');

        if (modalStrength) modalStrength.textContent = String(player.strength);
        if (modalStamina) modalStamina.textContent = String(player.stamina);
        if (modalForm) modalForm.textContent = String(player.form);
        if (modalFreshness) modalFreshness.textContent = String(player.freshness);
        if (modalMotivation) modalMotivation.textContent = String(player.motivation);
        if (modalPerformance) modalPerformance.textContent = String(performance);
        if (modalContract) modalContract.textContent = `${player.contractYears} ${player.contractYears === 1 ? 'Jahr' : 'Jahre'}`;
        if (modalGames) modalGames.textContent = `${player.gamesPlayed} Spiele`;
        if (modalStatus) {
            modalStatus.textContent = player.status === TEAM_CONFIG.STATUS_TYPES.OK ? 'Einsatzbereit' :
                player.status === TEAM_CONFIG.STATUS_TYPES.INJURED ? 'Verletzt' : 'Gesperrt';
        }

        // Progress Bars - Labels
        const scaleStrength = player.strength * 10;
        const scaleStamina = player.stamina;
        const scaleForm = (player.form / TEAM_CONFIG.MAX_FORM) * 100;
        const scaleFreshness = player.freshness;
        const scaleMotivation = (player.motivation / TEAM_CONFIG.MAX_MOTIVATION) * 100;

        const progressStrengthLabel = document.getElementById('progressStrengthLabel');
        const progressStaminaLabel = document.getElementById('progressStaminaLabel');
        const progressFormLabel = document.getElementById('progressFormLabel');
        const progressFreshnessLabel = document.getElementById('progressFreshnessLabel');
        const progressMotivationLabel = document.getElementById('progressMotivationLabel');

        if (progressStrengthLabel) progressStrengthLabel.textContent = String(player.strength);
        if (progressStaminaLabel) progressStaminaLabel.textContent = String(player.stamina);
        if (progressFormLabel) progressFormLabel.textContent = String(player.form);
        if (progressFreshnessLabel) progressFreshnessLabel.textContent = String(player.freshness);
        if (progressMotivationLabel) progressMotivationLabel.textContent = String(player.motivation);

        // Progress Bars - Widths
        const progressStrength = document.getElementById('progressStrength');
        const progressStamina = document.getElementById('progressStamina');
        const progressForm = document.getElementById('progressForm');
        const progressFreshness = document.getElementById('progressFreshness');
        const progressMotivation = document.getElementById('progressMotivation');

        if (progressStrength) progressStrength.style.width = `${Math.min(100, scaleStrength)}%`;
        if (progressStamina) progressStamina.style.width = `${Math.min(100, scaleStamina)}%`;
        if (progressForm) progressForm.style.width = `${Math.min(100, scaleForm)}%`;
        if (progressFreshness) progressFreshness.style.width = `${Math.min(100, scaleFreshness)}%`;
        if (progressMotivation) progressMotivation.style.width = `${Math.min(100, scaleMotivation)}%`;

        // Statistiken Tab - Season
        const statSeasonGoals = document.getElementById('statSeasonGoals');
        const statSeasonAssists = document.getElementById('statSeasonAssists');
        const statSeasonYellow = document.getElementById('statSeasonYellow');
        const statSeasonYellowRed = document.getElementById('statSeasonYellowRed');
        const statSeasonRed = document.getElementById('statSeasonRed');
        const statSeasonGames = document.getElementById('statSeasonGames');
        const statSeasonMinutes = document.getElementById('statSeasonMinutes');

        if (statSeasonGoals) statSeasonGoals.textContent = String(player.seasonStats.goals);
        if (statSeasonAssists) statSeasonAssists.textContent = String(player.seasonStats.assists);
        if (statSeasonYellow) statSeasonYellow.textContent = String(player.seasonStats.yellowCards);
        if (statSeasonYellowRed) statSeasonYellowRed.textContent = String(player.seasonStats.yellowRedCards);
        if (statSeasonRed) statSeasonRed.textContent = String(player.seasonStats.redCards);
        if (statSeasonGames) statSeasonGames.textContent = String(player.seasonStats.games);
        if (statSeasonMinutes) statSeasonMinutes.textContent = formatMinutes(player.seasonStats.minutes);

        // Statistiken Tab - Career
        const statCareerGoals = document.getElementById('statCareerGoals');
        const statCareerAssists = document.getElementById('statCareerAssists');
        const statCareerYellow = document.getElementById('statCareerYellow');
        const statCareerYellowRed = document.getElementById('statCareerYellowRed');
        const statCareerRed = document.getElementById('statCareerRed');
        const statCareerGames = document.getElementById('statCareerGames');
        const statCareerMinutes = document.getElementById('statCareerMinutes');

        if (statCareerGoals) statCareerGoals.textContent = String(player.careerStats.goals);
        if (statCareerAssists) statCareerAssists.textContent = String(player.careerStats.assists);
        if (statCareerYellow) statCareerYellow.textContent = String(player.careerStats.yellowCards);
        if (statCareerYellowRed) statCareerYellowRed.textContent = String(player.careerStats.yellowRedCards);
        if (statCareerRed) statCareerRed.textContent = String(player.careerStats.redCards);
        if (statCareerGames) statCareerGames.textContent = String(player.careerStats.games);
        if (statCareerMinutes) statCareerMinutes.textContent = formatMinutes(player.careerStats.minutes);

        // Modal anzeigen
        const modal = document.getElementById('playerModal');
        if (modal) {
            modal.classList.add('active');
            switchTab('overview');
        } else {
            throw new Error('Player modal element not found');
        }

        log.debug('ShowPlayerDetail', 'Modal opened', {playerId, player: player.lastName});
    } catch (error) {
        const contextError = new Error('Failed to show player detail');
        contextError.cause = error;
        log.error('ShowPlayerDetail', contextError);
        // Optional: User-facing error message
        alert(`Fehler beim Laden der Spieler-Details: ${error.message}`);
    }
};

/**
 * Tab-Wechsel im Modal
 * ✅ ES2025: Safe DOM Manipulation
 */
const switchTab = (tabName) => {
    try {
        // Tab Buttons
        document.querySelectorAll('.modal-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Tab Content
        const capitalizedTabName = tabName.charAt(0).toUpperCase() + tabName.slice(1);
        document.querySelectorAll('.modal-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab${capitalizedTabName}`);
        });

        log.debug('SwitchTab', 'Tab switched', {tabName});
    } catch (error) {
        const contextError = new Error('Failed to switch tab');
        contextError.cause = error;
        log.error('SwitchTab', contextError);
    }
};

/**
 * Schließt Modal
 * ✅ ES2025: Safe Modal Closing
 */
const closeModal = () => {
    try {
        const modal = document.getElementById('playerModal');
        modal?.classList.remove('active');
        log.debug('CloseModal', 'Modal closed');
    } catch (error) {
        const contextError = new Error('Failed to close modal');
        contextError.cause = error;
        log.error('CloseModal', contextError);
    }
};

// =====================================================
// TEAM ACTIONS
// ✅ ES2025: Immutable Updates mit structuredClone
// =====================================================

/**
 * Sortiert Spieler
 * ✅ ES2025: Validated Sort Type
 */
const sortBy = (type) => {
    try {
        if (!TEAM_CONFIG.SORT_OPTIONS.includes(type)) {
            throw new Error(`Invalid sort type: ${type}`);
        }

        currentSort = type;

        document.querySelectorAll('.btn-sort').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === type);
        });

        renderPlayers();
        log.info('Sort', 'Players sorted', {sortType: type});
    } catch (error) {
        const contextError = new Error('Failed to sort players');
        contextError.cause = error;
        log.error('SortBy', contextError);
    }
};

/**
 * Verlängert alle Verträge
 * ✅ ES2025: Immutable Update Pattern
 */
const extendAllContracts = () => {
    try {
        if (!confirm('Möchten Sie wirklich alle Verträge um eine Saison verlängern?')) {
            return;
        }

        players = players.map(player => ({
            ...player,
            contractYears: player.contractYears + 1
        }));

        buildPlayerMap();
        renderPlayers();

        alert('✅ Alle Verträge wurden um eine Saison verlängert!');
        log.info('ExtendContracts', 'All contracts extended', {playerCount: players.length});
    } catch (error) {
        const contextError = new Error('Failed to extend contracts');
        contextError.cause = error;
        log.error('ExtendAllContracts', contextError);
        alert('❌ Fehler beim Verlängern der Verträge.');
    }
};

/**
 * Zahlt Teamprämie aus
 * ✅ ES2025: Safe Motivation Update
 */
const payTeamBonus = () => {
    try {
        if (!confirm('Möchten Sie eine Teamprämie auszahlen? Dies erhöht die Motivation aller Spieler.')) {
            return;
        }

        players = players.map(player => ({
            ...player,
            motivation: Math.min(TEAM_CONFIG.MAX_MOTIVATION, player.motivation + 2)
        }));

        buildPlayerMap();
        renderPlayers();
        updateTeamStats();

        alert('💰 Teamprämie ausgezahlt! Motivation aller Spieler wurde gesteigert.');
        log.info('PayBonus', 'Team bonus paid', {playerCount: players.length});
    } catch (error) {
        const contextError = new Error('Failed to pay team bonus');
        contextError.cause = error;
        log.error('PayTeamBonus', contextError);
        alert('❌ Fehler beim Auszahlen der Prämie.');
    }
};

/**
 * Zeigt Kapitän-Auswahl
 * ✅ ES2025: Safe Selection Logic
 */
const showCaptainSelection = () => {
    try {
        const starters = players.filter(p => p.isStarter);

        if (starters.length === 0) {
            alert('❌ Keine Stammspieler vorhanden!');
            return;
        }

        const captainList = starters
            .map((p, i) => `${i + 1}. ${p.firstName} ${p.lastName} (${p.position})`)
            .join('\n');

        const selection = prompt(`Wählen Sie den neuen Kapitän:\n\n${captainList}\n\nGeben Sie die Nummer ein:`);

        if (!selection) return;

        const index = parseInt(selection) - 1;

        if (index < 0 || index >= starters.length || isNaN(index)) {
            alert('❌ Ungültige Auswahl!');
            return;
        }

        players = players.map(p => ({
            ...p,
            isCaptain: p.id === starters[index].id
        }));

        buildPlayerMap();
        renderPlayers();

        alert(`⭐ ${starters[index].firstName} ${starters[index].lastName} ist jetzt der Kapitän!`);
        log.info('SelectCaptain', 'New captain selected', {
            playerId: starters[index].id,
            name: starters[index].lastName
        });
    } catch (error) {
        const contextError = new Error('Failed to select captain');
        contextError.cause = error;
        log.error('ShowCaptainSelection', contextError);
        alert('❌ Fehler bei der Kapitän-Auswahl.');
    }
};

/**
 * Verleiht Spieler (Placeholder)
 * ✅ ES2025: Future Feature Stub
 */
const lendPlayers = () => {
    alert('📤 Spielerverleihe-System wird demnächst verfügbar sein.');
    log.info('LendPlayers', 'Feature not yet implemented');
};

// =====================================================
// EVENT HANDLERS
// ✅ ES2025: Centralized Event Delegation
// =====================================================

/**
 * Event Delegation Handler für Document
 * ✅ ES2025: Error Isolation pro Action
 */
const handleDocumentClick = (e) => {
    try {
        const target = e.target.closest('[data-action], [data-tab]');
        if (!target) return;

        // Tab-Wechsel
        if (target.dataset.tab) {
            switchTab(target.dataset.tab);
            return;
        }

        // Actions
        const action = target.dataset.action;
        const value = target.dataset.value;

        const actions = {
            sort: () => sortBy(value),
            extendContracts: extendAllContracts,
            payBonus: payTeamBonus,
            selectCaptain: showCaptainSelection,
            lendPlayers: lendPlayers,
            closeModal: closeModal,
            extendPlayerContract: () => {
                alert('Vertragsverlängerung für einzelnen Spieler wird implementiert.');
                log.info('ExtendPlayerContract', 'Feature not yet implemented');
            }
        };

        const handler = actions[action];
        if (handler) {
            handler();
        } else {
            log.error('HandleClick', new Error(`Unknown action: ${action}`));
        }
    } catch (error) {
        const contextError = new Error('Failed to handle document click');
        contextError.cause = error;
        log.error('HandleDocumentClick', contextError);
    }
};

/**
 * Player Card Click Handler
 * ✅ ES2025: Safe ID Parsing
 */
const handlePlayerCardClick = (e) => {
    try {
        const card = e.target.closest('.player-card');
        if (!card) return;

        const playerId = parseInt(card.dataset.playerId, 10);
        if (isNaN(playerId)) {
            throw new Error('Invalid player ID');
        }

        showPlayerDetail(playerId);
    } catch (error) {
        const contextError = new Error('Failed to handle player card click');
        contextError.cause = error;
        log.error('HandlePlayerCardClick', contextError);
    }
};

// =====================================================
// MODULE LIFECYCLE
// ✅ ES2025: Complete Modernization
// =====================================================

/**
 * Initialisiert das Modul
 * ✅ ES2025: Strukturiertes Error Handling + AbortController
 * EXPORT für ModuleManager
 */
export function init() {
    try {
        log.info('Init', 'Team module initialization started');

        // ✅ ES2025: Neuer AbortController für diese Session
        teamAbortController = new AbortController();

        // ✅ ES2025: Deep Clone für mutable Working Copy
        players = structuredClone(mockPlayers);

        // ✅ ES2025: Build Player Map für O(1) Lookups
        buildPlayerMap();

        renderPlayers();
        updateTeamStats();

        // Event Delegation für alle Buttons
        addEventListener(document, 'click', handleDocumentClick);

        // Event Delegation für Player Cards
        const playerGrid = document.getElementById('playerGrid');
        if (playerGrid) {
            addEventListener(playerGrid, 'click', handlePlayerCardClick);
        }

        // ESC-Taste für Modal
        addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });

        log.info('Init', 'Team module initialization completed', {
            playerCount: players.length,
            hasPlayerMap: playerMap.size > 0
        });
    } catch (error) {
        const contextError = new Error('Team module initialization failed');
        contextError.cause = error;
        log.error('Init', contextError);
        // Don't throw - allow partial initialization
    }
}

/**
 * Cleanup beim Verlassen
 * ✅ ES2025: AbortController + manuelles Cleanup für Robustheit
 * EXPORT für ModuleManager
 */
export function cleanup() {
    try {
        log.info('Cleanup', 'Team module cleanup started');

        // ✅ ES2025: AbortController entfernt alle Listener auf einmal
        teamAbortController.abort();

        // ✅ FALLBACK: Manuelles Cleanup für nicht-abortable Listener
        eventListeners.forEach(({element, event, handler, options}) => {
            if (element) {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (e) {
                    // Listener war bereits entfernt (durch abort)
                }
            }
        });
        eventListeners.length = 0;

        // Reset State
        players = [];
        playerMap.clear();
        currentSort = 'lineup';

        // Close modal if open
        closeModal();

        log.info('Cleanup', 'Team module cleanup completed');
    } catch (error) {
        const contextError = new Error('Team module cleanup failed');
        contextError.cause = error;
        log.error('Cleanup', contextError);
        // Don't throw in cleanup - log and continue
    }
}