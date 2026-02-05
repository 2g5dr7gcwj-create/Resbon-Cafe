const state = {
    devices: [],
    totalProfit: 0,
    selectedDevice: null,
    tempDuration: 0,
    tempPrice: 0
};

const STORAGE_KEYS = ['PRIMARY_S1', 'BACKUP_S2', 'WINDOW_S3'];
const HOURLY_RATE = 4000; // السعر الثابت للساعة (للأجهزة المفتوحة)

const MENU = [
    { n: "عصير طبيعي", p: 1500 }, { n: "موهيتو", p: 2500 }, { n: "جاي", p: 500 },
    { n: "جاي كرك", p: 1000 }, { n: "كبتشينو", p: 1000 }, { n: "نركيلة خشب", p: 3000 },
    { n: "نركيلة الماني", p: 5000 }, { n: "اندومي", p: 1000 }, { n: "كهوه مرة", p: 500 },
    { n: "كهوه حلوة", p: 1000 }, { n: "تايكر", p: 1250 }, { n: "مي", p: 250 },
    { n: "قيم فردي", p: 500 }, { n: "قيم زوجي", p: 1000 }
];

function initialize() {
    // خيارات الوقت (ساعة بـ 4000)
    const stdPrices = [
        {d:15, p:1000, label:'15 د / 1000'},
        {d:30, p:2000, label:'30 د / 2000'},
        {d:60, p:4000, label:'ساعة / 4000'},
        {d:999, p:0, label:'وقت مفتوح'}
    ];

    // تقسيم الأقسام كما طلبت
    for(let i=1; i<=6; i++) addDevice(`منضدة ${i}`, 'billiard', stdPrices);
    for(let i=1; i<=7; i++) addDevice(`بلايستيشن ${i}`, 'ps', stdPrices);
    for(let i=1; i<=8; i++) addDevice(`بيسي ${i}`, 'pc', stdPrices);
    for(let i=1; i<=4; i++) addDevice(`طاولة طعام ${i}`, 'dining', [{d:999, p:0, label:'وقت مفتوح'}]);
    
    tripleLoad();
    renderDevices();
    renderMenu();
    setInterval(renderDevices, 1000);
}

function addDevice(name, type, prices) {
    state.devices.push({ id: Math.random().toString(36), name, type, status: 'available', customer: '', endTime: null, startTime: null, basePrice: 0, orders: [], priceOptions: prices });
}

function renderDevices() {
    // الأقسام الأربعة الجديدة
    ['billiard', 'ps', 'pc', 'dining'].forEach(type => {
        const container = document.getElementById(`section-${type}`);
        if (!container) return;
        container.innerHTML = '';
        
        state.devices.filter(d => d.type === type).forEach(dev => {
            const isOcc = dev.status === 'occupied';
            let timeDisplay = '00:00';
            let livePrice = dev.basePrice;

            if (isOcc) {
                const elapsedMs = Date.now() - dev.startTime;
                if (dev.endTime > 9000000000000) {
                    // وقت مفتوح: يحسب السعر تصاعدياً 4000/ساعة
                    timeDisplay = formatTime(elapsedMs);
                    livePrice = Math.floor((elapsedMs / (1000 * 60)) * (HOURLY_RATE / 60));
                } else {
                    // وقت محدد: عد تنازلي
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
                    <div><h3 class="font-bold text-white text-sm">${dev.name}</h3><p class="text-[10px] text-gray-500">${isOcc ? '👤 ' + dev.customer : 'متاح'}</p></div>
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

// باقي الدوال (handleDeviceClick, startSession, addOrder, finishSession إلخ) تبقى كما هي مع تغيير بسيط في finishSession لحساب السعر النهائي المفتوح.

function finishSession() {
    const dev = state.selectedDevice;
    let finalTimePrice = dev.basePrice;

    if (dev.endTime > 9000000000000) {
        const elapsedMinutes = (Date.now() - dev.startTime) / (1000 * 60);
        finalTimePrice = Math.floor(elapsedMinutes * (HOURLY_RATE / 60));
    }

    const totalBill = finalTimePrice + dev.orders.reduce((a,b)=>a+b.price,0);

    if(confirm(`قبض مبلغ: ${totalBill.toLocaleString()} د.ع؟`)) {
        state.totalProfit += totalBill;
        dev.status = 'available'; dev.orders = []; dev.customer = ''; dev.endTime = null; dev.startTime = null;
        closeModals();
        renderDevices();
    }
}

// الدوال المساعدة للحفظ (tripleSave, tripleLoad, formatTime) تبقى بدون تغيير لضمان عمل النظام القديم
