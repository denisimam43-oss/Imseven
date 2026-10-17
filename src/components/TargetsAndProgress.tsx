import React, { useMemo, useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { formatRupiah, cn } from "../utils";
import { Target, Settings2, CheckCircle, AlertCircle } from "lucide-react";
import { accountShares, inflowTo, isRealIncome } from "../finance";
import { inPeriod, fmtDay } from "../calendar";
import { computePeriodRecap } from "../plan";

function Line({ label, value, bold, sub }: { label: string; value: string; bold?: boolean; sub?: string }) {
  return (
    <div className={cn("flex justify-between items-baseline gap-3 py-1", bold && "border-t border-slate-200 pt-2 mt-1")}>
      <span className={cn("text-xs", bold ? "font-bold text-slate-800" : "text-slate-600")}>
        {label}
        {sub && <span className="block text-[10px] text-slate-400">{sub}</span>}
      </span>
      <span className={cn("font-mono text-sm", bold ? "font-bold text-slate-900" : "font-semibold text-slate-700")}>{value}</span>
    </div>
  );
}

function Bar({ pct, done }: { pct: number; done: boolean }) {
  return (
    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={cn("h-full transition-all", done ? "bg-emerald-500" : "bg-navy-600")} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export function TargetsAndProgress() {
  const { settings, updateSettings, marketTarget: mt, transactions, debt, projects, currentPeriod: cp } = useFinance();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    monthlyExpense: String(settings.monthlyExpense),
    monthlyOffice: String(settings.monthlyOffice),
    avgProjectValue: String(settings.avgProjectValue || ""),
    recoveryMonths: String(settings.recoveryMonths),
    slotValue: String(settings.slotValue),
    slotsPerPeriod: String(settings.slotsPerPeriod),
  });
  const s = settings.shares;

  const month = useMemo(() => {
    const tx = transactions.filter((t) => inPeriod(cp, t.date));
    const cashIn = tx.filter(isRealIncome).reduce((x, t) => x + t.amount, 0);
    const rek3In = inflowTo(tx, "REK3");
    const p = accountShares(s);
    const rek3Pct = p.REK3 * 100 || 1;
    const fixedCovered = (rek3In * (s.expense + s.ops)) / rek3Pct;
    return { cashIn, fixedCovered };
  }, [transactions, s, cp]);
  const recap = useMemo(
    () => computePeriodRecap(cp, projects, transactions, settings),
    [cp, projects, transactions, settings],
  );
  const dealPct = mt.totalTarget > 0 ? (recap.dealValue / mt.totalTarget) * 100 : 0;

  const salesPct = mt.totalTarget > 0 ? (month.cashIn / mt.totalTarget) * 100 : 0;
  const fixedPct = mt.fixedNeed > 0 ? (month.fixedCovered / mt.fixedNeed) * 100 : 0;

  const save = () => {
    updateSettings({
      monthlyExpense: Number(form.monthlyExpense) || 0,
      monthlyOffice: Number(form.monthlyOffice) || 0,
      avgProjectValue: Number(form.avgProjectValue) || 0,
      recoveryMonths: Math.max(1, Number(form.recoveryMonths) || 1),
      slotValue: Number(form.slotValue) || settings.slotValue,
      slotsPerPeriod: Math.max(1, Number(form.slotsPerPeriod) || settings.slotsPerPeriod),
    });
    setEditing(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Target size={20} />
          </span>
          <div>
            <h4 className="font-bold text-slate-800">Target Periode {cp.label}</h4>
            <p className="text-xs text-slate-500 font-medium">
              Periode cut-off {fmtDay(cp.start)} – {fmtDay(cp.end)} · {cp.workdays} hari kerja · kapasitas {mt.capacitySlots} slot
              × {formatRupiah(settings.slotValue)}.
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 self-start"
        >
          <Settings2 size={14} /> Atur angka
        </button>
      </div>

      {editing && (
        <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {(
            [
              ["monthlyExpense", "Expense tetap / bulan (Rp)"],
              ["monthlyOffice", "Operasional kantor / bulan (Rp)"],
              ["avgProjectValue", "Rata-rata nilai proyek (kosong = otomatis)"],
              ["recoveryMonths", "Target lubang lunas (bulan)"],
              ["slotValue", "Nilai 1 slot (Rp)"],
              ["slotsPerPeriod", "Kapasitas slot / periode penuh"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <span className="block font-bold text-slate-600 mb-1">{label}</span>
              <input
                type="number"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono bg-white"
              />
            </label>
          ))}
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              Porsi alokasi: Bahan {s.bahan}% • Labour {s.labour}% • Ops {s.ops}% • Kontingensi {s.kontingensi}% • Prive{" "}
              {s.prive}% • Expense {s.expense}% • Profit {s.profit}%
            </p>
            <button onClick={save} className="px-4 py-2 bg-navy-600 text-white rounded-lg font-bold">
              Simpan
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <Line label="Expense tetap / bulan" value={formatRupiah(settings.monthlyExpense)} />
          <Line label="Operasional kantor / bulan" value={formatRupiah(settings.monthlyOffice)} />
          <Line
            label="Omset untuk biaya tetap"
            sub={`${formatRupiah(mt.fixedNeed)} ÷ porsi expense + ops (${(mt.coverPct * 100).toFixed(0)}%)`}
            value={formatRupiah(mt.baseTarget)}
            bold
          />
          {debt.totalHole > 0 && (
            <Line
              label="+ Omset untuk cicilan lubang utang project"
              sub={`${formatRupiah(debt.totalHole)} ÷ ${settings.recoveryMonths} bln = ${formatRupiah(mt.monthlyRecovery)}/bln ÷ porsi profit ${s.profit}%`}
              value={formatRupiah(mt.recoveryTarget)}
            />
          )}
          <Line label="Batas minimum (impas + cicilan lubang)" value={formatRupiah(mt.minimumTarget)} bold />
          <Line
            label={`TARGET PERIODE (${mt.capacitySlots} slot)`}
            sub={`${cp.workdays} dari ${settings.baseWorkdays} hari kerja × ${settings.slotsPerPeriod} slot penuh`}
            value={formatRupiah(mt.totalTarget)}
            bold
          />
          {mt.belowMinimum && (
            <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 mt-2">
              Kapasitas periode ini di bawah batas minimum. Tambah slot (lembur / proyek bernilai lebih besar) atau tunda
              pengeluaran yang bisa ditunda.
            </p>
          )}
          {mt.avgProjectValue > 0 && (
            <p className="text-xs text-slate-600 mt-2">
              ≈ <b>{mt.projectsNeeded} proyek</b> dengan rata-rata nilai {formatRupiah(mt.avgProjectValue)}. Deal terakhir agar
              panen di periode ini: Reguler <b>{fmtDay(cp.dealRegulerBy)}</b>, Premium <b>{fmtDay(cp.dealPremiumBy)}</b>.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex justify-between items-baseline text-xs mb-1.5">
              <span className="font-bold text-slate-700">Deal baru (DP masuk) periode ini</span>
              <span className="font-mono">
                <b>{recap.dealSlots.toFixed(1)} slot</b> · {formatRupiah(recap.dealValue)}{" "}
                <span className="text-slate-400">/ {formatRupiah(mt.totalTarget)}</span>
              </span>
            </div>
            <Bar pct={dealPct} done={dealPct >= 100} />
            <p className="text-[11px] mt-1.5 text-slate-500">
              {recap.deals.length} proyek baru. Nilai kontrak dihitung penuh pada periode DP masuk.
            </p>
          </div>
          <div>
            <div className="flex justify-between items-baseline text-xs mb-1.5">
              <span className="font-bold text-slate-700">Uang masuk klien periode ini</span>
              <span className="font-mono">
                <b>{formatRupiah(month.cashIn)}</b> <span className="text-slate-400">/ {formatRupiah(mt.totalTarget)}</span>
              </span>
            </div>
            <Bar pct={salesPct} done={salesPct >= 100} />
            <p className="text-[11px] mt-1.5 flex items-center gap-1 text-slate-600">
              {salesPct >= 100 ? <CheckCircle size={13} className="text-emerald-500" /> : <AlertCircle size={13} className="text-navy-500" />}
              {salesPct >= 100
                ? "Target omset tercapai."
                : `Kurang ${formatRupiah(mt.totalTarget - month.cashIn)} (${salesPct.toFixed(0)}% tercapai).`}
            </p>
          </div>

          <div>
            <div className="flex justify-between items-baseline text-xs mb-1.5">
              <span className="font-bold text-slate-700">Biaya tetap yang sudah tertutup</span>
              <span className="font-mono">
                <b>{formatRupiah(month.fixedCovered)}</b> <span className="text-slate-400">/ {formatRupiah(mt.fixedNeed)}</span>
              </span>
            </div>
            <Bar pct={fixedPct} done={fixedPct >= 100} />
            <p className="text-[11px] mt-1.5 text-slate-500">
              Dari porsi expense + ops yang masuk Rek 3 periode ini. Pelunasan utang project lebih banyak masuk Rek 2
              (waterfall), jadi porsinya ke biaya tetap lebih kecil.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
