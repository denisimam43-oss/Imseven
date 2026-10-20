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
import { StrategyPanel } from "./StrategyPanel";
import { ArahanPanel } from "./ArahanPanel";
import { PeriodRecap } from "./PeriodRecap";
import { Modals, ModalType } from "./Modals";
import { CsvExportModal, ReportExportType } from "./CsvExportModal";
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
  HandCoins,
  Repeat,
  Download,
  ShieldAlert,
  LifeBuoy,
  BookLock,
} from "lucide-react";
import { useFinance } from "../store/FinanceContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { FilterPeriod } from "../types";
import { formatRupiah, cn } from "../utils";

export function Dashboard() {
  const [modal, setModal] = useState<ModalType | null>(null);
  const [modalProjectId, setModalProjectId] = useState<string | undefined>();
  const openModal = (m: ModalType, projectId?: string) => {
    setModalProjectId(projectId);
    setModal(m);
  };
  const [activeTab, setActiveTab] = useState<
    "ALL" | "OVERVIEW" | "RECAP" | "STRATEGY" | "PROJECTS" | "SUPPORTS" | "EXPENSES"
  >("ALL");

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvModalType, setCsvModalType] = useState<ReportExportType>("ALL_COMPREHENSIVE");

  const openCsvExport = (type: ReportExportType = "ALL_COMPREHENSIVE") => {
    setCsvModalType(type);
    setCsvModalOpen(true);
  };

  const {
    filterPeriod,
    setFilterPeriod,
    balances,
    debt,
    needsReconcile,
    dismissReconcile,
    exportData,
    importData,
    cloud,
  } = useFinance();

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    a.href = url;
    a.download = `backup-keuangan-seven-interior-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    try {
      localStorage.setItem("seven_interior_last_backup", String(Date.now()));
    } catch {
      /* abaikan */
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm("Pulihkan data dari file backup? Data yang ada di perangkat ini akan diganti.")) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = importData(JSON.parse(String(reader.result)));
        alert(res.message);
      } catch {
        alert("File tidak bisa dibaca. Pastikan memilih file backup .json dari aplikasi ini.");
      }
    };
    reader.readAsText(file);
  };

  const lastBackup = Number(localStorage.getItem("seven_interior_last_backup") || 0);
  const backupStale = Date.now() - lastBackup > 7 * 24 * 3600 * 1000;
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
              Firewall 4 Rekening • Pembayaran Sesuai Fakta • Laba Diakui Saat Serah Terima
            </p>
            {cloud.enabled && (
              <p className="text-[11px] font-semibold mt-1 flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", cloud.error ? "bg-rose-500" : cloud.saving ? "bg-amber-400" : "bg-emerald-500")} />
                <span className={cloud.error ? "text-rose-600" : "text-slate-500"}>
                  {cloud.error ? "Tidak tersambung ke server" : cloud.saving ? "Menyimpan ke server…" : `Online · ${auth?.currentUser?.email ?? ""}`}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Global Controls & Modals */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (cloud.enabled && auth) {
                signOut(auth);
                return;
              }
              sessionStorage.removeItem("finance_admin_logged_in");
              window.location.reload();
            }}
            className="flex items-center px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors uppercase tracking-wider shadow-sm"
          >
            <LogOut size={13} className="mr-1.5" /> Logout
          </button>
          <button
            onClick={() => openCsvExport("ALL_COMPREHENSIVE")}
            className="flex items-center px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-colors uppercase tracking-wider shadow-sm"
            title="Ekspor laporan keuangan ke format CSV (Excel / Google Sheets)"
          >
            <FileSpreadsheet size={13} className="mr-1.5 text-emerald-600" /> Ekspor CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-navy-300 hover:bg-slate-50 transition-colors uppercase tracking-wider shadow-sm"
            title="Unduh backup data (.json)"
          >
            <Download size={13} className="mr-1.5" /> Backup
          </button>
          <label
            className="flex items-center px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-navy-300 hover:bg-slate-50 transition-colors uppercase tracking-wider shadow-sm cursor-pointer"
            title="Pulihkan data dari file backup"
          >
            <Upload size={13} className="mr-1.5" /> Pulihkan
            <input type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
          </label>
          {!cloud.enabled && (
          <button
            onClick={() => openModal("CHANGE_PASSWORD")}
            className="flex items-center px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-navy-300 hover:bg-slate-50 transition-colors uppercase tracking-wider shadow-sm"
          >
            Sandi
          </button>
          )}

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
              <option value="THIS_CUTOFF">Periode Ini (26–25)</option>
              <option value="LAST_CUTOFF">Periode Lalu (26–25)</option>
              <option value="7_DAYS">7 Hari Terakhir</option>
              <option value="THIS_MONTH">Bulan Kalender Ini</option>
              <option value="6_MONTHS">6 Bulan Terakhir</option>
              <option value="THIS_YEAR">Tahun Ini</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
            <button
              onClick={() => openModal("NEW_PROJECT")}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-navy-50 hover:text-navy-700 rounded-lg transition-colors whitespace-nowrap uppercase tracking-wider"
            >
              <PlusCircle size={13} className="mr-1.5 text-navy-600" />
              Proyek
            </button>
            <div className="w-px bg-slate-200 my-1 hidden sm:block" />
            <button
              onClick={() => openModal("NEW_PAYMENT")}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors whitespace-nowrap uppercase tracking-wider"
            >
              <HandCoins size={13} className="mr-1.5 text-emerald-600" />
              Terima Bayar
            </button>
            <div className="w-px bg-slate-200 my-1 hidden sm:block" />
            <button
              onClick={() => openModal("NEW_EXPENSE")}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors whitespace-nowrap uppercase tracking-wider"
            >
              <ArrowDownRight size={13} className="mr-1.5 text-rose-500" />
              Pengeluaran
            </button>
            <div className="w-px bg-slate-200 my-1 hidden sm:block" />
            <button
              onClick={() => openModal("NEW_TRANSFER")}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 rounded-lg transition-colors whitespace-nowrap uppercase tracking-wider"
            >
              <Repeat size={13} className="mr-1.5 text-sky-500" />
              Transfer
            </button>
            <div className="w-px bg-slate-200 my-1 hidden sm:block" />
            <button
              onClick={() => openModal("NEW_SUPPORT")}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors whitespace-nowrap uppercase tracking-wider"
            >
              <ArrowLeftRight size={13} className="mr-1.5 text-amber-500" />
              Talangan
            </button>
          </div>
        </div>
      </div>

      {cloud.enabled && cloud.error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold">
          {cloud.error}
        </div>
      )}

      {cloud.enabled && !cloud.ready && !cloud.error && (
        <div className="mb-6 p-6 bg-white border border-slate-200 rounded-2xl text-sm text-slate-500 text-center">
          Mengambil data dari server…
        </div>
      )}

      {cloud.enabled && cloud.empty && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-950 text-xs">
          {cloud.localData ? (
            <>
              <span>
                <b>Database online masih kosong.</b> Di perangkat ini ada data lama: {cloud.localData.projects.length} proyek &{" "}
                {cloud.localData.transactions.length} transaksi. Pindahkan sekali saja ke server agar bisa dibuka dari perangkat lain.
              </span>
              <button
                onClick={() => {
                  if (!window.confirm("Pindahkan seluruh data lama di perangkat ini ke database online?")) return;
                  alert(cloud.migrateLocal().message);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl self-start sm:self-auto shrink-0"
              >
                Pindahkan ke server
              </button>
            </>
          ) : (
            <span>
              <b>Database online masih kosong.</b> Buka aplikasi ini di laptop yang dulu dipakai mencatat (data lama ada di sana),
              lalu tekan &quot;Pindahkan ke server&quot;. Atau gunakan tombol <b>Pulihkan</b> dengan file backup .json terbaru.
            </span>
          )}
        </div>
      )}

      {needsReconcile && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-purple-900">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-600 text-white rounded-xl shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div className="text-xs">
              <p className="font-bold uppercase tracking-wider">Sistem keuangan diperbarui: cocokkan saldo sekali</p>
              <p className="mt-0.5 text-purple-800">
                Versi lama menghitung saldo Rek 1 dua kali. Data lama sudah dikonversi (cadangan aslinya tetap disimpan).
                Cek saldo tiap rekening di bawah dengan saldo bank hari ini, lalu klik ikon pensil untuk menyesuaikan yang berbeda.
              </p>
            </div>
          </div>
          <button
            onClick={dismissReconcile}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-sm self-start sm:self-auto shrink-0"
          >
            Sudah Dicocokkan
          </button>
        </div>
      )}

      {!cloud.enabled && !needsReconcile && backupStale && (
        <div className="mb-6 p-3 bg-slate-100 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
          <span>
            Data hanya tersimpan di browser perangkat ini. Unduh backup minimal seminggu sekali agar tidak hilang.
          </span>
          <button onClick={handleExport} className="px-3 py-1.5 bg-slate-800 text-white font-bold uppercase tracking-wider rounded-xl self-start sm:self-auto shrink-0">
            Backup Sekarang
          </button>
        </div>
      )}

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

      {(!cloud.enabled || cloud.ready) && (
      <>
      {(!cloud.enabled || cloud.ready) && (
      <>
      <ArahanPanel
        onPayment={(id) => openModal("NEW_PAYMENT", id)}
        onRecap={() => setActiveTab("RECAP")}
      />

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
          onClick={() => setActiveTab("RECAP")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "RECAP"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <BookLock size={14} />
          Rekap Periode & Tutup Buku
        </button>
        <button
          onClick={() => setActiveTab("STRATEGY")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "STRATEGY"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <LifeBuoy size={14} />
          Strategi Utang & Target
          {debt.totalHole > 0 && <span className="w-2 h-2 rounded-full bg-rose-500" />}
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
          {activeTab === "OVERVIEW" && <TargetsAndProgress />}
          <CashFlowChart />
        </>
      )}

      {/* TAB CONTENT: REKAP PERIODE */}
      {(activeTab === "ALL" || activeTab === "RECAP") && <PeriodRecap />}

      {/* TAB CONTENT: STRATEGI UTANG & TARGET */}
      {(activeTab === "ALL" || activeTab === "STRATEGY") && (
        <>
          <StrategyPanel
            onSupport={(id) => openModal("NEW_SUPPORT", id)}
            onPayment={(id) => openModal("NEW_PAYMENT", id)}
          />
          <TargetsAndProgress />
        </>
      )}

      {/* TAB CONTENT: PROJECTS */}
      {(activeTab === "ALL" || activeTab === "PROJECTS") && (
        <div className="space-y-8 mb-8">
          <ProjectList onPayment={(id) => openModal("NEW_PAYMENT", id)} />
          <ProjectReport />
        </div>
      )}

      {/* TAB CONTENT: SUPPORTS (SUBSIDI SILANG) */}
      {(activeTab === "ALL" || activeTab === "SUPPORTS") && (
        <ProjectSupportManager onOpenAddModal={() => openModal("NEW_SUPPORT")} />
      )}

      {/* TAB CONTENT: EXPENSES & HISTORY */}
      {(activeTab === "ALL" || activeTab === "EXPENSES") && (
        <div className="space-y-8 mb-8">
          <DailyExpenseReport />
          <TransactionHistory />
        </div>
      )}

      </>
      )}

      </>
      )}

      {/* Modals Provider */}
      <Modals activeModal={modal} close={() => setModal(null)} initialProjectId={modalProjectId} />

      {/* CSV Export Reporting Modal */}
      <CsvExportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        defaultType={csvModalType}
      />
    </div>
  );
}
