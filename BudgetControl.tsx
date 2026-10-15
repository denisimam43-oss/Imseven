import React from "react";
import { useFinance } from "../store/FinanceContext";
import { isRealIncome, isRealExpense } from "../finance";
import { formatRupiah, cn } from "../utils";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export function BudgetControl() {
  const { filteredTransactions } = useFinance();

  // --- Calculations for Budget Locks ---
  const rawOmset = filteredTransactions
    .filter((t) => isRealIncome(t))
    .reduce((sum, t) => sum + t.amount, 0);

  const markupFee = filteredTransactions
    .filter(
      (t) =>
        isRealExpense(t) &&
        (t.expenseCategory?.includes("Tax Reserve") ||
          t.expenseCategory?.includes("Markup"))
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const omset = rawOmset - markupFee; // Omset bersih perusahaan

  // Actual Expenses (excluding support transactions and tax reserve)
  const hppSpent = filteredTransactions
    .filter(
      (t) =>
        isRealExpense(t) &&
        t.expenseCategory?.startsWith("HPP")
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const kontingensiSpent = filteredTransactions
    .filter(
      (t) =>
        isRealExpense(t) &&
        t.expenseCategory?.includes("Kontingensi")
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const priveSpent = filteredTransactions
    .filter(
      (t) =>
        isRealExpense(t) &&
        t.expenseCategory?.includes("Prive")
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const opexKantorSpent = filteredTransactions
    .filter(
      (t) =>
        isRealExpense(t) &&
        t.expenseCategory?.startsWith("Opex -") &&
        !t.expenseCategory?.includes("Prive") &&
        !t.expenseCategory?.includes("Kontingensi")
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const opexTetapSpent = filteredTransactions
    .filter(
      (t) =>
        isRealExpense(t) &&
        t.expenseCategory?.startsWith("Opex Tetap")
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(
      (t) =>
        isRealExpense(t) &&
        !(
          t.expenseCategory?.includes("Tax Reserve") ||
          t.expenseCategory?.includes("Markup")
        )
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const labaBersih = omset - totalExpense;
  const marginActual = omset > 0 ? (labaBersih / omset) * 100 : 0;
  const targetMargin = 20;

  // Locks limits
  const lockHPP = omset * 0.53;
  const lockKontingensi = omset * 0.02;
  const lockPrive = omset * 0.02;
  const lockOpexKantor = omset * 0.03;
  const lockOpexTetap = omset * 0.2;

  const budgetCards = [
    {
      title: "HPP (Lock 53%)",
      limit: lockHPP,
      actual: hppSpent,
      isOver: hppSpent > lockHPP && lockHPP > 0,
      note: "Bahan Baku & Upah Tukang (dari DP)",
      color: "amber",
    },
    {
      title: "Ops Kantor (Lock 3%)",
      limit: lockOpexKantor,
      actual: opexKantorSpent,
      isOver: opexKantorSpent > lockOpexKantor && lockOpexKantor > 0,
      note: "ATK, Listrik, Survey, dll (dari DP)",
      color: "blue",
    },
    {
      title: "Kontingensi (Lock 2%)",
      limit: lockKontingensi,
      actual: kontingensiSpent,
      isOver: kontingensiSpent > lockKontingensi && lockKontingensi > 0,
      note: "Overhead & Revisi Lapangan (dari DP)",
      color: "indigo",
    },
    {
      title: "Prive (Lock 2%)",
      limit: lockPrive,
      actual: priveSpent,
      isOver: priveSpent > lockPrive && lockPrive > 0,
      note: "Kunci Opex Prive (dari DP)",
      color: "purple",
    },
    {
      title: "Biaya Tetap Expense (Lock 20%)",
      limit: lockOpexTetap,
      actual: opexTetapSpent,
      isOver: opexTetapSpent > lockOpexTetap && lockOpexTetap > 0,
      note: "Sewa Kantor & Salary Staff (dari Pelunasan)",
      color: "rose",
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">
            Harga Lock & Budget Control
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Firewall alokasi anggaran ketat sesuai SOP Seven Interior untuk mencegah pembengkakan biaya.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Main Budgets */}
        {budgetCards.map((card, i) => {
          const percentage =
            card.limit > 0 ? Math.min((card.actual / card.limit) * 100, 100) : 0;
          return (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    {card.title}
                  </h4>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                      card.isOver
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    )}
                  >
                    {card.isOver ? (
                      <>
                        <AlertTriangle size={11} /> OVER
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={11} /> SAFE
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2">
                  <span>Lock Budget:</span>
                  <span className="font-mono text-slate-700">
                    {formatRupiah(card.limit)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      card.isOver ? "bg-rose-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-100 mt-1 flex items-baseline justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Terpakai:
                  </p>
                  <p
                    className={cn(
                      "text-base font-bold font-mono",
                      card.isOver ? "text-rose-600" : "text-slate-800"
                    )}
                  >
                    {formatRupiah(card.actual)}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 max-w-[140px] text-right truncate">
                  {card.note}
                </p>
              </div>
            </div>
          );
        })}

        {/* Margin Kinerja (Lock 20%) */}
        <div className="bg-slate-900 p-5 rounded-2xl shadow-sm text-white flex flex-col justify-between border border-slate-800">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                Margin Laba Bersih (Lock 20%)
              </h4>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  marginActual >= targetMargin
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                )}
              >
                TARGET {targetMargin}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Profit Riil:</span>
              <span className="font-mono font-bold text-white">
                {formatRupiah(labaBersih)}
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 mt-2">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Margin Aktual
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold font-mono",
                    marginActual >= targetMargin
                      ? "text-emerald-400"
                      : "text-amber-400"
                  )}
                >
                  {marginActual.toFixed(1)}%
                </p>
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                Dari total omset bersih
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
