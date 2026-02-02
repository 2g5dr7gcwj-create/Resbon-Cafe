// State Management
const state = {
    devices: [],
    currentTab: 'tables',
    selectedDevice: null,
    selectedPrice: null,
    selectedDuration: null,
    totalProfit: 0,
    dailyStats: {
        totalRevenue: 0,
        invoices: 0,
        drinks: 0,
        activeHours: 0
    },
    invoicesHistory: []
};

// Constants
const TABLES_COUNT = 6;
const PS_COUNT = 4;
const STORAGE_KEY = 'raspun_pro_data';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeDevices();
    renderDevices();
    updateStats();
    startGlobalTimer();
    
    // Auto-save every 30 seconds
    setInterval(saveData, 30000);
});

// Data Persistence
function saveData() {
    const data = {
        devices: state.devices,
        totalProfit: state.totalProfit,
        dailyStats: state.dailyStats,
        invoicesHistory: state.invoicesHistory,
        lastSave: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        const lastSave = new Date(data.lastSave);
        const now = new Date();
        const diffHours = (now - lastSave) / (1000 * 60 * 60);
        
        // If more than 24 hours, reset daily stats but keep devices state
        if (diffHours > 24) {
            state.dailyStats = { totalRevenue: 0, invoices: 0, drinks: 0, activeHours: 0 };
            state.invoicesHistory = [];
        } else {
            state.dailyStats = data.dailyStats || { totalRevenue: 0, invoices: 0, drinks: 0, activeHours: 0 };
            state.invoicesHistory = data.invoicesHistory || [];
        }
        
        state.totalProfit = data.totalProfit || 0;
        if (data.devices) {
            state.devices = data.devices.map(d => ({
                ...d,
                // Recalculate end times based on remaining time
                endTime: d.remainingTime ? Date.now() + d.remainingTime : d.endTime,
                pausedAt: null
            }));
        }
    }
}

// Device Initialization
function initializeDevices() {
    if (state.devices.length === 0) {
        // Create Tables
        for (let i = 1; i <= TABLES_COUNT; i++) {
            state.devices.push({
                id: `table-${i}`,
                name: `منضدة ${i}`,
                type: 'table',
                status: 'available', // available, occupied, paused
                customer: '',
                startTime: null,
                endTime: null,
                duration: 0,
                basePrice: 0,
                orders: [],
                totalPrice: 0,
                remainingTime: 0,
                pausedAt: null,
                elapsedPaused: 0
            });
        }
        
        // Create PS Stations
        for (let i = 1; i <= PS_COUNT; i++) {
            state.devices.push({
                id: `ps-${i}`,
                name: `بلايستيشن ${i}`,
                type: 'ps',
                status: 'available',
                customer: '',
                startTime: null,
                endTime: null,
                duration: 0,
                basePrice: 0,
                orders: [],
                totalPrice: 0,
                remainingTime: 0,
                pausedAt: null,
                elapsedPaused: 0
            });
        }
    }
}

// Rendering
function renderDevices() {
    const tablesContainer = document.getElementById('section-tables');
    const psContainer = document.getElementById('section-ps');
    
    tablesContainer.innerHTML = '';
    psContainer.innerHTML = '';
    
    let activeTables = 0;
    let activePs = 0;
    
    state.devices.forEach(device => {
        const card = createDeviceCard(device);
        if (device.type === 'table') {
            tablesContainer.appendChild(card);
            if (device.status === 'occupied') activeTables++;
        } else {
            psContainer.appendChild(card);
            if (device.status === 'occupied') activePs++;
        }
    });
    
    // Update badges
    document.getElementById('badge-tables').textContent = activeTables;
    document.getElementById('badge-tables').classList.toggle('hidden', activeTables === 0);
    document.getElementById('badge-ps').textContent = activePs;
    document.getElementById('badge-ps').classList.toggle('hidden', activePs === 0);
    
    feather.replace();
}

function createDeviceCard(device) {
    const div = document.createElement('div');
    div.className = `device-card rounded-2xl p-5 cursor-pointer ${device.status !== 'available' ? 'active' : ''}`;
    div.onclick = () => handleDeviceClick(device);
    
    const isPaused = device.status === 'paused';
    const isOccupied = device.status === 'occupied';
    
    let statusColor = 'available';
    let statusText = 'متاح';
    if (isOccupied) { statusColor = 'occupied'; statusText = 'مشغول'; }
    if (isPaused) { statusColor = 'paused'; statusText = 'متوقف'; }
    
    const timerHtml = isOccupied ? `
        <div class="mt-4 flex items-center justify-between bg-black/30 rounded-xl p-3 border border-white/5">
            <div class="flex items-center gap-2">
                <i data-feather="clock" class="w-4 h-4 text-yellow-400"></i>
                <span class="text-xs text-gray-400">الوقت المتبقي</span>
            </div>
            <span class="timer-display text-xl font-black text-yellow-400" data-device="${device.id}">
                ${formatTime(device.endTime - Date.now())}
            </span>
        </div>
    ` : '';
    
    const ordersHtml = device.orders.length > 0 ? `
        <div class="mt-3 flex items-center gap-2 text-xs text-blue-400">
            <i data-feather="shopping-bag" class="w-3 h-3"></i>
            <span>${device.orders.length} طلبات</span>
        </div>
    ` : '';
    
    const pauseBadge = isPaused ? `
        <div class="absolute top-3 left-3 bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/30 animate-pulse">
            ⏸ متوقف مؤقتاً
        </div>
    ` : '';
    
    div.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
                <div class="status-dot ${statusColor}"></div>
                <div>
                    <h3 class="font-bold text-lg text-white">${device.name}</h3>
                    <p class="text-xs text-gray-400">${statusText}</p>
                </div>
            </div>
            ${pauseBadge}
            <div class="text-left">
                ${device.totalPrice > 0 ? `<p class="text-lg font-black text-emerald-400">${device.totalPrice.toLocaleString()} د.ع</p>` : ''}
            </div>
        </div>
        
        ${device.customer ? `
            <div class="flex items-center gap-2 text-sm text-gray-300 mb-2">
                <i data-feather="user" class="w-4 h-4 text-blue-400"></i>
                <span class="font-medium">${device.customer}</span>
            </div>
        ` : ''}
        
        ${timerHtml}
        ${ordersHtml}
        
        ${device.status === 'available' ? `
            <div class="mt-4 flex items-center justify-center gap-2 text-yellow-500/80 text-sm font-bold">
                <i data-feather="plus-circle" class="w-4 h-4"></i>
                <span>اضغط لبدء جلسة جديدة</span>
            </div>
        ` : ''}
    `;
    
    return div;
}

// Actions
function handleDeviceClick(device) {
    state.selectedDevice = device;
    
    if (device.status === 'available') {
        openModal('modal-add');
        document.getElementById('deviceLabel').textContent = `${device.name} - فتح جلسة جديدة`;
        document.getElementById('customerNameInput').value = '';
        document.querySelectorAll('.price-btn').forEach(btn => btn.classList.remove('selected'));
        state.selectedPrice = null;
        state.selectedDuration = null;
    } else {
        openModal('modal-manage');
        document.getElementById('manageName').textContent = device.name;
        document.getElementById('manageCustomer').textContent = device.customer || 'زبون';
        updateManageModal();
    }
}

function pickPrice(minutes, price) {
    state.selectedDuration = minutes;
    state.selectedPrice = price;
    
    document.querySelectorAll('.price-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
}

function startSession() {
    const customer = document.getElementById('customerNameInput').value.trim() || 'زبون';
    
    if (!state.selectedPrice && state.selectedDuration !== 0) {
        showToast('الرجاء اختيار مدة الجلسة', 'error');
        return;
    }
    
    const device = state.selectedDevice;
    device.customer = customer;
    device.status = 'occupied';
    device.startTime = Date.now();
    device.duration = state.selectedDuration;
    device.basePrice = state.selectedPrice;
    device.totalPrice = state.selectedPrice;
    device.orders = [];
    device.elapsedPaused = 0;
    
    if (state.selectedDuration === 0) {
        // Open game mode (no timer)
        device.endTime = null;
    } else {
        device.endTime = Date.now() + (state.selectedDuration * 60 * 1000);
    }
    
    closeModal('modal-add');
    renderDevices();
    showToast(`تم بدء الجلسة في ${device.name}`, 'success');
    saveData();
}

function togglePause() {
    const device = state.selectedDevice;
    const btn = document.getElementById('pauseBtn');
    const text = document.getElementById('pauseText');
    
    if (device.status === 'occupied') {
        // Pause
        device.status = 'paused';
        device.pausedAt = Date.now();
        btn.classList.remove('border-orange-500/50', 'bg-orange-500/10', 'text-orange-400');
        btn.classList.add('border-green-500/50', 'bg-green-500/10', 'text-green-400');
        text.textContent = 'استئناف الجلسة';
        btn.innerHTML = `<i data-feather="play" class="w-5 h-5"></i><span>استئناف الجلسة</span>`;
        showToast('تم إيقاف الجلسة مؤقتاً', 'warning');
    } else if (device.status === 'paused') {
        // Resume
        const pauseDuration = Date.now() - device.pausedAt;
        device.elapsedPaused += pauseDuration;
        device.endTime += pauseDuration; // Extend end time by pause duration
        device.status = 'occupied';
        device.pausedAt = null;
        btn.classList.remove('border-green-500/50', 'bg-green-500/10', 'text-green-400');
        btn.classList.add('border-orange-500/50', 'bg-orange-500/10', 'text-orange-400');
        text.textContent = 'إيقاف مؤقت';
        btn.innerHTML = `<i data-feather="pause" class="w-5 h-5"></i><span>إيقاف مؤقت</span>`;
        showToast('تم استئناف الجلسة', 'success');
    }
    
    feather.replace();
    renderDevices();
    updateManageModal();
    saveData();
}

function addTime(minutes, price) {
    const device = state.selectedDevice;
    device.duration += minutes;
    device.basePrice += price;
    device.totalPrice += price;
    
    if (device.endTime) {
        device.endTime += minutes * 60 * 1000;
    }
    
    showToast(`تم إضافة ${minutes} دقيقة`, 'success');
    renderDevices();
    updateManageModal();
    saveData();
}

function addItem(name, price) {
    const device = state.selectedDevice;
    device.orders.push({ name, price, time: new Date().toLocaleTimeString('ar-IQ') });
    device.totalPrice += price;
    state.dailyStats.drinks++;
    
    showToast(`تم إضافة ${name}`, 'success');
    updateManageModal();
    renderDevices();
    updateStats();
    saveData();
}

function updateManageModal() {
    const device = state.selectedDevice;
    const ordersDiv = document.getElementById('currentOrders');
    const ordersList = document.getElementById('ordersList');
    
    // Update timer display
    const timerDisplay = document.getElementById('timerDisplay');
    if (device.endTime) {
        const remaining = device.endTime - Date.now();
        timerDisplay.textContent = formatTime(remaining);
        timerDisplay.className = remaining < 5 * 60 * 1000 ? 'text-3xl font-black text-red-400 font-mono animate-pulse' : 'text-3xl font-black text-yellow-400 font-mono';
    } else {
        timerDisplay.textContent = '--:--';
    }
    
    // Update pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if (device.status === 'paused') {
        pauseBtn.classList.remove('border-orange-500/50', 'bg-orange-500/10', 'text-orange-400');
        pauseBtn.classList.add('border-green-500/50', 'bg-green-500/10', 'text-green-400');
        pauseBtn.innerHTML = `<i data-feather="play" class="w-5 h-5"></i><span>استئناف الجلسة</span>`;
    } else {
        pauseBtn.classList.remove('border-green-500/50', 'bg-green-500/10', 'text-green-400');
        pauseBtn.classList.add('border-orange-500/50', 'bg-orange-500/10', 'text-orange-400');
        pauseBtn.innerHTML = `<i data-feather="pause" class="w-5 h-5"></i><span>إيقاف مؤقت</span>`;
    }
    feather.replace();
    
    // Show orders
    if (device.orders.length > 0) {
        ordersDiv.classList.remove('hidden');
        ordersList.innerHTML = device.orders.map(order => `
            <div class="flex justify-between items-center bg-white/5 p-3 rounded-xl text-sm border border-white/5">
                <div class="flex items-center gap-2">
                    <span class="text-gray-400 text-xs">${order.time}</span>
                    <span class="font-bold">${order.name}</span>
                </div>
                <span class="font-bold text-emerald-400">${order.price.toLocaleString()} د.ع</span>
            </div>
        `).join('');
    } else {
        ordersDiv.classList.add('hidden');
    }
}

function showInvoice() {
    const device = state.selectedDevice;
    closeModal('modal-manage');
    
    document.getElementById('invoice-customer-name').textContent = device.customer;
    document.getElementById('invoice-date').textContent = new Date().toLocaleString('ar-IQ');
    
    const body = document.getElementById('invoice-body');
    let html = '';
    
    // Session details
    if (device.duration > 0) {
        html += `
            <div class="flex justify-between py-2 border-b border-gray-100">
                <span>جلسة (${device.duration} دقيقة)</span>
                <span class="font-bold">${device.basePrice.toLocaleString()} د.ع</span>
            </div>
        `;
    } else {
        html += `
            <div class="flex justify-between py-2 border-b border-gray-100">
                <span>لعبة مفتوحة</span>
                <span class="font-bold">${device.basePrice.toLocaleString()} د.ع</span>
            </div>
        `;
    }
    
    // Orders
    device.orders.forEach(order => {
        html += `
            <div class="flex justify-between py-2 border-b border-gray-100">
                <span>${order.name}</span>
                <span class="font-bold">${order.price.toLocaleString()} د.ع</span>
            </div>
        `;
    });
    
    body.innerHTML = html;
    document.getElementById('invoice-total').textContent = device.totalPrice.toLocaleString() + ' د.ع';
    
    openModal('modal-invoice');
}

function confirmFinish() {
    const device = state.selectedDevice;
    
    // Add to history
    state.invoicesHistory.unshift({
        device: device.name,
        customer: device.customer,
        amount: device.totalPrice,
        time: new Date().toLocaleString('ar-IQ'),
        orders: [...device.orders]
    });
    
    // Update stats
    state.totalProfit += device.totalPrice;
    state.dailyStats.totalRevenue += device.totalPrice;
    state.dailyStats.invoices++;
    if (device.duration > 0) {
        state.dailyStats.activeHours += device.duration / 60;
    }
    
    // Reset device
    device.status = 'available';
    device.customer = '';
    device.startTime = null;
    device.endTime = null;
    device.duration = 0;
    device.basePrice = 0;
    device.totalPrice = 0;
    device.orders = [];
    device.remainingTime = 0;
    device.pausedAt = null;
    device.elapsedPaused = 0;
    
    closeModal('modal-invoice');
    renderDevices();
    updateStats();
    saveData();
    showToast('تم إنهاء الجلسة بنجاح', 'success');
}

function printInvoice() {
    window.print();
}

// Stats and UI
function updateStats() {
    document.getElementById('totalProfit').textContent = state.totalProfit.toLocaleString() + ' د.ع';
    document.getElementById('activeSessions').textContent = state.devices.filter(d => d.status === 'occupied').length;
    document.getElementById('totalDrinks').textContent = state.dailyStats.drinks;
    document.getElementById('totalHours').textContent = Math.floor(state.dailyStats.activeHours) + 'h';
    
    // Update stats modal if open
    document.getElementById('stats-total').textContent = state.dailyStats.totalRevenue.toLocaleString() + ' د.ع';
    document.getElementById('stats-invoices').textContent = state.dailyStats.invoices;
    
    const historyDiv = document.getElementById('invoices-history');
    if (state.invoicesHistory.length > 0) {
        historyDiv.innerHTML = state.invoicesHistory.map(inv => `
            <div class="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                <div>
                    <p class="font-bold text-white">${inv.device} - ${inv.customer}</p>
                    <p class="text-xs text-gray-400">${inv.time}</p>
                </div>
                <span class="font-bold text-emerald-400 text-lg">${inv.amount.toLocaleString()} د.ع</span>
            </div>
        `).join('');
    } else {
        historyDiv.innerHTML = '<p class="text-center text-gray-500 py-8">لا توجد فواتير حالياً</p>';
    }
}

function showStats() {
    updateStats();
    openModal('modal-stats');
}

function resetDailyProfit() {
    if (confirm('هل أنت متأكد من تصفير الحساب؟ سيتم حفظ الفواتير في السجل')) {
        state.totalProfit = 0;
        state.dailyStats = { totalRevenue: 0, invoices: 0, drinks: 0, activeHours: 0 };
        updateStats();
        saveData();
        showToast('تم تصفير الحساب', 'success');
    }
}

function switchTab(tab) {
    state.currentTab = tab;
    
    const tablesBtn = document.getElementById('btn-tables');
    const psBtn = document.getElementById('btn-ps');
    const tablesSection = document.getElementById('section-tables');
    const psSection = document.getElementById('section-ps');
    
    if (tab === 'tables') {
        tablesBtn.className = 'flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/25';
        psBtn.className = 'flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-white/5';
        tablesSection.classList.remove('hidden');
        psSection.classList.add('hidden');
    } else {
        psBtn.className = 'flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25';
        tablesBtn.className = 'flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-white/5';
        psSection.classList.remove('hidden');
        tablesSection.classList.add('hidden');
    }
}

// Utilities
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.body.style.overflow = '';
}

function formatTime(ms) {
    if (ms <= 0) return '00:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const colors = {
        success: 'bg-emerald-500/90 border-emerald-400',
        error: 'bg-red-500/90 border-red-400',
        warning: 'bg-orange-500/90 border-orange-400',
        info: 'bg-blue-500/90 border-blue-400'
    };
    
    const icons = {
        success: 'check-circle',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    
    toast.className = `toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[type]} text-white shadow-lg backdrop-blur-sm min-w-[300px]`;
    toast.innerHTML = `
        <i data-feather="${icons[type]}" class="w-5 h-5"></i>
        <span class="font-bold text-sm">${message}</span>
    `;
    
    container.appendChild(toast);
    feather.replace();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function startGlobalTimer() {
    setInterval(() => {
        // Update all active timers
        document.querySelectorAll('.timer-display').forEach(el => {
            const deviceId = el.getAttribute('data-device');
            const device = state.devices.find(d => d.id === deviceId);
            
            if (device && device.status === 'occupied' && device.endTime) {
                const remaining = device.endTime - Date.now();
                el.textContent = formatTime(remaining);
                
                if (remaining <= 0) {
                    // Time's up
                    showToast(`انتهى الوقت في ${device.name}!`, 'warning');
                    device.status = 'available'; // Auto release or keep occupied? Let's keep occupied but mark as finished
                    renderDevices();
                }
            }
        });
        
        // Update manage modal timer if open
        const manageModal = document.getElementById('modal-manage');
        if (!manageModal.classList.contains('hidden') && state.selectedDevice) {
            updateManageModal();
        }
    }, 1000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('[id^="modal-"]').forEach(modal => {
            if (!modal.classList.contains('hidden')) {
                closeModal(modal.id);
            }
        });
    }
});
