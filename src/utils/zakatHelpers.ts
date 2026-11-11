import { ZakatTransaction, DailyGroupSummary, ZakatSettings } from '../types/zakat';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const MONTHS_ENG = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats YYYY-MM-DD into "1-Mar-26" format matching UPZ Al-Hasanah spreadsheet
 */
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = parts[0].slice(-2);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = MONTHS_ENG[monthIdx] || MONTHS_SHORT[monthIdx] || parts[1];
  return `${day}-${monthName}-${year}`;
}

/**
 * Parses "1-Mar-26" or "15-Mar-25" into YYYY-MM-DD
 */
export function parseSpreadsheetDate(dateStr: string, defaultYear = '2026'): string {
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const match = clean.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2,4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monStr = match[2].toLowerCase().slice(0, 3);
    const yrRaw = match[3];
    const year = yrRaw.length === 2 ? `20${yrRaw}` : yrRaw;

    const map: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', mei: '05',
      jun: '06', jul: '07', aug: '08', agu: '08', sep: '09', oct: '10', okt: '10',
      nov: '11', dec: '12', des: '12',
    };
    const month = map[monStr] || '03';
    return `${year}-${month}-${day}`;
  }
  return `${defaultYear}-03-01`;
}

export function formatRupiah(amount: number, showZeroAsDash = false): string {
  if (!amount || amount === 0) {
    return showZeroAsDash ? 'Rp -' : 'Rp 0';
  }
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function formatBeras(kg: number, showZero = true): string {
  if (!kg || kg === 0) {
    return showZero ? '0,00' : '';
  }
  return kg.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Re-indexes transactions chronologically and computes daily groups + cumulative Grand Totals
 */
export function buildDailyGroups(transactions: ZakatTransaction[]): {
  sortedTransactions: ZakatTransaction[];
  dailyGroups: DailyGroupSummary[];
} {
  const sorted = [...transactions].sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    return a.createdAt - b.createdAt;
  });

  // Reassign sequential nomor (1, 2, 3...)
  const reindexed = sorted.map((t, index) => ({
    ...t,
    nomor: index + 1,
  }));

  const groupsMap = new Map<string, ZakatTransaction[]>();
  for (const tx of reindexed) {
    const list = groupsMap.get(tx.tanggal) || [];
    list.push(tx);
    groupsMap.set(tx.tanggal, list);
  }

  const dailyGroups: DailyGroupSummary[] = [];
  let runningGrandTotalBeras = 0;
  let runningGrandTotalUang = 0;

  for (const [tanggal, list] of groupsMap.entries()) {
    let totalJiwa = 0;
    let fitrahBeras = 0;
    let fitrahUang = 0;
    let fidyahBeras = 0;
    let fidyahUang = 0;
    let maalUang = 0;
    let infaqBeras = 0;
    let infaqUang = 0;
    let subTotalBeras = 0;
    let subTotalUang = 0;

    for (const tx of list) {
      totalJiwa += tx.jiwa;
      fitrahBeras += tx.fitrah.berasKg;
      fitrahUang += tx.fitrah.uangRp;
      fidyahBeras += tx.fidyah.berasKg;
      fidyahUang += tx.fidyah.uangRp;
      maalUang += tx.maal.uangRp;
      infaqBeras += tx.infaq.berasKg;
      infaqUang += tx.infaq.uangRp;
      subTotalBeras += tx.subTotal.berasKg;
      subTotalUang += tx.subTotal.uangRp;
    }

    runningGrandTotalBeras += subTotalBeras;
    runningGrandTotalUang += subTotalUang;

    dailyGroups.push({
      tanggal,
      displayDate: formatDisplayDate(tanggal),
      transactions: list,
      totalJiwa,
      fitrahBeras: Number(fitrahBeras.toFixed(2)),
      fitrahUang,
      fidyahBeras: Number(fidyahBeras.toFixed(2)),
      fidyahUang,
      maalUang,
      infaqBeras: Number(infaqBeras.toFixed(2)),
      infaqUang,
      subTotalBeras: Number(subTotalBeras.toFixed(2)),
      subTotalUang,
      cumulativeGrandTotalBeras: Number(runningGrandTotalBeras.toFixed(2)),
      cumulativeGrandTotalUang: runningGrandTotalUang,
    });
  }

  return {
    sortedTransactions: reindexed,
    dailyGroups,
  };
}

export const DEFAULT_SETTINGS: ZakatSettings = {
  namaLembaga: 'UPZ Masjid Al-Hasanah',
  tahunHijriah: '1447 H',
  tahunMasehi: '2026',
  fitrahBerasPerJiwaKg: 2.5,
  fitrahUangPerJiwaRp: 42500,
  fidyahBerasPerHariKg: 0.6,
  fidyahUangPerHariRp: 50000,
  persentaseAmil: 12.5,
  jumlahAmil: 24,
  tersalurkanUangRp: 0,
  tersalurkanBerasKg: 0,
  upzFolderName: 'UPZ',
  upzFolderId: '',
  buktiFolderId: '',
  spreadsheetId: '',
  spreadsheetUrl: '',
  spreadsheetTitle: 'Laporan Penerimaan Zakat Ramadhan 1447H - UPZ Al-Hasanah',
};

/**
 * Initial authentic sample data from UPZ Al-Hasanah Ramadhan 1447H (2026)
 * so the user immediately sees the exact multi-row family merge & 2-row daily separation.
 */
export const INITIAL_TRANSACTIONS_2026: ZakatTransaction[] = [
  {
    id: 'tx-2026-1',
    nomor: 1,
    tanggal: '2026-03-01',
    jiwa: 6,
    familyMembers: [
      'Ronal Putra',
      'Rupi Asih',
      'Zafirah Awlia',
      'Nadhira Zalma',
      'Adibah Rahmadhani',
      'Ahmad AlFarizki',
    ],
    fitrah: { berasKg: 0, uangRp: 255000 },
    fidyah: { berasKg: 0, uangRp: 0 },
    maal: { uangRp: 0 },
    infaq: { berasKg: 0, uangRp: 0 },
    subTotal: { berasKg: 0, uangRp: 255000 },
    keterangan: 'Tunai',
    createdAt: 1740787200000,
    synced: false,
  },
  {
    id: 'tx-2026-2',
    nomor: 2,
    tanggal: '2026-03-02',
    jiwa: 5,
    familyMembers: [
      'Budi Setiadji',
      'Dwi Koesumawarahimy',
      'Smudera Setiadji Putra',
      'Alam Arsya Setiadji Putra',
      'RR. Gemi Koestintatimali',
    ],
    fitrah: { berasKg: 0, uangRp: 212500 },
    fidyah: { berasKg: 0, uangRp: 0 },
    maal: { uangRp: 0 },
    infaq: { berasKg: 0, uangRp: 0 },
    subTotal: { berasKg: 0, uangRp: 212500 },
    keterangan: 'Tunai',
    createdAt: 1740873600000,
    synced: false,
  },
  {
    id: 'tx-2026-3',
    nomor: 3,
    tanggal: '2026-03-02',
    jiwa: 3,
    familyMembers: ['Bambang P.', 'Suratim', 'Amaliya Tika'],
    fitrah: { berasKg: 0, uangRp: 127500 },
    fidyah: { berasKg: 0, uangRp: 0 },
    maal: { uangRp: 0 },
    infaq: { berasKg: 0, uangRp: 22500 },
    subTotal: { berasKg: 0, uangRp: 150000 },
    keterangan: 'Tunai',
    createdAt: 1740873700000,
    synced: false,
  },
  {
    id: 'tx-2026-4',
    nomor: 4,
    tanggal: '2026-03-02',
    jiwa: 4,
    familyMembers: [
      'Ridwan Bintaro',
      'Yayuk Rahayu',
      'Aulia Natasya Putri',
      'Alya Putri Ramadhani',
    ],
    fitrah: { berasKg: 0, uangRp: 170000 },
    fidyah: { berasKg: 0, uangRp: 0 },
    maal: { uangRp: 0 },
    infaq: { berasKg: 0, uangRp: 30000 },
    subTotal: { berasKg: 0, uangRp: 200000 },
    keterangan: 'Tunai',
    createdAt: 1740873800000,
    synced: false,
  },
  {
    id: 'tx-2026-5',
    nomor: 5,
    tanggal: '2026-03-05',
    jiwa: 4,
    familyMembers: [
      'Hartono',
      'Ni Luh Putu Bukti',
      'Naufal Anwar Tsabat',
      'Nabila Diah Azkadina',
    ],
    fitrah: { berasKg: 10.0, uangRp: 0 },
    fidyah: { berasKg: 0, uangRp: 0 },
    maal: { uangRp: 0 },
    infaq: { berasKg: 0, uangRp: 0 },
    subTotal: { berasKg: 10.0, uangRp: 0 },
    keterangan: 'Beras',
    createdAt: 1741132800000,
    synced: false,
  },
  {
    id: 'tx-2026-6',
    nomor: 6,
    tanggal: '2026-03-06',
    jiwa: 5,
    familyMembers: [
      'Hari Mulyadi',
      'Wiwin Adnyani',
      'Aulia Anti',
      'Farrel Wijaya',
      'Amanda Amalia',
    ],
    fitrah: { berasKg: 0, uangRp: 212500 },
    fidyah: { berasKg: 0, uangRp: 50000 },
    maal: { uangRp: 0 },
    infaq: { berasKg: 0, uangRp: 37500 },
    subTotal: { berasKg: 0, uangRp: 300000 },
    keterangan: 'Tunai',
    createdAt: 1741219200000,
    synced: false,
  },
  {
    id: 'tx-2026-7',
    nomor: 7,
    tanggal: '2026-03-08',
    jiwa: 4,
    familyMembers: [
      'Benny Udayana',
      'Nur Ismah Yuniasih',
      'Alifya Nazahra',
      'Siti Aminah',
    ],
    fitrah: { berasKg: 10.0, uangRp: 0 },
    fidyah: { berasKg: 0, uangRp: 0 },
    maal: { uangRp: 0 },
    infaq: { berasKg: 10.0, uangRp: 0 },
    subTotal: { berasKg: 20.0, uangRp: 0 },
    keterangan: 'Beras',
    createdAt: 1741392000000,
    synced: false,
  },
  {
    id: 'tx-2026-8',
    nomor: 8,
    tanggal: '2026-03-09',
    jiwa: 1,
    familyMembers: ['Poli Indrawan'],
    fitrah: { berasKg: 0, uangRp: 0 },
    fidyah: { berasKg: 0, uangRp: 0 },
    maal: { uangRp: 500000 },
    infaq: { berasKg: 0, uangRp: 0 },
    subTotal: { berasKg: 0, uangRp: 500000 },
    keterangan: 'Tunai',
    createdAt: 1741478400000,
    synced: false,
  },
];
