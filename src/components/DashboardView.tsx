import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Users,
  Scale,
  Wallet,
  TrendingUp,
  BarChart3,
  Plus,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { DailyGroupSummary, ZakatSettings } from '../types/zakat';
import { formatBeras, formatRupiah } from '../utils/zakatHelpers';

interface DashboardViewProps {
  dailyGroups: DailyGroupSummary[];
  totalTransactionsCount: number;
  settings: ZakatSettings;
  onNavigateToInput: () => void;
  onNavigateToSettings: () => void;
}

// Data ringkasan historis resmi UPZ Al-Hasanah untuk grafik perbandingan tahunan (2025 vs 2026)
const HISTORICAL_YEARLY_COMPARISON = [
  {
    tahun: 'Ramadhan 1445H (2025)',
    jiwa: 2138,
    fitrahUang: 73125000,
    fidyahUang: 10850000,
    maalUang: 50175000,
    infaqUang: 33925000,
    totalUang: 168075000,
    fitrahBeras: 750.81,
    fidyahBeras: 21.0,
    infaqBeras: 167.29,
    totalBeras: 939.1,
  },
  {
    tahun: 'Ramadhan 1447H (2026 Arsip)',
    jiwa: 1945,
    fitrahUang: 72165000,
    fidyahUang: 6250000,
    maalUang: 44703000,
    infaqUang: 59964000,
    totalUang: 183082000,
    fitrahBeras: 752.5,
    fidyahBeras: 0,
    infaqBeras: 121.0,
    totalBeras: 873.5,
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  dailyGroups,
  totalTransactionsCount,
  settings,
  onNavigateToInput,
  onNavigateToSettings,
}) => {
  const [chartTimeframe, setChartTimeframe] = useState<'harian' | 'tahunan'>('harian');
  const [dailyChartMode, setDailyChartMode] = useState<'harian_nilai' | 'kumulatif'>('harian_nilai');

  const summary = useMemo(() => {
    let totalJiwa = 0;
    let fitrahBeras = 0;
    let fitrahUang = 0;
    let fidyahBeras = 0;
    let fidyahUang = 0;
    let maalUang = 0;
    let infaqBeras = 0;
    let infaqUang = 0;

    for (const g of dailyGroups) {
      totalJiwa += g.totalJiwa;
      fitrahBeras += g.fitrahBeras;
      fitrahUang += g.fitrahUang;
      fidyahBeras += g.fidyahBeras;
      fidyahUang += g.fidyahUang;
      maalUang += g.maalUang;
      infaqBeras += g.infaqBeras;
      infaqUang += g.infaqUang;
    }

    const lastGroup = dailyGroups[dailyGroups.length - 1];
    return {
      totalJiwa,
      totalHari: dailyGroups.length,
      grandTotalBeras: lastGroup ? lastGroup.cumulativeGrandTotalBeras : 0,
      grandTotalUang: lastGroup ? lastGroup.cumulativeGrandTotalUang : 0,
      fitrahBeras: Number(fitrahBeras.toFixed(2)),
      fitrahUang,
      fidyahBeras: Number(fidyahBeras.toFixed(2)),
      fidyahUang,
      maalUang,
      infaqBeras: Number(infaqBeras.toFixed(2)),
      infaqUang,
    };
  }, [dailyGroups]);

  const dailyChartData = useMemo(() => {
    return dailyGroups.map((g) => ({
      tanggal: g.displayDate,
      jiwa: g.totalJiwa,
      uangHarian: g.subTotalUang,
      uangKumulatif: g.cumulativeGrandTotalUang,
      fitrahUang: g.fitrahUang,
      fidyahMaalUang: g.fidyahUang + g.maalUang,
      infaqUang: g.infaqUang,
      berasHarian: g.subTotalBeras,
      berasKumulatif: g.cumulativeGrandTotalBeras,
      fitrahBeras: g.fitrahBeras,
      infaqFidyahBeras: Number((g.fidyahBeras + g.infaqBeras).toFixed(2)),
    }));
  }, [dailyGroups]);

  const yearlyComparisonData = useMemo(() => {
    const activeLabel = `Data Aktif (${settings.tahunHijriah})`;
    return [
      ...HISTORICAL_YEARLY_COMPARISON,
      {
        tahun: activeLabel,
        jiwa: summary.totalJiwa,
        fitrahUang: summary.fitrahUang,
        fidyahUang: summary.fidyahUang,
        maalUang: summary.maalUang,
        infaqUang: summary.infaqUang,
        totalUang: summary.grandTotalUang,
        fitrahBeras: summary.fitrahBeras,
        fidyahBeras: summary.fidyahBeras,
        infaqBeras: summary.infaqBeras,
        totalBeras: summary.grandTotalBeras,
      },
    ];
  }, [summary, settings.tahunHijriah]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Dashboard Rekapitulasi Penerimaan Zakat
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {settings.namaLembaga} · Ramadhan {settings.tahunHijriah} ({settings.tahunMasehi}) · Tarif Fitrah {formatRupiah(settings.fitrahUangPerJiwaRp)} / jiwa
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {settings.spreadsheetId ? (
            <a
              href={`https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Buka Google Spreadsheet
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              Hubungkan Google Spreadsheet
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateToInput}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Input Zakat Baru
          </button>
        </div>
      </div>

      {/* 3 Primary Metric Cards Requested: Total Muzakki & Jiwa, Grand Total Beras, Grand Total Uang */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Muzakki & Jiwa */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Total Muzakki & Jiwa
            </span>
            <Users className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono-num">
            {summary.totalJiwa.toLocaleString('id-ID')}{' '}
            <span className="text-base font-semibold text-slate-500">Jiwa</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              <strong className="font-mono-num text-slate-800">{totalTransactionsCount}</strong> Keluarga / Transaksi
            </span>
            <span>·</span>
            <span>
              <strong className="font-mono-num text-slate-800">{summary.totalHari}</strong> Hari Penerimaan
            </span>
          </div>
        </div>

        {/* Card 2: Grand Total Penerimaan Beras */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Grand Total Penerimaan Beras
            </span>
            <Scale className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono-num">
            {formatBeras(summary.grandTotalBeras)}{' '}
            <span className="text-base font-semibold text-slate-500">Kg</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Fitrah: <strong className="font-mono-num text-slate-800">{formatBeras(summary.fitrahBeras)} Kg</strong>
            </span>
            <span>·</span>
            <span>
              Infaq/Fidyah: <strong className="font-mono-num text-slate-800">{formatBeras(summary.infaqBeras + summary.fidyahBeras)} Kg</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Grand Total Penerimaan Uang */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Grand Total Penerimaan Uang
            </span>
            <Wallet className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-bold text-emerald-800 font-mono-num">
            {formatRupiah(summary.grandTotalUang)}
          </div>
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>
              Fitrah: <strong className="font-mono-num text-slate-800">{formatRupiah(summary.fitrahUang)}</strong>
            </span>
            <span>·</span>
            <span>
              Maal/Fidyah: <strong className="font-mono-num text-slate-800">{formatRupiah(summary.maalUang + summary.fidyahUang)}</strong>
            </span>
            <span>·</span>
            <span>
              Infaq: <strong className="font-mono-num text-slate-800">{formatRupiah(summary.infaqUang)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Data Visualization Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              Visualisasi Grafik Tren Penerimaan Zakat (Uang & Beras)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau perkembangan penerimaan zakat harian maupun perbandingan lintas tahun Ramadhan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switch Timeframe: Per Hari vs Per Tahunan */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setChartTimeframe('harian')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  chartTimeframe === 'harian'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tren Per Hari
              </button>
              <button
                type="button"
                onClick={() => setChartTimeframe('tahunan')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  chartTimeframe === 'tahunan'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Perbandingan Per Tahun (2025 vs 2026)
              </button>
            </div>

            {chartTimeframe === 'harian' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDailyChartMode('harian_nilai')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    dailyChartMode === 'harian_nilai'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sub Total Harian
                </button>
                <button
                  type="button"
                  onClick={() => setDailyChartMode('kumulatif')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    dailyChartMode === 'kumulatif'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Grand Total Kumulatif
                </button>
              </div>
            )}
          </div>
        </div>

        {chartTimeframe === 'harian' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Tren Penerimaan Uang (Rp) per Hari */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Grafik Penerimaan Uang (Rp) per Hari
                  </h3>
                  <p className="text-xs text-slate-500">
                    {dailyChartMode === 'harian_nilai'
                      ? 'Penerimaan harian (Fitrah, Maal/Fidyah, Infaq)'
                      : 'Akumulasi Grand Total Uang dari hari ke hari'}
                  </p>
                </div>
                <span className="text-xs font-mono-num font-bold text-emerald-800">
                  {formatRupiah(summary.grandTotalUang)}
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {dailyChartMode === 'kumulatif' ? (
                    <AreaChart
                      data={dailyChartData}
                      margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorUangKumulatif" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#047857" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#047857" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `${(v / 1000000).toFixed(1)}Jt`
                            : v >= 1000
                            ? `${(v / 1000).toFixed(0)}Rb`
                            : String(v)
                        }
                      />
                      <Tooltip
                        formatter={(value: any) => [formatRupiah(Number(value) || 0), 'Grand Total Uang']}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Area
                        type="monotone"
                        dataKey="uangKumulatif"
                        name="Grand Total Kumulatif (Rp)"
                        stroke="#047857"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorUangKumulatif)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={dailyChartData}
                      margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `${(v / 1000000).toFixed(1)}Jt`
                            : v >= 1000
                            ? `${(v / 1000).toFixed(0)}Rb`
                            : String(v)
                        }
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [formatRupiah(Number(value) || 0), String(name || '')]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar
                        dataKey="fitrahUang"
                        name="Fitrah (Rp)"
                        stackId="uang"
                        fill="#047857"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="fidyahMaalUang"
                        name="Maal & Fidyah (Rp)"
                        stackId="uang"
                        fill="#D97706"
                      />
                      <Bar
                        dataKey="infaqUang"
                        name="Infaq (Rp)"
                        stackId="uang"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Tren Penerimaan Beras (Kg) per Hari */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Grafik Penerimaan Beras (Kg) per Hari
                  </h3>
                  <p className="text-xs text-slate-500">
                    {dailyChartMode === 'harian_nilai'
                      ? 'Penerimaan beras harian (Fitrah, Fidyah & Infaq)'
                      : 'Akumulasi Grand Total Beras (Kg) dari hari ke hari'}
                  </p>
                </div>
                <span className="text-xs font-mono-num font-bold text-sky-700">
                  {formatBeras(summary.grandTotalBeras)} Kg
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {dailyChartMode === 'kumulatif' ? (
                    <AreaChart
                      data={dailyChartData}
                      margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorBerasKumulatif" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284C7" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0284C7" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${v} Kg`}
                      />
                      <Tooltip
                        formatter={(value: any) => [`${formatBeras(Number(value) || 0)} Kg`, 'Grand Total Beras']}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Area
                        type="monotone"
                        dataKey="berasKumulatif"
                        name="Grand Total Beras (Kg)"
                        stroke="#0284C7"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorBerasKumulatif)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={dailyChartData}
                      margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${v} Kg`}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [`${formatBeras(Number(value) || 0)} Kg`, String(name || '')]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar
                        dataKey="fitrahBeras"
                        name="Fitrah Beras (Kg)"
                        stackId="beras"
                        fill="#0284C7"
                      />
                      <Bar
                        dataKey="infaqFidyahBeras"
                        name="Infaq & Fidyah Beras (Kg)"
                        stackId="beras"
                        fill="#38BDF8"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          /* Perbandingan Tahunan (2025 vs 2026 vs Data Aktif) */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-emerald-700" />
                    Perbandingan Penerimaan Uang Antar Tahun (Rp)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Komparasi Ramadhan 1445H (2025), Arsip 1447H (2026), dan Data Aktif
                  </p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={yearlyComparisonData}
                    margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="tahun" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        v >= 1000000
                          ? `${(v / 1000000).toFixed(0)}Jt`
                          : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [formatRupiah(Number(value) || 0), String(name || '')]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="fitrahUang" name="Zakat Fitrah (Rp)" fill="#047857" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="maalUang" name="Zakat Maal (Rp)" fill="#D97706" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="infaqUang" name="Infaq & Fidyah (Rp)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-sky-700" />
                    Perbandingan Penerimaan Beras (Kg) & Jiwa Antar Tahun
                  </h3>
                  <p className="text-xs text-slate-500">
                    Komparasi Total Beras (Kg) dan Jumlah Muzakki (Jiwa)
                  </p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={yearlyComparisonData}
                    margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="tahun" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        String(name || '').includes('Kg')
                          ? `${formatBeras(Number(value) || 0)} Kg`
                          : `${(Number(value) || 0).toLocaleString('id-ID')} Jiwa`,
                        String(name || ''),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="totalBeras" name="Total Beras (Kg)" fill="#0284C7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="jiwa" name="Total Muzakki (Jiwa)" fill="#64748B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
