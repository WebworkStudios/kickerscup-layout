// =====================================================
// KICKERSCUP - TEAM PROFILE MODULE (ESM) - ES2025 MODERNIZED
// Kompakte Teamkarte + Tab-Navigation mit Detail-Bereichen
// ✅ Custom Error Classes mit Error Causes
// ✅ Promise.allSettled für robuste parallele Operationen
// ✅ AbortController für automatisches Event Cleanup
// ✅ Immutable Configuration mit Object.freeze
// ✅ Fail-Fast Error Handling mit Graceful Degradation
// =====================================================

// =====================================================
// CUSTOM ERROR CLASSES
// ✅ ES2025: Strukturierte Fehlerbehandlung
// =====================================================

class TeamProfileDataError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'TeamProfileDataError';
        this.cause = cause;
    }
}

class TeamProfileRenderError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'TeamProfileRenderError';
        this.cause = cause;
    }
}

// =====================================================
// CONFIGURATION
// ✅ ES2025: Frozen Configuration
// =====================================================

const CONFIG = Object.freeze({
    // Cache-Strategie
    CACHE_DURATION: Object.freeze({
        STATS: 5 * 60 * 1000,        // 5 Minuten für Statistiken
        TABLE: 60 * 1000,         // 1 Minute für Tabellenstand
        OVERVIEW: 10 * 60 * 1000      // 10 Minuten für Basis-Daten
    }),

    // API Endpoints
    API: Object.freeze({
        OVERVIEW: '/api/team/{teamId}/overview',
        STATS: '/api/team/{teamId}/stats',
        TABLE: '/api/league/table?teamId={teamId}&context=2',
        SQUAD: '/api/team/{teamId}/squad',
        ACHIEVEMENTS: '/api/team/{teamId}/achievements',
        RECENT_FORM: '/api/team/{teamId}/form?limit=5',
        NEXT_MATCH: '/api/team/{teamId}/next-match'
    }),

    // Tab-System
    TABS: Object.freeze(['overview', 'squad', 'achievements']),
    DEFAULT_TAB: 'overview',

    // Performance
    IMAGE_LAZY_LOAD_ROOT_MARGIN: '50px',
    RESIZE_DEBOUNCE_MS: 300,

    // Breakpoints
    BREAKPOINTS: Object.freeze({
        MOBILE: 768,
        TABLET: 1024
    }),

    // UI
    FADE_TRANSITION_MS: 200,
    TABLE_CONTEXT_ROWS: 2  // ±2 Plätze um eigene Position
});

// =====================================================
// PRIVATE STATE
// =====================================================

// Immutable Config (nach Laden)
let teamConfig = null;

// Mutable Runtime State
let currentTab = CONFIG.DEFAULT_TAB;
let squadData = [];
let squadFilters = {
    position: 'all',
    searchTerm: ''
};
let sortConfig = {
    column: 'number',
    ascending: true
};

// Cache mit Timestamps
const dataCache = new Map();

// ✅ ES2025: AbortController für Event Cleanup
let profileAbortController = new AbortController();

// Fallback Event Tracking
const eventListeners = [];

// Resize Debounce Timer
let resizeTimeout = null;

// Intersection Observer für Lazy Loading
let imageObserver = null;

// =====================================================
// STRUCTURED LOGGING
// ✅ ES2025: Konsistentes Logging mit Context
// =====================================================

const log = {
    info: (context, message, data = {}) => {
        console.log(`[TeamProfile:${context}]`, message, Object.keys(data).length > 0 ? data : '');
    },
    warn: (context, message, data = {}) => {
        console.warn(`[TeamProfile:${context}]`, message, Object.keys(data).length > 0 ? data : '');
    },
    error: (context, error) => {
        console.error(`[TeamProfile:${context}]`, error.message, error.cause ? {cause: error.cause} : '');
    }
};

// =====================================================
// EVENT LISTENER HELPER
// ✅ ES2025: AbortController Integration
// =====================================================

const addEventListener = (element, event, handler, options = false) => {
    if (!element) {
        log.warn('EventListener', 'Element is null, skipping listener attachment');
        return;
    }

    if (typeof options === 'object' && !options.signal) {
        options.signal = profileAbortController.signal;
    } else if (typeof options === 'boolean') {
        options = { capture: options, signal: profileAbortController.signal };
    }

    element.addEventListener(event, handler, options);
    eventListeners.push({ element, event, handler, options });
};

// =====================================================
// DATA FETCHING WITH CACHING
// ✅ ES2025: Promise.allSettled + Cache Strategy
// =====================================================

/**
 * Fetch data mit Cache-Strategie
 * @param {string} endpoint - API Endpoint
 * @param {number} cacheDuration - Cache-Dauer in ms
 * @returns {Promise<any>}
 */
async function fetchWithCache(endpoint, cacheDuration) {
    const now = Date.now();
    const cached = dataCache.get(endpoint);

    if (cached && (now - cached.timestamp) < cacheDuration) {
        log.info('Cache', `Using cached data for ${endpoint}`);
        return cached.data;
    }

    try {
        // ✅ MOCKUP: Simulierte API-Calls (später durch echte ersetzen)
        const data = await fetchMockData(endpoint);

        dataCache.set(endpoint, {
            data,
            timestamp: now
        });

        return data;
    } catch (error) {
        throw new TeamProfileDataError(
            `Failed to fetch data from ${endpoint}`,
            error
        );
    }
}

/**
 * Mockup-Funktion für API-Calls
 * ✅ TODO: Durch echte API-Calls ersetzen
 */
async function fetchMockData(endpoint) {
    // Simuliere Netzwerk-Delay
    await new Promise(resolve => setTimeout(resolve, 100));

    if (endpoint.includes('/overview')) {
        return {
            id: 1,
            name: 'FC Beispiel',
            logo: '/assets/teams/team-1-logo.png',
            colors: { primary: '#003366', secondary: '#FFD700' },
            founded: 1950,
            league: '1. Liga',
            leaguePosition: 3,
            points: 42
        };
    }

    if (endpoint.includes('/stats')) {
        return {
            wins: 12,
            draws: 6,
            losses: 4,
            goalsScored: 38,
            goalsConceded: 22,
            goalDifference: 16,
            squadSize: 22,
            averageAge: 26.5,
            teamStrength: 82
        };
    }

    if (endpoint.includes('/table')) {
        return {
            standings: [
                { position: 1, team: 'Meister FC', games: 22, points: 54 },
                { position: 2, team: 'Zweiter SC', games: 22, points: 48 },
                { position: 3, team: 'FC Beispiel', games: 22, points: 42, isOwnTeam: true },
                { position: 4, team: 'Vierter SV', games: 22, points: 39 },
                { position: 5, team: 'Fünfter FC', games: 22, points: 36 }
            ]
        };
    }

    if (endpoint.includes('/form')) {
        return {
            recentMatches: [
                { result: 'win', opponent: 'Gegner A', score: '3-1', date: '2025-12-01' },
                { result: 'win', opponent: 'Gegner B', score: '2-0', date: '2025-11-28' },
                { result: 'draw', opponent: 'Gegner C', score: '1-1', date: '2025-11-24' },
                { result: 'loss', opponent: 'Gegner D', score: '0-2', date: '2025-11-20' },
                { result: 'win', opponent: 'Gegner E', score: '4-2', date: '2025-11-17' }
            ]
        };
    }

    if (endpoint.includes('/next-match')) {
        return {
            opponent: 'Nächster Gegner FC',
            opponentLogo: '/assets/teams/team-99-logo.png',
            date: '2025-12-15',
            time: '15:30',
            venue: 'home',
            stadium: 'Heimstadion'
        };
    }

    if (endpoint.includes('/squad')) {
        return {
            players: [
                { id: 1, number: 1, name: 'Max Mustermann', position: 'GK', age: 28, strength: 85, form: 88 },
                { id: 2, number: 2, name: 'John Doe', position: 'DF', age: 24, strength: 78, form: 75 },
                { id: 3, number: 3, name: 'Jane Smith', position: 'DF', age: 26, strength: 82, form: 80 },
                { id: 4, number: 4, name: 'Bob Wilson', position: 'DF', age: 29, strength: 80, form: 77 },
                { id: 5, number: 5, name: 'Alice Brown', position: 'DF', age: 23, strength: 76, form: 79 },
                { id: 6, number: 6, name: 'Tom Davis', position: 'MF', age: 27, strength: 83, form: 85 },
                { id: 7, number: 7, name: 'Sarah Miller', position: 'MF', age: 25, strength: 81, form: 82 },
                { id: 8, number: 8, name: 'Chris Taylor', position: 'MF', age: 28, strength: 84, form: 86 },
                { id: 9, number: 9, name: 'Emma Anderson', position: 'FW', age: 22, strength: 79, form: 84 },
                { id: 10, number: 10, name: 'Michael Johnson', position: 'FW', age: 26, strength: 86, form: 89 },
                { id: 11, number: 11, name: 'Laura Martinez', position: 'FW', age: 24, strength: 82, form: 80 }
            ]
        };
    }

    if (endpoint.includes('/achievements')) {
        return {
            trophies: [
                { year: 2023, competition: 'Liga-Meisterschaft', icon: 'fa-trophy' },
                { year: 2022, competition: 'Pokalsieger', icon: 'fa-trophy' }
            ],
            historicalPositions: [
                { season: '2024/25', position: 3, points: 42 },
                { season: '2023/24', position: 1, points: 78 },
                { season: '2022/23', position: 2, points: 71 },
                { season: '2021/22', position: 4, points: 58 },
                { season: '2020/21', position: 5, points: 52 }
            ],
            milestones: [
                { id: 1, title: 'Team gegründet', date: '1950-01-01', icon: 'fa-flag' },
                { id: 2, title: 'Erster Sieg', date: '1950-03-15', icon: 'fa-trophy' },
                { id: 3, title: '100. Tor', date: '1952-08-20', icon: 'fa-futbol' },
                { id: 4, title: 'Aufstieg in 1. Liga', date: '2020-05-10', icon: 'fa-arrow-up' }
            ]
        };
    }

    throw new Error('Unknown endpoint');
}

/**
 * Lade alle initialen Daten parallel
 * ✅ ES2025: Promise.allSettled für robuste parallele Operationen
 */
async function loadInitialData(teamId) {
    log.info('DataLoad', 'Loading initial data', { teamId });

    const endpoints = [
        { key: 'overview', endpoint: CONFIG.API.OVERVIEW.replace('{teamId}', teamId), cache: CONFIG.CACHE_DURATION.OVERVIEW },
        { key: 'stats', endpoint: CONFIG.API.STATS.replace('{teamId}', teamId), cache: CONFIG.CACHE_DURATION.STATS },
        { key: 'table', endpoint: CONFIG.API.TABLE.replace('{teamId}', teamId), cache: CONFIG.CACHE_DURATION.TABLE }
    ];

    const results = await Promise.allSettled(
        endpoints.map(({ endpoint, cache }) => fetchWithCache(endpoint, cache))
    );

    // ✅ Fail-Fast: Kritische Daten müssen vorhanden sein
    const criticalFailures = results
        .filter((result, idx) => result.status === 'rejected' && idx < 2); // Overview + Stats sind kritisch

    if (criticalFailures.length > 0) {
        const error = new TeamProfileDataError(
            'Failed to load critical team data',
            criticalFailures[0].reason
        );
        log.error('DataLoad', error);
        throw error;
    }

    // ✅ Graceful Degradation: Optionale Daten (Tabelle) können fehlen
    const tableResult = results[2];
    if (tableResult.status === 'rejected') {
        log.warn('DataLoad', 'Table data unavailable, using fallback', { cause: tableResult.reason });
    }

    return {
        overview: results[0].value,
        stats: results[1].value,
        table: tableResult.status === 'fulfilled' ? tableResult.value : null
    };
}

// =====================================================
// TEAM CARD RENDERING
// ✅ ES2025: DocumentFragment für optimale Performance
// =====================================================

/**
 * Rendere kompakte Teamkarte
 */
function renderTeamCard(overview, stats, table) {
    const container = document.getElementById('teamCard');

    if (!container) {
        throw new TeamProfileRenderError('Team card container not found');
    }

    // ✅ ES2025: DocumentFragment für minimale DOM-Manipulationen
    const fragment = document.createDocumentFragment();

    // Header Section
    const header = createTeamHeader(overview);
    fragment.appendChild(header);

    // Statistik-Badges
    const badges = createStatsBadges(overview, stats);
    fragment.appendChild(badges);

    // Mini-Tabelle (wenn verfügbar)
    if (table) {
        const miniTable = createMiniTable(table);
        fragment.appendChild(miniTable);
    }

    // Team-Statistiken Grid
    const statsGrid = createStatsGrid(stats);
    fragment.appendChild(statsGrid);

    container.innerHTML = '';
    container.appendChild(fragment);

    log.info('Render', 'Team card rendered successfully');
}

/**
 * Erstelle Team Header
 */
function createTeamHeader(overview) {
    const header = document.createElement('div');
    header.className = 'team-header';
    header.style.cssText = `
        text-align: center;
        padding: 2rem;
        background: linear-gradient(135deg, ${overview.colors.primary}, ${overview.colors.secondary});
        border-radius: 8px 8px 0 0;
        color: white;
    `;

    header.innerHTML = `
        <img src="${overview.logo}" 
             alt="${overview.name}" 
             class="team-logo lazy-load"
             width="80" 
             height="80"
             style="border-radius: 50%; margin-bottom: 1rem;">
        <h1 style="margin: 0; font-size: 2rem;">${overview.name}</h1>
        <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">Gegründet ${overview.founded}</p>
    `;

    return header;
}

/**
 * Erstelle Statistik-Badges
 */
function createStatsBadges(overview, stats) {
    const container = document.createElement('div');
    container.className = 'stats-badges';
    container.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 1rem;
        padding: 1rem;
        flex-wrap: wrap;
    `;

    const badges = [
        { label: overview.league, icon: 'fa-shield', color: '#3498db' },
        { label: `Platz ${overview.leaguePosition}`, icon: 'fa-ranking-star', color: '#9b59b6' },
        { label: `${overview.points} Punkte`, icon: 'fa-star', color: '#f39c12' }
    ];

    badges.forEach(badge => {
        const badgeEl = document.createElement('div');
        badgeEl.className = 'badge';
        badgeEl.style.cssText = `
            background: ${badge.color};
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
        `;

        badgeEl.innerHTML = `
            <i class="fa-solid ${badge.icon}"></i>
            <span>${badge.label}</span>
        `;

        container.appendChild(badgeEl);
    });

    return container;
}

/**
 * Erstelle Mini-Tabelle
 */
function createMiniTable(tableData) {
    const container = document.createElement('div');
    container.className = 'mini-table';
    container.style.cssText = `
        padding: 1rem;
        overflow-x: auto;
    `;

    const table = document.createElement('table');
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
    `;

    // Header
    table.innerHTML = `
        <thead>
            <tr style="background: #ecf0f1;">
                <th style="padding: 0.5rem; text-align: center;">Platz</th>
                <th style="padding: 0.5rem; text-align: left;">Team</th>
                <th style="padding: 0.5rem; text-align: center;">Sp.</th>
                <th style="padding: 0.5rem; text-align: center;">Pkt.</th>
            </tr>
        </thead>
    `;

    // Body
    const tbody = document.createElement('tbody');
    tableData.standings.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cssText = row.isOwnTeam
            ? 'background: #fff3cd; font-weight: bold;'
            : '';

        tr.innerHTML = `
            <td style="padding: 0.5rem; text-align: center;">${row.position}</td>
            <td style="padding: 0.5rem;">${row.team}</td>
            <td style="padding: 0.5rem; text-align: center;">${row.games}</td>
            <td style="padding: 0.5rem; text-align: center;">${row.points}</td>
        `;

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
}

/**
 * Erstelle Statistik-Grid
 */
function createStatsGrid(stats) {
    const container = document.createElement('div');
    container.className = 'stats-grid';
    container.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        padding: 1rem;
        background: #f8f9fa;
    `;

    const statItems = [
        { label: 'Siege', value: stats.wins, icon: 'fa-trophy', color: '#27ae60' },
        { label: 'Unentschieden', value: stats.draws, icon: 'fa-handshake', color: '#f39c12' },
        { label: 'Niederlagen', value: stats.losses, icon: 'fa-times', color: '#e74c3c' },
        { label: 'Tore geschossen', value: stats.goalsScored, icon: 'fa-futbol', color: '#3498db' },
        { label: 'Tore kassiert', value: stats.goalsConceded, icon: 'fa-shield', color: '#e67e22' },
        { label: 'Tordifferenz', value: stats.goalDifference > 0 ? `+${stats.goalDifference}` : stats.goalDifference, icon: 'fa-chart-line', color: '#9b59b6' },
        { label: 'Kadergröße', value: stats.squadSize, icon: 'fa-users', color: '#34495e' },
        { label: 'Durchschnittsalter', value: stats.averageAge.toFixed(1), icon: 'fa-calendar', color: '#16a085' },
        { label: 'Teamstärke', value: stats.teamStrength, icon: 'fa-bolt', color: '#d35400' }
    ];

    statItems.forEach(stat => {
        const item = document.createElement('div');
        item.className = 'stat-item';
        item.style.cssText = `
            background: white;
            padding: 1rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        item.innerHTML = `
            <i class="fa-solid ${stat.icon}" style="font-size: 1.5rem; color: ${stat.color};"></i>
            <div>
                <div style="font-size: 0.875rem; color: #7f8c8d;">${stat.label}</div>
                <div style="font-size: 1.25rem; font-weight: bold;">${stat.value}</div>
            </div>
        `;

        container.appendChild(item);
    });

    return container;
}

// =====================================================
// TAB NAVIGATION
// ✅ ES2025: History API + Keyboard Navigation
// =====================================================

/**
 * Initialisiere Tab-Navigation
 */
function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContainer = document.querySelector('.tab-navigation');

    if (!tabContainer) {
        log.warn('TabNavigation', 'Tab container not found');
        return;
    }

    // Event Delegation für Tab-Clicks
    addEventListener(tabContainer, 'click', (e) => {
        const button = e.target.closest('.tab-button');
        if (!button) return;

        const tabName = button.dataset.tab;
        if (tabName && CONFIG.TABS.includes(tabName)) {
            switchTab(tabName);
        }
    });

    // ✅ ES2025: Keyboard Navigation
    tabButtons.forEach((button, index) => {
        // Arrow Key Navigation
        addEventListener(button, 'keydown', (e) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                const nextIndex = (index + 1) % tabButtons.length;
                tabButtons[nextIndex].focus();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevIndex = (index - 1 + tabButtons.length) % tabButtons.length;
                tabButtons[prevIndex].focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                button.click();
            }
        });
    });

    log.info('TabNavigation', 'Tab navigation initialized');
}

/**
 * Wechsle aktiven Tab
 * ✅ ES2025: History API Integration
 */
async function switchTab(tabName) {
    if (currentTab === tabName) return;

    log.info('TabSwitch', `Switching to tab: ${tabName}`);

    try {
        // Update UI
        updateTabUI(tabName);

        // Lazy Load Content
        await loadTabContent(tabName);

        // Update History
        const url = new URL(window.location);
        url.searchParams.set('tab', tabName);
        window.history.pushState({ tab: tabName }, '', url);

        currentTab = tabName;

        log.info('TabSwitch', `Tab switched successfully to: ${tabName}`);

    } catch (error) {
        const contextError = new TeamProfileRenderError(
            `Failed to switch to tab: ${tabName}`,
            error
        );
        log.error('TabSwitch', contextError);
        showErrorMessage('Fehler beim Laden des Tab-Inhalts');
    }
}

/**
 * Update Tab UI (Active States)
 */
function updateTabUI(tabName) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        const isActive = button.dataset.tab === tabName;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive);
        button.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    tabPanels.forEach(panel => {
        const isActive = panel.dataset.tab === tabName;
        panel.classList.toggle('active', isActive);
        panel.setAttribute('aria-hidden', !isActive);

        // ✅ Fade-In Animation
        if (isActive) {
            panel.style.opacity = '0';
            requestAnimationFrame(() => {
                panel.style.transition = `opacity ${CONFIG.FADE_TRANSITION_MS}ms`;
                panel.style.opacity = '1';
            });
        }
    });
}

/**
 * Lade Tab-spezifischen Content
 * ✅ ES2025: Lazy Loading nur wenn notwendig
 */
async function loadTabContent(tabName) {
    const teamId = teamConfig?.id || 1;

    switch (tabName) {
        case 'overview':
            await renderOverviewTab(teamId);
            break;
        case 'squad':
            await renderSquadTab(teamId);
            break;
        case 'achievements':
            await renderAchievementsTab(teamId);
            break;
        default:
            log.warn('TabContent', `Unknown tab: ${tabName}`);
    }
}

// =====================================================
// TAB CONTENT RENDERERS
// =====================================================

/**
 * Rendere Übersicht-Tab
 */
async function renderOverviewTab(teamId) {
    const container = document.getElementById('overviewContent');
    if (!container) return;

    try {
        const [formResult, nextMatchResult] = await Promise.allSettled([
            fetchWithCache(
                CONFIG.API.RECENT_FORM.replace('{teamId}', teamId),
                CONFIG.CACHE_DURATION.STATS
            ),
            fetchWithCache(
                CONFIG.API.NEXT_MATCH.replace('{teamId}', teamId),
                CONFIG.CACHE_DURATION.STATS
            )
        ]);

        const fragment = document.createDocumentFragment();

        // Aktuelle Form
        if (formResult.status === 'fulfilled') {
            const formSection = createFormSection(formResult.value);
            fragment.appendChild(formSection);
        }

        // Nächstes Spiel
        if (nextMatchResult.status === 'fulfilled') {
            const nextMatchSection = createNextMatchSection(nextMatchResult.value);
            fragment.appendChild(nextMatchSection);
        }

        container.innerHTML = '';
        container.appendChild(fragment);

    } catch (error) {
        log.error('OverviewTab', error);
        container.innerHTML = '<p class="error-message">Fehler beim Laden der Übersicht</p>';
    }
}

/**
 * Erstelle Form-Sektion (Letzte 5 Spiele)
 */
function createFormSection(formData) {
    const section = document.createElement('div');
    section.className = 'form-section';
    section.style.cssText = `
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    `;

    const header = document.createElement('h2');
    header.textContent = 'Aktuelle Form';
    header.style.cssText = 'margin: 0 0 1rem 0; font-size: 1.5rem;';
    section.appendChild(header);

    const formIcons = document.createElement('div');
    formIcons.className = 'form-icons';
    formIcons.style.cssText = `
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
    `;

    formData.recentMatches.forEach(match => {
        const icon = document.createElement('div');
        icon.className = 'form-icon';

        let symbol, color, title;
        if (match.result === 'win') {
            symbol = '✓';
            color = '#27ae60';
            title = `Sieg gegen ${match.opponent} (${match.score})`;
        } else if (match.result === 'draw') {
            symbol = '−';
            color = '#f39c12';
            title = `Unentschieden gegen ${match.opponent} (${match.score})`;
        } else {
            symbol = '✗';
            color = '#e74c3c';
            title = `Niederlage gegen ${match.opponent} (${match.score})`;
        }

        icon.style.cssText = `
            width: 40px;
            height: 40px;
            background: ${color};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 1.5rem;
            font-weight: bold;
            flex-shrink: 0;
            cursor: help;
        `;

        icon.textContent = symbol;
        icon.title = title;

        formIcons.appendChild(icon);
    });

    section.appendChild(formIcons);

    return section;
}

/**
 * Erstelle Nächstes-Spiel-Sektion
 */
function createNextMatchSection(matchData) {
    const section = document.createElement('div');
    section.className = 'next-match-section';
    section.style.cssText = `
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
    `;

    const header = document.createElement('h2');
    header.textContent = 'Nächstes Spiel';
    header.style.cssText = 'margin: 0 0 1rem 0; font-size: 1.5rem;';
    section.appendChild(header);

    const matchInfo = document.createElement('div');
    matchInfo.style.cssText = `
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
    `;

    matchInfo.innerHTML = `
        <img src="${matchData.opponentLogo}" 
             alt="${matchData.opponent}" 
             class="lazy-load"
             width="60" 
             height="60"
             style="border-radius: 8px;">
        <div style="flex: 1;">
            <h3 style="margin: 0 0 0.5rem 0;">${matchData.opponent}</h3>
            <p style="margin: 0; color: #7f8c8d;">
                <i class="fa-solid fa-calendar"></i> ${matchData.date} - ${matchData.time}
            </p>
            <p style="margin: 0.25rem 0 0 0; color: #7f8c8d;">
                <i class="fa-solid fa-location-dot"></i> ${matchData.venue === 'home' ? 'Heimspiel' : 'Auswärtsspiel'} - ${matchData.stadium}
            </p>
        </div>
        <button class="btn-primary" data-action="prepare-lineup">
            Aufstellung vorbereiten
        </button>
    `;

    section.appendChild(matchInfo);

    return section;
}

/**
 * Rendere Kader-Tab
 */
async function renderSquadTab(teamId) {
    const container = document.getElementById('squadContent');
    if (!container) return;

    try {
        const squadResult = await fetchWithCache(
            CONFIG.API.SQUAD.replace('{teamId}', teamId),
            CONFIG.CACHE_DURATION.STATS
        );

        squadData = squadResult.players;

        // Render Filter Controls
        const controls = createSquadControls();

        // Render Player Table
        const table = createPlayerTable(squadData);

        container.innerHTML = '';
        container.appendChild(controls);
        container.appendChild(table);

        // Render Stats
        const stats = createSquadStats(squadData);
        container.appendChild(stats);

    } catch (error) {
        log.error('SquadTab', error);
        container.innerHTML = '<p class="error-message">Fehler beim Laden des Kaders</p>';
    }
}

/**
 * Erstelle Kader-Filter-Controls
 */
function createSquadControls() {
    const controls = document.createElement('div');
    controls.className = 'squad-controls';
    controls.style.cssText = `
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    `;

    // Position Filter
    const positionSelect = document.createElement('select');
    positionSelect.id = 'positionFilter';
    positionSelect.style.cssText = 'padding: 0.5rem; border-radius: 4px; border: 1px solid #ddd;';
    positionSelect.innerHTML = `
        <option value="all">Alle Positionen</option>
        <option value="GK">Torwart</option>
        <option value="DF">Abwehr</option>
        <option value="MF">Mittelfeld</option>
        <option value="FW">Sturm</option>
    `;

    // Search Input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'squadSearch';
    searchInput.placeholder = 'Spieler suchen...';
    searchInput.style.cssText = 'padding: 0.5rem; border-radius: 4px; border: 1px solid #ddd; flex: 1; min-width: 200px;';

    controls.appendChild(positionSelect);
    controls.appendChild(searchInput);

    // Event Listeners
    addEventListener(positionSelect, 'change', () => {
        squadFilters.position = positionSelect.value;
        updatePlayerTable();
    });

    addEventListener(searchInput, 'input', () => {
        squadFilters.searchTerm = searchInput.value.toLowerCase();
        updatePlayerTable();
    });

    return controls;
}

/**
 * Erstelle Spieler-Tabelle
 */
function createPlayerTable(players) {
    const tableContainer = document.createElement('div');
    tableContainer.id = 'playerTableContainer';
    tableContainer.style.cssText = 'overflow-x: auto;';

    const table = document.createElement('table');
    table.className = 'player-table';
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 8px;
        overflow: hidden;
    `;

    // Header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr style="background: #ecf0f1;">
            <th data-sort="number" style="padding: 0.75rem; cursor: pointer;">#</th>
            <th data-sort="name" style="padding: 0.75rem; cursor: pointer; text-align: left;">Name</th>
            <th data-sort="position" style="padding: 0.75rem; cursor: pointer;">Position</th>
            <th data-sort="age" style="padding: 0.75rem; cursor: pointer;">Alter</th>
            <th data-sort="strength" style="padding: 0.75rem; cursor: pointer;">Stärke</th>
            <th data-sort="form" style="padding: 0.75rem; cursor: pointer;">Form</th>
        </tr>
    `;

    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    tbody.id = 'playerTableBody';

    const filteredPlayers = filterPlayers(players);
    const sortedPlayers = sortPlayers(filteredPlayers);

    sortedPlayers.forEach(player => {
        const tr = document.createElement('tr');
        tr.className = 'player-row';
        tr.dataset.playerId = player.id;
        tr.style.cssText = 'cursor: pointer; transition: background 0.2s;';

        tr.innerHTML = `
            <td style="padding: 0.75rem; text-align: center;">${player.number}</td>
            <td style="padding: 0.75rem;">${player.name}</td>
            <td style="padding: 0.75rem; text-align: center;">${player.position}</td>
            <td style="padding: 0.75rem; text-align: center;">${player.age}</td>
            <td style="padding: 0.75rem; text-align: center; font-weight: bold;">${player.strength}</td>
            <td style="padding: 0.75rem; text-align: center;">${player.form}</td>
        `;

        // Hover Effect
        addEventListener(tr, 'mouseenter', () => {
            tr.style.background = '#f8f9fa';
        });

        addEventListener(tr, 'mouseleave', () => {
            tr.style.background = 'white';
        });

        // Click Handler
        addEventListener(tr, 'click', () => {
            log.info('PlayerClick', `Player clicked: ${player.name}`, { playerId: player.id });
            // TODO: Navigate to player profile
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);

    // Sort Header Listeners
    const headers = thead.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        addEventListener(header, 'click', () => {
            const column = header.dataset.sort;
            handleSort(column);
        });
    });

    return tableContainer;
}

/**
 * Filter Spieler nach aktuellen Filtern
 */
function filterPlayers(players) {
    return players.filter(player => {
        // Position Filter
        if (squadFilters.position !== 'all' && player.position !== squadFilters.position) {
            return false;
        }

        // Search Filter
        return !(squadFilters.searchTerm && !player.name.toLowerCase().includes(squadFilters.searchTerm));


    });
}

/**
 * Sortiere Spieler nach aktueller Sort-Config
 */
function sortPlayers(players) {
    const sorted = [...players].sort((a, b) => {
        const aVal = a[sortConfig.column];
        const bVal = b[sortConfig.column];

        if (typeof aVal === 'string') {
            return sortConfig.ascending
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }

        return sortConfig.ascending
            ? aVal - bVal
            : bVal - aVal;
    });

    return sorted;
}

/**
 * Handle Sort Column Click
 */
function handleSort(column) {
    if (sortConfig.column === column) {
        sortConfig.ascending = !sortConfig.ascending;
    } else {
        sortConfig.column = column;
        sortConfig.ascending = true;
    }

    updatePlayerTable();
}

/**
 * Update Player Table (nach Filter/Sort Änderung)
 */
function updatePlayerTable() {
    const tbody = document.getElementById('playerTableBody');
    if (!tbody) return;

    const filteredPlayers = filterPlayers(squadData);
    const sortedPlayers = sortPlayers(filteredPlayers);

    tbody.innerHTML = '';

    sortedPlayers.forEach(player => {
        const tr = document.createElement('tr');
        tr.className = 'player-row';
        tr.dataset.playerId = player.id;
        tr.style.cssText = 'cursor: pointer; transition: background 0.2s;';

        tr.innerHTML = `
            <td style="padding: 0.75rem; text-align: center;">${player.number}</td>
            <td style="padding: 0.75rem;">${player.name}</td>
            <td style="padding: 0.75rem; text-align: center;">${player.position}</td>
            <td style="padding: 0.75rem; text-align: center;">${player.age}</td>
            <td style="padding: 0.75rem; text-align: center; font-weight: bold;">${player.strength}</td>
            <td style="padding: 0.75rem; text-align: center;">${player.form}</td>
        `;

        addEventListener(tr, 'mouseenter', () => {
            tr.style.background = '#f8f9fa';
        });

        addEventListener(tr, 'mouseleave', () => {
            tr.style.background = 'white';
        });

        addEventListener(tr, 'click', () => {
            log.info('PlayerClick', `Player clicked: ${player.name}`, { playerId: player.id });
        });

        tbody.appendChild(tr);
    });
}

/**
 * Erstelle Kader-Statistiken
 */
function createSquadStats(players) {
    const stats = document.createElement('div');
    stats.className = 'squad-stats';
    stats.style.cssText = `
        margin-top: 1.5rem;
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
    `;

    // Berechne Aggregationen
    const avgStrength = (players.reduce((sum, p) => sum + p.strength, 0) / players.length).toFixed(1);

    const positionCounts = players.reduce((acc, p) => {
        acc[p.position] = (acc[p.position] || 0) + 1;
        return acc;
    }, {});

    const ageGroups = {
        'U21': players.filter(p => p.age < 21).length,
        '21-28': players.filter(p => p.age >= 21 && p.age <= 28).length,
        '28+': players.filter(p => p.age > 28).length
    };

    stats.innerHTML = `
        <h3 style="margin: 0 0 1rem 0;">Kader-Statistiken</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
                <strong>Durchschnittliche Stärke:</strong> ${avgStrength}
            </div>
            <div>
                <strong>Positionsverteilung:</strong><br>
                ${Object.entries(positionCounts).map(([pos, count]) => `${pos}: ${count}`).join(', ')}
            </div>
            <div>
                <strong>Altersstruktur:</strong><br>
                ${Object.entries(ageGroups).map(([group, count]) => `${group}: ${count}`).join(', ')}
            </div>
        </div>
    `;

    return stats;
}

/**
 * Rendere Erfolge-Tab
 */
async function renderAchievementsTab(teamId) {
    const container = document.getElementById('achievementsContent');
    if (!container) return;

    try {
        const achievementsData = await fetchWithCache(
            CONFIG.API.ACHIEVEMENTS.replace('{teamId}', teamId),
            CONFIG.CACHE_DURATION.OVERVIEW
        );

        const fragment = document.createDocumentFragment();

        // Pokalschrank
        if (achievementsData.trophies && achievementsData.trophies.length > 0) {
            const trophyCase = createTrophyCase(achievementsData.trophies);
            fragment.appendChild(trophyCase);
        } else {
            const placeholder = createTrophyPlaceholder();
            fragment.appendChild(placeholder);
        }

        // Historische Platzierungen
        if (achievementsData.historicalPositions) {
            const history = createHistoricalPositions(achievementsData.historicalPositions);
            fragment.appendChild(history);
        }

        // Meilensteine
        if (achievementsData.milestones) {
            const milestones = createMilestones(achievementsData.milestones);
            fragment.appendChild(milestones);
        }

        container.innerHTML = '';
        container.appendChild(fragment);

    } catch (error) {
        log.error('AchievementsTab', error);
        container.innerHTML = '<p class="error-message">Fehler beim Laden der Erfolge</p>';
    }
}

/**
 * Erstelle Pokalschrank
 */
function createTrophyCase(trophies) {
    const section = document.createElement('div');
    section.className = 'trophy-case';
    section.style.cssText = `
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    `;

    const header = document.createElement('h2');
    header.textContent = 'Pokalschrank';
    header.style.cssText = 'margin: 0 0 1rem 0; font-size: 1.5rem;';
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 1rem;
    `;

    trophies.forEach(trophy => {
        const item = document.createElement('div');
        item.className = 'trophy-item';
        item.style.cssText = `
            text-align: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
            cursor: help;
        `;

        item.innerHTML = `
            <i class="fa-solid ${trophy.icon}" style="font-size: 3rem; color: #f39c12;"></i>
            <p style="margin: 0.5rem 0 0 0; font-weight: bold;">${trophy.year}</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #7f8c8d;">${trophy.competition}</p>
        `;

        item.title = `${trophy.competition} ${trophy.year}`;

        grid.appendChild(item);
    });

    section.appendChild(grid);

    return section;
}

/**
 * Erstelle Trophy Placeholder
 */
function createTrophyPlaceholder() {
    const section = document.createElement('div');
    section.className = 'trophy-placeholder';
    section.style.cssText = `
        background: white;
        padding: 3rem;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 1rem;
    `;

    section.innerHTML = `
        <i class="fa-solid fa-trophy" style="font-size: 4rem; color: #bdc3c7; opacity: 0.5;"></i>
        <h3 style="margin: 1rem 0 0.5rem 0; color: #7f8c8d;">Noch keine Erfolge</h3>
        <p style="margin: 0; color: #95a5a6;">Arbeite hart und gewinne deinen ersten Titel!</p>
    `;

    return section;
}

/**
 * Erstelle Historische Platzierungen
 */
function createHistoricalPositions(positions) {
    const section = document.createElement('div');
    section.className = 'historical-positions';
    section.style.cssText = `
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    `;

    const header = document.createElement('h2');
    header.textContent = 'Historische Platzierungen';
    header.style.cssText = 'margin: 0 0 1rem 0; font-size: 1.5rem;';
    section.appendChild(header);

    // Simple table representation (chart would be better, but requires library)
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse;';

    table.innerHTML = `
        <thead>
            <tr style="background: #ecf0f1;">
                <th style="padding: 0.5rem; text-align: left;">Saison</th>
                <th style="padding: 0.5rem; text-align: center;">Platzierung</th>
                <th style="padding: 0.5rem; text-align: center;">Punkte</th>
            </tr>
        </thead>
        <tbody>
            ${positions.map(pos => `
                <tr>
                    <td style="padding: 0.5rem;">${pos.season}</td>
                    <td style="padding: 0.5rem; text-align: center; font-weight: bold;">${pos.position}</td>
                    <td style="padding: 0.5rem; text-align: center;">${pos.points}</td>
                </tr>
            `).join('')}
        </tbody>
    `;

    section.appendChild(table);

    return section;
}

/**
 * Erstelle Meilensteine
 */
function createMilestones(milestones) {
    const section = document.createElement('div');
    section.className = 'milestones';
    section.style.cssText = `
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
    `;

    const header = document.createElement('h2');
    header.textContent = 'Meilensteine';
    header.style.cssText = 'margin: 0 0 1rem 0; font-size: 1.5rem;';
    section.appendChild(header);

    const timeline = document.createElement('div');
    timeline.className = 'timeline';
    timeline.style.cssText = 'position: relative; padding-left: 2rem;';

    milestones.forEach((milestone, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.style.cssText = `
            position: relative;
            padding-bottom: ${index < milestones.length - 1 ? '1.5rem' : '0'};
        `;

        item.innerHTML = `
            <div style="
                position: absolute;
                left: -2rem;
                width: 2rem;
                height: 2rem;
                background: #3498db;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            ">
                <i class="fa-solid ${milestone.icon}" style="font-size: 0.875rem;"></i>
            </div>
            <div style="padding-left: 0.5rem;">
                <strong>${milestone.title}</strong>
                <p style="margin: 0.25rem 0 0 0; color: #7f8c8d; font-size: 0.875rem;">${milestone.date}</p>
            </div>
        `;

        // Connecting line (except for last item)
        if (index < milestones.length - 1) {
            const line = document.createElement('div');
            line.style.cssText = `
                position: absolute;
                left: -1rem;
                top: 2rem;
                width: 2px;
                height: calc(100% - 2rem);
                background: #bdc3c7;
            `;
            item.appendChild(line);
        }

        timeline.appendChild(item);
    });

    section.appendChild(timeline);

    return section;
}

// =====================================================
// LAZY LOADING FOR IMAGES
// ✅ ES2025: Intersection Observer
// =====================================================

/**
 * Initialisiere Lazy Loading für Bilder
 */
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: CONFIG.IMAGE_LAZY_LOAD_ROOT_MARGIN
        });

        // Observe alle lazy-load Bilder
        document.querySelectorAll('img.lazy-load').forEach(img => {
            imageObserver.observe(img);
        });

        log.info('LazyLoad', 'Image lazy loading initialized');
    } else {
        // Fallback: Load all images immediately
        document.querySelectorAll('img.lazy-load').forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            }
        });
    }
}

// =====================================================
// RESPONSIVE HANDLING
// ✅ ES2025: Debounced Resize Handler
// =====================================================

/**
 * Handle Resize Events (mit Debouncing)
 */
function handleResize() {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
        log.info('Resize', 'Window resized, re-rendering responsive elements');

        // Re-render responsive elements if needed
        // (Currently no specific responsive logic, but prepared for future)

    }, CONFIG.RESIZE_DEBOUNCE_MS);
}

// =====================================================
// ERROR HANDLING
// =====================================================

/**
 * Zeige Error Message
 */
function showErrorMessage(message) {
    const container = document.getElementById('teamProfileContainer');
    if (!container) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #fee;
        border: 1px solid #fcc;
        color: #c33;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    `;

    errorDiv.innerHTML = `
        <i class="fa-solid fa-exclamation-triangle"></i>
        <span style="margin-left: 0.5rem;">${message}</span>
    `;

    container.insertBefore(errorDiv, container.firstChild);
}

// =====================================================
// INITIALIZATION
// ✅ ES2025: Strukturierte Init mit Error Handling
// EXPORT für ModuleManager
// =====================================================

/**
 * Initialisiere Team Profile Module
 */
export async function init() {
    try {
        log.info('Init', 'Team profile module initialization started');

        // ✅ ES2025: Neuer AbortController für diese Session
        profileAbortController = new AbortController();

        // Load Team ID (mockup: use 1)
        const teamId = 1;

        // ✅ ES2025: Paralleles Laden kritischer Daten
        const initialData = await loadInitialData(teamId);

        // ✅ Setze immutable Config
        teamConfig = Object.freeze({
            id: initialData.overview.id,
            name: initialData.overview.name,
            logo: initialData.overview.logo
        });

        // Render Team Card
        renderTeamCard(initialData.overview, initialData.stats, initialData.table);

        // Initialize Tab Navigation
        initTabNavigation();

        // Load Initial Tab from URL or default
        const urlParams = new URLSearchParams(window.location.search);
        const initialTab = urlParams.get('tab') || CONFIG.DEFAULT_TAB;

        if (CONFIG.TABS.includes(initialTab)) {
            await switchTab(initialTab);
        } else {
            await switchTab(CONFIG.DEFAULT_TAB);
        }

        // Initialize Lazy Loading
        initLazyLoading();

        // Window Resize Handler
        addEventListener(window, 'resize', handleResize);

        // Browser Back/Forward Navigation
        addEventListener(window, 'popstate', (e) => {
            if (e.state?.tab) {
                void switchTab(e.state.tab);
            }
        });

        log.info('Init', 'Team profile module initialization completed', {
            teamId: teamConfig.id,
            initialTab
        });

    } catch (error) {
        const contextError = new Error('Team profile module initialization failed');
        contextError.cause = error;
        log.error('Init', contextError);
        throw contextError; // ✅ Fail-Fast: Bubble up to navigation.js
    }
}

// =====================================================
// CLEANUP
// ✅ ES2025: AbortController + Manual Fallback
// EXPORT für ModuleManager
// =====================================================

/**
 * Cleanup beim Verlassen des Moduls
 */
export function cleanup() {
    try {
        log.info('Cleanup', 'Team profile module cleanup started');

        // ✅ ES2025: AbortController entfernt alle Listener auf einmal
        profileAbortController.abort();

        // ✅ FALLBACK: Manuelles Cleanup
        eventListeners.forEach(({ element, event, handler, options }) => {
            if (element) {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (e) {
                    // Listener war bereits entfernt
                }
            }
        });
        eventListeners.length = 0;

        // Cleanup Intersection Observer
        if (imageObserver) {
            imageObserver.disconnect();
            imageObserver = null;
        }

        // Clear Timers
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
            resizeTimeout = null;
        }

        // Reset State
        currentTab = CONFIG.DEFAULT_TAB;
        squadData = [];
        squadFilters = { position: 'all', searchTerm: '' };
        sortConfig = { column: 'number', ascending: true };
        dataCache.clear();
        teamConfig = null;

        log.info('Cleanup', 'Team profile module cleanup completed');

    } catch (error) {
        const contextError = new Error('Team profile module cleanup failed');
        contextError.cause = error;
        log.error('Cleanup', contextError);
        // Don't throw in cleanup - log and continue
    }
}

// =====================================================
// ES2025 IMPROVEMENTS SUMMARY
// =====================================================
/*
✅ Custom Error Classes - TeamProfileDataError, TeamProfileRenderError
✅ Error Causes - Vollständige Error-Ketten für Debugging
✅ Promise.allSettled - Robuste parallele Operationen
✅ AbortController - Automatisches Event Cleanup
✅ Object.freeze - Immutable Configuration
✅ Fail-Fast + Graceful Degradation - Kritische vs. optionale Daten
✅ Cache Strategy - Smart Caching mit Timestamps
✅ Lazy Loading - Intersection Observer für Bilder
✅ Debouncing - Performance-optimiertes Resize Handling
✅ History API - Browser Back/Forward Navigation
✅ Keyboard Navigation - Accessibility für Tabs
✅ DocumentFragment - Minimale DOM-Manipulationen
✅ Structured Logging - Konsistentes Logging-Pattern
*/