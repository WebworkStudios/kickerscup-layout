// =====================================================
// KICKERSCUP - FINANCE MODULE (ESM)
// Finanzverwaltung mit Charts und Prognosen
// =====================================================

// State Management
const eventListeners = [];

// =====================================================
// MOCK DATA (später über Backend)
// =====================================================

const MOCK_DATA = {
    capital: {
        current: 2485750,
        lastMonth: 2250000,
        history: [
            { month: 'Aug 2024', value: 2000000 },
            { month: 'Sep 2024', value: 2100000 },
            { month: 'Okt 2024', value: 2300000 },
            { month: 'Nov 2024', value: 2200000 },
            { month: 'Dez 2024', value: 2500000 },
            { month: 'Jan 2025', value: 2700000 }
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
            zuschauer: { amount: 450000, count: 8, label: 'Heimspiele' },
            praemien: { amount: 280000, count: 12, label: 'Prämien' },
            sponsoren: { amount: 180000, count: 3, label: 'Raten' },
            transfers_in: { amount: 50000, count: 1, label: 'Verkauf' },
            sonstige_in: { amount: 20000, count: 4, label: 'Buchungen' }
        },
        expenses: {
            gehaelter: { amount: 405000, count: 15, label: 'Tage' },
            transfers_out: { amount: 65000, count: 1, label: 'Einkauf' },
            stadion: { amount: 30000, count: 1, label: 'Projekt' },
            sonstige_out: { amount: 20000, count: 3, label: 'Buchungen' }
        }
    },
    forecast: {
        income: {
            zuschauer: { amount: 233100, count: 3, label: 'Spiele' },
            sponsoren: { amount: 30000, count: 2, label: 'Raten' },
            praemien: { amount: 224000, count: 0, label: 'geschätzt', estimated: true }
        },
        expenses: {
            gehaelter: { amount: 331200, count: 12, label: 'Tage' },
            sonstige_out: { amount: 16000, count: 0, label: 'geschätzt', estimated: true }
        },
        result: {
            finalCapital: 2625650,
            expectedProfit: 139900,
            seasonTotal: 599900
        },
        confidence: 0.85
    }
};

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
    eventListeners.push({ element, event, handler, options });
};

// =====================================================
// VERMOEGENSSTATUS RENDERING
// =====================================================

const renderCapitalCard = (data) => {
    // Aktuelles Vermögen
    const currentCapitalEl = document.getElementById('currentCapital');
    if (currentCapitalEl) {
        currentCapitalEl.textContent = formatCurrency(data.current);
    }

    // Vormonat
    const lastMonthEl = document.getElementById('lastMonthCapital');
    if (lastMonthEl) {
        lastMonthEl.textContent = formatCurrency(data.lastMonth);
    }

    // Trend berechnen
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

    // Chart rendern
    renderCapitalChart(data.history);
};

/**
 * Rendert den Vermögensverlauf-Chart
 */
const renderCapitalChart = (history) => {
    const canvas = document.getElementById('capitalChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Canvas leeren
    ctx.clearRect(0, 0, width, height);

    // Daten vorbereiten
    const values = history.map(h => h.value);
    const labels = history.map(h => h.month.split(' ')[0]); // Nur Monat
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue;

    // Padding
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Skalierung
    const scaleX = chartWidth / (values.length - 1);
    const scaleY = chartHeight / range;

    // Gradient für Linie
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#00c78b');
    gradient.addColorStop(1, '#00e6a0');

    // Grid zeichnen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    // Area Fill (unter der Linie)
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

    // Linie zeichnen
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

    // Punkte zeichnen
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

    // X-Achsen Labels
    ctx.fillStyle = '#b8b8b8';
    ctx.font = '11px Poppins';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
        const x = padding.left + i * scaleX;
        const y = height - padding.bottom + 20;
        ctx.fillText(label, x, y);
    });

    // Y-Achsen Labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const value = minValue + (range / 4) * i;
        const y = height - padding.bottom - (chartHeight / 4) * i;
        const formatted = (value / 1000000).toFixed(1) + 'M €';
        ctx.fillText(formatted, padding.left - 10, y + 4);
    }

    // Chart Legend rendern
    renderChartLegend(history);
};

/**
 * Rendert die Chart-Legende
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
// SAISON-FORTSCHRITT RENDERING
// =====================================================

const renderSeasonCard = (data) => {
    // Monat
    const monthEl = document.getElementById('seasonMonth');
    if (monthEl) {
        monthEl.textContent = data.month;
    }

    // Tage
    const currentDayEl = document.getElementById('currentDay');
    const totalDaysEl = document.getElementById('totalDays');
    if (currentDayEl) currentDayEl.textContent = data.currentDay;
    if (totalDaysEl) totalDaysEl.textContent = data.totalDays;

    // Prozent
    const percent = Math.round((data.currentDay / data.totalDays) * 100);
    const percentEl = document.getElementById('progressPercent');
    const progressBarEl = document.getElementById('progressBarFill');

    if (percentEl) percentEl.textContent = `${percent}%`;
    if (progressBarEl) progressBarEl.style.width = `${percent}%`;

    // Verbleibende Tage
    const daysRemaining = data.totalDays - data.currentDay;
    const remainingEl = document.getElementById('daysRemaining');
    if (remainingEl) {
        const textEl = remainingEl.querySelector('.remaining-text');
        if (textEl) {
            textEl.textContent = `Saisonende in ${daysRemaining} ${daysRemaining === 1 ? 'Tag' : 'Tagen'}`;
        }
    }

    // Bilanz
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
// KATEGORIEN RENDERING
// =====================================================

const renderCategories = (categories) => {
    // Einnahmen
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

    // Ausgaben
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
// PROGNOSE RENDERING
// =====================================================

const renderForecast = (data, capitalData) => {
    // Aktuelle Werte
    const currentCapitalEl = document.getElementById('prognoseCurrentCapital');
    const currentBalanceEl = document.getElementById('prognoseCurrentBalance');

    if (currentCapitalEl) {
        currentCapitalEl.textContent = formatCurrency(capitalData.current);
    }
    if (currentBalanceEl) {
        const currentBalance = MOCK_DATA.season.income - MOCK_DATA.season.expenses;
        currentBalanceEl.textContent = formatCurrency(currentBalance, true);
    }

    // Prognose-Ergebnis
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

    // Confidence
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
// EVENT HANDLERS
// =====================================================

const handleShowTransactions = () => {
    // TODO: Timeline-View öffnen
    alert('📋 Transaktions-Timeline wird geladen...\n\n(Wird im nächsten Schritt implementiert)');
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

    // Event Listeners
    const btnShowTransactions = document.getElementById('btnShowTransactions');
    if (btnShowTransactions) {
        addEventListener(btnShowTransactions, 'click', handleShowTransactions);
    }

    console.log('Finance-Modul initialisiert ✓');
}

export function cleanup() {
    // Event Listeners entfernen
    eventListeners.forEach(({ element, event, handler, options }) => {
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

    console.log('Finance-Modul cleanup ✓');
}