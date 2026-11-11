import React, { useState } from 'react';
import {
  FileCheck2,
  Printer,
  Download,
  HardDriveUpload,
  Eye,
  ExternalLink,
  CheckCircle2,
  FolderCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { DailyGroupSummary, ZakatSettings } from '../types/zakat';
import { formatBeras, formatRupiah } from '../utils/zakatHelpers';
import { buildRekapTotalPdf } from '../utils/pdfGenerator';
import { uploadRekapPdfToDrive } from '../services/googleDrive';
import { getAccessToken, googleSignIn } from '../services/auth';

interface TotalPeriodRecapViewProps {
  dailyGroups: DailyGroupSummary[];
  settings: ZakatSettings;
  onUpdateSettings: (partial: Partial<ZakatSettings>) => void;
}

/**
 * Halaman Rekap Keseluruhan:
 * 1. Rekapitulasi Total Masa Penerimaan Zakat
 * 2. REKAPITULASI PENYALURAN ZAKAT UANG & BERAS
 * 3. Mode Cetak (Print View), Simpan PDF ke Lokal Komputer, & Simpan PDF ke Folder UPZ/Rekapitulasi di Google Drive
 */
export const TotalPeriodRecapView: React.FC<TotalPeriodRecapViewProps> = ({
  dailyGroups,
  settings,
  onUpdateSettings,
}) => {
  const [isPrintViewMode, setIsPrintViewMode] = useState<boolean>(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState<boolean>(false);
  const [pdfFeedback, setPdfFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    fileLink?: string;
    folderLink?: string;
  } | null>(null);

  const totals = React.useMemo(() => {
    let jiwa = 0;
    let fitrahBeras = 0;
    let fitrahUang = 0;
    let fidyahBeras = 0;
    let fidyahUang = 0;
    let maalUang = 0;
    let infaqBeras = 0;
    let infaqUang = 0;
    let subTotalBeras = 0;
    let subTotalUang = 0;

    for (const g of dailyGroups) {
      jiwa += g.totalJiwa;
      fitrahBeras += g.fitrahBeras;
      fitrahUang += g.fitrahUang;
      fidyahBeras += g.fidyahBeras;
      fidyahUang += g.fidyahUang;
      maalUang += g.maalUang;
      infaqBeras += g.infaqBeras;
      infaqUang += g.infaqUang;
      subTotalBeras += g.subTotalBeras;
      subTotalUang += g.subTotalUang;
    }

    const dasarAmilUang = fitrahUang + fidyahUang + maalUang;
    const hakAmilUang = Math.round(dasarAmilUang * (settings.persentaseAmil / 100));
    const siapDisalurkanUang = subTotalUang - hakAmilUang;
    const saldoUang = siapDisalurkanUang - (settings.tersalurkanUangRp || 0);

    const dasarAmilBeras = Number((fitrahBeras + fidyahBeras + infaqBeras).toFixed(2));
    const hakAmilBeras = Number(
      (dasarAmilBeras * (settings.persentaseAmil / 100)).toFixed(2)
    );
    const siapDisalurkanBeras = Number((subTotalBeras - hakAmilBeras).toFixed(2));
    const saldoBeras = Number(
      (siapDisalurkanBeras - (settings.tersalurkanBerasKg || 0)).toFixed(2)
    );

    return {
      jiwa,
      fitrahBeras: Number(fitrahBeras.toFixed(2)),
      fitrahUang,
      fidyahBeras: Number(fidyahBeras.toFixed(2)),
      fidyahUang,
      maalUang,
      infaqBeras: Number(infaqBeras.toFixed(2)),
      infaqUang,
      subTotalBeras: Number(subTotalBeras.toFixed(2)),
      subTotalUang,
      hakAmilUang,
      siapDisalurkanUang,
      saldoUang,
      hakAmilBeras,
      siapDisalurkanBeras,
      saldoBeras,
    };
  }, [dailyGroups, settings]);

  const currentPrintDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Simpan PDF langsung ke Lokal Komputer pengguna
  const handleSavePdfLocal = () => {
    setPdfFeedback(null);
    try {
      const { doc, fileName } = buildRekapTotalPdf(dailyGroups, settings, totals);
      doc.save(fileName);
      setPdfFeedback({
        type: 'success',
        message: `File PDF "${fileName}" berhasil diunduh ke komputer lokal Anda.`,
      });
    } catch (err: any) {
      setPdfFeedback({
        type: 'error',
        message: err?.message || 'Gagal membuat file PDF lokal.',
      });
    }
  };

  // Simpan PDF langsung ke folder Rekapitulasi di dalam folder UPZ pada Google Drive pribadi
  const handleSavePdfToDrive = async () => {
    setPdfFeedback(null);
    setIsUploadingPdf(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken || null;
      }
      if (!token) {
        throw new Error(
          'Silakan Sign In ke akun Google Anda terlebih dahulu untuk menyimpan PDF ke Google Drive.'
        );
      }

      const { blob, fileName } = buildRekapTotalPdf(dailyGroups, settings, totals);
      const uploaded = await uploadRekapPdfToDrive(
        token,
        blob,
        fileName,
        settings.upzFolderName || 'UPZ'
      );

      onUpdateSettings({
        upzFolderId: uploaded.upzFolderId,
        rekapitulasiFolderId: uploaded.rekapitulasiFolderId,
      });

      setPdfFeedback({
        type: 'success',
        message: `Berhasil menyimpan "${uploaded.fileName}" ke folder /${
          settings.upzFolderName || 'UPZ'
        }/Rekapitulasi di Google Drive pribadi Anda.`,
        fileLink: uploaded.webViewLink,
        folderLink: uploaded.rekapitulasiFolderLink,
      });
    } catch (err: any) {
      setPdfFeedback({
        type: 'error',
        message:
          err?.message ||
          'Gagal mengunggah PDF ke folder UPZ/Rekapitulasi di Google Drive.',
      });
    } finally {
      setIsUploadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control & Action Toolbar (Hidden when printing) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 no-print">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-700" />
            Rekap / Total Keseluruhan Penerimaan & Penyaluran Zakat
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cetak laporan resmi (Print View), unduh sebagai PDF ke komputer lokal, atau simpan otomatis ke folder{' '}
            <strong>/{settings.upzFolderName || 'UPZ'}/Rekapitulasi</strong> di Google Drive pribadi Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Print View Mode */}
          <button
            type="button"
            onClick={() => setIsPrintViewMode((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              isPrintViewMode
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {isPrintViewMode ? 'Keluar Mode Print View' : 'Tampilan Cetak (Print View)'}
          </button>

          {/* Cetak via Dialog Printer */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Halaman
          </button>

          {/* Simpan PDF ke Lokal Komputer */}
          <button
            type="button"
            onClick={handleSavePdfLocal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Simpan PDF (Lokal Komputer)
          </button>

          {/* Simpan PDF ke Folder UPZ/Rekapitulasi di Google Drive */}
          <button
            type="button"
            disabled={isUploadingPdf}
            onClick={handleSavePdfToDrive}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {isUploadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <HardDriveUpload className="w-3.5 h-3.5" />
            )}
            {isUploadingPdf
              ? 'Menyimpan ke Google Drive...'
              : `Simpan PDF ke Drive (/${settings.upzFolderName || 'UPZ'}/Rekapitulasi)`}
          </button>
        </div>
      </div>

      {/* Feedback Banner after PDF Download or Drive Upload */}
      {pdfFeedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print ${
            pdfFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2.5">
            {pdfFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <span className="font-medium">{pdfFeedback.message}</span>
          </div>

          {(pdfFeedback.fileLink || pdfFeedback.folderLink) && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {pdfFeedback.fileLink && (
                <a
                  href={pdfFeedback.fileLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-semibold hover:bg-emerald-100 transition-colors"
                >
                  Buka PDF di Drive
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {pdfFeedback.folderLink && (
                <a
                  href={pdfFeedback.folderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors"
                >
                  <FolderCheck className="w-3.5 h-3.5" />
                  Buka Folder /{settings.upzFolderName || 'UPZ'}/Rekapitulasi
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Printable Document Container */}
      <div
        className={`print-container space-y-6 ${
          isPrintViewMode
            ? 'bg-white border-2 border-slate-300 shadow-lg rounded-xl p-8 max-w-[1200px] mx-auto'
            : ''
        }`}
      >
        {/* Kop Laporan Resmi (Ditampilkan saat Print View aktif atau saat Dicetak ke Kertas/PDF) */}
        <div
          className={`${
            isPrintViewMode ? 'block' : 'hidden print-only'
          } border-b-2 border-emerald-800 pb-4 mb-6 text-center`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">
            PANITIA PENERIMAAN DAN PENYALURAN ZAKAT, INFAQ & SEDEKAH
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 uppercase mt-0.5">
            UNIT PENGUMPUL ZAKAT (UPZ) {settings.namaLembaga}
          </h2>
          <p className="text-sm font-bold text-slate-700 mt-0.5">
            LAPORAN REKAPITULASI TOTAL MASA PENERIMAAN & PENYALURAN ZAKAT RAMADHAN{' '}
            {settings.tahunHijriah.toUpperCase()} / {settings.tahunMasehi}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono-num">
            Ketetapan Fitrah: {formatRupiah(settings.fitrahUangPerJiwaRp, true)} /{' '}
            {settings.fitrahBerasPerJiwaKg} Kg per Jiwa · Ketetapan Fidyah:{' '}
            {formatRupiah(settings.fidyahUangPerHariRp, true)} /{' '}
            {settings.fidyahBerasPerHariKg} Kg per Hari · Tanggal Cetak: {currentPrintDate}
          </p>
        </div>

        {/* Section 1: Rekapitulasi Total Masa Penerimaan Zakat */}
        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
          <div className="bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold tracking-wide text-center">
            I. REKAPITULASI TOTAL MASA PENERIMAAN ZAKAT — RAMADHAN{' '}
            {settings.tahunHijriah.toUpperCase()} ({settings.namaLembaga.toUpperCase()})
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-700 text-white font-semibold text-center">
                  <th rowSpan={2} className="border border-emerald-800 px-2.5 py-2 w-12">
                    NO.
                  </th>
                  <th rowSpan={2} className="border border-emerald-800 px-3 py-2">
                    Tanggal
                  </th>
                  <th rowSpan={2} className="border border-emerald-800 px-2.5 py-2">
                    Jiwa
                  </th>
                  <th colSpan={2} className="border border-emerald-800 px-2 py-1.5">
                    Fitrah
                  </th>
                  <th colSpan={2} className="border border-emerald-800 px-2 py-1.5">
                    Fidyah
                  </th>
                  <th className="border border-emerald-800 px-2 py-1.5">Maal</th>
                  <th colSpan={2} className="border border-emerald-800 px-2 py-1.5">
                    Infaq
                  </th>
                  <th
                    colSpan={2}
                    className="border border-emerald-800 px-2 py-1.5 bg-emerald-800"
                  >
                    Sub Total Harian
                  </th>
                  <th
                    colSpan={2}
                    className="border border-emerald-800 px-2 py-1.5 bg-slate-900"
                  >
                    Grand Total Kumulatif
                  </th>
                </tr>
                <tr className="bg-emerald-600 text-white font-semibold text-center text-[11px]">
                  <th className="border border-emerald-700 px-2 py-1">Beras</th>
                  <th className="border border-emerald-700 px-2.5 py-1">Uang</th>
                  <th className="border border-emerald-700 px-2 py-1">Beras</th>
                  <th className="border border-emerald-700 px-2.5 py-1">Uang</th>
                  <th className="border border-emerald-700 px-2.5 py-1">Uang</th>
                  <th className="border border-emerald-700 px-2 py-1">Beras</th>
                  <th className="border border-emerald-700 px-2.5 py-1">Uang</th>
                  <th className="border border-emerald-700 px-2 py-1 bg-emerald-800">
                    Beras
                  </th>
                  <th className="border border-emerald-700 px-2.5 py-1 bg-emerald-800">
                    Uang
                  </th>
                  <th className="border border-emerald-700 px-2 py-1 bg-slate-800">
                    Beras
                  </th>
                  <th className="border border-emerald-700 px-2.5 py-1 bg-slate-800">
                    Uang
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailyGroups.map((g, idx) => (
                  <tr key={g.tanggal} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono-num">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 px-3 py-1.5 text-center font-mono-num font-semibold text-slate-800 whitespace-nowrap">
                      {g.displayDate}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-center font-mono-num font-bold text-slate-900">
                      {g.totalJiwa}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono-num whitespace-nowrap">
                      {formatBeras(g.fitrahBeras)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(g.fitrahUang)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono-num whitespace-nowrap">
                      {formatBeras(g.fidyahBeras)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(g.fidyahUang)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(g.maalUang)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono-num whitespace-nowrap">
                      {formatBeras(g.infaqBeras)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(g.infaqUang)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono-num font-semibold bg-emerald-50/40 whitespace-nowrap">
                      {formatBeras(g.subTotalBeras)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num font-semibold text-emerald-900 bg-emerald-50/40 whitespace-nowrap">
                      {formatRupiah(g.subTotalUang)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono-num font-semibold bg-slate-50 whitespace-nowrap">
                      {formatBeras(g.cumulativeGrandTotalBeras)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num font-semibold text-slate-900 bg-slate-50 whitespace-nowrap">
                      {formatRupiah(g.cumulativeGrandTotalUang)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-emerald-900 text-white font-bold">
                  <td
                    colSpan={2}
                    className="border border-emerald-950 px-3 py-2.5 text-center"
                  >
                    TOTAL KESELURUHAN
                  </td>
                  <td className="border border-emerald-950 px-2.5 py-2.5 text-center font-mono-num">
                    {totals.jiwa}
                  </td>
                  <td className="border border-emerald-950 px-2 py-2.5 text-right font-mono-num whitespace-nowrap">
                    {formatBeras(totals.fitrahBeras)}
                  </td>
                  <td className="border border-emerald-950 px-2.5 py-2.5 text-right font-mono-num whitespace-nowrap">
                    {formatRupiah(totals.fitrahUang)}
                  </td>
                  <td className="border border-emerald-950 px-2 py-2.5 text-right font-mono-num whitespace-nowrap">
                    {formatBeras(totals.fidyahBeras)}
                  </td>
                  <td className="border border-emerald-950 px-2.5 py-2.5 text-right font-mono-num whitespace-nowrap">
                    {formatRupiah(totals.fidyahUang)}
                  </td>
                  <td className="border border-emerald-950 px-2.5 py-2.5 text-right font-mono-num whitespace-nowrap">
                    {formatRupiah(totals.maalUang)}
                  </td>
                  <td className="border border-emerald-950 px-2 py-2.5 text-right font-mono-num whitespace-nowrap">
                    {formatBeras(totals.infaqBeras)}
                  </td>
                  <td className="border border-emerald-950 px-2.5 py-2.5 text-right font-mono-num whitespace-nowrap">
                    {formatRupiah(totals.infaqUang)}
                  </td>
                  <td className="border border-emerald-950 px-2 py-2.5 text-right font-mono-num whitespace-nowrap">
                    {formatBeras(totals.subTotalBeras)}
                  </td>
                  <td className="border border-emerald-950 px-2.5 py-2.5 text-right font-mono-num text-amber-300 whitespace-nowrap">
                    {formatRupiah(totals.subTotalUang)}
                  </td>
                  <td className="border border-emerald-950 px-2 py-2.5 text-right font-mono-num whitespace-nowrap">
                    {formatBeras(totals.subTotalBeras)}
                  </td>
                  <td className="border border-emerald-950 px-2.5 py-2.5 text-right font-mono-num text-amber-300 whitespace-nowrap">
                    {formatRupiah(totals.subTotalUang)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: REKAPITULASI PENYALURAN ZAKAT UANG & BERAS */}
        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
          <div className="bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
            <span>II. REKAPITULASI PENYALURAN ZAKAT UANG & BERAS</span>
            <span className="font-normal text-emerald-100 no-print">
              Isi kolom Jumlah yang Tersalurkan untuk menghitung Saldo akhir penyaluran zakat
            </span>
          </div>

          <div className="p-5 space-y-6">
            {/* Penyaluran Zakat Uang */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                A. Rekapitulasi Penyaluran Zakat Uang (Rp)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-semibold">
                      <th className="border border-slate-300 px-3 py-2 text-left">
                        URAIAN
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right">
                        JUMLAH TOTAL UANG (Rp.)
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right">
                        PERHITUNGAN AMIL ({settings.persentaseAmil}%)
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right">
                        JUMLAH YG AKAN DISALURKAN
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right">
                        JUMLAH YG TERSALURKAN
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right">
                        SALDO AKHIR
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 px-3 py-2.5 font-bold text-slate-900">
                        Penerimaan Uang
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono-num font-bold">
                        {formatRupiah(totals.subTotalUang, true)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono-num text-slate-700">
                        {formatRupiah(totals.hakAmilUang, true)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono-num font-bold text-emerald-800 bg-emerald-50/40">
                        {formatRupiah(totals.siapDisalurkanUang, true)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right">
                        {isPrintViewMode ? (
                          <span className="font-mono-num font-bold">
                            {formatRupiah(settings.tersalurkanUangRp || 0, true)}
                          </span>
                        ) : (
                          <>
                            <input
                              type="number"
                              step="10000"
                              min="0"
                              value={settings.tersalurkanUangRp || ''}
                              onChange={(e) =>
                                onUpdateSettings({
                                  tersalurkanUangRp: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              placeholder="Rp 0"
                              className="w-40 px-2.5 py-1 text-right font-mono-num border border-slate-300 rounded bg-white no-print"
                            />
                            <span className="hidden print-only font-mono-num font-bold">
                              {formatRupiah(settings.tersalurkanUangRp || 0, true)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono-num font-bold text-slate-900 bg-slate-50">
                        {formatRupiah(totals.saldoUang, true)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Penyaluran Zakat Beras */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                B. Rekapitulasi Penyaluran Zakat Beras (Kg)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-semibold">
                      <th className="border border-slate-300 px-3 py-2 text-left">
                        URAIAN
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right">
                        JUMLAH TOTAL BERAS (Kg.)
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right">
                        PERHITUNGAN AMIL ({settings.persentaseAmil}%)
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right">
                        JUMLAH YG AKAN DISALURKAN
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right">
                        JUMLAH YG TERSALURKAN
                      </th>
                      <th className="border border-slate-300 px-3 py-2 text-right">
                        SALDO AKHIR
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 px-3 py-2.5 font-bold text-slate-900">
                        Penerimaan Beras
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono-num font-bold">
                        {formatBeras(totals.subTotalBeras)} Kg
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono-num text-slate-700">
                        {formatBeras(totals.hakAmilBeras)} Kg
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono-num font-bold text-emerald-800 bg-emerald-50/40">
                        {formatBeras(totals.siapDisalurkanBeras)} Kg
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right">
                        {isPrintViewMode ? (
                          <span className="font-mono-num font-bold">
                            {formatBeras(settings.tersalurkanBerasKg || 0)} Kg
                          </span>
                        ) : (
                          <>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={settings.tersalurkanBerasKg || ''}
                              onChange={(e) =>
                                onUpdateSettings({
                                  tersalurkanBerasKg: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0,00 Kg"
                              className="w-40 px-2.5 py-1 text-right font-mono-num border border-slate-300 rounded bg-white no-print"
                            />
                            <span className="hidden print-only font-mono-num font-bold">
                              {formatBeras(settings.tersalurkanBerasKg || 0)} Kg
                            </span>
                          </>
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono-num font-bold text-slate-900 bg-slate-50">
                        {formatBeras(totals.saldoBeras)} Kg
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Pengesahan & Tanda Tangan Pengurus UPZ (Muncul di Mode Print View & Saat Cetak) */}
        <div
          className={`${
            isPrintViewMode ? 'grid' : 'hidden print-only'
          } grid-cols-3 gap-6 pt-8 text-center text-xs text-slate-800`}
        >
          <div>
            <p className="text-slate-600">Mengetahui,</p>
            <p className="font-bold mt-0.5">Ketua {settings.namaLembaga}</p>
            <div className="h-16" />
            <p className="font-semibold underline underline-offset-4">
              ( ............................................ )
            </p>
          </div>
          <div>
            <p className="text-slate-600">Diperiksa Oleh,</p>
            <p className="font-bold mt-0.5">Sekretaris Panitia Zakat</p>
            <div className="h-16" />
            <p className="font-semibold underline underline-offset-4">
              ( ............................................ )
            </p>
          </div>
          <div>
            <p className="text-slate-600">Dicetak pada {currentPrintDate}</p>
            <p className="font-bold mt-0.5">Bendahara Penerimaan Zakat</p>
            <div className="h-16" />
            <p className="font-semibold underline underline-offset-4">
              ( ............................................ )
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
