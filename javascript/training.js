// =====================================================
// KICKERSCUP - TRAINING SYSTEM
// Training Planning & Day Schedule System
// =====================================================

(function () {
    'use strict';

    // Training Types Data
    const trainingTypes = [
        { id: 'waldlauf', title: 'Waldlauf', subtitle: 'Ausdauer im Gelände', icon: '🏃', color: '#48bb78' },
        { id: 'zweikampf', title: 'Zweikampf', subtitle: 'Defensive & Robustheit', icon: '🥊', color: '#e53e3e' },
        { id: 'zirkeltraining', title: 'Zirkeltraining', subtitle: 'Kraft & Ausdauer', icon: '🔄', color: '#dd6b20' },
        { id: 'viererkette', title: 'Viererkette', subtitle: 'Defensive Taktik', icon: '🛡️', color: '#2b6cb0' },
        { id: 'trainingsspiel', title: 'Trainingsspiel', subtitle: 'Spielpraxis 11 vs 11', icon: '⚽', color: '#38a169' },
        { id: 'torschuss', title: 'Torschuss', subtitle: 'Finishing Training', icon: '🎯', color: '#c53030' },
        { id: 'standardsituationen', title: 'Standardsituationen', subtitle: 'Ecken & Freistöße', icon: '📐', color: '#5a67d8' },
        { id: 'spritzigkeit', title: 'Spritzigkeit', subtitle: 'Schnelligkeit & Agilität', icon: '⚡', color: '#ecc94b' },
        { id: 'regeneration', title: 'Regeneration', subtitle: 'Erholung & Recovery', icon: '🛀', color: '#319795' },
        { id: 'leichte_kondition', title: 'Leichte Kondition', subtitle: 'Basis Ausdauer', icon: '🚶', color: '#68d391' },
        { id: 'harte_kondition', title: 'Harte Kondition', subtitle: 'Intensive Ausdauer', icon: '🏃‍♂️', color: '#38a169' },
        { id: 'brutale_kondition', title: 'Brutale Kondition', subtitle: 'Maximale Belastung', icon: '💥', color: '#2f855a' },
        { id: 'freizeit', title: 'Freizeit', subtitle: 'Teambuilding & Spaß', icon: '🎮', color: '#805ad5' },
        { id: 'balltechnik', title: 'Balltechnik', subtitle: 'Feinmotorik & Kontrolle', icon: '🎨', color: '#ed8936' }
    ];

    // Time Slots
    const timeSlots = [
        { time: '09:00' },
        { time: '11:00' },
        { time: '14:00' },
        { time: '16:00' }
    ];

    // Selected Trainings State
    let selectedTrainings = [null, null, null, null];
    let eventListeners = [];

    /**
     * Helper: Event Listener registrieren (für Cleanup)
     */
    function addEventListener(element, event, handler, options) {
        if (!element) return;
        element.addEventListener(event, handler, options);
        eventListeners.push({element, event, handler, options});
    }

    /**
     * Render Training Cards
     */
    function renderTrainingCards() {
        const container = document.getElementById('trainingCards');
        if (!container) return;

        container.innerHTML = trainingTypes.map(training => `
            <div class="training-card" 
                 data-training-id="${training.id}"
                 style="--card-color: ${training.color}; --card-glow: ${training.color}40;">
                <div class="card-icon">${training.icon}</div>
                <h3 class="card-title">${training.title}</h3>
                <p class="card-subtitle">${training.subtitle}</p>
            </div>
        `).join('');
    }

    /**
     * Render Timeline
     */
    function renderTimeline() {
        const container = document.getElementById('timelineSlots');
        if (!container) return;

        container.innerHTML = timeSlots.map((slot, index) => `
            <div class="timeline-slot">
                <div class="slot-time">${slot.time}</div>
                <div class="slot-connector ${selectedTrainings[index] ? 'filled' : ''}">${index + 1}</div>
                <div class="slot-card-container ${selectedTrainings[index] ? 'filled' : ''}" id="slot-${index}">
                    ${selectedTrainings[index] ? renderFilledSlot(selectedTrainings[index], index) : `
                        <div class="slot-placeholder">
                            Wähle eine Trainingseinheit
                        </div>
                    `}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render Filled Slot (ohne onclick)
     */
    function renderFilledSlot(trainingId, slotIndex) {
        const training = trainingTypes.find(t => t.id === trainingId);
        return `
            <div class="slot-filled-card" style="--slot-color: ${training.color};">
                <div class="slot-card-icon">${training.icon}</div>
                <div class="slot-card-info">
                    <div class="slot-card-title">${training.title}</div>
                    <div class="slot-card-subtitle">${training.subtitle}</div>
                </div>
                <div class="slot-card-remove" data-slot-index="${slotIndex}">×</div>
            </div>
        `;
    }

    /**
     * Select Training
     */
    function selectTraining(trainingId) {
        // Find next empty slot
        const emptySlotIndex = selectedTrainings.findIndex(t => t === null);

        if (emptySlotIndex === -1) {
            alert('Alle 4 Slots sind bereits belegt!');
            return;
        }

        const training = trainingTypes.find(t => t.id === trainingId);

        // Add selecting animation to card
        const card = document.querySelector(`[data-training-id="${trainingId}"]`);
        if (card) {
            card.classList.add('selecting');
            setTimeout(() => card.classList.remove('selecting'), 600);
        }

        // Show effect overlay
        showEffect(training);

        // Add to timeline after effect
        setTimeout(() => {
            selectedTrainings[emptySlotIndex] = trainingId;
            renderTimeline();
            updateSaveButton();
        }, 2000);
    }

    /**
     * Show Effect
     */
    function showEffect(training) {
        const overlay = document.getElementById('effectOverlay');
        const icon = document.getElementById('effectIcon');
        const title = document.getElementById('effectTitle');
        const subtitle = document.getElementById('effectSubtitle');

        if (!overlay || !icon || !title || !subtitle) return;

        overlay.style.setProperty('--effect-color', training.color);
        overlay.style.setProperty('--effect-glow', training.color + '80');

        icon.textContent = training.icon;
        title.textContent = training.title;
        subtitle.textContent = '✓ Training hinzugefügt!';

        overlay.classList.add('active');

        // Create particles
        createParticles(training.color);

        // Hide after 2 seconds
        setTimeout(() => {
            overlay.classList.remove('active');
        }, 2000);
    }

    /**
     * Create Particles
     */
    function createParticles(color) {
        const container = document.getElementById('particlesContainer');
        if (!container) return;

        container.innerHTML = '';

        // Reduziere Bewegungsbereich auf Mobile
        const isMobile = window.innerWidth <= 768;
        const maxDistance = isMobile ? 150 : 400;
        const particleCount = isMobile ? 15 : 20;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.setProperty('--effect-color', color);
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.setProperty('--tx', `${(Math.random() - 0.5) * maxDistance}px`);
            particle.style.setProperty('--ty', `${(Math.random() - 0.5) * maxDistance}px`);
            particle.style.animationDelay = `${Math.random() * 0.5}s`;
            container.appendChild(particle);
        }
    }

    /**
     * Remove Training
     */
    function removeTraining(slotIndex) {
        selectedTrainings[slotIndex] = null;
        renderTimeline();
        updateSaveButton();
    }

    /**
     * Update Save Button
     */
    function updateSaveButton() {
        const btn = document.getElementById('saveBtn');
        if (!btn) return;

        const allFilled = selectedTrainings.every(t => t !== null);
        btn.disabled = !allFilled;
    }

    /**
     * Save Training Plan
     */
    function saveTrainingPlan() {
        alert('✅ Trainingstag erfolgreich gespeichert!\n\n' +
            selectedTrainings.map((id, i) => {
                const training = trainingTypes.find(t => t.id === id);
                return `${timeSlots[i].time} - ${training.title}`;
            }).join('\n'));
    }

    /**
     * Event Delegation Handler für alle Klicks
     */
    function handleDocumentClick(e) {
        // Training Card Click
        const trainingCard = e.target.closest('.training-card');
        if (trainingCard) {
            const trainingId = trainingCard.dataset.trainingId;
            if (trainingId) {
                selectTraining(trainingId);
            }
            return;
        }

        // Remove Button Click
        const removeBtn = e.target.closest('.slot-card-remove');
        if (removeBtn) {
            const slotIndex = parseInt(removeBtn.dataset.slotIndex);
            if (!isNaN(slotIndex)) {
                removeTraining(slotIndex);
            }

        }
    }

    /**
     * Initialize Training Page
     */
    function init() {
        // Render initial content
        renderTrainingCards();
        renderTimeline();

        // Event Delegation für alle Klicks
        addEventListener(document, 'click', handleDocumentClick);

        // Setup save button
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            addEventListener(saveBtn, 'click', saveTrainingPlan);
        }

        console.log('✅ Training System initialisiert');
    }

    /**
     * Cleanup beim Verlassen
     */
    function cleanup() {
        // Entferne alle Event Listener
        eventListeners.forEach(({element, event, handler, options}) => {
            if (element) {
                element.removeEventListener(event, handler, options);
            }
        });
        eventListeners = [];

        // Reset state
        selectedTrainings = [null, null, null, null];

        console.log('🧹 Training Cleanup durchgeführt');
    }

    // Expose für ModuleManager
    window.__KICKERSCUP_MODULE__ = {
        init,
        cleanup
    };

})();