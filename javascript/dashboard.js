// =====================================================
// KICKERSCUP - DASHBOARD SYSTEM (REFACTORED)
// Kompatibel mit ModuleManager
// =====================================================

(function() {
    'use strict';

    // Private State
    let countdownInterval = null;
    let currentFilter = 'alle';
    let eventListeners = [];

    /**
     * Helper: Event Listener registrieren (für Cleanup)
     */
    function addEventListener(element, event, handler, options) {
        if (!element) return;
        element.addEventListener(event, handler, options);
        eventListeners.push({ element, event, handler, options });
    }

    /**
     * Startet den Match Countdown
     */
    function startCountdown() {
        const countdownEl = document.getElementById('matchCountdown');
        if (!countdownEl) return;

        function updateCountdown() {
            const now = new Date();
            const matchTime = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000) + (5 * 60 * 60 * 1000));
            const diff = matchTime - now;

            if (diff <= 0) {
                countdownEl.textContent = '⏱️ Spiel läuft!';
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
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

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 60000);
    }

    /**
     * Initialisiert den News Filter
     */
    function initNewsFilter() {
        const filterButtons = document.querySelectorAll('.filter-btn');

        filterButtons.forEach(btn => {
            addEventListener(btn, 'click', function() {
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                const filter = this.getAttribute('data-filter').toLowerCase();
                currentFilter = filter;
                filterNews(filter);
            });
        });
    }

    /**
     * Filtert News nach Kategorie
     */
    function filterNews(filter) {
        const newsItems = document.querySelectorAll('.news-item');

        newsItems.forEach(item => {
            if (filter === 'alle') {
                item.style.display = 'block';
            } else {
                // Prüfe ob das Item die entsprechende CSS-Klasse hat
                let shouldShow = false;

                if (filter === 'events' && item.classList.contains('event')) {
                    shouldShow = true;
                } else if (filter === 'updates' && item.classList.contains('update')) {
                    shouldShow = true;
                } else if (filter === 'kritisch' && item.classList.contains('critical')) {
                    shouldShow = true;
                }

                item.style.display = shouldShow ? 'block' : 'none';
            }
        });
    }

    /**
     * Handler für Match Action Buttons
     */
    function handleMatchAction(action) {
        if (action.includes('Taktik')) {
            if (window.NavigationSystem) {
                window.NavigationSystem.navigateTo('tactics');
            }
        } else if (action.includes('Aufstellung')) {
            if (window.NavigationSystem) {
                window.NavigationSystem.navigateTo('team');
            }
        } else if (action.includes('Analyse')) {
            alert('📊 Match-Analyse\n\nDetaillierte Spielanalyse wird geladen...');
        }
    }

    /**
     * Handler für Quick Stats Klicks
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
     */
    function handleNewsClick(title, excerpt) {
        alert(`📰 News Details\n\n${title}\n\n${excerpt}\n\n(Hier würde ein Modal mit vollständigen Details geöffnet)`);
    }

    /**
     * Handler für Verletzungen/Sperren Klicks
     */
    function handleInjuryClick(player, type, time) {
        alert(`⚠️ Spieler-Status\n\nSpieler: ${player}\nProblem: ${type}\nAusfall: ${time}\n\n(Hier würden detaillierte Informationen und Behandlungsoptionen angezeigt)`);
    }

    /**
     * Initialisiert Event Listeners
     */
    function initEventListeners() {
        // Match Action Buttons
        const matchButtons = document.querySelectorAll('.btn-match-action');
        matchButtons.forEach(btn => {
            addEventListener(btn, 'click', function() {
                const action = this.textContent.trim();
                handleMatchAction(action);
            });
        });

        // Quick Stats Items
        const statItems = document.querySelectorAll('.quick-stat-item');
        statItems.forEach(item => {
            addEventListener(item, 'click', function() {
                const label = this.querySelector('.quick-stat-label').textContent;
                handleStatClick(label);
            });
        });

        // News Items
        const newsItems = document.querySelectorAll('.news-item');
        newsItems.forEach(item => {
            addEventListener(item, 'click', function() {
                const title = this.querySelector('.news-title').textContent;
                const excerpt = this.querySelector('.news-excerpt').textContent;
                handleNewsClick(title, excerpt);
            });
        });

        // Injury Items
        const injuryItems = document.querySelectorAll('.injury-item');
        injuryItems.forEach(item => {
            addEventListener(item, 'click', function() {
                const player = this.querySelector('.injury-player')?.textContent || '';
                const type = this.querySelector('.injury-type')?.textContent || '';
                const time = this.querySelector('.injury-time')?.textContent || '';
                handleInjuryClick(player, type, time);
            });
        });
    }

    /**
     * Initialisiert das Dashboard
     */
    function init() {
        // Countdown starten
        startCountdown();

        // News Filter initialisieren
        initNewsFilter();

        // Event Listeners initialisieren
        initEventListeners();

        console.log('✅ Dashboard System initialisiert');
    }

    /**
     * Cleanup beim Verlassen
     */
    function cleanup() {
        // Entferne alle Event Listener
        eventListeners.forEach(({ element, event, handler, options }) => {
            if (element) {
                element.removeEventListener(event, handler, options);
            }
        });
        eventListeners = [];

        // Stoppe Countdown
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        // Reset State
        currentFilter = 'alle';

        console.log('🧹 Dashboard Cleanup durchgeführt');
    }

    // Expose für ModuleManager
    window.__KICKERSCUP_MODULE__ = {
        init,
        cleanup
    };

})();