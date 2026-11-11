# Sistem Rekapitulasi Penerimaan Zakat (UPZ Al-Hasanah) Terintegrasi Google Spreadsheet

Aplikasi web modern untuk panitia amil zakat dalam mencatat, mengelola, menghitung otomatis, dan merekapitulasi data penerimaan zakat (Fitrah, Fidyah, Maal, Infaq) secara multi-perangkat yang tersinkronisasi langsung dengan Google Spreadsheet sesuai struktur format pelaporan resmi UPZ.

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan penting yang telah dikonfirmasi oleh pengguna pada tahap klarifikasi:

- **Metode Integrasi Google Spreadsheet**: Menggunakan Google OAuth (Sign in with Google) langsung di sisi klien sehingga panitia dapat memilih atau membuat Google Spreadsheet terpusat pada Google Drive panitia.
- **Perhitungan Zakat Fitrah**: Beras paten 2,5 kg per jiwa; Uang fitrah dapat dikonfigurasi fleksibel di menu Pengaturan (mengikuti ketetapan Kemenag/BAZNAS per tahun, default Rp 42.500 atau Rp 40.000). Nilai total dihitung otomatis berdasarkan jumlah jiwa yang dizakatkan.
- **Susunan Sheet di Google Spreadsheet**:
  1. **Sheet Rekap Gabungan**: Lembar induk kronologis berkelanjutan yang memisahkan tiap hari dengan 2 baris jeda, baris Total Harian, dan Grand Total Kumulatif (dengan merge vertikal sel otomatis untuk keluarga beranggotakan banyak nama).
  2. **Sheet Per Hari (Tab Harian)**: Tab spesifik per tanggal (misal `1-Mar-26`, `2-Mar-26`) untuk memudahkan audit harian panitia bertugas.
  3. **Sheet Rekap Keseluruhan & Amil**: Lembar ikhtisar total penerimaan selama periode Ramadhan, tabel perbandingan harian, perhitungan hak amil 12,5%, serta ringkasan penyaluran beras dan uang.
- **Dukungan Multi-Nama (Keluarga)**: Satu nomor transaksi dapat memuat beberapa nama anggota keluarga; kolom No, Tanggal, Jiwa, Fitrah, Fidyah, Maal, Infaq, Sub Total, dan Grand Total dimerge otomatis di Google Sheets.

---

## 1. Overview & Core Concept

### What It Does
Aplikasi web ini menggantikan proses penulisan manual dan rumus rumit di Excel/Spreadsheet saat melayani muzakki di posko zakat:
1. **Form Input Penerimaan Cepat**: Panitia cukup memasukkan nama muzakki/kepala keluarga dan daftar anggota keluarga yang dizakatkan (dapat menambah/menghapus nama secara dinamis), memilih jenis zakat (Fitrah Beras/Uang, Fidyah Beras/Uang, Maal, Infaq Beras/Uang), dan sistem otomatis menghitung jiwa, subtotal, dan sisa kembalian jika ada.
2. **Otomasi Merge dan Format Google Sheets**: Saat data disimpan, sistem memanggil Google Sheets API (`spreadsheets.batchUpdate`) untuk menambahkan baris-baris nama anggota keluarga sekaligus melakukan `mergeCells` pada kolom non-nama, memberi format mata uang (`Rp #,##0`), border garis, dan warna sel sesuai standar laporan tahun 2025/2026.
3. **Multi-Tab Synchronization**: Data otomatis terdistribusi ke:
   - Sheet Rekap Gabungan (dengan jeda 2 baris dan total harian/kumulatif).
   - Sheet Tab Harian (per tanggal transaksi).
   - Sheet Rekap Keseluruhan & Amil (menghitung persentase amil 12,5% dan saldo penyaluran).
4. **Multi-Device & Multi-Panitia**: Semua panitia di posko zakat dapat membuka aplikasi dari laptop, tablet, atau smartphone masing-masing dan mengirim data ke 1 Spreadsheet yang sama.
5. **Cetak Kuitansi / Bukti Setor Zakat**: Dilengkapi fitur cetak bukti penerimaan zakat (PDF / printer thermal) sebagai tanda terima resmi bagi muzakki yang dilengkapi doa penerima zakat.

### Target Audience
Pengurus Unit Pengumpul Zakat (UPZ), panitia Ramadhan masjid, dan amil zakat yang bertugas mencatat dan merekapitulasi transaksi zakat secara cepat, rapi, dan akuntabel.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Autentikasi & Koneksi Spreadsheet**:
   - Panitia masuk menggunakan Google Sign-In.
   - Panitia dapat memilih spreadsheet yang sudah ada (memasukkan ID atau memilih dari Drive) atau menekan tombol **"Buat Spreadsheet Zakat Baru"** yang otomatis menginisialisasi 3 jenis sheet dengan template header lengkap.
2. **Input Transaksi Zakat**:
   - Panitia memilih tanggal penerimaan zakat (default: hari ini).
   - Memasukkan nama muzakki dan anggota keluarga (tekan `Enter` atau tombol `+ Tambah Nama` untuk menambah jiwa).
   - Memilih jenis zakat: Fitrah (Beras Kg / Uang Rp otomatis dihitung berdasarkan jiwa), Fidyah, Maal, Infaq.
   - Sistem menampilkan preview perhitungan real-time.
   - Panitia menekan **"Simpan & Kirim ke Spreadsheet"**.
   - Muncul dialog konfirmasi & opsi langsung **"Cetak Kuitansi Muzakki"**.
3. **Monitoring & Rekapitulasi Real-Time**:
   - Panitia dapat memantau akumulasi total jiwa, beras (kg), dan uang (Rp) per hari maupun keseluruhan.
   - Filter transaksi berdasarkan tanggal, pencarian nama muzakki, dan status sinkronisasi.
4. **Pengaturan Tarif Zakat**:
   - Menu modal pengaturan untuk mengubah tarif uang zakat fitrah per jiwa (misal Rp 42.500) sesuai SK BAZNAS/Kemenag tahun berjalan tanpa mengubah data yang telah tersimpan sebelumnya.

### Visual Identity & Theme
- **Aesthetic Direction**: *Clean Islamic Financial Utility* — antarmuka elegan, bersih, berwibawa, dan sangat fungsional untuk penggunaan cepat di meja registrasi panitia.
- **Color Palette**:
  - Neutral Canvas: `#F8FAFC` (Slate 50) dengan kartu putih bersih `#FFFFFF`.
  - Primary Accent: `#047857` (Emerald 700) dan `#065F46` (Emerald 800) sebagai simbol ketenangan dan identitas lembaga zakat/keislaman.
  - Secondary Accent: `#D97706` (Amber 600) untuk infaq/emas maal, dan `#0284C7` (Sky 600) untuk beras fitrah.
  - Borders: Hairline borders `#E2E8F0` (Slate 200) dengan bayangan lembut flat.
- **Typography**:
  - Display / Headings: `Plus Jakarta Sans` (SemiBold / Bold).
  - Body & Form: `Plus Jakarta Sans` (Regular 400, Medium 500).
  - Numeric & Currency: `JetBrains Mono` / tabular numerals (`tabular-nums`) untuk konsistensi angka finansial dan berat beras.
- **Design Constitution Adherence**:
  - Tanpa badge pill melayang (zero-pill discipline); metadata disajikan dengan tipografi bersih dan pemisah `·`.
  - Form kontrol responsif, single-line label, padding ergonomis untuk pengetikan cepat.

---

## 3. Key Product Decisions & Trade-Offs

- **Client-Side Google Sheets API via Firebase OAuth Access Token**:
  - *Chosen Approach*: Otentikasi Google via Firebase Auth Client SDK (`signInWithPopup`), memperoleh access token dengan scopes `spreadsheets` dan `drive.file`, lalu memanggil REST API Google Sheets secara langsung dari browser atau melalui server proxy pendukung.
  - *Why*: Memenuhi instruksi arsitektur AI Studio (menghindari redirect flow server-side yang rentan terhadap mismatch redirect URI pada dynamic Cloud Run preview).
- **Dual-Storage (Local Cache + Remote Spreadsheet Sync)**:
  - *Chosen Approach*: Menyimpan transaksi di IndexedDB/localStorage aplikasi lokal secara instan, lalu mengirim mutasi batch ke Google Sheets secara background/real-time dengan status retry jika koneksi internet tersendat.
  - *Why*: Sangat penting di posko masjid di mana internet kadang mengalami fluktuasi; panitia tetap bisa melayani antrean muzakki tanpa delay loading.
- **Batch Update Grid Layout Engine**:
  - *Chosen Approach*: Menggunakan Google Sheets API `batchUpdate` dengan instruksi `appendCells`, `mergeCells`, dan `repeatCell` (borders & number formats).
  - *Why*: Memastikan format tabel di spreadsheet persis 100% sama dengan format laporan historis 2025 dan 2026 yang dilampirkan pengguna.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             UPZ ZAKAT WEB APP                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────┐ │
│  │     Top Bar Contract   │  │    Summary Stat Bar    │  │ Quick Settings │ │
│  │ (Title, Nav, Google UI)│  │ (Jiwa, Beras, Uang)    │  │ (Tarif Fitrah) │ │
│  └───────────┬────────────┘  └───────────┬────────────┘  └───────┬────────┘ │
│              │                           │                       │          │
│  ┌───────────▼───────────────────────────▼───────────────────────▼────────┐ │
│  │                        Interactive Main Views                          │ │
│  │                                                                        │ │
│  │  [Tab: Form Input Muzakki]   [Tab: Rekap Harian]   [Tab: Ringkasan]    │ │
│  │  • Multi-Nama Keluarga       • Jeda 2 Baris        • Amil 12.5%        │ │
│  │  • Fitrah (Beras/Uang)       • Subtotal & Grand    • Saldo Penyaluran  │ │
│  │  • Fidyah, Maal, Infaq       • Status Sync Sheet   • Export XLSX/PDF   │ │
│  └───────────────────────────────────────┬────────────────────────────────┘ │
│                                          │                                  │
│  ┌───────────────────────────────────────▼────────────────────────────────┐ │
│  │                      State & Google Sheets Engine                      │ │
│  │  • In-Memory Access Token Caching (Firebase Auth Google Provider)      │ │
│  │  • Sheet Builder: Rekap Gabungan, Tab Per Hari, Tab Ringkasan Akhir    │ │
│  │  • Batch Merge API (mergeCells A-C, E-M pada transaksi multi-nama)     │ │
│  │  • Offline Local Ledger (IndexedDB/LocalStorage sync backup)           │ │
│  └───────────────────────────────────────┬────────────────────────────────┘ │
└──────────────────────────────────────────┼──────────────────────────────────┘
                                           │
                                           ▼
             ┌──────────────────────────────────────────────────────────┐
             │       Google Sheets API v4 (User Google Drive)           │
             │       • Tab 'Rekap Gabungan' (Format 2025/2026)          │
             │       • Tab 'DD-Mmm-YY' (Tab Harian Otomatis)            │
             │       • Tab 'Rekapitulasi Total & Amil'                  │
             └──────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface ZakatFamilyMember {
  id: string;
  name: string;
}

interface ZakatTransaction {
  id: string;
  nomor: number;
  tanggal: string; // e.g. "7-Mar-26"
  jiwa: number;
  muzakki: string; // Kepala keluarga / pembayar
  familyMembers: string[]; // Semua nama (termasuk kepala keluarga)
  fitrah: {
    berasKg: number;
    uangRp: number;
  };
  fidyah: {
    berasKg: number;
    uangRp: number;
  };
  maal: {
    uangRp: number;
  };
  infaq: {
    berasKg: number;
    uangRp: number;
  };
  subTotal: {
    berasKg: number;
    uangRp: number;
  };
  grandTotalKumulatif?: {
    berasKg: number;
    uangRp: number;
  };
  keterangan?: string; // e.g. "QRIS", "Transfer", "Tunai"
  syncedToGoogleSheets: boolean;
  timestamp: number;
}

interface ZakatSettings {
  tahunRamadhan: string; // e.g. "Ramadhan 1447H / 2026M"
  fitrahBerasKgPerJiwa: number; // default 2.5
  fitrahUangRpPerJiwa: number; // default 42500 (bisa diubah panitia)
  namaMasjid: string; // "UPZ Masjid Al-Hasanah"
  persenAmil: number; // default 12.5%
  activeSpreadsheetId?: string;
  activeSpreadsheetName?: string;
}
```

---

## 5. Implementation Steps & Verification Plan

1. **OAuth Setup Step**:
   - Lakukan setup Google OAuth via `set_up_oauth` dengan scope `https://www.googleapis.com/auth/spreadsheets` dan `https://www.googleapis.com/auth/drive.file`.
2. **Sheet Formatting Engine**:
   - Implementasikan fungsi pembuat baris dengan algoritma merge sel otomatis untuk multi-nama:
     - Jika sebuah transaksi memiliki $N$ nama (misal 4 orang), dibuat $N$ baris.
     - Baris ke-1 memuat Nomor, Tanggal, Jiwa, Nama-1, Fitrah, Fidyah, Maal, Infaq, Sub Total.
     - Baris ke-2 s/d $N$ hanya memuat Nama-2 s/d Nama-$N$.
     - Request `mergeCells` dikirimkan untuk menggabungkan sel kolom No, Tanggal, Jiwa, Fitrah, Fidyah, Maal, Infaq, Sub Total secara vertikal.
     - Di akhir setiap hari, dibuat baris Total Harian dan jeda 2 baris kosong sebelum hari berikutnya.
3. **Komponen Antarmuka Pengguna**:
   - Header terstandarisasi dengan Google Sign-In status, pemilih/pembuat Spreadsheet Zakat, dan tombol Pengaturan Tarif.
   - Form Entri Zakat interaktif dengan penambahan nama keluarga dinamis & kalkulasi otomatis.
   - Tabel Preview Rekap Harian dan Rekap Gabungan bergaya spreadsheet langsung di web.
   - Modal Kuitansi Digital untuk cetak / simpan bukti zakat.
   - Tab Rekap Keseluruhan dengan perhitungan Amil 12,5% dan pembagian hak amil.
4. **Verifikasi & Uji Coba**:
   - Uji entri 1 nama vs multi-nama (keluarga).
   - Uji kalkulasi otomatis beras (2,5 kg x jiwa) dan uang fitrah (tarif x jiwa).
   - Uji sinkronisasi Google Sheets, format merge sel, dan ekspor lokal.
   - Verifikasi kompilasi dan linting (`compile_applet` & `lint_applet`).
