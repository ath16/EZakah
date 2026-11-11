import { DailyGroupSummary, ZakatSettings, ZakatTransaction } from '../types/zakat';
import { buildDailyGroups, formatBeras, formatRupiah, parseSpreadsheetDate } from '../utils/zakatHelpers';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export function extractSpreadsheetId(input: string): string {
  const clean = input.trim();
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return clean;
}

interface SheetGridBuildResult {
  values: (string | number)[][];
  merges: {
    startRowIndex: number;
    endRowIndex: number;
    startColumnIndex: number;
    endColumnIndex: number;
  }[];
  totalRowIndices: number[];
}

/**
 * Builds the 2D cells array and vertical/horizontal merge instructions
 * for either the combined sheet ('Rekap Gabungan') or a single daily sheet.
 */
function buildRekapSheetPayload(
  groups: DailyGroupSummary[],
  settings: ZakatSettings,
  titleText: string
): SheetGridBuildResult {
  const values: (string | number)[][] = [];
  const merges: SheetGridBuildResult['merges'] = [];
  const totalRowIndices: number[] = [];

  // Row 0: Title
  values.push([
    titleText,
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  ]);
  merges.push({
    startRowIndex: 0,
    endRowIndex: 1,
    startColumnIndex: 0,
    endColumnIndex: 16,
  });

  // Row 1: Empty spacer
  values.push(new Array(16).fill(''));

  // Row 2 & Row 3: 2-Level Table Header matching UPZ Al-Hasanah format
  values.push([
    'No',
    'Tanggal',
    'Jiwa',
    'Nama',
    'Fitrah',
    '',
    'Fidyah',
    '',
    'Maal',
    'Infaq',
    '',
    'Sub Total',
    '',
    'Grand Total',
    '',
    'Keterangan',
  ]);
  values.push([
    '',
    '',
    '',
    '',
    'Beras (Kg)',
    'Uang (Rp)',
    'Beras (Kg)',
    'Uang (Rp)',
    'Uang (Rp)',
    'Beras (Kg)',
    'Uang (Rp)',
    'Beras (Kg)',
    'Uang (Rp)',
    'Beras (Kg)',
    'Uang (Rp)',
    '',
  ]);

  // Header merges (Row 2-3)
  // Vertical merges for No (0), Tanggal (1), Jiwa (2), Nama (3), Keterangan (15)
  for (const colIdx of [0, 1, 2, 3, 15]) {
    merges.push({
      startRowIndex: 2,
      endRowIndex: 4,
      startColumnIndex: colIdx,
      endColumnIndex: colIdx + 1,
    });
  }
  // Horizontal merges for Fitrah (4..6), Fidyah (6..8), Infaq (9..11), Sub Total (11..13), Grand Total (13..15)
  for (const [startCol, endCol] of [
    [4, 6],
    [6, 8],
    [9, 11],
    [11, 13],
    [13, 15],
  ]) {
    merges.push({
      startRowIndex: 2,
      endRowIndex: 3,
      startColumnIndex: startCol,
      endColumnIndex: endCol,
    });
  }

  // Columns to vertically merge when a transaction has > 1 family member
  // Col 0: No, Col 1: Tanggal, Col 2: Jiwa, Col 4..14: Fitrah..GrandTotal, Col 15: Keterangan
  const familyMergeCols = [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  groups.forEach((group, groupIdx) => {
    group.transactions.forEach((tx, txIdxInDay) => {
      const startRow = values.length;
      const names = tx.familyMembers.length > 0 ? tx.familyMembers : ['Hamba Allah'];
      const rowCount = names.length;

      names.forEach((memberName, nameIdx) => {
        if (nameIdx === 0) {
          values.push([
            tx.nomor,
            txIdxInDay === 0 ? group.displayDate : '',
            tx.jiwa,
            memberName,
            tx.fitrah.berasKg > 0 ? formatBeras(tx.fitrah.berasKg) : '',
            tx.fitrah.uangRp > 0 ? formatRupiah(tx.fitrah.uangRp) : '',
            tx.fidyah.berasKg > 0 ? formatBeras(tx.fidyah.berasKg) : '',
            tx.fidyah.uangRp > 0 ? formatRupiah(tx.fidyah.uangRp) : '',
            tx.maal.uangRp > 0 ? formatRupiah(tx.maal.uangRp) : '',
            tx.infaq.berasKg > 0 ? formatBeras(tx.infaq.berasKg) : '',
            tx.infaq.uangRp > 0 ? formatRupiah(tx.infaq.uangRp) : '',
            formatBeras(tx.subTotal.berasKg),
            formatRupiah(tx.subTotal.uangRp, true),
            '',
            '',
            tx.buktiDriveUrl
              ? `${tx.keterangan || 'QRIS/Transfer'} — ${tx.buktiDriveUrl}`
              : tx.keterangan || '',
          ]);
        } else {
          values.push([
            '',
            '',
            '',
            memberName,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
          ]);
        }
      });

      // If family has multiple names, merge all non-name columns vertically across those rows!
      if (rowCount > 1) {
        const endRow = startRow + rowCount;
        for (const colIdx of familyMergeCols) {
          merges.push({
            startRowIndex: startRow,
            endRowIndex: endRow,
            startColumnIndex: colIdx,
            endColumnIndex: colIdx + 1,
          });
        }
      }
    });

    // Daily Total Row at the end of the day
    const totalRowIdx = values.length;
    totalRowIndices.push(totalRowIdx);
    values.push([
      group.totalJiwa,
      'Total',
      '',
      '',
      formatBeras(group.fitrahBeras),
      formatRupiah(group.fitrahUang, true),
      formatBeras(group.fidyahBeras),
      formatRupiah(group.fidyahUang, true),
      formatRupiah(group.maalUang, true),
      formatBeras(group.infaqBeras),
      formatRupiah(group.infaqUang, true),
      formatBeras(group.subTotalBeras),
      formatRupiah(group.subTotalUang, true),
      formatBeras(group.cumulativeGrandTotalBeras),
      formatRupiah(group.cumulativeGrandTotalUang, true),
      '',
    ]);

    // Merge "Total" label across Tanggal..Nama (Cols 1..4)
    merges.push({
      startRowIndex: totalRowIdx,
      endRowIndex: totalRowIdx + 1,
      startColumnIndex: 1,
      endColumnIndex: 4,
    });

    // Separate each day by 2 empty rows (2 baris jeda) in the combined sheet
    if (groupIdx < groups.length - 1) {
      values.push(new Array(16).fill(''));
      values.push(new Array(16).fill(''));
    }
  });

  return { values, merges, totalRowIndices };
}

/**
 * Builds the Summary & Amil Calculation Sheet ('Rekapitulasi Total & Amil')
 * matching the right-hand tables in Laporan Zakat 2025 UPZ Al-Hasanah
 */
function buildSummaryAmilSheetPayload(
  groups: DailyGroupSummary[],
  settings: ZakatSettings
): (string | number)[][] {
  const rows: (string | number)[][] = [];

  rows.push([
    `REKAPITULASI PENERIMAAN ZAKAT SELAMA MASA PENERIMAAN (${settings.namaLembaga.toUpperCase()} - RAMADHAN ${settings.tahunHijriah})`,
  ]);
  rows.push([]);
  rows.push([
    'NO.',
    'Tanggal',
    'Jiwa',
    'Fitrah Beras (Kg)',
    'Fitrah Uang (Rp)',
    'Fidyah Beras (Kg)',
    'Fidyah Uang (Rp)',
    'Maal Uang (Rp)',
    'Infaq Beras (Kg)',
    'Infaq Uang (Rp)',
    'Sub Total Beras (Kg)',
    'Sub Total Uang (Rp)',
    'Grand Total Beras (Kg)',
    'Grand Total Uang (Rp)',
  ]);

  let sumJiwa = 0;
  let sumFitrahBeras = 0;
  let sumFitrahUang = 0;
  let sumFidyahBeras = 0;
  let sumFidyahUang = 0;
  let sumMaalUang = 0;
  let sumInfaqBeras = 0;
  let sumInfaqUang = 0;
  let sumTotalBeras = 0;
  let sumTotalUang = 0;

  groups.forEach((g, idx) => {
    sumJiwa += g.totalJiwa;
    sumFitrahBeras += g.fitrahBeras;
    sumFitrahUang += g.fitrahUang;
    sumFidyahBeras += g.fidyahBeras;
    sumFidyahUang += g.fidyahUang;
    sumMaalUang += g.maalUang;
    sumInfaqBeras += g.infaqBeras;
    sumInfaqUang += g.infaqUang;
    sumTotalBeras += g.subTotalBeras;
    sumTotalUang += g.subTotalUang;

    rows.push([
      idx + 1,
      g.displayDate,
      g.totalJiwa,
      formatBeras(g.fitrahBeras),
      formatRupiah(g.fitrahUang),
      formatBeras(g.fidyahBeras),
      formatRupiah(g.fidyahUang),
      formatRupiah(g.maalUang),
      formatBeras(g.infaqBeras),
      formatRupiah(g.infaqUang),
      formatBeras(g.subTotalBeras),
      formatRupiah(g.subTotalUang),
      formatBeras(g.cumulativeGrandTotalBeras),
      formatRupiah(g.cumulativeGrandTotalUang),
    ]);
  });

  rows.push([
    'TOTAL',
    '',
    sumJiwa,
    formatBeras(sumFitrahBeras),
    formatRupiah(sumFitrahUang),
    formatBeras(sumFidyahBeras),
    formatRupiah(sumFidyahUang),
    formatRupiah(sumMaalUang),
    formatBeras(sumInfaqBeras),
    formatRupiah(sumInfaqUang),
    formatBeras(sumTotalBeras),
    formatRupiah(sumTotalUang),
    formatBeras(sumTotalBeras),
    formatRupiah(sumTotalUang),
  ]);

  rows.push([]);
  rows.push([]);

  // Perhitungan Amil Uang (Fitrah + Fidyah + Maal)
  const totalZakatUangAmilBase = sumFitrahUang + sumFidyahUang + sumMaalUang;
  const hakAmilUang = Math.round(totalZakatUangAmilBase * (settings.persentaseAmil / 100));
  const bagianPerAmilUang =
    settings.jumlahAmil > 0 ? Math.round(hakAmilUang / settings.jumlahAmil) : 0;
  const siapSalurUang = sumTotalUang - hakAmilUang;
  const saldoUang = siapSalurUang - (settings.tersalurkanUangRp || 0);

  rows.push([
    'REKAPITULASI PERHITUNGAN AMIL ZAKAT DARI PENERIMAAN ZAKAT FITRAH, FIDYAH DAN MAAL BERUPA UANG',
  ]);
  rows.push([
    'NO.',
    'URAIAN',
    'PENERIMAAN (Rp)',
    'JUMLAH PENERIMAAN ZAKAT (Rp)',
    `PERHITUNGAN AMIL (${settings.persentaseAmil}%)`,
    `BAGIAN PER AMIL (${settings.jumlahAmil} Amil)`,
  ]);
  rows.push([
    1,
    'Zakat Fitrah (Uang)',
    formatRupiah(sumFitrahUang),
    formatRupiah(totalZakatUangAmilBase),
    formatRupiah(hakAmilUang),
    formatRupiah(bagianPerAmilUang),
  ]);
  rows.push([2, 'Fidyah (Uang)', formatRupiah(sumFidyahUang), '', '', '']);
  rows.push([3, 'Zakat Maal (Uang)', formatRupiah(sumMaalUang), '', '', '']);
  rows.push([4, 'Infaq / Sedekah (Uang - Non Amil)', formatRupiah(sumInfaqUang), '', '', '']);

  rows.push([]);

  // Perhitungan Amil Beras
  const totalBerasAmilBase = sumFitrahBeras + sumFidyahBeras + sumInfaqBeras;
  const hakAmilBeras = Number(
    (totalBerasAmilBase * (settings.persentaseAmil / 100)).toFixed(2)
  );
  const bagianPerAmilBeras =
    settings.jumlahAmil > 0
      ? Number((hakAmilBeras / settings.jumlahAmil).toFixed(2))
      : 0;
  const siapSalurBeras = Number((sumTotalBeras - hakAmilBeras).toFixed(2));
  const saldoBeras = Number(
    (siapSalurBeras - (settings.tersalurkanBerasKg || 0)).toFixed(2)
  );

  rows.push([
    'REKAPITULASI PERHITUNGAN AMIL ZAKAT DARI PENERIMAAN ZAKAT FITRAH, FIDYAH DAN INFAQ BERUPA BERAS',
  ]);
  rows.push([
    'NO.',
    'URAIAN',
    'PENERIMAAN (Kg)',
    'JUMLAH PENERIMAAN BERAS (Kg)',
    `PERHITUNGAN AMIL (${settings.persentaseAmil}%)`,
    `BAGIAN PER AMIL (${settings.jumlahAmil} Amil)`,
  ]);
  rows.push([
    1,
    'Zakat Fitrah (Beras)',
    formatBeras(sumFitrahBeras),
    formatBeras(totalBerasAmilBase),
    formatBeras(hakAmilBeras),
    formatBeras(bagianPerAmilBeras),
  ]);
  rows.push([2, 'Fidyah (Beras)', formatBeras(sumFidyahBeras), '', '', '']);
  rows.push([3, 'Infaq (Beras)', formatBeras(sumInfaqBeras), '', '', '']);

  rows.push([]);

  // Rekapitulasi Penyaluran Uang & Beras
  rows.push(['REKAPITULASI PENYALURAN ZAKAT UANG & BERAS']);
  rows.push([
    'KATEGORI',
    'JUMLAH TOTAL PENERIMAAN',
    `BAGIAN AMIL (${settings.persentaseAmil}%)`,
    'JUMLAH YANG AKAN DISALURKAN',
    'JUMLAH TERSALURKAN',
    'SALDO TERSISA',
  ]);
  rows.push([
    'Penerimaan Uang (Rp)',
    formatRupiah(sumTotalUang),
    formatRupiah(hakAmilUang),
    formatRupiah(siapSalurUang),
    formatRupiah(settings.tersalurkanUangRp || 0),
    formatRupiah(saldoUang),
  ]);
  rows.push([
    'Penerimaan Beras (Kg)',
    `${formatBeras(sumTotalBeras)} Kg`,
    `${formatBeras(hakAmilBeras)} Kg`,
    `${formatBeras(siapSalurBeras)} Kg`,
    `${formatBeras(settings.tersalurkanBerasKg || 0)} Kg`,
    `${formatBeras(saldoBeras)} Kg`,
  ]);

  return rows;
}

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive and populates all tabs
 */
export async function createNewZakatSpreadsheet(
  accessToken: string,
  settings: ZakatSettings,
  transactions: ZakatTransaction[]
): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  upzFolderId?: string;
  buktiFolderId?: string;
}> {
  const title =
    settings.spreadsheetTitle ||
    `Rekap Penerimaan Zakat Ramadhan ${settings.tahunHijriah} - ${settings.namaLembaga}`;

  const createRes = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Rekap Gabungan',
            gridProperties: {
              rowCount: 2500,
              columnCount: 20,
              frozenRowCount: 4,
            },
          },
        },
        {
          properties: {
            title: 'Rekapitulasi Total & Amil',
            gridProperties: {
              rowCount: 200,
              columnCount: 16,
              frozenRowCount: 3,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || 'Gagal membuat Google Spreadsheet baru.'
    );
  }

  const created = await createRes.json();
  const spreadsheetId: string = created.spreadsheetId;
  const spreadsheetUrl: string = created.spreadsheetUrl;

  // Ensure UPZ & Bukti folders exist in Google Drive and move this spreadsheet into UPZ folder
  let upzFolderId = settings.upzFolderId || '';
  let buktiFolderId = settings.buktiFolderId || '';
  try {
    const { ensureUpzAndBuktiFolders, moveFileToDriveFolder } = await import('./googleDrive');
    const folders = await ensureUpzAndBuktiFolders(
      accessToken,
      settings.upzFolderName || 'UPZ'
    );
    upzFolderId = folders.upzFolderId;
    buktiFolderId = folders.buktiFolderId;
    await moveFileToDriveFolder(accessToken, spreadsheetId, upzFolderId);
  } catch (e) {
    console.warn('Could not move spreadsheet to UPZ folder:', e);
  }

  // Populate initial data into the newly created spreadsheet
  await syncAllToGoogleSpreadsheet(accessToken, spreadsheetId, settings, transactions);

  return { spreadsheetId, spreadsheetUrl, title, upzFolderId, buktiFolderId };
}

/**
 * Synchronizes all transactions into:
 * 1) 'Rekap Gabungan' (with 2-row daily separation + automatic vertical cell merges for families)
 * 2) 'Rekapitulasi Total & Amil' (period totals + 12.5% amil calculations)
 * 3) Individual Daily Tabs ('1-Mar-26', '2-Mar-26', etc.) with automatic cell merges
 */
export async function syncAllToGoogleSpreadsheet(
  accessToken: string,
   rawSpreadsheetId: string,
  settings: ZakatSettings,
  transactions: ZakatTransaction[]
): Promise<void> {
  const spreadsheetId = extractSpreadsheetId(rawSpreadsheetId);
  if (!spreadsheetId) {
    throw new Error('ID Google Spreadsheet belum diisi.');
  }

  // 1. Fetch spreadsheet metadata to inspect existing sheets and their sheetIds
  const metaRes = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const errData = await metaRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        'Gagal mengakses Google Spreadsheet. Pastikan ID benar dan akun Anda memiliki akses edit.'
    );
  }

  const meta = await metaRes.json();
  const existingSheetsMap = new Map<string, number>();
  for (const s of meta.sheets || []) {
    if (s.properties?.title != null && s.properties?.sheetId != null) {
      existingSheetsMap.set(s.properties.title, s.properties.sheetId);
    }
  }

  const { dailyGroups } = buildDailyGroups(transactions);

  // Required tab names
  const REKAP_GABUNGAN_TAB = 'Rekap Gabungan';
  const REKAP_AMIL_TAB = 'Rekapitulasi Total & Amil';
  const dailyTabNames = dailyGroups.map((g) => g.displayDate);

  const requiredTabs = [REKAP_GABUNGAN_TAB, REKAP_AMIL_TAB, ...dailyTabNames];

  // Create any missing tabs via batchUpdate
  const addSheetRequests: unknown[] = [];
  for (const tabName of requiredTabs) {
    if (!existingSheetsMap.has(tabName)) {
      addSheetRequests.push({
        addSheet: {
          properties: {
            title: tabName,
            gridProperties: {
              rowCount: tabName === REKAP_GABUNGAN_TAB ? 3000 : 600,
              columnCount: 18,
              frozenRowCount: tabName === REKAP_AMIL_TAB ? 3 : 4,
            },
          },
        },
      });
    }
  }

  if (addSheetRequests.length > 0) {
    const addRes = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addSheetRequests }),
    });
    if (addRes.ok) {
      const addData = await addRes.json();
      for (const reply of addData.replies || []) {
        if (reply.addSheet?.properties) {
          existingSheetsMap.set(
            reply.addSheet.properties.title,
            reply.addSheet.properties.sheetId
          );
        }
      }
    }
  }

  // 2. Prepare values and formatting/merge requests for Rekap Gabungan, Rekap Amil, and each Daily Tab
  const combinedPayload = buildRekapSheetPayload(
    dailyGroups,
    settings,
    `DATA PENERIMAAN ZAKAT RAMADHAN ${settings.tahunHijriah.toUpperCase()} - ${settings.namaLembaga.toUpperCase()}`
  );

  const summaryAmilValues = buildSummaryAmilSheetPayload(dailyGroups, settings);

  const valueDataPayload: { range: string; values: (string | number)[][] }[] = [
    {
      range: `'${REKAP_GABUNGAN_TAB}'!A1`,
      values: combinedPayload.values,
    },
    {
      range: `'${REKAP_AMIL_TAB}'!A1`,
      values: summaryAmilValues,
    },
  ];

  const formatAndMergeRequests: unknown[] = [];

  // Helper to push unmerge + merge + header styling for a Rekap tab
  const addRekapTabFormatting = (
    sheetId: number,
    payload: SheetGridBuildResult
  ) => {
    // First unmerge all cells in the working area to prevent overlapping merge errors on re-sync
    formatAndMergeRequests.push({
      unmergeCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: Math.max(payload.values.length + 50, 500),
          startColumnIndex: 0,
          endColumnIndex: 16,
        },
      },
    });

    // Clear old values beyond current payload length by formatting
    // Apply header background (Rows 2..4)
    formatAndMergeRequests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 2,
          endRowIndex: 4,
          startColumnIndex: 0,
          endColumnIndex: 16,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.02, green: 0.47, blue: 0.34 }, // Emerald 700
            textFormat: {
              bold: true,
              foregroundColor: { red: 1, green: 1, blue: 1 },
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields:
          'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // Apply vertical middle alignment to all data cells
    formatAndMergeRequests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 4,
          endRowIndex: Math.max(payload.values.length, 5),
          startColumnIndex: 0,
          endColumnIndex: 16,
        },
        cell: {
          userEnteredFormat: {
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(verticalAlignment)',
      },
    });

    // Highlight each Daily Total Row
    for (const totalRowIdx of payload.totalRowIndices) {
      formatAndMergeRequests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: totalRowIdx,
            endRowIndex: totalRowIdx + 1,
            startColumnIndex: 0,
            endColumnIndex: 16,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.93, green: 0.99, blue: 0.96 }, // Soft Emerald tint
              textFormat: { bold: true },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      });
    }

    // Add all cell merges (header merges + multi-row family vertical merges + daily total label merges)
    for (const m of payload.merges) {
      formatAndMergeRequests.push({
        mergeCells: {
          range: {
            sheetId,
            startRowIndex: m.startRowIndex,
            endRowIndex: m.endRowIndex,
            startColumnIndex: m.startColumnIndex,
            endColumnIndex: m.endColumnIndex,
          },
          mergeType: 'MERGE_ALL',
        },
      });
    }
  };

  const gabunganSheetId = existingSheetsMap.get(REKAP_GABUNGAN_TAB);
  if (gabunganSheetId != null) {
    addRekapTabFormatting(gabunganSheetId, combinedPayload);
  }

  // Build payload & merges for each Daily Tab
  for (const group of dailyGroups) {
    const dailyPayload = buildRekapSheetPayload(
      [group],
      settings,
      `REKAP HARIAN PENERIMAAN ZAKAT (${group.displayDate}) - ${settings.namaLembaga.toUpperCase()}`
    );
    valueDataPayload.push({
      range: `'${group.displayDate}'!A1`,
      values: dailyPayload.values,
    });
    const dailySheetId = existingSheetsMap.get(group.displayDate);
    if (dailySheetId != null) {
      addRekapTabFormatting(dailySheetId, dailyPayload);
    }
  }

  // 3. Clear target ranges first so stale rows from deleted transactions don't linger
  const rangesToClear = [
    `'${REKAP_GABUNGAN_TAB}'!A1:P3000`,
    `'${REKAP_AMIL_TAB}'!A1:P200`,
    ...dailyTabNames.map((t) => `'${t}'!A1:P600`),
  ];

  await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ranges: rangesToClear }),
  });

  // 4. Write all values in a single batchUpdate call
  const valRes = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueDataPayload,
      }),
    }
  );

  if (!valRes.ok) {
    const errData = await valRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || 'Gagal menulis data ke Google Spreadsheet.'
    );
  }

  // 5. Execute all merges and cell styling in a single batchUpdate call
  if (formatAndMergeRequests.length > 0) {
    await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: formatAndMergeRequests }),
    });
  }
}

/**
 * Pulls transactions from the 'Rekap Gabungan' sheet (or first sheet) of a shared Google Spreadsheet
 * so colleagues on other devices can load the exact same data.
 */
export async function pullFromGoogleSpreadsheet(
  accessToken: string,
  rawSpreadsheetId: string,
  defaultYear = '2026'
): Promise<{ title: string; transactions: ZakatTransaction[] }> {
  const spreadsheetId = extractSpreadsheetId(rawSpreadsheetId);
  if (!spreadsheetId) {
    throw new Error('ID Google Spreadsheet tidak valid.');
  }

  const metaRes = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) {
    throw new Error('Tidak dapat membaca Google Spreadsheet. Pastikan izin akses tersedia.');
  }
  const meta = await metaRes.json();
  const title: string = meta.properties?.title || 'Spreadsheet Zakat';

  // Prefer 'Rekap Gabungan' if present, else first sheet
  const sheetTitles: string[] = (meta.sheets || []).map(
    (s: { properties?: { title?: string } }) => s.properties?.title || ''
  );
  const targetTab = sheetTitles.includes('Rekap Gabungan')
    ? 'Rekap Gabungan'
    : sheetTitles[0];

  const valRes = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(`'${targetTab}'!A1:P3000`)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!valRes.ok) {
    throw new Error('Gagal membaca isi sel dari Google Spreadsheet.');
  }

  const valData = await valRes.json();
  const rows: string[][] = valData.values || [];

  const parseRp = (v: string | undefined) => {
    if (!v) return 0;
    const d = String(v).replace(/[^0-9]/g, '');
    return d ? parseInt(d, 10) : 0;
  };
  const parseKg = (v: string | undefined) => {
    if (!v) return 0;
    const d = String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    return d ? parseFloat(d) : 0;
  };

  const transactions: ZakatTransaction[] = [];
  let currentTanggal = `${defaultYear}-03-01`;
  let currentTx: ZakatTransaction | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Detect if offset by 1 column (like raw 2026 sheet) or standard column 0
    const col0 = (row[0] || '').trim();
    const col1 = (row[1] || '').trim();

    if (col0.toLowerCase() === 'total' || col1.toLowerCase() === 'total') {
      if (currentTx) {
        transactions.push(currentTx);
        currentTx = null;
      }
      continue;
    }

    if (col0 === 'No' || col1 === 'No' || col4IsHeader(row)) {
      continue;
    }

    if (col1 && /\d{1,2}-[A-Za-z]{3}-\d{2,4}/.test(col1)) {
      currentTanggal = parseSpreadsheetDate(col1, defaultYear);
    }

    const noVal = parseInt(col0, 10);
    const namaVal = (row[3] || '').trim();

    if (!isNaN(noVal) && noVal > 0 && namaVal) {
      if (currentTx) {
        transactions.push(currentTx);
      }
      const fitrahBeras = parseKg(row[4]);
      const fitrahUang = parseRp(row[5]);
      const fidyahBeras = parseKg(row[6]);
      const fidyahUang = parseRp(row[7]);
      const maalUang = parseRp(row[8]);
      const infaqBeras = parseKg(row[9]);
      const infaqUang = parseRp(row[10]);

      currentTx = {
        id: `sheet-tx-${noVal}-${i}`,
        nomor: noVal,
        tanggal: currentTanggal,
        jiwa: parseInt(row[2] || '1', 10) || 1,
        familyMembers: [namaVal],
        fitrah: { berasKg: fitrahBeras, uangRp: fitrahUang },
        fidyah: { berasKg: fidyahBeras, uangRp: fidyahUang },
        maal: { uangRp: maalUang },
        infaq: { berasKg: infaqBeras, uangRp: infaqUang },
        subTotal: {
          berasKg: Number((fitrahBeras + fidyahBeras + infaqBeras).toFixed(2)),
          uangRp: fitrahUang + fidyahUang + maalUang + infaqUang,
        },
        keterangan: (row[15] || 'Tunai').trim(),
        createdAt: Date.now() + i,
        synced: true,
      };
    } else if (!col0 && namaVal && currentTx) {
      currentTx.familyMembers.push(namaVal);
    }
  }

  if (currentTx) {
    transactions.push(currentTx);
  }

  return {
    title,
    transactions: transactions.map((tx) => ({
      ...tx,
      jiwa: Math.max(tx.jiwa, tx.familyMembers.length),
    })),
  };
}

function col4IsHeader(row: string[]): boolean {
  const c4 = (row[4] || '').toLowerCase();
  return c4.includes('fitrah') || c4.includes('beras');
}
