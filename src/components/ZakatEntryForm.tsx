import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  RotateCcw,
  Layers,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { ZakatSettings, ZakatTransaction } from '../types/zakat';
import { formatBeras, formatDisplayDate, formatRupiah } from '../utils/zakatHelpers';
import { uploadBuktiToDrive } from '../services/googleDrive';

interface ZakatEntryFormProps {
  settings: ZakatSettings;
  defaultDate: string;
  nextNomor: number;
  editingTransaction?: ZakatTransaction | null;
  accessToken: string | null;
  onTriggerLogin: () => void;
  onCancelEdit?: () => void;
  onSaveTransaction: (
    tx: Omit<ZakatTransaction, 'id' | 'nomor' | 'createdAt'>,
    existingId?: string
  ) => void;
  onUpdateDriveFolders?: (upzFolderId: string, buktiFolderId: string) => void;
  onOpenSettings: () => void;
}

type FitrahMode = 'uang' | 'beras' | 'custom' | 'none';
type MetodeSetoran = 'Tunai' | 'Beras' | 'QRIS/Transfer';

export const ZakatEntryForm: React.FC<ZakatEntryFormProps> = ({
  settings,
  defaultDate,
  nextNomor,
  editingTransaction,
  accessToken,
  onTriggerLogin,
  onCancelEdit,
  onSaveTransaction,
  onUpdateDriveFolders,
  onOpenSettings,
}) => {
  const [tanggal, setTanggal] = useState<string>(defaultDate);
  const [familyMembers, setFamilyMembers] = useState<string[]>(['']);
  const [manualJiwaOverride, setManualJiwaOverride] = useState<number | null>(null);
  const [fitrahMode, setFitrahMode] = useState<FitrahMode>('uang');

  const [fitrahBerasKg, setFitrahBerasKg] = useState<number>(0);
  const [fitrahUangRp, setFitrahUangRp] = useState<number>(settings.fitrahUangPerJiwaRp);

  // Fidyah with optional per-day automatic calculation
  const [fidyahHariCount, setFidyahHariCount] = useState<number>(0);
  const [fidyahMode, setFidyahMode] = useState<'none' | 'uang' | 'beras' | 'manual'>('none');
  const [fidyahBerasKg, setFidyahBerasKg] = useState<number>(0);
  const [fidyahUangRp, setFidyahUangRp] = useState<number>(0);

  const [maalUangRp, setMaalUangRp] = useState<number>(0);
  const [infaqBerasKg, setInfaqBerasKg] = useState<number>(0);
  const [infaqUangRp, setInfaqUangRp] = useState<number>(0);
  const [keterangan, setKeterangan] = useState<MetodeSetoran>('Tunai');

  // QRIS/Transfer Screenshot Proof State
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [buktiPreviewUrl, setBuktiPreviewUrl] = useState<string>('');
  const [buktiDriveUrl, setBuktiDriveUrl] = useState<string>('');
  const [buktiFileName, setBuktiFileName] = useState<string>('');
  const [isUploadingBukti, setIsUploadingBukti] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Helper calculator for "Total Uang Diserahkan Muzakki" -> Auto-fill Infaq
  const [uangDiserahkan, setUangDiserahkan] = useState<string>('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (editingTransaction) {
      setTanggal(editingTransaction.tanggal);
      setFamilyMembers(
        editingTransaction.familyMembers.length > 0
          ? [...editingTransaction.familyMembers]
          : ['']
      );
      setManualJiwaOverride(
        editingTransaction.jiwa !== editingTransaction.familyMembers.length
          ? editingTransaction.jiwa
          : null
      );
      if (
        editingTransaction.fitrah.uangRp > 0 &&
        editingTransaction.fitrah.berasKg === 0
      ) {
        setFitrahMode('uang');
      } else if (
        editingTransaction.fitrah.berasKg > 0 &&
        editingTransaction.fitrah.uangRp === 0
      ) {
        setFitrahMode('beras');
      } else if (
        editingTransaction.fitrah.berasKg === 0 &&
        editingTransaction.fitrah.uangRp === 0
      ) {
        setFitrahMode('none');
      } else {
        setFitrahMode('custom');
      }
      setFitrahBerasKg(editingTransaction.fitrah.berasKg);
      setFitrahUangRp(editingTransaction.fitrah.uangRp);
      setFidyahHariCount(editingTransaction.fidyah.jumlahHari || 0);
      setFidyahBerasKg(editingTransaction.fidyah.berasKg);
      setFidyahUangRp(editingTransaction.fidyah.uangRp);
      setMaalUangRp(editingTransaction.maal.uangRp);
      setInfaqBerasKg(editingTransaction.infaq.berasKg);
      setInfaqUangRp(editingTransaction.infaq.uangRp);
      const rawKet = editingTransaction.keterangan || 'Tunai';
      if (rawKet === 'QRIS' || rawKet === 'Transfer' || rawKet === 'QRIS/Transfer') {
        setKeterangan('QRIS/Transfer');
      } else if (rawKet === 'Beras') {
        setKeterangan('Beras');
      } else {
        setKeterangan('Tunai');
      }
      setBuktiDriveUrl(editingTransaction.buktiDriveUrl || '');
      setBuktiFileName(editingTransaction.buktiFileName || '');
      setBuktiFile(null);
      setBuktiPreviewUrl('');
      setUangDiserahkan('');
    }
  }, [editingTransaction]);

  const nonEmptyNamesCount = familyMembers.filter((n) => n.trim().length > 0).length;
  const activeJiwa =
    manualJiwaOverride !== null && manualJiwaOverride > 0
      ? manualJiwaOverride
      : Math.max(1, familyMembers.length);

  useEffect(() => {
    if (editingTransaction) return;
    if (fitrahMode === 'uang') {
      setFitrahUangRp(activeJiwa * settings.fitrahUangPerJiwaRp);
      setFitrahBerasKg(0);
    } else if (fitrahMode === 'beras') {
      setFitrahBerasKg(Number((activeJiwa * settings.fitrahBerasPerJiwaKg).toFixed(2)));
      setFitrahUangRp(0);
    } else if (fitrahMode === 'none') {
      setFitrahBerasKg(0);
      setFitrahUangRp(0);
    }
  }, [
    activeJiwa,
    fitrahMode,
    settings.fitrahUangPerJiwaRp,
    settings.fitrahBerasPerJiwaKg,
    editingTransaction,
  ]);

  const handleModeChange = (mode: FitrahMode) => {
    setFitrahMode(mode);
    if (mode === 'uang') {
      setFitrahUangRp(activeJiwa * settings.fitrahUangPerJiwaRp);
      setFitrahBerasKg(0);
    } else if (mode === 'beras') {
      setFitrahBerasKg(Number((activeJiwa * settings.fitrahBerasPerJiwaKg).toFixed(2)));
      setFitrahUangRp(0);
      setKeterangan('Beras');
    } else if (mode === 'none') {
      setFitrahBerasKg(0);
      setFitrahUangRp(0);
    }
  };

  const handleMetodeChange = (metode: MetodeSetoran) => {
    setKeterangan(metode);
    if (metode === 'Beras' && fitrahMode === 'uang') {
      handleModeChange('beras');
    } else if (metode === 'Tunai' && fitrahMode === 'beras') {
      handleModeChange('uang');
    }
  };

  const handleFidyahChange = (
    newHari: number,
    newMode: 'none' | 'uang' | 'beras' | 'manual'
  ) => {
    setFidyahHariCount(newHari);
    setFidyahMode(newMode);
    if (newMode === 'uang') {
      setFidyahUangRp(newHari * settings.fidyahUangPerHariRp);
      setFidyahBerasKg(0);
    } else if (newMode === 'beras') {
      setFidyahBerasKg(Number((newHari * settings.fidyahBerasPerHariKg).toFixed(2)));
      setFidyahUangRp(0);
    } else if (newMode === 'none') {
      setFidyahBerasKg(0);
      setFidyahUangRp(0);
    }
  };

  const handleMemberChange = (idx: number, val: string) => {
    const updated = [...familyMembers];
    updated[idx] = val;
    setFamilyMembers(updated);

    const newJiwa = manualJiwaOverride ?? Math.max(1, updated.length);
    if (fitrahMode === 'uang') {
      setFitrahUangRp(newJiwa * settings.fitrahUangPerJiwaRp);
    } else if (fitrahMode === 'beras') {
      setFitrahBerasKg(Number((newJiwa * settings.fitrahBerasPerJiwaKg).toFixed(2)));
    }
  };

  const handleAddMemberRow = (focusIndex?: number) => {
    const updated = [...familyMembers, ''];
    setFamilyMembers(updated);
    const newJiwa = manualJiwaOverride ?? updated.length;
    if (fitrahMode === 'uang') {
      setFitrahUangRp(newJiwa * settings.fitrahUangPerJiwaRp);
    } else if (fitrahMode === 'beras') {
      setFitrahBerasKg(Number((newJiwa * settings.fitrahBerasPerJiwaKg).toFixed(2)));
    }
    setTimeout(() => {
      const targetIdx = focusIndex !== undefined ? focusIndex : updated.length - 1;
      inputRefs.current[targetIdx]?.focus();
    }, 30);
  };

  const handleRemoveMemberRow = (idx: number) => {
    if (familyMembers.length <= 1) {
      setFamilyMembers(['']);
      return;
    }
    const updated = familyMembers.filter((_, i) => i !== idx);
    setFamilyMembers(updated);
    const newJiwa = manualJiwaOverride ?? updated.length;
    if (fitrahMode === 'uang') {
      setFitrahUangRp(newJiwa * settings.fitrahUangPerJiwaRp);
    } else if (fitrahMode === 'beras') {
      setFitrahBerasKg(Number((newJiwa * settings.fitrahBerasPerJiwaKg).toFixed(2)));
    }
  };

  const handleKeyDownName = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMemberRow(idx + 1);
    }
  };

  // Handle QRIS/Transfer Screenshot file selection & immediate Drive upload
  const handleSelectBuktiFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBuktiFile(file);
    setBuktiFileName(file.name);
    setUploadError('');

    const objectUrl = URL.createObjectURL(file);
    setBuktiPreviewUrl(objectUrl);

    if (accessToken) {
      await performBuktiUpload(file);
    }
  };

  const performBuktiUpload = async (fileToUpload?: File) => {
    const targetFile = fileToUpload || buktiFile;
    if (!targetFile || !accessToken) return;

    setIsUploadingBukti(true);
    setUploadError('');
    try {
      const primaryMuzakki =
        familyMembers[0]?.trim() || `Muzakki_No_${nextNomor}`;
      const uploaded = await uploadBuktiToDrive(
        accessToken,
        targetFile,
        primaryMuzakki,
        formatDisplayDate(tanggal),
        settings.upzFolderName || 'UPZ'
      );
      setBuktiDriveUrl(uploaded.webViewLink);
      setBuktiFileName(uploaded.fileName);
      if (onUpdateDriveFolders) {
        onUpdateDriveFolders(uploaded.upzFolderId, uploaded.buktiFolderId);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal mengunggah bukti ke folder UPZ/Bukti di Google Drive.';
      setUploadError(msg);
    } finally {
      setIsUploadingBukti(false);
    }
  };

  const subTotalBeras = Number(
    (fitrahBerasKg + fidyahBerasKg + infaqBerasKg).toFixed(2)
  );
  const subTotalUang = fitrahUangRp + fidyahUangRp + maalUangRp + infaqUangRp;

  const baseZakatUang = fitrahUangRp + fidyahUangRp + maalUangRp;
  const parsedDiserahkan =
    parseInt(uangDiserahkan.replace(/[^0-9]/g, ''), 10) || 0;
  const selisihInfaqOtomatis =
    parsedDiserahkan > baseZakatUang ? parsedDiserahkan - baseZakatUang : 0;

  const applySelisihToInfaq = () => {
    if (selisihInfaqOtomatis > 0) {
      setInfaqUangRp(selisihInfaqOtomatis);
    }
  };

  const resetForm = () => {
    setFamilyMembers(['']);
    setManualJiwaOverride(null);
    setFitrahMode('uang');
    setFitrahBerasKg(0);
    setFitrahUangRp(settings.fitrahUangPerJiwaRp);
    setFidyahHariCount(0);
    setFidyahMode('none');
    setFidyahBerasKg(0);
    setFidyahUangRp(0);
    setMaalUangRp(0);
    setInfaqBerasKg(0);
    setInfaqUangRp(0);
    setKeterangan('Tunai');
    setBuktiFile(null);
    setBuktiPreviewUrl('');
    setBuktiDriveUrl('');
    setBuktiFileName('');
    setUploadError('');
    setUangDiserahkan('');
    if (onCancelEdit) onCancelEdit();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedNames = familyMembers.map((n) => n.trim()).filter(Boolean);
    const finalNames = cleanedNames.length > 0 ? cleanedNames : ['Hamba Allah'];
    const finalJiwa =
      manualJiwaOverride !== null && manualJiwaOverride > 0
        ? manualJiwaOverride
        : finalNames.length;

    onSaveTransaction(
      {
        tanggal,
        jiwa: finalJiwa,
        familyMembers: finalNames,
        fitrah: {
          berasKg: Number(fitrahBerasKg) || 0,
          uangRp: Number(fitrahUangRp) || 0,
        },
        fidyah: {
          jumlahHari: fidyahHariCount || undefined,
          berasKg: Number(fidyahBerasKg) || 0,
          uangRp: Number(fidyahUangRp) || 0,
        },
        maal: {
          uangRp: Number(maalUangRp) || 0,
        },
        infaq: {
          berasKg: Number(infaqBerasKg) || 0,
          uangRp: Number(infaqUangRp) || 0,
        },
        subTotal: {
          berasKg: subTotalBeras,
          uangRp: subTotalUang,
        },
        keterangan,
        buktiDriveUrl: buktiDriveUrl || undefined,
        buktiFileName: buktiFileName || undefined,
        synced: false,
      },
      editingTransaction?.id
    );

    resetForm();
  };

  const quickPaymentOptions = React.useMemo(() => {
    if (baseZakatUang <= 0) return [];
    const options = new Set<number>();
    const ceil50k = Math.ceil(baseZakatUang / 50000) * 50000;
    const ceil100k = Math.ceil(baseZakatUang / 100000) * 100000;
    if (ceil50k > baseZakatUang) options.add(ceil50k);
    if (ceil100k > baseZakatUang) options.add(ceil100k);
    if (ceil100k + 50000 > baseZakatUang) options.add(ceil100k + 50000);
    if (ceil100k + 100000 > baseZakatUang) options.add(ceil100k + 100000);
    return Array.from(options).slice(0, 3);
  }, [baseZakatUang]);

  const previewNames = familyMembers.map((n) => n.trim()).filter(Boolean);
  const displayPreviewNames =
    previewNames.length > 0 ? previewNames : ['(Nama Muzakki)'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Cols: Input Penerimaan Zakat Baru */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingTransaction
                ? `Edit Penerimaan Zakat (No. #${editingTransaction.nomor})`
                : `Input Penerimaan Zakat Baru (No. #${nextNomor})`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fitrah: <span className="font-mono-num font-semibold text-slate-700">{formatRupiah(settings.fitrahUangPerJiwaRp)}</span> / <span className="font-mono-num font-semibold text-slate-700">{settings.fitrahBerasPerJiwaKg} Kg</span> · Fidyah: <span className="font-mono-num font-semibold text-slate-700">{formatRupiah(settings.fidyahUangPerHariRp)}</span> / hari
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
          >
            Atur Ketetapan Kemenag
          </button>
        </div>

        {/* Row 1: Tanggal & Metode Setoran (Tunai, Beras, QRIS/Transfer) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tanggal Penerimaan
            </label>
            <input
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono-num"
            />
            <p className="text-xs text-slate-500 mt-1">
              Label di Sheet: <span className="font-mono-num font-medium text-slate-700">{formatDisplayDate(tanggal)}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Metode Setoran Zakat
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['Tunai', 'Beras', 'QRIS/Transfer'] as MetodeSetoran[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMetodeChange(m)}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    keterangan === m
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Upload Bukti SS / Foto khusus untuk QRIS/Transfer -> Masuk ke Folder UPZ/Bukti di Google Drive */}
        {keterangan === 'QRIS/Transfer' && (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-700" />
                  Unggah Bukti Screenshot / Foto QRIS atau Transfer
                </h3>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  File bukti akan otomatis diunggah ke folder <strong className="font-mono">{settings.upzFolderName || 'UPZ'} / Bukti</strong> di Google Drive pribadi Anda.
                </p>
              </div>
              {!accessToken && (
                <button
                  type="button"
                  onClick={onTriggerLogin}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  Login Google Drive
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>{buktiFile ? 'Ganti Foto Bukti' : 'Pilih Screenshot / Foto Bukti'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSelectBuktiFile}
                  className="hidden"
                />
              </label>

              {isUploadingBukti && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Mengunggah ke Drive ({settings.upzFolderName || 'UPZ'}/Bukti)...
                </span>
              )}

              {buktiDriveUrl && !isUploadingBukti && (
                <a
                  href={buktiDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tersimpan di Drive ({buktiFileName || 'Lihat Bukti'})
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {buktiFile && !buktiDriveUrl && !isUploadingBukti && accessToken && (
                <button
                  type="button"
                  onClick={() => performBuktiUpload()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  Unggah Sekarang ke Drive
                </button>
              )}
            </div>

            {uploadError && (
              <p className="text-xs text-red-600 font-medium">{uploadError}</p>
            )}

            {buktiPreviewUrl && (
              <div className="pt-1">
                <img
                  src={buktiPreviewUrl}
                  alt="Preview Bukti QRIS/Transfer"
                  referrerPolicy="no-referrer"
                  className="h-28 w-auto object-contain rounded-lg border border-emerald-200 bg-white p-1"
                />
              </div>
            )}
          </div>
        )}

        {/* Row 2: Multi-Nama Keluarga (Auto-Merge Rows) */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-800">
                Daftar Nama Muzakki / Anggota Keluarga ({activeJiwa} Jiwa)
              </label>
              <p className="text-xs text-slate-500">
                Jika lebih dari 1 nama, kolom Nomor, Jiwa, Zakat, dan Sub Total otomatis di-merge di Spreadsheet.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAddMemberRow()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Nama
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {familyMembers.map((member, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-7 text-center text-xs font-mono-num font-semibold text-slate-400 select-none">
                  {idx + 1}.
                </span>
                <input
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  value={member}
                  onChange={(e) => handleMemberChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDownName(e, idx)}
                  placeholder={
                    idx === 0
                      ? 'Nama Kepala Keluarga / Muzakki Utama (Tekan Enter untuk tambah anggota)'
                      : `Nama Anggota Keluarga ke-${idx + 1}`
                  }
                  className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {familyMembers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMemberRow(idx)}
                    title="Hapus baris nama"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-600">
            <span>
              Terdeteksi <strong className="font-mono-num text-slate-900">{nonEmptyNamesCount || 1}</strong> baris nama
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="override-jiwa" className="text-slate-500">
                Jumlah Jiwa:
              </label>
              <input
                id="override-jiwa"
                type="number"
                min={1}
                max={50}
                value={manualJiwaOverride ?? familyMembers.length}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) {
                    setManualJiwaOverride(val);
                  } else {
                    setManualJiwaOverride(null);
                  }
                }}
                className="w-16 px-2 py-1 text-center font-mono-num font-semibold border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Jenis Zakat Fitrah */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-800">
              1. Zakat Fitrah (Otomatis sesuai {activeJiwa} Jiwa)
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                { id: 'uang', label: 'Fitrah Uang (Rp)' },
                { id: 'beras', label: 'Fitrah Beras (Kg)' },
                { id: 'custom', label: 'Campuran / Manual' },
                { id: 'none', label: 'Tanpa Fitrah' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleModeChange(tab.id as FitrahMode)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    fitrahMode === tab.id
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Fitrah Beras (Kg) — <span className="font-mono-num">{activeJiwa} × {settings.fitrahBerasPerJiwaKg} Kg</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fitrahBerasKg || ''}
                  onChange={(e) => {
                    setFitrahMode('custom');
                    setFitrahBerasKg(parseFloat(e.target.value) || 0);
                  }}
                  placeholder="0,00"
                  className="w-full px-3.5 py-2 pr-10 text-sm bg-white border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">
                  Kg
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Fitrah Uang (Rp) — <span className="font-mono-num">{activeJiwa} × {formatRupiah(settings.fitrahUangPerJiwaRp)}</span>
              </label>
              <input
                type="number"
                step="500"
                min="0"
                value={fitrahUangRp || ''}
                onChange={(e) => {
                  setFitrahMode('custom');
                  setFitrahUangRp(parseInt(e.target.value, 10) || 0);
                }}
                placeholder="0"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Row 4: Fidyah (Otomatis Per Hari sesuai Pengaturan Kemenag), Maal, Infaq */}
        <div className="space-y-4 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                2. Fidyah ({formatRupiah(settings.fidyahUangPerHariRp)} atau {settings.fidyahBerasPerHariKg} Kg / hari)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Jumlah Hari Fidyah:</span>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={fidyahHariCount || ''}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10) || 0;
                    const nextMode =
                      days > 0
                        ? fidyahMode === 'none'
                          ? 'uang'
                          : fidyahMode
                        : 'none';
                    handleFidyahChange(days, nextMode);
                  }}
                  placeholder="0 hari"
                  className="w-20 px-2.5 py-1 text-xs font-mono-num font-semibold bg-white border border-slate-300 rounded-md"
                />
                {fidyahHariCount > 0 && (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => handleFidyahChange(fidyahHariCount, 'uang')}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer ${
                        fidyahMode === 'uang'
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      Uang
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFidyahChange(fidyahHariCount, 'beras')}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer ${
                        fidyahMode === 'beras'
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      Beras
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Fidyah Beras (Kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={fidyahBerasKg || ''}
                  onChange={(e) => {
                    setFidyahMode('manual');
                    setFidyahBerasKg(parseFloat(e.target.value) || 0);
                  }}
                  placeholder="0,00 Kg"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Fidyah Uang (Rp)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={fidyahUangRp || ''}
                  onChange={(e) => {
                    setFidyahMode('manual');
                    setFidyahUangRp(parseInt(e.target.value, 10) || 0);
                  }}
                  placeholder="Rp 0"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                3. Zakat Maal (Uang Rp)
              </label>
              <input
                type="number"
                step="5000"
                min="0"
                value={maalUangRp || ''}
                onChange={(e) => setMaalUangRp(parseInt(e.target.value, 10) || 0)}
                placeholder="Rp 0"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                4. Infaq Beras (Kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={infaqBerasKg || ''}
                onChange={(e) => setInfaqBerasKg(parseFloat(e.target.value) || 0)}
                placeholder="0,00 Kg"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Infaq Uang (Rp)
              </label>
              <input
                type="number"
                step="500"
                min="0"
                value={infaqUangRp || ''}
                onChange={(e) => setInfaqUangRp(parseInt(e.target.value, 10) || 0)}
                placeholder="Rp 0"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Quick Helper: Pembulatan Uang Diterima -> Infaq */}
          {baseZakatUang > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                  Kalkulator Kelebihan Bayar ke Infaq (Pokok: <strong className="font-mono-num">{formatRupiah(baseZakatUang)}</strong>):
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {quickPaymentOptions.map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => {
                        setUangDiserahkan(String(nom));
                        setInfaqUangRp(nom - baseZakatUang);
                      }}
                      className="px-2.5 py-1 text-xs font-mono-num font-semibold bg-white border border-slate-300 hover:border-emerald-600 hover:text-emerald-700 rounded-md transition-colors cursor-pointer"
                    >
                      Bayar {formatRupiah(nom)} (+Infaq {formatRupiah(nom - baseZakatUang)})
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={uangDiserahkan}
                  onChange={(e) => setUangDiserahkan(e.target.value)}
                  placeholder="Ketik total uang diserahkan muzakki (misal 200000)..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono-num"
                />
                {selisihInfaqOtomatis > 0 && (
                  <button
                    type="button"
                    onClick={applySelisihToInfaq}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-md hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
                  >
                    Jadikan Infaq {formatRupiah(selisihInfaqOtomatis)}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {editingTransaction ? 'Batal Edit' : 'Reset Form'}
          </button>

          <button
            type="submit"
            disabled={isUploadingBukti}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {editingTransaction
              ? 'Simpan Perubahan Transaksi'
              : 'Simpan & Merge Baris Otomatis'}
          </button>
        </div>
      </form>

      {/* Right 5 Cols: Ringkasan Kalkulasi Otomatis & Preview */}
      <div className="lg:col-span-5 space-y-5">
        {/* Ringkasan Kalkulasi Otomatis */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Ringkasan Kalkulasi Otomatis
            </h3>
            <span className="text-xs text-slate-500 font-mono-num">
              {activeJiwa} Jiwa · {displayPreviewNames.length} Baris · {keterangan}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="text-xs text-slate-500 block">Sub Total Beras</span>
              <span className="text-xl font-bold text-slate-900 font-mono-num mt-0.5 block">
                {formatBeras(subTotalBeras)} Kg
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Fitrah {formatBeras(fitrahBerasKg)} · Fidyah {formatBeras(fidyahBerasKg)} · Infaq {formatBeras(infaqBerasKg)}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-lg border border-emerald-200">
              <span className="text-xs text-emerald-800 block">Sub Total Uang</span>
              <span className="text-xl font-bold text-emerald-900 font-mono-num mt-0.5 block">
                {formatRupiah(subTotalUang)}
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block">
                Fitrah {formatRupiah(fitrahUangRp)} · Lainnya {formatRupiah(fidyahUangRp + maalUangRp + infaqUangRp)}
              </span>
            </div>
          </div>
        </div>

        {/* Preview Hasil Merge Sel di Spreadsheet */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-700" />
                Preview Hasil Merge Sel di Spreadsheet
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulasi tampilan penggabungan otomatis ({displayPreviewNames.length} baris vertikal)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-700 text-white font-semibold text-center">
                  <th className="border border-emerald-800 px-2 py-1.5">No</th>
                  <th className="border border-emerald-800 px-2 py-1.5">Tanggal</th>
                  <th className="border border-emerald-800 px-2 py-1.5">Jiwa</th>
                  <th className="border border-emerald-800 px-2.5 py-1.5 text-left">Nama</th>
                  <th className="border border-emerald-800 px-2 py-1.5">Fitrah</th>
                  <th className="border border-emerald-800 px-2 py-1.5">Infaq/Lain</th>
                  <th className="border border-emerald-800 px-2 py-1.5">Sub Total</th>
                </tr>
              </thead>
              <tbody>
                {displayPreviewNames.map((name, idx) => {
                  const rowSpan = displayPreviewNames.length;
                  return (
                    <tr key={idx} className="bg-white hover:bg-slate-50">
                      {idx === 0 && (
                        <>
                          <td
                            rowSpan={rowSpan}
                            className="border border-slate-300 px-2 py-1.5 text-center font-mono-num font-semibold align-middle bg-slate-50/50"
                          >
                            {editingTransaction ? editingTransaction.nomor : nextNomor}
                          </td>
                          <td
                            rowSpan={rowSpan}
                            className="border border-slate-300 px-2 py-1.5 text-center font-mono-num align-middle whitespace-nowrap bg-slate-50/50"
                          >
                            {formatDisplayDate(tanggal)}
                          </td>
                          <td
                            rowSpan={rowSpan}
                            className="border border-slate-300 px-2 py-1.5 text-center font-mono-num font-bold align-middle bg-slate-50/50"
                          >
                            {activeJiwa}
                          </td>
                        </>
                      )}
                      <td className="border border-slate-300 px-2.5 py-1.5 font-medium text-slate-900">
                        {name}
                      </td>
                      {idx === 0 && (
                        <>
                          <td
                            rowSpan={rowSpan}
                            className="border border-slate-300 px-2 py-1.5 text-right font-mono-num align-middle whitespace-nowrap bg-slate-50/50"
                          >
                            {fitrahBerasKg > 0 && <div>{formatBeras(fitrahBerasKg)} Kg</div>}
                            {fitrahUangRp > 0 && <div>{formatRupiah(fitrahUangRp)}</div>}
                            {fitrahBerasKg === 0 && fitrahUangRp === 0 && '-'}
                          </td>
                          <td
                            rowSpan={rowSpan}
                            className="border border-slate-300 px-2 py-1.5 text-right font-mono-num align-middle whitespace-nowrap bg-slate-50/50"
                          >
                            {fidyahUangRp + maalUangRp + infaqUangRp > 0 ? (
                              <div>{formatRupiah(fidyahUangRp + maalUangRp + infaqUangRp)}</div>
                            ) : null}
                            {fidyahBerasKg + infaqBerasKg > 0 ? (
                              <div>{formatBeras(fidyahBerasKg + infaqBerasKg)} Kg</div>
                            ) : null}
                            {fidyahUangRp + maalUangRp + infaqUangRp === 0 &&
                              fidyahBerasKg + infaqBerasKg === 0 &&
                              '-'}
                          </td>
                          <td
                            rowSpan={rowSpan}
                            className="border border-slate-300 px-2 py-1.5 text-right font-mono-num font-bold text-emerald-800 align-middle whitespace-nowrap bg-emerald-50/40"
                          >
                            {subTotalBeras > 0 && <div>{formatBeras(subTotalBeras)} Kg</div>}
                            <div>{formatRupiah(subTotalUang, true)}</div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">
            Sel dengan latar abu-abu lembut & hijau otomatis digabung (<code className="font-mono">mergeCells</code>) secara vertikal mengikuti jumlah anggota keluarga.
          </p>
        </div>
      </div>
    </div>
  );
};
