import React, { useState, useEffect } from 'react';
import {
  Save,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Database,
  CheckCircle2,
  FolderOpen,
  FolderCheck,
  Building2,
  Scale,
  HeartHandshake,
  HardDrive,
} from 'lucide-react';
import { ZakatSettings, DriveFileItem } from '../types/zakat';
import { extractSpreadsheetId } from '../services/googleSheets';
import { ensureUpzAndBuktiFolders, listDriveSpreadsheets } from '../services/googleDrive';
import { getAccessToken, googleSignIn } from '../services/auth';

interface SettingsPageProps {
  settings: ZakatSettings;
  onSaveSettings: (newSettings: ZakatSettings) => void;
  onCreateNewSpreadsheet: () => void;
  onPullFromSpreadsheet: (spreadsheetId: string) => void;
  onLoadSampleData: (year: '2025' | '2026' | 'sample' | 'clear') => void;
  isSyncing: boolean;
  isAuthenticated: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
  onCreateNewSpreadsheet,
  onPullFromSpreadsheet,
  onLoadSampleData,
  isSyncing,
  isAuthenticated,
}) => {
  const [formState, setFormState] = useState<ZakatSettings>(settings);
  const [sheetInput, setSheetInput] = useState<string>(
    settings.spreadsheetUrl || settings.spreadsheetId || ''
  );
  const [savedBanner, setSavedBanner] = useState(false);

  // Google Drive UPZ folder & file picker states
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [upzFolderLink, setUpzFolderLink] = useState<string>(
    settings.upzFolderId
      ? `https://drive.google.com/drive/folders/${settings.upzFolderId}`
      : ''
  );
  const [buktiFolderLink, setBuktiFolderLink] = useState<string>(
    settings.buktiFolderId
      ? `https://drive.google.com/drive/folders/${settings.buktiFolderId}`
      : ''
  );
  const [rekapitulasiFolderLink, setRekapitulasiFolderLink] = useState<string>(
    settings.rekapitulasiFolderId
      ? `https://drive.google.com/drive/folders/${settings.rekapitulasiFolderId}`
      : ''
  );
  const [upzSpreadsheets, setUpzSpreadsheets] = useState<DriveFileItem[]>([]);
  const [allDriveSpreadsheets, setAllDriveSpreadsheets] = useState<DriveFileItem[]>([]);
  const [driveSourceTab, setDriveSourceTab] = useState<'upz' | 'all'>('upz');

  useEffect(() => {
    setFormState(settings);
    setSheetInput(settings.spreadsheetUrl || settings.spreadsheetId || '');
    if (settings.upzFolderId) {
      setUpzFolderLink(`https://drive.google.com/drive/folders/${settings.upzFolderId}`);
    }
    if (settings.buktiFolderId) {
      setBuktiFolderLink(`https://drive.google.com/drive/folders/${settings.buktiFolderId}`);
    }
    if (settings.rekapitulasiFolderId) {
      setRekapitulasiFolderLink(
        `https://drive.google.com/drive/folders/${settings.rekapitulasiFolderId}`
      );
    }
  }, [settings]);

  const handleScanDriveAndFolders = async () => {
    setDriveError(null);
    setIsLoadingDrive(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        token = res?.accessToken || null;
      }
      if (!token) {
        throw new Error('Silakan Sign In Google terlebih dahulu untuk mengakses Google Drive.');
      }
      const folderInfo = await ensureUpzAndBuktiFolders(
        token,
        formState.upzFolderName || 'UPZ'
      );

      setUpzFolderLink(folderInfo.upzFolderLink);
      setBuktiFolderLink(folderInfo.buktiFolderLink);
      setRekapitulasiFolderLink(folderInfo.rekapitulasiFolderLink);

      const updatedSettings: ZakatSettings = {
        ...formState,
        upzFolderId: folderInfo.upzFolderId,
        buktiFolderId: folderInfo.buktiFolderId,
        rekapitulasiFolderId: folderInfo.rekapitulasiFolderId,
      };
      setFormState(updatedSettings);
      onSaveSettings(updatedSettings);

      const files = await listDriveSpreadsheets(token, folderInfo.upzFolderId);
      setUpzSpreadsheets(files.upzFiles);
      setAllDriveSpreadsheets(files.allSpreadsheets);
      if (files.upzFiles.length === 0 && files.allSpreadsheets.length > 0) {
        setDriveSourceTab('all');
      }
    } catch (err: any) {
      setDriveError(
        err?.message || 'Gagal memuat folder UPZ dan daftar Spreadsheet dari Google Drive.'
      );
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleSelectDriveSpreadsheet = (file: DriveFileItem) => {
    const url =
      file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
    setSheetInput(url);
    const updated: ZakatSettings = {
      ...formState,
      spreadsheetId: file.id,
      spreadsheetTitle: file.name,
      spreadsheetUrl: url,
    };
    setFormState(updated);
    onSaveSettings(updated);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extractedId = extractSpreadsheetId(sheetInput);
    const updated: ZakatSettings = {
      ...formState,
      spreadsheetId: extractedId,
      spreadsheetUrl: extractedId
        ? `https://docs.google.com/spreadsheets/d/${extractedId}/edit`
        : '',
    };
    onSaveSettings(updated);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Konfigurasi Sistem & Koneksi Cloud
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            Pengaturan Ketetapan Zakat, Amil & Google Drive UPZ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur nilai ketetapan Kemenag/BAZNAS, parameter perhitungan amil, koneksi Google Spreadsheet di folder UPZ, serta arsip data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedBanner && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Pengaturan Tersimpan
            </span>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Simpan Semua Pengaturan
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Zakat Fitrah, Fidyah, Identitas UPZ */}
        <div className="lg:col-span-6 space-y-6">
          {/* 1. Ketetapan Nilai Zakat Fitrah Per Jiwa (Kemenag / BAZNAS) */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 bg-emerald-50/50 flex items-center gap-2.5">
              <Scale className="w-4 h-4 text-emerald-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  1. Ketetapan Nilai Zakat Fitrah Per Jiwa (Kemenag / BAZNAS)
                </h3>
                <p className="text-xs text-slate-500">
                  Digunakan untuk kalkulasi otomatis saat menginput jumlah jiwa muzakki
                </p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Zakat Fitrah Uang / Jiwa (Rp)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={formState.fitrahUangPerJiwaRp}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        fitrahUangPerJiwaRp: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[37500, 40000, 42500, 45000, 50000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setFormState({ ...formState, fitrahUangPerJiwaRp: preset })
                        }
                        className={`px-2 py-1 text-[11px] font-mono-num rounded border transition-colors cursor-pointer ${
                          formState.fitrahUangPerJiwaRp === preset
                            ? 'bg-emerald-700 text-white border-emerald-700 font-semibold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Rp {preset.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Zakat Fitrah Beras / Jiwa (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formState.fitrahBerasPerJiwaKg}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        fitrahBerasPerJiwaKg: Number(e.target.value) || 2.5,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Standar baku 1 Sha&apos; = <strong>2,5 Kg</strong> (atau 3,5 Liter) beras per jiwa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Ketetapan Nilai Fidyah Per Jiwa/Per Hari (Kemenag / BAZNAS) */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 bg-amber-50/50 flex items-center gap-2.5">
              <HeartHandshake className="w-4 h-4 text-amber-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Ketetapan Nilai Fidyah Per Jiwa / Per Hari (Kemenag / BAZNAS)
                </h3>
                <p className="text-xs text-slate-500">
                  Otomatis mengalikan jumlah hari puasa yang ditinggalkan pada formulir input
                </p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fidyah Uang / Jiwa / Hari (Rp)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={formState.fidyahUangPerHariRp}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        fidyahUangPerHariRp: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[15000, 25000, 30000, 45000, 60000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setFormState({ ...formState, fidyahUangPerHariRp: preset })
                        }
                        className={`px-2 py-1 text-[11px] font-mono-num rounded border transition-colors cursor-pointer ${
                          formState.fidyahUangPerHariRp === preset
                            ? 'bg-amber-700 text-white border-amber-700 font-semibold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Rp {preset.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fidyah Beras / Jiwa / Hari (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={formState.fidyahBerasPerHariKg}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        fidyahBerasPerHariKg: Number(e.target.value) || 0.6,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[0.6, 0.675, 0.75, 1.5].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setFormState({ ...formState, fidyahBerasPerHariKg: preset })
                        }
                        className={`px-2 py-1 text-[11px] font-mono-num rounded border transition-colors cursor-pointer ${
                          formState.fidyahBerasPerHariKg === preset
                            ? 'bg-amber-700 text-white border-amber-700 font-semibold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset} Kg
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Identitas Lembaga UPZ & Parameter Perhitungan Amil */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50 flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-slate-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  3. Identitas Lembaga UPZ & Parameter Perhitungan Amil
                </h3>
                <p className="text-xs text-slate-500">
                  Digunakan pada kop laporan Spreadsheet serta perhitungan bagian Amil
                </p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama UPZ / Masjid
                  </label>
                  <input
                    type="text"
                    value={formState.namaLembaga}
                    onChange={(e) =>
                      setFormState({ ...formState, namaLembaga: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tahun Hijriah
                  </label>
                  <input
                    type="text"
                    value={formState.tahunHijriah}
                    onChange={(e) =>
                      setFormState({ ...formState, tahunHijriah: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tahun Masehi
                  </label>
                  <input
                    type="text"
                    value={formState.tahunMasehi}
                    onChange={(e) =>
                      setFormState({ ...formState, tahunMasehi: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Persentase Hak Amil (%) — Standar 1/8 = 12.5%
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formState.persentaseAmil}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        persentaseAmil: Number(e.target.value) || 12.5,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jumlah Anggota Amil (Orang)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formState.jumlahAmil}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        jumlahAmil: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google Spreadsheet & Drive UPZ + Data Arsip */}
        <div className="lg:col-span-6 space-y-6">
          {/* 4. Integrasi Google Spreadsheet & Folder UPZ Drive */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 bg-blue-50/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-blue-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    4. Integrasi Google Spreadsheet & Folder Drive UPZ
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih Spreadsheet langsung dari Google Drive Anda atau dari folder khusus{' '}
                    <strong>UPZ</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Folder UPZ & Bukti Setup */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800">
                      Nama Folder Utama di Google Drive Pribadi
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Seluruh Spreadsheet baru, subfolder <strong>Bukti</strong> (foto QRIS/Transfer), dan subfolder <strong>Rekapitulasi</strong> (file PDF) disimpan di dalam folder ini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formState.upzFolderName || 'UPZ'}
                      onChange={(e) =>
                        setFormState({ ...formState, upzFolderName: e.target.value })
                      }
                      placeholder="UPZ"
                      className="w-28 px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleScanDriveAndFolders}
                      disabled={isLoadingDrive}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <FolderOpen className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                      {isLoadingDrive ? 'Memindai Drive...' : 'Buka Drive / Folder UPZ'}
                    </button>
                  </div>
                </div>

                {(upzFolderLink || buktiFolderLink || rekapitulasiFolderLink) && (
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/70 text-xs">
                    {upzFolderLink && (
                      <a
                        href={upzFolderLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline font-medium"
                      >
                        <FolderCheck className="w-3.5 h-3.5" />
                        Folder Drive /{formState.upzFolderName || 'UPZ'}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {buktiFolderLink && (
                      <a
                        href={buktiFolderLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-700 hover:underline font-medium"
                      >
                        <FolderCheck className="w-3.5 h-3.5" />
                        Subfolder /{formState.upzFolderName || 'UPZ'}/Bukti
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {rekapitulasiFolderLink && (
                      <a
                        href={rekapitulasiFolderLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-amber-800 hover:underline font-medium"
                      >
                        <FolderCheck className="w-3.5 h-3.5" />
                        Subfolder /{formState.upzFolderName || 'UPZ'}/Rekapitulasi
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {driveError && (
                  <p className="text-xs text-red-600 font-medium">{driveError}</p>
                )}
              </div>

              {/* Drive Spreadsheet Picker list if scanned */}
              {(upzSpreadsheets.length > 0 || allDriveSpreadsheets.length > 0) && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Pilih File Google Spreadsheet dari Drive Anda
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDriveSourceTab('upz')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                          driveSourceTab === 'upz'
                            ? 'bg-emerald-700 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Folder {formState.upzFolderName || 'UPZ'} ({upzSpreadsheets.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDriveSourceTab('all')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                          driveSourceTab === 'all'
                            ? 'bg-emerald-700 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Semua di Drive Saya ({allDriveSpreadsheets.length})
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {(driveSourceTab === 'upz' ? upzSpreadsheets : allDriveSpreadsheets)
                      .length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Belum ada file Spreadsheet di kategori ini. Gunakan tombol &quot;Buat Spreadsheet Baru di Folder UPZ&quot; di bawah.
                      </div>
                    ) : (
                      (driveSourceTab === 'upz'
                        ? upzSpreadsheets
                        : allDriveSpreadsheets
                      ).map((file) => {
                        const isSelected =
                          extractSpreadsheetId(sheetInput) === file.id;
                        return (
                          <div
                            key={file.id}
                            className={`px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs ${
                              isSelected ? 'bg-emerald-50/80' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">
                                {file.name}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono-num truncate">
                                ID: {file.id}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSelectDriveSpreadsheet(file)}
                                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isSelected ? 'Terpilih' : 'Pilih Sheet'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectDriveSpreadsheet(file);
                                  onPullFromSpreadsheet(file.id);
                                }}
                                className="px-2.5 py-1 rounded font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer"
                              >
                                Tarik Data
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Direct URL / ID input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Link URL atau ID Google Spreadsheet Aktif
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    placeholder="Tempel URL Google Spreadsheet atau pilih dari Drive di atas..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  {extractSpreadsheetId(sheetInput) && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(
                        sheetInput
                      )}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    >
                      Buka
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onCreateNewSpreadsheet}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Buat Spreadsheet Baru di Folder {formState.upzFolderName || 'UPZ'}
                </button>

                {extractSpreadsheetId(sheetInput) && (
                  <button
                    type="button"
                    onClick={() =>
                      onPullFromSpreadsheet(extractSpreadsheetId(sheetInput))
                    }
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                    />
                    Tarik Data dari Spreadsheet Ini
                  </button>
                )}
              </div>

              {!isAuthenticated && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Catatan: Klik tombol <strong>Hubungkan Google Drive & Sheets</strong> di bagian bawah Sidebar kiri terlebih dahulu untuk memindai folder Drive pribadi Anda atau membuat Spreadsheet otomatis.
                </p>
              )}
            </div>
          </div>

          {/* 5. Data Arsip UPZ Al-Hasanah */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50 flex items-center gap-2.5">
              <Database className="w-4 h-4 text-slate-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  5. Data Arsip UPZ Al-Hasanah (2025 & 2026)
                </h3>
                <p className="text-xs text-slate-500">
                  Muat data arsip asli laporan zakat UPZ Al-Hasanah untuk simulasi atau referensi
                </p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onLoadSampleData('2026')}
                  className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                >
                  Muat Arsip Lengkap 2026 (1447 H — 94 Keluarga)
                </button>
                <button
                  type="button"
                  onClick={() => onLoadSampleData('2025')}
                  className="px-3 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                >
                  Muat Arsip Lengkap 2025 (1446 H — 81 Keluarga)
                </button>
                <button
                  type="button"
                  onClick={() => onLoadSampleData('sample')}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Muat Contoh Singkat (15 Keluarga)
                </button>
                <button
                  type="button"
                  onClick={() => onLoadSampleData('clear')}
                  className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                >
                  Kosongkan Tabel Lokal
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
