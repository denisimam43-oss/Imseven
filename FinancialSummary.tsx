import React, { useMemo } from "react";
import { useFinance } from "../store/FinanceContext";
import { isRealIncome, isRealExpense } from "../finance";
import { formatRupiah } from "../utils";
import { TrendingUp, TrendingDown, DollarSign, Clock, ArrowLeftRight } from "lucide-react";

export function FinancialSummary() {
  const { transactions, balances } = useFinance();

  const currentMonthData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = currentMonthTransactions
      .filter((t) => isRealIncome(t))
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = currentMonthTransactions
      .filter((t) => isRealExpense(t))
      .reduce((acc, t) => acc + t.amount, 0);

    const netProfit = income - expenses;

    return { income, expenses, netProfit };
  }, [transactions]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
            Ringkasan Arus Kas Bulan Ini
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Uang yang benar-benar masuk & keluar bulan ini. Laba proyek ada di Laporan Laba Rugi.
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg self-start md:self-auto">
          Periode: {new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date())}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Pemasukan */}
        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Kas Masuk
            </p>
            <span className="p-1 bg-emerald-100 text-emerald-700 rounded-md">
              <TrendingUp size={14} />
            </span>
          </div>
          <p className="text-xl font-bold text-emerald-800">
            {formatRupiah(currentMonthData.income)}
          </p>
          <p className="text-[10px] text-emerald-600/80 mt-1">
            DP, termin & pelunasan klien
          </p>
        </div>

        {/* Pengeluaran */}
        <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
              Kas Keluar
            </p>
            <span className="p-1 bg-rose-100 text-rose-700 rounded-md">
              <TrendingDown size={14} />
            </span>
          </div>
          <p className="text-xl font-bold text-rose-800">
            {formatRupiah(currentMonthData.expenses)}
          </p>
          <p className="text-[10px] text-rose-600/80 mt-1">
            HPP, Opex, dan Biaya Tetap
          </p>
        </div>

        {/* Laba Bersih */}
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              Arus Kas Bersih
            </p>
            <span className="p-1 bg-slate-800 text-emerald-400 rounded-md">
              <DollarSign size={14} />
            </span>
          </div>
          <p className="text-xl font-bold text-white">
            {currentMonthData.netProfit >= 0 ? "+" : ""}
            {formatRupiah(currentMonthData.netProfit)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Kas masuk - kas keluar (bukan laba)
          </p>
        </div>

        {/* Sisa Tagihan Klien */}
        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
              Sisa Tagihan Klien
            </p>
            <span className="p-1 bg-blue-100 text-blue-700 rounded-md">
              <Clock size={14} />
            </span>
          </div>
          <p className="text-xl font-bold text-blue-800">
            {formatRupiah(balances.totalPiutangPelunasan)}
          </p>
          <p className="text-[10px] text-blue-600/80 mt-1">
            Total belum dibayar dari semua proyek
          </p>
        </div>

        {/* Talangan Aktif / Outstanding */}
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Talangan Outstanding
            </p>
            <span className="p-1 bg-amber-100 text-amber-700 rounded-md">
              <ArrowLeftRight size={14} />
            </span>
          </div>
          <p className="text-xl font-bold text-amber-800">
            {formatRupiah(balances.totalOutstandingSupport)}
          </p>
          <p className="text-[10px] text-amber-700/80 mt-1">
            {balances.totalOutstandingSupport > 0
              ? "Wajib dikembalikan saat pelunasan"
              : "Semua talangan lunas"}
          </p>
        </div>
      </div>
    </div>
  );
}
