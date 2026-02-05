const state = {
    devices: [],
    totalProfit: 0,
    selectedDevice: null,
    tempDuration: 0,
    tempPrice: 0
};

const STORAGE_KEYS = ['PRIMARY_S1', 'BACKUP_S2', 'WINDOW_S3'];
const HOURLY_RATE = 4000; // سعر الساعة الثابت لكل الأقسام

const MENU = [
    { n: "عصير طبيعي", p: 1500 }, { n: "موهيتو", p: 2500 }, { n: "جاي", p: 500 },
    { n: "جاي كرك", p: 1000 }, { n: "كبتشينو", p: 1000 }, { n: "نركيلة خشب", p: 3000 },
    { n: "نركيلة الماني", p: 5000 }, { n: "اندومي", p: 1000 }, { n: "كهوه مرة", p: 500 },
    { n: "كهوه حلوة", p: 1000 }, { n: "تايكر", p: 1250 }, { n: "مي", p: 250 },
    { n: "قيم فردي", p: 500 }, { n: "قيم زوجي", p: 1000 }
];

function initialize() {
    // خيارات الوقت القياسية (الساعة بـ 4000)
    const stdPrices = [
        {d:15, p:1000, label:'15 د / 1000'},
        {d:30, p:2000, label:'30 د / 2000'},
        {d:60, p:4000, label:'ساعة / 4000'},
        {d:999, p:0, label:'وقت مفتوح'}
    ];

    // 1. قسم المنضدة (6 مناضد)
    for(let i=1; i<=6; i++) addDevice(`منضدة ${i}`, 'billiard', stdPrices);
    
    // 2. قسم البلايستيشن (7 بليات)
    for(let i=1; i<=7; i++) addDevice(`بلايستيشن ${i}`, 'ps', stdPrices);
    
    // 3. قسم البيسي (8 بيسيات)
    for(let i=1; i<=8; i++) addDevice(`بيسي ${i}`, 'pc', stdPrices);
    
    // 4. قسم طاولات الطعام (4 طاولات)
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
    ['billiard', 'ps', 'pc', 'dining'].forEach(type => {
        const container = document.getElementById(`section-${type}`);
        if (!container) return;
        container.innerHTML = '';
        
        state.devices.filter(d => d.type === type).forEach(dev => {
            const isOcc = dev.status === 'occupied';
            let timeDisplay = '00:00';
            let liveTimePrice = dev.basePrice;

            if (isOcc) {
                const elapsedMs = Date.now() - dev.startTime;
                
                if (dev.endTime > 9000000000000) {
                    // الوقت المفتوح: حساب مالي تصاعدي (4000 للساعة)
                    timeDisplay = formatTime(elapsedMs);
                    const elapsedMinutes = elapsedMs / (1000 * 60);
                    liveTimePrice = Math.floor(elapsedMinutes * (HOURLY_RATE / 60));
                } else {
                    // الوقت المحدد: عد تنازلي
                    const rem = dev.endTime - Date.now();
                    timeDisplay = formatTime(rem);
                    if (rem < 0) timeDisplay = "انتهى الوقت";
                }
            }

            const totalOrders = dev.orders.reduce((a, b) => a + b.price, 0);
            const totalBill = liveTimePrice + totalOrders;

            const card = document.createElement('div');
            card.className = `device-card p-5 rounded-3xl glass-card ${isOcc ? 'occupied' : ''}`;
            card.onclick = () => handleDeviceClick(dev);
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-white text-sm">${dev.name}</h3>
                        <p class="text-[10px] text-gray-500">${isOcc ? '👤 ' + dev.customer : 'متاح'}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-lg font-black text-yellow-400 tabular-nums">${timeDisplay}</div>
                    </div>
                </div>
                <div class="mt-4 flex justify-between items-center text-emerald-400 text-[11px] font-bold">
                    <span>${totalBill.toLocaleString()} د.ع</span>
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
            opts.innerHTML += `<button onclick="setPrice(${opt.d}, ${opt.p})" class="price-btn p-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold hover:bg-yellow-500 hover:text-black transition-all">${opt.label || opt.d + ' د | ' + opt.p.toLocaleString()}</button>`;
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
    document.getElementById('customerNameInput').value = ''; // تصفير الحقل
    closeModals();
    renderDevices();
}

function finishSession() {
    const dev = state.selectedDevice;
    let finalTimePrice = dev.basePrice;

    if (dev.endTime > 9000000000000) {
        const elapsedMinutes = (Date.now() - dev.startTime) / (1000 * 60);
        finalTimePrice = Math.floor(elapsedMinutes * (HOURLY_RATE / 60));
    }

    const totalOrders = dev.orders.reduce((a, b) => a + b.price, 0);
    const grandTotal = finalTimePrice + totalOrders;

    if(confirm(`تأكيد قبض مبلغ ${grandTotal.toLocaleString()} د.ع وإنهاء الجلسة؟`)) {
        state.totalProfit += grandTotal;
        dev.status = 'available'; 
        dev.orders = []; 
        dev.customer = ''; 
        dev.endTime = null; 
        dev.startTime = null;
        closeModals();
        renderDevices();
    }
}

function switchTab(t) {
    const tabs = ['billiard', 'ps', 'pc', 'dining'];
    tabs.forEach(id => {
        document.getElementById('section-' + id).classList.add('hidden');
        document.getElementById('btn-' + id).className = "flex-1 min-w-[100px] py-4 rounded-xl font-bold text-gray-400 whitespace-nowrap";
    });
    document.getElementById('section-' + t).classList.remove('hidden');
    document.getElementById('btn-' + t).className = "flex-1 min-w-[100px] py-4 rounded-xl font-bold bg-yellow-500 text-black whitespace-nowrap";
}

function updateBill() {
    const dev = state.selectedDevice;
    const history = document.getElementById('orderHistory');
    history.innerHTML = '';
    
    let timePrice = dev.basePrice;
    if (dev.endTime > 9000000000000) {
        const elapsedMinutes = (Date.now() - dev.startTime) / (1000 * 60);
        timePrice = Math.floor(elapsedMinutes * (HOURLY_RATE / 60));
    }

    let ordersSum = 0;
    dev.orders.forEach(o => {
        history.innerHTML += `<div class="flex justify-between bg-white/5 p-2 rounded-lg text-xs"><span>${o.name}</span><span>${o.price.toLocaleString()}</span></div>`;
        ordersSum += o.price;
    });

    document.getElementById('timePriceDisplay').innerText = timePrice.toLocaleString() + " د.ع";
    document.getElementById('ordersTotalDisplay').innerText = ordersSum.toLocaleString() + " د.ع";
    document.getElementById('finalTotalDisplay').innerText = (timePrice + ordersSum).toLocaleString() + " د.ع";
}

// الدوال المساعدة الباقية (renderMenu, addOrder, showDetails, formatTime, tripleSave, tripleLoad, closeModals)
function renderMenu() {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';
    MENU.forEach(item => {
        grid.innerHTML += `<div onclick="addOrder('${item.n}', ${item.p})" class="menu-item cursor-pointer p-2 bg-white/5 border border-white/10 rounded-xl text-center hover:bg-yellow-500/20">${item.n}<br><span class="text-yellow-500 font-bold">${item.p}</span></div>`;
    });
}

function addOrder(name, price) {
    state.selectedDevice.orders.push({ name, price });
    updateBill();
    tripleSave();
}

function showDetails(dev) {
    document.getElementById('detailsTitle').innerText = dev.name + " | " + dev.customer;
    document.getElementById('modal-details').classList.remove('hidden');
    updateBill();
}

function formatTime(ms) {
    const totalSeconds = Math.floor(Math.abs(ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function closeModals() { document.querySelectorAll('#modal-add, #modal-details').forEach(m => m.classList.add('hidden')); }

function tripleSave() {
    const data = JSON.stringify({ devices: state.devices, totalProfit: state.totalProfit });
    localStorage.setItem(STORAGE_KEYS[0], data);
    sessionStorage.setItem(STORAGE_KEYS[1], data);
    window.name = data;
}

function tripleLoad() {
    const raw = localStorage.getItem(STORAGE_KEYS[0]) || sessionStorage.getItem(STORAGE_KEYS[1]);
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

document.addEventListener('DOMContentLoaded', () => {
    initialize();
    feather.replace();
});
