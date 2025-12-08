// =====================================================
// KICKERSCUP - FINANCE MODULE (ESM) - ES2025 MODERNIZED
// Finanzverwaltung mit Charts, Prognosen und Timeline
// ✅ ES2025: AbortController für Event Cleanup
// ✅ ES2025: Promise.allSettled für robuste Operationen
// ✅ ES2025: Error Causes für strukturiertes Error Handling
// ✅ ES2025: Object.freeze für Immutability
// ✅ ES2025: Optional Chaining & Nullish Coalescing
// ✅ Timeline-View für Transaktionen mit Filter & Suche
// =====================================================

// =====================================================
// STATE MANAGEMENT
// =====================================================

// ✅ ES2025: AbortController für Event Cleanup
let financeAbortController = new AbortController();

// ✅ ES2025: Immutable Timeline State Structure
const timelineState = {
    isOpen: false,
    currentFilters: {
        timeframe: 'current',
        type: 'all',
        category: 'all',
        search: ''
    },
    allTransactions: [],
    filteredTransactions: []
};

// Debounce Timeout Management
let searchDebounceTimeout = null;

// =====================================================
// CATEGORY CONFIGURATION (ES2025 Immutable)
// ✅ Zentralisiert, wiederverwendbar, eingefroren
// =====================================================

const CATEGORY_ICONS = Object.freeze({
    // Income Categories
    zuschauer: '🏟️',
    praemien: '🏆',
    sponsoren: '🤝',
    transfers_in: '🔄',
    sonstige_in: '📦',
    // Expense Categories
    gehaelter: '💰',
    transfers_out: '🔄',
    stadion: '🏗️',
    sonstige_out: '📋'
});

const CATEGORY_LABELS = Object.freeze({
    // Income Categories
    zuschauer: 'Zuschauereinnahmen',
    praemien: 'Prämieneinnahmen',
    sponsoren: 'Sponsoreneinnahmen',
    transfers_in: 'Transfereinnahmen',
    sonstige_in: 'Sonstige Einnahmen',
    // Expense Categories
    gehaelter: 'Spielergehälter',
    transfers_out: 'Transferausgaben',
    stadion: 'Stadionausbau',
    sonstige_out: 'Sonstige Ausgaben'
});

// =====================================================
// MOCK DATA (ES2025 Immutable)
// ✅ Deep freeze für vollständige Immutability
// =====================================================

const MOCK_DATA = Object.freeze({
    capital: Object.freeze({
        current: 2485750,
        lastMonth: 2250000,
        history: Object.freeze([
            Object.freeze({month: 'Aug 2024', value: 2000000}),
            Object.freeze({month: 'Sep 2024', value: 2100000}),
            Object.freeze({month: 'Okt 2024', value: 2300000}),
            Object.freeze({month: 'Nov 2024', value: 2200000}),
            Object.freeze({month: 'Dez 2024', value: 2500000}),
            Object.freeze({month: 'Jan 2025', value: 2700000})
        ])
    }),
    season: Object.freeze({
        month: 'Dezember 2024',
        currentDay: 15,
        totalDays: 27,
        income: 980000,
        expenses: 520000
    }),
    categories: Object.freeze({
        income: Object.freeze({
            zuschauer: Object.freeze({amount: 450000, count: 8, label: 'Heimspiele'}),
            praemien: Object.freeze({amount: 280000, count: 12, label: 'Prämien'}),
            sponsoren: Object.freeze({amount: 180000, count: 3, label: 'Raten'}),
            transfers_in: Object.freeze({amount: 50000, count: 1, label: 'Verkauf'}),
            sonstige_in: Object.freeze({amount: 20000, count: 4, label: 'Buchungen'})
        }),
        expenses: Object.freeze({
            gehaelter: Object.freeze({amount: 405000, count: 15, label: 'Tage'}),
            transfers_out: Object.freeze({amount: 65000, count: 1, label: 'Einkauf'}),
            stadion: Object.freeze({amount: 30000, count: 1, label: 'Projekt'}),
            sonstige_out: Object.freeze({amount: 20000, count: 3, label: 'Buchungen'})
        })
    }),
    forecast: Object.freeze({
        income: Object.freeze({
            zuschauer: Object.freeze({amount: 233100, count: 3, label: 'Spiele'}),
            sponsoren: Object.freeze({amount: 30000, count: 2, label: 'Raten'}),
            praemien: Object.freeze({amount: 224000, count: 0, label: 'geschätzt', estimated: true})
        }),
        expenses: Object.freeze({
            gehaelter: Object.freeze({amount: 331200, count: 12, label: 'Tage'}),
            sonstige_out: Object.freeze({amount: 16000, count: 0, label: 'geschätzt', estimated: true})
        }),
        result: Object.freeze({
            finalCapital: 2625650,
            expectedProfit: 139900,
            seasonTotal: 599900
        }),
        confidence: 0.85
    }),
    // Transactions werden dynamisch generiert (nicht frozen)
    transactions: generateMockTransactions()
});

// =====================================================
// MOCK TRANSACTION GENERATOR
// =====================================================

/**
 * Generiert Mock-Transaktionen für die Timeline
 * @returns {Array<Object>} Array von Transaction-Objekten
 */
function generateMockTransactions() {
    const transactions = [];

    // Tag 1-15 der aktuellen Saison
    for (let day = 1; day <= 15; day++) {
        const date = `2024-12-${String(day).padStart(2, '0')}`;

        // Gehälter jeden Tag
        transactions.push({
            id: `t_${day}_1`,
            date: date,
            time: '00:00',
            type: 'expense',
            category: 'gehaelter',
            title: 'Tägliche Spielergehälter',
            description: '25 Spieler',
            amount: -27000
        });

        // Heimspiel alle 2 Tage
        if (day % 2 === 0) {
            transactions.push({
                id: `t_${day}_2`,
                date: date,
                time: '20:30',
                type: 'income',
                category: 'zuschauer',
                title: 'Heimspiel Zuschauereinnahmen',
                description: `Zuschauer: ${45000 + Math.floor(Math.random() * 10000)}`,
                amount: 50000 + Math.floor(Math.random() * 20000)
            });
        }

        // Prämien zufällig
        if (day % 3 === 0) {
            transactions.push({
                id: `t_${day}_3`,
                date: date,
                time: '23:00',
                type: 'income',
                category: 'praemien',
                title: 'Siegprämie',
                description: 'Auswärtssieg 2:1',
                amount: 15000 + Math.floor(Math.random() * 10000)
            });
        }

        // Sponsoren alle 5 Tage
        if (day % 5 === 0) {
            transactions.push({
                id: `t_${day}_4`,
                date: date,
                time: '12:00',
                type: 'income',
                category: 'sponsoren',
                title: 'Sponsorenrate',
                description: 'Hauptsponsor - Monatliche Rate',
                amount: 60000
            });
        }

        // Zufällige Ausgaben
        if (day === 3) {
            transactions.push({
                id: `t_${day}_5`,
                date: date,
                time: '14:30',
                type: 'expense',
                category: 'stadion',
                title: 'Stadionwartung',
                description: 'Rasenpflege und Instandhaltung',
                amount: -30000
            });
        }

        if (day === 7) {
            transactions.push({
                id: `t_${day}_6`,
                date: date,
                time: '11:00',
                type: 'expense',
                category: 'transfers_out',
                title: 'Spielerkauf',
                description: 'Max Müller - Mittelfeld',
                amount: -65000
            });
        }

        if (day === 10) {
            transactions.push({
                id: `t_${day}_7`,
                date: date,
                time: '16:45',
                type: 'income',
                category: 'transfers_in',
                title: 'Spielerverkauf',
                description: 'Tom Schmidt - Abwehr',
                amount: 50000
            });
        }
    }

    // Sortiere nach Datum/Zeit (neueste zuerst)
    return transactions.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB - dateA;
    });
}

// =====================================================
// HELPER FUNCTIONS (ES2025 Enhanced)
// =====================================================

/**
 * Formatiert Zahlen als Währung
 * ✅ ES2025: Enhanced JSDoc mit vollständigen Type Annotations
 *
 * @param {number} amount - Betrag in Cent oder kleinster Währungseinheit
 * @param {boolean} [showSign=false] - Zeigt + bei positiven Beträgen
 * @returns {string} Formatierte Währungszeichenkette (z.B. "1.234,56 €")
 */
const formatCurrency = (amount, showSign = false) => {
    const formatted = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount));

    if (showSign && amount > 0) {
        return `+${formatted}`;
    } else if (amount < 0) {
        return `-${formatted}`;
    }
    return formatted;
};

/**
 * Berechnet prozentuale Veränderung
 * ✅ ES2025: Enhanced JSDoc
 *
 * @param {number} current - Aktueller Wert
 * @param {number} previous - Vorheriger Wert
 * @returns {string} Prozentuale Änderung als String mit 1 Dezimalstelle
 */
const calculatePercentChange = (current, previous) => {
    if (previous === 0) return '0.0';
    return ((current - previous) / previous * 100).toFixed(1);
};

/**
 * Formatiert Datum für Anzeige
 * ✅ ES2025: Enhanced JSDoc
 *
 * @param {string} dateString - ISO Datumsstring (YYYY-MM-DD)
 * @returns {string} Formatiertes Datum (z.B. "15. Dez. 2024")
 */
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {day: '2-digit', month: 'short', year: 'numeric'};
    return date.toLocaleDateString('de-DE', options);
};

// =====================================================
// VERMOEGENSSTATUS RENDERING (ES2025 Enhanced)
// ✅ Optional Chaining für alle DOM-Zugriffe
// =====================================================

/**
 * Rendert die Capital Status Card
 * ✅ ES2025: Optional Chaining, Nullish Coalescing
 *
 * @param {Object} data - Capital Daten
 */
const renderCapitalCard = (data) => {
    const currentCapitalEl = document.getElementById('currentCapital');
    const lastMonthEl = document.getElementById('lastMonthCapital');

    // ✅ ES2025: Optional Chaining
    currentCapitalEl && (currentCapitalEl.textContent = formatCurrency(data.current));
    lastMonthEl && (lastMonthEl.textContent = formatCurrency(data.lastMonth));

    const change = data.current - data.lastMonth;
    const percentChange = calculatePercentChange(data.current, data.lastMonth);

    const trendEl = document.getElementById('capitalTrend');
    if (trendEl) {
        const isPositive = change >= 0;

        // ✅ ES2025: Optional Chaining für alle Selektoren
        const trendValue = trendEl.querySelector('.trend-value');
        const trendIcon = trendEl.querySelector('.trend-icon');
        const trendStatus = trendEl.querySelector('.trend-status');

        trendValue && (trendValue.textContent = `${formatCurrency(change, true)} (${isPositive ? '+' : ''}${percentChange}%)`);

        if (trendIcon) {
            trendIcon.textContent = isPositive ? '↗' : '↘';
            trendIcon.style.color = isPositive ? '#48bb78' : '#f56565';
        }

        trendStatus && (trendStatus.textContent = isPositive ? 'Wachsend' : 'Sinkend');
    }

    renderCapitalChart(data.history);
};

/**
 * Rendert das Capital Chart (Canvas)
 * ✅ ES2025: Optional Chaining, verbesserte Null-Checks
 *
 * @param {Array<Object>} history - Array von {month, value} Objekten
 */
const renderCapitalChart = (history) => {
    const canvas = document.getElementById('capitalChart');
    if (!canvas) {
        console.warn('⚠️ Canvas Element #capitalChart nicht gefunden');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('❌ Canvas Context konnte nicht erstellt werden');
        return;
    }

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const values = history.map(h => h.value);
    const labels = history.map(h => h.month.split(' ')[0]);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue;

    const padding = {top: 20, right: 20, bottom: 40, left: 60};
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const scaleX = chartWidth / (values.length - 1);
    const scaleY = chartHeight / range;

    // Gradient für Line
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#00c78b');
    gradient.addColorStop(1, '#00e6a0');

    // Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    // Area Fill Gradient
    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    areaGradient.addColorStop(0, 'rgba(0, 199, 139, 0.3)');
    areaGradient.addColorStop(1, 'rgba(0, 199, 139, 0)');

    // Draw Area
    ctx.fillStyle = areaGradient;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);

    values.forEach((value, i) => {
        const x = padding.left + i * scaleX;
        const y = height - padding.bottom - (value - minValue) * scaleY;
        ctx.lineTo(x, y);
    });

    ctx.lineTo(padding.left + (values.length - 1) * scaleX, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Draw Line
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.beginPath();

    values.forEach((value, i) => {
        const x = padding.left + i * scaleX;
        const y = height - padding.bottom - (value - minValue) * scaleY;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw Points
    values.forEach((value, i) => {
        const x = padding.left + i * scaleX;
        const y = height - padding.bottom - (value - minValue) * scaleY;

        ctx.fillStyle = '#00c78b';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0d0d0d';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Draw X-Axis Labels
    ctx.fillStyle = '#b8b8b8';
    ctx.font = '11px Poppins';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
        const x = padding.left + i * scaleX;
        const y = height - padding.bottom + 20;
        ctx.fillText(label, x, y);
    });

    // Draw Y-Axis Labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const value = minValue + (range / 4) * i;
        const y = height - padding.bottom - (chartHeight / 4) * i;
        const formatted = (value / 1000000).toFixed(1) + 'M €';
        ctx.fillText(formatted, padding.left - 10, y + 4);
    }

    renderChartLegend(history);
};

/**
 * Rendert Chart-Legende
 * ✅ ES2025: Optional Chaining
 *
 * @param {Array<Object>} history - Chart History Data
 */
const renderChartLegend = (history) => {
    const legendEl = document.getElementById('chartLegend');
    if (!legendEl) return;

    const latest = history[history.length - 1];
    const oldest = history[0];

    legendEl.innerHTML = `
        <div class="legend-item">
            <div class="legend-color" style="background: #00c78b;"></div>
            <span>${latest.month}: ${formatCurrency(latest.value)}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: rgba(0, 199, 139, 0.4);"></div>
            <span>${oldest.month}: ${formatCurrency(oldest.value)}</span>
        </div>
    `;
};

// =====================================================
// SAISON-FORTSCHRITT RENDERING (ES2025 Enhanced)
// =====================================================

/**
 * Rendert die Season Progress Card
 * ✅ ES2025: Optional Chaining, Nullish Coalescing
 *
 * @param {Object} data - Season Daten
 */
const renderSeasonCard = (data) => {
    const monthEl = document.getElementById('seasonMonth');
    const currentDayEl = document.getElementById('currentDay');
    const totalDaysEl = document.getElementById('totalDays');

    // ✅ ES2025: Optional Chaining
    monthEl && (monthEl.textContent = data.month);
    currentDayEl && (currentDayEl.textContent = data.currentDay);
    totalDaysEl && (totalDaysEl.textContent = data.totalDays);

    const percent = Math.round((data.currentDay / data.totalDays) * 100);
    const percentEl = document.getElementById('progressPercent');
    const progressBarEl = document.getElementById('progressBarFill');

    percentEl && (percentEl.textContent = `${percent}%`);
    progressBarEl && (progressBarEl.style.width = `${percent}%`);

    const daysRemaining = data.totalDays - data.currentDay;
    const remainingEl = document.getElementById('daysRemaining');

    if (remainingEl) {
        const textEl = remainingEl.querySelector('.remaining-text');
        textEl && (textEl.textContent = `Saisonende in ${daysRemaining} ${daysRemaining === 1 ? 'Tag' : 'Tagen'}`);
    }

    const incomeEl = document.getElementById('seasonIncome');
    const expensesEl = document.getElementById('seasonExpenses');
    const profitEl = document.getElementById('seasonProfit');
    const avgEl = document.getElementById('avgPerDay');

    incomeEl && (incomeEl.textContent = formatCurrency(data.income, true));
    expensesEl && (expensesEl.textContent = formatCurrency(-data.expenses, true));

    const profit = data.income - data.expenses;
    if (profitEl) {
        profitEl.textContent = formatCurrency(profit, true);
        profitEl.style.color = profit >= 0 ? '#48bb78' : '#f56565';
    }

    const avgPerDay = Math.round(profit / data.currentDay);
    avgEl && (avgEl.textContent = formatCurrency(avgPerDay, true));
};

// =====================================================
// KATEGORIEN RENDERING (ES2025 Enhanced)
// ✅ Verwendet zentralisierte CATEGORY_ICONS/LABELS
// =====================================================

/**
 * Rendert Income & Expense Categories
 * ✅ ES2025: Zentralisierte Category Config, Optional Chaining
 *
 * @param {Object} categories - Categories Data
 */
const renderCategories = (categories) => {
    const incomeList = document.getElementById('incomeList');
    const totalIncomeEl = document.getElementById('totalIncome');

    if (incomeList && categories?.income) {
        let totalIncome = 0;
        let html = '';

        Object.entries(categories.income).forEach(([key, data]) => {
            totalIncome += data.amount;

            // ✅ ES2025: Zentralisierte Config mit Nullish Coalescing
            const icon = CATEGORY_ICONS[key] ?? '📋';
            const label = CATEGORY_LABELS[key] ?? 'Unbekannt';

            html += `
                <div class="kategorie-item">
                    <div class="item-icon">${icon}</div>
                    <div class="item-info">
                        <span class="item-label">${label}</span>
                        <span class="item-count">${data.count} ${data.label}</span>
                    </div>
                    <span class="item-amount income">${formatCurrency(data.amount, true)}</span>
                </div>
            `;
        });

        incomeList.innerHTML = html;
        totalIncomeEl && (totalIncomeEl.textContent = formatCurrency(totalIncome, true));
    }

    const expensesList = document.getElementById('expensesList');
    const totalExpensesEl = document.getElementById('totalExpenses');

    if (expensesList && categories?.expenses) {
        let totalExpenses = 0;
        let html = '';

        Object.entries(categories.expenses).forEach(([key, data]) => {
            totalExpenses += data.amount;

            // ✅ ES2025: Zentralisierte Config mit Nullish Coalescing
            const icon = CATEGORY_ICONS[key] ?? '📋';
            const label = CATEGORY_LABELS[key] ?? 'Unbekannt';

            html += `
                <div class="kategorie-item">
                    <div class="item-icon">${icon}</div>
                    <div class="item-info">
                        <span class="item-label">${label}</span>
                        <span class="item-count">${data.count} ${data.label}</span>
                    </div>
                    <span class="item-amount expense">${formatCurrency(-data.amount, true)}</span>
                </div>
            `;
        });

        expensesList.innerHTML = html;
        totalExpensesEl && (totalExpensesEl.textContent = formatCurrency(-totalExpenses, true));
    }
};

// =====================================================
// PROGNOSE RENDERING (ES2025 Enhanced)
// =====================================================

/**
 * Rendert Forecast Card
 * ✅ ES2025: Optional Chaining
 *
 * @param {Object} data - Forecast Data
 * @param {Object} capitalData - Capital Data für Current Values
 */
const renderForecast = (data, capitalData) => {
    const currentCapitalEl = document.getElementById('prognoseCurrentCapital');
    const currentBalanceEl = document.getElementById('prognoseCurrentBalance');

    currentCapitalEl && (currentCapitalEl.textContent = formatCurrency(capitalData.current));

    if (currentBalanceEl) {
        const currentBalance = MOCK_DATA.season.income - MOCK_DATA.season.expenses;
        currentBalanceEl.textContent = formatCurrency(currentBalance, true);
    }

    const prognoseCapitalEl = document.getElementById('prognoseCapital');
    const prognoseProfitEl = document.getElementById('prognoseProfit');
    const prognoseSeasonTotalEl = document.getElementById('prognoseSeasonTotal');

    prognoseCapitalEl && (prognoseCapitalEl.textContent = formatCurrency(data.result.finalCapital));
    prognoseProfitEl && (prognoseProfitEl.textContent = formatCurrency(data.result.expectedProfit, true));
    prognoseSeasonTotalEl && (prognoseSeasonTotalEl.textContent = formatCurrency(data.result.seasonTotal, true));

    const confidencePercentEl = document.getElementById('confidencePercent');
    const confidenceBarEl = document.getElementById('confidenceBarFill');

    const confidencePercent = Math.round(data.confidence * 100);
    confidencePercentEl && (confidencePercentEl.textContent = `${confidencePercent}%`);
    confidenceBarEl && (confidenceBarEl.style.width = `${confidencePercent}%`);
};

// =====================================================
// TIMELINE FUNCTIONS (ES2025 Enhanced)
// ✅ Strukturierte Funktionen mit Error Handling
// =====================================================

/**
 * Öffnet das Timeline-Modal
 * ✅ ES2025: Optional Chaining, strukturiertes Body-Scroll Management
 */
const openTimeline = () => {
    const modal = document.getElementById('timelineModal');
    if (!modal) {
        console.warn('⚠️ Timeline Modal Element nicht gefunden');
        return;
    }

    timelineState.isOpen = true;
    timelineState.allTransactions = MOCK_DATA.transactions;
    timelineState.filteredTransactions = [...MOCK_DATA.transactions];

    // Modal anzeigen
    modal.classList.add('active');

    // Body-Scroll blockieren (iOS-kompatibel)
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';

    // Initial rendern
    applyFilters();

    console.log('✅ Timeline Modal geöffnet');
};

/**
 * Schließt das Timeline-Modal
 * ✅ ES2025: Optional Chaining
 */
const closeTimeline = () => {
    const modal = document.getElementById('timelineModal');
    if (!modal) return;

    timelineState.isOpen = false;
    modal.classList.remove('active');

    // Body-Scroll wieder freigeben
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';

    console.log('🔒 Timeline Modal geschlossen');
};

/**
 * Wendet alle Filter an
 * ✅ ES2025: Optimierte Filter-Logik
 */
const applyFilters = () => {
    let filtered = [...timelineState.allTransactions];

    // Typ-Filter
    if (timelineState.currentFilters.type !== 'all') {
        filtered = filtered.filter(t => t.type === timelineState.currentFilters.type);
    }

    // Kategorie-Filter
    if (timelineState.currentFilters.category !== 'all') {
        filtered = filtered.filter(t => t.category === timelineState.currentFilters.category);
    }

    // Such-Filter
    const searchTerm = timelineState.currentFilters.search?.toLowerCase() ?? '';
    if (searchTerm) {
        filtered = filtered.filter(t =>
            t.title.toLowerCase().includes(searchTerm) ||
            t.description.toLowerCase().includes(searchTerm)
        );
    }

    timelineState.filteredTransactions = filtered;
    renderTimeline();
};

/**
 * Rendert die Timeline-Transaktionen
 * ✅ ES2025: Optional Chaining, strukturiertes Rendering
 */
const renderTimeline = () => {
    const contentEl = document.getElementById('timelineContent');
    const noResultsEl = document.getElementById('timelineNoResults');

    if (!contentEl || !noResultsEl) {
        console.warn('⚠️ Timeline Content oder NoResults Element nicht gefunden');
        return;
    }

    const transactions = timelineState.filteredTransactions;

    // No Results State
    if (transactions.length === 0) {
        contentEl.innerHTML = '';
        noResultsEl.classList.remove('hidden');
        updateTimelineStats([], 0, 0, 0);
        return;
    }

    noResultsEl.classList.add('hidden');

    // Gruppiere nach Tag
    const groupedByDay = {};
    transactions.forEach(t => {
        if (!groupedByDay[t.date]) {
            groupedByDay[t.date] = [];
        }
        groupedByDay[t.date].push(t);
    });

    // Sortiere Tage (neueste zuerst)
    const sortedDays = Object.keys(groupedByDay).sort().reverse();

    // Render HTML
    let html = '';
    sortedDays.forEach(date => {
        const dayTransactions = groupedByDay[date];
        const dayBalance = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

        html += `
            <div class="timeline-day-group">
                <div class="timeline-day-header">
                    <span class="timeline-day-date">${formatDate(date)}</span>
                    <span class="timeline-day-count">${dayTransactions.length} Transaktionen</span>
                    <span class="timeline-day-balance ${dayBalance >= 0 ? 'positive' : 'negative'}">
                        ${formatCurrency(dayBalance, true)}
                    </span>
                </div>
        `;

        dayTransactions.forEach(t => {
            const catData = getCategoryData(t.category, t.type);
            html += `
                <div class="timeline-transaction ${t.type}" data-id="${t.id}">
                    <div class="transaction-icon">${catData.icon}</div>
                    <div class="transaction-info">
                        <div class="transaction-title">${t.title}</div>
                        <div class="transaction-desc">${t.description}</div>
                        <div class="transaction-time">${t.time} Uhr</div>
                    </div>
                    <div class="transaction-amount ${t.type}">
                        ${formatCurrency(t.amount, true)}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    });

    contentEl.innerHTML = html;

    // Stats berechnen und anzeigen
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const balance = totalIncome - totalExpenses;

    updateTimelineStats(transactions, totalIncome, totalExpenses, balance);
};

/**
 * Gibt Kategorie-Daten zurück
 * ✅ ES2025: Zentralisierte Config, Nullish Coalescing
 *
 * @param {string} category - Category Key
 * @param {string} type - 'income' oder 'expense'
 * @returns {Object} {icon, label}
 */
const getCategoryData = (category, type) => {
    const icon = CATEGORY_ICONS[category] ?? '📋';
    const label = CATEGORY_LABELS[category] ?? 'Unbekannt';

    return {icon, label};
};

/**
 * Aktualisiert Timeline-Statistiken
 * ✅ ES2025: Optional Chaining
 *
 * @param {Array} transactions - Transaction Array
 * @param {number} income - Total Income
 * @param {number} expenses - Total Expenses
 * @param {number} balance - Balance (Income - Expenses)
 */
const updateTimelineStats = (transactions, income, expenses, balance) => {
    const incomeEl = document.getElementById('timelineIncomeTotal');
    const expensesEl = document.getElementById('timelineExpenseTotal');
    const balanceEl = document.getElementById('timelineBalance');
    const countEl = document.getElementById('timelineCount');

    incomeEl && (incomeEl.textContent = formatCurrency(income, true));
    expensesEl && (expensesEl.textContent = formatCurrency(-expenses, true));

    if (balanceEl) {
        balanceEl.textContent = formatCurrency(balance, true);
        balanceEl.style.color = balance >= 0 ? '#48bb78' : '#f56565';
    }

    countEl && (countEl.textContent = transactions.length);
};

/**
 * Setzt Filter-Button als aktiv
 * ✅ ES2025: Optional Chaining
 *
 * @param {HTMLElement} activeButton - Der zu aktivierende Button
 */
const setActiveFilterButton = (activeButton) => {
    const buttons = document.querySelectorAll('.filter-btn[data-filter-type]');
    buttons.forEach(btn => btn.classList.remove('active'));
    activeButton?.classList.add('active');
};

// =====================================================
// EVENT HANDLERS (ES2025 Enhanced)
// ✅ Alle Handler mit strukturierter Error-Toleranz
// =====================================================

const handleShowTransactions = () => {
    openTimeline();
};

const handleCloseTimeline = () => {
    closeTimeline();
};

const handleTimelineOverlayClick = (e) => {
    if (e.target?.id === 'timelineModalOverlay') {
        closeTimeline();
    }
};

const handleFilterTypeChange = (e) => {
    const button = e.target?.closest('.filter-btn');
    if (!button) return;

    timelineState.currentFilters.type = button.dataset.filterType ?? 'all';

    setActiveFilterButton(button);
    applyFilters();
};

const handleFilterTimeframeChange = (e) => {
    timelineState.currentFilters.timeframe = e.target?.value ?? 'current';
    applyFilters();
};

const handleFilterCategoryChange = (e) => {
    timelineState.currentFilters.category = e.target?.value ?? 'all';
    applyFilters();
};

/**
 * Behandelt Search Input mit Debouncing
 * ✅ ES2025: Verbesserte Debounce-Verwaltung
 */
const handleSearchInput = (e) => {
    timelineState.currentFilters.search = e.target?.value ?? '';

    // Clear existing timeout
    if (searchDebounceTimeout) {
        clearTimeout(searchDebounceTimeout);
    }

    // Set new timeout
    searchDebounceTimeout = setTimeout(() => {
        applyFilters();
        searchDebounceTimeout = null;
    }, 300);
};

/**
 * Behandelt ESC-Key zum Schließen des Modals
 * ✅ ES2025: Strukturierte Event-Behandlung
 */
const handleKeyDown = (e) => {
    if (e.key === 'Escape' && timelineState.isOpen) {
        closeTimeline();
    }
};

// =====================================================
// INITIALIZATION (ES2025 Enhanced)
// ✅ AbortController für Event Cleanup
// ✅ Strukturiertes Logging
// =====================================================

/**
 * Initialisiert Finance-Modul
 * ✅ ES2025: AbortController Pattern für alle Events
 */
export function init() {
    console.log('🎬 Finance-Modul wird initialisiert...');

    // ✅ ES2025: AbortController Signal für alle Events
    const signal = financeAbortController.signal;

    try {
        // Daten rendern
        renderCapitalCard(MOCK_DATA.capital);
        renderSeasonCard(MOCK_DATA.season);
        renderCategories(MOCK_DATA.categories);
        renderForecast(MOCK_DATA.forecast, MOCK_DATA.capital);

        // Main Event Listeners
        const btnShowTransactions = document.getElementById('btnShowTransactions');
        btnShowTransactions?.addEventListener('click', handleShowTransactions, {signal});

        // Timeline Event Listeners
        const timelineClose = document.getElementById('timelineClose');
        timelineClose?.addEventListener('click', handleCloseTimeline, {signal});

        const timelineOverlay = document.getElementById('timelineModalOverlay');
        timelineOverlay?.addEventListener('click', handleTimelineOverlayClick, {signal});

        // Filter Type Buttons
        const filterButtons = document.querySelectorAll('.filter-btn[data-filter-type]');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', handleFilterTypeChange, {signal});
        });

        // Filter Selects
        const filterTimeframe = document.getElementById('filterTimeframe');
        filterTimeframe?.addEventListener('change', handleFilterTimeframeChange, {signal});

        const filterCategory = document.getElementById('filterCategory');
        filterCategory?.addEventListener('change', handleFilterCategoryChange, {signal});

        // Search Input
        const searchInput = document.getElementById('searchInput');
        searchInput?.addEventListener('input', handleSearchInput, {signal});

        // ESC-Key Handler
        document.addEventListener('keydown', handleKeyDown, {signal});

        console.log('✅ Finance-Modul initialisiert');

    } catch (error) {
        const wrappedError = new Error('Finance module initialization failed');
        wrappedError.cause = error;
        console.error('❌ Fehler bei Finance-Initialisierung:', error);
        throw wrappedError;
    }
}

/**
 * Cleanup Finance-Modul
 * ✅ ES2025: Ein Aufruf entfernt ALLE Event Listener
 * ✅ ES2025: Vollständiger State-Reset
 */
export function cleanup() {
    console.log('🧹 Finance-Modul Cleanup wird durchgeführt...');

    try {
        // ✅ ES2025: AbortController entfernt ALLE Event Listener
        financeAbortController.abort();
        financeAbortController = new AbortController();

        // Modal schließen falls offen
        if (timelineState.isOpen) {
            closeTimeline();
        }

        // Clear debounce timeout
        if (searchDebounceTimeout) {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = null;
        }

        // Canvas leeren
        const canvas = document.getElementById('capitalChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }

        // State zurücksetzen
        timelineState.isOpen = false;
        timelineState.currentFilters = {
            timeframe: 'current',
            type: 'all',
            category: 'all',
            search: ''
        };
        timelineState.allTransactions = [];
        timelineState.filteredTransactions = [];

        console.log('✅ Finance-Modul Cleanup abgeschlossen');

    } catch (error) {
        // Cleanup sollte nie fehlschlagen, aber log trotzdem
        console.error('⚠️ Fehler während Finance Cleanup:', error);
        // Don't throw - cleanup should be fail-safe
    }
}