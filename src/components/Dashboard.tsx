import React, { useState, useEffect } from "react";
import { AccountCards } from "./AccountCards";
import { FinancialSummary } from "./FinancialSummary";
import { BudgetControl } from "./BudgetControl";
import { TargetsAndProgress } from "./TargetsAndProgress";
import { CashFlowChart } from "./CashFlowChart";
import { ProjectList, TransactionHistory } from "./Lists";
import { DailyExpenseReport } from "./DailyExpenseReport";
import { ProjectReport } from "./ProjectReport";
import { ProjectSupportManager } from "./ProjectSupportManager";
import { Modals } from "./Modals";
import {
  PlusCircle,
  ArrowDownRight,
  CalendarDays,
  Upload,
  LogOut,
  ArrowLeftRight,
  LayoutDashboard,
  FolderKanban,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { useFinance } from "../store/FinanceContext";
import { FilterPeriod } from "../types";
import { formatRupiah, cn } from "../utils";

export function Dashboard() {
  const [modal, setModal] = useState<
    "NEW_PROJECT" | "NEW_EXPENSE" | "NEW_SUPPORT" | "CHANGE_PASSWORD" | null
  >(null);
  const [activeTab, setActiveTab] = useState<
    "ALL" | "OVERVIEW" | "PROJECTS" | "SUPPORTS" | "EXPENSES"
  >("ALL");

  const { filterPeriod, setFilterPeriod, balances } = useFinance();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem("appLogo");
    if (savedLogo) {
      setLogoUrl(savedLogo);
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoUrl(base64);
        localStorage.setItem("appLogo", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-14 h-14 rounded-2xl object-contain bg-white border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-navy-700 to-navy-500 border border-slate-200 flex items-center justify-center shadow-sm">
                <span className="text-white font-extrabold text-xl tracking-tighter">
                  7
                </span>
              </div>
            )}
            <label
              className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-2xl transition-opacity"
              title="Upload Logo Perusahaan"
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <span className="text-[9px] font-bold uppercase tracking-wider">
                UBAH
              </span>
            </label>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                SEVEN INTERIOR & FURNITURE
              </h1>
              <span className="px-2 py-0.5 bg-navy-50 text-navy-700 rounded-md text-[10px] font-extrabold uppercase tracking-wider border border-navy-100">
                Finance Core
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Firewall 4 Rekening Real-time • Milestone DP 60% & Pelunasan 40% • Subsidi Silang Antar Proyek
            </p>
          </div>
        </div>

        {/* Global Controls & Modals */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              sessionStorage.removeItem("finance_admin_logged_in");
              window.location.reload();
            }}
            className="flex items-center px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors uppercase tracking-wider shadow-sm"
          >
            <LogOut size={13} className="mr-1.5" /> Logout
          </button>
          <button
            onClick={() => setModal("CHANGE_PASSWORD")}
            className="flex items-center px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-navy-300 hover:bg-slate-50 transition-colors uppercase tracking-wider shadow-sm"
          >
            Sandi
          </button>

          {/* Period Filter */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <CalendarDays
                size={13}
                className="text-slate-400 group-hover:text-navy-500 transition-colors"
              />
            </div>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as FilterPeriod)}
              className="pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-navy-300 focus:outline-none focus:ring-1 focus:ring-navy-500 appearance-none cursor-pointer uppercase tracking-wider transition-colors shadow-sm"
            >
              <option value="7_DAYS">7 Hari Terakhir</option>
              <option value="THIS_MONTH">Bulan Ini</option>
              <option value="6_MONTHS">6 Bulan Terakhir</option>
              <option value="THIS_YEAR">Tahun Ini</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
            <button
              onClick={() => setModal("NEW_PROJECT")}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-navy-50 hover:text-navy-700 rounded-lg transition-colors whitespace-nowrap uppercase tracking-wider"
            >
              <PlusCircle size={13} className="mr-1.5 text-navy-600" />
              Proyek
            </button>
            <div className="w-px bg-slate-200 my-1 hidden sm:block" />
            <button
              onClick={() => setModal("NEW_EXPENSE")}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors whitespace-nowrap uppercase tracking-wider"
            >
              <ArrowDownRight size={13} className="mr-1.5 text-rose-500" />
              Pengeluaran
            </button>
            <div className="w-px bg-slate-200 my-1 hidden sm:block" />
            <button
              onClick={() => setModal("NEW_SUPPORT")}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors whitespace-nowrap uppercase tracking-wider"
            >
              <ArrowLeftRight size={13} className="mr-1.5 text-amber-500" />
              Talangan
            </button>
          </div>
        </div>
      </div>

      {/* Outstanding Support Warning Alert */}
      {balances.totalOutstandingSupport > 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                Perhatian: Terdapat Kewajiban Talangan Aktif!
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Total{" "}
                <span className="font-bold font-mono">
                  {formatRupiah(balances.totalOutstandingSupport)}
                </span>{" "}
                dana talangan/subsidi silang antar proyek belum dikembalikan ke pos asal.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("SUPPORTS")}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-sm self-start sm:self-auto shrink-0"
          >
            Lihat & Lunaskan Talangan
          </button>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("ALL")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "ALL"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Layers size={14} />
          Semua Tampilan
        </button>
        <button
          onClick={() => setActiveTab("OVERVIEW")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "OVERVIEW"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <LayoutDashboard size={14} />
          Ringkasan & Firewall Kas
        </button>
        <button
          onClick={() => setActiveTab("PROJECTS")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "PROJECTS"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <FolderKanban size={14} />
          Pipeline & Laba Rugi Proyek
        </button>
        <button
          onClick={() => setActiveTab("SUPPORTS")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "SUPPORTS"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <ArrowLeftRight size={14} />
          Talangan & Subsidi Silang
          {balances.totalOutstandingSupport > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("EXPENSES")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "EXPENSES"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <FileSpreadsheet size={14} />
          Laporan Pengeluaran & Riwayat
        </button>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {(activeTab === "ALL" || activeTab === "OVERVIEW") && (
        <>
          <AccountCards />
          <FinancialSummary />
          <BudgetControl />
          <TargetsAndProgress />
          <CashFlowChart />
        </>
      )}

      {/* TAB CONTENT: PROJECTS */}
      {(activeTab === "ALL" || activeTab === "PROJECTS") && (
        <div className="space-y-8 mb-8">
          <ProjectList />
          <ProjectReport />
        </div>
      )}

      {/* TAB CONTENT: SUPPORTS (SUBSIDI SILANG) */}
      {(activeTab === "ALL" || activeTab === "SUPPORTS") && (
        <ProjectSupportManager onOpenAddModal={() => setModal("NEW_SUPPORT")} />
      )}

      {/* TAB CONTENT: EXPENSES & HISTORY */}
      {(activeTab === "ALL" || activeTab === "EXPENSES") && (
        <div className="space-y-8 mb-8">
          <DailyExpenseReport />
          <TransactionHistory />
        </div>
      )}

      {/* Modals Provider */}
      <Modals activeModal={modal} close={() => setModal(null)} />
    </div>
  );
}
