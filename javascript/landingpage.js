// =====================================================
// KICKERSCUP LANDINGPAGE - MAIN JAVASCRIPT
// =====================================================

// =======================
// OPTIMIZED SCROLL HANDLING (Anti-Reflow)
// Die Trennung von DOM-Lese- und Schreibvorgängen ist hier bereits
// implementiert, um Layout Thrashing zu vermeiden.
// =======================

// Cache DOM elements once on load for better performance
const nav = document.getElementById('premiumNav');
const scrollProgress = document.getElementById('scrollProgress');
const hero = document.querySelector('.hero-bg-layer');

// ⚡ PERFORMANCE: Cache windowHeight to avoid repeated Layout-Queries
let cachedWindowHeight = 0;

function updateWindowHeight() {
    // Hotspot 2 (Erzwungener dynamischer Umbruch) behoben:
    // document.documentElement.scrollHeight ist eine Layout-Lese-Operation.
    // Die Initialberechnung wird verzögert, bis das Layout stabil ist.
    cachedWindowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
}

// 🛠️ FIX: Verzögerte Initialberechnung (läuft nach dem Laden aller Inhalte)
window.addEventListener('load', updateWindowHeight);

// Recalculate on resize (debounced)
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateWindowHeight, 250);
});

// Variable to track if an animation frame is pending
let isThrottled = false;

function updateScrollLogic() {
    // ⚡ PERFORMANCE: READ PHASE (Lese-Vorgänge zuerst)
    const scrolledY = window.scrollY; // DOM Read

    // ⚡ PERFORMANCE: Calculate values (computation phase)
    const shouldAddScrollClass = scrolledY > 100;
    const progress = cachedWindowHeight > 0 ? (scrolledY / cachedWindowHeight) * 100 : 0;

    // ⚡ PERFORMANCE: Parallax effect uses transform, which is composited
    const parallaxOffset = scrolledY * 0.5;

    // ⚡ PERFORMANCE: WRITE PHASE (Schreib-Vorgänge gebündelt)

    // 1. Navigation scroll class (DOM Write)
    if (shouldAddScrollClass) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }

    // 2. Scroll Progress Bar (DOM Write)
    scrollProgress.style.width = progress + '%';

    // 3. Parallax Effect for Hero (DOM Write: Composited transform)
    if (hero) {
        hero.style.transform = `translateY(${parallaxOffset}px)`;
    }

    // Reset throttle status
    isThrottled = false;
}

// Single scroll listener that combines all functions and throttles with rAF
window.addEventListener('scroll', () => {
    // Nutzung von requestAnimationFrame (rAF) zur Synchronisation des Updates mit dem Browser-Zyklus
    if (!isThrottled) {
        window.requestAnimationFrame(updateScrollLogic);
        isThrottled = true;
    }
}, { passive: true }); // ⚡ PERFORMANCE: passive listener

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        // Skip if it's just "#" or a modal anchor (handled by onclick)
        if (href === '#' || href === '#login' || href === '#register') {
            return;
        }
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Intersection Observer for Progressive Loading
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -80px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, index * 100);
        }
    });
}, observerOptions);

document.querySelectorAll('.benefit-item, .gallery-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(50px)';
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    observer.observe(el);
});

// =======================
// AUTH MODALS FUNCTIONS - Modularisiert
// =======================

const KickerscupApp = (() => {
    // Private variables
    let loadingTimeouts = new Map();

    // DOM element cache
    const elements = {
        nav: null,
        modalOverlay: null,
        authModal: null,
        loginTab: null,
        registerTab: null,
        loginFooter: null,
        registerFooter: null
    };

    // Initialize DOM elements cache
    function cacheElements() {
        elements.nav = document.querySelector('.premium-nav');
        elements.modalOverlay = document.getElementById('modalOverlay');
        elements.authModal = document.getElementById('authModal');
        elements.loginTab = document.getElementById('loginTab');
        elements.registerTab = document.getElementById('registerTab');
        elements.loginFooter = document.getElementById('loginFooter');
        elements.registerFooter = document.getElementById('registerFooter');
    }

    function openLoginModal() {
        elements.modalOverlay?.classList.add('active');
        elements.authModal?.classList.add('active');
        switchTab('login');
        document.body.style.overflow = 'hidden';
    }

    function openRegisterModal() {
        elements.modalOverlay?.classList.add('active');
        elements.authModal?.classList.add('active');
        switchTab('register');
        document.body.style.overflow = 'hidden';
    }

    function closeModals() {
        // Clear loading timeouts
        loadingTimeouts.forEach(timeout => clearTimeout(timeout));
        loadingTimeouts.clear();

        elements.modalOverlay?.classList.remove('active');
        elements.authModal?.classList.remove('active');
        document.body.style.overflow = '';
    }

    function switchTab(tab) {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => btn.classList.remove('active'));

        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.remove('active'));

        if (tab === 'login') {
            tabButtons[0]?.classList.add('active');
            elements.loginTab?.classList.add('active');
            elements.loginFooter?.classList.remove('hidden');
            elements.registerFooter?.classList.add('hidden');
        } else {
            tabButtons[1]?.classList.add('active');
            elements.registerTab?.classList.add('active');
            elements.loginFooter?.classList.add('hidden');
            elements.registerFooter?.classList.remove('hidden');
        }
    }

    function handleLogin(event) {
        event.preventDefault();

        const form = event.target;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;

        submitBtn.textContent = 'Wird angemeldet...';
        submitBtn.disabled = true;

        const timeoutId = setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            alert('Login erfolgreich! (Dies ist nur eine Demo)');
            closeModals();
            loadingTimeouts.delete('login');
        }, 1500);

        loadingTimeouts.set('login', timeoutId);
    }

    function handleRegister(event) {
        event.preventDefault();

        const form = event.target;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;

        submitBtn.textContent = 'Wird erstellt...';
        submitBtn.disabled = true;

        const timeoutId = setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            alert('Account erfolgreich erstellt!\n\nEine Bestätigungs-E-Mail wurde versendet.\nDein Lieblings-Team kannst du nach dem Login auswählen.');
            closeModals();
            loadingTimeouts.delete('register');
        }, 1500);

        loadingTimeouts.set('register', timeoutId);
    }

    function socialLogin(provider) {
        const sanitizedProvider = String(provider).replace(/[^a-z]/gi, '');
        alert(`Social Login mit ${sanitizedProvider} würde hier gestartet.\n\nIn der echten Implementierung würde hier der OAuth-Flow beginnen.`);
    }

    // Event Listeners
    function initEventListeners() {
        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModals();
        });

        // Modal overlay click
        elements.modalOverlay?.addEventListener('click', closeModals);

        // Modal close button
        document.querySelector('.modal-close')?.addEventListener('click', closeModals);

        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => switchTab(index === 0 ? 'login' : 'register'));
        });

        // Forms
        document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
        document.getElementById('registerForm')?.addEventListener('submit', handleRegister);

        // Social login buttons
        document.querySelectorAll('.btn-social').forEach(btn => {
            btn.addEventListener('click', () => {
                const provider = btn.classList.contains('google') ? 'Google' : 'Facebook';
                socialLogin(provider);
            });
        });

        // CTA buttons - for opening register modal
        document.querySelectorAll('.btn-premium-large, .btn-nav-premium').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const href = btn.getAttribute('href');

                // Open appropriate modal based on href
                if (href === '#login') {
                    openLoginModal();
                } else {
                    openRegisterModal();
                }
            });
        });

        // Footer links
        const loginFooterLink = document.querySelector('#loginFooter a');
        if (loginFooterLink) {
            loginFooterLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab('register');
            });
        }

        const registerFooterLink = document.querySelector('#registerFooter a');
        if (registerFooterLink) {
            registerFooterLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab('login');
            });
        }
    }

    // Public API
    return {
        init: () => {
            cacheElements();
            initEventListeners();
        }
    };
})();

// Initialize modal system after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', KickerscupApp.init);
} else {
    KickerscupApp.init();
}