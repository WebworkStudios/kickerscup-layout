// =====================================================
// KICKERSCUP - DASHBOARD SYSTEM (FINAL FIX)
// News Filter funktioniert KORREKT
// =====================================================

(function () {
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
        eventListeners.push({element, event, handler, options});
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
     * Ermittelt den Typ eines News-Items
     * FIX: Prüft SOWOHL CSS-Klassen ALS AUCH Badge-Klassen
     */
    function getNewsItemType(item) {
        // 1. Prüfe CSS-Klassen direkt am news-item
        if (item.classList.contains('critical')) return 'critical';
        if (item.classList.contains('event')) return 'event';
        if (item.classList.contains('update')) return 'update';

        // 2. Prüfe Badge-Klassen (für Items ohne direkte Klasse)
        const badge = item.querySelector('.news-badge');
        if (badge) {
            if (badge.classList.contains('badge-critical')) return 'critical';
            if (badge.classList.contains('badge-event')) return 'event';
            if (badge.classList.contains('badge-update')) return 'update';
            if (badge.classList.contains('badge-info')) return 'info';
        }

        return 'info'; // Default
    }

    /**
     * Initialisiert den News Filter
     */
    function initNewsFilter() {
        const filterButtons = document.querySelectorAll('.filter-btn');

        filterButtons.forEach(btn => {
            addEventListener(btn, 'click', function () {
                // Update active state
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
     * FIX: Verwendet getNewsItemType() für korrekte Typ-Erkennung
     */
    function filterNews(filter) {
        const newsItems = document.querySelectorAll('.news-item');

        if (newsItems.length === 0) {
            console.warn('⚠️ Keine News-Items gefunden');
            return;
        }

        // Mapping: data-filter Werte → Typ-Namen
        const filterMapping = {
            'alle': null,           // Zeige alle
            'events': 'event',      // Plural → Singular
            'updates': 'update',    // Plural → Singular
            'kritisch': 'critical'  // Deutsch → Englisch
        };

        const targetType = filterMapping[filter];
        let visibleCount = 0;

        newsItems.forEach((item, index) => {
            const itemType = getNewsItemType(item);

            if (filter === 'alle') {
                // Zeige alle Items
                item.style.display = 'block';
                item.style.opacity = '1';
                item.style.animation = 'fadeIn 0.3s ease-out';
                visibleCount++;
            } else if (targetType && itemType === targetType) {
                // Zeige nur Items mit passendem Typ
                item.style.display = 'block';
                item.style.opacity = '1';
                item.style.animation = 'fadeIn 0.3s ease-out';
                visibleCount++;
            } else {
                // Verstecke alle anderen
                item.style.display = 'none';
                item.style.opacity = '0';
            }
        });

        // Zeige Hinweis wenn keine Items gefunden
        if (visibleCount === 0 && filter !== 'alle') {
            console.log(`ℹ️ Keine News in Kategorie "${filter}" gefunden`);
            showNoResultsMessage();
        } else {
            hideNoResultsMessage();
        }

        console.log(`✅ News-Filter: "${filter}" → Typ: "${targetType || 'alle'}" → ${visibleCount} von ${newsItems.length} Items sichtbar`);
    }

    /**
     * Zeigt "Keine Ergebnisse" Nachricht
     */
    function showNoResultsMessage() {
        const newsWidget = document.querySelector('.news-widget');
        if (!newsWidget) return;

        let noResultsEl = newsWidget.querySelector('.no-results-message');

        if (!noResultsEl) {
            noResultsEl = document.createElement('div');
            noResultsEl.className = 'no-results-message';
            noResultsEl.style.cssText = `
                text-align: center;
                padding: 40px 20px;
                color: var(--text-muted);
                font-size: 14px;
            `;
            noResultsEl.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                <p>Keine News in dieser Kategorie verfügbar</p>
            `;

            // Füge nach den News-Items ein
            newsWidget.appendChild(noResultsEl);
        }

        noResultsEl.style.display = 'block';
    }

    /**
     * Versteckt "Keine Ergebnisse" Nachricht
     */
    function hideNoResultsMessage() {
        const noResultsEl = document.querySelector('.no-results-message');
        if (noResultsEl) {
            noResultsEl.style.display = 'none';
        }
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
        switch (label.toLowerCase()) {
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
            addEventListener(btn, 'click', function () {
                const action = this.textContent.trim();
                handleMatchAction(action);
            });
        });

        // Quick Stats Items
        const statItems = document.querySelectorAll('.quick-stat-item');
        statItems.forEach(item => {
            addEventListener(item, 'click', function () {
                const label = this.querySelector('.quick-stat-label').textContent;
                handleStatClick(label);
            });
        });

        // News Items
        const newsItems = document.querySelectorAll('.news-item');
        newsItems.forEach(item => {
            addEventListener(item, 'click', function () {
                const title = this.querySelector('.news-title').textContent;
                const excerpt = this.querySelector('.news-excerpt').textContent;
                handleNewsClick(title, excerpt);
            });
        });

        // Injury Items
        const injuryItems = document.querySelectorAll('.injury-item');
        injuryItems.forEach(item => {
            addEventListener(item, 'click', function () {
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
        eventListeners.forEach(({element, event, handler, options}) => {
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