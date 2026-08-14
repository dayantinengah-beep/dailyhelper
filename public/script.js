/* =========================================================
   DAILY HELPER - script.js
   Tugas/Jadwal/Checklist/Keuangan/Catatan disimpan di HP
   (localStorage). Notifikasi memakai Web Push (server).
========================================================= */

const KEY_TASKS = 'dh_tasks';
const KEY_SCHEDULE = 'dh_schedule';
const KEY_CHECKLIST = 'dh_checklist';
const KEY_FINANCE = 'dh_finance';
const KEY_NOTES = 'dh_notes';

function loadData(key){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveData(key, data){
  try{ localStorage.setItem(key, JSON.stringify(data)); }
  catch(e){ showToast('Gagal menyimpan data.'); }
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

let tasks = loadData(KEY_TASKS);
let schedule = loadData(KEY_SCHEDULE);
let checklist = loadData(KEY_CHECKLIST);
let finance = loadData(KEY_FINANCE);
let notes = loadData(KEY_NOTES);

const rupiahFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
function formatRupiah(n){ return rupiahFormatter.format(n || 0); }
function formatTanggalIndo(dateStr){
  if(!dateStr) return '-';
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const [y, m, d] = dateStr.split('-').map(Number);
  if(!y || !m || !d) return dateStr;
  return `${d} ${bulan[m-1]} ${y}`;
}
function todayStr(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

let toastTimer = null;
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ========== NAVIGASI ========== */
function initNav(){
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });
}
function switchPage(page){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  const navBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if(target) target.classList.add('active');
  if(navBtn) navBtn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function initGotoButtons(){
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-goto]');
    if(!el) return;
    switchPage(el.dataset.goto);
  });
}

/* ========== JAM & TANGGAL ========== */
function updateClock(){
  const now = new Date();
  document.getElementById('clockTime').textContent =
    `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('clockDate').textContent =
    `${hari[now.getDay()]}, ${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;
}

/* ========== TUGAS ========== */
function renderTugas(){
  const c = document.getElementById('listTugas');
  if(tasks.length === 0){
    c.innerHTML = '<p class="empty-text">Belum ada tugas. Yuk tambahkan!</p>';
  } else {
    const sorted = [...tasks].sort((a,b) => (a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));
    c.innerHTML = sorted.map(t => `
      <div class="item-card" data-id="${t.id}">
        <div class="check-circle ${t.selesai?'checked':''}" data-action="toggle-tugas" data-id="${t.id}">${t.selesai?'✓':''}</div>
        <div class="item-body">
          <div class="item-title ${t.selesai?'done':''}">${escapeHtml(t.nama)}</div>
          <div class="item-sub">📅 ${formatTanggalIndo(t.tanggal)} • 🕐 ${t.jam}</div>
        </div>
        <div class="item-actions"><button class="btn-danger-icon" data-action="delete-tugas" data-id="${t.id}">🗑️</button></div>
      </div>`).join('');
  }
  updateDashboard();
}
function addTugas(nama, tanggal, jam){
  tasks.push({ id: uid(), nama, tanggal, jam, selesai: false });
  saveData(KEY_TASKS, tasks); renderTugas(); showToast('Tugas ditambahkan ✅');
}
function toggleTugas(id){
  const t = tasks.find(x => x.id === id);
  if(t){ t.selesai = !t.selesai; saveData(KEY_TASKS, tasks); renderTugas(); }
}
function deleteTugas(id){
  if(!confirm('Hapus tugas ini?')) return;
  tasks = tasks.filter(x => x.id !== id);
  saveData(KEY_TASKS, tasks); renderTugas(); showToast('Tugas dihapus 🗑️');
}

/* ========== JADWAL ========== */
function renderJadwal(filterDate){
  const c = document.getElementById('listJadwal');
  let list = [...schedule];
  if(filterDate) list = list.filter(s => s.tanggal === filterDate);
  list.sort((a,b) => (a.tanggal+a.jam).localeCompare(b.tanggal+b.jam));
  if(list.length === 0){
    c.innerHTML = `<p class="empty-text">${filterDate ? 'Tidak ada jadwal di tanggal ini.' : 'Belum ada jadwal.'}</p>`;
  } else {
    c.innerHTML = list.map(s => `
      <div class="item-card" data-id="${s.id}">
        <div class="item-body">
          <div class="item-title">${escapeHtml(s.nama)}</div>
          <div class="item-sub">📅 ${formatTanggalIndo(s.tanggal)} • 🕐 ${s.jam}</div>
        </div>
        <div class="item-actions"><button class="btn-danger-icon" data-action="delete-jadwal" data-id="${s.id}">🗑️</button></div>
      </div>`).join('');
  }
  updateDashboard();
}
function addJadwal(nama, tanggal, jam){
  schedule.push({ id: uid(), nama, tanggal, jam });
  saveData(KEY_SCHEDULE, schedule);
  renderJadwal(document.getElementById('jadwalFilterTanggal').value || null);
  showToast('Jadwal ditambahkan 📅');
}
function deleteJadwal(id){
  if(!confirm('Hapus jadwal ini?')) return;
  schedule = schedule.filter(x => x.id !== id);
  saveData(KEY_SCHEDULE, schedule);
  renderJadwal(document.getElementById('jadwalFilterTanggal').value || null);
  showToast('Jadwal dihapus 🗑️');
}

/* ========== CHECKLIST ========== */
function renderChecklist(){
  const c = document.getElementById('listChecklist');
  if(checklist.length === 0){
    c.innerHTML = '<p class="empty-text">Checklist masih kosong.</p>';
  } else {
    c.innerHTML = checklist.map(x => `
      <div class="item-card" data-id="${x.id}">
        <div class="check-circle ${x.selesai?'checked':''}" data-action="toggle-checklist" data-id="${x.id}">${x.selesai?'✓':''}</div>
        <div class="item-body"><div class="item-title ${x.selesai?'done':''}">${escapeHtml(x.teks)}</div></div>
        <div class="item-actions"><button class="btn-danger-icon" data-action="delete-checklist" data-id="${x.id}">🗑️</button></div>
      </div>`).join('');
  }
  updateDashboard();
}
function addChecklist(teks){
  checklist.push({ id: uid(), teks, selesai: false });
  saveData(KEY_CHECKLIST, checklist); renderChecklist(); showToast('Item ditambahkan ☑️');
}
function toggleChecklist(id){
  const x = checklist.find(v => v.id === id);
  if(x){ x.selesai = !x.selesai; saveData(KEY_CHECKLIST, checklist); renderChecklist(); }
}
function deleteChecklist(id){
  if(!confirm('Hapus item ini?')) return;
  checklist = checklist.filter(x => x.id !== id);
  saveData(KEY_CHECKLIST, checklist); renderChecklist(); showToast('Item dihapus 🗑️');
}

/* ========== KEUANGAN ========== */
function renderKeuangan(){
  const c = document.getElementById('listKeuangan');
  let totalMasuk = 0, totalKeluar = 0;
  finance.forEach(f => { if(f.tipe === 'masuk') totalMasuk += f.nominal; else totalKeluar += f.nominal; });
  document.getElementById('finTotalMasuk').textContent = formatRupiah(totalMasuk);
  document.getElementById('finTotalKeluar').textContent = formatRupiah(totalKeluar);
  document.getElementById('finSaldo').textContent = formatRupiah(totalMasuk - totalKeluar);

  if(finance.length === 0){
    c.innerHTML = '<p class="empty-text">Belum ada transaksi.</p>';
  } else {
    const sorted = [...finance].sort((a,b) => b.waktu - a.waktu);
    c.innerHTML = sorted.map(f => `
      <div class="item-card" data-id="${f.id}">
        <div class="item-body">
          <div class="item-title">${escapeHtml(f.keterangan)}</div>
          <div class="item-sub">${new Date(f.waktu).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}</div>
        </div>
        <div class="fin-item-amount ${f.tipe}">${f.tipe==='masuk'?'+':'-'}${formatRupiah(f.nominal)}</div>
        <div class="item-actions"><button class="btn-danger-icon" data-action="delete-keuangan" data-id="${f.id}">🗑️</button></div>
      </div>`).join('');
  }
  updateDashboard();
}
function addKeuangan(tipe, nominal, keterangan){
  finance.push({ id: uid(), tipe, nominal, keterangan, waktu: Date.now() });
  saveData(KEY_FINANCE, finance); renderKeuangan();
  showToast(tipe==='masuk' ? 'Pemasukan dicatat ➕' : 'Pengeluaran dicatat ➖');
}
function deleteKeuangan(id){
  if(!confirm('Hapus transaksi ini?')) return;
  finance = finance.filter(x => x.id !== id);
  saveData(KEY_FINANCE, finance); renderKeuangan(); showToast('Transaksi dihapus 🗑️');
}

/* ========== CATATAN ========== */
function renderCatatan(){
  const c = document.getElementById('listCatatan');
  if(notes.length === 0){
    c.innerHTML = '<p class="empty-text">Belum ada catatan.</p>';
  } else {
    const sorted = [...notes].sort((a,b) => b.updatedAt - a.updatedAt);
    c.innerHTML = sorted.map(n => `
      <div class="note-card" data-id="${n.id}">
        <div class="note-text">${escapeHtml(n.isi)}</div>
        <div class="note-date">${new Date(n.updatedAt).toLocaleString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</div>
        <div class="note-actions">
          <button class="btn-edit-icon" data-action="edit-catatan" data-id="${n.id}">✏️</button>
          <button class="btn-danger-icon" data-action="delete-catatan" data-id="${n.id}">🗑️</button>
        </div>
      </div>`).join('');
  }
}
function addCatatan(isi){
  notes.push({ id: uid(), isi, updatedAt: Date.now() });
  saveData(KEY_NOTES, notes); renderCatatan(); showToast('Catatan disimpan 📒');
}
function deleteCatatan(id){
  if(!confirm('Hapus catatan ini?')) return;
  notes = notes.filter(x => x.id !== id);
  saveData(KEY_NOTES, notes); renderCatatan(); showToast('Catatan dihapus 🗑️');
}
let editingNoteId = null;
function openEditNote(id){
  const n = notes.find(x => x.id === id);
  if(!n) return;
  editingNoteId = id;
  document.getElementById('editNoteTextarea').value = n.isi;
  document.getElementById('editNoteOverlay').classList.add('show');
}
function closeEditNote(){
  editingNoteId = null;
  document.getElementById('editNoteOverlay').classList.remove('show');
}
function saveEditNote(){
  const n = notes.find(x => x.id === editingNoteId);
  const newText = document.getElementById('editNoteTextarea').value.trim();
  if(!newText){ showToast('Catatan tidak boleh kosong'); return; }
  if(n){ n.isi = newText; n.updatedAt = Date.now(); saveData(KEY_NOTES, notes); renderCatatan(); showToast('Catatan diperbarui ✏️'); }
  closeEditNote();
}

/* ========== DASHBOARD ========== */
function updateDashboard(){
  const today = todayStr();
  const todayTasks = tasks.filter(t => t.tanggal === today);
  document.getElementById('sumTasks').textContent = `${todayTasks.filter(t=>t.selesai).length}/${todayTasks.length}`;
  document.getElementById('sumChecklist').textContent = `${checklist.filter(c=>c.selesai).length}/${checklist.length}`;

  const now = new Date();
  const upcoming = [...schedule].map(s => ({...s, dt: new Date(`${s.tanggal}T${s.jam}`)})).filter(s => s.dt >= now).sort((a,b)=>a.dt-b.dt);
  document.getElementById('sumSchedule').textContent = upcoming.length ? upcoming[0].jam : '-';

  let masuk = 0, keluar = 0;
  finance.forEach(f => { if(f.tipe==='masuk') masuk += f.nominal; else keluar += f.nominal; });
  document.getElementById('sumBalance').textContent = formatRupiah(masuk - keluar);

  const upcomingTasks = [...tasks].filter(t=>!t.selesai)
    .map(t=>({...t, dt: new Date(`${t.tanggal}T${t.jam}`)})).sort((a,b)=>a.dt-b.dt).slice(0,4);
  const box = document.getElementById('dashboardUpcoming');
  box.innerHTML = upcomingTasks.length === 0
    ? '<p class="empty-text">Belum ada tugas.</p>'
    : upcomingTasks.map(t => `<div class="mini-item"><span class="mini-name">${escapeHtml(t.nama)}</span><span class="mini-time">${formatTanggalIndo(t.tanggal)}, ${t.jam}</span></div>`).join('');
}

/* ========== FORM HANDLERS ========== */
function initForms(){
  document.getElementById('tugasTanggal').value = todayStr();
  document.getElementById('jadwalTanggal').value = todayStr();

  document.getElementById('formTugas').addEventListener('submit', e => {
    e.preventDefault();
    const nama = document.getElementById('tugasNama').value.trim();
    const tanggal = document.getElementById('tugasTanggal').value;
    const jam = document.getElementById('tugasJam').value;
    if(!nama || !tanggal || !jam) return;
    addTugas(nama, tanggal, jam);
    e.target.reset();
    document.getElementById('tugasTanggal').value = todayStr();
  });

  document.getElementById('formJadwal').addEventListener('submit', e => {
    e.preventDefault();
    const nama = document.getElementById('jadwalNama').value.trim();
    const tanggal = document.getElementById('jadwalTanggal').value;
    const jam = document.getElementById('jadwalJam').value;
    if(!nama || !tanggal || !jam) return;
    addJadwal(nama, tanggal, jam);
    e.target.reset();
    document.getElementById('jadwalTanggal').value = todayStr();
  });
  document.getElementById('jadwalFilterTanggal').addEventListener('change', e => renderJadwal(e.target.value || null));
  document.getElementById('jadwalFilterClear').addEventListener('click', () => {
    document.getElementById('jadwalFilterTanggal').value = '';
    renderJadwal(null);
  });

  document.getElementById('formChecklist').addEventListener('submit', e => {
    e.preventDefault();
    const teks = document.getElementById('checklistTeks').value.trim();
    if(!teks) return;
    addChecklist(teks);
    e.target.reset();
  });

  document.getElementById('formKeuangan').addEventListener('submit', e => {
    e.preventDefault();
    const tipe = document.querySelector('input[name="finTipe"]:checked').value;
    const nominal = parseInt(document.getElementById('finNominal').value, 10);
    const keterangan = document.getElementById('finKeterangan').value.trim();
    if(!nominal || nominal <= 0 || !keterangan) return;
    addKeuangan(tipe, nominal, keterangan);
    e.target.reset();
    document.querySelector('input[name="finTipe"][value="masuk"]').checked = true;
  });

  document.getElementById('formCatatan').addEventListener('submit', e => {
    e.preventDefault();
    const isi = document.getElementById('catatanIsi').value.trim();
    if(!isi) return;
    addCatatan(isi);
    e.target.reset();
  });

  document.getElementById('editNoteCancel').addEventListener('click', closeEditNote);
  document.getElementById('editNoteSave').addEventListener('click', saveEditNote);
  document.getElementById('editNoteOverlay').addEventListener('click', (e) => {
    if(e.target.id === 'editNoteOverlay') closeEditNote();
  });
}

function initDelegation(){
  document.getElementById('appMain').addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const action = el.dataset.action, id = el.dataset.id;
    switch(action){
      case 'toggle-tugas': toggleTugas(id); break;
      case 'delete-tugas': deleteTugas(id); break;
      case 'delete-jadwal': deleteJadwal(id); break;
      case 'toggle-checklist': toggleChecklist(id); break;
      case 'delete-checklist': deleteChecklist(id); break;
      case 'delete-keuangan': deleteKeuangan(id); break;
      case 'edit-catatan': openEditNote(id); break;
      case 'delete-catatan': deleteCatatan(id); break;
      case 'delete-pengingat': deletePengingat(id); break;
    }
  });
}

/* =========================================================
   NOTIFIKASI - WEB PUSH (bukan Notification API biasa)
========================================================= */
const KEY_PUSH_ENDPOINT = 'dh_push_endpoint';
let swRegistration = null;

function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for(let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
function pushSupported(){
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function initNotif(){
  const statusText = document.getElementById('notifStatusText');
  const enableBtn = document.getElementById('notifEnableBtn');
  const disableBtn = document.getElementById('notifDisableBtn');
  const dashStatusText = document.getElementById('notifStatusTextDashboard');

  function setStatus(msg, mode){
    statusText.textContent = msg;
    if(dashStatusText){
      dashStatusText.textContent =
        mode === 'active' ? '✅ Notifikasi aktif.' :
        mode === 'denied' ? '❌ Notifikasi belum aktif (izin ditolak).' :
        mode === 'unsupported' ? '⚠️ Perangkat/browser ini tidak mendukung notifikasi.' :
        '❌ Notifikasi belum aktif.';
    }
  }

  if(!pushSupported()){
    setStatus('⚠️ Browser/perangkat ini tidak mendukung Web Push.', 'unsupported');
    enableBtn.classList.add('hidden-el');
    disableBtn.classList.add('hidden-el');
    return;
  }

  try{
    swRegistration = await navigator.serviceWorker.register('/sw.js');
  }catch(e){
    setStatus('⚠️ Gagal menyiapkan service worker. Coba muat ulang halaman.', 'inactive');
    return;
  }

  async function refreshStatus(){
    if(Notification.permission === 'denied'){
      setStatus('❌ Izin notifikasi ditolak. Ubah izin dari pengaturan browser.', 'denied');
      enableBtn.classList.add('hidden-el');
      disableBtn.classList.add('hidden-el');
      return;
    }
    const existingSub = await swRegistration.pushManager.getSubscription();
    if(existingSub && Notification.permission === 'granted'){
      localStorage.setItem(KEY_PUSH_ENDPOINT, existingSub.endpoint);
      setStatus('✅ Notifikasi aktif. Pengingat akan terkirim walau website ditutup.', 'active');
      enableBtn.classList.add('hidden-el');
      disableBtn.classList.remove('hidden-el');
    } else {
      setStatus('❌ Notifikasi belum aktif. Tekan tombol di bawah.', 'inactive');
      enableBtn.classList.remove('hidden-el');
      disableBtn.classList.add('hidden-el');
    }
    loadReminders();
  }

  enableBtn.addEventListener('click', async () => {
    try{
      const permission = await Notification.requestPermission();
      if(permission !== 'granted'){
        showToast('Izin notifikasi belum diberikan');
        await refreshStatus();
        return;
      }
      const res = await fetch('/api/vapid-public-key');
      const { publicKey } = await res.json();
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      localStorage.setItem(KEY_PUSH_ENDPOINT, subscription.endpoint);
      showToast('Notifikasi berhasil diaktifkan 🔔');
      await refreshStatus();
    }catch(err){
      console.error(err);
      showToast('Gagal mengaktifkan notifikasi. Pastikan pakai HTTPS.');
    }
  });

  disableBtn.addEventListener('click', async () => {
    try{
      const existingSub = await swRegistration.pushManager.getSubscription();
      if(existingSub){
        await fetch('/api/subscribe', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existingSub.endpoint })
        });
        await existingSub.unsubscribe();
      }
      localStorage.removeItem(KEY_PUSH_ENDPOINT);
      showToast('Notifikasi dinonaktifkan');
      await refreshStatus();
    }catch(err){ showToast('Gagal menonaktifkan notifikasi'); }
  });

  await refreshStatus();
}

function initPengingatForm(){
  document.getElementById('pengingatTanggal').value = todayStr();
  document.getElementById('formPengingat').addEventListener('submit', async (e) => {
    e.preventDefault();
    const endpoint = localStorage.getItem(KEY_PUSH_ENDPOINT);
    if(!endpoint){ showToast('Aktifkan notifikasi dulu sebelum membuat pengingat'); return; }
    const judul = document.getElementById('pengingatNama').value.trim();
    const tanggal = document.getElementById('pengingatTanggal').value;
    const jam = document.getElementById('pengingatJam').value;
    const pesan = document.getElementById('pengingatPesan').value.trim();
    if(!judul || !tanggal || !jam) return;
    try{
      const res = await fetch('/api/reminder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, judul, tanggal, jam, pesan })
      });
      const data = await res.json();
      if(!res.ok){ showToast(data.error || 'Gagal membuat pengingat'); return; }
      showToast('Pengingat berhasil dibuat 🔔');
      e.target.reset();
      document.getElementById('pengingatTanggal').value = todayStr();
      loadReminders();
    }catch(err){ showToast('Gagal terhubung ke server'); }
  });
}

async function loadReminders(){
  const container = document.getElementById('listPengingat');
  if(!container) return;
  const endpoint = localStorage.getItem(KEY_PUSH_ENDPOINT);
  if(!endpoint){ container.innerHTML = '<p class="empty-text">Aktifkan notifikasi dulu untuk membuat pengingat.</p>'; return; }
  try{
    const res = await fetch(`/api/reminders?endpoint=${encodeURIComponent(endpoint)}`);
    const { reminders: list } = await res.json();
    const belum = list.filter(r => !r.sentAt);
    container.innerHTML = belum.length === 0
      ? '<p class="empty-text">Belum ada pengingat aktif.</p>'
      : belum.map(r => `
        <div class="item-card" data-id="${r.id}">
          <div class="item-body">
            <div class="item-title">${escapeHtml(r.judul)}</div>
            <div class="item-sub">📅 ${formatTanggalIndo(r.tanggal)} • 🕐 ${r.jam}</div>
            <div class="item-sub">${escapeHtml(r.pesan)}</div>
          </div>
          <div class="item-actions"><button class="btn-danger-icon" data-action="delete-pengingat" data-id="${r.id}">🗑️</button></div>
        </div>`).join('');
  }catch(err){ container.innerHTML = '<p class="empty-text">Gagal memuat pengingat dari server.</p>'; }
}
async function deletePengingat(id){
  if(!confirm('Hapus pengingat ini?')) return;
  try{
    await fetch(`/api/reminder/${id}`, { method: 'DELETE' });
    showToast('Pengingat dihapus 🗑️');
    loadReminders();
  }catch(err){ showToast('Gagal menghapus pengingat'); }
}

/* ========== INIT APP ========== */
function initApp(){
  initNav();
  initForms();
  initDelegation();
  initGotoButtons();
  initPengingatForm();
  initNotif();

  updateClock();
  setInterval(updateClock, 1000 * 15);

  renderTugas();
  renderJadwal(null);
  renderChecklist();
  renderKeuangan();
  renderCatatan();
  updateDashboard();
}

document.addEventListener('DOMContentLoaded', initApp);