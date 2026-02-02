const STORAGE_KEY = 'RESBON_SERVER_DATA_V4';

const state = {
    tables: Array(6).fill(null).map((_, i) => ({ id: i + 1, type: 'tables', name: `منضدة ${i + 1}`, session: null })),
    ps: Array(8).fill(null).map((_, i) => ({ id: i + 1, type: 'ps', name: `بلايستيشن ${i + 1}`, session: null })),
    totalProfit: 0,
    activeDev: null,
    selMins: 60,
    selPrice: 4000
};

function saveToServer() {
    const data = {
        totalProfit: state.totalProfit,
        tables: state.tables,
        ps: state.ps,
        lastSave: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromServer() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const data = JSON.parse(saved);
    state.totalProfit = data.totalProfit || 0;
    
    const sync = (savedList, currentList) => {
        savedList.forEach((d, i) => {
            if (d.session) {
                const passed = Math.floor((Date.now() - data.lastSave) / 1000);
                currentList[i].session = d.session;
                currentList[i].session.elapsed += passed;
            }
        });
    };
    sync(data.tables, state.tables);
    sync(data.ps, state.ps);
    document.getElementById('totalProfit').textContent = state.totalProfit.toLocaleString() + ' د.ع';
}

setInterval(() => {
    let active = false;
    [...state.tables, ...state.ps].forEach(d => {
        if (!d.session) return;
        d.session.elapsed++; active = true;
        let display = "";
        if (d.session.totalMins === 0) display = "لعبة واحدة";
        else {
            let rem = (d.session.totalMins * 60) - d.session.elapsed;
            let m = Math.floor(Math.abs(rem) / 60);
            let s = Math.abs(rem) % 60;
            display = (rem < 0 ? "-" : "") + `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            if (rem < 0) document.getElementById(`t-${d.type}-${d.id}`)?.classList.add('text-red-500');
        }
        const el = document.getElementById(`t-${d.type}-${d.id}`);
        if (el) el.textContent = display;
    });
    if (active) saveToServer();
}, 1000);

function render() {
    ['tables', 'ps'].forEach(type => {
        const container = document.getElementById(`section-${type}`);
        container.innerHTML = state[type].map(d => `
            <div class="glass p-5 flex items-center justify-between ${d.session ? 'active-glow border-blue-500' : ''}">
                <div>
                    <h3 class="font-bold text-sm text-slate-300">${d.name}</h3>
                    <p class="text-[10px] text-blue-400 font-bold">${d.session ? '👤 ' + d.session.customer : '--'}</p>
                    <div id="t-${d.type}-${d.id}" class="text-2xl font-black text-white mt-1 tabular-nums">
                        ${d.session ? 'جاري..' : '--:--'}
                    </div>
                </div>
                <button onclick="openAction('${d.type}', ${d.id})" class="px-7 py-3 rounded-2xl font-bold transition-all ${d.session ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}">
                    ${d.session ? 'إدارة' : 'حجز'}
                </button>
            </div>
        `).join('');
    });
}

function openAction(type, id) {
    state.activeDev = state[type].find(d => d.id === id);
    if (state.activeDev.session) {
        document.getElementById('manageName').textContent = state.activeDev.name;
        document.getElementById('manageCustomer').textContent = "الزبون: " + state.activeDev.session.customer;
        document.getElementById('modal-manage').classList.remove('hidden');
    } else {
        document.getElementById('customerNameInput').value = "";
        document.getElementById('deviceLabel').textContent = state.activeDev.name;
        document.getElementById('modal-add').classList.remove('hidden');
    }
}

function startSession() {
    const cName = document.getElementById('customerNameInput').value.trim() || "زبون خارجي";
    state.activeDev.session = { totalMins: state.selMins, price: state.selPrice, items: [], elapsed: 0, customer: cName };
    saveToServer(); render(); closeModal('modal-add');
}

function addTime(m, p) {
    state.activeDev.session.totalMins += m;
    state.activeDev.session.price += p;
    saveToServer(); alert("تم التمديد ⚡");
}

function addItem(name, price) {
    state.activeDev.session.price += price;
    state.activeDev.session.items.push({ name, price });
    saveToServer(); alert("تمت الإضافة 🥤");
}

function showInvoice() {
    const s = state.activeDev.session;
    document.getElementById('invoice-customer-name').textContent = "الزبون: " + s.customer;
    document.getElementById('invoice-date').textContent = new Date().toLocaleString('ar-IQ');
    let html = `<div class="flex justify-between border-b border-black pb-1 mb-2"><span>الخدمة: ${state.activeDev.name}</span><span>${s.totalMins === 0 ? s.price : (s.totalMins + ' د')}</span></div>`;
    s.items.forEach(item => {
        html += `<div class="flex justify-between text-[10px]"><span>+ ${item.name}</span><span>${item.price}</span></div>`;
    });
    document.getElementById('invoice-body').innerHTML = html;
    document.getElementById('invoice-total').textContent = s.price.toLocaleString() + ' د.ع';
    document.getElementById('modal-invoice').classList.remove('hidden');
}

function confirmFinish() {
    state.totalProfit += state.activeDev.session.price;
    state.activeDev.session = null;
    document.getElementById('totalProfit').textContent = state.totalProfit.toLocaleString() + ' د.ع';
    saveToServer(); render();
    closeModal('modal-invoice'); closeModal('modal-manage');
}

function pickPrice(m, p) { state.selMins = m; state.selPrice = p; }
function switchTab(t) {
    document.getElementById('section-tables').classList.toggle('hidden', t !== 'tables');
    document.getElementById('section-ps').classList.toggle('hidden', t !== 'ps');
    document.getElementById('btn-tables').className = t === 'tables' ? 'flex-1 py-3 glass bg-blue-600 font-bold' : 'flex-1 py-3 glass text-slate-400 font-bold';
    document.getElementById('btn-ps').className = t === 'ps' ? 'flex-1 py-3 glass bg-blue-600 font-bold' : 'flex-1 py-3 glass text-slate-400 font-bold';
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

loadFromServer();
render();
