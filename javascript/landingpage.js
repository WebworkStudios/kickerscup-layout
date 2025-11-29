// =====================================================
// KICKERSCUP LANDINGPAGE (ESM)
// Modernisiert: ES Modules, const, ohne IIFE
// =====================================================

// Cache DOM elements
const nav = document.getElementById('premiumNav');
const scrollProgress = document.getElementById('scrollProgress');
const hero = document.querySelector('.hero-bg-layer');

// Cache windowHeight to avoid repeated Layout-Queries
let cachedWindowHeight = 0;

/**
 * Update Window Height (for scroll calculations)
 */
const updateWindowHeight = () => {
    cachedWindowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
};

// Delayed initial calculation (runs after all content is loaded)
window.addEventListener('load', updateWindowHeight);

// Recalculate on resize (debounced)
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateWindowHeight, 250);
});

// Variable to track if an animation frame is pending
let isThrottled = false;

/**
 * Update Scroll Logic (optimized)
 */
const updateScrollLogic = () => {
    // READ PHASE (DOM reads first)
    const scrolledY = window.scrollY;

    // CALCULATE PHASE (computation)
    const shouldAddScrollClass = scrolledY > 100;
    const progress = cachedWindowHeight > 0 ? (scrolledY / cachedWindowHeight) * 100 : 0;
    const parallaxOffset = scrolledY * 0.5;

    // WRITE PHASE (DOM writes batched)

    // 1. Navigation scroll class
    if (shouldAddScrollClass) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }

    // 2. Scroll Progress Bar
    scrollProgress.style.width = progress + '%';

    // 3. Parallax effect (transform is GPU-accelerated)
    hero.style.transform = `translateY(${parallaxOffset}px)`;

    // Reset throttle flag
    isThrottled = false;
};

/**
 * Throttled Scroll Handler (using requestAnimationFrame)
 */
const handleScroll = () => {
    if (!isThrottled) {
        isThrottled = true;
        requestAnimationFrame(updateScrollLogic);
    }
};

/**
 * Smooth Scroll to Section
 */
const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
};

/**
 * Navigate to App
 */
const navigateToApp = () => {
    window.location.href = 'header.html';
};

/**
 * Initialize Landingpage
 */
export const init = () => {
    // Attach scroll listener (throttled)
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Navigation buttons
    const navButtons = document.querySelectorAll('.nav-link');
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = button.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });

    // CTA Buttons
    const ctaButtons = document.querySelectorAll('.cta-button, .btn-start-now');
    ctaButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToApp();
        });
    });

    // Feature Cards Hover Effect (optional enhancement)
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
};

// Auto-initialize on DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
