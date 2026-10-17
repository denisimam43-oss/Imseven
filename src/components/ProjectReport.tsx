import React, { useMemo } from "react";
import { useFinance } from "../store/FinanceContext";
import { formatRupiah, cn } from "../utils";
import { computeBalanceSheet, computeProfitLoss, summarizeProject } from "../finance";

const PERIOD_LABEL: Record<string, string> = {
  THIS_CUTOFF: "periode cut-off berjalan",
  LAST_CUTOFF: "periode cut-off lalu",
  "7_DAYS": "7 hari terakhir",
  THIS_MONTH: "bulan ini",
  "6_MONTHS": "6 bulan terakhir",
  THIS_YEAR: "tahun ini",
};

function Row({ label, value, bold, neg, hint }: { label: string; value: number; bold?: boolean; neg?: boolean; hint?: string }) {
  return (
    <div className={cn("flex justify-between items-baseline py-1.5", bold && "border-t border-slate-200 pt-2.5 mt-1")}>
      <span className={cn("text-xs", bold ? "font-bold text-slate-800" : "text-slate-600")}>
        {label}
        {hint && <span className="block text-[10px] text-slate-400 font-normal">{hint}</span>}
      </span>
      <span
        className={cn(
          "font-mono text-sm",
          bold ? "font-bold" : "font-semibold",
          neg ? "text-rose-500" : bold && value < 0 ? "text-rose-600" : "text-slate-800",
        )}
      >
        {neg && value > 0 ? "-" : ""}
        {formatRupiah(value)}
      </span>
    </div>
  );
}

export function ProjectReport() {
  const { projects, transactions, supports, isInPeriod, filterPeriod } = useFinance();

  const pl = useMemo(() => computeProfitLoss(projects, transactions, isInPeriod), [projects, transactions, isInPeriod]);
  const bs = useMemo(() => computeBalanceSheet(projects, transactions), [projects, transactions]);
  const visible = projects.filter((p) => !p.archived);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8 mb-8">
      <div className="p-6 border-b border-slate-100">
        <h4 className="font-bold text-slate-800 text-lg">Laporan Laba Rugi & Posisi Keuangan</h4>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Dasar akrual (SAK EMKM): pendapatan & HPP proyek diakui saat serah terima, bukan saat DP masuk.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Laba Rugi • {PERIOD_LABEL[filterPeriod]}
            </p>
            <Row label="Pendapatan proyek" value={pl.revenue} hint={`${pl.completedCount} proyek serah terima di periode ini`} />
            <Row label="HPP & biaya proyek" value={pl.projectCost} neg />
            <Row label="Laba kotor" value={pl.grossProfit} bold />
            <Row label="Biaya operasional & umum" value={pl.opex} neg hint="Pengeluaran yang tidak ditautkan ke proyek" />
            <Row label="Laba bersih" value={pl.netProfit} bold />
            <Row label="Prive & dividen pemilik" value={pl.ownerDraw} neg hint="Pengambilan pemilik, bukan beban usaha" />
            <Row label="Laba ditahan" value={pl.retained} bold />
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Posisi Keuangan • hari ini</p>
            <Row label="Kas di 4 rekening" value={bs.cash} />
            <Row label="Piutang klien" value={bs.receivables} hint="Proyek sudah serah terima, belum lunas" />
            <Row label="Proyek dalam pengerjaan" value={bs.wip} hint="Biaya yang sudah keluar untuk proyek berjalan" />
            <Row label="Total aset lancar" value={bs.cash + bs.receivables + bs.wip} bold />
            <Row label="Uang muka pelanggan (kewajiban)" value={bs.customerAdvances} hint="Uang klien untuk proyek yang belum diserahkan" />
            <Row label="Aset bersih" value={bs.cash + bs.receivables + bs.wip - bs.customerAdvances} bold />
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
        <h5 className="font-bold text-slate-800 text-sm">Profitabilitas Per Proyek</h5>
        <p className="text-[11px] text-slate-500 font-medium">
          Dihitung dari seluruh transaksi proyek (tidak tergantung filter periode). Proyek berjalan menampilkan estimasi.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3.5">Proyek</th>
              <th className="px-6 py-3.5 text-right">Diterima</th>
              <th className="px-6 py-3.5 text-right">HPP (Bahan + Labour)</th>
              <th className="px-6 py-3.5 text-right">Biaya Lain</th>
              <th className="px-6 py-3.5 text-right">Talangan</th>
              <th className="px-6 py-3.5 text-right">Laba / Margin</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100">
            {visible.map((project) => {
              const s = summarizeProject(project, transactions);
              const given = supports
                .filter((x) => x.fromProjectId === project.id && x.status === "OUTSTANDING")
                .reduce((sum, x) => sum + x.amount, 0);
              const taken = supports
                .filter((x) => x.toProjectId === project.id && x.status === "OUTSTANDING")
                .reduce((sum, x) => sum + x.amount, 0);
              const profit = s.recognized ? s.profit : s.estimatedProfit;
              return (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors bg-white">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800 block">{project.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Kontrak {formatRupiah(project.totalValue)} • {s.recognized ? "Serah terima" : "Dikerjakan"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-600 whitespace-nowrap">
                    {formatRupiah(s.received)}
                    {s.outstanding > 0 && (
                      <span className="block text-[10px] text-blue-500">sisa {formatRupiah(s.outstanding)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-rose-500 whitespace-nowrap">{formatRupiah(s.hpp)}</td>
                  <td className="px-6 py-4 text-right font-mono text-rose-400 whitespace-nowrap">{formatRupiah(s.otherCost)}</td>
                  <td className="px-6 py-4 text-right font-mono text-[11px] whitespace-nowrap">
                    {taken > 0 && <span className="block text-rose-600">pinjam {formatRupiah(taken)}</span>}
                    {given > 0 && <span className="block text-amber-600">beri {formatRupiah(given)}</span>}
                    {taken === 0 && given === 0 && <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className={cn("font-mono font-bold block", profit >= 0 ? "text-emerald-700" : "text-rose-600")}>
                      {profit >= 0 ? "+" : ""}
                      {formatRupiah(profit)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        s.margin >= 20 ? "bg-emerald-50 text-emerald-700" : s.margin > 0 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700",
                      )}
                    >
                      {s.recognized ? "" : "estimasi "}
                      {s.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                  Belum ada proyek.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
