// =====================================================
// KICKERSCUP LANDINGPAGE (ESM) - ES2025 MODERNIZED
// Mit Modal-System für Login/Register
// =====================================================

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = Object.freeze({
    SCROLL_THRESHOLD: 100,
    PARALLAX_SPEED: 0.5,
    RESIZE_DEBOUNCE_MS: 250,
    APP_TARGET_URL: 'header.html'
});

// =====================================================
// PRIVATE STATE
// =====================================================

// Cache DOM elements
let nav = null;
let scrollProgress = null;
let hero = null;

// Modal elements
let modalOverlay = null;
let authModal = null;

// Cache windowHeight to avoid repeated Layout-Queries
let cachedWindowHeight = 0;

// Variable to track if an animation frame is pending
let isThrottled = false;

// Resize timeout for debouncing
let resizeTimeout = null;

// =====================================================
// WINDOW HEIGHT MANAGEMENT
// =====================================================

/**
 * Update Window Height (for scroll calculations)
 */
const updateWindowHeight = () => {
    cachedWindowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
};

// =====================================================
// SCROLL LOGIC
// =====================================================

/**
 * Update Scroll Logic (optimized)
 */
const updateScrollLogic = () => {
    // READ PHASE (DOM reads first)
    const scrolledY = window.scrollY;

    // CALCULATE PHASE (computation)
    const shouldAddScrollClass = scrolledY > CONFIG.SCROLL_THRESHOLD;
    const progress = cachedWindowHeight > 0 ? (scrolledY / cachedWindowHeight) * 100 : 0;
    const parallaxOffset = scrolledY * CONFIG.PARALLAX_SPEED;

    // WRITE PHASE (DOM writes batched)

    // 1. Navigation scroll class
    if (nav) {
        if (shouldAddScrollClass) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }

    // 2. Scroll Progress Bar
    if (scrollProgress) {
        scrollProgress.style.width = progress + '%';
    }

    // 3. Parallax effect (transform is GPU-accelerated)
    if (hero) {
        hero.style.transform = `translateY(${parallaxOffset}px)`;
    }

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

// =====================================================
// MODAL SYSTEM
// =====================================================

/**
 * Opens the authentication modal
 */
const openAuthModal = (tab = 'login') => {
    if (!modalOverlay || !authModal) {
        console.error('Modal elements not found');
        return;
    }

    // Show modal
    modalOverlay.classList.add('active');
    authModal.classList.add('active');

    // Switch to requested tab
    switchTab(tab);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
};

/**
 * Closes the authentication modal
 */
const closeAuthModal = () => {
    if (!modalOverlay || !authModal) {
        return;
    }

    // Hide modal
    modalOverlay.classList.remove('active');
    authModal.classList.remove('active');

    // Re-enable body scroll
    document.body.style.overflow = '';

    // Clear hash if it's login or register
    if (window.location.hash === '#login' || window.location.hash === '#register') {
        history.replaceState(null, '', window.location.pathname);
    }
};

/**
 * Switches between login and register tabs
 */
const switchTab = (targetTab) => {
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === targetTab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update tab contents
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');

    if (loginTab && registerTab) {
        if (targetTab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
        }
    }

    // Update footer
    const loginFooter = document.getElementById('loginFooter');
    const registerFooter = document.getElementById('registerFooter');

    if (loginFooter && registerFooter) {
        if (targetTab === 'login') {
            loginFooter.classList.remove('hidden');
            registerFooter.classList.add('hidden');
        } else {
            loginFooter.classList.add('hidden');
            registerFooter.classList.remove('hidden');
        }
    }
};

// =====================================================
// NAVIGATION HELPERS
// =====================================================

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
    window.location.href = CONFIG.APP_TARGET_URL;
};

// =====================================================
// INITIALIZATION
// =====================================================

/**
 * Initialize Landingpage
 */
export const init = () => {
    console.log('🚀 Initialisiere Landingpage...');

    // Cache DOM elements
    nav = document.getElementById('premiumNav');
    scrollProgress = document.getElementById('scrollProgress');
    hero = document.querySelector('.hero-bg-layer');
    modalOverlay = document.getElementById('modalOverlay');
    authModal = document.getElementById('authModal');

    // Initial window height calculation
    updateWindowHeight();

    // Delayed initial calculation (runs after all content is loaded)
    window.addEventListener('load', updateWindowHeight);

    // Recalculate on resize (debounced)
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateWindowHeight, CONFIG.RESIZE_DEBOUNCE_MS);
    });

    // Attach scroll listener (throttled)
    window.addEventListener('scroll', handleScroll, {passive: true});

    // =====================================================
    // MODAL EVENT LISTENERS
    // =====================================================

    // Close button
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeAuthModal);
    }

    // Close on overlay click
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeAuthModal);
    }

    // Prevent modal content clicks from closing modal
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            if (targetTab) {
                switchTab(targetTab);
            }
        });
    });

    // Footer links (switch tabs without closing modal)
    document.querySelectorAll('.modal-footer a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const hash = link.getAttribute('href').substring(1);
            if (hash === 'login' || hash === 'register') {
                switchTab(hash);
            }
        });
    });

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAuthModal();
        }
    });

    // Handle all hash links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            const targetId = href.substring(1);

            // Check if it's a modal trigger
            if (targetId === 'login' || targetId === 'register') {
                e.preventDefault();
                openAuthModal(targetId);
            }
            // Check if it's agb or datenschutz (special invisible divs)
            else if (targetId === 'agb' || targetId === 'datenschutz') {
                e.preventDefault();
                // These are invisible divs, just set hash
                window.location.hash = targetId;
            }
            // Otherwise it's a regular section scroll
            else if (targetId !== '') {
                e.preventDefault();
                scrollToSection(targetId);
            }
        });
    });

    // Handle hash navigation (when user arrives with #login or #register)
    const handleHashChange = () => {
        const hash = window.location.hash.substring(1);
        if (hash === 'login' || hash === 'register') {
            openAuthModal(hash);
        }
    };

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Check initial hash on load
    if (window.location.hash) {
        handleHashChange();
    }

    // =====================================================
    // FORM SUBMISSIONS
    // =====================================================

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Login form submitted');
            // TODO: Implement actual login logic
            const email = loginForm.querySelector('[name="email"]').value;
            const password = loginForm.querySelector('[name="password"]').value;
            console.log('Email:', email, 'Password:', password);
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Register form submitted');
            // TODO: Implement actual registration logic
            const email = registerForm.querySelector('[name="email"]').value;
            const username = registerForm.querySelector('[name="username"]').value;
            const password = registerForm.querySelector('[name="password"]').value;
            console.log('Email:', email, 'Username:', username, 'Password:', password);
        });
    }

    // =====================================================
    // CTA BUTTONS
    // =====================================================

    const ctaButtons = document.querySelectorAll('.cta-button, .btn-start-now');
    ctaButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToApp();
        });
    });

    // =====================================================
    // FEATURE CARDS HOVER
    // =====================================================

    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    console.log('✅ Landingpage initialisiert');
};

// =====================================================
// AUTO-INITIALIZATION
// =====================================================

// Auto-initialize on DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}