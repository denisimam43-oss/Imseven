import React, { useMemo, useState } from "react";
import { Landmark, X } from "lucide-react";
import { useFinance } from "../store/FinanceContext";
import { ACCOUNTS, computeBalancesAsOf } from "../finance";
import { shiftPeriod } from "../calendar";
import { REKENING_LABEL, RekeningType } from "../types";
import { formatDate, formatRupiah, fromDateInput, toDateInput } from "../utils";

const inputCls =
  "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-navy-500";

/**
 * Saldo pembukaan: menyamakan saldo 4 rekening di aplikasi dengan saldo bank pada satu
 * tanggal (default: akhir periode sebelumnya, yaitu tanggal 25). Selisihnya dicatat sebagai
 * penyesuaian bertanda "pembukaan", bukan omset atau biaya.
 */
export function OpeningBalance() {
  const { transactions, settings, setOpeningBalances, currentPeriod } = useFinance();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const defaultDate = settings.openingDate ?? shiftPeriod(currentPeriod, -1).end.getTime();
  const [dateStr, setDateStr] = useState(toDateInput(defaultDate));
  const [values, setValues] = useState<Record<RekeningType, string>>({ REK1: "", REK2: "", REK3: "", REK4: "" });

  const dateTs = fromDateInput(dateStr);

  // Saldo aplikasi pada tanggal tersebut, tanpa pembukaan lama (supaya selisih tidak berputar).
  const appBalances = useMemo(
    () => computeBalancesAsOf(transactions.filter((t) => !t.isOpening), dateTs),
    [transactions, dateTs],
  );

  const parsed = (k: RekeningType) => {
    const raw = values[k].replace(/[^\d-]/g, "");
    return raw === "" || raw === "-" ? null : Number(raw);
  };
  const allFilled = ACCOUNTS.every((k) => parsed(k) !== null);

  const save = () => {
    if (!allFilled) return;
    const targets = Object.fromEntries(ACCOUNTS.map((k) => [k, parsed(k) as number])) as Record<
      RekeningType,
      number
    >;
    const totalDiff = ACCOUNTS.reduce((s, k) => s + (targets[k] - appBalances[k]), 0);
    const ok = window.confirm(
      `Samakan saldo aplikasi dengan saldo bank per ${formatDate(dateTs, "dd MMM yyyy")}?\n` +
        `Selisih total ${formatRupiah(totalDiff)} akan dicatat sebagai "Saldo Pembukaan" ` +
        `(bukan omset atau biaya). Pastikan angka diambil dari mutasi bank.`,
    );
    if (!ok) return;
    const res = setOpeningBalances(dateTs, targets);
    setMessage({ ok: res.ok, text: res.message });
    if (res.ok) setOpen(false);
  };

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <button
          onClick={() => {
            setMessage(null);
            setOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-navy-50 hover:text-navy-700 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors uppercase tracking-wider"
          title="Samakan saldo aplikasi dengan saldo bank pada satu tanggal"
        >
          <Landmark size={13} />
          Saldo Pembukaan
        </button>
        {settings.openingDate && (
          <p className="text-[10px] text-slate-500">
            Terakhir diisi untuk tanggal {formatDate(settings.openingDate, "dd MMM yyyy")}
          </p>
        )}
        {message && !open && (
          <p className={`text-[10px] font-semibold ${message.ok ? "text-emerald-600" : "text-rose-600"}`}>
            {message.text}
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Saldo Pembukaan</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Isi saldo bank tiap rekening pada tanggal di bawah. Selisih dengan aplikasi dicatat
                  sebagai penyesuaian, bukan omset atau biaya.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700" title="Tutup">
                <X size={18} />
              </button>
            </div>

            <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal saldo bank</label>
            <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className={inputCls} />

            <div className="mt-4 space-y-3">
              {ACCOUNTS.map((k) => {
                const target = parsed(k);
                const diff = target === null ? null : target - appBalances[k];
                return (
                  <div key={k}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">{REKENING_LABEL[k]}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={values[k]}
                      onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                      className={inputCls}
                      placeholder="Saldo bank (Rp)"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Saldo di aplikasi: {formatRupiah(appBalances[k])}
                      {diff !== null && diff !== 0 && (
                        <span className={diff > 0 ? " text-emerald-600 font-semibold" : " text-rose-600 font-semibold"}>
                          {" "}
                          · selisih {diff > 0 ? "+" : "-"}
                          {formatRupiah(Math.abs(diff))}
                        </span>
                      )}
                      {diff === 0 && <span className="text-emerald-600 font-semibold"> · sudah cocok</span>}
                    </p>
                  </div>
                );
              })}
            </div>

            {message && !message.ok && <p className="text-xs font-semibold text-rose-600 mt-3">{message.text}</p>}

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                Batal
              </button>
              <button
                onClick={save}
                disabled={!allFilled}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl disabled:opacity-40"
              >
                Simpan saldo pembukaan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
