import React from "react";
import { useFinance } from "../store/FinanceContext";
import { isRealIncome, isRealExpense } from "../finance";
import {
  OPEX_TARGET_BULANAN,
  TARGET_SKENARIO_A,
  TARGET_SKENARIO_B,
} from "../types";
import { formatRupiah, cn } from "../utils";
import { Target, CheckCircle, AlertCircle, Sparkles } from "lucide-react";

export function TargetsAndProgress() {
  const { balances, filteredTransactions, targetScenario, setTargetScenario } =
    useFinance();

  const opexPercentage = Math.min(
    (balances.opexCollectedThisMonth / OPEX_TARGET_BULANAN) * 100,
    100
  );
  const isTargetAchieved = balances.opexCollectedThisMonth >= OPEX_TARGET_BULANAN;

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

  const omsetBersih = rawOmset - markupFee;

  const activeTargetValue =
    targetScenario === "SKENARIO_A" ? TARGET_SKENARIO_A : TARGET_SKENARIO_B;

  const marketingPercentage = Math.min(
    (omsetBersih / activeTargetValue) * 100,
    100
  );
  const isMarketingAchieved = omsetBersih >= activeTargetValue;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Target OpEx BEP */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-4 gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Target size={20} />
              </span>
              <div>
                <h4 className="font-bold text-slate-800">
                  Target Break-Even Operasional (BEP)
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Alokasi Rek 3 (Lock OpEx) bulan ini menuju BEP kantor.
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-slate-800 font-mono">
                {formatRupiah(balances.opexCollectedThisMonth)}
              </p>
              <p className="text-xs font-semibold text-slate-400">
                Target: {formatRupiah(OPEX_TARGET_BULANAN)}
              </p>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-4">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-out",
                isTargetAchieved ? "bg-emerald-500" : "bg-blue-600"
              )}
              style={{ width: `${opexPercentage}%` }}
            />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-semibold">
          <span
            className={cn(
              "flex items-center gap-1.5",
              isTargetAchieved ? "text-emerald-600 font-bold" : "text-slate-600"
            )}
          >
            {isTargetAchieved ? (
              <>
                <CheckCircle size={14} className="text-emerald-500" />
                Target BEP Kantor Tercapai & Aman!
              </>
            ) : (
              <>
                <AlertCircle size={14} className="text-blue-500" />
                {opexPercentage.toFixed(1)}% Terkumpul
              </>
            )}
          </span>
          {!isTargetAchieved ? (
            <span className="text-blue-600 font-mono font-bold">
              Kurang {formatRupiah(OPEX_TARGET_BULANAN - balances.opexCollectedThisMonth)}
            </span>
          ) : (
            <span className="text-emerald-600 font-mono font-bold">
              Surplus {formatRupiah(balances.opexCollectedThisMonth - OPEX_TARGET_BULANAN)}
            </span>
          )}
        </div>
      </div>

      {/* Target Omset Marketing Bulanan */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-3 gap-2">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Sparkles size={20} />
              </span>
              <div>
                <h4 className="font-bold text-slate-800">
                  Target Omset Marketing
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {targetScenario === "SKENARIO_A"
                    ? "Skenario A: Target All Interior (Rp 300 Juta)"
                    : "Skenario B: Target Reguler 9 Proyek @ Rp 30 Juta (Rp 270 Juta)"}
                </p>
              </div>
            </div>

            {/* Skenario Selector */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setTargetScenario("SKENARIO_A")}
                className={cn(
                  "px-2 py-1 rounded-md transition-all",
                  targetScenario === "SKENARIO_A"
                    ? "bg-white text-navy-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Skenario A
              </button>
              <button
                type="button"
                onClick={() => setTargetScenario("SKENARIO_B")}
                className={cn(
                  "px-2 py-1 rounded-md transition-all",
                  targetScenario === "SKENARIO_B"
                    ? "bg-white text-navy-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Skenario B
              </button>
            </div>
          </div>

          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-500 font-medium">
              Capaian Omset Bersih:
            </span>
            <div className="text-right">
              <span className="text-lg font-bold text-slate-800 font-mono">
                {formatRupiah(omsetBersih)}
              </span>
              <span className="text-xs text-slate-400 font-semibold ml-2">
                / {formatRupiah(activeTargetValue)}
              </span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-out",
                isMarketingAchieved ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{ width: `${marketingPercentage}%` }}
            />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-semibold">
          <span
            className={cn(
              "flex items-center gap-1.5",
              isMarketingAchieved
                ? "text-emerald-600 font-bold"
                : "text-slate-600"
            )}
          >
            {isMarketingAchieved ? (
              <>
                <CheckCircle size={14} className="text-emerald-500" />
                Target Omset Berhasil Diraih!
              </>
            ) : (
              <>
                <AlertCircle size={14} className="text-amber-500" />
                {marketingPercentage.toFixed(1)}% Tercapai
              </>
            )}
          </span>
          {!isMarketingAchieved ? (
            <span className="text-amber-600 font-mono font-bold">
              Kurang {formatRupiah(activeTargetValue - omsetBersih)}
            </span>
          ) : (
            <span className="text-emerald-600 font-mono font-bold">
              Surplus {formatRupiah(omsetBersih - activeTargetValue)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
