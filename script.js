// KREDENSIAL SUPABASE ANDA
const SUPABASE_URL = "https://varlrlqdfeqwgzgqaogx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhcmxybHFkZmVxd2d6Z3Fhb2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzAzMTQsImV4cCI6MjA5NzQ0NjMxNH0.FWbHy649zMetdkz22WiYAGoCuYozYdTW9m8UR_ldVKo";
const ADMIN_PASSWORD_SECRET = "SuperAdmin12"; 

let globalMutasiCache = [];

document.addEventListener('DOMContentLoaded', () => {
    checkUserOnboarding();
    periksaStatusRoleAuth();
    loadDataDariSupabase();
    
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeSwitch').checked = true;
    }
});

// 1. SISTEM ONBOARDING NAMA (LOGIN SIMPEL)
function checkUserOnboarding() {
    let savedName = localStorage.getItem('bukukas_user_name');
    if (!savedName) {
        // Tampilkan layar sapaan jika nama belum ada
        document.getElementById('onboardingOverlay').style.display = 'flex';
    } else {
        terapkanNamaUser(savedName);
    }
}

window.simpanNamaUser = function() {
    let inputName = document.getElementById('onboardNameInput').value.trim();
    if (inputName) {
        // Normalisasi kapitalisasi nama (cth: "budi santoso" -> "Budi Santoso")
        let formattedName = inputName.replace(/\b\w/g, c => c.toUpperCase());
        localStorage.setItem('bukukas_user_name', formattedName);
        document.getElementById('onboardingOverlay').style.display = 'none';
        terapkanNamaUser(formattedName);
    } else {
        alert("Mohon isi nama Anda terlebih dahulu.");
    }
}

function terapkanNamaUser(name) {
    document.getElementById('userNameDisplay').innerText = name;
    // Mengisi otomatis kolom pencarian "Kas Saya" dengan nama user
    const kasSayaInput = document.getElementById('inputNamaKasSaya');
    if(kasSayaInput) {
        kasSayaInput.value = name;
    }
}

window.resetNamaUser = function() {
    if(confirm("Apakah Anda ingin mengganti identitas nama perangkat ini?")) {
        localStorage.removeItem('bukukas_user_name');
        location.reload();
    }
}

// 2. RETRIEVE DATA SUPABASE
function loadDataDariSupabase() {
    const syncText = document.getElementById('syncStatusText');
    const greenLight = document.querySelector('.green-light');
    if(syncText) syncText.innerText = "SYNCING...";

    fetch(`${SUPABASE_URL}/rest/v1/mutasi?select=*&order=id_transaksi.desc`, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    })
    .then(res => { if (!res.ok) throw new Error("Koneksi gagal"); return res.json(); })
    .then(data => {
        globalMutasiCache = data;
        let totalSaldo = 0;
        let mutasiHtml = '';

        data.forEach(item => {
            let nominal = parseFloat(item.nominal) || 0;
            let isMasuk = item.tipe_transaksi.toLowerCase() === 'masuk';
            totalSaldo += isMasuk ? nominal : -nominal;
            let statusClass = isMasuk ? 'text-success' : 'text-danger';
            let sign = isMasuk ? '+' : '-';

            mutasiHtml += `
                <div class="list-item mutasi-row" data-tipe="${item.tipe_transaksi.toLowerCase()}" data-keyword="${item.keterangan_transaksi.toLowerCase()} ${item.nama_user.toLowerCase()}">
                    <div class="item-info">
                        <strong class="text-dark">${item.keterangan_transaksi} (${item.nama_user})</strong><br>
                        <small>${item.tanggal} | ID: ${item.id_transaksi}</small>
                    </div>
                    <span class="${statusClass}">${sign} Rp ${nominal.toLocaleString('id-ID')}</span>
                </div>`;
        });

        document.getElementById('displaySaldo').innerText = `Rp ${totalSaldo.toLocaleString('id-ID')}`;
        document.getElementById('displayDarurat').innerText = `Rp ${(totalSaldo * 0.5).toLocaleString('id-ID')}`;
        document.getElementById('mutasiListContainer').innerHTML = mutasiHtml || '<p class="text-muted text-center">Belum ada transaksi.</p>';
        document.getElementById('lastUpdateText').innerHTML = `<i class='bx bx-time-five'></i> Sinkron: ${new Date().toLocaleTimeString('id-ID')} WIB`;

        if(syncText) syncText.innerText = "SYNCED";
        if(greenLight) greenLight.style.backgroundColor = "#10b981";
        
        // Panggil filter "Kas Saya" agar langsung merender data saat pertama buka
        if(localStorage.getItem('bukukas_user_name')) prosesCekKasSaya();
    })
    .catch(err => {
        if(syncText) syncText.innerText = "OFFLINE";
        if(greenLight) greenLight.style.backgroundColor = "#dc2626";
    });
}

// 3. FITUR KAS SAYA (OTOMATIS TAMPIL BERDASARKAN NAMA LOGIN)
window.prosesCekKasSaya = function() {
    const namaCari = document.getElementById('inputNamaKasSaya').value.trim().toLowerCase();
    const container = document.getElementById('hasilKasSayaContainer');
    if(!namaCari) return;

    const filterData = globalMutasiCache.filter(item => item.nama_user.toLowerCase().includes(namaCari) && item.tipe_transaksi.toLowerCase() === 'masuk');
    
    if(filterData.length === 0) {
        container.innerHTML = `<div class="content-card text-center text-muted">Belum ada riwayat iuran untuk nama "${document.getElementById('inputNamaKasSaya').value}".</div>`;
        return;
    }

    let totalIuran = 0;
    let rincianHtml = '';

    filterData.forEach(item => {
        totalIuran += parseFloat(item.nominal) || 0;
        rincianHtml += `
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; border-bottom:1px dashed var(--border-color); padding: 10px 0;">
                <div>
                    <strong style="color:var(--primary-dark);">🟢 Terbayar</strong><br>
                    <small style="color:var(--text-muted);">${item.tanggal}</small>
                </div>
                <div style="text-align:right;">
                    <span class="text-dark fw-bold" style="font-size:0.9rem;">Rp ${parseInt(item.nominal).toLocaleString('id-ID')}</span><br>
                    <small style="font-size:0.7rem; color:var(--text-muted);">ID: ${item.id_transaksi}</small>
                </div>
            </div>`;
    });

    container.innerHTML = `
        <div class="content-card">
            <h4 class="text-primary" style="margin-top:0;"><i class='bx bx-id-card'></i> Rangkuman Iuran Anda</h4>
            <p class="text-dark" style="margin-bottom: 5px;">Total Dana yang Anda Setorkan:</p>
            <h2 class="text-gradient" style="margin: 0 0 15px 0;">Rp ${totalIuran.toLocaleString('id-ID')}</h2>
            <hr class="divider">
            <h5 class="text-dark" style="margin-bottom:10px;">Rincian Histori Setoran:</h5>
            ${rincianHtml}
        </div>`;
}

// 4. OTENTIKASI & FORM INPUT ADMIN
window.submitTransaksiAdmin = function(event) {
    event.preventDefault();
    const nama = document.getElementById('adminNama').value;
    const nominal = document.getElementById('adminNominal').value;
    const tipe = document.getElementById('adminTipe').value;
    const btnSubmit = document.getElementById('btnAdminSubmit');
    
    btnSubmit.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Menyimpan...";
    btnSubmit.disabled = true;

    const payload = {
        id_transaksi: "TX" + Math.floor(Math.random() * 900000 + 100000),
        tanggal: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + " WIB",
        keterangan_transaksi: tipe === 'Masuk' ? `Iuran Kas (Cash)` : `Pengeluaran: ${nama}`,
        nominal: parseInt(nominal),
        tipe_transaksi: tipe,
        nama_user: tipe === 'Masuk' ? nama : 'Admin'
    };

    fetch(`${SUPABASE_URL}/rest/v1/mutasi`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload)
    }).then(() => {
        alert("Transaksi Tersimpan!");
        btnSubmit.innerHTML = "<i class='bx bx-save'></i> Simpan ke Cloud";
        btnSubmit.disabled = false;
        document.getElementById('formInputAdmin').reset();
        loadDataDariSupabase(); navigate('page-home');
    }).catch(err => { alert("Gagal."); btnSubmit.disabled = false; });
}

window.prosesLoginAdmin = function() {
    if (document.getElementById('adminPasswordInput').value === ADMIN_PASSWORD_SECRET) {
        localStorage.setItem('bukukas_user_role', 'admin');
        alert("Akses Pengurus Dibuka.");
        document.getElementById('adminPasswordInput').value = '';
        periksaStatusRoleAuth(); navigate('page-home');
    } else { alert("PIN Salah!"); }
}

window.prosesLogoutAdmin = function() {
    localStorage.removeItem('bukukas_user_role');
    alert("Kembali ke Akses Umum.");
    periksaStatusRoleAuth(); navigate('page-home');
}

function periksaStatusRoleAuth() {
    const isAdmin = localStorage.getItem('bukukas_user_role') === 'admin';
    const roleBadge = document.getElementById('roleBadge');
    
    document.getElementById('view-user-payment').style.display = isAdmin ? "none" : "block";
    document.getElementById('view-admin-payment').style.display = isAdmin ? "block" : "none";
    document.getElementById('paymentPageTitle').innerText = isAdmin ? "Input Kas Komunitas" : "Pembayaran Kas";
    
    document.getElementById('loginFormSection').style.display = isAdmin ? "none" : "block";
    document.getElementById('logoutFormSection').style.display = isAdmin ? "block" : "none";
    document.getElementById('authBoxTitle').innerText = isAdmin ? "Status: Terautentikasi" : "Akses Administrator";

    if(roleBadge) {
        roleBadge.innerText = isAdmin ? "Admin" : "Anggota";
        isAdmin ? roleBadge.classList.add('admin-mode') : roleBadge.classList.remove('admin-mode');
    }
}

// 5. PDF GENERATOR
window.generateLaporanPDFKustom = function() {
    const tbody = document.getElementById('pdfTbodyMutasi');
    let rowsHtml = ''; let totalSaldo = 0;

    globalMutasiCache.forEach(item => {
        let nominal = parseFloat(item.nominal) || 0;
        let isMasuk = item.tipe_transaksi.toLowerCase() === 'masuk';
        totalSaldo += isMasuk ? nominal : -nominal;
        rowsHtml += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px;">${item.id_transaksi}</td><td style="padding: 8px;">${item.tanggal}</td><td style="padding: 8px;">${item.keterangan_transaksi} (${item.nama_user})</td><td style="padding: 8px; color: ${isMasuk ? '#059669' : '#dc2626'}">${item.tipe_transaksi}</td><td style="padding: 8px; text-align: right; font-weight: bold;">Rp ${nominal.toLocaleString('id-ID')}</td></tr>`;
    });

    tbody.innerHTML = rowsHtml;
    document.getElementById('pdfTanggalCetak').innerText = new Date().toLocaleString('id-ID') + " WIB";
    document.getElementById('pdfTotalSaldo').innerText = `Rp ${totalSaldo.toLocaleString('id-ID')}`;

    html2pdf().set({
        margin: 10, filename: `Laporan_BukuKas.pdf`, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(document.getElementById('template-pdf-print')).toPdf().output('bloburl').then((url) => { window.open(url, '_blank'); });
}

// 6. UTILITIES
window.navigate = function(pageId, navElement = null) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (navElement) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        navElement.classList.add('active');
    }
}
window.filterMutasi = function() {
    const search = document.getElementById('mutasiSearch').value.toLowerCase();
    const tipe = document.getElementById('filterTipe').value;
    document.querySelectorAll('.mutasi-row').forEach(row => {
        const matchSearch = row.getAttribute('data-keyword').includes(search);
        const matchTipe = (tipe === 'semua' || row.getAttribute('data-tipe') === tipe);
        row.style.display = (matchSearch && matchTipe) ? 'flex' : 'none';
    });
}
window.copyRek = function(bank, norek) { navigator.clipboard.writeText(norek).then(() => alert(`No. Rekening ${bank} disalin!`)); }
window.toggleTheme = function() {
    const body = document.body; body.classList.toggle('dark-mode');
    localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
}