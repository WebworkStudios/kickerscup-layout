// =====================================================
// KICKERSCUP - LINEUP CONFIGURATION
// Formationen, Positionen, Regeln & Beispieldaten
// =====================================================

const LineupConfig = {
    // Formation Definitions
    formations: {
        '4-4-2': {
            name: '4-4-2',
            positions: [
                { position: 'TW', x: 50, y: 90 },
                { position: 'LV', x: 15, y: 70 },
                { position: 'IV', x: 35, y: 70 },
                { position: 'IV', x: 65, y: 70 },
                { position: 'RV', x: 85, y: 70 },
                { position: 'LM', x: 15, y: 45 },
                { position: 'ZDM', x: 35, y: 45 },
                { position: 'ZDM', x: 65, y: 45 },
                { position: 'RM', x: 85, y: 45 },
                { position: 'MS', x: 35, y: 15 },
                { position: 'MS', x: 65, y: 15 }
            ]
        },
        '4-3-3': {
            name: '4-3-3',
            positions: [
                { position: 'TW', x: 50, y: 90 },
                { position: 'LV', x: 15, y: 70 },
                { position: 'IV', x: 35, y: 70 },
                { position: 'IV', x: 65, y: 70 },
                { position: 'RV', x: 85, y: 70 },
                { position: 'ZDM', x: 30, y: 50 },
                { position: 'ZOM', x: 50, y: 45 },
                { position: 'ZDM', x: 70, y: 50 },
                { position: 'LS', x: 20, y: 15 },
                { position: 'MS', x: 50, y: 15 },
                { position: 'RS', x: 80, y: 15 }
            ]
        },
        '4-2-3-1': {
            name: '4-2-3-1',
            positions: [
                { position: 'TW', x: 50, y: 90 },
                { position: 'LV', x: 15, y: 70 },
                { position: 'IV', x: 35, y: 70 },
                { position: 'IV', x: 65, y: 70 },
                { position: 'RV', x: 85, y: 70 },
                { position: 'ZDM', x: 35, y: 50 },
                { position: 'ZDM', x: 65, y: 50 },
                { position: 'LM', x: 15, y: 30 },
                { position: 'ZOM', x: 50, y: 30 },
                { position: 'RM', x: 85, y: 30 },
                { position: 'MS', x: 50, y: 10 }
            ]
        },
        '3-4-3': {
            name: '3-4-3',
            positions: [
                { position: 'TW', x: 50, y: 90 },
                { position: 'IV', x: 25, y: 70 },
                { position: 'IV', x: 50, y: 70 },
                { position: 'IV', x: 75, y: 70 },
                { position: 'LM', x: 15, y: 45 },
                { position: 'ZDM', x: 38, y: 50 },
                { position: 'ZDM', x: 62, y: 50 },
                { position: 'RM', x: 85, y: 45 },
                { position: 'LS', x: 20, y: 15 },
                { position: 'MS', x: 50, y: 15 },
                { position: 'RS', x: 80, y: 15 }
            ]
        },
        '4-5-1': {
            name: '4-5-1',
            positions: [
                { position: 'TW', x: 50, y: 90 },
                { position: 'LV', x: 15, y: 70 },
                { position: 'IV', x: 35, y: 70 },
                { position: 'IV', x: 65, y: 70 },
                { position: 'RV', x: 85, y: 70 },
                { position: 'LM', x: 15, y: 45 },
                { position: 'ZDM', x: 35, y: 50 },
                { position: 'ZOM', x: 50, y: 40 },
                { position: 'ZDM', x: 65, y: 50 },
                { position: 'RM', x: 85, y: 45 },
                { position: 'MS', x: 50, y: 10 }
            ]
        },
        '3-5-2': {
            name: '3-5-2',
            positions: [
                { position: 'TW', x: 50, y: 90 },
                { position: 'IV', x: 25, y: 70 },
                { position: 'IV', x: 50, y: 70 },
                { position: 'IV', x: 75, y: 70 },
                { position: 'LM', x: 10, y: 45 },
                { position: 'ZDM', x: 30, y: 50 },
                { position: 'ZOM', x: 50, y: 40 },
                { position: 'ZDM', x: 70, y: 50 },
                { position: 'RM', x: 90, y: 45 },
                { position: 'MS', x: 38, y: 15 },
                { position: 'MS', x: 62, y: 15 }
            ]
        },
        '5-3-2': {
            name: '5-3-2',
            positions: [
                { position: 'TW', x: 50, y: 90 },
                { position: 'LI', x: 10, y: 70 },
                { position: 'LV', x: 28, y: 70 },
                { position: 'IV', x: 50, y: 70 },
                { position: 'RV', x: 72, y: 70 },
                { position: 'LI', x: 90, y: 70 },
                { position: 'ZDM', x: 30, y: 45 },
                { position: 'ZOM', x: 50, y: 40 },
                { position: 'ZDM', x: 70, y: 45 },
                { position: 'MS', x: 38, y: 15 },
                { position: 'MS', x: 62, y: 15 }
            ]
        },
        '4-1-4-1': {
            name: '4-1-4-1',
            positions: [
                { position: 'TW', x: 50, y: 90 },
                { position: 'LV', x: 15, y: 70 },
                { position: 'IV', x: 35, y: 70 },
                { position: 'IV', x: 65, y: 70 },
                { position: 'RV', x: 85, y: 70 },
                { position: 'ZDM', x: 50, y: 55 },
                { position: 'LM', x: 15, y: 35 },
                { position: 'ZOM', x: 38, y: 35 },
                { position: 'ZOM', x: 62, y: 35 },
                { position: 'RM', x: 85, y: 35 },
                { position: 'MS', x: 50, y: 10 }
            ]
        },
        '4-3-1-2': {
            name: '4-3-1-2',
            positions: [
                { position: 'TW', x: 50, y: 90 },
                { position: 'LV', x: 15, y: 70 },
                { position: 'IV', x: 35, y: 70 },
                { position: 'IV', x: 65, y: 70 },
                { position: 'RV', x: 85, y: 70 },
                { position: 'ZDM', x: 30, y: 50 },
                { position: 'ZDM', x: 50, y: 52 },
                { position: 'ZDM', x: 70, y: 50 },
                { position: 'ZOM', x: 50, y: 30 },
                { position: 'MS', x: 38, y: 10 },
                { position: 'MS', x: 62, y: 10 }
            ]
        }
    },

    // Position Categories & Compatibility
    positionCategories: {
        'TW': { category: 'GK', name: 'Torwart' },
        'LI': { category: 'DEF', name: 'Linker Innenverteidiger' },
        'LV': { category: 'DEF', name: 'Linker Verteidiger' },
        'IV': { category: 'DEF', name: 'Innenverteidiger' },
        'RV': { category: 'DEF', name: 'Rechter Verteidiger' },
        'LM': { category: 'MID', name: 'Linkes Mittelfeld' },
        'RM': { category: 'MID', name: 'Rechtes Mittelfeld' },
        'ZOM': { category: 'MID', name: 'Zentrales Offensives Mittelfeld' },
        'ZDM': { category: 'MID', name: 'Zentrales Defensives Mittelfeld' },
        'MS': { category: 'ATT', name: 'Mittelstürmer' },
        'LS': { category: 'ATT', name: 'Linksstürmer' },
        'RS': { category: 'ATT', name: 'Rechtsstürmer' }
    },

    // Position Compatibility Rules
    positionCompatibility: {
        // Goalkeeper
        'TW': {
            'TW': 1.0, // Perfect match
            // All field positions forbidden
            'LI': 0, 'LV': 0, 'IV': 0, 'RV': 0,
            'LM': 0, 'RM': 0, 'ZOM': 0, 'ZDM': 0,
            'MS': 0, 'LS': 0, 'RS': 0
        },

        // Defense
        'LI': {
            'LI': 1.0,
            'LV': 0.95, 'IV': 0.95, // Close relation
            'RV': 0.9, // Same category
            'ZDM': 0.9, // Can play defensive mid
            'TW': 0, 'LM': 0.8, 'RM': 0.8, 'ZOM': 0.8, // Other categories
            'MS': 0.8, 'LS': 0.8, 'RS': 0.8
        },
        'LV': {
            'LV': 1.0,
            'LI': 0.95, 'IV': 0.95,
            'RV': 0.9,
            'LM': 0.9, // Can support wing
            'ZDM': 0.9,
            'TW': 0, 'RM': 0.8, 'ZOM': 0.8,
            'MS': 0.8, 'LS': 0.8, 'RS': 0.8
        },
        'IV': {
            'IV': 1.0,
            'LV': 0.95, 'RV': 0.95, 'LI': 0.95,
            'ZDM': 0.9,
            'TW': 0, 'LM': 0.8, 'RM': 0.8, 'ZOM': 0.8,
            'MS': 0.8, 'LS': 0.8, 'RS': 0.8
        },
        'RV': {
            'RV': 1.0,
            'IV': 0.95, 'LV': 0.9,
            'RM': 0.9, 'ZDM': 0.9,
            'TW': 0, 'LI': 0.9, 'LM': 0.8, 'ZOM': 0.8,
            'MS': 0.8, 'LS': 0.8, 'RS': 0.8
        },

        // Midfield
        'LM': {
            'LM': 1.0,
            'RM': 0.95, // Similar wing role
            'LV': 0.9, 'ZOM': 0.9, 'ZDM': 0.9,
            'LS': 0.9, // Can support attack
            'TW': 0, 'IV': 0.8, 'RV': 0.8, 'LI': 0.8,
            'MS': 0.8, 'RS': 0.8
        },
        'RM': {
            'RM': 1.0,
            'LM': 0.95,
            'RV': 0.9, 'ZOM': 0.9, 'ZDM': 0.9,
            'RS': 0.9,
            'TW': 0, 'IV': 0.8, 'LV': 0.8, 'LI': 0.8,
            'MS': 0.8, 'LS': 0.8
        },
        'ZOM': {
            'ZOM': 1.0,
            'ZDM': 0.95, // Central midfield
            'LM': 0.9, 'RM': 0.9,
            'MS': 0.9, // Can play forward
            'TW': 0, 'LI': 0.8, 'LV': 0.8, 'IV': 0.8, 'RV': 0.8,
            'LS': 0.8, 'RS': 0.8
        },
        'ZDM': {
            'ZDM': 1.0,
            'ZOM': 0.95,
            'IV': 0.9, 'LV': 0.9, 'RV': 0.9,
            'LM': 0.9, 'RM': 0.9,
            'TW': 0, 'LI': 0.9,
            'MS': 0.8, 'LS': 0.8, 'RS': 0.8
        },

        // Attack
        'MS': {
            'MS': 1.0,
            'LS': 0.95, 'RS': 0.95, // Similar striker roles
            'ZOM': 0.9, // Can drop back
            'TW': 0, 'LI': 0.8, 'LV': 0.8, 'IV': 0.8, 'RV': 0.8,
            'LM': 0.8, 'RM': 0.8, 'ZDM': 0.8
        },
        'LS': {
            'LS': 1.0,
            'MS': 0.95, 'RS': 0.95,
            'LM': 0.9, // Wing connection
            'ZOM': 0.9,
            'TW': 0, 'LI': 0.8, 'LV': 0.8, 'IV': 0.8, 'RV': 0.8,
            'RM': 0.8, 'ZDM': 0.8
        },
        'RS': {
            'RS': 1.0,
            'MS': 0.95, 'LS': 0.95,
            'RM': 0.9,
            'ZOM': 0.9,
            'TW': 0, 'LI': 0.8, 'LV': 0.8, 'IV': 0.8, 'RV': 0.8,
            'LM': 0.8, 'ZDM': 0.8
        }
    },

    // Validation Rules
    validation: {
        minPlayersInSquad: 7,
        maxPlayersInSquad: 20,
        maxBenchPlayers: 9,
        startingEleven: 11
    },

    // Example Players
    examplePlayers: [
        {
            id: 1,
            name: 'Max Neuer',
            base_strength: 88,
            main_position: 'TW',
            positions: { 'TW': 100 },
            status: 'fit',
            form: 8,
            fitness: 95
        },
        {
            id: 2,
            name: 'Leon Müller',
            base_strength: 85,
            main_position: 'IV',
            positions: { 'IV': 100, 'LV': 85, 'RV': 85, 'ZDM': 75 },
            status: 'fit',
            form: 9,
            fitness: 92
        },
        {
            id: 3,
            name: 'Tom Wagner',
            base_strength: 84,
            main_position: 'IV',
            positions: { 'IV': 100, 'LI': 90, 'ZDM': 70 },
            status: 'fit',
            form: 7,
            fitness: 88
        },
        {
            id: 4,
            name: 'Felix Schmidt',
            base_strength: 82,
            main_position: 'LV',
            positions: { 'LV': 100, 'LI': 85, 'LM': 75, 'IV': 80 },
            status: 'fit',
            form: 8,
            fitness: 90
        },
        {
            id: 5,
            name: 'Paul Becker',
            base_strength: 81,
            main_position: 'RV',
            positions: { 'RV': 100, 'RM': 75, 'IV': 80 },
            status: 'fit',
            form: 7,
            fitness: 87
        },
        {
            id: 6,
            name: 'Jonas Fischer',
            base_strength: 86,
            main_position: 'ZDM',
            positions: { 'ZDM': 100, 'ZOM': 85, 'IV': 70 },
            status: 'fit',
            form: 9,
            fitness: 94
        },
        {
            id: 7,
            name: 'Lukas Weber',
            base_strength: 87,
            main_position: 'ZOM',
            positions: { 'ZOM': 100, 'ZDM': 85, 'LM': 80, 'RM': 80, 'MS': 75 },
            status: 'fit',
            form: 10,
            fitness: 96
        },
        {
            id: 8,
            name: 'David Hoffmann',
            base_strength: 83,
            main_position: 'LM',
            positions: { 'LM': 100, 'LS': 80, 'LV': 70, 'ZOM': 75 },
            status: 'fit',
            form: 8,
            fitness: 91
        },
        {
            id: 9,
            name: 'Tim Schulz',
            base_strength: 82,
            main_position: 'RM',
            positions: { 'RM': 100, 'RS': 80, 'RV': 70, 'ZOM': 75 },
            status: 'fit',
            form: 7,
            fitness: 89
        },
        {
            id: 10,
            name: 'Marco Richter',
            base_strength: 90,
            main_position: 'MS',
            positions: { 'MS': 100, 'LS': 90, 'RS': 90, 'ZOM': 75 },
            status: 'fit',
            form: 9,
            fitness: 93
        },
        {
            id: 11,
            name: 'Simon Krause',
            base_strength: 88,
            main_position: 'MS',
            positions: { 'MS': 100, 'LS': 85, 'RS': 85, 'ZOM': 70 },
            status: 'fit',
            form: 8,
            fitness: 90
        },
        // Bench players
        {
            id: 12,
            name: 'Jan Braun',
            base_strength: 78,
            main_position: 'TW',
            positions: { 'TW': 100 },
            status: 'fit',
            form: 7,
            fitness: 92
        },
        {
            id: 13,
            name: 'Elias Krüger',
            base_strength: 80,
            main_position: 'IV',
            positions: { 'IV': 100, 'LV': 75, 'RV': 75 },
            status: 'injured',
            form: 6,
            fitness: 45
        },
        {
            id: 14,
            name: 'Moritz Klein',
            base_strength: 79,
            main_position: 'ZDM',
            positions: { 'ZDM': 100, 'ZOM': 80, 'IV': 70 },
            status: 'fit',
            form: 7,
            fitness: 88
        },
        {
            id: 15,
            name: 'Noah Lang',
            base_strength: 81,
            main_position: 'LM',
            positions: { 'LM': 100, 'LS': 75, 'LV': 65 },
            status: 'fit',
            form: 8,
            fitness: 91
        },
        {
            id: 16,
            name: 'Ben Wolf',
            base_strength: 80,
            main_position: 'RM',
            positions: { 'RM': 100, 'RS': 75, 'RV': 65 },
            status: 'banned',
            form: 7,
            fitness: 87
        },
        {
            id: 17,
            name: 'Finn Schröder',
            base_strength: 85,
            main_position: 'MS',
            positions: { 'MS': 100, 'LS': 85, 'RS': 85 },
            status: 'fit',
            form: 8,
            fitness: 89
        },
        {
            id: 18,
            name: 'Niklas Hartmann',
            base_strength: 77,
            main_position: 'LV',
            positions: { 'LV': 100, 'LI': 80, 'LM': 70 },
            status: 'fit',
            form: 6,
            fitness: 85
        },
        {
            id: 19,
            name: 'Alex Zimmermann',
            base_strength: 76,
            main_position: 'RV',
            positions: { 'RV': 100, 'RM': 70, 'IV': 75 },
            status: 'fit',
            form: 6,
            fitness: 84
        },
        {
            id: 20,
            name: 'Erik Meyer',
            base_strength: 78,
            main_position: 'ZOM',
            positions: { 'ZOM': 100, 'ZDM': 80, 'MS': 65 },
            status: 'fit',
            form: 7,
            fitness: 86
        }
    ]
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LineupConfig;
}

// Make globally available
window.LineupConfig = LineupConfig;