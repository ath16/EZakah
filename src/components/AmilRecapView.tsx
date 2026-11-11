import React, { useMemo } from 'react';
import { Calculator, Printer, Users } from 'lucide-react';
import { DailyGroupSummary, ZakatSettings } from '../types/zakat';
import { formatBeras, formatRupiah } from '../utils/zakatHelpers';

interface AmilRecapViewProps {
  dailyGroups: DailyGroupSummary[];
  settings: ZakatSettings;
  onUpdateSettings: (partial: Partial<ZakatSettings>) => void;
}

/**
 * Halaman Amil:
 * REKAPITULASI PERHITUNGAN AMIL ZAKAT (Uang & Beras) sesuai struktur sheet UPZ Al-Hasanah
 */
export const AmilRecapView: React.FC<AmilRecapViewProps> = ({
  dailyGroups,
  settings,
  onUpdateSettings,
}) => {
  const amilData = useMemo(() => {
    let fitrahBeras = 0;
    let fitrahUang = 0;
    let fidyahBeras = 0;
    let fidyahUang = 0;
    let maalUang = 0;
    let infaqBeras = 0;
    let infaqUang = 0;

    for (const g of dailyGroups) {
      fitrahBeras += g.fitrahBeras;
      fitrahUang += g.fitrahUang;
      fidyahBeras += g.fidyahBeras;
      fidyahUang += g.fidyahUang;
      maalUang += g.maalUang;
      infaqBeras += g.infaqBeras;
      infaqUang += g.infaqUang;
    }

    // Perhitungan Amil Uang (Zakat Fitrah + Fidyah + Maal)
    const jumlahPenerimaanZakatUang = fitrahUang + fidyahUang + maalUang;
    const perhitunganAmilUang = Math.round(
      jumlahPenerimaanZakatUang * (settings.persentaseAmil / 100)
    );
    const bagianPerAmilUang =
      settings.jumlahAmil > 0
        ? Math.floor(perhitunganAmilUang / settings.jumlahAmil)
        : 0;
    const saldoBagianAmilUang =
      perhitunganAmilUang - bagianPerAmilUang * settings.jumlahAmil;

    // Perhitungan Amil Beras (Zakat Fitrah + Fidyah + Infaq Beras sesuai rumus 2025)
    const jumlahPenerimaanZakatBeras = Number(
      (fitrahBeras + fidyahBeras + infaqBeras).toFixed(2)
    );
    const perhitunganAmilBeras = Number(
      (jumlahPenerimaanZakatBeras * (settings.persentaseAmil / 100)).toFixed(4)
    );
    const bagianPerAmilBeras =
      settings.jumlahAmil > 0
        ? Number((perhitunganAmilBeras / settings.jumlahAmil).toFixed(2))
        : 0;
    const saldoBagianAmilBeras = Number(
      (perhitunganAmilBeras - bagianPerAmilBeras * settings.jumlahAmil).toFixed(2)
    );

    return {
      fitrahBeras: Number(fitrahBeras.toFixed(2)),
      fitrahUang,
      fidyahBeras: Number(fidyahBeras.toFixed(2)),
      fidyahUang,
      maalUang,
      infaqBeras: Number(infaqBeras.toFixed(2)),
      infaqUang,
      jumlahPenerimaanZakatUang,
      perhitunganAmilUang,
      bagianPerAmilUang,
      saldoBagianAmilUang,
      jumlahPenerimaanZakatBeras,
      perhitunganAmilBeras,
      bagianPerAmilBeras,
      saldoBagianAmilBeras,
    };
  }, [dailyGroups, settings.persentaseAmil, settings.jumlahAmil]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-700" />
            Rekapitulasi Perhitungan Amil Zakat
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Perhitungan bagian amil ({settings.persentaseAmil}%) dari penerimaan zakat berupa Uang (Rp) dan Beras (Kg) untuk {settings.jumlahAmil} orang amil.
          </p>
        </div>

        <div className="flex items-center gap-3 no-print">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <Users className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-slate-600">Jumlah Amil:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.jumlahAmil}
              onChange={(e) =>
                onUpdateSettings({
                  jumlahAmil: parseInt(e.target.value, 10) || 24,
                })
              }
              className="w-14 px-2 py-0.5 text-center font-mono-num font-bold bg-white border border-slate-300 rounded"
            />
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Perhitungan Amil
          </button>
        </div>
      </div>

      {/* Summary Cards for Amil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Total Hak Amil Uang ({settings.persentaseAmil}%)</span>
          <div className="text-2xl font-bold text-emerald-800 font-mono-num mt-1">
            {formatRupiah(amilData.perhitunganAmilUang)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dari total zakat {formatRupiah(amilData.jumlahPenerimaanZakatUang)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Bagian Per 1 Amil (Uang)</span>
          <div className="text-2xl font-bold text-slate-900 font-mono-num mt-1">
            {formatRupiah(amilData.bagianPerAmilUang)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dibagi untuk {settings.jumlahAmil} anggota amil
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Total Hak Amil Beras ({settings.persentaseAmil}%)</span>
          <div className="text-2xl font-bold text-sky-700 font-mono-num mt-1">
            {formatBeras(amilData.perhitunganAmilBeras)} Kg
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dari total beras {formatBeras(amilData.jumlahPenerimaanZakatBeras)} Kg
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Bagian Per 1 Amil (Beras)</span>
          <div className="text-2xl font-bold text-slate-900 font-mono-num mt-1">
            {formatBeras(amilData.bagianPerAmilBeras)} Kg
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dibagi untuk {settings.jumlahAmil} anggota amil
          </p>
        </div>
      </div>

      {/* Table 1: REKAPITULASI PERHITUNGAN AMIL ZAKAT DARI PENERIMAAN ZAKAT FITRAH, FIDYAH DAN MAAL BERUPA UANG */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
        <div className="bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold tracking-wide">
          REKAPITULASI PERHITUNGAN AMIL ZAKAT DARI PENERIMAAN ZAKAT FITRAH, FIDYAH DAN MAAL BERUPA UANG
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold text-center">
                <th className="border border-slate-300 px-3 py-2 w-12">NO.</th>
                <th className="border border-slate-300 px-4 py-2 text-left">URAIAN</th>
                <th className="border border-slate-300 px-4 py-2 text-right">PENERIMAAN (Rp.)</th>
                <th className="border border-slate-300 px-4 py-2 text-right">
                  JUMLAH PENERIMAAN ZAKAT (Rp.)
                </th>
                <th className="border border-slate-300 px-4 py-2 text-right">
                  PERHITUNGAN AMIL {settings.persentaseAmil}% (Rp.)
                </th>
                <th className="border border-slate-300 px-4 py-2 text-right">
                  BAGIAN {settings.jumlahAmil} AMIL (Rp.)
                </th>
                <th className="border border-slate-300 px-4 py-2 text-right">
                  SALDO BAGIAN {settings.jumlahAmil} AMIL (Rp.)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono-num">1</td>
                <td className="border border-slate-300 px-4 py-2.5 font-semibold text-slate-900">
                  Zakat Fitrah
                </td>
                <td className="border border-slate-300 px-4 py-2.5 text-right font-mono-num">
                  {formatRupiah(amilData.fitrahUang)}
                </td>
                <td
                  rowSpan={3}
                  className="border border-slate-300 px-4 py-2.5 text-right font-mono-num font-bold text-slate-900 align-middle bg-slate-50"
                >
                  {formatRupiah(amilData.jumlahPenerimaanZakatUang)}
                </td>
                <td
                  rowSpan={3}
                  className="border border-slate-300 px-4 py-2.5 text-right font-mono-num font-bold text-emerald-800 align-middle bg-emerald-50/50"
                >
                  {formatRupiah(amilData.perhitunganAmilUang)}
                </td>
                <td
                  rowSpan={3}
                  className="border border-slate-300 px-4 py-2.5 text-right font-mono-num font-bold text-slate-900 align-middle bg-slate-50"
                >
                  {formatRupiah(amilData.bagianPerAmilUang)}
                </td>
                <td
                  rowSpan={3}
                  className="border border-slate-300 px-4 py-2.5 text-right font-mono-num text-slate-700 align-middle bg-slate-50"
                >
                  {formatRupiah(amilData.saldoBagianAmilUang)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono-num">2</td>
                <td className="border border-slate-300 px-4 py-2.5 font-semibold text-slate-900">
                  Fidyah
                </td>
                <td className="border border-slate-300 px-4 py-2.5 text-right font-mono-num">
                  {formatRupiah(amilData.fidyahUang)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono-num">3</td>
                <td className="border border-slate-300 px-4 py-2.5 font-semibold text-slate-900">
                  Maal
                </td>
                <td className="border border-slate-300 px-4 py-2.5 text-right font-mono-num">
                  {formatRupiah(amilData.maalUang)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-slate-500 mt-2">
            Catatan: Penerimaan Infaq Uang sebesar <strong className="font-mono-num">{formatRupiah(amilData.infaqUang)}</strong> tidak dikenakan potongan bagian amil zakat.
          </p>
        </div>
      </div>

      {/* Table 2: REKAPITULASI PERHITUNGAN AMIL ZAKAT DARI PENERIMAAN ZAKAT FITRAH, FIDYAH DAN INFAQ BERUPA BERAS */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-2.5 text-xs font-bold tracking-wide">
          REKAPITULASI PERHITUNGAN AMIL ZAKAT DARI PENERIMAAN ZAKAT FITRAH, FIDYAH DAN INFAQ BERUPA BERAS
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold text-center">
                <th className="border border-slate-300 px-3 py-2 w-12">NO.</th>
                <th className="border border-slate-300 px-4 py-2 text-left">URAIAN</th>
                <th className="border border-slate-300 px-4 py-2 text-right">PENERIMAAN (Kg.)</th>
                <th className="border border-slate-300 px-4 py-2 text-right">
                  JUMLAH PENERIMAAN ZAKAT (Kg.)
                </th>
                <th className="border border-slate-300 px-4 py-2 text-right">
                  PERHITUNGAN AMIL {settings.persentaseAmil}% (Kg.)
                </th>
                <th className="border border-slate-300 px-4 py-2 text-right">
                  BAGIAN {settings.jumlahAmil} AMIL (Kg.)
                </th>
                <th className="border border-slate-300 px-4 py-2 text-right">
                  SALDO BAGIAN {settings.jumlahAmil} AMIL (Kg.)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono-num">1</td>
                <td className="border border-slate-300 px-4 py-2.5 font-semibold text-slate-900">
                  Zakat Fitrah
                </td>
                <td className="border border-slate-300 px-4 py-2.5 text-right font-mono-num">
                  {formatBeras(amilData.fitrahBeras)} Kg
                </td>
                <td
                  rowSpan={3}
                  className="border border-slate-300 px-4 py-2.5 text-right font-mono-num font-bold text-slate-900 align-middle bg-slate-50"
                >
                  {formatBeras(amilData.jumlahPenerimaanZakatBeras)} Kg
                </td>
                <td
                  rowSpan={3}
                  className="border border-slate-300 px-4 py-2.5 text-right font-mono-num font-bold text-sky-800 align-middle bg-sky-50/50"
                >
                  {formatBeras(amilData.perhitunganAmilBeras)} Kg
                </td>
                <td
                  rowSpan={3}
                  className="border border-slate-300 px-4 py-2.5 text-right font-mono-num font-bold text-slate-900 align-middle bg-slate-50"
                >
                  {formatBeras(amilData.bagianPerAmilBeras)} Kg
                </td>
                <td
                  rowSpan={3}
                  className="border border-slate-300 px-4 py-2.5 text-right font-mono-num text-slate-700 align-middle bg-slate-50"
                >
                  {formatBeras(amilData.saldoBagianAmilBeras)} Kg
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono-num">2</td>
                <td className="border border-slate-300 px-4 py-2.5 font-semibold text-slate-900">
                  Fidyah
                </td>
                <td className="border border-slate-300 px-4 py-2.5 text-right font-mono-num">
                  {formatBeras(amilData.fidyahBeras)} Kg
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono-num">3</td>
                <td className="border border-slate-300 px-4 py-2.5 font-semibold text-slate-900">
                  Infaq
                </td>
                <td className="border border-slate-300 px-4 py-2.5 text-right font-mono-num">
                  {formatBeras(amilData.infaqBeras)} Kg
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
