import React from "react";
import { useFinance } from "../store/FinanceContext";
import { formatRupiah, cn } from "../utils";
import { Building2, DollarSign, TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";

export function ProjectReport() {
  const { projects, filteredTransactions, supports } = useFinance();

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "INCOME" && !t.supportId)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === "EXPENSE" && !t.supportId)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalHpp = filteredTransactions
    .filter(
      (t) =>
        t.type === "EXPENSE" &&
        !t.supportId &&
        t.expenseCategory?.startsWith("HPP")
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOpex = filteredTransactions
    .filter(
      (t) =>
        t.type === "EXPENSE" &&
        !t.supportId &&
        t.expenseCategory?.startsWith("Opex -")
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOpexTetap = filteredTransactions
    .filter(
      (t) =>
        t.type === "EXPENSE" &&
        !t.supportId &&
        t.expenseCategory?.startsWith("Opex Tetap")
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const otherExpense = totalExpense - totalHpp - totalOpex - totalOpexTetap;

  const labaKotor = totalIncome - totalHpp;
  const labaKotorSetelahOpex = labaKotor - totalOpex;
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8 mb-8">
      {/* Header Laporan */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h4 className="font-bold text-slate-800 text-lg">
              Laporan Laba Rugi Perusahaan & Kinerja Proyek
            </h4>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Evaluasi kinerja margin, HPP aktual, pengeluaran opex, dan profitabilitas per proyek.
            </p>
          </div>
          <div className="flex gap-4">
            <div
              className={cn(
                "px-6 py-3 rounded-2xl border flex flex-col justify-center",
                netProfit >= 0
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-rose-50/70 border-rose-200"
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider mb-0.5",
                  netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                )}
              >
                Laba Bersih Perusahaan
              </p>
              <p
                className={cn(
                  "text-xl font-bold font-mono",
                  netProfit >= 0 ? "text-emerald-800" : "text-rose-800"
                )}
              >
                {netProfit >= 0 ? "+" : ""}
                {formatRupiah(netProfit)}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Total Pendapatan (Omset)
            </p>
            <p className="font-bold text-emerald-600 text-lg font-mono">
              {formatRupiah(totalIncome)}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              HPP (Bahan & Labour)
            </p>
            <p className="font-bold text-rose-500 text-lg mb-1 font-mono">
              {formatRupiah(totalHpp)}
            </p>
            <div className="pt-2 border-t border-slate-200 mt-2 flex justify-between items-center text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Laba Kotor:
              </span>
              <span
                className={cn(
                  "font-bold font-mono",
                  labaKotor >= 0 ? "text-navy-700" : "text-rose-600"
                )}
              >
                {formatRupiah(labaKotor)}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Biaya Operasional (Opex)
            </p>
            <p className="font-bold text-rose-500 text-lg mb-1 font-mono">
              {formatRupiah(totalOpex)}
            </p>
            <div className="pt-2 border-t border-slate-200 mt-2 flex justify-between items-center text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Setelah Opex:
              </span>
              <span
                className={cn(
                  "font-bold font-mono",
                  labaKotorSetelahOpex >= 0 ? "text-navy-700" : "text-rose-600"
                )}
              >
                {formatRupiah(labaKotorSetelahOpex)}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Opex Tetap & Lainnya
            </p>
            <p className="font-bold text-rose-500 text-lg mb-1 font-mono">
              {formatRupiah(totalOpexTetap + otherExpense)}
            </p>
            <div className="pt-2 border-t border-slate-200 mt-2 flex flex-col gap-0.5 text-[10px] text-slate-500">
              <div className="flex justify-between">
                <span>Opex Tetap:</span>
                <span className="font-bold font-mono">{formatRupiah(totalOpexTetap)}</span>
              </div>
              {otherExpense > 0 && (
                <div className="flex justify-between">
                  <span>Lain-lain:</span>
                  <span className="font-bold font-mono">{formatRupiah(otherExpense)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rincian Per Proyek */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h5 className="font-bold text-slate-800 text-sm">
            Rincian Profitabilitas & Beban Per Proyek
          </h5>
          <p className="text-[11px] text-slate-500 font-medium">
            Kalkulasi komprehensif pemasukan DP/Pelunasan, HPP bahan/labour, kontingensi, dan posisi talangan.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3.5">Nama Proyek</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Nilai Kontrak & Masuk</th>
              <th className="px-6 py-3.5 text-right">HPP (Bahan + Labour)</th>
              <th className="px-6 py-3.5 text-right">Kontingensi (Opex)</th>
              <th className="px-6 py-3.5 text-right">Talangan Proyek</th>
              <th className="px-6 py-3.5 text-right">Laba/Rugi Riil</th>
              <th className="px-6 py-3.5 text-right">Margin (%)</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100">
            {projects.map((project) => {
              const projectTransactions = filteredTransactions.filter(
                (t) => t.projectId === project.id
              );

              const incomeDp = projectTransactions
                .filter(
                  (t) =>
                    t.type === "INCOME" &&
                    t.incomeType === "DP_60" &&
                    !t.supportId
                )
                .reduce((sum, t) => sum + t.amount, 0);

              const incomePelunasan = projectTransactions
                .filter(
                  (t) =>
                    t.type === "INCOME" &&
                    t.incomeType === "PELUNASAN_40" &&
                    !t.supportId
                )
                .reduce((sum, t) => sum + t.amount, 0);

              const projectRealIncome = incomeDp + incomePelunasan;

              const hppBahan = projectTransactions
                .filter(
                  (t) =>
                    t.type === "EXPENSE" &&
                    !t.supportId &&
                    t.expenseCategory?.includes("Bahan Baku")
                )
                .reduce((sum, t) => sum + t.amount, 0);

              const hppLabour = projectTransactions
                .filter(
                  (t) =>
                    t.type === "EXPENSE" &&
                    !t.supportId &&
                    t.expenseCategory?.includes("Upah Labour")
                )
                .reduce((sum, t) => sum + t.amount, 0);

              const projectHpp = hppBahan + hppLabour;

              const opexKontingensi = projectTransactions
                .filter(
                  (t) =>
                    t.type === "EXPENSE" &&
                    !t.supportId &&
                    t.expenseCategory?.includes("Kontingensi")
                )
                .reduce((sum, t) => sum + t.amount, 0);

              const opexTransport = projectTransactions
                .filter(
                  (t) =>
                    t.type === "EXPENSE" &&
                    !t.supportId &&
                    t.expenseCategory?.includes("Transportasi")
                )
                .reduce((sum, t) => sum + t.amount, 0);

              const projectKontingensi = opexKontingensi + opexTransport;

              // Talangan / Subsidi Silang for this project
              const talanganDiberikan = supports
                .filter(
                  (s) =>
                    s.fromProjectId === project.id &&
                    s.status === "OUTSTANDING"
                )
                .reduce((sum, s) => sum + s.amount, 0);

              const talanganDiterima = supports
                .filter(
                  (s) =>
                    s.toProjectId === project.id &&
                    s.status === "OUTSTANDING"
                )
                .reduce((sum, s) => sum + s.amount, 0);

              const projectTotalExpense = projectTransactions
                .filter((t) => t.type === "EXPENSE" && !t.supportId)
                .reduce((sum, t) => sum + t.amount, 0);

              const profitLoss = projectRealIncome - projectTotalExpense;
              const marginPercent =
                projectRealIncome > 0
                  ? (profitLoss / projectRealIncome) * 100
                  : 0;

              return (
                <tr
                  key={project.id}
                  className="hover:bg-slate-50 transition-colors bg-white"
                >
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800 block">
                      {project.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Nilai Kontrak: {formatRupiah(project.totalValue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider",
                        project.status === "ONGOING"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      )}
                    >
                      {project.status === "ONGOING" ? "Ongoing" : "Completed"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className="font-bold text-emerald-600 font-mono text-sm block">
                      {formatRupiah(projectRealIncome)}
                    </span>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      DP: {formatRupiah(incomeDp)} | Pelunasan: {formatRupiah(incomePelunasan)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className="font-bold text-rose-500 font-mono text-sm block">
                      {formatRupiah(projectHpp)}
                    </span>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Bahan: {formatRupiah(hppBahan)} | Labour: {formatRupiah(hppLabour)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className="font-bold text-slate-700 font-mono text-sm block">
                      {formatRupiah(projectKontingensi)}
                    </span>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Kontingensi: {formatRupiah(opexKontingensi)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {talanganDiterima > 0 ? (
                      <span className="text-amber-700 font-bold font-mono text-xs block">
                        Hutang: {formatRupiah(talanganDiterima)}
                      </span>
                    ) : talanganDiberikan > 0 ? (
                      <span className="text-blue-600 font-bold font-mono text-xs block">
                        Piutang: {formatRupiah(talanganDiberikan)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-6 py-4 text-right font-bold font-mono text-sm whitespace-nowrap",
                      profitLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                    )}
                  >
                    {profitLoss >= 0 ? "+" : ""}
                    {formatRupiah(profitLoss)}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span
                      className={cn(
                        "font-bold font-mono text-xs px-2 py-0.5 rounded-full inline-block",
                        marginPercent >= 20
                          ? "bg-emerald-100 text-emerald-800"
                          : marginPercent > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      )}
                    >
                      {marginPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center font-medium text-slate-400"
                >
                  Belum ada data proyek terdaftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
