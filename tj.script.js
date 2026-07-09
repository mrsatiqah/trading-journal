// Data storage
let trades = [];
let transactions = []; // For deposits and withdrawals
let setup = {
    traderName: '',
    initialBalance: 0,
    startingDate: '',
    defaultCurrency: 'USD'
};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let editingTradeId = null;
let pnlChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('currency').value = setup.defaultCurrency || 'USD';
    document.getElementById('tick-value').value = 25; // Default RM 25 per tick for Malaysian futures
    renderCalendar();
    renderTrades();
    updateAnalytics();
    displayProfile();
    renderTransactions();
});

// Tab switching
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'calendar') {
        renderCalendar();
    } else if (tabName === 'trades') {
        renderTrades();
    } else if (tabName === 'analytics') {
        updateAnalytics();
        setTimeout(renderChart, 100); // Delay to ensure container is visible
    } else if (tabName === 'profile') {
        displayProfile();
        renderTransactions();
    }
}

// Form submissions
document.getElementById('trade-form').addEventListener('submit', function(e) {
    e.preventDefault();
    addTrade();
});

document.getElementById('edit-form').addEventListener('submit', function(e) {
    e.preventDefault();
    updateTrade();
});

document.getElementById('setup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    saveSetup();
});

// Add transaction form handlers
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'add-deposit-btn') {
        showTransactionForm('deposit');
    }
    if (e.target && e.target.id === 'add-withdrawal-btn') {
        showTransactionForm('withdraw');
    }
});

// Trade functions with corrected P&L calculation
function addTrade() {
    const trade = {
        id: Date.now(),
        date: document.getElementById('date').value,
        symbol: document.getElementById('symbol').value.toUpperCase(),
        side: document.getElementById('side').value,
        quantity: parseInt(document.getElementById('quantity').value),
        entryPrice: parseFloat(document.getElementById('entry-price').value),
        exitPrice: parseFloat(document.getElementById('exit-price').value),
        tickValue: parseFloat(document.getElementById('tick-value').value),
        currency: document.getElementById('currency').value,
        notes: document.getElementById('notes').value
    };

    // Calculate P&L using tick value properly
    // Price difference in points/ticks
    const priceDifference = trade.side === 'buy' 
        ? (trade.exitPrice - trade.entryPrice) 
        : (trade.entryPrice - trade.exitPrice);
    
    // P&L = Price difference × Tick Value × Quantity
    trade.pnl = priceDifference * trade.tickValue * trade.quantity;

    trades.push(trade);
    saveData();
    document.getElementById('trade-form').reset();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('currency').value = setup.defaultCurrency || 'USD';
    document.getElementById('tick-value').value = 25;
    renderTrades();
    updateAnalytics();
    alert('Trade added successfully!');
}

function updateTrade() {
    const tradeIndex = trades.findIndex(t => t.id === editingTradeId);
    if (tradeIndex !== -1) {
        const trade = {
            id: editingTradeId,
            date: document.getElementById('edit-date').value,
            symbol: document.getElementById('edit-symbol').value.toUpperCase(),
            side: document.getElementById('edit-side').value,
            quantity: parseInt(document.getElementById('edit-quantity').value),
            entryPrice: parseFloat(document.getElementById('edit-entry-price').value),
            exitPrice: parseFloat(document.getElementById('exit-exit-price').value),
            tickValue: parseFloat(document.getElementById('edit-tick-value').value),
            currency: document.getElementById('edit-currency').value,
            notes: document.getElementById('edit-notes').value
        };

        // Calculate P&L using tick value properly
        const priceDifference = trade.side === 'buy' 
            ? (trade.exitPrice - trade.entryPrice) 
            : (trade.entryPrice - trade.exitPrice);
        
        // P&L = Price difference × Tick Value × Quantity
        trade.pnl = priceDifference * trade.tickValue * trade.quantity;

        trades[tradeIndex] = trade;
        saveData();
        closeEditModal();
        renderTrades();
        updateAnalytics();
        renderCalendar();
        alert('Trade updated successfully!');
    }
}

// Recalculate P&L for all existing trades (in case they have old calculation)
function recalculateAllTrades() {
    trades.forEach(trade => {
        if (trade.tickValue && trade.entryPrice && trade.exitPrice) {
            const priceDifference = trade.side === 'buy' 
                ? (trade.exitPrice - trade.entryPrice) 
                : (trade.entryPrice - trade.exitPrice);
            
            trade.pnl = priceDifference * trade.tickValue * trade.quantity;
        }
    });
    saveData();
}

function editTrade(id) {
    const trade = trades.find(t => t.id === id);
    if (trade) {
        editingTradeId = id;
        document.getElementById('edit-date').value = trade.date;
        document.getElementById('edit-symbol').value = trade.symbol;
        document.getElementById('edit-side').value = trade.side;
        document.getElementById('edit-quantity').value = trade.quantity;
        document.getElementById('edit-entry-price').value = trade.entryPrice;
        document.getElementById('edit-exit-price').value = trade.exitPrice;
        document.getElementById('edit-tick-value').value = trade.tickValue || 25;
        document.getElementById('edit-currency').value = trade.currency || 'USD';
        document.getElementById('edit-notes').value = trade.notes;
        document.getElementById('edit-modal').style.display = 'block';
    }
}

function deleteTrade(id) {
    if (confirm('Are you sure you want to delete this trade?')) {
        trades = trades.filter(t => t.id !== id);
        saveData();
        renderTrades();
        updateAnalytics();
        renderCalendar();
    }
}

function viewNotes(id) {
    const trade = trades.find(t => t.id === id);
    if (trade) {
        const notesContent = document.getElementById('notes-content');
        if (trade.notes && trade.notes.trim()) {
            notesContent.innerHTML = `
                <div class="notes-display">
                    <h4>Trade: ${trade.symbol} - ${new Date(trade.date).toLocaleDateString()}</h4>
                    <p>${trade.notes}</p>
                </div>
            `;
        } else {
            notesContent.innerHTML = `
                <div class="notes-display empty">
                    <h4>Trade: ${trade.symbol} - ${new Date(trade.date).toLocaleDateString()}</h4>
                    <p>No notes available for this trade.</p>
                </div>
            `;
        }
        document.getElementById('notes-modal').style.display = 'block';
    }
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    editingTradeId = null;
}

function closeNotesModal() {
    document.getElementById('notes-modal').style.display = 'none';
}

// Transaction functions (Deposit/Withdraw)
function showTransactionForm(type) {
    const amount = prompt(`Enter ${type} amount:`);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        const notes = prompt(`Notes for this ${type} (optional):`);
        addTransaction(type, parseFloat(amount), notes || '');
    }
}

function addTransaction(type, amount, notes) {
    const transaction = {
        id: Date.now(),
        type: type, // 'deposit' or 'withdraw'
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        notes: notes,
        currency: setup.defaultCurrency || 'USD'
    };
    
    transactions.push(transaction);
    saveData();
    renderTransactions();
    updateAnalytics();
    alert(`${type.charAt(0).toUpperCase() + type.slice(1)} of ${transaction.currency} ${amount.toFixed(2)} added successfully!`);
}

function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        renderTransactions();
        updateAnalytics();
    }
}

function renderTransactions() {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = '<p>No deposits or withdrawals recorded.</p>';
        return;
    }
    
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = `
        <table class="trades-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Notes</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${sortedTransactions.map(transaction => `
                    <tr>
                        <td>${new Date(transaction.date).toLocaleDateString()}</td>
                        <td style="color: ${transaction.type === 'deposit' ? '#28a745' : '#dc3545'}">
                            ${transaction.type.toUpperCase()}
                        </td>
                        <td class="${transaction.type === 'deposit' ? 'profit-positive' : 'profit-negative'}">
                            ${transaction.type === 'deposit' ? '+' : '-'}${transaction.currency} ${transaction.amount.toFixed(2)}
                        </td>
                        <td>${transaction.notes}</td>
                        <td>
                            <button onclick="deleteTransaction(${transaction.id})" class="btn btn-danger btn-small">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Setup/Profile functions
function saveSetup() {
    setup = {
        traderName: document.getElementById('trader-name').value,
        initialBalance: parseFloat(document.getElementById('initial-balance').value),
        startingDate: document.getElementById('starting-date').value,
        defaultCurrency: document.getElementById('default-currency').value
    };
    saveData();
    displayProfile();
    updateAnalytics();
    alert('Profile saved successfully!');
}

function displayProfile() {
    const setupDisplay = document.getElementById('setup-display');
    if (!setupDisplay) return;
    
    if (setup.traderName) {
        const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
        const totalWithdrawals = transactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0);
        const netTransactions = totalDeposits - totalWithdrawals;
        
        setupDisplay.innerHTML = `
            <div class="setup-info">
                <div class="setup-item">
                    <strong>Trader Name:</strong><br>${setup.traderName}
                </div>
                <div class="setup-item">
                    <strong>Initial Balance:</strong><br>${setup.defaultCurrency} ${setup.initialBalance.toLocaleString()}
                </div>
                <div class="setup-item">
                    <strong>Start Date:</strong><br>${new Date(setup.startingDate).toLocaleDateString()}
                </div>
                <div class="setup-item">
                    <strong>Default Currency:</strong><br>${setup.defaultCurrency}
                </div>
                <div class="setup-item">
                    <strong>Total Deposits:</strong><br><span class="profit-positive">+${setup.defaultCurrency} ${totalDeposits.toFixed(2)}</span>
                </div>
                <div class="setup-item">
                    <strong>Total Withdrawals:</strong><br><span class="profit-negative">-${setup.defaultCurrency} ${totalWithdrawals.toFixed(2)}</span>
                </div>
            </div>
        `;
        
        // Pre-fill setup form
        document.getElementById('trader-name').value = setup.traderName;
        document.getElementById('initial-balance').value = setup.initialBalance;
        document.getElementById('starting-date').value = setup.startingDate;
        document.getElementById('default-currency').value = setup.defaultCurrency;
    } else {
        setupDisplay.innerHTML = '<p>No profile configured yet.</p>';
    }
}

function renderTrades() {
    const tbody = document.getElementById('trades-tbody');
    const searchTerm = document.getElementById('search-trades').value.toLowerCase();
    const filterSide = document.getElementById('filter-side').value;

    let filteredTrades = trades.filter(trade => {
        const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm) ||
                            trade.notes.toLowerCase().includes(searchTerm);
        const matchesSide = !filterSide || trade.side === filterSide;
        return matchesSearch && matchesSide;
    });

    // Sort by date (newest first)
    filteredTrades.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = filteredTrades.map(trade => {
        // Always recalculate P&L to ensure it uses correct tick value
        const entryPrice = parseFloat(trade.entryPrice);
        const exitPrice = parseFloat(trade.exitPrice);
        const tickValue = parseFloat(trade.tickValue) || 25;
        const quantity = parseInt(trade.quantity);
        const side = trade.side;
        
        const priceDifference = side === 'buy' 
            ? (exitPrice - entryPrice) 
            : (entryPrice - exitPrice);
        const calculatedPnL = priceDifference * tickValue * quantity;
        
        // Update the trade object with correct P&L
        trade.pnl = calculatedPnL;
        
        console.log('Rendering trade:', {
            symbol: trade.symbol,
            side: side,
            entryPrice: entryPrice,
            exitPrice: exitPrice,
            priceDifference: priceDifference,
            tickValue: tickValue,
            quantity: quantity,
            calculatedPnL: calculatedPnL
        });
        
        return `
            <tr>
                <td>${new Date(trade.date).toLocaleDateString()}</td>
                <td>${trade.symbol}</td>
                <td style="color: ${trade.side === 'buy' ? '#28a745' : '#dc3545'}">${trade.side.toUpperCase()}</td>
                <td>${trade.quantity}</td>
                <td>${trade.currency} ${trade.entryPrice.toFixed(2)}</td>
                <td>${trade.currency} ${trade.exitPrice.toFixed(2)}</td>
                <td class="${calculatedPnL >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${calculatedPnL >= 0 ? '+' : ''}${trade.currency} ${calculatedPnL.toFixed(2)}
                </td>
                <td>${trade.currency}</td>
                <td>
                    <button onclick="viewNotes(${trade.id})" class="btn btn-secondary btn-small">View</button>
                </td>
                <td>
                    <button onclick="editTrade(${trade.id})" class="btn btn-small">Edit</button>
                    <button onclick="deleteTrade(${trade.id})" class="btn btn-danger btn-small">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Save updated trades with corrected P&L
    saveData();
}

function renderCalendar() {
    const calendar = document.getElementById('calendar-grid');
    const title = document.getElementById('calendar-title');
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
    
    title.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Add previous month's trailing days
    const prevMonth = new Date(currentYear, currentMonth, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell other-month';
        dayCell.innerHTML = `<div class="day-number">${prevMonth.getDate() - i}</div>`;
        calendar.appendChild(dayCell);
    }
    
    // Add current month's days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        const currentDate = new Date(currentYear, currentMonth, day);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Check if it's today
        if (currentDate.toDateString() === today.toDateString()) {
            dayCell.classList.add('today');
        }
        
        // Get trades for this day and recalculate P&L
        const dayTrades = trades.filter(trade => trade.date === dateStr);
        const dayProfit = dayTrades.reduce((sum, trade) => {
            // Ensure P&L is calculated correctly
            const priceDifference = trade.side === 'buy' 
                ? (trade.exitPrice - trade.entryPrice) 
                : (trade.entryPrice - trade.exitPrice);
            const correctPnL = priceDifference * (trade.tickValue || 25) * trade.quantity;
            return sum + correctPnL;
        }, 0);
        
        let dayInfo = '';
        if (dayTrades.length > 0) {
            dayInfo = `
                <div class="day-info">
                    <div>Trades: ${dayTrades.length}</div>
                    <div class="${dayProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                        ${dayProfit >= 0 ? '+' : ''}${setup.defaultCurrency || '$'}${dayProfit.toFixed(2)}
                    </div>
                </div>
            `;
        }
        
        dayCell.innerHTML = `
            <div class="day-number">${day}</div>
            ${dayInfo}
        `;
        
        calendar.appendChild(dayCell);
    }
    
    // Add next month's leading days
    const cellsUsed = startingDayOfWeek + daysInMonth;
    const cellsNeeded = Math.ceil(cellsUsed / 7) * 7;
    for (let day = 1; day <= cellsNeeded - cellsUsed; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell other-month';
        dayCell.innerHTML = `<div class="day-number">${day}</div>`;
        calendar.appendChild(dayCell);
    }
}

function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

function updateAnalytics() {
    // Recalculate all trade P&Ls to ensure consistency with tick values
    trades.forEach(trade => {
        const entryPrice = parseFloat(trade.entryPrice);
        const exitPrice = parseFloat(trade.exitPrice);
        const tickValue = parseFloat(trade.tickValue) || 25;
        const quantity = parseInt(trade.quantity);
        const side = trade.side;
        
        if (entryPrice && exitPrice && tickValue && quantity && side) {
            const priceDifference = side === 'buy' 
                ? (exitPrice - entryPrice) 
                : (entryPrice - exitPrice);
            trade.pnl = priceDifference * tickValue * quantity;
        }
    });
    
    const totalTrades = trades.length;
    const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winningTrades = trades.filter(trade => (trade.pnl || 0) > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100) : 0;
    const avgTrade = totalTrades > 0 ? (totalPnl / totalTrades) : 0;
    
    // Calculate current balance including deposits and withdrawals
    const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = transactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = (setup.initialBalance || 0) + totalDeposits - totalWithdrawals + totalPnl;
    
    const currency = setup.defaultCurrency || 'USD';
    
    document.getElementById('total-trades').textContent = totalTrades;
    document.getElementById('total-pnl').textContent = `${currency} ${totalPnl.toFixed(2)}`;
    document.getElementById('total-pnl').className = `stat-value ${totalPnl >= 0 ? 'profit-positive' : 'profit-negative'}`;
    document.getElementById('win-rate').textContent = `${winRate.toFixed(1)}%`;
    document.getElementById('avg-trade').textContent = `${currency} ${avgTrade.toFixed(2)}`;
    document.getElementById('current-balance').textContent = `${currency} ${currentBalance.toFixed(2)}`;
    document.getElementById('current-balance').className = `stat-value ${currentBalance >= (setup.initialBalance || 0) ? 'profit-positive' : 'profit-negative'}`;
    
    console.log('Analytics updated:', {
        totalTrades: totalTrades,
        totalPnl: totalPnl,
        avgTrade: avgTrade,
        currentBalance: currentBalance
    });
    
    // Save updated data
    saveData();
}

function renderChart() {
    const ctx = document.getElementById('pnl-chart');
    if (!ctx) return;
    
    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate cumulative P&L including deposits and withdrawals
    let cumulativePnL = setup.initialBalance || 0;
    const chartData = [{
        date: setup.startingDate || new Date().toISOString().split('T')[0],
        balance: cumulativePnL
    }];
    
    // Add transactions and trades in chronological order
    const allEvents = [
        ...transactions.map(t => ({...t, type: t.type, eventType: 'transaction'})),
        ...sortedTrades.map(t => ({...t, eventType: 'trade'}))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    allEvents.forEach(event => {
        if (event.eventType === 'transaction') {
            if (event.type === 'deposit') {
                cumulativePnL += event.amount;
            } else if (event.type === 'withdraw') {
                cumulativePnL -= event.amount;
            }
        } else if (event.eventType === 'trade') {
            // Ensure P&L is calculated correctly for chart
            const priceDifference = event.side === 'buy' 
                ? (event.exitPrice - event.entryPrice) 
                : (event.entryPrice - event.exitPrice);
            const tradePnL = priceDifference * (event.tickValue || 25) * event.quantity;
            cumulativePnL += tradePnL;
        }
        
        chartData.push({
            date: event.date,
            balance: cumulativePnL
        });
    });
    
    if (pnlChart) {
        pnlChart.destroy();
    }
    
    pnlChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => new Date(d.date).toLocaleDateString()),
            datasets: [{
                label: 'Account Balance',
                data: chartData.map(d => d.balance),
                borderColor: '#00b894',
                backgroundColor: 'rgba(0, 184, 148, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return (setup.defaultCurrency || 'USD') + ' ' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            }
        }
    });
}

// Search and filter functionality
document.getElementById('search-trades').addEventListener('input', renderTrades);
document.getElementById('filter-side').addEventListener('change', renderTrades);

// Data persistence functions
function saveData() {
    const data = {
        trades: trades,
        transactions: transactions,
        setup: setup,
        exportDate: new Date().toISOString()
    };
    localStorage.setItem('tradingJournalData', JSON.stringify(data));
}

function loadData() {
    const data = localStorage.getItem('tradingJournalData');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            trades = parsed.trades || [];
            transactions = parsed.transactions || [];
            setup = parsed.setup || {
                traderName: '',
                initialBalance: 0,
                startingDate: '',
                defaultCurrency: 'USD'
            };
            
            // Recalculate P&L for all trades to ensure consistency
            recalculateAllTrades();
        } catch (error) {
            console.error('Error loading data:', error);
            trades = [];
            transactions = [];
            setup = {
                traderName: '',
                initialBalance: 0,
                startingDate: '',
                defaultCurrency: 'USD'
            };
        }
    }
}

// Export/Import functions
function exportToPDF() {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        alert('PDF library not loaded. Please refresh the page and try again.');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Get current data
        const currentTrades = trades;
        const currentSetup = setup;
        const currentTransactions = transactions;
        
        // Colors (RGB values 0-255)
        const primaryColor = [0, 184, 148];
        const successColor = [40, 167, 69];
        const dangerColor = [220, 53, 69];
        const darkColor = [33, 37, 41];
        
        let yPos = 20;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        
        // Title Header
        doc.setFillColor(0, 184, 148);
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('TRADING JOURNAL REPORT', pageWidth/2, 22, { align: 'center' });
        
        yPos = 50;
        
        // Trader Info Section
        doc.setTextColor(33, 37, 41);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('TRADER INFORMATION', margin, yPos);
        
        yPos += 15;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Trader Name: ${currentSetup.traderName || 'Not Set'}`, margin, yPos);
        yPos += 8;
        doc.text(`Initial Balance: ${currentSetup.defaultCurrency || 'USD'} ${(currentSetup.initialBalance || 0).toLocaleString()}`, margin, yPos);
        yPos += 8;
        doc.text(`Start Date: ${currentSetup.startingDate ? new Date(currentSetup.startingDate).toLocaleDateString() : 'Not Set'}`, margin, yPos);
        yPos += 8;
        doc.text(`Report Date: ${new Date().toLocaleDateString()}`, margin, yPos);
        
        yPos += 25;
        
        // Analytics Section
        const totalTrades = currentTrades.length;
        const totalPnl = currentTrades.reduce((sum, trade) => {
            const priceDifference = trade.side === 'buy' 
                ? (trade.exitPrice - trade.entryPrice) 
                : (trade.entryPrice - trade.exitPrice);
            return sum + (priceDifference * (trade.tickValue || 25) * trade.quantity);
        }, 0);
        const winningTrades = currentTrades.filter(trade => {
            const priceDifference = trade.side === 'buy' 
                ? (trade.exitPrice - trade.entryPrice) 
                : (trade.entryPrice - trade.exitPrice);
            const pnl = priceDifference * (trade.tickValue || 25) * trade.quantity;
            return pnl > 0;
