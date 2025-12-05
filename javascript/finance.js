// =====================================================
// KICKERSCUP - FINANCE MODULE (ESM) - ENHANCED
// Finanzverwaltung mit Charts, Prognosen und Timeline
// ✅ NEU: Timeline-View für Transaktionen
// ✅ NEU: Filter- und Suchfunktionalität
// =====================================================

// State Management
const eventListeners = [];
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

// =====================================================
// MOCK DATA (später über Backend)
// =====================================================

const MOCK_DATA = {
    capital: {
        current: 2485750,
        lastMonth: 2250000,
        history: [
            {month: 'Aug 2024', value: 2000000},
            {month: 'Sep 2024', value: 2100000},
            {month: 'Okt 2024', value: 2300000},
            {month: 'Nov 2024', value: 2200000},
            {month: 'Dez 2024', value: 2500000},
            {month: 'Jan 2025', value: 2700000}
        ]
    },
    season: {
        month: 'Dezember 2024',
        currentDay: 15,
        totalDays: 27,
        income: 980000,
        expenses: 520000
    },
    categories: {
        income: {
            zuschauer: {amount: 450000, count: 8, label: 'Heimspiele'},
            praemien: {amount: 280000, count: 12, label: 'Prämien'},
            sponsoren: {amount: 180000, count: 3, label: 'Raten'},
            transfers_in: {amount: 50000, count: 1, label: 'Verkauf'},
            sonstige_in: {amount: 20000, count: 4, label: 'Buchungen'}
        },
        expenses: {
            gehaelter: {amount: 405000, count: 15, label: 'Tage'},
            transfers_out: {amount: 65000, count: 1, label: 'Einkauf'},
            stadion: {amount: 30000, count: 1, label: 'Projekt'},
            sonstige_out: {amount: 20000, count: 3, label: 'Buchungen'}
        }
    },
    forecast: {
        income: {
            zuschauer: {amount: 233100, count: 3, label: 'Spiele'},
            sponsoren: {amount: 30000, count: 2, label: 'Raten'},
            praemien: {amount: 224000, count: 0, label: 'geschätzt', estimated: true}
        },
        expenses: {
            gehaelter: {amount: 331200, count: 12, label: 'Tage'},
            sonstige_out: {amount: 16000, count: 0, label: 'geschätzt', estimated: true}
        },
        result: {
            finalCapital: 2625650,
            expectedProfit: 139900,
            seasonTotal: 599900
        },
        confidence: 0.85
    },
    // ✅ NEU: Mock-Transaktionen für Timeline
    transactions: generateMockTransactions()
};

/**
 * Generiert Mock-Transaktionen für die Timeline
 */
function generateMockTransactions() {
    const transactions = [];
    const categories = {
        income: {
            zuschauer: {icon: '🏟️', label: 'Zuschauereinnahmen'},
            praemien: {icon: '🏆', label: 'Prämieneinnahmen'},
            sponsoren: {icon: '🤝', label: 'Sponsoreneinnahmen'},
            transfers_in: {icon: '🔄', label: 'Transfereinnahmen'},
            sonstige_in: {icon: '📦', label: 'Sonstige Einnahmen'}
        },
        expense: {
            gehaelter: {icon: '💰', label: 'Spielergehälter'},
            transfers_out: {icon: '🔄', label: 'Transferausgaben'},
            stadion: {icon: '🏗️', label: 'Stadionausbau'},
            sonstige_out: {icon: '📋', label: 'Sonstige Ausgaben'}
        }
    };

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
// HELPER FUNCTIONS
// =====================================================

/**
 * Formatiert Zahlen als Währung
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
 * Berechnet Prozentuale Veränderung
 */
const calculatePercentChange = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
};

/**
 * Event Listener mit Cleanup-Tracking registrieren
 */
const addEventListener = (element, event, handler, options = false) => {
    if (!element) return;
    element.addEventListener(event, handler, options);
    eventListeners.push({element, event, handler, options});
};

/**
 * Formatiert Datum für Anzeige
 */
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {day: '2-digit', month: 'short', year: 'numeric'};
    return date.toLocaleDateString('de-DE', options);
};

// =====================================================
// VERMOEGENSSTATUS RENDERING (existing code...)
// =====================================================

const renderCapitalCard = (data) => {
    const currentCapitalEl = document.getElementById('currentCapital');
    if (currentCapitalEl) {
        currentCapitalEl.textContent = formatCurrency(data.current);
    }

    const lastMonthEl = document.getElementById('lastMonthCapital');
    if (lastMonthEl) {
        lastMonthEl.textContent = formatCurrency(data.lastMonth);
    }

    const change = data.current - data.lastMonth;
    const percentChange = calculatePercentChange(data.current, data.lastMonth);

    const trendEl = document.getElementById('capitalTrend');
    if (trendEl) {
        const isPositive = change >= 0;
        const trendValue = trendEl.querySelector('.trend-value');
        const trendIcon = trendEl.querySelector('.trend-icon');
        const trendStatus = trendEl.querySelector('.trend-status');

        if (trendValue) {
            trendValue.textContent = `${formatCurrency(change, true)} (${isPositive ? '+' : ''}${percentChange}%)`;
        }
        if (trendIcon) {
            trendIcon.textContent = isPositive ? '↗' : '↘';
            trendIcon.style.color = isPositive ? '#48bb78' : '#f56565';
        }
        if (trendStatus) {
            trendStatus.textContent = isPositive ? 'Wachsend' : 'Sinkend';
        }
    }

    renderCapitalChart(data.history);
};

const renderCapitalChart = (history) => {
    const canvas = document.getElementById('capitalChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
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

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#00c78b');
    gradient.addColorStop(1, '#00e6a0');

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    areaGradient.addColorStop(0, 'rgba(0, 199, 139, 0.3)');
    areaGradient.addColorStop(1, 'rgba(0, 199, 139, 0)');

    ctx.fillStyle = areaGradient;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);

    values.forEach((value, i) => {
        const x = padding.left + i * scaleX;
        const y = height - padding.bottom - (value - minValue) * scaleY;
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.lineTo(padding.left + (values.length - 1) * scaleX, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

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

    ctx.fillStyle = '#b8b8b8';
    ctx.font = '11px Poppins';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
        const x = padding.left + i * scaleX;
        const y = height - padding.bottom + 20;
        ctx.fillText(label, x, y);
    });

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const value = minValue + (range / 4) * i;
        const y = height - padding.bottom - (chartHeight / 4) * i;
        const formatted = (value / 1000000).toFixed(1) + 'M €';
        ctx.fillText(formatted, padding.left - 10, y + 4);
    }

    renderChartLegend(history);
};

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
// SAISON-FORTSCHRITT RENDERING (existing code...)
// =====================================================

const renderSeasonCard = (data) => {
    const monthEl = document.getElementById('seasonMonth');
    if (monthEl) {
        monthEl.textContent = data.month;
    }

    const currentDayEl = document.getElementById('currentDay');
    const totalDaysEl = document.getElementById('totalDays');
    if (currentDayEl) currentDayEl.textContent = data.currentDay;
    if (totalDaysEl) totalDaysEl.textContent = data.totalDays;

    const percent = Math.round((data.currentDay / data.totalDays) * 100);
    const percentEl = document.getElementById('progressPercent');
    const progressBarEl = document.getElementById('progressBarFill');

    if (percentEl) percentEl.textContent = `${percent}%`;
    if (progressBarEl) progressBarEl.style.width = `${percent}%`;

    const daysRemaining = data.totalDays - data.currentDay;
    const remainingEl = document.getElementById('daysRemaining');
    if (remainingEl) {
        const textEl = remainingEl.querySelector('.remaining-text');
        if (textEl) {
            textEl.textContent = `Saisonende in ${daysRemaining} ${daysRemaining === 1 ? 'Tag' : 'Tagen'}`;
        }
    }

    const incomeEl = document.getElementById('seasonIncome');
    const expensesEl = document.getElementById('seasonExpenses');
    const profitEl = document.getElementById('seasonProfit');
    const avgEl = document.getElementById('avgPerDay');

    if (incomeEl) incomeEl.textContent = formatCurrency(data.income, true);
    if (expensesEl) expensesEl.textContent = formatCurrency(-data.expenses, true);

    const profit = data.income - data.expenses;
    if (profitEl) {
        profitEl.textContent = formatCurrency(profit, true);
        profitEl.style.color = profit >= 0 ? '#48bb78' : '#f56565';
    }

    const avgPerDay = Math.round(profit / data.currentDay);
    if (avgEl) {
        avgEl.textContent = formatCurrency(avgPerDay, true);
    }
};

// =====================================================
// KATEGORIEN RENDERING (existing code...)
// =====================================================

const renderCategories = (categories) => {
    const incomeList = document.getElementById('incomeList');
    const totalIncomeEl = document.getElementById('totalIncome');

    if (incomeList && categories.income) {
        let totalIncome = 0;
        let html = '';

        const icons = {
            zuschauer: '🏟️',
            praemien: '🏆',
            sponsoren: '🤝',
            transfers_in: '🔄',
            sonstige_in: '📦'
        };

        const labels = {
            zuschauer: 'Zuschauereinnahmen',
            praemien: 'Prämieneinnahmen',
            sponsoren: 'Sponsoreneinnahmen',
            transfers_in: 'Transfereinnahmen',
            sonstige_in: 'Sonstige Einnahmen'
        };

        Object.entries(categories.income).forEach(([key, data]) => {
            totalIncome += data.amount;
            html += `
                <div class="kategorie-item">
                    <div class="item-icon">${icons[key]}</div>
                    <div class="item-info">
                        <span class="item-label">${labels[key]}</span>
                        <span class="item-count">${data.count} ${data.label}</span>
                    </div>
                    <span class="item-amount income">${formatCurrency(data.amount, true)}</span>
                </div>
            `;
        });

        incomeList.innerHTML = html;
        if (totalIncomeEl) {
            totalIncomeEl.textContent = formatCurrency(totalIncome, true);
        }
    }

    const expensesList = document.getElementById('expensesList');
    const totalExpensesEl = document.getElementById('totalExpenses');

    if (expensesList && categories.expenses) {
        let totalExpenses = 0;
        let html = '';

        const icons = {
            gehaelter: '💰',
            transfers_out: '🔄',
            stadion: '🏗️',
            sonstige_out: '📋'
        };

        const labels = {
            gehaelter: 'Spielergehälter',
            transfers_out: 'Transferausgaben',
            stadion: 'Stadionausbau',
            sonstige_out: 'Sonstige Ausgaben'
        };

        Object.entries(categories.expenses).forEach(([key, data]) => {
            totalExpenses += data.amount;
            html += `
                <div class="kategorie-item">
                    <div class="item-icon">${icons[key]}</div>
                    <div class="item-info">
                        <span class="item-label">${labels[key]}</span>
                        <span class="item-count">${data.count} ${data.label}</span>
                    </div>
                    <span class="item-amount expense">${formatCurrency(-data.amount, true)}</span>
                </div>
            `;
        });

        expensesList.innerHTML = html;
        if (totalExpensesEl) {
            totalExpensesEl.textContent = formatCurrency(-totalExpenses, true);
        }
    }
};

// =====================================================
// PROGNOSE RENDERING (existing code...)
// =====================================================

const renderForecast = (data, capitalData) => {
    const currentCapitalEl = document.getElementById('prognoseCurrentCapital');
    const currentBalanceEl = document.getElementById('prognoseCurrentBalance');

    if (currentCapitalEl) {
        currentCapitalEl.textContent = formatCurrency(capitalData.current);
    }
    if (currentBalanceEl) {
        const currentBalance = MOCK_DATA.season.income - MOCK_DATA.season.expenses;
        currentBalanceEl.textContent = formatCurrency(currentBalance, true);
    }

    const prognoseCapitalEl = document.getElementById('prognoseCapital');
    const prognoseProfitEl = document.getElementById('prognoseProfit');
    const prognoseSeasonTotalEl = document.getElementById('prognoseSeasonTotal');

    if (prognoseCapitalEl) {
        prognoseCapitalEl.textContent = formatCurrency(data.result.finalCapital);
    }
    if (prognoseProfitEl) {
        prognoseProfitEl.textContent = formatCurrency(data.result.expectedProfit, true);
    }
    if (prognoseSeasonTotalEl) {
        prognoseSeasonTotalEl.textContent = formatCurrency(data.result.seasonTotal, true);
    }

    const confidencePercentEl = document.getElementById('confidencePercent');
    const confidenceBarEl = document.getElementById('confidenceBarFill');

    const confidencePercent = Math.round(data.confidence * 100);
    if (confidencePercentEl) {
        confidencePercentEl.textContent = `${confidencePercent}%`;
    }
    if (confidenceBarEl) {
        confidenceBarEl.style.width = `${confidencePercent}%`;
    }
};

// =====================================================
// ✅ NEU: TIMELINE FUNCTIONS
// =====================================================

/**
 * Öffnet das Timeline-Modal
 */
const openTimeline = () => {
    const modal = document.getElementById('timelineModal');
    if (!modal) return;

    timelineState.isOpen = true;
    timelineState.allTransactions = MOCK_DATA.transactions;
    timelineState.filteredTransactions = [...MOCK_DATA.transactions];

    // Modal anzeigen
    modal.classList.add('active');

    // Body-Scroll blockieren
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';

    // Initial rendern
    applyFilters();
};

/**
 * Schließt das Timeline-Modal
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
};

/**
 * Wendet alle Filter an
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
    if (timelineState.currentFilters.search) {
        const search = timelineState.currentFilters.search.toLowerCase();
        filtered = filtered.filter(t =>
            t.title.toLowerCase().includes(search) ||
            t.description.toLowerCase().includes(search)
        );
    }

    timelineState.filteredTransactions = filtered;
    renderTimeline();
};

/**
 * Rendert die Timeline-Transaktionen
 */
const renderTimeline = () => {
    const contentEl = document.getElementById('timelineContent');
    const noResultsEl = document.getElementById('timelineNoResults');

    if (!contentEl || !noResultsEl) return;

    const transactions = timelineState.filteredTransactions;

    // No Results
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
 */
const getCategoryData = (category, type) => {
    const categories = {
        income: {
            zuschauer: {icon: '🏟️', label: 'Zuschauereinnahmen'},
            praemien: {icon: '🏆', label: 'Prämieneinnahmen'},
            sponsoren: {icon: '🤝', label: 'Sponsoreneinnahmen'},
            transfers_in: {icon: '🔄', label: 'Transfereinnahmen'},
            sonstige_in: {icon: '📦', label: 'Sonstige Einnahmen'}
        },
        expense: {
            gehaelter: {icon: '💰', label: 'Spielergehälter'},
            transfers_out: {icon: '🔄', label: 'Transferausgaben'},
            stadion: {icon: '🏗️', label: 'Stadionausbau'},
            sonstige_out: {icon: '📋', label: 'Sonstige Ausgaben'}
        }
    };

    return categories[type]?.[category] || {icon: '📋', label: 'Unbekannt'};
};

/**
 * Aktualisiert Timeline-Statistiken
 */
const updateTimelineStats = (transactions, income, expenses, balance) => {
    const incomeEl = document.getElementById('timelineIncomeTotal');
    const expensesEl = document.getElementById('timelineExpenseTotal');
    const balanceEl = document.getElementById('timelineBalance');
    const countEl = document.getElementById('timelineCount');

    if (incomeEl) incomeEl.textContent = formatCurrency(income, true);
    if (expensesEl) expensesEl.textContent = formatCurrency(-expenses, true);
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(balance, true);
        balanceEl.style.color = balance >= 0 ? '#48bb78' : '#f56565';
    }
    if (countEl) countEl.textContent = transactions.length;
};

/**
 * Setzt Filter-Button als aktiv
 */
const setActiveFilterButton = (activeButton) => {
    const buttons = document.querySelectorAll('.filter-btn[data-filter-type]');
    buttons.forEach(btn => btn.classList.remove('active'));
    activeButton.classList.add('active');
};

// =====================================================
// EVENT HANDLERS
// =====================================================

const handleShowTransactions = () => {
    openTimeline();
};

const handleCloseTimeline = () => {
    closeTimeline();
};

const handleTimelineOverlayClick = (e) => {
    if (e.target.id === 'timelineModalOverlay') {
        closeTimeline();
    }
};

const handleFilterTypeChange = (e) => {
    const button = e.target.closest('.filter-btn');
    if (!button) return;

    timelineState.currentFilters.type = button.dataset.filterType;

    setActiveFilterButton(button);
    applyFilters();
};

const handleFilterTimeframeChange = (e) => {
    timelineState.currentFilters.timeframe = e.target.value;
    applyFilters();
};

const handleFilterCategoryChange = (e) => {
    timelineState.currentFilters.category = e.target.value;
    applyFilters();
};

const handleSearchInput = (e) => {
    timelineState.currentFilters.search = e.target.value;
    // Debounce für bessere Performance
    clearTimeout(handleSearchInput.timeout);
    handleSearchInput.timeout = setTimeout(() => {
        applyFilters();
    }, 300);
};

// =====================================================
// INITIALIZATION
// =====================================================

export function init() {
    console.log('Finance-Modul wird initialisiert...');

    // Daten rendern
    renderCapitalCard(MOCK_DATA.capital);
    renderSeasonCard(MOCK_DATA.season);
    renderCategories(MOCK_DATA.categories);
    renderForecast(MOCK_DATA.forecast, MOCK_DATA.capital);

    // ✅ Main Event Listeners
    const btnShowTransactions = document.getElementById('btnShowTransactions');
    if (btnShowTransactions) {
        addEventListener(btnShowTransactions, 'click', handleShowTransactions);
    }

    // ✅ Timeline Event Listeners
    const timelineClose = document.getElementById('timelineClose');
    if (timelineClose) {
        addEventListener(timelineClose, 'click', handleCloseTimeline);
    }

    const timelineOverlay = document.getElementById('timelineModalOverlay');
    if (timelineOverlay) {
        addEventListener(timelineOverlay, 'click', handleTimelineOverlayClick);
    }

    // Filter Type Buttons
    const filterButtons = document.querySelectorAll('.filter-btn[data-filter-type]');
    filterButtons.forEach(btn => {
        addEventListener(btn, 'click', handleFilterTypeChange);
    });

    // Filter Selects
    const filterTimeframe = document.getElementById('filterTimeframe');
    if (filterTimeframe) {
        addEventListener(filterTimeframe, 'change', handleFilterTimeframeChange);
    }

    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
        addEventListener(filterCategory, 'change', handleFilterCategoryChange);
    }

    // Search Input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        addEventListener(searchInput, 'input', handleSearchInput);
    }

    // ESC-Key zum Schließen
    addEventListener(document, 'keydown', (e) => {
        if (e.key === 'Escape' && timelineState.isOpen) {
            closeTimeline();
        }
    });

    console.log('Finance-Modul initialisiert ✓');
}

export function cleanup() {
    // Modal schließen falls offen
    if (timelineState.isOpen) {
        closeTimeline();
    }

    // Event Listeners entfernen
    eventListeners.forEach(({element, event, handler, options}) => {
        if (element) {
            element.removeEventListener(event, handler, options);
        }
    });
    eventListeners.length = 0;

    // Canvas leeren
    const canvas = document.getElementById('capitalChart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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

    console.log('Finance-Modul cleanup ✓');
}