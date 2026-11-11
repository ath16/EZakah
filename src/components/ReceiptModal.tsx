import React from 'react';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { ZakatSettings, ZakatTransaction } from '../types/zakat';
import { formatBeras, formatDisplayDate, formatRupiah } from '../utils/zakatHelpers';

interface ReceiptModalProps {
  transaction: ZakatTransaction | null;
  settings: ZakatSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  settings,
  onClose,
}) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 no-print">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            Bukti Penerimaan Zakat (No. #{transaction.nomor})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Area */}
        <div className="p-6 space-y-4 text-slate-900">
          <div className="text-center border-b-2 border-emerald-800 pb-3">
            <h2 className="text-base font-bold uppercase tracking-wide text-emerald-900">
              {settings.namaLembaga}
            </h2>
            <p className="text-xs text-slate-600">
              Panitia Penerimaan & Penyaluran Zakat Ramadhan {settings.tahunHijriah} / {settings.tahunMasehi}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2.5">
            <div>
              <span className="text-slate-500">Nomor Urut:</span>{' '}
              <strong className="font-mono-num">#{transaction.nomor}</strong>
            </div>
            <div>
              <span className="text-slate-500">Tanggal:</span>{' '}
              <strong className="font-mono-num">{formatDisplayDate(transaction.tanggal)}</strong>
            </div>
            <div>
              <span className="text-slate-500">Metode:</span>{' '}
              <strong>{transaction.keterangan || 'Tunai'}</strong>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-700 block mb-1">
              Muzakki & Anggota Keluarga ({transaction.jiwa} Jiwa):
            </span>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              {transaction.familyMembers.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-mono-num text-slate-400 w-5">{i + 1}.</span>
                  <span className="font-medium text-slate-900">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-300 px-3 py-1.5 text-left">Jenis Penerimaan</th>
                <th className="border border-slate-300 px-3 py-1.5 text-right">Beras (Kg)</th>
                <th className="border border-slate-300 px-3 py-1.5 text-right">Uang (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5">Zakat Fitrah</td>
                <td className="border border-slate-300 px-3 py-1.5 text-right font-mono-num">
                  {formatBeras(transaction.fitrah.berasKg)}
                </td>
                <td className="border border-slate-300 px-3 py-1.5 text-right font-mono-num">
                  {formatRupiah(transaction.fitrah.uangRp, true)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5">Fidyah</td>
                <td className="border border-slate-300 px-3 py-1.5 text-right font-mono-num">
                  {formatBeras(transaction.fidyah.berasKg)}
                </td>
                <td className="border border-slate-300 px-3 py-1.5 text-right font-mono-num">
                  {formatRupiah(transaction.fidyah.uangRp, true)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5">Zakat Maal</td>
                <td className="border border-slate-300 px-3 py-1.5 text-right font-mono-num">-</td>
                <td className="border border-slate-300 px-3 py-1.5 text-right font-mono-num">
                  {formatRupiah(transaction.maal.uangRp, true)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5">Infaq / Sedekah</td>
                <td className="border border-slate-300 px-3 py-1.5 text-right font-mono-num">
                  {formatBeras(transaction.infaq.berasKg)}
                </td>
                <td className="border border-slate-300 px-3 py-1.5 text-right font-mono-num">
                  {formatRupiah(transaction.infaq.uangRp, true)}
                </td>
              </tr>
              <tr className="bg-emerald-50 font-bold text-emerald-950">
                <td className="border border-slate-300 px-3 py-2">SUB TOTAL DITERIMA</td>
                <td className="border border-slate-300 px-3 py-2 text-right font-mono-num">
                  {formatBeras(transaction.subTotal.berasKg)} Kg
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right font-mono-num">
                  {formatRupiah(transaction.subTotal.uangRp)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center space-y-1">
            <p className="text-xs italic text-slate-700 font-medium">
              &ldquo;Ājarakallāhu fīmā a&apos;thaita, wa bārakallāhu fīmā abqaita, wa ja&apos;alahu laka thahūran.&rdquo;
            </p>
            <p className="text-[11px] text-slate-500">
              Semoga Allah memberikan pahala atas apa yang engkau berikan, memberkahi harta yang engkau sisakan, dan menjadikannya pembersih bagimu.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-200 bg-slate-50 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Kuitansi
          </button>
        </div>
      </div>
    </div>
  );
};
