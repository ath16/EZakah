import React, { useState } from 'react';
import {
  Search,
  Printer,
  Edit3,
  Trash2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { DailyGroupSummary, ZakatSettings, ZakatTransaction } from '../types/zakat';
import { formatBeras, formatRupiah } from '../utils/zakatHelpers';

interface SpreadsheetRekapViewProps {
  initialMode?: 'harian' | 'gabungan';
  dailyGroups: DailyGroupSummary[];
  settings: ZakatSettings;
  onEditTransaction: (tx: ZakatTransaction) => void;
  onDeleteTransaction: (tx: ZakatTransaction) => void;
  onPrintReceipt: (tx: ZakatTransaction) => void;
  onSwitchToInput: (defaultDate?: string) => void;
}

export const SpreadsheetRekapView: React.FC<SpreadsheetRekapViewProps> = ({
  initialMode = 'harian',
  dailyGroups,
  settings,
  onEditTransaction,
  onDeleteTransaction,
  onPrintReceipt,
  onSwitchToInput,
}) => {
  const [viewMode, setViewMode] = useState<'harian' | 'gabungan'>(initialMode);
  const [selectedDay, setSelectedDay] = useState<string>(
    dailyGroups[dailyGroups.length - 1]?.tanggal || ''
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeDayTanggal = dailyGroups.some((g) => g.tanggal === selectedDay)
    ? selectedDay
    : dailyGroups[dailyGroups.length - 1]?.tanggal || '';

  const groupsToDisplay = React.useMemo(() => {
    const base =
      viewMode === 'harian'
        ? dailyGroups.filter((g) => g.tanggal === activeDayTanggal)
        : dailyGroups;

    if (!searchQuery.trim()) return base;

    const q = searchQuery.toLowerCase();
    return base
      .map((group) => ({
        ...group,
        transactions: group.transactions.filter(
          (tx) =>
            tx.familyMembers.some((m) => m.toLowerCase().includes(q)) ||
            String(tx.nomor) === q ||
            (tx.keterangan || '').toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.transactions.length > 0);
  }, [viewMode, dailyGroups, activeDayTanggal, searchQuery]);

  if (dailyGroups.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
        <FileSpreadsheet className="w-10 h-10 text-emerald-700 mx-auto" />
        <div className="max-w-md mx-auto">
          <h3 className="text-base font-bold text-slate-900">
            Belum Ada Data Penerimaan Zakat Harian
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Mulai catat penerimaan zakat pertama atau muat data arsip Ramadhan untuk melihat sheet per hari dengan merge sel otomatis.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSwitchToInput()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Catat Transaksi Pertama
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & View Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {viewMode === 'harian' ? (
              <>
                <Calendar className="w-4 h-4 text-emerald-700" />
                Sheet Per Hari (Tab Tanggal Harian di Google Spreadsheet)
              </>
            ) : (
              <>
                <Layers className="w-4 h-4 text-emerald-700" />
                Sheet Rekap Harian Gabungan (1 Sheet Semua Hari · Jeda 2 Baris)
              </>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {viewMode === 'harian'
              ? 'Pilih tab tanggal di bawah untuk memeriksa isi sheet per hari beserta merge sel keluarga.'
              : 'Menampilkan seluruh hari dalam 1 sheet dengan pemisah 2 baris jeda antar hari.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Switch between Sheet Per Hari vs Sheet Gabungan 1 Sheet */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('harian')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'harian'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sheet Per Hari ({dailyGroups.length} Tab)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gabungan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'gabungan'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 Sheet Gabungan (Jeda 2 Baris)
            </button>
          </div>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama muzakki..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {viewMode === 'harian' && activeDayTanggal && (
            <button
              type="button"
              onClick={() => onSwitchToInput(activeDayTanggal)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Input di Tanggal Ini
            </button>
          )}
        </div>
      </div>

      {/* Sheet Tab Bar when in 'harian' mode */}
      {viewMode === 'harian' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {dailyGroups.map((g) => {
            const isSelected = g.tanggal === activeDayTanggal;
            return (
              <button
                key={g.tanggal}
                type="button"
                onClick={() => setSelectedDay(g.tanggal)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-t border-x transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="font-mono-num">{g.displayDate}</span>
                <span
                  className={`text-[11px] font-mono-num ${
                    isSelected ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  ({g.totalJiwa} jiwa)
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Spreadsheet Grid Container */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 text-center font-bold text-xs tracking-wide text-slate-800">
          DATA PENERIMAAN ZAKAT RAMADHAN {settings.tahunHijriah.toUpperCase()} — {settings.namaLembaga.toUpperCase()}
          {viewMode === 'harian' && activeDayTanggal
            ? ` (SHEET HARIAN: ${
                dailyGroups.find((d) => d.tanggal === activeDayTanggal)?.displayDate || ''
              })`
            : ' (SHEET REKAP GABUNGAN)'}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-800 text-white font-semibold text-center">
                <th rowSpan={2} className="border border-emerald-900 px-2.5 py-2 w-12">
                  No
                </th>
                <th rowSpan={2} className="border border-emerald-900 px-3 py-2 w-24">
                  Tanggal
                </th>
                <th rowSpan={2} className="border border-emerald-900 px-2 py-2 w-14">
                  Jiwa
                </th>
                <th rowSpan={2} className="border border-emerald-900 px-3.5 py-2 text-left min-w-[190px]">
                  Nama Muzakki & Keluarga
                </th>
                <th colSpan={2} className="border border-emerald-900 px-2 py-1.5">
                  Fitrah
                </th>
                <th colSpan={2} className="border border-emerald-900 px-2 py-1.5">
                  Fidyah
                </th>
                <th className="border border-emerald-900 px-2 py-1.5">
                  Maal
                </th>
                <th colSpan={2} className="border border-emerald-900 px-2 py-1.5">
                  Infaq
                </th>
                <th colSpan={2} className="border border-emerald-900 px-2 py-1.5 bg-emerald-900">
                  Sub Total
                </th>
                <th colSpan={2} className="border border-emerald-900 px-2 py-1.5 bg-slate-900">
                  Grand Total
                </th>
                <th rowSpan={2} className="border border-emerald-900 px-2.5 py-2 w-24">
                  Ket. / Bukti
                </th>
                <th rowSpan={2} className="border border-emerald-900 px-2.5 py-2 w-24 no-print">
                  Aksi
                </th>
              </tr>
              <tr className="bg-emerald-700 text-white font-semibold text-center text-[11px]">
                <th className="border border-emerald-800 px-2 py-1">Beras</th>
                <th className="border border-emerald-800 px-2.5 py-1">Uang</th>
                <th className="border border-emerald-800 px-2 py-1">Beras</th>
                <th className="border border-emerald-800 px-2.5 py-1">Uang</th>
                <th className="border border-emerald-800 px-2.5 py-1">Uang</th>
                <th className="border border-emerald-800 px-2 py-1">Beras</th>
                <th className="border border-emerald-800 px-2.5 py-1">Uang</th>
                <th className="border border-emerald-800 px-2 py-1 bg-emerald-800">Beras</th>
                <th className="border border-emerald-800 px-2.5 py-1 bg-emerald-800">Uang</th>
                <th className="border border-emerald-800 px-2 py-1 bg-slate-800">Beras</th>
                <th className="border border-emerald-800 px-2.5 py-1 bg-slate-800">Uang</th>
              </tr>
            </thead>
            <tbody>
              {groupsToDisplay.map((group, groupIdx) => (
                <React.Fragment key={group.tanggal}>
                  {group.transactions.map((tx, txIdxInDay) => {
                    const members =
                      tx.familyMembers.length > 0 ? tx.familyMembers : ['Hamba Allah'];
                    const span = members.length;

                    return members.map((memberName, memberIdx) => (
                      <tr
                        key={`${tx.id}-${memberIdx}`}
                        className="hover:bg-emerald-50/30 transition-colors"
                      >
                        {memberIdx === 0 && (
                          <>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2 py-1.5 text-center font-mono-num font-semibold text-slate-700 align-middle bg-white"
                            >
                              {tx.nomor}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2.5 py-1.5 text-center font-mono-num font-medium text-slate-800 align-middle whitespace-nowrap bg-white"
                            >
                              {txIdxInDay === 0 ? group.displayDate : ''}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2 py-1.5 text-center font-mono-num font-bold text-slate-900 align-middle bg-white"
                            >
                              {tx.jiwa}
                            </td>
                          </>
                        )}

                        <td className="border border-slate-300 px-3 py-1.5 text-slate-900 font-medium">
                          {memberName}
                        </td>

                        {memberIdx === 0 && (
                          <>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2 py-1.5 text-right font-mono-num text-slate-700 align-middle whitespace-nowrap bg-white"
                            >
                              {tx.fitrah.berasKg > 0 ? formatBeras(tx.fitrah.berasKg) : ''}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num text-slate-800 align-middle whitespace-nowrap bg-white"
                            >
                              {tx.fitrah.uangRp > 0 ? formatRupiah(tx.fitrah.uangRp) : ''}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2 py-1.5 text-right font-mono-num text-slate-700 align-middle whitespace-nowrap bg-white"
                            >
                              {tx.fidyah.berasKg > 0 ? formatBeras(tx.fidyah.berasKg) : ''}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num text-slate-800 align-middle whitespace-nowrap bg-white"
                            >
                              {tx.fidyah.uangRp > 0 ? formatRupiah(tx.fidyah.uangRp) : ''}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num text-slate-800 align-middle whitespace-nowrap bg-white"
                            >
                              {tx.maal.uangRp > 0 ? formatRupiah(tx.maal.uangRp) : ''}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2 py-1.5 text-right font-mono-num text-slate-700 align-middle whitespace-nowrap bg-white"
                            >
                              {tx.infaq.berasKg > 0 ? formatBeras(tx.infaq.berasKg) : ''}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num text-slate-800 align-middle whitespace-nowrap bg-white"
                            >
                              {tx.infaq.uangRp > 0 ? formatRupiah(tx.infaq.uangRp) : ''}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2 py-1.5 text-right font-mono-num font-semibold text-slate-900 align-middle whitespace-nowrap bg-emerald-50/30"
                            >
                              {formatBeras(tx.subTotal.berasKg)}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num font-semibold text-emerald-900 align-middle whitespace-nowrap bg-emerald-50/30"
                            >
                              {formatRupiah(tx.subTotal.uangRp, true)}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2 py-1.5 text-right font-mono-num text-slate-400 align-middle bg-slate-50/40"
                            />
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2.5 py-1.5 text-right font-mono-num text-slate-400 align-middle bg-slate-50/40"
                            />
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2 py-1.5 text-center text-slate-600 align-middle whitespace-nowrap bg-white"
                            >
                              <div>{tx.keterangan || 'Tunai'}</div>
                              {tx.buktiDriveUrl && (
                                <a
                                  href={tx.buktiDriveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 hover:underline mt-0.5"
                                >
                                  Bukti Drive
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </td>
                            <td
                              rowSpan={span}
                              className="border border-slate-300 px-2 py-1.5 text-center align-middle whitespace-nowrap bg-white no-print"
                            >
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onPrintReceipt(tx)}
                                  title="Cetak Bukti Kuitansi Zakat"
                                  className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditTransaction(tx)}
                                  title="Edit Transaksi"
                                  className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteTransaction(tx)}
                                  title="Hapus Transaksi"
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ));
                  })}

                  {/* Daily Total Row at the end of each day */}
                  <tr className="bg-emerald-50/90 font-bold text-slate-900 border-t-2 border-emerald-700">
                    <td className="border border-slate-300 px-2 py-2 text-center font-mono-num text-emerald-900">
                      {group.totalJiwa}
                    </td>
                    <td
                      colSpan={3}
                      className="border border-slate-300 px-3 py-2 text-left font-bold text-emerald-950"
                    >
                      Total ({group.displayDate})
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-mono-num whitespace-nowrap">
                      {formatBeras(group.fitrahBeras)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(group.fitrahUang, true)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-mono-num whitespace-nowrap">
                      {formatBeras(group.fidyahBeras)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(group.fidyahUang, true)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(group.maalUang, true)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-mono-num whitespace-nowrap">
                      {formatBeras(group.infaqBeras)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(group.infaqUang, true)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-mono-num bg-emerald-100/80 whitespace-nowrap">
                      {formatBeras(group.subTotalBeras)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-mono-num bg-emerald-100/80 whitespace-nowrap">
                      {formatRupiah(group.subTotalUang, true)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-mono-num bg-slate-900 text-white whitespace-nowrap">
                      {formatBeras(group.cumulativeGrandTotalBeras)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-mono-num bg-slate-900 text-amber-300 whitespace-nowrap">
                      {formatRupiah(group.cumulativeGrandTotalUang, true)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2" />
                    <td className="border border-slate-300 px-2 py-2 no-print" />
                  </tr>

                  {/* 2 Empty Separator Rows (2 Baris Jeda Antar Hari) in Combined Sheet */}
                  {viewMode === 'gabungan' && groupIdx < groupsToDisplay.length - 1 && (
                    <>
                      <tr className="h-5 bg-slate-100/70">
                        <td
                          colSpan={17}
                          className="border border-slate-200 px-3 text-[10px] text-slate-400 font-mono-num"
                        >
                          — Baris Jeda 1 (Pemisah Harian) —
                        </td>
                      </tr>
                      <tr className="h-5 bg-slate-100/70">
                        <td
                          colSpan={17}
                          className="border border-slate-200 px-3 text-[10px] text-slate-400 font-mono-num"
                        >
                          — Baris Jeda 2 (Pemisah Harian) —
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
