// =====================================================
// KICKERSCUP - EINZELTRAINING KONFIGURATION
// 16 Trainingsarten mit Effekten (basierend auf Bildvorlage)
// =====================================================

const INDIVIDUAL_TRAINING_CONFIG = {

    settings: {
        maxPlayersPerDay: 4,
        executionTime: '12:45',
        storageKey: 'kickerscup_individual_training'
    },

    // Alle 16 Trainingsarten
    trainingTypes: {
        ABSEITSFALLE: {
            id: 1,
            name: 'Abseitsfalle',
            icon: '🎯',
            category: 'taktik',
            effects: {kondition: -1, form: 1, frische: 1, motivation: 0},
            description: 'Taktisches Training zur Verbesserung der Abseitsfalle'
        },
        EINZELGESPRAECH: {
            id: 2,
            name: 'Einzelgespräch',
            icon: '💬',
            category: 'mental',
            effects: {kondition: 1, form: 0, frische: 1, motivation: 0},
            description: 'Persönliches Gespräch zur Motivation'
        },
        TORWARTTRAINING: {
            id: 3,
            name: 'Torwarttraining',
            icon: '🧤',
            category: 'speziell',
            effects: {kondition: 0, form: 1, frische: 0, motivation: 0},
            description: 'Spezielles Training für Torhüter'
        },
        STRAFTRAINING: {
            id: 4,
            name: 'Straftraining',
            icon: '🔥',
            category: 'intensiv',
            effects: {kondition: 2, form: 0, frische: -3, motivation: -1},
            description: 'Intensives Training - hoher Frische-Verbrauch'
        },
        SPRINT: {
            id: 5,
            name: 'Sprint',
            icon: '🏃',
            category: 'athletik',
            effects: {kondition: 1, form: 0, frische: -1, motivation: 1},
            description: 'Schnelligkeitstraining'
        },
        SCHWALBEN: {
            id: 6,
            name: 'Schwalben',
            icon: '🦅',
            category: 'speziell',
            effects: {kondition: -2, form: 1, frische: -1, motivation: 0},
            description: 'Spezielles Training für theatralische Einlagen'
        },
        PAESSE: {
            id: 7,
            name: 'Pässe',
            icon: '⚽',
            category: 'technik',
            effects: {kondition: 0, form: 2, frische: -1, motivation: 0},
            description: 'Passtraining zur Formverbesserung'
        },
        LIEGESTUETZE: {
            id: 8,
            name: 'Liegestütze',
            icon: '💪',
            category: 'athletik',
            effects: {kondition: 1, form: 1, frische: 0, motivation: 0},
            description: 'Grundlegendes Krafttraining'
        },
        KOPFBALL: {
            id: 9,
            name: 'Kopfball',
            icon: '🗣️',
            category: 'technik',
            effects: {kondition: 2, form: 0, frische: 0, motivation: 0},
            description: 'Kopfballtraining für mehr Kondition'
        },
        GYMNASTIK: {
            id: 10,
            name: 'Gymnastik',
            icon: '🤸',
            category: 'athletik',
            effects: {kondition: 1, form: 0, frische: 1, motivation: 0},
            description: 'Leichtes Training zur Erholung'
        },
        FREISTOSS: {
            id: 11,
            name: 'Freistoss',
            icon: '🎯',
            category: 'speziell',
            effects: {kondition: 0, form: 1, frische: 2, motivation: 0},
            description: 'Freistoßtraining - erholsam'
        },
        ELFMETER: {
            id: 12,
            name: 'Elfmeter',
            icon: '⚽',
            category: 'speziell',
            effects: {kondition: -1, form: 1, frische: 0, motivation: 1},
            description: 'Elfmetertraining für Form und Motivation'
        },
        DOPING: {
            id: 13,
            name: 'Doping',
            icon: '💉',
            category: 'riskant',
            effects: {kondition: 2, form: -1, frische: 2, motivation: 1},
            description: '⚠️ Riskant! Hohe Kondition, aber Form-Verlust'
        },
        DEHNUEBUNG: {
            id: 14,
            name: 'Dehn-Übung',
            icon: '🧘',
            category: 'athletik',
            effects: {kondition: 2, form: 0, frische: 1, motivation: 0},
            description: 'Dehnübungen für Kondition und Erholung'
        },
        BALLFUEHRUNG: {
            id: 15,
            name: 'Ballführung',
            icon: '⚽',
            category: 'technik',
            effects: {kondition: 1, form: 1, frische: 0, motivation: 0},
            description: 'Dribblingtraining'
        },
        ALLEINGANG: {
            id: 16,
            name: 'Alleingang',
            icon: '🚀',
            category: 'technik',
            effects: {kondition: 0, form: 2, frische: 0, motivation: 0},
            description: 'Solo-Training für maximale Form'
        }
    },

    categories: {
        athletik: {name: 'Athletik', color: '#48bb78'},
        technik: {name: 'Technik', color: '#4299e1'},
        speziell: {name: 'Speziell', color: '#9f7aea'},
        mental: {name: 'Mental', color: '#ed8936'},
        taktik: {name: 'Taktik', color: '#a0aec0'},
        intensiv: {name: 'Intensiv', color: '#f56565'},
        riskant: {name: 'Riskant', color: '#e53e3e'}
    },

    effectLabels: {
        kondition: {name: 'Kondition', short: 'K', icon: '💪'},
        form: {name: 'Form', short: 'F', icon: '📈'},
        frische: {name: 'Frische', short: 'Fr', icon: '⚡'},
        motivation: {name: 'Motivation', short: 'M', icon: '🔥'}
    },

    helpers: {
        getAllTrainings() {
            return Object.values(INDIVIDUAL_TRAINING_CONFIG.trainingTypes);
        },

        getTrainingById(id) {
            return this.getAllTrainings().find(t => t.id === id);
        },

        formatEffect(value) {
            if (value > 0) return `+${value}`;
            if (value < 0) return `${value}`;
            return '0';
        },

        getEffectClass(value) {
            if (value > 0) return 'positive';
            if (value < 0) return 'negative';
            return 'neutral';
        },

        renderEffectBadges(effects, compact = false) {
            const labels = INDIVIDUAL_TRAINING_CONFIG.effectLabels;
            let html = '';

            for (const [key, value] of Object.entries(effects)) {
                if (value === 0 && compact) continue;

                const label = labels[key];
                const cls = this.getEffectClass(value);
                const displayValue = this.formatEffect(value);

                if (compact) {
                    html += `<span class="mini-effect ${cls}">${label.short}${displayValue}</span>`;
                } else {
                    html += `<span class="effect-badge ${cls}">${label.icon} ${label.name} ${displayValue}</span>`;
                }
            }

            return html;
        }
    }
};

// Beispiel-Spielerdaten (WICHTIG: Global verfügbar machen!)
const SAMPLE_PLAYERS = [
    {id: 1, name: 'Max Müller', position: 'ST', strength: 85, kondition: 78, form: 7, frische: 92, motivation: 8},
    {id: 2, name: 'Tim Schmidt', position: 'ZOM', strength: 79, kondition: 82, form: 6, frische: 88, motivation: 7},
    {id: 3, name: 'Lukas Weber', position: 'IV', strength: 81, kondition: 75, form: 8, frische: 95, motivation: 9},
    {id: 4, name: 'Felix Braun', position: 'TW', strength: 77, kondition: 80, form: 5, frische: 90, motivation: 6},
    {id: 5, name: 'Jonas Fischer', position: 'LM', strength: 76, kondition: 85, form: 7, frische: 85, motivation: 8},
    {id: 6, name: 'David Hoffmann', position: 'RM', strength: 74, kondition: 79, form: 6, frische: 91, motivation: 7},
    {id: 7, name: 'Paul Wagner', position: 'ZDM', strength: 80, kondition: 77, form: 8, frische: 87, motivation: 8},
    {id: 8, name: 'Leon Becker', position: 'LV', strength: 73, kondition: 83, form: 5, frische: 93, motivation: 6},
    {id: 9, name: 'Finn Schulz', position: 'RV', strength: 72, kondition: 81, form: 6, frische: 89, motivation: 7},
    {id: 10, name: 'Elias Koch', position: 'MS', strength: 83, kondition: 76, form: 9, frische: 82, motivation: 9},
    {id: 11, name: 'Noah Richter', position: 'IV', strength: 78, kondition: 84, form: 7, frische: 94, motivation: 8},
    {id: 12, name: 'Ben Klein', position: 'ZOM', strength: 75, kondition: 78, form: 6, frische: 88, motivation: 7}
];

// Positionskategorien für Filter
const POSITION_CATEGORIES = {
    TW: ['TW'],
    DEF: ['LV', 'IV', 'RV'],
    MIT: ['LM', 'ZDM', 'ZOM', 'RM'],
    STU: ['LS', 'MS', 'RS', 'ST']
};

// WICHTIG: Global verfügbar machen!
window.INDIVIDUAL_TRAINING_CONFIG = INDIVIDUAL_TRAINING_CONFIG;
window.SAMPLE_PLAYERS = SAMPLE_PLAYERS;
window.POSITION_CATEGORIES = POSITION_CATEGORIES;

console.log('✅ Individual Training Config geladen');
console.log('📊 Spieler verfügbar:', SAMPLE_PLAYERS.length);
console.log('🎯 Trainingsarten verfügbar:', Object.keys(INDIVIDUAL_TRAINING_CONFIG.trainingTypes).length);
console.log('🌍 Global verfügbar gemacht:', {
    INDIVIDUAL_TRAINING_CONFIG: typeof window.INDIVIDUAL_TRAINING_CONFIG !== 'undefined',
    SAMPLE_PLAYERS: typeof window.SAMPLE_PLAYERS !== 'undefined',
    POSITION_CATEGORIES: typeof window.POSITION_CATEGORIES !== 'undefined'
});