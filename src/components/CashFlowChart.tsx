import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFinance } from '../store/FinanceContext';
import { isRealIncome, isRealExpense } from "../finance";
import { format, subDays, isSameDay, getDaysInMonth, startOfMonth, startOfYear, setMonth, isSameMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '../utils';

export function CashFlowChart() {
  const { transactions, filterPeriod } = useFinance();

  const chartData = useMemo(() => {
    const now = new Date();
    
    if (filterPeriod === '7_DAYS') {
      const days = Array.from({ length: 7 }).map((_, i) => subDays(now, 6 - i));
      return days.map(day => {
        const dayTransactions = transactions.filter(t => isSameDay(new Date(t.date), day));
        const rawIn = dayTransactions.filter(t => isRealIncome(t)).reduce((sum, t) => sum + t.amount, 0);
        const markup = dayTransactions.filter(t => isRealExpense(t) && (t.expenseCategory?.includes('Tax Reserve') || t.expenseCategory?.includes('Markup'))).reduce((sum, t) => sum + t.amount, 0);
        const realIn = rawIn - markup;
        const realOut = dayTransactions.filter(t => isRealExpense(t) && !(t.expenseCategory?.includes('Tax Reserve') || t.expenseCategory?.includes('Markup'))).reduce((sum, t) => sum + t.amount, 0);
        return {
          name: format(day, 'EEE', { locale: id }), 
          fullDate: format(day, 'dd MMM yyyy', { locale: id }),
          Income: realIn,
          Expense: realOut,
          Profit: realIn - realOut
        };
      });
    } else if (filterPeriod === 'THIS_MONTH') {
      const daysInMonth = getDaysInMonth(now);
      const start = startOfMonth(now);
      const days = Array.from({ length: daysInMonth }).map((_, i) => new Date(start.getFullYear(), start.getMonth(), i + 1));
      
      // Group by weeks to prevent overcrowding, or just show days
      // Let's group by weeks (Week 1, Week 2, Week 3, Week 4, Week 5)
      const weeks = [1, 2, 3, 4, 5];
      return weeks.map(week => {
        const weekTransactions = transactions.filter(t => {
          const d = new Date(t.date);
          if (!isSameMonth(d, now)) return false;
          const dayOfM = d.getDate();
          if (week === 1) return dayOfM >= 1 && dayOfM <= 7;
          if (week === 2) return dayOfM >= 8 && dayOfM <= 14;
          if (week === 3) return dayOfM >= 15 && dayOfM <= 21;
          if (week === 4) return dayOfM >= 22 && dayOfM <= 28;
          return dayOfM >= 29;
        });
        
        const rawIn = weekTransactions.filter(t => isRealIncome(t)).reduce((sum, t) => sum + t.amount, 0);
        const markup = weekTransactions.filter(t => isRealExpense(t) && (t.expenseCategory?.includes('Tax Reserve') || t.expenseCategory?.includes('Markup'))).reduce((sum, t) => sum + t.amount, 0);
        const realIn = rawIn - markup;
        const realOut = weekTransactions.filter(t => isRealExpense(t) && !(t.expenseCategory?.includes('Tax Reserve') || t.expenseCategory?.includes('Markup'))).reduce((sum, t) => sum + t.amount, 0);
        
        return {
          name: `Minggu ${week}`,
          fullDate: `Minggu Ke-${week} ${format(now, 'MMM yyyy', { locale: id })}`,
          Income: realIn,
          Expense: realOut,
          Profit: realIn - realOut
        };
      });
    } else if (filterPeriod === '6_MONTHS') {
      const months = Array.from({ length: 6 }).map((_, i) => setMonth(startOfMonth(now), now.getMonth() - 5 + i));
      return months.map(month => {
        const monthTransactions = transactions.filter(t => isSameMonth(new Date(t.date), month));
        const rawIn = monthTransactions.filter(t => isRealIncome(t)).reduce((sum, t) => sum + t.amount, 0);
        const markup = monthTransactions.filter(t => isRealExpense(t) && (t.expenseCategory?.includes('Tax Reserve') || t.expenseCategory?.includes('Markup'))).reduce((sum, t) => sum + t.amount, 0);
        const realIn = rawIn - markup;
        const realOut = monthTransactions.filter(t => isRealExpense(t) && !(t.expenseCategory?.includes('Tax Reserve') || t.expenseCategory?.includes('Markup'))).reduce((sum, t) => sum + t.amount, 0);
        return {
          name: format(month, 'MMM', { locale: id }), 
          fullDate: format(month, 'MMMM yyyy', { locale: id }),
          Income: realIn,
          Expense: realOut,
          Profit: realIn - realOut
        };
      });
    } else {
      // THIS_YEAR
      const months = Array.from({ length: 12 }).map((_, i) => setMonth(startOfYear(now), i));
      return months.map(month => {
        const monthTransactions = transactions.filter(t => isSameMonth(new Date(t.date), month));
        const rawIn = monthTransactions.filter(t => isRealIncome(t)).reduce((sum, t) => sum + t.amount, 0);
        const markup = monthTransactions.filter(t => isRealExpense(t) && (t.expenseCategory?.includes('Tax Reserve') || t.expenseCategory?.includes('Markup'))).reduce((sum, t) => sum + t.amount, 0);
        const realIn = rawIn - markup;
        const realOut = monthTransactions.filter(t => isRealExpense(t) && !(t.expenseCategory?.includes('Tax Reserve') || t.expenseCategory?.includes('Markup'))).reduce((sum, t) => sum + t.amount, 0);
        return {
          name: format(month, 'MMM', { locale: id }), 
          fullDate: format(month, 'MMMM yyyy', { locale: id }),
          Income: realIn,
          Expense: realOut,
          Profit: realIn - realOut
        };
      });
    }
  }, [transactions, filterPeriod]);

  const getSubTitle = () => {
    switch (filterPeriod) {
      case '7_DAYS': return '7 Hari Terakhir';
      case 'THIS_MONTH': return 'Bulan Ini';
      case '6_MONTHS': return '6 Bulan Terakhir';
      case 'THIS_YEAR': return 'Tahun Ini';
      default: return '';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-100 rounded-lg shadow-lg text-xs z-50 min-w-[200px]">
          <p className="font-bold text-slate-700 mb-3">{payload[0].payload.fullDate}</p>
          {payload.map((entry: any, index: number) => (
             <div key={index} className="flex justify-between items-center gap-4 mb-1.5">
               <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                 <span className="text-slate-500 font-bold uppercase tracking-wider">{entry.name}</span>
               </div>
               <span className="font-bold text-slate-800">{formatRupiah(entry.value)}</span>
             </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
      <div className="mb-6 flex justify-between items-center">
        <h4 className="font-bold text-slate-700">Tren Arus Kas <span className="text-xs font-normal text-slate-400 ml-2">({getSubTitle()})</span></h4>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4} barSize={24}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value === 0 ? '0' : `${value / 1000000}M`}
              tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 600 }}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', paddingTop: '20px' }} iconType="circle" />
            <Bar dataKey="Income" fill="#35577d" radius={[4, 4, 0, 0]} name="Total Omzet" />
            <Bar dataKey="Expense" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Pengeluaran" />
            <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Laba Rugi" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
