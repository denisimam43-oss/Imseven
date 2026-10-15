import React, { useMemo } from 'react';
import { useFinance } from '../store/FinanceContext';
import { isRealIncome, isRealExpense } from "../finance";
import { formatRupiah, cn } from '../utils';
import { format, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

export function DailyExpenseReport() {
  const { filteredTransactions } = useFinance();

  const dailyData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => isRealExpense(t));
    const grouped = expenses.reduce((acc, t) => {
      const dayStr = format(new Date(t.date), 'yyyy-MM-dd');
      if (!acc[dayStr]) {
        acc[dayStr] = {
          date: new Date(t.date),
          total: 0,
          categories: {}
        };
      }
      acc[dayStr].total += t.amount;
      const cat = t.expenseCategory || 'Lainnya';
      acc[dayStr].categories[cat] = (acc[dayStr].categories[cat] || 0) + t.amount;
      return acc;
    }, {} as Record<string, { date: Date, total: number, categories: Record<string, number> }>);

    return (Object.values(grouped) as Array<{ date: Date, total: number, categories: Record<string, number> }>).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredTransactions]);

  if (dailyData.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <p className="text-slate-500 font-medium">Belum ada pengeluaran pada periode ini.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h4 className="font-bold text-slate-700">Laporan Pengeluaran Harian</h4>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3">Tanggal</th>
              <th className="px-6 py-3">Rincian Kategori</th>
              <th className="px-6 py-3 text-right">Total Harian</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {dailyData.map((day, idx) => (
              <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-6 py-3 font-semibold text-slate-700">
                  {format(day.date, 'dd MMM yyyy', { locale: id })}
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-col gap-1.5">
                    {Object.entries(day.categories).map(([cat, amt], i) => (
                      <div key={i} className="flex justify-between items-center max-w-[250px]">
                        <span className="text-slate-500 font-medium truncate pr-2">{cat}</span>
                        <span className="text-slate-700 font-bold">{formatRupiah(amt as number)}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-3 text-right font-bold text-red-500">
                  -{formatRupiah(day.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
