import React, { useMemo, useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { formatRupiah, cn } from "../utils";
import {
  Wallet,
  Briefcase,
  BriefcaseBusiness,
  AlertCircle,
  Building2,
  TrendingUp,
  HandCoins,
  Edit2,
  Check,
  X,
} from "lucide-react";

export function AccountCards() {
  const { balances, filteredTransactions, adjustBalance } = useFinance();
  const [isEditingRek1, setIsEditingRek1] = useState(false);
  const [editRek1Value, setEditRek1Value] = useState(0);

  const handleEditRek1Click = () => {
    setEditRek1Value(balances.rek1);
    setIsEditingRek1(true);
  };

  const handleSaveRek1 = () => {
    adjustBalance("REK1", editRek1Value);
    setIsEditingRek1(false);
  };

  const [isEditingRek2, setIsEditingRek2] = useState(false);
  const [editRek2Value, setEditRek2Value] = useState(0);

  const [isEditingRek3, setIsEditingRek3] = useState(false);
  const [editRek3Value, setEditRek3Value] = useState(0);

  const handleEditRek2Click = () => {
    setEditRek2Value(balances.rek2);
    setIsEditingRek2(true);
  };

  const handleSaveRek2 = () => {
    adjustBalance("REK2", editRek2Value);
    setIsEditingRek2(false);
  };

  const handleEditRek3Click = () => {
    setEditRek3Value(balances.rek3);
    setIsEditingRek3(true);
  };

  const handleSaveRek3 = () => {
    adjustBalance("REK3", editRek3Value);
    setIsEditingRek3(false);
  };

  const { omsetKotor, markupFee, omsetBersih } = useMemo(() => {
    const rawOmset = filteredTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
    const markupAmt = filteredTransactions
      .filter(
        (t) =>
          t.type === "EXPENSE" &&
          (t.expenseCategory?.includes("Tax Reserve") ||
            t.expenseCategory?.includes("Markup")),
      )
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      omsetKotor: rawOmset,
      markupFee: markupAmt,
      omsetBersih: rawOmset - markupAmt,
    };
  }, [filteredTransactions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Rekening 1: Gateway */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Rek BCA (Transit / Omset)
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">
              Gateway Transaksi
            </p>
          </div>
          <div className="w-10 h-10 bg-navy-50 text-navy-600 rounded-lg flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-2">
          {isEditingRek1 ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editRek1Value}
                onChange={(e) => setEditRek1Value(Number(e.target.value))}
                className="w-32 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-500"
                autoFocus
              />
              <button
                onClick={handleSaveRek1}
                className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => setIsEditingRek1(false)}
                className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-800">
                {formatRupiah(balances.rek1)}
              </h3>
              <button
                onClick={handleEditRek1Click}
                className="p-1.5 text-slate-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </div>
          )}
          {markupFee > 0 && (
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              Omset Kotor:{" "}
              <span className="font-bold text-slate-700">
                {formatRupiah(omsetKotor)}
              </span>{" "}
              | Tax Reserve:{" "}
              <span className="font-bold text-red-500">
                -{formatRupiah(markupFee)}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Rekening 2: Modal Proyek */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              HPP & Labour
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">
              Rek 2 (Lock Proyek)
            </p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
            <Briefcase size={20} />
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between">
          {isEditingRek2 ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editRek2Value}
                onChange={(e) => setEditRek2Value(Number(e.target.value))}
                className="w-32 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-500"
                autoFocus
              />
              <button
                onClick={handleSaveRek2}
                className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => setIsEditingRek2(false)}
                className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-slate-800">
                {formatRupiah(balances.rek2)}
              </h3>
              <button
                onClick={handleEditRek2Click}
                className="p-1.5 text-slate-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rekening 3: OpEx */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Kas Operasional
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">
              Rek 3 (Lock OpEx)
            </p>
          </div>
          <div className="w-10 h-10 bg-sky-50 text-sky-500 rounded-lg flex items-center justify-center">
            <Building2 size={20} />
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between">
          {isEditingRek3 ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editRek3Value}
                onChange={(e) => setEditRek3Value(Number(e.target.value))}
                className="w-32 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-500"
                autoFocus
              />
              <button
                onClick={handleSaveRek3}
                className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => setIsEditingRek3(false)}
                className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-slate-800">
                {formatRupiah(balances.rek3)}
              </h3>
              <button
                onClick={handleEditRek3Click}
                className="p-1.5 text-slate-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rekening 4: Profit */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Cadangan Profit
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">
              Rek 4 (Lock Profit)
            </p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center">
            <Wallet size={20} />
          </div>
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-slate-800">
            {formatRupiah(balances.rek4)}
          </h3>
        </div>
      </div>
    </div>
  );
}
