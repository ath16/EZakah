import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyGroupSummary, ZakatSettings } from '../types/zakat';
import { formatBeras, formatRupiah } from './zakatHelpers';

export interface RekapTotalCalculated {
  jiwa: number;
  fitrahBeras: number;
  fitrahUang: number;
  fidyahBeras: number;
  fidyahUang: number;
  maalUang: number;
  infaqBeras: number;
  infaqUang: number;
  subTotalBeras: number;
  subTotalUang: number;
  hakAmilUang: number;
  siapDisalurkanUang: number;
  saldoUang: number;
  hakAmilBeras: number;
  siapDisalurkanBeras: number;
  saldoBeras: number;
}

export function buildRekapTotalPdf(
  dailyGroups: DailyGroupSummary[],
  settings: ZakatSettings,
  totals: RekapTotalCalculated
): { doc: jsPDF; fileName: string; blob: Blob } {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Kop Laporan Resmi UPZ
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(6, 78, 59); // Emerald 900
  doc.text(
    `UNIT PENGUMPUL ZAKAT (UPZ) ${settings.namaLembaga.toUpperCase()}`,
    pageWidth / 2,
    13,
    { align: 'center' }
  );

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `LAPORAN REKAPITULASI TOTAL PENERIMAAN & PENYALURAN ZAKAT RAMADHAN ${settings.tahunHijriah.toUpperCase()} / ${settings.tahunMasehi}`,
    pageWidth / 2,
    19,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Ketetapan Fitrah: ${formatRupiah(settings.fitrahUangPerJiwaRp, true)} / ${settings.fitrahBerasPerJiwaKg} Kg per Jiwa  |  Ketetapan Fidyah: ${formatRupiah(settings.fidyahUangPerHariRp, true)} / ${settings.fidyahBerasPerHariKg} Kg per Hari  |  Dicetak: ${printDate}`,
    pageWidth / 2,
    24,
    { align: 'center' }
  );

  // Garis Pembatas Kop
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.5);
  doc.line(14, 26.5, pageWidth - 14, 26.5);

  // Tabel 1: Rekapitulasi Total Masa Penerimaan Zakat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('I. REKAPITULASI TOTAL MASA PENERIMAAN ZAKAT PER HARI', 14, 32);

  const tableBody: (string | number)[][] = dailyGroups.map((g, idx) => [
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

  // Baris Total Keseluruhan
  tableBody.push([
    'TOTAL',
    `${dailyGroups.length} Hari`,
    totals.jiwa,
    formatBeras(totals.fitrahBeras),
    formatRupiah(totals.fitrahUang),
    formatBeras(totals.fidyahBeras),
    formatRupiah(totals.fidyahUang),
    formatRupiah(totals.maalUang),
    formatBeras(totals.infaqBeras),
    formatRupiah(totals.infaqUang),
    formatBeras(totals.subTotalBeras),
    formatRupiah(totals.subTotalUang, true),
    formatBeras(totals.subTotalBeras),
    formatRupiah(totals.subTotalUang, true),
  ]);

  autoTable(doc, {
    startY: 34.5,
    margin: { left: 14, right: 14 },
    head: [
      [
        { content: 'NO.', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'TANGGAL', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'JIWA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'ZAKAT FITRAH', colSpan: 2, styles: { halign: 'center' } },
        { content: 'FIDYAH', colSpan: 2, styles: { halign: 'center' } },
        { content: 'MAAL', styles: { halign: 'center' } },
        { content: 'INFAQ / SEDEKAH', colSpan: 2, styles: { halign: 'center' } },
        { content: 'SUB TOTAL HARIAN', colSpan: 2, styles: { halign: 'center' } },
        { content: 'GRAND TOTAL KUMULATIF', colSpan: 2, styles: { halign: 'center' } },
      ],
      [
        { content: 'Beras (Kg)', styles: { halign: 'right' } },
        { content: 'Uang (Rp)', styles: { halign: 'right' } },
        { content: 'Beras (Kg)', styles: { halign: 'right' } },
        { content: 'Uang (Rp)', styles: { halign: 'right' } },
        { content: 'Uang (Rp)', styles: { halign: 'right' } },
        { content: 'Beras (Kg)', styles: { halign: 'right' } },
        { content: 'Uang (Rp)', styles: { halign: 'right' } },
        { content: 'Beras (Kg)', styles: { halign: 'right' } },
        { content: 'Uang (Rp)', styles: { halign: 'right' } },
        { content: 'Beras (Kg)', styles: { halign: 'right' } },
        { content: 'Uang (Rp)', styles: { halign: 'right' } },
      ],
    ],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.6,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [6, 95, 70],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 11 },
      1: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 13, fontStyle: 'bold' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right', fontStyle: 'bold' },
      11: { halign: 'right', fontStyle: 'bold' },
      12: { halign: 'right', fontStyle: 'bold' },
      13: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === tableBody.length - 1) {
        data.cell.styles.fillColor = [6, 78, 59];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Ambil posisi Y setelah tabel pertama
  const afterTable1Y = (doc as any).lastAutoTable?.finalY || 120;
  let currentY = afterTable1Y + 7;

  if (currentY > 155) {
    doc.addPage();
    currentY = 16;
  }

  // Tabel 2: Rekapitulasi Penyaluran Zakat Uang & Beras
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('II. REKAPITULASI PENYALURAN ZAKAT UANG & BERAS', 14, currentY);

  autoTable(doc, {
    startY: currentY + 2.5,
    margin: { left: 14, right: 14 },
    head: [
      [
        'KATEGORI PENERIMAAN',
        'JUMLAH TOTAL PENERIMAAN',
        `HAK AMIL (${settings.persentaseAmil}%)`,
        'SIAP DISALURKAN KE MUSTAHIK',
        'JUMLAH TERSALURKAN',
        'SALDO AKHIR',
      ],
    ],
    body: [
      [
        'A. Zakat, Fidyah, Maal & Infaq Uang (Rp)',
        formatRupiah(totals.subTotalUang, true),
        formatRupiah(totals.hakAmilUang, true),
        formatRupiah(totals.siapDisalurkanUang, true),
        formatRupiah(settings.tersalurkanUangRp || 0, true),
        formatRupiah(totals.saldoUang, true),
      ],
      [
        'B. Zakat, Fidyah & Infaq Beras (Kg)',
        `${formatBeras(totals.subTotalBeras)} Kg`,
        `${formatBeras(totals.hakAmilBeras)} Kg`,
        `${formatBeras(totals.siapDisalurkanBeras)} Kg`,
        `${formatBeras(settings.tersalurkanBerasKg || 0)} Kg`,
        `${formatBeras(totals.saldoBeras)} Kg`,
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 65 },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // Tanda tangan Pengurus UPZ
  const afterTable2Y = (doc as any).lastAutoTable?.finalY || currentY + 30;
  let signY = afterTable2Y + 10;
  if (signY > 175) {
    doc.addPage();
    signY = 25;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const col1X = 45;
  const col2X = pageWidth / 2;
  const col3X = pageWidth - 45;

  doc.text('Mengetahui,', col1X, signY, { align: 'center' });
  doc.text('Ketua UPZ / DKM', col1X, signY + 4.5, { align: 'center' });
  doc.text('( _______________________ )', col1X, signY + 21, { align: 'center' });

  doc.text('Diperiksa Oleh,', col2X, signY, { align: 'center' });
  doc.text('Sekretaris Panitia Zakat', col2X, signY + 4.5, { align: 'center' });
  doc.text('( _______________________ )', col2X, signY + 21, { align: 'center' });

  doc.text(`Dicetak tanggal ${printDate}`, col3X, signY, { align: 'center' });
  doc.text('Bendahara Penerimaan Zakat', col3X, signY + 4.5, { align: 'center' });
  doc.text('( _______________________ )', col3X, signY + 21, { align: 'center' });

  const cleanLembaga = settings.namaLembaga.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanHijriah = settings.tahunHijriah.replace(/\s+/g, '');
  const fileName = `Rekapitulasi_Total_${cleanLembaga}_${cleanHijriah}_${settings.tahunMasehi}.pdf`;
  const blob = doc.output('blob');

  return { doc, fileName, blob };
}
