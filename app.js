// your code goes here
/* ============================================
   FUELTRACK PRO — APP.JS
============================================ */

const SK = {
  VEHICLES:  'ft_vehicles',
  RECORDS:   'ft_records',
  ACTIVE:    'ft_active',
  REMINDERS: 'ft_reminders',
  EXPENSES:  'ft_expenses',
  THEME:     'ft_theme',
};

let vehicles = [];
let records   = [];
let reminders = [];
let expenses  = [];
let activeVehicleId  = null;
let editingVehicleId = null;
let reminderTrigger  = 'date'; // 'date' | 'km'

let mileageChart = null;
let costChart    = null;
let fuelChart    = null;

/* ============================================
   LOAD / SAVE
============================================ */
function loadData() {
  vehicles  = JSON.parse(localStorage.getItem(SK.VEHICLES))  || [];
  records   = JSON.parse(localStorage.getItem(SK.RECORDS))   || [];
  reminders = JSON.parse(localStorage.getItem(SK.REMINDERS)) || [];
  expenses  = JSON.parse(localStorage.getItem(SK.EXPENSES))  || [];
  activeVehicleId = localStorage.getItem(SK.ACTIVE) || null;
}

const saveVehicles  = () => localStorage.setItem(SK.VEHICLES,  JSON.stringify(vehicles));
const saveRecords   = () => localStorage.setItem(SK.RECORDS,   JSON.stringify(records));
const saveReminders = () => localStorage.setItem(SK.REMINDERS, JSON.stringify(reminders));
const saveExpenses  = () => localStorage.setItem(SK.EXPENSES,  JSON.stringify(expenses));
const saveActive    = () => localStorage.setItem(SK.ACTIVE,    activeVehicleId || '');

const getActiveVehicle = () => vehicles.find(v => v.id === activeVehicleId) || null;

/* ============================================
   INIT
============================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  if (!activeVehicleId && vehicles.length > 0) { activeVehicleId = vehicles[0].id; saveActive(); }

  applyTheme(localStorage.getItem(SK.THEME) || 'dark');
  initThemeToggle();
  initNav();
  initMobileMenu();
  initVehicleSelect();
  initRecordModal();
  initVehicleModal();
  initReminderModal();
  initExpenseModal();
  initSettings();
  initExport();

  refreshAll();
  checkRemindersOnLoad();
});

/* ============================================
   THEME
============================================ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(SK.THEME, theme);
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (theme === 'dark') {
    icon.className  = 'fas fa-moon';
    label.textContent = 'Dark Mode';
  } else {
    icon.className  = 'fas fa-sun';
    label.textContent = 'Light Mode';
  }
  // Update chart colours if charts exist
  updateChartTheme();
}

function initThemeToggle() {
  document.getElementById('themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
}

function getThemeColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid:    dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
    tick:    dark ? '#404668' : '#9ca3af',
    tooltipBg:    dark ? '#1a1d2e' : '#ffffff',
    tooltipTitle: dark ? '#7c85b0' : '#6b7280',
    tooltipBody:  dark ? '#eef0ff' : '#111827',
  };
}

function updateChartTheme() {
  // Only re-render if at least one chart has been initialised
  if (!mileageChart && !costChart && !fuelChart) return;
  const sorted = [...records]
    .filter(r => r.vehicleId === activeVehicleId)
    .sort((a, b) => new Date(a.created) - new Date(b.created));
  if (sorted.length > 0) renderCharts(sorted);
}

/* ============================================
   NAVIGATION
============================================ */
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(item.dataset.page)?.classList.add('active');
      closeSidebar();
    });
  });
}

/* ============================================
   MOBILE MENU
============================================ */
function initMobileMenu() {
  const btn     = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);
  btn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
  overlay.addEventListener('click', closeSidebar);
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('show');
}

/* ============================================
   VEHICLE SELECT
============================================ */
function initVehicleSelect() {
  document.getElementById('vehicleSelect').addEventListener('change', e => {
    activeVehicleId = e.target.value || null;
    saveActive();
    refreshAll();
  });
}

function populateVehicleSelect() {
  const sel = document.getElementById('vehicleSelect');
  if (vehicles.length === 0) { sel.innerHTML = '<option value="">No Vehicles</option>'; return; }
  sel.innerHTML = vehicles.map(v =>
    `<option value="${v.id}" ${v.id === activeVehicleId ? 'selected' : ''}>${v.name} (${v.number})</option>`
  ).join('');
}

/* ============================================
   REFRESH ALL
============================================ */
function refreshAll() {
  populateVehicleSelect();
  updateDashboard();
  renderRecords();
  renderExpenses();
  renderVehicleGrid();
  renderReminderGrid();
  updateReminderBadge();
}

/* ============================================
   DASHBOARD
============================================ */
function updateDashboard() {
  const vr      = records.filter(r => r.vehicleId === activeVehicleId);
  const vehicle = getActiveVehicle();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  const lbl = document.getElementById('activeVehicleLabel');
  if (lbl) lbl.textContent = vehicle ? `${vehicle.name} · ${vehicle.number}` : 'Select a vehicle to begin';

  if (vr.length === 0) {
    ['currentMileage','averageMileage','bestMileage','worstMileage'].forEach(id => set(id, '— KM/L'));
    ['last30Distance','avgKmPerDay','last30Fuel','last30Cost','costPerKm','totalExpenses'].forEach(id => set(id, id === 'totalExpenses' ? '₹0' : '0'));
    renderCharts([]);
    return;
  }

  const sorted   = [...vr].sort((a, b) => new Date(a.created) - new Date(b.created));
  const latest   = sorted[sorted.length - 1];
  const mileages = sorted.map(r => r.mileage);
  const avg      = mileages.reduce((a, b) => a + b, 0) / mileages.length;

  set('currentMileage', latest.mileage.toFixed(2) + ' KM/L');
  set('averageMileage', avg.toFixed(2) + ' KM/L');
  set('bestMileage',  Math.max(...mileages).toFixed(2) + ' KM/L');
  set('worstMileage', Math.min(...mileages).toFixed(2) + ' KM/L');

  const now    = Date.now();
  const last30 = vr.filter(r => now - new Date(r.created).getTime() <= 30 * 864e5);
  const dist30 = last30.reduce((s, r) => s + r.distance, 0);
  const fuel30 = last30.reduce((s, r) => s + r.fuelLitres, 0);
  const cost30 = last30.reduce((s, r) => s + r.fuelCost, 0);

  // Avg KM/day: total distance last 30 days / 30
  const avgDay = dist30 > 0 ? (dist30 / 30).toFixed(1) : '0';

  set('last30Distance', dist30.toFixed(0) + ' KM');
  set('avgKmPerDay',    avgDay + ' KM');
  set('last30Fuel',     fuel30.toFixed(2) + ' L');
  set('last30Cost',     '₹' + cost30.toFixed(0));
  set('costPerKm',      '₹' + (dist30 > 0 ? (cost30 / dist30).toFixed(2) : '0'));

  // Total expenses (non-fuel) for active vehicle
  const vExp = expenses.filter(e => e.vehicleId === activeVehicleId);
  const totalExp = vExp.reduce((s, e) => s + e.amount, 0);
  set('totalExpenses', '₹' + totalExp.toFixed(0));

  renderCharts(sorted);
}

/* ============================================
   CHARTS
============================================ */
function makeChartOpts() {
  const c = getThemeColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: c.tooltipBg,
        titleColor:      c.tooltipTitle,
        bodyColor:       c.tooltipBody,
        borderColor:     'rgba(128,128,128,0.15)',
        borderWidth: 1, padding: 10,
      }
    },
    scales: {
      x: { ticks:{ color:c.tick, font:{size:10}, maxTicksLimit:7 }, grid:{ color:c.grid } },
      y: { ticks:{ color:c.tick, font:{size:10} },                  grid:{ color:c.grid } }
    }
  };
}

function renderCharts(sorted) {
  const labels = sorted.map(r => {
    const d = new Date(r.created);
    return `${d.getDate()}/${d.getMonth()+1}`;
  });

  // Mileage
  const mCtx = document.getElementById('mileageChart')?.getContext('2d');
  if (mCtx) {
    if (mileageChart) mileageChart.destroy();
    mileageChart = new Chart(mCtx, {
      type: 'line',
      data: { labels, datasets: [{ data: sorted.map(r => +r.mileage.toFixed(2)),
        borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.07)',
        borderWidth:2.5, pointBackgroundColor:'#6366f1', pointRadius:4,
        tension:0.4, fill:true }] },
      options: makeChartOpts()
    });
  }

  // Cost/KM
  const cCtx = document.getElementById('costChart')?.getContext('2d');
  if (cCtx) {
    if (costChart) costChart.destroy();
    costChart = new Chart(cCtx, {
      type: 'bar',
      data: { labels, datasets: [{ data: sorted.map(r => +r.costPerKm.toFixed(2)),
        backgroundColor:'rgba(234,179,8,0.55)', borderColor:'#eab308',
        borderWidth:1, borderRadius:5 }] },
      options: makeChartOpts()
    });
  }

  // Fuel
  const fCtx = document.getElementById('fuelChart')?.getContext('2d');
  if (fCtx) {
    if (fuelChart) fuelChart.destroy();
    fuelChart = new Chart(fCtx, {
      type: 'bar',
      data: { labels, datasets: [{ data: sorted.map(r => r.fuelLitres),
        backgroundColor:'rgba(34,197,94,0.55)', borderColor:'#22c55e',
        borderWidth:1, borderRadius:5 }] },
      options: makeChartOpts()
    });
  }
}

window.addEventListener('resize', () => {
  mileageChart?.resize(); costChart?.resize(); fuelChart?.resize();
});

/* ============================================
   RECORDS
============================================ */
function renderRecords() {
  const filtered = records
    .filter(r => r.vehicleId === activeVehicleId)
    .sort((a, b) => new Date(b.created) - new Date(a.created));
  renderRecordsTable(filtered);
  renderRecordsMobile(filtered);
}

function renderRecordsTable(list) {
  const tbody = document.getElementById('recordsTable');
  if (!tbody) return;
  if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="10" class="empty-row">No records for this vehicle</td></tr>'; return; }
  tbody.innerHTML = list.map(r => {
    const v = vehicles.find(x => x.id === r.vehicleId);
    return `<tr>
      <td>${new Date(r.created).toLocaleDateString('en-IN')}</td>
      <td>${v?.name||'-'}</td><td>${r.startKm}</td><td>${r.endKm}</td>
      <td>${r.distance} KM</td><td>${r.fuelLitres} L</td><td>₹${r.fuelCost}</td>
      <td>${r.mileage.toFixed(2)} KM/L</td><td>₹${r.costPerKm.toFixed(2)}</td>
      <td><button class="del-btn" onclick="deleteRecord('${r.id}')"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('');
}

function renderRecordsMobile(list) {
  const c = document.getElementById('recordsMobile');
  if (!c) return;
  if (list.length === 0) { c.innerHTML = '<div class="empty-state">No records yet. Add your first fuel entry!</div>'; return; }
  c.innerHTML = list.map(r => {
    const v = vehicles.find(x => x.id === r.vehicleId);
    const date = new Date(r.created).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
    return `<div class="rec-card">
      <div class="rec-card-header">
        <div><div class="rec-vehicle">${v?.name||'—'}</div><div class="rec-date">${date}</div></div>
        <div style="text-align:right"><div class="rec-mileage">${r.mileage.toFixed(2)}</div><div class="rec-mileage-label">KM/L</div></div>
      </div>
      <div class="rec-card-grid">
        <div class="rec-cell"><span class="rec-cell-label">Start KM</span><span class="rec-cell-val">${r.startKm}</span></div>
        <div class="rec-cell"><span class="rec-cell-label">End KM</span><span class="rec-cell-val">${r.endKm}</span></div>
        <div class="rec-cell"><span class="rec-cell-label">Distance</span><span class="rec-cell-val">${r.distance} KM</span></div>
        <div class="rec-cell"><span class="rec-cell-label">Fuel</span><span class="rec-cell-val">${r.fuelLitres} L</span></div>
        <div class="rec-cell"><span class="rec-cell-label">Cost</span><span class="rec-cell-val">₹${r.fuelCost}</span></div>
        <div class="rec-cell"><span class="rec-cell-label">₹/KM</span><span class="rec-cell-val">₹${r.costPerKm.toFixed(2)}</span></div>
      </div>
      <div class="rec-card-footer">
        <button class="del-btn" onclick="deleteRecord('${r.id}')"><i class="fas fa-trash"></i> Delete</button>
      </div>
    </div>`;
  }).join('');
}

function deleteRecord(id) {
  if (!confirm('Delete this record?')) return;
  records = records.filter(r => r.id !== id);
  saveRecords(); refreshAll();
}

/* ============================================
   RECORD MODAL
============================================ */
function initRecordModal() {
  document.getElementById('addRecordBtn')?.addEventListener('click', openRecordModal);
  document.getElementById('addRecordBtnOverview')?.addEventListener('click', openRecordModal);
  document.getElementById('closeRecordModal')?.addEventListener('click', closeRecordModal);
  document.getElementById('calculateBtn')?.addEventListener('click', calculatePreview);
  document.getElementById('saveRecord')?.addEventListener('click', saveRecord);
  // Live check as KM is typed
  document.getElementById('endKm')?.addEventListener('input', checkKmRemindersLive);
}

function openRecordModal() {
  if (vehicles.length === 0) { alert('Please add a vehicle first.'); return; }
  const sel = document.getElementById('recordVehicle');
  sel.innerHTML = vehicles.map(v =>
    `<option value="${v.id}" ${v.id === activeVehicleId ? 'selected' : ''}>${v.name} (${v.number})</option>`
  ).join('');
  ['startKm','endKm','fuelLitres','fuelCost'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('previewMileage').textContent    = '— KM/L';
  document.getElementById('previewCostPerKm').textContent  = '—';
  document.getElementById('kmReminderAlert').style.display = 'none';
  document.getElementById('recordModal').classList.add('show');
}

function closeRecordModal() { document.getElementById('recordModal').classList.remove('show'); }

function calculatePreview() {
  const start = +document.getElementById('startKm').value;
  const end   = +document.getElementById('endKm').value;
  const litres= +document.getElementById('fuelLitres').value;
  const cost  = +document.getElementById('fuelCost').value;
  if (!start||!end||!litres||!cost) { alert('Fill all fields first.'); return; }
  if (end <= start) { alert('Ending KM must be greater than Starting KM.'); return; }
  const dist    = end - start;
  const mileage = dist / litres;
  const cpk     = cost / dist;
  document.getElementById('previewMileage').textContent   = mileage.toFixed(2) + ' KM/L';
  document.getElementById('previewCostPerKm').textContent = '₹' + cpk.toFixed(2);
}

// Called as user types endKm — shows relevant KM-based reminders
function checkKmRemindersLive() {
  const endKm    = +document.getElementById('endKm').value;
  const vId      = document.getElementById('recordVehicle').value;
  const alertBox = document.getElementById('kmReminderAlert');
  if (!endKm || !vId) { alertBox.style.display = 'none'; return; }

  const triggered = reminders.filter(r => {
    if (r.vehicleId !== vId || r.triggerMode !== 'km') return false;
    const due    = r.triggerKm;
    const before = r.kmBefore || 200;
    // Show if endKm is within the warning window or past due
    return endKm >= (due - before) && endKm < due + 1000;
  });

  if (triggered.length === 0) { alertBox.style.display = 'none'; return; }

  const rt = REMINDER_TYPES;
  alertBox.innerHTML = triggered.map(rem => {
    const kmLeft = rem.triggerKm - endKm;
    const status = kmLeft <= 0 ? 'OVERDUE' : `Due in ${kmLeft} KM`;
    return `<div class="kra-item">
      <div class="kra-icon"><i class="fas ${(rt[rem.type]||rt.other).icon}"></i></div>
      <div class="kra-body">
        <div class="kra-title">${(rt[rem.type]||rt.other).label} Reminder — ${status}</div>
        <div class="kra-sub">Set at ${rem.triggerKm} KM${rem.note ? ' · ' + rem.note : ''}</div>
      </div>
    </div>`;
  }).join('');
  alertBox.style.display = 'block';
}

function saveRecord() {
  const start   = +document.getElementById('startKm').value;
  const end     = +document.getElementById('endKm').value;
  const litres  = +document.getElementById('fuelLitres').value;
  const cost    = +document.getElementById('fuelCost').value;
  const vId     = document.getElementById('recordVehicle').value;
  const dateVal = document.getElementById('recordDate').value;

  if (!start||!end||!litres||!cost) { alert('Fill all fields.'); return; }
  if (end <= start) { alert('Ending KM must be greater than Starting KM.'); return; }

  const dist      = end - start;
  const mileage   = dist / litres;
  const costPerKm = cost / dist;

  records.push({
    id: 'REC-' + Date.now(), vehicleId: vId,
    startKm: start, endKm: end, distance: dist,
    fuelLitres: litres, fuelCost: cost, mileage, costPerKm,
    created: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
  });

  saveRecords();
  closeRecordModal();
  refreshAll();
}

/* ============================================
   VEHICLE MANAGEMENT
============================================ */
function initVehicleModal() {
  document.getElementById('addVehicleBtn')?.addEventListener('click', () => openVehicleModal(null));
  document.getElementById('closeVehicleModal')?.addEventListener('click', closeVehicleModal);
  document.getElementById('cancelVehicleModal')?.addEventListener('click', closeVehicleModal);
  document.getElementById('saveVehicle')?.addEventListener('click', saveVehicle);
}

function openVehicleModal(vid) {
  editingVehicleId = vid;
  document.getElementById('vehicleModalTitle').textContent = vid ? 'Edit Vehicle' : 'Add Vehicle';
  if (vid) {
    const v = vehicles.find(x => x.id === vid);
    document.getElementById('vehicleName').value   = v.name   || '';
    document.getElementById('vehicleNumber').value = v.number || '';
    document.getElementById('vehicleType').value   = v.type   || 'Bike';
    document.getElementById('fuelType').value      = v.fuel   || 'Petrol';
  } else {
    ['vehicleName','vehicleNumber'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('vehicleType').value = 'Bike';
    document.getElementById('fuelType').value    = 'Petrol';
  }
  document.getElementById('vehicleModal').classList.add('show');
}

function closeVehicleModal() { document.getElementById('vehicleModal').classList.remove('show'); editingVehicleId = null; }

function saveVehicle() {
  const name   = document.getElementById('vehicleName').value.trim();
  const number = document.getElementById('vehicleNumber').value.trim();
  const type   = document.getElementById('vehicleType').value;
  const fuel   = document.getElementById('fuelType').value;
  if (!name)   { alert('Enter vehicle name.'); return; }
  if (!number) { alert('Enter registration number.'); return; }

  if (editingVehicleId) {
    const v = vehicles.find(x => x.id === editingVehicleId);
    if (v) Object.assign(v, { name, number, type, fuel });
  } else {
    const v = { id:'VH-'+Date.now(), name, number, type, fuel, created:new Date().toISOString() };
    vehicles.push(v);
    if (!activeVehicleId) { activeVehicleId = v.id; saveActive(); }
  }
  saveVehicles(); closeVehicleModal(); refreshAll();
}

function deleteVehicle(id) {
  if (!confirm('Delete this vehicle and all its data?')) return;
  vehicles  = vehicles.filter(v => v.id !== id);
  records   = records.filter(r => r.vehicleId !== id);
  reminders = reminders.filter(r => r.vehicleId !== id);
  expenses  = expenses.filter(e => e.vehicleId !== id);
  if (activeVehicleId === id) { activeVehicleId = vehicles[0]?.id || null; saveActive(); }
  saveVehicles(); saveRecords(); saveReminders(); saveExpenses(); refreshAll();
}

function setActiveVehicle(id) { activeVehicleId = id; saveActive(); refreshAll(); }

function renderVehicleGrid() {
  const grid = document.getElementById('vehicleGrid');
  if (!grid) return;
  if (vehicles.length === 0) { grid.innerHTML = '<div class="empty-state">No vehicles added yet.<br>Click <strong>Add Vehicle</strong> to begin.</div>'; return; }
  const icons = { Scooty:'🛵', Bike:'🏍️', Car:'🚗', Van:'🚐', Bus:'🚌', Lorry:'🚛', Truck:'🚚' };
  grid.innerHTML = vehicles.map(v => {
    const isActive  = v.id === activeVehicleId;
    const recCount  = records.filter(r => r.vehicleId === v.id).length;
    const expCount  = expenses.filter(e => e.vehicleId === v.id).length;
    return `<div class="vehicle-card ${isActive?'is-active':''}">
      ${isActive?'<div class="active-badge">Active</div>':''}
      <div class="vc-top">
        <div class="vc-icon">${icons[v.type]||'🚗'}</div>
        <div><div class="vc-name">${v.name}</div><div class="vc-number">${v.number}</div></div>
      </div>
      <div class="vc-tags">
        <span class="vc-tag">${v.type}</span>
        <span class="vc-tag">${v.fuel}</span>
        <span class="vc-tag">${recCount} records</span>
        <span class="vc-tag">${expCount} expenses</span>
      </div>
      <div class="vc-actions">
        ${!isActive ? `<button class="vc-btn-set" onclick="setActiveVehicle('${v.id}')">Set Active</button>`
                    : '<button class="vc-btn-set" style="opacity:.45;cursor:default">Active</button>'}
        <button class="vc-btn-edit" onclick="openVehicleModal('${v.id}')"><i class="fas fa-pen"></i></button>
        <button class="vc-btn-del"  onclick="deleteVehicle('${v.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ============================================
   EXPENSE LOG
============================================ */
const EXP_CATS = {
  service:   { label:'Service',       icon:'fa-wrench',          cls:'cat-service' },
  parts:     { label:'Parts',         icon:'fa-gears',           cls:'cat-parts' },
  tyre:      { label:'Tyre',          icon:'fa-circle-notch',    cls:'cat-tyre' },
  battery:   { label:'Battery',       icon:'fa-battery-full',    cls:'cat-battery' },
  insurance: { label:'Insurance',     icon:'fa-shield-alt',      cls:'cat-insurance' },
  pollution: { label:'PUC',           icon:'fa-leaf',            cls:'cat-pollution' },
  cleaning:  { label:'Cleaning',      icon:'fa-spray-can',       cls:'cat-cleaning' },
  other:     { label:'Other',         icon:'fa-circle-question', cls:'cat-other' },
};

function initExpenseModal() {
  document.getElementById('addExpenseBtn')?.addEventListener('click', openExpenseModal);
  document.getElementById('closeExpenseModal')?.addEventListener('click', closeExpenseModal);
  document.getElementById('cancelExpenseModal')?.addEventListener('click', closeExpenseModal);
  document.getElementById('saveExpense')?.addEventListener('click', saveExpense);
}

function openExpenseModal() {
  if (vehicles.length === 0) { alert('Add a vehicle first.'); return; }
  const sel = document.getElementById('expenseVehicle');
  sel.innerHTML = vehicles.map(v =>
    `<option value="${v.id}" ${v.id === activeVehicleId ? 'selected' : ''}>${v.name} (${v.number})</option>`
  ).join('');
  document.getElementById('expenseDate').value     = new Date().toISOString().split('T')[0];
  document.getElementById('expenseAmount').value   = '';
  document.getElementById('expenseKm').value       = '';
  document.getElementById('expenseDesc').value     = '';
  document.getElementById('expenseCategory').value = 'service';
  document.getElementById('expenseModal').classList.add('show');
}

function closeExpenseModal() { document.getElementById('expenseModal').classList.remove('show'); }

function saveExpense() {
  const vId    = document.getElementById('expenseVehicle').value;
  const date   = document.getElementById('expenseDate').value;
  const cat    = document.getElementById('expenseCategory').value;
  const amount = +document.getElementById('expenseAmount').value;
  const km     = +document.getElementById('expenseKm').value || null;
  const desc   = document.getElementById('expenseDesc').value.trim();

  if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }
  if (!date)  { alert('Enter a date.'); return; }

  expenses.push({ id:'EXP-'+Date.now(), vehicleId:vId, date, category:cat, amount, km, desc, created:new Date().toISOString() });
  saveExpenses(); closeExpenseModal(); refreshAll();
}

function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses(); refreshAll();
}

function renderExpenses() {
  const vExp = expenses
    .filter(e => e.vehicleId === activeVehicleId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  renderExpenseSummary(vExp);
  renderExpenseTable(vExp);
  renderExpenseMobile(vExp);
}

function renderExpenseSummary(vExp) {
  const box = document.getElementById('expenseSummary');
  if (!box) return;
  const total = vExp.reduce((s, e) => s + e.amount, 0);

  // Group by category
  const byCat = {};
  vExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const topCats = Object.entries(byCat).sort((a,b) => b[1]-a[1]).slice(0,3);

  box.innerHTML = `
    <div class="exp-sum-card">
      <div class="exp-sum-icon"><i class="fas fa-wallet"></i></div>
      <div><div class="exp-sum-val">₹${total.toFixed(0)}</div><div class="exp-sum-lab">Total Spent</div></div>
    </div>
    <div class="exp-sum-card">
      <div class="exp-sum-icon"><i class="fas fa-list-check"></i></div>
      <div><div class="exp-sum-val">${vExp.length}</div><div class="exp-sum-lab">Entries</div></div>
    </div>
    ${topCats.map(([cat, amt]) => {
      const ec = EXP_CATS[cat] || EXP_CATS.other;
      return `<div class="exp-sum-card">
        <div class="exp-sum-icon"><i class="fas ${ec.icon}"></i></div>
        <div><div class="exp-sum-val">₹${amt.toFixed(0)}</div><div class="exp-sum-lab">${ec.label}</div></div>
      </div>`;
    }).join('')}
  `;
}

function renderExpenseTable(vExp) {
  const tbody = document.getElementById('expenseTable');
  if (!tbody) return;
  if (vExp.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No expenses logged yet</td></tr>'; return; }
  tbody.innerHTML = vExp.map(e => {
    const v  = vehicles.find(x => x.id === e.vehicleId);
    const ec = EXP_CATS[e.category] || EXP_CATS.other;
    return `<tr>
      <td>${new Date(e.date).toLocaleDateString('en-IN')}</td>
      <td>${v?.name||'-'}</td>
      <td><span class="cat-pill ${ec.cls}"><i class="fas ${ec.icon}"></i>${ec.label}</span></td>
      <td>${e.desc || '—'}</td>
      <td>₹${e.amount.toFixed(0)}</td>
      <td>${e.km ? e.km + ' KM' : '—'}</td>
      <td><button class="del-btn" onclick="deleteExpense('${e.id}')"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('');
}

function renderExpenseMobile(vExp) {
  const c = document.getElementById('expenseMobile');
  if (!c) return;
  if (vExp.length === 0) { c.innerHTML = ''; return; }
  c.innerHTML = vExp.map(e => {
    const v  = vehicles.find(x => x.id === e.vehicleId);
    const ec = EXP_CATS[e.category] || EXP_CATS.other;
    return `<div class="rec-card">
      <div class="rec-card-header">
        <div>
          <div class="rec-vehicle">${v?.name||'—'}</div>
          <div class="rec-date">${new Date(e.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>
        <div style="text-align:right">
          <div class="rec-mileage" style="font-size:18px">₹${e.amount.toFixed(0)}</div>
          <span class="cat-pill ${ec.cls}" style="font-size:10px"><i class="fas ${ec.icon}"></i>${ec.label}</span>
        </div>
      </div>
      <div class="rec-card-grid">
        <div class="rec-cell"><span class="rec-cell-label">Description</span><span class="rec-cell-val" style="font-size:12px;white-space:normal">${e.desc||'—'}</span></div>
        <div class="rec-cell"><span class="rec-cell-label">KM Reading</span><span class="rec-cell-val">${e.km ? e.km+' KM' : '—'}</span></div>
      </div>
      <div class="rec-card-footer">
        <button class="del-btn" onclick="deleteExpense('${e.id}')"><i class="fas fa-trash"></i> Delete</button>
      </div>
    </div>`;
  }).join('');
}

/* ============================================
   REMINDERS
============================================ */
const REMINDER_TYPES = {
  service:   { label:'Service',           icon:'fa-wrench' },
  insurance: { label:'Insurance Expiry',  icon:'fa-shield-alt' },
  pollution: { label:'PUC Certificate',   icon:'fa-leaf' },
  tyre:      { label:'Tyre Change',       icon:'fa-circle-notch' },
  oil:       { label:'Oil Change',        icon:'fa-oil-can' },
  other:     { label:'Other',             icon:'fa-bell' },
};

function initReminderModal() {
  document.getElementById('addReminderBtn')?.addEventListener('click', openReminderModal);
  document.getElementById('closeReminderModal')?.addEventListener('click', closeReminderModal);
  document.getElementById('cancelReminderModal')?.addEventListener('click', closeReminderModal);
  document.getElementById('saveReminder')?.addEventListener('click', saveReminderItem);

  // Trigger toggle
  document.getElementById('triggerByDate')?.addEventListener('click', () => setTriggerMode('date'));
  document.getElementById('triggerByKm')?.addEventListener('click',   () => setTriggerMode('km'));
}

function setTriggerMode(mode) {
  reminderTrigger = mode;
  document.getElementById('triggerByDate').classList.toggle('active', mode === 'date');
  document.getElementById('triggerByKm').classList.toggle('active',   mode === 'km');
  document.getElementById('dateFields').style.display = mode === 'date' ? 'contents' : 'none';
  document.getElementById('kmFields').style.display   = mode === 'km'   ? 'contents' : 'none';
}

function openReminderModal() {
  if (vehicles.length === 0) { alert('Add a vehicle first.'); return; }
  const sel = document.getElementById('reminderVehicle');
  sel.innerHTML = vehicles.map(v =>
    `<option value="${v.id}" ${v.id === activeVehicleId ? 'selected' : ''}>${v.name} (${v.number})</option>`
  ).join('');
  document.getElementById('reminderDate').value      = '';
  document.getElementById('reminderKm').value        = '';
  document.getElementById('reminderNote').value      = '';
  document.getElementById('reminderDaysBefore').value = 7;
  document.getElementById('reminderKmBefore').value  = 200;
  document.getElementById('reminderType').value      = 'service';
  setTriggerMode('date');
  document.getElementById('reminderModal').classList.add('show');
}

function closeReminderModal() { document.getElementById('reminderModal').classList.remove('show'); }

function saveReminderItem() {
  const vId  = document.getElementById('reminderVehicle').value;
  const type = document.getElementById('reminderType').value;
  const note = document.getElementById('reminderNote').value.trim();

  if (reminderTrigger === 'date') {
    const date       = document.getElementById('reminderDate').value;
    const daysBefore = +document.getElementById('reminderDaysBefore').value || 7;
    if (!date) { alert('Set a due date.'); return; }
    reminders.push({ id:'REM-'+Date.now(), vehicleId:vId, type, note, triggerMode:'date', date, daysBefore, created:new Date().toISOString() });
  } else {
    const km       = +document.getElementById('reminderKm').value;
    const kmBefore = +document.getElementById('reminderKmBefore').value || 200;
    if (!km || km <= 0) { alert('Enter a valid KM reading.'); return; }
    reminders.push({ id:'REM-'+Date.now(), vehicleId:vId, type, note, triggerMode:'km', triggerKm:km, kmBefore, created:new Date().toISOString() });
  }

  saveReminders(); closeReminderModal(); renderReminderGrid(); updateReminderBadge();
}

function deleteReminder(id) {
  reminders = reminders.filter(r => r.id !== id);
  saveReminders(); renderReminderGrid(); updateReminderBadge();
}

/* Get status for a reminder — supports both date and km modes */
function getReminderStatus(rem) {
  if (rem.triggerMode === 'km') {
    // Get latest endKm for this vehicle
    const vr = records.filter(r => r.vehicleId === rem.vehicleId);
    const latestKm = vr.length > 0 ? Math.max(...vr.map(r => r.endKm)) : 0;
    const kmLeft   = rem.triggerKm - latestKm;

    if (kmLeft <= 0)               return { status:'overdue', label:`${Math.abs(kmLeft)} KM overdue` };
    if (kmLeft <= rem.kmBefore)    return { status:'warn',    label:`Due in ${kmLeft} KM` };
    return                                { status:'ok',      label:`Due in ${kmLeft} KM` };
  }

  // Date mode
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(rem.date); due.setHours(0,0,0,0);
  const daysLeft = Math.round((due - today) / 864e5);

  if (daysLeft < 0)               return { status:'overdue', label:`${Math.abs(daysLeft)} days overdue` };
  if (daysLeft <= rem.daysBefore) return { status:'warn',    label:`Due in ${daysLeft} day${daysLeft===1?'':'s'}` };
  return                                 { status:'ok',      label:`Due in ${daysLeft} days` };
}

function renderReminderGrid() {
  const grid = document.getElementById('reminderGrid');
  if (!grid) return;
  if (reminders.length === 0) { grid.innerHTML = '<div class="empty-state">No reminders set.</div>'; return; }

  const sorted = [...reminders].sort((a, b) => {
    const sa = getReminderStatus(a).status;
    const sb = getReminderStatus(b).status;
    const order = { overdue:0, warn:1, ok:2 };
    return (order[sa]||2) - (order[sb]||2);
  });

  grid.innerHTML = sorted.map(rem => {
    const v  = vehicles.find(x => x.id === rem.vehicleId);
    const rt = REMINDER_TYPES[rem.type] || REMINDER_TYPES.other;
    const { status, label } = getReminderStatus(rem);
    const triggerBadge = rem.triggerMode === 'km'
      ? `<span class="rem-trigger-badge"><i class="fas fa-road"></i> At ${rem.triggerKm} KM (−${rem.kmBefore} KM warn)</span>`
      : `<span class="rem-trigger-badge"><i class="fas fa-calendar"></i> ${new Date(rem.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} (−${rem.daysBefore}d warn)</span>`;
    return `<div class="rem-card rem-${status}">
      <div class="rem-top">
        <div>
          <div class="rem-type ${status}"><i class="fas ${rt.icon}"></i> ${rt.label}</div>
          <div class="rem-vehicle">${v?.name||'Unknown'}</div>
          ${triggerBadge}
          ${rem.note ? `<div class="rem-note"><i class="fas fa-note-sticky"></i> ${rem.note}</div>` : ''}
          <div class="rem-days ${status}">⚡ ${label}</div>
        </div>
        <button class="rem-del" onclick="deleteReminder('${rem.id}')"><i class="fas fa-times"></i></button>
      </div>
    </div>`;
  }).join('');
}

function updateReminderBadge() {
  const badge = document.getElementById('reminderBadge');
  if (!badge) return;
  const count = reminders.filter(r => { const { status } = getReminderStatus(r); return status === 'warn' || status === 'overdue'; }).length;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

/* ============================================
   REMINDER POPUP ON LOAD
============================================ */
function checkRemindersOnLoad() {
  const alerts = reminders.filter(r => {
    const { status } = getReminderStatus(r);
    return status === 'warn' || status === 'overdue';
  });
  if (alerts.length === 0) return;

  const overlay  = document.getElementById('reminderOverlay');
  const list     = document.getElementById('reminderList');
  const subtitle = document.getElementById('reminderSubtitle');
  subtitle.textContent = `${alerts.length} alert${alerts.length > 1 ? 's' : ''} need your attention`;

  list.innerHTML = alerts.map(rem => {
    const v  = vehicles.find(x => x.id === rem.vehicleId);
    const rt = REMINDER_TYPES[rem.type] || REMINDER_TYPES.other;
    const { status, label } = getReminderStatus(rem);
    return `<div class="rl-item ${status}">
      <div class="rl-icon"><i class="fas ${rt.icon}"></i></div>
      <div class="rl-body">
        <div class="rl-title">${v?.name||'?'} · ${rt.label}</div>
        <div class="rl-sub">${label}${rem.note ? ' · ' + rem.note : ''}</div>
      </div>
    </div>`;
  }).join('');

  overlay.style.display        = 'flex';
  overlay.style.alignItems     = 'center';
  overlay.style.justifyContent = 'center';

  document.getElementById('reminderNoted').onclick = () => { overlay.style.display = 'none'; };
}

/* ============================================
   SETTINGS
============================================ */
function initSettings() {
  document.getElementById('exportJson')?.addEventListener('click', exportJSON);
  document.getElementById('importJson')?.addEventListener('change', importJSON);
  document.getElementById('deleteAllData')?.addEventListener('click', deleteAll);
}

function exportJSON() {
  const data = { vehicles, records, reminders, expenses, activeVehicleId };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href:url, download:'FuelTrack_Backup.json' });
  a.click(); URL.revokeObjectURL(url);
}

function importJSON(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      vehicles  = d.vehicles  || [];
      records   = d.records   || [];
      reminders = d.reminders || [];
      expenses  = d.expenses  || [];
      activeVehicleId = d.activeVehicleId || null;
      saveVehicles(); saveRecords(); saveReminders(); saveExpenses(); saveActive();
      refreshAll(); alert('Backup restored!');
    } catch { alert('Invalid JSON file.'); }
  };
  reader.readAsText(file);
}

function deleteAll() {
  if (!confirm('Delete ALL data permanently?')) return;
  vehicles=[]; records=[]; reminders=[]; expenses=[]; activeVehicleId=null;
  Object.values(SK).forEach(k => localStorage.removeItem(k));
  refreshAll(); alert('All data deleted.');
}

/* ============================================
   EXPORT EXCEL / PDF
============================================ */
function initExport() {
  document.getElementById('exportExcel')?.addEventListener('click', exportExcel);
  document.getElementById('exportPDF')?.addEventListener('click', exportPDF);
}

function exportExcel() {
  const v = getActiveVehicle(); if (!v) { alert('Select a vehicle.'); return; }
  const vr = records.filter(r => r.vehicleId === v.id);
  if (!vr.length) { alert('No records to export.'); return; }
  const data = vr.map(r => ({
    Date: new Date(r.created).toLocaleDateString('en-IN'),
    Vehicle: v.name, 'Reg No': v.number,
    'Start KM': r.startKm, 'End KM': r.endKm,
    'Distance (KM)': r.distance, 'Fuel (L)': r.fuelLitres,
    'Cost (₹)': r.fuelCost, 'Mileage (KM/L)': r.mileage.toFixed(2),
    'Cost/KM (₹)': r.costPerKm.toFixed(2),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Records');
  XLSX.writeFile(wb, `${v.name}_Fuel.xlsx`);
}

async function exportPDF() {
  const v = getActiveVehicle(); if (!v) { alert('Select a vehicle.'); return; }
  const vr = records.filter(r => r.vehicleId === v.id).sort((a,b) => new Date(a.created)-new Date(b.created));
  if (!vr.length) { alert('No records to export.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF(); let y = 15;
  doc.setFontSize(18); doc.text('Fuel Mileage Report', 15, y); y+=10;
  doc.setFontSize(11);
  doc.text(`Vehicle: ${v.name} (${v.number}) | Type: ${v.type} | Fuel: ${v.fuel}`, 15, y); y+=12;
  const mls = vr.map(r => r.mileage);
  const avg = (mls.reduce((a,b)=>a+b,0)/mls.length).toFixed(2);
  doc.setFontSize(12); doc.text('Summary', 15, y); y+=7;
  doc.setFontSize(10);
  doc.text(`Current: ${vr[vr.length-1].mileage.toFixed(2)} | Avg: ${avg} | Best: ${Math.max(...mls).toFixed(2)} | Worst: ${Math.min(...mls).toFixed(2)} KM/L`, 15, y); y+=12;
  doc.setFontSize(12); doc.text('Records', 15, y); y+=7;
  vr.forEach(r => {
    if (y > 270) { doc.addPage(); y=20; }
    doc.setFontSize(9);
    doc.text(`${new Date(r.created).toLocaleDateString('en-IN')} | ${r.distance} KM | ${r.fuelLitres}L | ${r.mileage.toFixed(2)} KM/L | ₹${r.fuelCost}`, 15, y); y+=6;
  });
  doc.save(`${v.name}_Report.pdf`);
}

// Data is already saved on every action — no beforeunload needed
