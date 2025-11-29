/**
 * KICKERSCUP - LINEUP RESPONSIVE FIX
 * Dynamische Anpassung der Positionen für kleine Bildschirme
 */

/**
 * Responsive Formation Adjuster
 * Passt die Y-Positionen der Slots basierend auf der Viewport-Größe an
 */
class ResponsiveFormationAdjuster {
    constructor() {
        this.baseHeight = 650; // Standard Feldhöhe
        this.minWidth = 375;   // Minimum unterstützte Breite
        this.init();
    }

    init() {
        // Initial adjustment
        this.adjustPositions();

        // Adjust on window resize (debounced)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.adjustPositions();
            }, 250);
        });

        // Adjust on orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.adjustPositions();
            }, 300);
        });
    }

    adjustPositions() {
        const viewportWidth = window.innerWidth;

        // Nur für kleine Bildschirme anpassen
        if (viewportWidth < 390) {
            this.applySmallScreenFix();
        } else if (viewportWidth < 428) {
            this.applyMediumScreenFix();
        } else {
            this.removeCustomPositions();
        }
    }

    applySmallScreenFix() {
        console.log('Applying 375px position fix...');

        const fieldContainer = document.querySelector('.field-background');
        if (fieldContainer) {
            // Erhöhe die Feldhöhe
            fieldContainer.style.minHeight = '750px';
        }

        const fieldSlots = document.querySelector('.field-slots');
        if (fieldSlots) {
            // Mehr Padding für bessere Verteilung
            fieldSlots.style.padding = '50px 10px';
        }

        // Feinabstimmung der Y-Positionen basierend auf Rolle
        const slots = document.querySelectorAll('.field-slot');
        slots.forEach(slot => {
            const position = slot.dataset.position;
            const adjustment = this.getPositionAdjustment375(position);

            if (adjustment) {
                // Hole die aktuelle Top-Position
                const currentTop = parseFloat(slot.style.top) || 50;
                // Wende Anpassung an
                const newTop = Math.max(5, Math.min(95, currentTop + adjustment));
                slot.style.top = `${newTop}%`;
            }
        });
    }

    applyMediumScreenFix() {
        console.log('Applying 390px position fix...');

        const fieldContainer = document.querySelector('.field-background');
        if (fieldContainer) {
            fieldContainer.style.minHeight = '680px';
        }

        const fieldSlots = document.querySelector('.field-slots');
        if (fieldSlots) {
            fieldSlots.style.padding = '40px 15px';
        }
    }

    removeCustomPositions() {
        // Entferne custom Styles, CSS übernimmt
        const fieldContainer = document.querySelector('.field-background');
        if (fieldContainer) {
            fieldContainer.style.minHeight = '';
        }

        const fieldSlots = document.querySelector('.field-slots');
        if (fieldSlots) {
            fieldSlots.style.padding = '';
        }

        const slots = document.querySelectorAll('.field-slot');
        slots.forEach(slot => {
            // Nur Y-Position zurücksetzen, X-Position beibehalten
            // Die ursprüngliche Position wird durch re-render wiederhergestellt
        });
    }

    /**
     * Gibt Anpassungswerte für jede Position zurück
     * Positive Werte = weiter nach unten, Negative = weiter nach oben
     */
    getPositionAdjustment375(position) {
        const adjustments = {
            // Torwart - näher an den unteren Rand
            'TW': 3,

            // Abwehr - leicht nach unten verschieben
            'LV': 1,
            'IV': 1,
            'RV': 1,

            // Defensives Mittelfeld - etwas Abstand zur Abwehr
            'DM': 0,

            // Zentrales Mittelfeld - neutral
            'ZM': 0,
            'LM': 0,
            'RM': 0,

            // Offensives Mittelfeld - leicht nach oben
            'OM': -1,

            // Sturm - näher nach oben
            'LA': -2,
            'RA': -2,
            'ST': -2,
            'MS': -2
        };

        return adjustments[position] || 0;
    }

    /**
     * Berechnet optimale Y-Position basierend auf Formation und Viewport
     */
    calculateOptimalYPosition(slot, formation) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Basis-Position aus der Formation
        const baseY = parseFloat(slot.style.top);

        // Anpassungsfaktor basierend auf Viewport
        let factor = 1.0;

        if (viewportWidth <= 375) {
            // Sehr kleiner Bildschirm - mehr Spread
            factor = 1.15;
        } else if (viewportWidth <= 390) {
            // Kleiner Bildschirm - leichter Spread
            factor = 1.08;
        }

        // Wende Faktor an (mit Begrenzung auf 5-95%)
        const adjustedY = Math.max(5, Math.min(95, baseY * factor));

        return adjustedY;
    }
}

/**
 * Field Height Auto-Adjuster
 * Passt die Feldhöhe basierend auf Anzahl der Spieler an
 */
class FieldHeightAdjuster {
    constructor() {
        this.minHeight = 650;
        this.maxHeight = 850;
        this.init();
    }

    init() {
        // Beobachte Änderungen im field-slots Container
        const fieldSlots = document.getElementById('fieldSlots');
        if (!fieldSlots) return;

        const observer = new MutationObserver(() => {
            this.adjustHeight();
        });

        observer.observe(fieldSlots, {
            childList: true,
            subtree: true
        });

        // Initial adjustment
        this.adjustHeight();
    }

    adjustHeight() {
        const viewportWidth = window.innerWidth;
        if (viewportWidth >= 390) return; // Nur für kleine Screens

        const fieldSlots = document.getElementById('fieldSlots');
        const filledSlots = fieldSlots.querySelectorAll('.field-slot:has(.player-card)').length;

        // Berechne optimale Höhe basierend auf Anzahl Spieler
        const baseHeight = viewportWidth <= 375 ? 750 : 680;
        const heightPerPlayer = 8; // Zusätzliche Pixel pro Spieler

        const optimalHeight = Math.min(
            this.maxHeight,
            baseHeight + (filledSlots * heightPerPlayer)
        );

        const fieldContainer = document.querySelector('.field-background');
        if (fieldContainer) {
            fieldContainer.style.minHeight = `${optimalHeight}px`;
        }
    }
}

/**
 * Touch Optimization for Small Screens
 * Verbessert Touch-Interaktionen auf kleinen Bildschirmen
 */
class SmallScreenTouchOptimizer {
    constructor() {
        this.init();
    }

    init() {
        if (window.innerWidth >= 390) return;

        // Erhöhe Touch-Ziele
        const slots = document.querySelectorAll('.field-slot, .bench-slot');
        slots.forEach(slot => {
            slot.style.minWidth = '70px';
            slot.style.minHeight = '90px';
        });

        // Verbessere Drag-Feedback
        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.player-card')) {
                e.target.closest('.player-card').style.transform = 'scale(1.05)';
            }
        });

        document.addEventListener('touchend', (e) => {
            if (e.target.closest('.player-card')) {
                e.target.closest('.player-card').style.transform = '';
            }
        });
    }
}

/**
 * Initialize all responsive adjusters
 */
function initializeResponsiveLineup() {
    // Warte bis DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        console.log('Initializing responsive lineup adjusters...');

        // Formation Position Adjuster
        window.formationAdjuster = new ResponsiveFormationAdjuster();

        // Field Height Adjuster
        window.heightAdjuster = new FieldHeightAdjuster();

        // Touch Optimizer (nur für Touch-Geräte)
        if ('ontouchstart' in window) {
            window.touchOptimizer = new SmallScreenTouchOptimizer();
        }

        console.log('Responsive lineup adjusters initialized');
    }
}

// Auto-initialize
initializeResponsiveLineup();

// Export für externe Nutzung
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ResponsiveFormationAdjuster,
        FieldHeightAdjuster,
        SmallScreenTouchOptimizer
    };
}