import { ZakatTransaction } from '../types/zakat';
import { parseSpreadsheetDate } from './zakatHelpers';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseRupiahCell(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (!cleaned) return 0;
  return parseInt(cleaned, 10) || 0;
}

function parseBerasCell(raw: string | undefined): number {
  if (!raw) return 0;
  const normalized = raw.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  if (!normalized) return 0;
  return parseFloat(normalized) || 0;
}

/**
 * Parses the historical CSV format from UPZ Al-Hasanah (2025 or 2026)
 */
export async function loadHistoricalCsvArchive(year: '2025' | '2026'): Promise<ZakatTransaction[]> {
  const path =
    year === '2025'
      ? '/assets/aistudio/Laporan_Zakat_2025_UPZ_Al-Hasanah_38b61e82'
      : '/assets/aistudio/Laporan_Zakat_2026_UPZ_Al-Hasanah_fe3bba93';

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Gagal memuat file arsip ${year}`);
  }
  const text = await response.text();
  const lines = text.split(/\r?\n/);

  const transactions: ZakatTransaction[] = [];
  let currentTanggal = year === '2025' ? '2025-03-07' : '2026-03-01';
  let currentTx: ZakatTransaction | null = null;

  // Offset in 2026 CSV: column 0 is empty or daily jiwa sum, column 1 is No, column 2 is Tanggal, column 3 is Jiwa, column 4 is Nama
  // In 2025 CSV: column 0 is No, column 1 is Tanggal, column 2 is Jiwa, column 3 is Nama
  const offset = year === '2026' ? 1 : 0;

  for (let i = 0; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 10) continue;

    const noCol = cols[0 + offset] || '';
    const dateCol = cols[1 + offset] || '';
    const jiwaCol = cols[2 + offset] || '';
    const namaCol = cols[3 + offset] || '';

    if (noCol.toLowerCase() === 'total' || dateCol.toLowerCase() === 'total') {
      if (currentTx) {
        transactions.push(currentTx);
        currentTx = null;
      }
      continue;
    }

    if (dateCol && /\d{1,2}-[A-Za-z]{3}-\d{2}/.test(dateCol)) {
      currentTanggal = parseSpreadsheetDate(dateCol, year);
    }

    const parsedNo = parseInt(noCol, 10);
    if (!isNaN(parsedNo) && parsedNo > 0 && namaCol) {
      if (currentTx) {
        transactions.push(currentTx);
      }
      const fitrahBeras = parseBerasCell(cols[4 + offset]);
      const fitrahUang = parseRupiahCell(cols[5 + offset]);
      const fidyahBeras = parseBerasCell(cols[6 + offset]);
      const fidyahUang = parseRupiahCell(cols[7 + offset]);
      const maalUang = parseRupiahCell(cols[8 + offset]);
      const infaqBeras = parseBerasCell(cols[9 + offset]);
      const infaqUang = parseRupiahCell(cols[10 + offset]);
      const subBeras = Number((fitrahBeras + fidyahBeras + infaqBeras).toFixed(2));
      const subUang = fitrahUang + fidyahUang + maalUang + infaqUang;
      const ket = year === '2025' ? (cols[15] || 'Tunai') : 'Tunai';

      currentTx = {
        id: `hist-${year}-${parsedNo}-${i}`,
        nomor: parsedNo,
        tanggal: currentTanggal,
        jiwa: parseInt(jiwaCol, 10) || 1,
        familyMembers: [namaCol],
        fitrah: { berasKg: fitrahBeras, uangRp: fitrahUang },
        fidyah: { berasKg: fidyahBeras, uangRp: fidyahUang },
        maal: { uangRp: maalUang },
        infaq: { berasKg: infaqBeras, uangRp: infaqUang },
        subTotal: { berasKg: subBeras, uangRp: subUang },
        keterangan: ket,
        createdAt: Date.now() + i,
        synced: false,
      };
    } else if (!noCol && namaCol && currentTx && namaCol !== 'Nama' && namaCol !== 'Beras') {
      // Continuation row for family member under the same merged transaction!
      currentTx.familyMembers.push(namaCol);
    }
  }

  if (currentTx) {
    transactions.push(currentTx);
  }

  // Ensure jiwa matches familyMembers count if familyMembers has more entries
  return transactions.map((tx) => ({
    ...tx,
    jiwa: Math.max(tx.jiwa, tx.familyMembers.length),
  }));
}
