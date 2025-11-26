// =====================================================
// KICKERSCUP - DASHBOARD SYSTEM
// Main Dashboard & Quick Stats
// =====================================================

const DashboardSystem = (() => {
    // Private variables
    let countdownInterval = null;
    let currentFilter = 'alle';

    /**
     * Initialisiert das Dashboard System
     */
    function init() {
        // Initialisiere Countdown
        startCountdown();

        // Initialisiere News Filter
        initNewsFilter();

        // Initialisiere Event Listeners
        initEventListeners();

        console.log('✅ Dashboard System initialisiert');
    }

    /**
     * Startet den Match Countdown
     */
    function startCountdown() {
        const countdownEl = document.getElementById('matchCountdown');
        if (!countdownEl) return;

        function updateCountdown() {
            // Beispiel-Countdown: Nächstes Spiel in 2 Tagen 5 Stunden
            const now = new Date();
            const matchTime = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000) + (5 * 60 * 60 * 1000));
            const diff = matchTime - now;

            if (diff <= 0) {
                countdownEl.textContent = '⏱️ Spiel läuft!';
                clearInterval(countdownInterval);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                countdownEl.textContent = `⏱️ In ${days} ${days === 1 ? 'Tag' : 'Tagen'} ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
            } else if (hours > 0) {
                countdownEl.textContent = `⏱️ In ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'} ${minutes} Min`;
            } else {
                countdownEl.textContent = `⏱️ In ${minutes} Minuten`;
            }
        }

        // Initiale Aktualisierung
        updateCountdown();

        // Update jede Minute
        countdownInterval = setInterval(updateCountdown, 60000);
    }

    /**
     * Initialisiert den News Filter
     */
    function initNewsFilter() {
        const filterButtons = document.querySelectorAll('.filter-btn');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                // Entferne active von allen Buttons
                filterButtons.forEach(b => b.classList.remove('active'));

                // Setze active auf geklickten Button
                this.classList.add('active');

                // Filtere News
                const filter = this.getAttribute('data-filter').toLowerCase();
                currentFilter = filter;
                filterNews(filter);
            });
        });
    }

    /**
     * Filtert News nach Kategorie
     * @param {string} filter - Filter-Kategorie
     */
    function filterNews(filter) {
        const newsItems = document.querySelectorAll('.news-item');

        newsItems.forEach(item => {
            if (filter === 'alle') {
                item.style.display = 'block';
            } else {
                const badge = item.querySelector('.news-badge');
                if (!badge) {
                    item.style.display = 'none';
                    return;
                }

                const badgeText = badge.textContent.toLowerCase();

                if (badgeText.includes(filter)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    }

    /**
     * Initialisiert Event Listeners
     */
    function initEventListeners() {
        // Match Action Buttons
        const matchButtons = document.querySelectorAll('.btn-match-action');
        matchButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.textContent.trim();
                handleMatchAction(action);
            });
        });

        // Quick Stats Items
        const statItems = document.querySelectorAll('.quick-stat-item');
        statItems.forEach(item => {
            item.addEventListener('click', function() {
                const label = this.querySelector('.quick-stat-label').textContent;
                handleStatClick(label);
            });
        });

        // News Items
        const newsItems = document.querySelectorAll('.news-item');
        newsItems.forEach(item => {
            item.addEventListener('click', function() {
                const title = this.querySelector('.news-title').textContent;
                const excerpt = this.querySelector('.news-excerpt').textContent;
                handleNewsClick(title, excerpt);
            });
        });
    }

    /**
     * Handler für Match Action Buttons
     * @param {string} action - Aktion
     */
    function handleMatchAction(action) {
        if (action.includes('Taktik')) {
            // Navigation zu Taktik-Seite
            if (window.NavigationSystem) {
                window.NavigationSystem.navigateTo('tactics');
            } else {
                console.log('Navigiere zu Taktik...');
            }
        } else if (action.includes('Aufstellung')) {
            // Navigation zu Team-Seite
            if (window.NavigationSystem) {
                window.NavigationSystem.navigateTo('team');
            } else {
                console.log('Navigiere zu Team...');
            }
        } else if (action.includes('Analyse')) {
            alert('📊 Match-Analyse\n\nDetaillierte Spielanalyse wird geladen...');
        }
    }

    /**
     * Handler für Quick Stats Klicks
     * @param {string} label - Stat Label
     */
    function handleStatClick(label) {
        switch(label.toLowerCase()) {
            case 'tabellenplatz':
                if (window.NavigationSystem) {
                    window.NavigationSystem.navigateTo('league');
                }
                break;
            case 'bilanz (s-u-n)':
                alert('📈 Saisonbilanz\n\n8 Siege\n2 Unentschieden\n1 Niederlage\n\nTorverhältnis: 31:12');
                break;
            case 'tore':
                alert('⚽ Tor-Statistik\n\nErzielte Tore: 31\nKassierte Tore: 12\nTordifferenz: +19\n\nBester Torschütze: Marco Müller (12 Tore)');
                break;
            case 'team-fitness':
                alert('💪 Team-Fitness\n\nDurchschnittliche Fitness: 87%\n\nTop Spieler:\n✅ Max Müller: 95%\n✅ Tom Schmidt: 92%\n✅ Leon Wagner: 90%\n\n⚠️ Achtung:\n❌ Elias Krüger: 45% (Verletzt)');
                break;
            case 'budget':
                alert('💰 Budget-Übersicht\n\nVerfügbares Budget: 2.400.000 €\nSaison-Einnahmen: 8.500.000 €\nAusgaben: 6.100.000 €');
                break;
            case 'spieler':
                if (window.NavigationSystem) {
                    window.NavigationSystem.navigateTo('team');
                }
                break;
            default:
                console.log(`Statistik geklickt: ${label}`);
        }
    }

    /**
     * Handler für News Klicks
     * @param {string} title - News Titel
     * @param {string} excerpt - News Auszug
     */
    function handleNewsClick(title, excerpt) {
        alert(`📰 News Details\n\n${title}\n\n${excerpt}\n\n(Hier würde ein Modal mit vollständigen Details geöffnet)`);
    }

    /**
     * Cleanup beim Verlassen der Seite
     */
    function cleanup() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }

    /**
     * Aktualisiert Dashboard-Daten
     */
    function refreshData() {
        console.log('🔄 Dashboard-Daten werden aktualisiert...');

        // Hier würde normalerweise ein AJAX-Call stattfinden
        // Beispiel:
        // fetchDashboardData().then(data => updateWidgets(data));

        // Simuliere Refresh
        setTimeout(() => {
            console.log('✅ Dashboard-Daten aktualisiert');
        }, 500);
    }

    // Public API
    return {
        init,
        cleanup,
        refreshData
    };
})();

// Auto-Initialisierung wenn Dashboard-Seite geladen wird
document.addEventListener('pageLoaded', (e) => {
    if (e.detail.page === 'dashboard') {
        DashboardSystem.init();
    }
});

// Cleanup bei Seitenwechsel
document.addEventListener('pageLoaded', (e) => {
    if (e.detail.page !== 'dashboard') {
        DashboardSystem.cleanup();
    }
});

// Falls direkt auf dashboard.html zugegriffen wird (ohne Navigation)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('.dashboard-grid')) {
            DashboardSystem.init();
        }
    });
} else {
    if (document.querySelector('.dashboard-grid')) {
        DashboardSystem.init();
    }
}

// Global verfügbar machen (optional)
window.DashboardSystem = DashboardSystem;