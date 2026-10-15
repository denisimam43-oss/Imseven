import React, { useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { formatRupiah } from "../utils";
import { Wallet, Briefcase, Building2, TrendingUp, Edit2, Check, X } from "lucide-react";
import { RekeningType } from "../types";

const CARDS: {
  key: RekeningType;
  title: string;
  sub: string;
  hint: string;
  icon: React.ReactNode;
  iconCls: string;
}[] = [
  {
    key: "REK1",
    title: "Rek BCA (Transit / Omset)",
    sub: "Rek 1 • Gateway",
    hint: "Idealnya mendekati 0 setelah dialokasikan",
    icon: <TrendingUp size={20} />,
    iconCls: "bg-navy-50 text-navy-600",
  },
  {
    key: "REK2",
    title: "HPP & Labour",
    sub: "Rek 2 • Lock Proyek",
    hint: "Untuk bahan & tukang proyek berjalan",
    icon: <Briefcase size={20} />,
    iconCls: "bg-amber-50 text-amber-500",
  },
  {
    key: "REK3",
    title: "Kas Operasional",
    sub: "Rek 3 • Lock OpEx",
    hint: "Gaji, sewa, iklan, operasional",
    icon: <Building2 size={20} />,
    iconCls: "bg-sky-50 text-sky-500",
  },
  {
    key: "REK4",
    title: "Cadangan Profit",
    sub: "Rek 4 • Lock Profit",
    hint: "Laba, cadangan, dividen",
    icon: <Wallet size={20} />,
    iconCls: "bg-emerald-50 text-emerald-500",
  },
];

export function AccountCards() {
  const { balances, adjustBalance } = useFinance();
  const [editing, setEditing] = useState<RekeningType | null>(null);
  const [editValue, setEditValue] = useState("");

  const value: Record<RekeningType, number> = {
    REK1: balances.rek1,
    REK2: balances.rek2,
    REK3: balances.rek3,
    REK4: balances.rek4,
  };
  const total = balances.rek1 + balances.rek2 + balances.rek3 + balances.rek4;

  const save = (key: RekeningType) => {
    const n = Number(editValue.replace(/[^\d-]/g, ""));
    if (Number.isNaN(n)) return;
    const diff = n - value[key];
    if (
      diff !== 0 &&
      !window.confirm(
        `Sesuaikan saldo ${key} menjadi ${formatRupiah(n)}?\nSelisih ${formatRupiah(diff)} akan dicatat sebagai "Penyesuaian Saldo" (bukan omset/biaya). Lakukan hanya setelah mencocokkan dengan saldo bank.`,
      )
    )
      return;
    adjustBalance(key, n);
    setEditing(null);
  };

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CARDS.map((c) => (
          <div key={c.key} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{c.title}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{c.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.iconCls}`}>{c.icon}</div>
            </div>
            <div className="relative z-10">
              {editing === c.key ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-36 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-500"
                    autoFocus
                  />
                  <button onClick={() => save(c.key)} className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Simpan">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditing(null)} className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200" title="Batal">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h3 className={`text-2xl font-bold ${value[c.key] < 0 ? "text-rose-600" : "text-slate-800"}`}>
                    {formatRupiah(value[c.key])}
                  </h3>
                  <button
                    onClick={() => {
                      setEditing(c.key);
                      setEditValue(String(Math.round(value[c.key])));
                    }}
                    className="p-1.5 text-slate-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
                    title="Cocokkan dengan saldo bank"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                {value[c.key] < 0 ? "Saldo minus: ada pengeluaran melebihi dana pos ini" : c.hint}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3 text-right">
        Total kas di 4 rekening: <span className="font-bold font-mono text-slate-800">{formatRupiah(total)}</span>
      </p>
    </div>
  );
}
