export interface ZakatTransaction {
  id: string;
  nomor: number;
  tanggal: string; // Format: YYYY-MM-DD internally, displayed as D-MMM-YY (e.g., 1-Mar-26)
  jiwa: number;
  familyMembers: string[]; // Array of names (index 0 is head of family / primary muzakki)
  fitrah: {
    berasKg: number;
    uangRp: number;
  };
  fidyah: {
    jumlahHari?: number;
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
  keterangan?: string; // e.g. "Tunai", "Beras", "QRIS/Transfer"
  buktiDriveUrl?: string; // Link to uploaded proof in Google Drive UPZ/Bukti folder
  buktiFileName?: string;
  petugas?: string;
  createdAt: number;
  synced?: boolean;
}

export interface ZakatSettings {
  namaLembaga: string;
  tahunHijriah: string;
  tahunMasehi: string;
  // Ketetapan Nilai Zakat Fitrah Per Jiwa (Kemenag / BAZNAS)
  fitrahBerasPerJiwaKg: number; // Fixed 2.5 kg default
  fitrahUangPerJiwaRp: number; // Configurable per Kemenag rule, e.g. 42500 for 2026, 40000 for 2025
  // Ketetapan Nilai Fidyah Per Jiwa/Per Hari (Kemenag / BAZNAS)
  fidyahBerasPerHariKg: number; // Default 0.6 kg or 0.7 kg per hari
  fidyahUangPerHariRp: number; // Default Rp 50.000 or Rp 60.000 per hari
  // Parameter Perhitungan Amil
  persentaseAmil: number; // Default 12.5%
  jumlahAmil: number; // Default 24 amil
  tersalurkanUangRp: number;
  tersalurkanBerasKg: number;
  // Integrasi Google Spreadsheet & Drive Folder UPZ
  upzFolderName: string; // Default "UPZ"
  upzFolderId?: string;
  buktiFolderId?: string;
  rekapitulasiFolderId?: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  lastSyncedAt?: string;
}

export interface DailyGroupSummary {
  tanggal: string;
  displayDate: string; // e.g. "1-Mar-26"
  transactions: ZakatTransaction[];
  totalJiwa: number;
  fitrahBeras: number;
  fitrahUang: number;
  fidyahBeras: number;
  fidyahUang: number;
  maalUang: number;
  infaqBeras: number;
  infaqUang: number;
  subTotalBeras: number;
  subTotalUang: number;
  cumulativeGrandTotalBeras: number;
  cumulativeGrandTotalUang: number;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
}
