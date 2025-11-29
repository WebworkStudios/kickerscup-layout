// =====================================================
// KICKERSCUP - TRAINING SYSTEM (ESM)
// Modernisiert: ES Modules, const, export/import
// =====================================================

// State Management
let selectedTrainings = [null, null, null, null];
const eventListeners = [];

// Training Categories (NEU: Mit 14 Trainingseinheiten und numerischen Impacts)
const trainingCategories = {
    kondition: {
        name: 'Kondition',
        icon: '🏃',
        color: '#48bb78', // --color-kondition
        options: [
            {
                id: 'brutale_kondition',
                name: 'Brutale Kondition',
                effect: '+4 Kondition, -3 Frische',
                impacts: {kondition: 4, form: -1, frische: -3, motivation: 0}
            },
            {
                id: 'harte_kondition',
                name: 'harte Kondition',
                effect: '+3 Kondition, -2 Frische',
                impacts: {kondition: 3, form: -1, frische: -2, motivation: 0}
            },
            {
                id: 'zirkeltraining',
                name: 'Zirkeltraining',
                effect: '+3 Kondition, -2 Frische',
                impacts: {kondition: 3, form: 0, frische: -2, motivation: 0}
            },
            {
                id: 'waldlauf',
                name: 'Waldlauf',
                effect: '+2 Kondition, -1 Frische, +1 Motivation',
                impacts: {kondition: 2, form: 0, frische: -1, motivation: 1}
            },
            {
                id: 'zweikampf',
                name: 'Zweikampf',
                effect: '+2 Kondition, +1 Form, -2 Frische',
                impacts: {kondition: 2, form: 1, frische: -2, motivation: 0}
            },
            {
                id: 'leichte_kondition',
                name: 'leichte Kondition',
                effect: '+1 Kondition',
                impacts: {kondition: 1, form: 0, frische: 0, motivation: 0}
            },
        ]
    },
    technik: {
        name: 'Technik',
        icon: '⚽',
        color: '#ed8936', // --color-technik
        options: [
            {
                id: 'balltechnik',
                name: 'Balltechnik',
                effect: '+2 Form, +3 Frische, -3 Kondition',
                impacts: {kondition: -3, form: 2, frische: 3, motivation: 0}
            },
            {
                id: 'torschuss',
                name: 'Torschuss',
                effect: '+1 Frische, -1 Kondition',
                impacts: {kondition: -1, form: 0, frische: 1, motivation: 0}
            },
            {
                id: 'standardsituationen',
                name: 'Standardsituationen',
                effect: '+1 Form',
                impacts: {kondition: 0, form: 1, frische: 0, motivation: 0}
            },
        ]
    },
    taktik: {
        name: 'Taktik',
        icon: '🧠',
        color: '#4299e1', // --color-taktik
        options: [
            {
                id: 'trainingsspiel',
                name: 'Trainingsspiel',
                effect: '+1 Kondition, +1 Form, -1 Frische',
                impacts: {kondition: 1, form: 1, frische: -1, motivation: 0}
            },
            {
                id: 'viererkette',
                name: 'Viererkette',
                effect: '+1 Form, +1 Frische, -1 Kondition',
                impacts: {kondition: -1, form: 1, frische: 1, motivation: 0}
            },
        ]
    },
    regeneration: {
        name: 'Erholung',
        icon: '😴',
        color: '#38b2ac', // --color-regeneration
        options: [
            {
                id: 'regeneration',
                name: 'Regeneration',
                effect: '+4 Frische, -2 Kondition',
                impacts: {kondition: -2, form: 0, frische: 4, motivation: 0}
            },
            {
                id: 'spritzigkeit',
                name: 'Spritzigkeit',
                effect: '+3 Frische, +1 Kondition',
                impacts: {kondition: 1, form: 0, frische: 3, motivation: 0}
            },
            {
                id: 'freizeit',
                name: 'Freizeit',
                effect: '+1 Frische, +1 Motivation, -2 Kondition',
                impacts: {kondition: -2, form: 0, frische: 1, motivation: 1}
            },
        ]
    }
};

/**
 * Helper: Event Listener registrieren
 */
const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;
    element.addEventListener(event, handler, options);
    eventListeners.push({element, event, handler, options});
};

/**
 * Helper: Training anhand ID finden (UPDATED)
 */
const findTrainingById = (trainingId) => {
    for (const category of Object.values(trainingCategories)) {
        const found = category.options.find(opt => opt.id === trainingId);
        if (found) {
            return {
                ...found,
                icon: category.icon,
                color: category.color
            };
        }
    }
    return null;
};

/**
 * Helper: Impact Wert formatieren (+/- Zeichen)
 */
const formatImpact = (value) => {
    if (value > 0) return `+${value}`;
    if (value < 0) return `${value}`;
    return '0';
};

/**
 * Helper: Gesamtauswirkungen berechnen
 */
const calculateTotalImpact = () => {
    const total = {kondition: 0, form: 0, frische: 0, motivation: 0};
    selectedTrainings.forEach(training => {
        if (training && training.impacts) {
            total.kondition += training.impacts.kondition;
            total.form += training.impacts.form;
            total.frische += training.impacts.frische;
            total.motivation += training.impacts.motivation;
        }
    });
    return total;
};

/**
 * Render Total Impact Summary (NEU)
 */
const renderTotalImpact = () => {
    const container = document.getElementById('totalImpactSummary');
    if (!container) return;

    const total = calculateTotalImpact();

    container.innerHTML = `
        <h3 class="total-impact-title">Gesamtbilanz</h3>
        <div class="impact-grid">
            <div class="impact-item">
                <span class="impact-label">Kondition</span>
                <span class="impact-value impact-${total.kondition > 0 ? 'pos' : total.kondition < 0 ? 'neg' : 'zero'}">${formatImpact(total.kondition)}</span>
            </div>
            <div class="impact-item">
                <span class="impact-label">Form</span>
                <span class="impact-value impact-${total.form > 0 ? 'pos' : total.form < 0 ? 'neg' : 'zero'}">${formatImpact(total.form)}</span>
            </div>
            <div class="impact-item">
                <span class="impact-label">Frische</span>
                <span class="impact-value impact-${total.frische > 0 ? 'pos' : total.frische < 0 ? 'neg' : 'zero'}">${formatImpact(total.frische)}</span>
            </div>
            <div class="impact-item">
                <span class="impact-label">Motivation</span>
                <span class="impact-value impact-${total.motivation > 0 ? 'pos' : total.motivation < 0 ? 'neg' : 'zero'}">${formatImpact(total.motivation)}</span>
            </div>
        </div>
    `;
};


/**
 * Render Training Cards (UPDATED: Nutzt korrekte Klassen und Farben)
 */
const renderTrainingCards = () => {
    const container = document.getElementById('trainingCardsGrid');
    if (!container) return;

    let html = '';

    // Iteriere über die Kategorien, um das Grid mit Überschriften zu strukturieren
    Object.entries(trainingCategories).forEach(([key, category]) => {

        // Optionale Kategorie-Überschrift zur besseren Strukturierung
        html += `<h3 class="category-divider">${category.icon} ${category.name}</h3>`;

        // Erzeugen der HTML-Kartenstruktur mit den korrekten CSS-Klassen
        html += category.options.map(option => `
            <div 
                class="training-card" 
                data-training-id="${option.id}"
                style="--card-color: ${category.color}; --slot-color: ${category.color}; --card-glow: ${category.color}40;"
            >
                <div class="card-icon">${category.icon}</div>
                <h4 class="card-title">${option.name}</h4>
                <p class="card-subtitle">${option.effect}</p>
                <p class="card-subtitle category-name">${category.name}</p>
            </div>
        `).join('');
    });

    container.innerHTML = html;
};

/**
 * Render Timeline (UPDATED: Nutzt 1. Einheit, 2. Einheit, ...)
 */
const renderTimeline = () => {
    const container = document.getElementById('timelineSlots');
    if (!container) return;

    // Slots sind nun nummerierte Einheiten
    const slots = [
        {day: '1. Einheit', index: 0},
        {day: '2. Einheit', index: 1},
        {day: '3. Einheit', index: 2},
        {day: '4. Einheit', index: 3}
    ];

    container.innerHTML = slots.map((slot) => {
        // Training findet den vollen Datensatz inkl. Icon/Farbe
        const training = selectedTrainings[slot.index] ? findTrainingById(selectedTrainings[slot.index].id) : null;
        const colorStyle = training ? `style="--slot-color: ${training.color};"` : '';
        const filledClass = training ? 'filled' : '';

        return `
            <div class="timeline-slot" data-day="${slot.index}">
                <div class="slot-time">${slot.day}</div>
                <div class="slot-connector ${filledClass}" ${colorStyle}></div>
                <div class="slot-card-container ${filledClass}" data-day="${slot.index}">
                    ${training ? `
                        <div class="slot-filled-card" ${colorStyle}>
                            <div class="slot-card-icon">${training.icon}</div>
                            <div class="slot-card-info">
                                <div class="slot-card-title">${training.name}</div>
                                <div class="slot-card-subtitle">${training.effect}</div>
                            </div>
                            <button class="slot-card-remove" data-day="${slot.index}">✕</button>
                        </div>
                    ` : `
                        <div class="slot-placeholder">Klicken, um Training zuzuweisen</div>
                    `}
                </div>
            </div>
        `;
    }).join('');

    // Save Button Status
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        // Deaktivieren, wenn alle null sind
        const hasTraining = selectedTrainings.some(t => t !== null);
        saveBtn.disabled = !hasTraining;
    }
};

/**
 * Select Training for Day
 */
const selectTrainingForDay = (trainingId, dayIndex) => {
    const selectedTraining = findTrainingById(trainingId);

    if (selectedTraining) {
        selectedTrainings[dayIndex] = selectedTraining;
        renderTimeline();
        renderTotalImpact(); // Neu: Bilanz aktualisieren
    }
};

/**
 * Remove Training from Day
 */
const removeTraining = (dayIndex) => {
    selectedTrainings[dayIndex] = null;
    renderTimeline();
    renderTotalImpact(); // Neu: Bilanz aktualisieren
};

/**
 * Save Training Plan
 */
const saveTrainingPlan = () => {
    // Speichert den vollständigen Plan, einschließlich Impacts für die zukünftige Berechnung
    const plan = {
        trainings: selectedTrainings.filter(t => t !== null).map(t => ({
            id: t.id,
            name: t.name,
            effect: t.effect,
            impacts: t.impacts
        })),
        totalImpact: calculateTotalImpact(),
        savedAt: new Date().toISOString()
    };

    try {
        localStorage.setItem('kickerscup_training', JSON.stringify(plan));
        alert('✅ Trainingsplan gespeichert! Gesamte Auswirkungen: Kondition ' + formatImpact(plan.totalImpact.kondition) + ', Frische ' + formatImpact(plan.totalImpact.frische) + '...');
    } catch (error) {
        alert('❌ Fehler beim Speichern');
    }
};

/**
 * Document Click Handler (Event Delegation) (UPDATED: Vereinfachte Zuweisung)
 */
const handleDocumentClick = (e) => {
    const target = e.target;

    // Training card clicked - Zuweisung zum nächsten leeren Slot
    if (target.closest('.training-card')) {
        const trainingId = target.closest('.training-card').dataset.trainingId;

        // Findet den ersten leeren Slot
        const emptyDayIndex = selectedTrainings.findIndex(t => t === null);

        if (emptyDayIndex !== -1) {
            selectTrainingForDay(trainingId, emptyDayIndex);
        } else {
            alert('Alle Slots sind belegt. Entferne zuerst eine Einheit.');
        }
    }

    // Remove training 
    if (target.closest('.slot-card-remove')) {
        const dayIndex = parseInt(target.closest('.slot-card-remove').dataset.day);
        removeTraining(dayIndex);
    }

    // Klick auf leeren Slot
    if (target.closest('.slot-card-container:not(.filled)')) {
        alert('Wähle eine Trainingseinheit aus der Liste links, um sie diesem Slot zuzuweisen.');
    }
};

/**
 * Initialize Training System
 * EXPORT für ModuleManager
 */
export function init() {
    renderTrainingCards();
    renderTimeline();
    renderTotalImpact(); // Neu: Gesamtbilanz beim Start anzeigen

    addEventListener(document, 'click', handleDocumentClick);

    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        addEventListener(saveBtn, 'click', saveTrainingPlan);
    }
}

/**
 * Cleanup beim Verlassen
 * EXPORT für ModuleManager
 */
export function cleanup() {
    eventListeners.forEach(({element, event, handler, options}) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners.length = 0;

    selectedTrainings = [null, null, null, null];
}