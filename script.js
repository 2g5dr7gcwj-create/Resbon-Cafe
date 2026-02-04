const state = {
    devices: [],
    totalProfit: 0,
    selectedDevice: null,
    tempDuration: 0,
    tempPrice: 0
};

const STORAGE_KEYS = ['PRIMARY_S1', 'BACKUP_S2', 'WINDOW_S3'];

const MENU = [
    { n: "عصير طبيعي", p: 1500 }, { n: "موهيتو", p: 2500 }, { n: "جاي", p: 500 },
    { n: "جاي كرك", p: 1000 }, { n: "كبتشينو", p: 1000 }, { n: "نركيلة خشب", p: 3000 },
    { n: "نركيلة الماني", p: 5000 }, { n: "اندومي", p: 1000 }, { n: "كهوه مرة", p: 500 },
    { n: "كهوه حلوة", p: 1000 }, { n: "تايكر", p: 1250 }, { n: "مي", p: 250 }
];

function initialize() {
    // 6 مناضد + 4 طاولات طعام
    for(let i=1; i<=6; i++) addDevice(`منضدة ${i}`, 'table', [{d:60, p:8000}, {d:999, p:0, label:'وقت مفتوح'}]);
    for(let i=1; i<=4; i++) addDevice(`طاولة طعام ${i}`, 'table', [{d:999, p:0, label:'وقت مفتوح'}]);
    // 7 بليات
    for(let i=1; i<=7; i++) addDevice(`بلايستيشن ${i}`, 'ps', [{d:60, p:8000}, {d:30, p:4000}]);
    // 8 بيسيات
    for(let i=1; i<=8; i++) addDevice(`بيسي ${i}`, 'pc', [{d:30, p:1000}, {d:60, p:2000}, {d:999, p:0, label:'وقت مفتوح'}]);
    
    tripleLoad();
    renderDevices();
    renderMenu();
    setInterval(renderDevices, 1000);
}

function addDevice(name, type, prices) {
    state.devices.push({ id: Math.random().toString(36), name, type, status: 'available', customer: '', endTime: null, basePrice: 0, orders: [], priceOptions: prices });
}

function renderDevices() {
    ['table', 'ps', 'pc'].forEach(type => {
        const container = document.getElementById(`section-${type === 'table' ? 'tables' : type}`);
        if (!container) return;
        container.innerHTML = '';
        state.devices.filter(d => d.type === type).forEach(dev => {
            const isOcc = dev.status === 'occupied';
            const rem = dev.endTime && dev.endTime < 9999999999999 ? dev.endTime - Date.now() : 0;
            const card = document.createElement('div');
            card.className = `device-card p-5 rounded-3xl glass-card ${isOcc ? 'occupied' : ''}`;
            card.onclick = () => handleDeviceClick(dev);
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div><h3 class="font-bold text-white text-sm">${dev.name}</h3><p class="text-[10px] text-gray-500">${isOcc ? '👤 ' + dev.customer : 'متاح'}</p></div>
                    <div class="text-lg font-black text-yellow-400 tabular-nums ${isOcc && rem < 0 && dev.endTime < 9999999999999 ? 'time-up' : ''}">
                        ${isOcc ? (dev.endTime > 9000000000000 ? 'مفتوح' : formatTime(rem)) : '00:00'}
                    </div>
                </div>
                <div class="mt-4 flex justify-between items-center text-emerald-400 text-[10px] font-bold">
                    <span>${(dev.basePrice + dev.orders.reduce((a,b)=>a+b.price,0)).toLocaleString()} د.ع</span>
                    ${isOcc ? '<span class="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></span>' : ''}
                </div>`;
            container.appendChild(card);
        });
    });
    document.getElementById('totalProfit').innerText = state.totalProfit.toLocaleString() + " د.ع";
    tripleSave();
}

function handleDeviceClick(dev) {
    state.selectedDevice = dev;
    if(dev.status === 'available') {
        document.getElementById('deviceLabel').innerText = "فتح " + dev.name;
        const opts = document.getElementById('priceOptions');
        opts.innerHTML = '';
        dev.priceOptions.forEach(opt => {
            opts.innerHTML += `<button onclick="setPrice(${opt.d}, ${opt.p})" class="price-btn p-4 bg-white/5 border border-white/10 rounded-2xl text-xs">${opt.label || opt.d + ' د | ' + opt.p.toLocaleString()}</button>`;
        });
        document.getElementById('modal-add').classList.remove('hidden');
    } else { showDetails(dev); }
}

function setPrice(d, p) { state.tempDuration = d; state.tempPrice = p; }

function startSession() {
    const dev = state.selectedDevice;
    dev.customer = document.getElementById('customerNameInput').value || "زبون";
    dev.status = 'occupied';
    dev.basePrice = state.tempPrice;
    dev.endTime = state.tempDuration > 900 ? 9999999999999 : Date.now() + (state.tempDuration * 60000);
    closeModals();
    renderDevices();
}

function renderMenu() {
    const grid = document.getElementById('menuGrid');
    MENU.forEach(item => {
        grid.innerHTML += `<div onclick="addOrder('${item.n}', ${item.p})" class="menu-item">${item.n}<br><span class="text-yellow-500">${item.p}</span></div>`;
    });
}

function addOrder(name, price) {
    state.selectedDevice.orders.push({ name, price });
    updateBill();
    tripleSave();
}

function updateBill() {
    const dev = state.selectedDevice;
    const history = document.getElementById('orderHistory');
    history.innerHTML = '';
    let ordersSum = 0;
    dev.orders.forEach(o => {
        history.innerHTML += `<div class="flex justify-between bg-white/5 p-2 rounded-lg"><span>${o.name}</span><span>${o.price.toLocaleString()}</span></div>`;
        ordersSum += o.price;
    });
    document.getElementById('timePriceDisplay').innerText = dev.basePrice.toLocaleString();
    document.getElementById('ordersTotalDisplay').innerText = ordersSum.toLocaleString();
    document.getElementById('finalTotalDisplay').innerText = (dev.basePrice + ordersSum).toLocaleString();
}

function showDetails(dev) {
    document.getElementById('detailsTitle').innerText = dev.name + " | " + dev.customer;
    document.getElementById('modal-details').classList.remove('hidden');
    updateBill();
}

function finishSession() {
    if(confirm("تأكيد قبض المبلغ؟")) {
        const dev = state.selectedDevice;
        state.totalProfit += (dev.basePrice + dev.orders.reduce((a,b)=>a+b.price,0));
        dev.status = 'available'; dev.orders = []; dev.customer = ''; dev.endTime = null;
        closeModals();
        renderDevices();
    }
}

function switchTab(t) {
    ['tables', 'ps', 'pc'].forEach(id => {
        document.getElementById('section-' + id).classList.add('hidden');
        document.getElementById('btn-' + id).className = "flex-1 py-4 rounded-xl font-bold text-gray-400";
    });
    document.getElementById('section-' + t).classList.remove('hidden');
    document.getElementById('btn-' + t).className = "flex-1 py-4 rounded-xl font-bold bg-yellow-500 text-black";
}

function formatTime(ms) {
    const s = Math.floor(Math.abs(ms)/1000);
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function closeModals() { document.querySelectorAll('#modal-add, #modal-details').forEach(m => m.classList.add('hidden')); }

function tripleSave() {
    const data = JSON.stringify({ devices: state.devices, totalProfit: state.totalProfit });
    localStorage.setItem(STORAGE_KEYS[0], data);
    sessionStorage.setItem(STORAGE_KEYS[1], data);
    window.name = data;
}

function tripleLoad() {
    const raw = localStorage.getItem(STORAGE_KEYS[0]) || sessionStorage.getItem(STORAGE_KEYS[1]) || (window.name.includes('devices') ? window.name : null);
    if (raw) {
        const data = JSON.parse(raw);
        state.totalProfit = data.totalProfit || 0;
        if(data.devices) {
            data.devices.forEach(savedDev => {
                const index = state.devices.findIndex(d => d.name === savedDev.name);
                if(index !== -1) state.devices[index] = savedDev;
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', initialize);
