const state = {
    devices: [],
    totalProfit: 0,
    dailyStats: { drinks: 0 },
    selectedDevice: null,
    selectedDuration: null,
    selectedPrice: null
};

const STORAGE_KEYS = ['PRIMARY_S1', 'BACKUP_S2', 'WINDOW_S3'];

// نظام الحفظ الثلاثي لمنع التصفير
function tripleSave() {
    const data = JSON.stringify({
        devices: state.devices,
        totalProfit: state.totalProfit,
        dailyStats: state.dailyStats,
        timestamp: Date.now()
    });
    localStorage.setItem(STORAGE_KEYS[0], data);
    sessionStorage.setItem(STORAGE_KEYS[1], data);
    window.name = data;
}

function tripleLoad() {
    const raw = localStorage.getItem(STORAGE_KEYS[0]) || sessionStorage.getItem(STORAGE_KEYS[1]) || (window.name.includes('devices') ? window.name : null);
    if (raw) {
        const data = JSON.parse(raw);
        state.devices = data.devices || [];
        state.totalProfit = data.totalProfit || 0;
        state.dailyStats = data.dailyStats || { drinks: 0 };
    }
}

function initializeDevices() {
    if (state.devices.length === 0) {
        for (let i = 1; i <= 6; i++) state.devices.push({ id: `table-${i}`, name: `منضدة ${i}`, type: 'table', status: 'available', customer: '', endTime: null, totalPrice: 0, orders: [] });
        for (let i = 1; i <= 8; i++) state.devices.push({ id: `ps-${i}`, name: `بلايستيشن ${i}`, type: 'ps', status: 'available', customer: '', endTime: null, totalPrice: 0, orders: [] });
    }
}

function renderDevices() {
    const sections = { table: document.getElementById('section-tables'), ps: document.getElementById('section-ps') };
    sections.table.innerHTML = ''; sections.ps.innerHTML = '';
    
    state.devices.forEach(dev => {
        const isOccupied = dev.status !== 'available';
        const remaining = dev.endTime ? dev.endTime - Date.now() : 0;
        
        const card = document.createElement('div');
        card.className = `device-card p-5 rounded-2xl border transition-all cursor-pointer ${isOccupied ? 'border-yellow-500 bg-yellow-500/5' : 'border-white/10 bg-white/5'}`;
        card.onclick = () => handleDeviceClick(dev.id);
        
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div><h3 class="font-bold text-white">${dev.name}</h3><p class="text-[10px] text-gray-500">${isOccupied ? '👤 ' + dev.customer : 'متاح'}</p></div>
                <div class="text-xl font-black text-yellow-400 tabular-nums">${isOccupied ? formatTime(remaining) : '00:00'}</div>
            </div>
            <div class="mt-4 text-emerald-400 text-xs font-bold">${dev.totalPrice.toLocaleString()} د.ع</div>
        `;
        sections[dev.type].appendChild(card);
    });
    tripleSave();
}

function handleDeviceClick(id) {
    state.selectedDevice = state.devices.find(d => d.id === id);
    if (state.selectedDevice.status === 'available') {
        document.getElementById('modal-add').classList.remove('hidden');
    }
}

function startSession() {
    const dev = state.selectedDevice;
    dev.customer = document.getElementById('customerNameInput').value || "زبون";
    dev.status = 'occupied';
    dev.endTime = Date.now() + (state.selectedDuration * 60 * 1000);
    dev.totalPrice = state.selectedPrice;
    document.getElementById('modal-add').classList.add('hidden');
    renderDevices();
}

function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(Math.abs(totalSec) / 60);
    const s = Math.abs(totalSec) % 60;
    return `${totalSec < 0 ? '-' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function pickPrice(m, p) { state.selectedDuration = m; state.selectedPrice = p; }

document.addEventListener('DOMContentLoaded', () => {
    tripleLoad();
    initializeDevices();
    renderDevices();
    setInterval(renderDevices, 1000); // تحديث العداد كل ثانية
});
