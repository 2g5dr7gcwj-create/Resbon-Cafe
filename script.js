const state = {
    devices: [],
    totalProfit: 0,
    selectedDevice: null,
    tempDuration: 0,
    tempPrice: 0
};

const STORAGE_KEYS = ['PRIMARY_S1', 'BACKUP_S2', 'WINDOW_S3'];
const HOURLY_RATE = 4000;

const MENU = [
    { n: "عصير طبيعي", p: 1500 }, { n: "موهيتو", p: 2500 }, { n: "جاي", p: 500 },
    { n: "جاي كرك", p: 1000 }, { n: "كبتشينو", p: 1000 }, { n: "نركيلة خشب", p: 3000 },
    { n: "نركيلة الماني", p: 5000 }, { n: "اندومي", p: 1000 }, { n: "كهوه مرة", p: 500 },
    { n: "كهوه حلوة", p: 1000 }, { n: "تايكر", p: 1250 }, { n: "مي", p: 250 },
    { n: "قيم فردي", p: 500 }, { n: "قيم زوجي", p: 1000 }
];

function initialize() {
    state.devices = []; // تفريغ المصفوفة لضمان التحديث

    const stdPrices = [
        {d:15, p:1000, label:'15 د / 1000'},
        {d:30, p:2000, label:'30 د / 2000'},
        {d:60, p:4000, label:'ساعة / 4000'},
        {d:999, p:0, label:'وقت مفتوح'}
    ];

    // إضافة الأجهزة بالترتيب الصحيح
    for(let i=1; i<=6; i++) addDevice(`منضدة ${i}`, 'billiard', stdPrices);
    for(let i=1; i<=7; i++) addDevice(`بلايستيشن ${i}`, 'ps', stdPrices);
    for(let i=1; i<=8; i++) addDevice(`بيسي ${i}`, 'pc', stdPrices);
    for(let i=1; i<=4; i++) addDevice(`طاولة طعام ${i}`, 'dining', [{d:999, p:0, label:'فتح طاولة'}]);
    
    tripleLoad(); 
    renderDevices();
    renderMenu();
    setInterval(renderDevices, 1000);
}

function addDevice(name, type, prices) {
    state.devices.push({ 
        id: Math.random().toString(36), 
        name, 
        type, 
        status: 'available', 
        customer: '', 
        endTime: null, 
        startTime: null, 
        basePrice: 0, 
        orders: [], 
        priceOptions: prices 
    });
}

function renderDevices() {
    const sections = ['billiard', 'ps', 'pc', 'dining'];
    
    sections.forEach(type => {
        const container = document.getElementById(`section-${type}`);
        if (!container) return;
        container.innerHTML = '';
        
        const filtered = state.devices.filter(d => d.type === type);
        
        filtered.forEach(dev => {
            const isOcc = dev.status === 'occupied';
            let timeDisplay = '00:00';
            let livePrice = dev.basePrice;

            if (isOcc) {
                const elapsedMs = Date.now() - dev.startTime;
                if (dev.endTime > 9000000000000) {
                    timeDisplay = formatTime(elapsedMs);
                    livePrice = Math.floor((elapsedMs / (1000 * 60)) * (HOURLY_RATE / 60));
                } else {
                    const rem = dev.endTime - Date.now();
                    timeDisplay = formatTime(rem);
                    if (rem < 0) timeDisplay = "انتهى الوقت";
                }
            }

            const totalBill = livePrice + dev.orders.reduce((a,b)=>a+b.price,0);

            const card = document.createElement('div');
            card.className = `device-card p-5 rounded-3xl glass-card ${isOcc ? 'occupied' : ''}`;
            card.onclick = () => handleDeviceClick(dev);
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-white text-sm">${dev.name}</h3>
                        <p class="text-[10px] text-gray-500">${isOcc ? '👤 ' + dev.customer : 'متاح'}</p>
                    </div>
                    <div class="text-lg font-black text-yellow-400 tabular-nums">${timeDisplay}</div>
                </div>
                <div class="mt-4 flex justify-between items-center text-emerald-400 text-[10px] font-bold">
                    <span>${totalBill.toLocaleString()} د.ع</span>
                    ${isOcc ? '<span class="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></span>' : ''}
                </div>`;
            container.appendChild(card);
        });
    });
    document.getElementById('totalProfit').innerText = state.totalProfit.toLocaleString() + " د.ع";
    tripleSave();
}

function switchTab(t) {
    const tabs = ['billiard', 'ps', 'pc', 'dining'];
    tabs.forEach(id => {
        const sec = document.getElementById('section-' + id);
        const btn = document.getElementById('btn-' + id);
        if(sec) sec.classList.add('hidden');
        if(btn) {
            btn.className = "flex-1 min-w-[100px] py-4 rounded-xl font-bold text-gray-400 whitespace-nowrap";
        }
    });
    const targetSec = document.getElementById('section-' + t);
    const targetBtn = document.getElementById('btn-' + t);
    if(targetSec) targetSec.classList.remove('hidden');
    if(targetBtn) targetBtn.className = "flex-1 min-w-[100px] py-4 rounded-xl font-bold bg-yellow-500 text-black whitespace-nowrap";
}

// الدوال الأساسية المتبقية
function handleDeviceClick(dev) {
    state.selectedDevice = dev;
    if(dev.status === 'available') {
        document.getElementById('deviceLabel').innerText = "فتح " + dev.name;
        const opts = document.getElementById('priceOptions');
        opts.innerHTML = '';
        dev.priceOptions.forEach(opt => {
            opts.innerHTML += `<button onclick="setPrice(${opt.d}, ${opt.p})" class="price-btn p-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold hover:bg-yellow-500 transition-colors">${opt.label || opt.d + ' د | ' + opt.p.toLocaleString()}</button>`;
        });
        document.getElementById('modal-add').classList.remove('hidden');
    } else { showDetails(dev); }
}

function setPrice(d, p) { state.tempDuration = d; state.tempPrice = p; }

function startSession() {
    const dev = state.selectedDevice;
    dev.customer = document.getElementById('customerNameInput').value || "زبون";
    dev.status = 'occupied';
    dev.startTime = Date.now();
    dev.basePrice = state.tempPrice;
    dev.endTime = state.tempDuration > 900 ? 9999999999999 : Date.now() + (state.tempDuration * 60000);
    closeModals();
    renderDevices();
}

function finishSession() {
    const dev = state.selectedDevice;
    let timeP = dev.basePrice;
    if (dev.endTime > 9000000000000) {
        timeP = Math.floor(((Date.now() - dev.startTime) / 60000) * (HOURLY_RATE / 60));
    }
    const total = timeP + dev.orders.reduce((a,b)=>a+b.price,0);
    if(confirm("تأكيد قبض المبلغ؟ " + total.toLocaleString())) {
        state.totalProfit += total;
        dev.status = 'available'; dev.orders = []; dev.customer = ''; dev.endTime = null; dev.startTime = null;
        closeModals();
        renderDevices();
    }
}

function showDetails(dev) {
    document.getElementById('detailsTitle').innerText = dev.name;
    document.getElementById('modal-details').classList.remove('hidden');
    updateBill();
}

function updateBill() {
    const dev = state.selectedDevice;
    const history = document.getElementById('orderHistory');
    history.innerHTML = '';
    let timeP = dev.basePrice;
    if (dev.endTime > 9000000000000) {
        timeP = Math.floor(((Date.now() - dev.startTime) / 60000) * (HOURLY_RATE / 60));
    }
    let oSum = 0;
    dev.orders.forEach(o => {
        history.innerHTML += `<div class="flex justify-between bg-white/5 p-2 rounded-lg text-xs"><span>${o.name}</span><span>${o.price}</span></div>`;
        oSum += o.price;
    });
    document.getElementById('timePriceDisplay').innerText = timeP.toLocaleString();
    document.getElementById('ordersTotalDisplay').innerText = oSum.toLocaleString();
    document.getElementById('finalTotalDisplay').innerText = (timeP + oSum).toLocaleString();
}

function renderMenu() {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';
    MENU.forEach(item => {
        grid.innerHTML += `<div onclick="addOrder('${item.n}', ${item.p})" class="menu-item">${item.n}<br><span class="text-yellow-500">${item.p}</span></div>`;
    });
}

function addOrder(n, p) { state.selectedDevice.orders.push({name:n, price:p}); updateBill(); }

function formatTime(ms) {
    const s = Math.floor(Math.abs(ms) / 1000);
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function closeModals() { document.querySelectorAll('#modal-add, #modal-details').forEach(m => m.classList.add('hidden')); }

function tripleSave() {
    const d = JSON.stringify({ devices: state.devices, totalProfit: state.totalProfit });
    localStorage.setItem(STORAGE_KEYS[0], d);
}

function tripleLoad() {
    const r = localStorage.getItem(STORAGE_KEYS[0]);
    if (r) {
        const d = JSON.parse(r);
        state.totalProfit = d.totalProfit || 0;
        d.devices.forEach(sd => {
            const i = state.devices.findIndex(x => x.name === sd.name);
            if(i !== -1) state.devices[i] = sd;
        });
    }
}

document.addEventListener('DOMContentLoaded', initialize);
