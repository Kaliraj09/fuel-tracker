/* ============================================
   FUEL TRACKER — APP.JS
   Full rewrite with:
   - Multi-vehicle management
   - Reminder system (service, insurance, PUC, tyre)
   - Reminder popup on load
   - Mobile-optimised records
   - Charts (Chart.js)
   - No KM/Rupee metric
============================================ */

/* ============================================
   STORAGE KEYS
============================================ */
const SK = {
  VEHICLES: 'ft_vehicles',
  RECORDS: 'ft_records',
  ACTIVE: 'ft_active',
  REMINDERS: 'ft_reminders',
};

/* ============================================
   APP STATE
============================================ */
let vehicles = [];
let records = [];
let activeVehicleId = null;
let reminders = [];
let editingVehicleId = null;

let mileageChart = null;
let costChart = null;
let fuelChart = null;

/* ============================================
   LOAD / SAVE
============================================ */
function loadData() {
  vehicles = JSON.parse(localStorage.getItem(SK.VEHICLES)) || [];
  records = JSON.parse(localStorage.getItem(SK.RECORDS)) || [];
  activeVehicleId = localStorage.getItem(SK.ACTIVE) || null;
  reminders = JSON.parse(localStorage.getItem(SK.REMINDERS)) || [];
}

function saveVehicles() { localStorage.setItem(SK.VEHICLES, JSON.stringify(vehicles)); }
function saveRecords() { localStorage.setItem(SK.RECORDS, JSON.stringify(records)); }
function saveActive() { localStorage.setItem(SK.ACTIVE, activeVehicleId || ''); }
function saveReminders() { localStorage.setItem(SK.REMINDERS, JSON.stringify(reminders)); }

function getActiveVehicle() {
  return vehicles.find(v => v.id === activeVehicleId) || null;
}

/* ============================================
   INIT
============================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // If no active vehicle, default to first
  if (!activeVehicleId && vehicles.length > 0) {
    activeVehicleId = vehicles[0].id;
    saveActive();
  }

  initNav();
  initMobileMenu();
  initVehicleSelect();
  initRecordModal();
  initVehicleModal();
  initReminderModal();
  initSettings();
  initExport();

  refreshAll();
  checkRemindersOnLoad();
});

/* ============================================
   NAVIGATION
============================================ */
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      const page = item.dataset.page;
      document.getElementById(page)?.classList.add('active');
      closeSidebar();
    });
  });
}

/* ============================================
   MOBILE MENU
============================================ */
function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });

  overlay.addEventListener('click', closeSidebar);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('show');
}

/* ============================================
   VEHICLE SELECT (sidebar)
============================================ */
function initVehicleSelect() {
  const sel = document.getElementById('vehicleSelect');
  sel.addEventListener('change', () => {
    activeVehicleId = sel.value || null;
    saveActive();
    refreshAll();
  });
}

function populateVehicleSelect() {
  const sel = document.getElementById('vehicleSelect');
  sel.innerHTML = '';

  if (vehicles.length === 0) {
    sel.innerHTML = '<option value="">No Vehicles</option>';
    return;
  }

  vehicles.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.name} (${v.number})`;
    if (v.id === activeVehicleId) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* ============================================
   REFRESH ALL
============================================ */
function refreshAll() {
  populateVehicleSelect();
  updateDashboard();
  renderRecords();
  renderVehicleGrid();
  renderReminderGrid();
  updateReminderBadge();
}

/* ============================================
   DASHBOARD
============================================ */
function updateDashboard() {
  const vehicleRecords = records.filter(r => r.vehicleId === activeVehicleId);
  const vehicle = getActiveVehicle();

  const label = document.getElementById('activeVehicleLabel');
  if (label) label.textContent = vehicle ? `${vehicle.name} · ${vehicle.number}` : 'Select a vehicle to begin';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  if (vehicleRecords.length === 0) {
    set('currentMileage', '— KM/L');
    set('averageMileage', '— KM/L');
    set('bestMileage', '— KM/L');
    set('worstMileage', '— KM/L');
    set('last30Distance', '0 KM');
    set('last30Fuel', '0 L');
    set('last30Cost', '₹0');
    set('totalRecords', '0');
    set('costPerKm', '₹0');
    renderCharts([], vehicle);
    return;
  }

  const sorted = [...vehicleRecords].sort((a, b) => new Date(a.created) - new Date(b.created));
  const latest = sorted[sorted.length - 1];
  const mileages = sorted.map(r => r.mileage);
  const avg = mileages.reduce((a, b) => a + b, 0) / mileages.length;

  set('currentMileage', latest.mileage.toFixed(2) + ' KM/L');
  set('averageMileage', avg.toFixed(2) + ' KM/L');
  set('bestMileage', Math.max(...mileages).toFixed(2) + ' KM/L');
  set('worstMileage', Math.min(...mileages).toFixed(2) + ' KM/L');
  set('totalRecords', vehicleRecords.length);

  const now = Date.now();
  const last30 = vehicleRecords.filter(r => now - new Date(r.created).getTime() <= 30 * 864e5);
  const dist30 = last30.reduce((s, r) => s + r.distance, 0);
  const fuel30 = last30.reduce((s, r) => s + r.fuelLitres, 0);
  const cost30 = last30.reduce((s, r) => s + r.fuelCost, 0);

  set('last30Distance', dist30.toFixed(0) + ' KM');
  set('last30Fuel', fuel30.toFixed(2) + ' L');
  set('last30Cost', '₹' + cost30.toFixed(0));
  set('costPerKm', '₹' + (dist30 > 0 ? (cost30 / dist30).toFixed(2) : '0'));

  renderCharts(sorted, vehicle);
}

/* ============================================
   CHARTS
============================================ */
const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#252d3d',
      titleColor: '#8899bb',
      bodyColor: '#f0f4ff',
      borderColor: 'rgba(255,255,255,0.07)',
      borderWidth: 1,
      padding: 10,
    }
  },
  scales: {
    x: {
      ticks: { color: '#556070', font: { size: 10 }, maxTicksLimit: 7 },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
    y: {
      ticks: { color: '#556070', font: { size: 10 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    }
  }
};

function renderCharts(sorted, vehicle) {
  const labels = sorted.map(r => {
    const d = new Date(r.created);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  // Mileage chart
  const mileageCtx = document.getElementById('mileageChart')?.getContext('2d');
  if (mileageCtx) {
    if (mileageChart) mileageChart.destroy();
    mileageChart = new Chart(mileageCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: sorted.map(r => +r.mileage.toFixed(2)),
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14,165,233,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#0ea5e9',
          pointRadius: 4,
          tension: 0.4,
          fill: true,
        }]
      },
      options: { ...CHART_OPTS }
    });
  }

  // Cost/km chart
  const costCtx = document.getElementById('costChart')?.getContext('2d');
  if (costCtx) {
    if (costChart) costChart.destroy();
    costChart = new Chart(costCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: sorted.map(r => +r.costPerKm.toFixed(2)),
          backgroundColor: 'rgba(234,179,8,0.6)',
          borderColor: '#eab308',
          borderWidth: 1,
          borderRadius: 5,
        }]
      },
      options: { ...CHART_OPTS }
    });
  }

  // Fuel chart
  const fuelCtx = document.getElementById('fuelChart')?.getContext('2d');
  if (fuelCtx) {
    if (fuelChart) fuelChart.destroy();
    fuelChart = new Chart(fuelCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: sorted.map(r => r.fuelLitres),
          backgroundColor: 'rgba(34,197,94,0.6)',
          borderColor: '#22c55e',
          borderWidth: 1,
          borderRadius: 5,
        }]
      },
      options: { ...CHART_OPTS }
    });
  }
}

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

function renderRecordsTable(filtered) {
  const tbody = document.getElementById('recordsTable');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-row">No records found for this vehicle</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const v = vehicles.find(x => x.id === r.vehicleId);
    const date = new Date(r.created).toLocaleDateString('en-IN');
    return `
      <tr>
        <td>${date}</td>
        <td>${v?.name || '-'}</td>
        <td>${r.startKm}</td>
        <td>${r.endKm}</td>
        <td>${r.distance} KM</td>
        <td>${r.fuelLitres} L</td>
        <td>₹${r.fuelCost}</td>
        <td>${r.mileage.toFixed(2)} KM/L</td>
        <td>₹${r.costPerKm.toFixed(2)}</td>
        <td><button class="del-btn" onclick="deleteRecord('${r.id}')"><i class="fas fa-trash"></i></button></td>
      </tr>`;
  }).join('');
}

function renderRecordsMobile(filtered) {
  const container = document.getElementById('recordsMobile');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-reminders">No records yet. Add your first fuel entry!</div>';
    return;
  }

  container.innerHTML = filtered.map(r => {
    const v = vehicles.find(x => x.id === r.vehicleId);
    const date = new Date(r.created).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `
      <div class="rec-card">
        <div class="rec-card-header">
          <div>
            <div class="rec-vehicle">${v?.name || '—'}</div>
            <div class="rec-date">${date}</div>
          </div>
          <div style="text-align:right">
            <div class="rec-mileage">${r.mileage.toFixed(2)}</div>
            <div class="rec-mileage-label">KM/L</div>
          </div>
        </div>
        <div class="rec-card-grid">
          <div class="rec-cell">
            <span class="rec-cell-label">Start KM</span>
            <span class="rec-cell-val">${r.startKm}</span>
          </div>
          <div class="rec-cell">
            <span class="rec-cell-label">End KM</span>
            <span class="rec-cell-val">${r.endKm}</span>
          </div>
          <div class="rec-cell">
            <span class="rec-cell-label">Distance</span>
            <span class="rec-cell-val">${r.distance} KM</span>
          </div>
          <div class="rec-cell">
            <span class="rec-cell-label">Fuel</span>
            <span class="rec-cell-val">${r.fuelLitres} L</span>
          </div>
          <div class="rec-cell">
            <span class="rec-cell-label">Cost</span>
            <span class="rec-cell-val">₹${r.fuelCost}</span>
          </div>
          <div class="rec-cell">
            <span class="rec-cell-label">₹/KM</span>
            <span class="rec-cell-val">₹${r.costPerKm.toFixed(2)}</span>
          </div>
        </div>
        <div class="rec-card-footer">
          <button class="del-btn" onclick="deleteRecord('${r.id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>`;
  }).join('');
}

function deleteRecord(id) {
  if (!confirm('Delete this record?')) return;
  records = records.filter(r => r.id !== id);
  saveRecords();
  refreshAll();
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

  // Set today's date as default
  const dateInput = document.getElementById('recordDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
}

function openRecordModal() {
  if (vehicles.length === 0) {
    alert('Please add a vehicle first.');
    return;
  }

  // Populate vehicle dropdown
  const sel = document.getElementById('recordVehicle');
  sel.innerHTML = vehicles.map(v =>
    `<option value="${v.id}" ${v.id === activeVehicleId ? 'selected' : ''}>${v.name} (${v.number})</option>`
  ).join('');

  // Reset form
  ['startKm', 'endKm', 'fuelLitres', 'fuelCost'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('previewMileage').textContent = '— KM/L';
  document.getElementById('previewCostPerKm').textContent = '—';

  document.getElementById('recordModal').classList.add('show');
}

function closeRecordModal() {
  document.getElementById('recordModal').classList.remove('show');
}

function calculatePreview() {
  const start = +document.getElementById('startKm').value;
  const end = +document.getElementById('endKm').value;
  const litres = +document.getElementById('fuelLitres').value;
  const cost = +document.getElementById('fuelCost').value;

  if (!start || !end || !litres || !cost) { alert('Fill all fields first.'); return; }
  if (end <= start) { alert('Ending KM must be greater than Starting KM.'); return; }
  if (litres <= 0) { alert('Fuel litres must be greater than 0.'); return; }

  const dist = end - start;
  const mileage = dist / litres;
  const cpk = cost / dist;

  document.getElementById('previewMileage').textContent = mileage.toFixed(2) + ' KM/L';
  document.getElementById('previewCostPerKm').textContent = '₹' + cpk.toFixed(2);
}

function saveRecord() {
  const start = +document.getElementById('startKm').value;
  const end = +document.getElementById('endKm').value;
  const litres = +document.getElementById('fuelLitres').value;
  const cost = +document.getElementById('fuelCost').value;
  const vehicleId = document.getElementById('recordVehicle').value;
  const dateVal = document.getElementById('recordDate').value;

  if (!start || !end || !litres || !cost) { alert('Fill all fields.'); return; }
  if (end <= start) { alert('Ending KM must be greater than Starting KM.'); return; }
  if (litres <= 0) { alert('Fuel litres must be greater than 0.'); return; }

  const dist = end - start;
  const mileage = dist / litres;
  const costPerKm = cost / dist;

  records.push({
    id: 'REC-' + Date.now(),
    vehicleId,
    startKm: start,
    endKm: end,
    distance: dist,
    fuelLitres: litres,
    fuelCost: cost,
    mileage,
    costPerKm,
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

function openVehicleModal(vehicleId) {
  editingVehicleId = vehicleId;
  const modal = document.getElementById('vehicleModal');
  const title = document.getElementById('vehicleModalTitle');

  if (vehicleId) {
    const v = vehicles.find(x => x.id === vehicleId);
    title.textContent = 'Edit Vehicle';
    document.getElementById('vehicleName').value = v.name || '';
    document.getElementById('vehicleNumber').value = v.number || '';
    document.getElementById('vehicleType').value = v.type || 'Bike';
    document.getElementById('fuelType').value = v.fuel || 'Petrol';
  } else {
    title.textContent = 'Add Vehicle';
    ['vehicleName', 'vehicleNumber'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('vehicleType').value = 'Bike';
    document.getElementById('fuelType').value = 'Petrol';
  }

  modal.classList.add('show');
}

function closeVehicleModal() {
  document.getElementById('vehicleModal').classList.remove('show');
  editingVehicleId = null;
}

function saveVehicle() {
  const name = document.getElementById('vehicleName').value.trim();
  const number = document.getElementById('vehicleNumber').value.trim();
  const type = document.getElementById('vehicleType').value;
  const fuel = document.getElementById('fuelType').value;

  if (!name) { alert('Enter vehicle name.'); return; }
  if (!number) { alert('Enter vehicle number.'); return; }

  if (editingVehicleId) {
    const v = vehicles.find(x => x.id === editingVehicleId);
    if (v) { v.name = name; v.number = number; v.type = type; v.fuel = fuel; }
  } else {
    const v = { id: 'VH-' + Date.now(), name, number, type, fuel, created: new Date().toISOString() };
    vehicles.push(v);
    if (!activeVehicleId) { activeVehicleId = v.id; saveActive(); }
  }

  saveVehicles();
  closeVehicleModal();
  refreshAll();
}

function deleteVehicle(id) {
  if (!confirm('Delete this vehicle and all its records?')) return;
  vehicles = vehicles.filter(v => v.id !== id);
  records = records.filter(r => r.vehicleId !== id);
  reminders = reminders.filter(r => r.vehicleId !== id);

  if (activeVehicleId === id) {
    activeVehicleId = vehicles.length > 0 ? vehicles[0].id : null;
    saveActive();
  }

  saveVehicles(); saveRecords(); saveReminders();
  refreshAll();
}

function setActiveVehicle(id) {
  activeVehicleId = id;
  saveActive();
  refreshAll();
}

function renderVehicleGrid() {
  const grid = document.getElementById('vehicleGrid');
  if (!grid) return;

  if (vehicles.length === 0) {
    grid.innerHTML = '<div class="empty-vehicles">No vehicles added yet.<br>Click <strong>Add Vehicle</strong> to get started.</div>';
    return;
  }

  const icons = { Scooty: '🛵', Bike: '🏍️', Car: '🚗', Van: '🚐', Bus: '🚌', Lorry: '🚛', Truck: '🚚' };

  grid.innerHTML = vehicles.map(v => {
    const isActive = v.id === activeVehicleId;
    const recCount = records.filter(r => r.vehicleId === v.id).length;
    return `
      <div class="vehicle-card ${isActive ? 'is-active' : ''}">
        ${isActive ? '<div class="active-badge">Active</div>' : ''}
        <div class="vc-top">
          <div class="vc-icon">${icons[v.type] || '🚗'}</div>
          <div>
            <div class="vc-name">${v.name}</div>
            <div class="vc-number">${v.number}</div>
          </div>
        </div>
        <div class="vc-tags">
          <span class="vc-tag">${v.type}</span>
          <span class="vc-tag">${v.fuel}</span>
          <span class="vc-tag">${recCount} records</span>
        </div>
        <div class="vc-actions">
          ${!isActive ? `<button class="vc-btn-set" onclick="setActiveVehicle('${v.id}')">Set Active</button>` : '<button class="vc-btn-set" style="opacity:0.5;cursor:default">Active</button>'}
          <button class="vc-btn-edit" onclick="openVehicleModal('${v.id}')"><i class="fas fa-pen"></i></button>
          <button class="vc-btn-del" onclick="deleteVehicle('${v.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');
}

/* ============================================
   REMINDERS
============================================ */
const REMINDER_TYPES = {
  service: { label: 'Service', icon: 'fa-wrench' },
  insurance: { label: 'Insurance Expiry', icon: 'fa-shield-alt' },
  pollution: { label: 'PUC Certificate', icon: 'fa-leaf' },
  tyre: { label: 'Tyre Change', icon: 'fa-circle-notch' },
  oil: { label: 'Oil Change', icon: 'fa-oil-can' },
  other: { label: 'Other', icon: 'fa-bell' },
};

function initReminderModal() {
  document.getElementById('addReminderBtn')?.addEventListener('click', openReminderModal);
  document.getElementById('closeReminderModal')?.addEventListener('click', closeReminderModal);
  document.getElementById('cancelReminderModal')?.addEventListener('click', closeReminderModal);
  document.getElementById('saveReminder')?.addEventListener('click', saveReminderItem);
}

function openReminderModal() {
  if (vehicles.length === 0) { alert('Add a vehicle first.'); return; }

  const sel = document.getElementById('reminderVehicle');
  sel.innerHTML = vehicles.map(v =>
    `<option value="${v.id}" ${v.id === activeVehicleId ? 'selected' : ''}>${v.name} (${v.number})</option>`
  ).join('');

  document.getElementById('reminderDate').value = '';
  document.getElementById('reminderNote').value = '';
  document.getElementById('reminderDaysBefore').value = 7;
  document.getElementById('reminderType').value = 'service';

  document.getElementById('reminderModal').classList.add('show');
}

function closeReminderModal() {
  document.getElementById('reminderModal').classList.remove('show');
}

function saveReminderItem() {
  const vehicleId = document.getElementById('reminderVehicle').value;
  const type = document.getElementById('reminderType').value;
  const date = document.getElementById('reminderDate').value;
  const note = document.getElementById('reminderNote').value.trim();
  const daysBefore = +document.getElementById('reminderDaysBefore').value || 7;

  if (!date) { alert('Please set a due date.'); return; }

  reminders.push({
    id: 'REM-' + Date.now(),
    vehicleId,
    type,
    date,
    note,
    daysBefore,
    created: new Date().toISOString(),
  });

  saveReminders();
  closeReminderModal();
  renderReminderGrid();
  updateReminderBadge();
}

function deleteReminder(id) {
  reminders = reminders.filter(r => r.id !== id);
  saveReminders();
  renderReminderGrid();
  updateReminderBadge();
}

function getReminderStatus(rem) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(rem.date);
  due.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((due - today) / 864e5);

  if (daysLeft < 0) return { status: 'overdue', daysLeft, label: `${Math.abs(daysLeft)} days overdue` };
  if (daysLeft <= rem.daysBefore) return { status: 'warn', daysLeft, label: `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` };
  return { status: 'ok', daysLeft, label: `Due in ${daysLeft} days` };
}

function renderReminderGrid() {
  const grid = document.getElementById('reminderGrid');
  if (!grid) return;

  if (reminders.length === 0) {
    grid.innerHTML = '<div class="empty-reminders">No reminders set. Add service, insurance, or PUC reminders.</div>';
    return;
  }

  const sorted = [...reminders].sort((a, b) => new Date(a.date) - new Date(b.date));

  grid.innerHTML = sorted.map(rem => {
    const v = vehicles.find(x => x.id === rem.vehicleId);
    const rt = REMINDER_TYPES[rem.type] || REMINDER_TYPES.other;
    const { status, label } = getReminderStatus(rem);
    const dueDate = new Date(rem.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return `
      <div class="rem-card rem-${status}">
        <div class="rem-top">
          <div>
            <div class="rem-type ${status}">${rt.label}</div>
            <div class="rem-vehicle">${v?.name || 'Unknown'}</div>
            <div class="rem-date">Due: ${dueDate}</div>
            ${rem.note ? `<div class="rem-note"><i class="fas fa-sticky-note"></i> ${rem.note}</div>` : ''}
            <div class="rem-days ${status}">${label}</div>
          </div>
          <button class="rem-del" onclick="deleteReminder('${rem.id}')"><i class="fas fa-times"></i></button>
        </div>
      </div>`;
  }).join('');
}

function updateReminderBadge() {
  const badge = document.getElementById('reminderBadge');
  if (!badge) return;
  const alerts = reminders.filter(r => {
    const { status } = getReminderStatus(r);
    return status === 'warn' || status === 'overdue';
  });
  badge.style.display = alerts.length > 0 ? 'flex' : 'none';
}

/* ============================================
   REMINDER POPUP ON LOAD
============================================ */
function checkRemindersOnLoad() {
  const alerts = reminders.filter(r => {
    const { status } = getReminderStatus(r);
    return status === 'warn' || status === 'overdue';
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  if (alerts.length === 0) return;

  const overlay = document.getElementById('reminderOverlay');
  const list = document.getElementById('reminderList');
  const subtitle = document.getElementById('reminderSubtitle');

  subtitle.textContent = `${alerts.length} alert${alerts.length > 1 ? 's' : ''} need your attention`;

  list.innerHTML = alerts.map(rem => {
    const v = vehicles.find(x => x.id === rem.vehicleId);
    const rt = REMINDER_TYPES[rem.type] || REMINDER_TYPES.other;
    const { status, label } = getReminderStatus(rem);
    const dueDate = new Date(rem.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return `
      <div class="rl-item ${status}">
        <div class="rl-icon"><i class="fas ${rt.icon}"></i></div>
        <div class="rl-body">
          <div class="rl-title">${v?.name || '?'} · ${rt.label}</div>
          <div class="rl-sub">${label} · Due ${dueDate}${rem.note ? ` · ${rem.note}` : ''}</div>
        </div>
      </div>`;
  }).join('');

  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  document.getElementById('reminderNoted').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
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
  const blob = new Blob([JSON.stringify({ vehicles, records, reminders, activeVehicleId }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FuelTracker_Backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      vehicles = data.vehicles || [];
      records = data.records || [];
      reminders = data.reminders || [];
      activeVehicleId = data.activeVehicleId || null;
      saveVehicles(); saveRecords(); saveReminders(); saveActive();
      refreshAll();
      alert('Backup restored successfully!');
    } catch {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
}

function deleteAll() {
  if (!confirm('Delete ALL vehicles, records, and reminders permanently?')) return;
  vehicles = []; records = []; reminders = []; activeVehicleId = null;
  Object.values(SK).forEach(k => localStorage.removeItem(k));
  refreshAll();
  alert('All data deleted.');
}

/* ============================================
   EXPORT EXCEL / PDF
============================================ */
function initExport() {
  document.getElementById('exportExcel')?.addEventListener('click', exportExcel);
  document.getElementById('exportPDF')?.addEventListener('click', exportPDF);
}

function exportExcel() {
  const vehicle = getActiveVehicle();
  if (!vehicle) { alert('Select a vehicle first.'); return; }

  const vr = records.filter(r => r.vehicleId === vehicle.id);
  if (vr.length === 0) { alert('No records to export.'); return; }

  const data = vr.map(r => ({
    Date: new Date(r.created).toLocaleDateString('en-IN'),
    Vehicle: vehicle.name,
    'Reg. No.': vehicle.number,
    'Start KM': r.startKm,
    'End KM': r.endKm,
    'Distance (KM)': r.distance,
    'Fuel (L)': r.fuelLitres,
    'Cost (₹)': r.fuelCost,
    'Mileage (KM/L)': r.mileage.toFixed(2),
    'Cost/KM (₹)': r.costPerKm.toFixed(2),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Records');
  XLSX.writeFile(wb, `${vehicle.name}_Fuel.xlsx`);
}

async function exportPDF() {
  const vehicle = getActiveVehicle();
  if (!vehicle) { alert('Select a vehicle first.'); return; }

  const vr = records.filter(r => r.vehicleId === vehicle.id)
    .sort((a, b) => new Date(a.created) - new Date(b.created));

  if (vr.length === 0) { alert('No records to export.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 15;

  doc.setFontSize(18);
  doc.text('Fuel Mileage Report', 15, y); y += 10;

  doc.setFontSize(11);
  doc.text(`Vehicle: ${vehicle.name} (${vehicle.number})`, 15, y); y += 7;
  doc.text(`Type: ${vehicle.type} | Fuel: ${vehicle.fuel}`, 15, y); y += 10;

  const mileages = vr.map(r => r.mileage);
  const avg = (mileages.reduce((a, b) => a + b, 0) / mileages.length).toFixed(2);

  doc.setFontSize(13);
  doc.text('Performance Summary', 15, y); y += 8;
  doc.setFontSize(10);
  doc.text(`Current: ${vr[vr.length - 1].mileage.toFixed(2)} KM/L`, 15, y); y += 6;
  doc.text(`Average: ${avg} KM/L`, 15, y); y += 6;
  doc.text(`Best: ${Math.max(...mileages).toFixed(2)} KM/L | Worst: ${Math.min(...mileages).toFixed(2)} KM/L`, 15, y); y += 12;

  doc.setFontSize(13);
  doc.text('Records', 15, y); y += 8;

  vr.forEach(r => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.text(
      `${new Date(r.created).toLocaleDateString('en-IN')} | ${r.distance} KM | ${r.fuelLitres}L | ${r.mileage.toFixed(2)} KM/L | ₹${r.fuelCost}`,
      15, y
    );
    y += 6;
  });

  doc.save(`${vehicle.name}_Fuel_Report.pdf`);
}

/* ============================================
   WINDOW UNLOAD — save state
============================================ */
window.addEventListener('beforeunload', () => {
  saveVehicles(); saveRecords(); saveReminders(); saveActive();
});

/* ============================================
   RESIZE — redraw charts
============================================ */
window.addEventListener('resize', () => {
  if (mileageChart) mileageChart.resize();
  if (costChart) costChart.resize();
  if (fuelChart) fuelChart.resize();
});
