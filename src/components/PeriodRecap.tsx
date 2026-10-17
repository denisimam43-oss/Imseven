import React, { useMemo, useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { formatRupiah, cn } from "../utils";
import { computePeriodRecap, forecast } from "../plan";
import { fmtDay, inPeriod, shiftPeriod } from "../calendar";
import { BookLock, ChevronLeft, ChevronRight, Lock, LockOpen } from "lucide-react";

function Row({ label, value, bold, neg, hint }: { label: string; value: number; bold?: boolean; neg?: boolean; hint?: string }) {
  return (
    <div className={cn("flex justify-between items-baseline gap-3 py-1", bold && "border-t border-slate-200 pt-2 mt-1")}>
      <span className={cn("text-xs", bold ? "font-bold text-slate-800" : "text-slate-600")}>
        {label}
        {hint && <span className="block text-[10px] text-slate-400 font-normal">{hint}</span>}
      </span>
      <span className={cn("font-mono text-sm whitespace-nowrap", bold ? "font-bold" : "font-semibold", neg ? "text-rose-500" : value < 0 ? "text-rose-600" : "text-slate-800")}>
        {neg && value > 0 ? "-" : ""}
        {formatRupiah(value)}
      </span>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

export function PeriodRecap() {
  const { projects, transactions, settings, currentPeriod, closePeriod, reopenPeriod, pendingTransfers } = useFinance();
  const [offset, setOffset] = useState(0);
  const period = useMemo(() => shiftPeriod(currentPeriod, offset), [currentPeriod, offset]);
  const r = useMemo(
    () => computePeriodRecap(period, projects, transactions, settings),
    [period, projects, transactions, settings],
  );
  const fc = useMemo(
    () => forecast(currentPeriod, 3, projects, transactions, settings),
    [currentPeriod, projects, transactions, settings],
  );
  const finished = offset < 0;
  const isCurrent = offset === 0;
  const isLastClosed = settings.closedThrough === period.key;
  const pendingHere = pendingTransfers.filter((t) => inPeriod(period, t.date)).length;
  const cashPct = r.target > 0 ? Math.min(100, (r.cashIn / r.target) * 100) : 0;

  const keyDates: [string, Date][] = [
    ["Closing marketing", period.marketingClose],
    ["Kunci produksi", period.productionLock],
    ["Cut-off", period.cutoff],
    ["Validasi kas", period.validasiKas],
    ["Alokasi gaji", period.alokasiGaji],
    ["Gaji cair", period.gajiCair],
    ["Tutup buku", period.tutupBuku],
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      <div className="p-6 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              Rekap Periode {period.label}
              {r.closed && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-white font-bold uppercase tracking-wider">
                  <Lock size={10} /> Tutup buku
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {fmtDay(period.start)} – {fmtDay(period.end)} · {period.workdays} hari kerja · target {r.slotsCapacity} slot
            </p>
          </div>
          <div className="flex items-center gap-1 self-start">
            <button onClick={() => setOffset((o) => o - 1)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50" title="Periode sebelumnya">
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setOffset(0)}
              className={cn("px-3 py-2 border rounded-lg text-xs font-bold", isCurrent ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 hover:bg-slate-50")}
            >
              Berjalan
            </button>
            <button onClick={() => setOffset((o) => Math.min(3, o + 1))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50" title="Periode berikutnya">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {keyDates.map(([l, d]) => (
            <span key={l} className="text-[11px] px-2 py-1 rounded-lg bg-slate-100 text-slate-600 whitespace-nowrap">
              {l} <b className="text-slate-800">{fmtDay(d)}</b>
            </span>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="font-bold text-slate-700">Uang masuk klien vs target</span>
            <span className="font-mono">
              <b>{formatRupiah(r.cashIn)}</b> <span className="text-slate-400">/ {formatRupiah(r.target)}</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn("h-full", cashPct >= 100 ? "bg-emerald-500" : "bg-navy-600")} style={{ width: `${cashPct}%` }} />
          </div>
          {r.plannedInTotal > 0 && (
            <p className="text-[11px] text-slate-500 mt-1.5">
              + tagihan terjadwal yang belum masuk {formatRupiah(r.plannedInTotal)} → proyeksi {formatRupiah(r.cashIn + r.plannedInTotal)}
            </p>
          )}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Box title="Laba rugi (akrual, serah terima)">
          <Row label="Pendapatan proyek" value={r.revenue} hint={`${r.handovers.length} proyek serah terima · ${r.handoverSlots.toFixed(1)} slot`} />
          <Row label="HPP & biaya proyek" value={r.projectCost} neg />
          <Row label="Laba kotor" value={r.grossProfit} bold />
          <Row label="Beban usaha" value={r.opex} neg hint="Pengeluaran non-proyek, tanpa prive/dividen" />
          <Row label="Laba bersih" value={r.netProfit} bold />
          <Row label="Prive & dividen" value={r.ownerDraw} neg />
          <Row label="Laba ditahan" value={r.retained} bold />
          {r.estProfit !== 0 && (
            <p className="text-[11px] text-indigo-700 mt-2">
              + estimasi laba {r.plannedHandovers.length} proyek yang dijadwalkan serah terima: {formatRupiah(r.estProfit)}
            </p>
          )}
        </Box>

        <Box title="Arus kas periode">
          <Row label="Uang masuk klien" value={r.cashIn} />
          <Row label="Bahan & labour (HPP)" value={r.cashOut.hpp} neg />
          <Row label="Operasional & expense" value={r.cashOut.opex} neg />
          <Row label="Prive & dividen" value={r.cashOut.owner} neg />
          {r.cashOut.other > 0 && <Row label="Lainnya" value={r.cashOut.other} neg />}
          <Row label="Kas bersih periode" value={r.netCash} bold />
        </Box>

        <Box title="Marketing & produksi">
          <Row label="Deal baru (DP masuk)" value={r.dealValue} hint={`${r.deals.length} proyek · ${r.dealSlots.toFixed(1)} dari ${r.slotsCapacity} slot`} />
          <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
            {r.deals.map((d) => (
              <li key={d.project.id} className="flex justify-between gap-2">
                <span className="truncate">{d.project.name}</span>
                <span className="font-mono">{formatRupiah(d.contract)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 border-t border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Serah terima</p>
            <ul className="space-y-0.5 text-[11px]">
              {r.handovers.map((h) => (
                <li key={h.project.id} className="flex justify-between gap-2">
                  <span className="truncate text-slate-700">✓ {h.project.name}</span>
                  <span className={cn("font-mono", h.profit >= 0 ? "text-emerald-700" : "text-rose-600")}>{formatRupiah(h.profit)}</span>
                </li>
              ))}
              {r.plannedHandovers.map((h) => (
                <li key={h.project.id} className="flex justify-between gap-2 text-slate-500">
                  <span className="truncate">◷ {h.project.name} · {fmtDay(new Date(h.due))}</span>
                  <span className="font-mono">≈{formatRupiah(h.estProfit)}</span>
                </li>
              ))}
              {r.handovers.length + r.plannedHandovers.length === 0 && <li className="text-slate-400">Belum ada.</li>}
            </ul>
          </div>
        </Box>
      </div>

      {r.plannedIn.length > 0 && (
        <div className="px-6 pb-6">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tagihan terjadwal periode ini</p>
          <ul className="divide-y divide-slate-100 text-xs border border-slate-200 rounded-xl">
            {r.plannedIn.map((x) => (
              <li key={x.project.id + x.label} className="px-3 py-2 flex justify-between gap-2">
                <span>
                  <b>{x.label}</b> {x.project.name}
                  <span className={cn("block text-[11px]", x.overdue ? "text-rose-600 font-semibold" : "text-slate-400")}>
                    {x.overdue ? "lewat jatuh tempo " : ""}
                    {fmtDay(new Date(x.due))}
                  </span>
                </span>
                <span className="font-mono font-semibold">{formatRupiah(x.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-6 pb-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Proyeksi 3 periode</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-3">Periode</th>
                <th className="text-right py-2 px-3">Target</th>
                <th className="text-right py-2 px-3">Sudah masuk</th>
                <th className="text-right py-2 px-3">Terjadwal</th>
                <th className="text-right py-2 px-3">Serah terima</th>
                <th className="text-right py-2 pl-3">Laba (real + estimasi)</th>
              </tr>
            </thead>
            <tbody>
              {fc.map((f) => (
                <tr key={f.period.key} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-semibold whitespace-nowrap">{f.period.label}</td>
                  <td className="py-2 px-3 text-right font-mono whitespace-nowrap">{formatRupiah(f.target)}</td>
                  <td className="py-2 px-3 text-right font-mono whitespace-nowrap">{formatRupiah(f.realized)}</td>
                  <td className="py-2 px-3 text-right font-mono whitespace-nowrap text-indigo-700">{formatRupiah(f.plannedIn)}</td>
                  <td className="py-2 px-3 text-right">{f.handovers}</td>
                  <td className={cn("py-2 pl-3 text-right font-mono font-bold whitespace-nowrap", f.profit >= 0 ? "text-emerald-700" : "text-rose-600")}>
                    {formatRupiah(f.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">
          {r.closed
            ? "Periode ini terkunci: transaksi bertanggal di periode ini tidak bisa ditambah, diubah, atau dihapus."
            : finished
              ? `Tutup buku setelah validasi kas & semua arahan transfer dikonfirmasi${pendingHere ? ` (masih ${pendingHere} arahan)` : ""}. Batas: ${fmtDay(period.tutupBuku)}.`
              : "Tutup buku bisa dilakukan setelah periode ini selesai (lewat tanggal 25)."}
        </p>
        <div className="flex gap-2 self-start sm:self-auto">
          {isLastClosed && (
            <button
              onClick={() => {
                if (window.confirm(`Buka kembali periode ${period.label}? Lakukan hanya untuk koreksi, lalu tutup lagi.`)) reopenPeriod();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-white"
            >
              <LockOpen size={14} /> Buka kembali
            </button>
          )}
          {finished && !r.closed && (
            <button
              onClick={() => {
                if (!window.confirm(`Tutup buku periode ${period.label}? Setelah ini angka periode tersebut terkunci.`)) return;
                alert(closePeriod(period.key).message);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              <BookLock size={14} /> Tutup Buku {period.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
