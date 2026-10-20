import React, { useState } from "react";
import { useFinance } from "../store/FinanceContext";
import {
  FileSpreadsheet,
  Download,
  X,
  CheckCircle2,
  TableProperties,
  Building2,
  Wallet,
  ArrowLeftRight,
  Receipt,
  Layers,
  Settings2,
} from "lucide-react";
import {
  CsvDelimiter,
  downloadCsv,
  generateTransactionsCsv,
  generateProjectsCsv,
  generateBalancesCsv,
  generateSupportsCsv,
  generateDailyExpenseCsv,
  generateComprehensiveReportCsv,
} from "../csvExport";
import { cn } from "../utils";

export type ReportExportType =
  | "ALL_COMPREHENSIVE"
  | "TRANSACTIONS"
  | "PROJECTS"
  | "BALANCES"
  | "SUPPORTS"
  | "DAILY_EXPENSES";

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: ReportExportType;
}

const PERIOD_NAMES: Record<string, string> = {
  "7_DAYS": "7 Hari Terakhir",
  THIS_MONTH: "Bulan Ini",
  "6_MONTHS": "6 Bulan Terakhir",
  THIS_YEAR: "Tahun Ini",
};

export function CsvExportModal({ isOpen, onClose, defaultType = "ALL_COMPREHENSIVE" }: CsvExportModalProps) {
  const {
    projects,
    transactions,
    filteredTransactions,
    supports,
    settings,
    filterPeriod,
    isInPeriod,
  } = useFinance();

  const [reportType, setReportType] = useState<ReportExportType>(defaultType);
  const [scopePeriod, setScopePeriod] = useState<"ACTIVE_PERIOD" | "ALL_TIME">("ACTIVE_PERIOD");
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(",");
  const [includeTransfers, setIncludeTransfers] = useState(true);
  const [justDownloaded, setJustDownloaded] = useState<string | null>(null);

  if (!isOpen) return null;

  const activePeriodLabel = PERIOD_NAMES[filterPeriod] || filterPeriod;
  const isPeriodScoped = scopePeriod === "ACTIVE_PERIOD";

  // Data based on period scope
  const targetTransactions = isPeriodScoped ? filteredTransactions : transactions;
  const targetSupports = isPeriodScoped
    ? supports.filter((s) => isInPeriod(s.date))
    : supports;

  const countTx = targetTransactions.length;
  const countProjects = projects.length;

  const handleDownload = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const periodTag = isPeriodScoped ? filterPeriod.toLowerCase() : "all-time";

    let csvContent = "";
    let filename = "";

    switch (reportType) {
      case "TRANSACTIONS":
        csvContent = generateTransactionsCsv(targetTransactions, projects, {
          delimiter,
          includeTransfers,
        });
        filename = `seven-interior-transaksi-${periodTag}-${dateStr}.csv`;
        break;

      case "PROJECTS":
        csvContent = generateProjectsCsv(projects, transactions, supports, {
          delimiter,
        });
        filename = `seven-interior-rekap-proyek-${dateStr}.csv`;
        break;

      case "BALANCES":
        csvContent = generateBalancesCsv(transactions, settings, {
          delimiter,
        });
        filename = `seven-interior-saldo-rekening-${dateStr}.csv`;
        break;

      case "SUPPORTS":
        csvContent = generateSupportsCsv(targetSupports, {
          delimiter,
        });
        filename = `seven-interior-talangan-antar-proyek-${dateStr}.csv`;
        break;

      case "DAILY_EXPENSES":
        csvContent = generateDailyExpenseCsv(targetTransactions, {
          delimiter,
        });
        filename = `seven-interior-pengeluaran-harian-${periodTag}-${dateStr}.csv`;
        break;

      case "ALL_COMPREHENSIVE":
      default:
        csvContent = generateComprehensiveReportCsv(
          {
            projects,
            transactions: targetTransactions,
            supports: targetSupports,
            settings,
            filterPeriodLabel: isPeriodScoped ? activePeriodLabel : "Seluruh Waktu",
            isInPeriod: isPeriodScoped ? isInPeriod : () => true,
          },
          { delimiter },
        );
        filename = `seven-interior-laporan-keuangan-lengkap-${periodTag}-${dateStr}.csv`;
        break;
    }

    downloadCsv(csvContent, filename);
    setJustDownloaded(filename);
    setTimeout(() => {
      setJustDownloaded(null);
    }, 4000);
  };

  const reports: {
    id: ReportExportType;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge: string;
  }[] = [
    {
      id: "ALL_COMPREHENSIVE",
      title: "Laporan Lengkap Komprehensif",
      description:
        "Paket lengkap: Ringkasan Laba Rugi & Posisi Keuangan, Saldo 4 Rekening Firewall, Rekapitulasi Proyek, dan Rincian Jurnal Kas.",
      icon: <Layers size={18} className="text-navy-600" />,
      badge: "Disarankan",
    },
    {
      id: "TRANSACTIONS",
      title: "Buku Kas & Jurnal Transaksi",
      description:
        "Daftar lengkap uang masuk, keluar, dan transfer beserta tanggal, rekening, kategori pos biaya, dan nomor proyek.",
      icon: <Receipt size={18} className="text-emerald-600" />,
      badge: `${countTx} Transaksi`,
    },
    {
      id: "PROJECTS",
      title: "Rekapitulasi Kinerja & Laba Proyek",
      description:
        "Nilai kontrak, DP masuk, sisa piutang 40%, realisasi HPP bahan baku & labour, margin laba kotor & bersih per proyek.",
      icon: <Building2 size={18} className="text-sky-600" />,
      badge: `${countProjects} Proyek`,
    },
    {
      id: "BALANCES",
      title: "Saldo 4 Rekening & Firewall Kas",
      description:
        "Posisi saldo likuid Rek 1 Transit, Rek 2 Lock HPP, Rek 3 Lock OpEx, dan Rek 4 Lock Profit sesuai SOP.",
      icon: <Wallet size={18} className="text-purple-600" />,
      badge: "4 Rekening",
    },
    {
      id: "SUPPORTS",
      title: "Laporan Talangan & Subsidi Silang",
      description:
        "Monitoring pergerakan dana talangan antar proyek, saldo kewajiban pengembalian, status lunas vs outstanding.",
      icon: <ArrowLeftRight size={18} className="text-amber-600" />,
      badge: `${supports.length} Talangan`,
    },
    {
      id: "DAILY_EXPENSES",
      title: "Laporan Pengeluaran Harian",
      description:
        "Rincian transaksi pengeluaran dikelompokkan berdasarkan tanggal dan pos kategori untuk audit operasional.",
      icon: <TableProperties size={18} className="text-rose-600" />,
      badge: "Pengeluaran",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">
                  Ekspor Laporan Keuangan CSV
                </h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md border border-emerald-200 uppercase">
                  Excel & Sheets
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Unduh data keuangan dalam format spreadsheet (.csv) siap olah untuk laporan & perpajakan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            title="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Success Banner if just downloaded */}
          {justDownloaded && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div className="text-xs font-semibold">
                File <span className="font-mono text-emerald-800">{justDownloaded}</span> berhasil diunduh!
              </div>
            </div>
          )}

          {/* 1. Pilih Jenis Laporan */}
          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2.5">
              1. Pilih Jenis Laporan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {reports.map((r) => {
                const isSelected = reportType === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setReportType(r.id)}
                    className={cn(
                      "flex flex-col text-left p-3.5 rounded-2xl border transition-all relative",
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                          {r.icon}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          {r.title}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0",
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {r.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                      {r.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Pengaturan Filter & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {/* Periode */}
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                2. Cakupan Periode
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setScopePeriod("ACTIVE_PERIOD")}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-center transition-all",
                    scopePeriod === "ACTIVE_PERIOD"
                      ? "bg-white text-slate-800 shadow-2xs font-bold"
                      : "hover:text-slate-900",
                  )}
                >
                  Filter Aktif ({activePeriodLabel})
                </button>
                <button
                  type="button"
                  onClick={() => setScopePeriod("ALL_TIME")}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-center transition-all",
                    scopePeriod === "ALL_TIME"
                      ? "bg-white text-slate-800 shadow-2xs font-bold"
                      : "hover:text-slate-900",
                  )}
                >
                  Seluruh Waktu
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                {scopePeriod === "ACTIVE_PERIOD"
                  ? `Hanya mencakup data dalam ${activePeriodLabel}.`
                  : "Mengekspor seluruh riwayat transaksi sejak awal aplikasi."}
              </p>
            </div>

            {/* Delimiter / Pemisah Kolom */}
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                3. Pemisah Kolom (Delimiter)
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setDelimiter(",")}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-center transition-all",
                    delimiter === ","
                      ? "bg-white text-slate-800 shadow-2xs font-bold"
                      : "hover:text-slate-900",
                  )}
                >
                  Koma ( , ) • Standard
                </button>
                <button
                  type="button"
                  onClick={() => setDelimiter(";")}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-center transition-all",
                    delimiter === ";"
                      ? "bg-white text-slate-800 shadow-2xs font-bold"
                      : "hover:text-slate-900",
                  )}
                >
                  Titik Koma ( ; ) • Excel ID
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                {delimiter === ";"
                  ? "Rekomendasi untuk Microsoft Excel dengan format regional Indonesia."
                  : "Standard internasional untuk Google Sheets dan software analisis data."}
              </p>
            </div>
          </div>

          {/* Opsi Tambahan untuk Transaksi */}
          {(reportType === "TRANSACTIONS" || reportType === "ALL_COMPREHENSIVE") && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTransfers}
                  onChange={(e) => setIncludeTransfers(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Sertakan transaksi transfer internal antar rekening firewall</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {includeTransfers ? "Transparan penuh" : "Hanya arus kas luar"}
              </span>
            </div>
          )}

          {/* Summary Preview Box */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-slate-400" />
              <span className="font-semibold text-slate-700 text-xs">
                Format: <span className="font-mono font-bold text-slate-900">UTF-8 dengan BOM (Excel-Ready)</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Angka desimal murni tanpa simbol agar formula Excel/Sheets langsung berfungsi
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors uppercase tracking-wider"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
          >
            <Download size={15} />
            Unduh CSV Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
