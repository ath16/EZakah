/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Settings,
  Download,
  LayoutDashboard,
  FilePlus2,
  CalendarDays,
  Layers,
  Calculator,
  UserCheck,
  FolderCheck,
} from 'lucide-react';
import { ZakatSettings, ZakatTransaction } from './types/zakat';
import {
  buildDailyGroups,
  DEFAULT_SETTINGS,
  formatBeras,
  formatDisplayDate,
  formatRupiah,
  INITIAL_TRANSACTIONS_2026,
} from './utils/zakatHelpers';
import { loadHistoricalCsvArchive } from './utils/csvArchiveParser';
import {
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/auth';
import {
  createNewZakatSpreadsheet,
  pullFromGoogleSpreadsheet,
  syncAllToGoogleSpreadsheet,
} from './services/googleSheets';
import { DashboardView } from './components/DashboardView';
import { ZakatEntryForm } from './components/ZakatEntryForm';
import { SpreadsheetRekapView } from './components/SpreadsheetRekapView';
import { TotalPeriodRecapView } from './components/TotalPeriodRecapView';
import { AmilRecapView } from './components/AmilRecapView';
import { SettingsPage } from './components/SettingsPage';
import { ReceiptModal } from './components/ReceiptModal';
import { ConfirmationModal } from './components/ConfirmationModal';

export type ActivePage =
  | 'dashboard'
  | 'input'
  | 'harian'
  | 'rekap_total'
  | 'amil'
  | 'pengaturan';

const STORAGE_TX_KEY = 'upz_alhasanah_transactions_v1';
const STORAGE_SETTINGS_KEY = 'upz_alhasanah_settings_v1';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  const [settings, setSettings] = useState<ZakatSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SETTINGS;
  });

  const [transactions, setTransactions] = useState<ZakatTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TX_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_TRANSACTIONS_2026;
  });

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // UI & Modal States
  const [editingTx, setEditingTx] = useState<ZakatTransaction | null>(null);
  const [receiptTx, setReceiptTx] = useState<ZakatTransaction | null>(null);
  const [defaultInputDate, setDefaultInputDate] = useState<string>('2026-03-10');

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Mandatory Confirmation Modal State for Mutating Operations
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant?: 'primary' | 'danger';
    action: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Konfirmasi',
    action: () => {},
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TX_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error(e);
    }
  }, [transactions]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (loggedInUser, token) => {
        setUser(loggedInUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const showNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const { sortedTransactions, dailyGroups } = useMemo(
    () => buildDailyGroups(transactions),
    [transactions]
  );

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setNeedsAuth(false);
        showNotice(
          'success',
          `Berhasil masuk sebagai ${res.user.displayName || res.user.email} (Google Sheets & Drive aktif)`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      showNotice('error', msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    showNotice('info', 'Akun Google telah diputus.');
  };

  const handleSaveTransaction = (
    txData: Omit<ZakatTransaction, 'id' | 'nomor' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      setTransactions((prev) =>
        prev.map((item) =>
          item.id === existingId
            ? {
                ...item,
                ...txData,
                synced: false,
              }
            : item
        )
      );
      setEditingTx(null);
      showNotice(
        'success',
        `Transaksi atas nama ${txData.familyMembers[0]} (${txData.jiwa} jiwa) berhasil diperbarui.`
      );
    } else {
      const newTx: ZakatTransaction = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nomor: sortedTransactions.length + 1,
        createdAt: Date.now(),
        synced: false,
      };
      setTransactions((prev) => [...prev, newTx]);
      setDefaultInputDate(txData.tanggal);
      showNotice(
        'success',
        `Transaksi #${newTx.nomor} (${txData.familyMembers[0]} - ${txData.jiwa} jiwa) berhasil ditambahkan.`
      );
    }
  };

  const handleDeleteTransactionRequest = (tx: ZakatTransaction) => {
    setConfirmDialog({
      isOpen: true,
      title: `Hapus Transaksi No. #${tx.nomor}?`,
      description: `Apakah Anda yakin ingin menghapus data penerimaan zakat atas nama ${tx.familyMembers.join(
        ', '
      )} (${tx.jiwa} jiwa) pada tanggal ${formatDisplayDate(tx.tanggal)}?`,
      confirmLabel: 'Ya, Hapus Data',
      variant: 'danger',
      action: () => {
        setTransactions((prev) => prev.filter((item) => item.id !== tx.id));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showNotice('info', `Transaksi #${tx.nomor} telah dihapus.`);
      },
    });
  };

  // Trigger Google Spreadsheet Creation inside UPZ folder with Explicit Confirmation
  const handleRequestCreateSpreadsheet = () => {
    setConfirmDialog({
      isOpen: true,
      title: `Buat Spreadsheet Baru di Folder Drive '${settings.upzFolderName || 'UPZ'}'?`,
      description: `Aplikasi akan membuat file Google Spreadsheet baru berjudul "${settings.spreadsheetTitle}" di dalam folder '${settings.upzFolderName || 'UPZ'}' pada Google Drive pribadi Anda dan menyinkronkan ${sortedTransactions.length} transaksi zakat ke tab 'Rekap Gabungan', '${dailyGroups.length} Tab Harian', serta 'Rekapitulasi Total & Amil' beserta merge sel otomatis.`,
      confirmLabel: 'Buat Spreadsheet & Sinkronkan',
      variant: 'primary',
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        const token = await getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          showNotice('error', 'Silakan login dengan akun Google terlebih dahulu.');
          return;
        }
        setIsSyncing(true);
        try {
          const result = await createNewZakatSpreadsheet(
            token,
            settings,
            sortedTransactions
          );
          setSettings((prev) => ({
            ...prev,
            spreadsheetId: result.spreadsheetId,
            spreadsheetUrl: result.spreadsheetUrl,
            upzFolderId: result.upzFolderId || prev.upzFolderId,
            buktiFolderId: result.buktiFolderId || prev.buktiFolderId,
            lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
          }));
          setTransactions((prev) => prev.map((t) => ({ ...t, synced: true })));
          showNotice(
            'success',
            `Google Spreadsheet baru berhasil dibuat di folder '${settings.upzFolderName || 'UPZ'}' dengan merge otomatis!`
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Gagal membuat Google Spreadsheet.';
          showNotice('error', msg);
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Trigger Sync to Existing or New Google Spreadsheet with Explicit Confirmation
  const handleRequestSyncToSheets = () => {
    if (!settings.spreadsheetId) {
      handleRequestCreateSpreadsheet();
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Sinkronkan & Perbarui Google Spreadsheet?',
      description: `Aplikasi akan memperbarui tab 'Rekap Gabungan', ${dailyGroups.length} tab harian (${dailyGroups
        .map((d) => d.displayDate)
        .slice(0, 4)
        .join(', ')}${dailyGroups.length > 4 ? '...' : ''}), dan 'Rekapitulasi Total & Amil' dengan ${
        sortedTransactions.length
      } data transaksi zakat serta menjalankan merge sel otomatis.`,
      confirmLabel: 'Ya, Perbarui Spreadsheet',
      variant: 'primary',
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        const token = await getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          showNotice('error', 'Sesi akses Google berakhir. Silakan login kembali.');
          return;
        }
        setIsSyncing(true);
        try {
          await syncAllToGoogleSpreadsheet(
            token,
            settings.spreadsheetId,
            settings,
            sortedTransactions
          );
          setSettings((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
          }));
          setTransactions((prev) => prev.map((t) => ({ ...t, synced: true })));
          showNotice(
            'success',
            `Berhasil menyinkronkan ${sortedTransactions.length} transaksi & merge sel otomatis ke Google Spreadsheet!`
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Gagal menyinkronkan ke Google Spreadsheet.';
          showNotice('error', msg);
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Pull from shared spreadsheet (multi-device collaboration)
  const handlePullFromSpreadsheet = async (targetSpreadsheetId: string) => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      showNotice('error', 'Silakan login dengan Google terlebih dahulu.');
      return;
    }
    setIsSyncing(true);
    try {
      const result = await pullFromGoogleSpreadsheet(
        token,
        targetSpreadsheetId,
        settings.tahunMasehi
      );
      if (result.transactions.length === 0) {
        showNotice(
          'info',
          'Spreadsheet terhubung namun belum ditemukan baris transaksi zakat di dalamnya.'
        );
      } else {
        setTransactions(result.transactions);
        setSettings((prev) => ({
          ...prev,
          spreadsheetId: targetSpreadsheetId,
          spreadsheetTitle: result.title || prev.spreadsheetTitle,
          lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
        }));
        showNotice(
          'success',
          `Berhasil menarik ${result.transactions.length} transaksi dari "${result.title}".`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menarik data dari Google Spreadsheet.';
      showNotice('error', msg);
    } finally {
      setIsSyncing(false);
    }
  };

  // Load 2025 or 2026 historical archives from attached files
  const handleLoadSampleData = (
    mode: '2025' | '2026' | 'sample' | 'clear'
  ) => {
    const labelMap = {
      '2025': 'seluruh data arsip Ramadhan 1446H / 2025 (UPZ Al-Hasanah)',
      '2026': 'seluruh data arsip Ramadhan 1447H / 2026 (UPZ Al-Hasanah)',
      sample: 'data contoh keluarga Ramadhan 1447H / 2026',
      clear: 'tabel kosong (menghapus data tampilan saat ini)',
    };

    setConfirmDialog({
      isOpen: true,
      title: 'Ganti Data Rekapitulasi di Aplikasi?',
      description: `Apakah Anda yakin ingin memuat ${labelMap[mode]}?`,
      confirmLabel: 'Ya, Muat Data',
      variant: mode === 'clear' ? 'danger' : 'primary',
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        if (mode === 'clear') {
          setTransactions([]);
          showNotice('info', 'Tabel telah dikosongkan. Siap menerima input baru.');
          return;
        }
        if (mode === 'sample') {
          setTransactions(INITIAL_TRANSACTIONS_2026);
          setSettings((prev) => ({
            ...prev,
            tahunHijriah: '1447 H',
            tahunMasehi: '2026',
            fitrahUangPerJiwaRp: 42500,
          }));
          showNotice('success', 'Data contoh Ramadhan 1447H (2026) berhasil dimuat.');
          return;
        }
        setIsSyncing(true);
        try {
          const loaded = await loadHistoricalCsvArchive(mode);
          setTransactions(loaded);
          setSettings((prev) => ({
            ...prev,
            tahunHijriah: mode === '2025' ? '1446 H' : '1447 H',
            tahunMasehi: mode,
            fitrahUangPerJiwaRp: mode === '2025' ? 40000 : 42500,
          }));
          showNotice(
            'success',
            `Berhasil memuat ${loaded.length} transaksi dari arsip Laporan Zakat ${mode} UPZ Al-Hasanah!`
          );
          setActivePage('harian');
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Gagal memuat file arsip.';
          showNotice('error', msg);
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Export CSV locally with 2-row daily separation
  const handleExportCsv = () => {
    const rows: string[] = [];
    rows.push(
      `"DATA PENERIMAAN ZAKAT RAMADHAN ${settings.tahunHijriah} - ${settings.namaLembaga}"`
    );
    rows.push('');
    rows.push(
      'No,Tanggal,Jiwa,Nama,Fitrah Beras (Kg),Fitrah Uang (Rp),Fidyah Beras (Kg),Fidyah Uang (Rp),Maal Uang (Rp),Infaq Beras (Kg),Infaq Uang (Rp),Sub Total Beras (Kg),Sub Total Uang (Rp),Grand Total Beras (Kg),Grand Total Uang (Rp),Keterangan'
    );

    dailyGroups.forEach((group, gIdx) => {
      group.transactions.forEach((tx, txIdx) => {
        tx.familyMembers.forEach((member, mIdx) => {
          const ketWithBukti = tx.buktiDriveUrl
            ? `${tx.keterangan || 'QRIS/Transfer'} (${tx.buktiDriveUrl})`
            : tx.keterangan || '';
          if (mIdx === 0) {
            rows.push(
              [
                tx.nomor,
                txIdx === 0 ? group.displayDate : '',
                tx.jiwa,
                `"${member.replace(/"/g, '""')}"`,
                tx.fitrah.berasKg > 0 ? `"${formatBeras(tx.fitrah.berasKg)}"` : '',
                tx.fitrah.uangRp > 0 ? `"${formatRupiah(tx.fitrah.uangRp)}"` : '',
                tx.fidyah.berasKg > 0 ? `"${formatBeras(tx.fidyah.berasKg)}"` : '',
                tx.fidyah.uangRp > 0 ? `"${formatRupiah(tx.fidyah.uangRp)}"` : '',
                tx.maal.uangRp > 0 ? `"${formatRupiah(tx.maal.uangRp)}"` : '',
                tx.infaq.berasKg > 0 ? `"${formatBeras(tx.infaq.berasKg)}"` : '',
                tx.infaq.uangRp > 0 ? `"${formatRupiah(tx.infaq.uangRp)}"` : '',
                `"${formatBeras(tx.subTotal.berasKg)}"`,
                `"${formatRupiah(tx.subTotal.uangRp, true)}"`,
                '',
                '',
                `"${ketWithBukti.replace(/"/g, '""')}"`,
              ].join(',')
            );
          } else {
            rows.push(
              ['', '', '', `"${member.replace(/"/g, '""')}"`, '', '', '', '', '', '', '', '', '', '', '', ''].join(',')
            );
          }
        });
      });

      rows.push(
        [
          group.totalJiwa,
          'Total',
          '',
          '',
          `"${formatBeras(group.fitrahBeras)}"`,
          `"${formatRupiah(group.fitrahUang, true)}"`,
          `"${formatBeras(group.fidyahBeras)}"`,
          `"${formatRupiah(group.fidyahUang, true)}"`,
          `"${formatRupiah(group.maalUang, true)}"`,
          `"${formatBeras(group.infaqBeras)}"`,
          `"${formatRupiah(group.infaqUang, true)}"`,
          `"${formatBeras(group.subTotalBeras)}"`,
          `"${formatRupiah(group.subTotalUang, true)}"`,
          `"${formatBeras(group.cumulativeGrandTotalBeras)}"`,
          `"${formatRupiah(group.cumulativeGrandTotalUang, true)}"`,
          '',
        ].join(',')
      );

      if (gIdx < dailyGroups.length - 1) {
        rows.push('');
        rows.push('');
      }
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Zakat_${settings.namaLembaga.replace(/\s+/g, '_')}_${settings.tahunHijriah.replace(/\s+/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navItems: {
    id: ActivePage;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      subtitle: 'Tren Harian & Tahunan',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'input',
      label: 'Form Input',
      subtitle: 'Input Zakat & Bukti QRIS',
      icon: <FilePlus2 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'harian',
      label: 'Rekap Harian',
      subtitle: 'Sheet Per Hari & Gabungan',
      icon: <CalendarDays className="w-4 h-4 shrink-0" />,
      badge: `${dailyGroups.length} Hari`,
    },
    {
      id: 'rekap_total',
      label: 'Rekap Keseluruhan',
      subtitle: 'Total Penerimaan & Penyaluran',
      icon: <Layers className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'amil',
      label: 'Amil',
      subtitle: 'Perhitungan Hak Amil Zakat',
      icon: <Calculator className="w-4 h-4 shrink-0" />,
    },
  ];

  const pageMeta: Record<ActivePage, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Statistik & Visualisasi Penerimaan Zakat',
      subtitle: `Ringkasan penerimaan zakat harian & perbandingan tahunan ${settings.namaLembaga}`,
    },
    input: {
      title: 'Formulir Input Penerimaan Zakat Baru',
      subtitle: 'Kalkulasi otomatis per jiwa, simulasi merge sel, dan upload bukti QRIS/Transfer ke Google Drive',
    },
    harian: {
      title: 'Rekap Harian — Sheet Per Hari & Gabungan',
      subtitle: 'Data penerimaan zakat terpisah per tanggal dengan sel keluarga di-merge otomatis',
    },
    rekap_total: {
      title: 'Rekap / Total Keseluruhan & Penyaluran Zakat',
      subtitle: 'Rekapitulasi total masa penerimaan zakat dan penyaluran uang serta beras',
    },
    amil: {
      title: 'Rekapitulasi Perhitungan Amil Zakat',
      subtitle: 'Perhitungan bagian hak amil zakat uang dan beras sesuai parameter lembaga',
    },
    pengaturan: {
      title: 'Pengaturan Ketetapan Zakat, Amil & Google Drive UPZ',
      subtitle: 'Atur nilai Zakat Fitrah, Fidyah, identitas UPZ, serta koneksi Spreadsheet di folder UPZ',
    },
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* LEFT SIDEBAR: Judul di atas, Profil di atas, Navigasi di tengah, Pengaturan & Sign In/Log Out di bawah */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-emerald-950 text-white border-r border-emerald-900 z-30 no-print">
        {/* 1. TOP: Judul Aplikasi */}
        <div className="px-5 pt-5 pb-4 border-b border-emerald-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center font-bold text-sm text-white shrink-0">
              UPZ
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-white truncate">
                {settings.namaLembaga}
              </h1>
              <p className="text-[11px] text-emerald-300/90 truncate">
                Sistem Rekap Zakat {settings.tahunHijriah} ({settings.tahunMasehi})
              </p>
            </div>
          </div>

          {/* 2. TOP: Profil Pengguna & Status Koneksi Drive/Sheets */}
          <div className="mt-4 p-3 rounded-xl bg-emerald-900/60 border border-emerald-800/80">
            {user ? (
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profil'}
                    className="w-8 h-8 rounded-full border border-emerald-500/40 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {(user.displayName || user.email || 'U')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {user.displayName || 'Panitia Amil UPZ'}
                  </p>
                  <p className="text-[11px] text-emerald-300 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-800/80 flex items-center justify-center text-emerald-300 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-emerald-100 truncate">
                    Mode Panitia Lokal
                  </p>
                  <p className="text-[11px] text-emerald-300/80 truncate">
                    Belum terhubung ke Google Drive
                  </p>
                </div>
              </div>
            )}

            <div className="mt-2.5 pt-2 border-t border-emerald-800/70 flex items-center justify-between text-[11px] text-emerald-200">
              <span className="inline-flex items-center gap-1 truncate">
                <FolderCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Folder Drive: <strong>/{settings.upzFolderName || 'UPZ'}</strong>
              </span>
              {settings.spreadsheetId ? (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-300 hover:text-white underline shrink-0"
                >
                  Buka Sheet
                </a>
              ) : (
                <span className="text-amber-300 shrink-0">Belum diset</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. MIDDLE: Navigasi Masing-Masing Halaman */}
        <div className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">
            Menu Utama
          </div>
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-100/80 hover:bg-emerald-900/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.icon}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {item.label}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        isActive ? 'text-emerald-100' : 'text-emerald-400/80'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                {item.badge && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono-num font-semibold rounded-md shrink-0 ${
                      isActive
                        ? 'bg-emerald-900/70 text-emerald-100'
                        : 'bg-emerald-900 text-emerald-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 4. BOTTOM: Pengaturan (Halaman) & Sign In / Log Out */}
        <div className="p-3 border-t border-emerald-900/80 space-y-2 bg-emerald-950">
          <button
            type="button"
            onClick={() => setActivePage('pengaturan')}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
              activePage === 'pengaturan'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-100/80 hover:bg-emerald-900/70 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Settings className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Pengaturan</div>
                <div
                  className={`text-[10px] truncate ${
                    activePage === 'pengaturan'
                      ? 'text-emerald-100'
                      : 'text-emerald-400/80'
                  }`}
                >
                  Tarif Kemenag, Amil & Drive UPZ
                </div>
              </div>
            </div>
          </button>

          {needsAuth || !accessToken ? (
            <button
              type="button"
              disabled={isLoggingIn}
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-4 h-4 shrink-0"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                ></path>
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                ></path>
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                ></path>
              </svg>
              <span>
                {isLoggingIn
                  ? 'Menghubungkan...'
                  : 'Sign In Google (Drive & Sheets)'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-xl bg-emerald-900/70 hover:bg-red-900/70 text-emerald-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-emerald-800/80 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out ({user?.email?.split('@')[0]})</span>
            </button>
          )}
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-20 no-print">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {pageMeta[activePage].title}
              </h2>
              <p className="text-xs text-slate-500">
                {pageMeta[activePage].subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {settings.spreadsheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Buka Google Sheet
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Unduh file CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh CSV
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={handleRequestSyncToSheets}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                />
                {settings.spreadsheetId
                  ? 'Sinkronkan ke Google Sheets'
                  : `Buat Sheet di Folder ${settings.upzFolderName || 'UPZ'}`}
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Navigation Bar */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pt-3 mt-3 border-t border-slate-100">
            {[
              ...navItems,
              {
                id: 'pengaturan' as ActivePage,
                label: 'Pengaturan',
                subtitle: '',
                icon: <Settings className="w-3.5 h-3.5" />,
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  activePage === item.id
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {/* Main Page Content */}
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Toast Notice */}
          {toast && (
            <div
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-medium no-print ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-sky-50 border-sky-200 text-sky-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. HALAMAN DASHBOARD */}
          {activePage === 'dashboard' && (
            <DashboardView
              dailyGroups={dailyGroups}
              totalTransactionsCount={sortedTransactions.length}
              settings={settings}
              onNavigateToInput={() => setActivePage('input')}
              onNavigateToSettings={() => setActivePage('pengaturan')}
            />
          )}

          {/* 2. HALAMAN FORMULIR */}
          {activePage === 'input' && (
            <ZakatEntryForm
              settings={settings}
              defaultDate={defaultInputDate}
              nextNomor={sortedTransactions.length + 1}
              editingTransaction={editingTx}
              accessToken={accessToken}
              onTriggerLogin={handleGoogleLogin}
              onCancelEdit={() => setEditingTx(null)}
              onSaveTransaction={handleSaveTransaction}
              onUpdateDriveFolders={(upzFolderId, buktiFolderId) =>
                setSettings((prev) => ({
                  ...prev,
                  upzFolderId,
                  buktiFolderId,
                }))
              }
              onOpenSettings={() => setActivePage('pengaturan')}
            />
          )}

          {/* 3. HALAMAN REKAP HARIAN (Sheet Per Hari & Gabungan) */}
          {activePage === 'harian' && (
            <SpreadsheetRekapView
              initialMode="harian"
              dailyGroups={dailyGroups}
              settings={settings}
              onEditTransaction={(tx) => {
                setEditingTx(tx);
                setActivePage('input');
              }}
              onDeleteTransaction={handleDeleteTransactionRequest}
              onPrintReceipt={(tx) => setReceiptTx(tx)}
              onSwitchToInput={(date) => {
                if (date) setDefaultInputDate(date);
                setEditingTx(null);
                setActivePage('input');
              }}
            />
          )}

          {/* 4. HALAMAN REKAP KESELURUHAN */}
          {activePage === 'rekap_total' && (
            <TotalPeriodRecapView
              dailyGroups={dailyGroups}
              settings={settings}
              onUpdateSettings={(partial) =>
                setSettings((prev) => ({ ...prev, ...partial }))
              }
            />
          )}

          {/* 5. HALAMAN AMIL */}
          {activePage === 'amil' && (
            <AmilRecapView
              dailyGroups={dailyGroups}
              settings={settings}
              onUpdateSettings={(partial) =>
                setSettings((prev) => ({ ...prev, ...partial }))
              }
            />
          )}

          {/* 6. HALAMAN PENGATURAN (Halaman Penuh, Bukan Pop-up) */}
          {activePage === 'pengaturan' && (
            <SettingsPage
              settings={settings}
              onSaveSettings={(newSettings) => {
                setSettings(newSettings);
                showNotice(
                  'success',
                  `Pengaturan berhasil disimpan. Fitrah: ${formatRupiah(
                    newSettings.fitrahUangPerJiwaRp
                  )}/jiwa · Fidyah: ${formatRupiah(
                    newSettings.fidyahUangPerHariRp
                  )}/hari.`
                );
              }}
              onCreateNewSpreadsheet={handleRequestCreateSpreadsheet}
              onPullFromSpreadsheet={handlePullFromSpreadsheet}
              onLoadSampleData={handleLoadSampleData}
              isSyncing={isSyncing}
              isAuthenticated={!needsAuth && !!accessToken}
            />
          )}
        </main>
      </div>

      {/* Modals for Receipt & Mutating Action Confirmation */}
      <ReceiptModal
        transaction={receiptTx}
        settings={settings}
        onClose={() => setReceiptTx(null)}
      />

      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.action}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}
