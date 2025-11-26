// =====================================================
// KICKERSCUP - DASHBOARD SYSTEM (ULTIMATE FIX)
// Multi-Strategy Initialisierung für dynamisch geladenen Content
// =====================================================

(function() {
    'use strict';

    // Private State
    let countdownInterval = null;
    let currentFilter = 'alle';
    let eventListeners = [];
    let initAttempts = 0;
    const MAX_INIT_ATTEMPTS = 5;

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
     * Filtert News nach Kategorie
     */
    function filterNews(filter) {
        const newsItems = document.querySelectorAll('.news-item');

        if (newsItems.length === 0) {
            console.warn('⚠️ filterNews: Keine News-Items gefunden!');
            return;
        }

        const filterMapping = {
            'alle': null,
            'events': 'event',
            'updates': 'update',
            'kritisch': 'critical'
        };

        const targetClass = filterMapping[filter];
        let visibleCount = 0;

        newsItems.forEach(item => {
            if (filter === 'alle') {
                item.style.display = 'block';
                visibleCount++;
            } else if (targetClass && item.classList.contains(targetClass)) {
                item.style.display = 'block';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        console.log(`✅ Filter "${filter}": ${visibleCount}/${newsItems.length} Items sichtbar`);
    }

    /**
     * 🔧 STRATEGY 1: Event Delegation (Robusteste Methode)
     * Events werden am Container registriert, funktioniert auch bei späterem Content
     */
    function initNewsFilterWithDelegation() {
        const newsWidget = document.querySelector('.news-widget');

        if (!newsWidget) {
            console.warn('⚠️ News-Widget Container nicht gefunden');
            return false;
        }

        // Ein einziger Event Listener am Container
        addEventListener(newsWidget, 'click', function(e) {
            // Prüfe ob ein Filter-Button geklickt wurde
            const filterBtn = e.target.closest('.filter-btn');

            if (filterBtn) {
                const filter = filterBtn.getAttribute('data-filter').toLowerCase();

                // Update Button-States
                const allButtons = newsWidget.querySelectorAll('.filter-btn');
                allButtons.forEach(btn => btn.classList.remove('active'));
                filterBtn.classList.add('active');

                // Führe Filter aus
                currentFilter = filter;
                filterNews(filter);

                console.log(`🔘 Filter via Delegation: "${filter}"`);
            }
        });

        console.log('✅ News-Filter mit Event Delegation initialisiert');
        return true;
    }

    /**
     * 🔧 STRATEGY 2: Direct Event Listeners mit Retry
     */
    function initNewsFilterDirect() {
        const filterButtons = document.querySelectorAll('.filter-btn');

        if (filterButtons.length === 0) {
            console.warn(`⚠️ Versuch ${initAttempts}: Keine Filter-Buttons gefunden`);

            // Retry mit Verzögerung
            if (initAttempts < MAX_INIT_ATTEMPTS) {
                initAttempts++;
                setTimeout(initNewsFilterDirect, 100);
            } else {
                console.error('❌ Max Retries erreicht, Filter-Init fehlgeschlagen');
            }
            return false;
        }

        console.log(`✅ ${filterButtons.length} Filter-Buttons gefunden`);

        filterButtons.forEach(btn => {
            const filterValue = btn.getAttribute('data-filter');

            addEventListener(btn, 'click', function(e) {
                e.preventDefault();

                // Update Button-States
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Führe Filter aus
                const filter = filterValue.toLowerCase();
                currentFilter = filter;
                filterNews(filter);

                console.log(`🔘 Filter via Direct: "${filter}"`);
            });
        });

        console.log('✅ News-Filter mit Direct Listeners initialisiert');
        initAttempts = 0; // Reset
        return true;
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
     * Initialisiert Event Listeners für andere Dashboard-Elemente
     */
    function initOtherEventListeners() {
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

        console.log('✅ Andere Event Listeners registriert');
    }

    /**
     * Haupt-Initialisierung
     *
     * 🔧 Verwendet mehrere Strategien für maximale Kompatibilität
     */
    function init() {
        return new Promise((resolve) => {
            console.log('🚀 Dashboard Multi-Strategy Init gestartet...');

            // Strategie 1: Event Delegation (sofort)
            const delegationSuccess = initNewsFilterWithDelegation();

            // Strategie 2: Direct Listeners (nach kurzem Delay)
            setTimeout(() => {
                if (!delegationSuccess) {
                    console.log('⚠️ Delegation fehlgeschlagen, versuche Direct Listeners...');
                    initNewsFilterDirect();
                }

                // Andere Event Listeners
                initOtherEventListeners();

                // Countdown starten
                startCountdown();

                console.log('✅ Dashboard System vollständig initialisiert');
                resolve();
            }, 100);
        });
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
        initAttempts = 0;

        console.log('🧹 Dashboard Cleanup durchgeführt');
    }

    // Expose für ModuleManager
    window.__KICKERSCUP_MODULE__ = {
        init,
        cleanup
    };

})();