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

    /**
     * Render Training Cards
     */
    function renderTrainingCards() {
        const container = document.getElementById('trainingCards');
        if (!container) return;

        container.innerHTML = trainingTypes.map(training => `
            <div class="training-card" 
                 data-id="${training.id}"
                 style="--card-color: ${training.color}; --card-glow: ${training.color}40;"
                 onclick="window.TrainingSystem.selectTraining('${training.id}')">
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
     * Render Filled Slot
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
                <div class="slot-card-remove" onclick="window.TrainingSystem.removeTraining(${slotIndex}, event)">×</div>
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
        const card = document.querySelector(`[data-id="${trainingId}"]`);
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
    function removeTraining(slotIndex, event) {
        if (event) {
            event.stopPropagation();
        }
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
     * Initialize Training Page
     */
    function init() {
        // Render initial content
        renderTrainingCards();
        renderTimeline();

        // Setup save button
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveTrainingPlan);
        }

        console.log('✅ Training System initialisiert');
    }

    /**
     * Cleanup beim Verlassen
     */
    function cleanup() {
        // Reset state
        selectedTrainings = [null, null, null, null];

        // Remove event listeners
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.removeEventListener('click', saveTrainingPlan);
        }

        console.log('🧹 Training Cleanup durchgeführt');
    }

    // Public API
    const TrainingSystem = {
        init,
        cleanup,
        selectTraining,
        removeTraining
    };

    // Expose für ModuleManager
    window.__KICKERSCUP_MODULE__ = TrainingSystem;

    // Expose für onclick-Handler in HTML
    window.TrainingSystem = TrainingSystem;

})();