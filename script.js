// 1. تحديث دالة العرض لتشمل الأقسام الأربعة
function renderDevices() {
    // تأكد من وجود هذه الأسماء بالضبط
    const types = ['billiard', 'ps', 'pc', 'dining']; 
    
    types.forEach(type => {
        const container = document.getElementById(`section-${type}`);
        if (!container) return; // لضمان عدم حدوث خطأ إذا لم يجد الحاوية
        container.innerHTML = '';
        
        state.devices.filter(d => d.type === type).forEach(dev => {
            // ... (بقية كود رسم الكارتات كما هو)
            const isOcc = dev.status === 'occupied';
            // (تكملة الكود الذي أرسلته لك سابقاً)
            const card = document.createElement('div');
            card.className = `device-card p-5 rounded-3xl glass-card ${isOcc ? 'occupied' : ''}`;
            card.onclick = () => handleDeviceClick(dev);
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-white text-sm">${dev.name}</h3>
                        <p class="text-[10px] text-gray-500">${isOcc ? '👤 ' + dev.customer : 'متاح'}</p>
                    </div>
                    <div class="text-lg font-black text-yellow-400 tabular-nums">${isOcc ? formatTime(Date.now() - dev.startTime) : '00:00'}</div>
                </div>
                <div class="mt-4 flex justify-between items-center text-emerald-400 text-[11px] font-bold">
                    <span>حساب الوقت...</span>
                </div>`;
            container.appendChild(card);
        });
    });
}

// 2. تحديث دالة التنقل (Tabs)
function switchTab(t) {
    const tabs = ['billiard', 'ps', 'pc', 'dining'];
    tabs.forEach(id => {
        const section = document.getElementById('section-' + id);
        const btn = document.getElementById('btn-' + id);
        if(section) section.classList.add('hidden');
        if(btn) btn.className = "flex-1 min-w-[100px] py-4 rounded-xl font-bold text-gray-400 whitespace-nowrap";
    });
    
    const targetSection = document.getElementById('section-' + t);
    const targetBtn = document.getElementById('btn-' + t);
    if(targetSection) targetSection.classList.remove('hidden');
    if(targetBtn) targetBtn.className = "flex-1 min-w-[100px] py-4 rounded-xl font-bold bg-yellow-500 text-black whitespace-nowrap";
}
