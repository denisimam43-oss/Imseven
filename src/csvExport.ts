import {
  Project,
  Transaction,
  ProjectSupport,
  FinanceSettings,
  REKENING_LABEL,
  INCOME_TYPE_LABEL,
  RekeningType,
} from "./types";
import {
  computeBalances,
  isRealExpense,
  isRealIncome,
  isHpp,
  summarizeProject,
  computeProfitLoss,
  computeBalanceSheet,
} from "./finance";
import { formatDate } from "./utils";

export type CsvDelimiter = "," | ";";

export interface CsvExportOptions {
  delimiter?: CsvDelimiter;
  includeTransfers?: boolean;
}

/**
 * Escapes a single CSV cell value according to RFC 4180 standard.
 */
export function escapeCsvCell(val: unknown, delimiter: CsvDelimiter = ","): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // If string contains delimiter, double-quote, or newline, escape it
  if (str.includes(delimiter) || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Formats a row of cells with the given delimiter.
 */
export function formatCsvRow(row: unknown[], delimiter: CsvDelimiter = ","): string {
  return row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter);
}

/**
 * Triggers browser download of a CSV file with UTF-8 BOM for Microsoft Excel compatibility.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  // \uFEFF is the UTF-8 Byte Order Mark (BOM).
  // Without it, Excel defaults to Windows-1252/ANSI and breaks on accents/special characters.
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to get project name from project ID.
 */
function getProjectName(projects: Project[], id?: string): string {
  if (!id) return "-";
  const found = projects.find((p) => p.id === id);
  return found ? found.name : id;
}

/**
 * 1. Generate Transactions / Cash Flow Journal CSV
 */
export function generateTransactionsCsv(
  transactions: Transaction[],
  projects: Project[],
  options: CsvExportOptions = {},
): string {
  const d = options.delimiter || ",";
  const includeTransfers = options.includeTransfers !== false;

  const filtered = transactions.filter((t) => includeTransfers || t.type !== "TRANSFER");

  const headers = [
    "ID Transaksi",
    "Tanggal (YYYY-MM-DD)",
    "Waktu Lengkap",
    "Tipe",
    "Rekening Sumber",
    "Rekening Tujuan",
    "Nama Proyek",
    "Kategori / Pos Biaya",
    "Jenis Pemasukan",
    "Deskripsi / Keterangan",
    "Nominal Masuk (IDR)",
    "Nominal Keluar (IDR)",
    "Nominal Bersih (IDR)",
    "Ref Talangan",
    "Penyesuaian Saldo",
  ];

  const rows: string[] = [formatCsvRow(headers, d)];

  for (const t of filtered) {
    const pName = getProjectName(projects, t.projectId);
    const dateYmd = new Date(t.date).toISOString().slice(0, 10);
    const dateFormatted = formatDate(t.date, "dd/MM/yyyy HH:mm");

    let tipeLabel = "PENGELUARAN";
    let rekSumber = t.expenseAccount || "-";
    let rekTujuan = "-";
    let masuk = 0;
    let keluar = 0;

    if (t.type === "INCOME") {
      tipeLabel = t.isAdjustment ? "PENYESUAIAN MASUK" : "PEMASUKAN";
      rekSumber = "-";
      rekTujuan = t.account || "REK1";
      masuk = t.amount;
    } else if (t.type === "EXPENSE") {
      tipeLabel = t.isAdjustment ? "PENYESUAIAN KELUAR" : "PENGELUARAN";
      rekSumber = t.expenseAccount || "REK1";
      rekTujuan = "-";
      keluar = t.amount;
    } else if (t.type === "TRANSFER") {
      tipeLabel = t.pending ? "ARAHAN TRANSFER (BELUM DIKERJAKAN)" : "TRANSFER INTERNAL";
      rekSumber = t.fromAccount || "-";
      rekTujuan = t.toAccount || "-";
    }

    const nominalBersih = masuk > 0 ? masuk : keluar > 0 ? -keluar : 0;

    rows.push(
      formatCsvRow(
        [
          t.id,
          dateYmd,
          dateFormatted,
          tipeLabel,
          rekSumber,
          rekTujuan,
          pName,
          t.expenseCategory || "-",
          t.incomeType ? INCOME_TYPE_LABEL[t.incomeType] || t.incomeType : "-",
          t.description,
          masuk,
          keluar,
          nominalBersih,
          t.supportId ? `Talangan #${t.supportId.slice(0, 8)}` : "-",
          t.isAdjustment ? "YA" : "TIDAK",
        ],
        d,
      ),
    );
  }

  return rows.join("\r\n");
}

/**
 * 2. Generate Project Financial Summary & Profitability CSV
 */
export function generateProjectsCsv(
  projects: Project[],
  transactions: Transaction[],
  supports: ProjectSupport[],
  options: CsvExportOptions = {},
): string {
  const d = options.delimiter || ",";

  const headers = [
    "ID Proyek",
    "Nama Proyek",
    "Status Proyek",
    "Kategori Utang Project",
    "Tanggal Pendaftaran",
    "Tanggal Serah Terima",
    "Nilai Kontrak (IDR)",
    "Total Penerimaan Klien (IDR)",
    "Sisa Piutang Pelunasan (IDR)",
    "HPP Bahan Baku (IDR)",
    "HPP Upah Labour (IDR)",
    "Total HPP (IDR)",
    "Biaya Lain Proyek (IDR)",
    "Total Pengeluaran (IDR)",
    "Status Pengakuan Pendapatan",
    "Pendapatan Diakui (IDR)",
    "Laba Proyek (IDR)",
    "Margin Laba (%)",
    "Talangan Diterima/Pinjam (IDR)",
    "Talangan Diberikan (IDR)",
    "Catatan Klien",
  ];

  const rows: string[] = [formatCsvRow(headers, d)];

  for (const p of projects) {
    const s = summarizeProject(p, transactions);

    // Calculate material vs labour breakdown
    const tx = transactions.filter((t) => t.projectId === p.id && isRealExpense(t));
    const matCost = tx
      .filter((t) => t.expenseCategory?.startsWith("HPP") && !t.expenseCategory.includes("Labour"))
      .reduce((sum, t) => sum + t.amount, 0);
    const labCost = tx
      .filter((t) => t.expenseCategory?.includes("Labour"))
      .reduce((sum, t) => sum + t.amount, 0);

    const taken = supports
      .filter((x) => x.toProjectId === p.id && x.status === "OUTSTANDING")
      .reduce((sum, x) => sum + x.amount, 0);
    const given = supports
      .filter((x) => x.fromProjectId === p.id && x.status === "OUTSTANDING")
      .reduce((sum, x) => sum + x.amount, 0);

    const profit = s.recognized ? s.profit : s.estimatedProfit;
    const marginPct = Number(s.margin.toFixed(2));

    rows.push(
      formatCsvRow(
        [
          p.id,
          p.name,
          p.archived ? "DIARSIPKAN" : p.status === "COMPLETED" ? "SELESAI (SERAH TERIMA)" : "SEDANG BERJALAN",
          p.isDebtProject ? "YA (UTANG PROJECT)" : "TIDAK (REGULER)",
          formatDate(p.createdAt, "dd/MM/yyyy"),
          p.completedAt ? formatDate(p.completedAt, "dd/MM/yyyy") : "-",
          p.totalValue,
          s.received,
          s.outstanding,
          matCost,
          labCost,
          s.hpp,
          s.otherCost,
          s.totalCost,
          s.recognized ? "DIAKUI (SERAH TERIMA)" : "BELUM DIAKUI (UANG MUKA)",
          s.revenue,
          profit,
          marginPct,
          taken,
          given,
          p.clientNotes || "-",
        ],
        d,
      ),
    );
  }

  return rows.join("\r\n");
}

/**
 * 3. Generate Account Balances & Firewall Report CSV
 */
export function generateBalancesCsv(
  transactions: Transaction[],
  settings: FinanceSettings,
  options: CsvExportOptions = {},
): string {
  const d = options.delimiter || ",";
  const b = computeBalances(transactions);

  const headers = [
    "Kode Rekening",
    "Nama Rekening",
    "Peruntukan Sesuai SOP Firewall",
    "Porsi Alokasi SOP (%)",
    "Saldo Terkini (IDR)",
  ];

  const rows: string[] = [formatCsvRow(headers, d)];

  const accs: { code: RekeningType; name: string; purpose: string; pct: string; balance: number }[] = [
    {
      code: "REK1",
      name: "Rekening 1 - Transit & Omset Gateway",
      purpose: "Penampungan awal omset klien sebelum dipisah firewall",
      pct: "-",
      balance: b.REK1,
    },
    {
      code: "REK2",
      name: "Rekening 2 - Lock HPP Proyek",
      purpose: "Anggaran Bahan Baku (40%) + Upah Labour & Tukang (13%)",
      pct: `${settings.shares.bahan + settings.shares.labour}%`,
      balance: b.REK2,
    },
    {
      code: "REK3",
      name: "Rekening 3 - Lock OpEx & Cadangan",
      purpose: "Operasional Kantor (3%) + Kontingensi (2%) + Prive (2%) + Beban Tetap (20%)",
      pct: `${settings.shares.ops + settings.shares.kontingensi + settings.shares.prive + settings.shares.expense}%`,
      balance: b.REK3,
    },
    {
      code: "REK4",
      name: "Rekening 4 - Lock Profit & Pemulihan",
      purpose: "Laba Bersih Perusahaan & Cadangan Pemulihan Proyek",
      pct: `${settings.shares.profit}%`,
      balance: b.REK4,
    },
  ];

  for (const item of accs) {
    rows.push(
      formatCsvRow(
        [item.code, item.name, item.purpose, item.pct, item.balance],
        d,
      ),
    );
  }

  const totalKas = b.REK1 + b.REK2 + b.REK3 + b.REK4;
  rows.push(
    formatCsvRow(
      ["TOTAL", "Total Kas di Semua Rekening", "Total Likuiditas Kas Riil", "100%", totalKas],
      d,
    ),
  );

  return rows.join("\r\n");
}

/**
 * 4. Generate Inter-Project Support / Talangan Report CSV
 */
export function generateSupportsCsv(
  supports: ProjectSupport[],
  options: CsvExportOptions = {},
): string {
  const d = options.delimiter || ",";

  const headers = [
    "ID Talangan",
    "Tanggal Pencatatan",
    "Proyek Pemberi Dana",
    "Proyek Penerima Dana",
    "Nominal Talangan (IDR)",
    "Status Pengembalian",
    "Tanggal Lunas / Dikembalikan",
    "Rekening Sumber",
    "Keterangan / Keperluan",
  ];

  const rows: string[] = [formatCsvRow(headers, d)];

  for (const s of supports) {
    rows.push(
      formatCsvRow(
        [
          s.id,
          formatDate(s.date, "dd/MM/yyyy"),
          s.fromProjectName || "Operasional / Kas",
          s.toProjectName || "-",
          s.amount,
          s.status === "OUTSTANDING" ? "BELUM KEMBALI (OUTSTANDING)" : "SUDAH KEMBALI (LUNAS)",
          s.returnedAt ? formatDate(s.returnedAt, "dd/MM/yyyy HH:mm") : "-",
          s.account || "REK2",
          s.description || "-",
        ],
        d,
      ),
    );
  }

  return rows.join("\r\n");
}

/**
 * 5. Generate Daily Expenses Report CSV
 */
export function generateDailyExpenseCsv(
  transactions: Transaction[],
  options: CsvExportOptions = {},
): string {
  const d = options.delimiter || ",";

  const expenses = transactions.filter((t) => isRealExpense(t));

  const headers = [
    "Tanggal (YYYY-MM-DD)",
    "Tanggal Format",
    "Kategori Pengeluaran",
    "Rekening Sumber",
    "ID Transaksi",
    "Keterangan",
    "Nominal Pengeluaran (IDR)",
  ];

  const rows: string[] = [formatCsvRow(headers, d)];

  // Sort by date descending
  const sorted = [...expenses].sort((a, b) => b.date - a.date);

  for (const t of sorted) {
    const ymd = new Date(t.date).toISOString().slice(0, 10);
    rows.push(
      formatCsvRow(
        [
          ymd,
          formatDate(t.date, "dd/MM/yyyy"),
          t.expenseCategory || "Lainnya",
          t.expenseAccount || "REK1",
          t.id,
          t.description,
          t.amount,
        ],
        d,
      ),
    );
  }

  return rows.join("\r\n");
}

/**
 * 6. Generate Comprehensive Financial Master Report CSV
 * Combines Executive Summary, Firewall Account Balances, Project Performance,
 * and Transactions into one clean, well-delimited spreadsheet report.
 */
export function generateComprehensiveReportCsv(
  data: {
    projects: Project[];
    transactions: Transaction[];
    supports: ProjectSupport[];
    settings: FinanceSettings;
    filterPeriodLabel: string;
    isInPeriod: (ts: number) => boolean;
  },
  options: CsvExportOptions = {},
): string {
  const d = options.delimiter || ",";
  const { projects, transactions, supports, settings, filterPeriodLabel, isInPeriod } = data;

  const pl = computeProfitLoss(projects, transactions, isInPeriod);
  const bs = computeBalanceSheet(projects, transactions);
  const b = computeBalances(transactions);

  const lines: string[] = [];

  // Title section
  lines.push(formatCsvRow(["SEVEN INTERIOR & FURNITURE - LAPORAN KEUANGAN KOMPREHENSIF"], d));
  lines.push(formatCsvRow(["Tanggal Ekspor:", formatDate(Date.now(), "dd MMMM yyyy HH:mm:ss")], d));
  lines.push(formatCsvRow(["Periode Filter:", filterPeriodLabel], d));
  lines.push(formatCsvRow(["Sistem Akuntansi:", "SAK EMKM - Pengakuan Pendapatan Saat Serah Terima"], d));
  lines.push("");

  // SECTION 1: RINGKASAN EKSEKUTIF LABA RUGI & POSISI KEUANGAN
  lines.push(formatCsvRow(["--- 1. RINGKASAN LABA RUGI & POSISI KEUANGAN ---"], d));
  lines.push(formatCsvRow(["Indikator Keuangan", "Nilai (IDR)", "Keterangan"], d));
  lines.push(formatCsvRow(["Pendapatan Proyek (Revenue)", pl.revenue, `${pl.completedCount} proyek serah terima di periode`], d));
  lines.push(formatCsvRow(["HPP & Beban Proyek", -pl.projectCost, "Biaya bahan & labour proyek serah terima"], d));
  lines.push(formatCsvRow(["Laba Kotor (Gross Profit)", pl.grossProfit, "Pendapatan dikurangi HPP proyek serah terima"], d));
  lines.push(formatCsvRow(["Biaya Operasional & Umum (OpEx)", -pl.opex, "Beban operasional non-proyek pada periode"], d));
  lines.push(formatCsvRow(["Laba Bersih (Net Profit)", pl.netProfit, "Laba kotor dikurangi biaya operasional umum"], d));
  lines.push(formatCsvRow(["Total Saldo Kas 4 Rekening", bs.cash, "Kas di Rek 1, Rek 2, Rek 3, Rek 4"], d));
  lines.push(formatCsvRow(["Piutang Klien (Pelunasan)", bs.receivables, "Tagihan proyek selesai yang belum dilunasi"], d));
  lines.push(formatCsvRow(["Proyek Dalam Pengerjaan (WIP)", bs.wip, "Biaya yang telah keluar untuk proyek berjalan"], d));
  lines.push(formatCsvRow(["Total Aset Lancar", bs.cash + bs.receivables + bs.wip, "Kas + Piutang + WIP"], d));
  lines.push(formatCsvRow(["Kewajiban Uang Muka Klien", -bs.customerAdvances, "Uang klien untuk proyek yang belum serah terima"], d));
  lines.push(formatCsvRow(["Aset Bersih Perusahaan", bs.cash + bs.receivables + bs.wip - bs.customerAdvances, "Total aset lancar dikurangi kewajiban uang muka"], d));
  lines.push("");

  // SECTION 2: POSISI SALDO 4 REKENING FIREWALL
  lines.push(formatCsvRow(["--- 2. POSISI SALDO 4 REKENING FIREWALL ---"], d));
  lines.push(formatCsvRow(["Rekening", "Nama Rekening", "Peruntukan", "Porsi SOP", "Saldo Saat Ini (IDR)"], d));
  lines.push(formatCsvRow(["REK1", "Rekening 1 - Transit & Omset", "Penampungan omset sebelum dipisah", "-", b.REK1], d));
  lines.push(formatCsvRow(["REK2", "Rekening 2 - Lock HPP Proyek", "Bahan baku (40%) & labour (13%)", `${settings.shares.bahan + settings.shares.labour}%`, b.REK2], d));
  lines.push(formatCsvRow(["REK3", "Rekening 3 - Lock OpEx", "Beban kantor, kontingensi, prive, beban tetap", `${settings.shares.ops + settings.shares.kontingensi + settings.shares.prive + settings.shares.expense}%`, b.REK3], d));
  lines.push(formatCsvRow(["REK4", "Rekening 4 - Lock Profit", "Laba bersih & pemulihan utang proyek", `${settings.shares.profit}%`, b.REK4], d));
  lines.push(formatCsvRow(["TOTAL", "Total Kas Likuid", "Total akumulasi saldo kas", "100%", b.REK1 + b.REK2 + b.REK3 + b.REK4], d));
  lines.push("");

  // SECTION 3: REKAPITULASI KINERJA PROYEK
  lines.push(formatCsvRow(["--- 3. REKAPITULASI KINERJA PROYEK ---"], d));
  lines.push(
    formatCsvRow(
      [
        "Nama Proyek",
        "Status",
        "Tipe Proyek",
        "Nilai Kontrak (IDR)",
        "Penerimaan (IDR)",
        "Sisa Piutang (IDR)",
        "Realisasi HPP (IDR)",
        "Biaya Lain (IDR)",
        "Total Biaya (IDR)",
        "Laba Proyek (IDR)",
        "Margin (%)",
      ],
      d,
    ),
  );

  for (const p of projects) {
    const s = summarizeProject(p, transactions);
    const profit = s.recognized ? s.profit : s.estimatedProfit;
    lines.push(
      formatCsvRow(
        [
          p.name,
          p.archived ? "Arsip" : p.status === "COMPLETED" ? "Selesai" : "Berjalan",
          p.isDebtProject ? "Utang Project" : "Reguler",
          p.totalValue,
          s.received,
          s.outstanding,
          s.hpp,
          s.otherCost,
          s.totalCost,
          profit,
          `${s.margin.toFixed(1)}%`,
        ],
        d,
      ),
    );
  }
  lines.push("");

  // SECTION 4: RINCIAN SEMUA TRANSAKSI
  lines.push(formatCsvRow(["--- 4. RINCIAN JURNAL TRANSAKSI ---"], d));
  lines.push(
    formatCsvRow(
      [
        "Tanggal",
        "Tipe",
        "Rekening Sumber",
        "Rekening Tujuan",
        "Proyek",
        "Kategori",
        "Keterangan",
        "Masuk (IDR)",
        "Keluar (IDR)",
      ],
      d,
    ),
  );

  const sortedTx = [...transactions].sort((x, y) => y.date - x.date);
  for (const t of sortedTx) {
    const pName = getProjectName(projects, t.projectId);
    const dateFormatted = formatDate(t.date, "dd/MM/yyyy");
    let masuk = 0;
    let keluar = 0;
    let rekSumber = "-";
    let rekTujuan = "-";

    if (t.type === "INCOME") {
      masuk = t.amount;
      rekTujuan = t.account || "REK1";
    } else if (t.type === "EXPENSE") {
      keluar = t.amount;
      rekSumber = t.expenseAccount || "REK1";
    } else if (t.type === "TRANSFER") {
      rekSumber = t.fromAccount || "-";
      rekTujuan = t.toAccount || "-";
    }

    lines.push(
      formatCsvRow(
        [
          dateFormatted,
          t.type,
          rekSumber,
          rekTujuan,
          pName,
          t.expenseCategory || (t.incomeType ? `Pemasukan (${t.incomeType})` : "-"),
          t.description,
          masuk,
          keluar,
        ],
        d,
      ),
    );
  }

  return lines.join("\r\n");
}
