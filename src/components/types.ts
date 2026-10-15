export type ProjectType = "PROJECT";
// ONGOING   = proyek sedang dikerjakan (pendapatan BELUM diakui, uang klien = uang muka)
// COMPLETED = sudah serah terima (pendapatan & HPP diakui, sisa tagihan = piutang)
export type ProjectStatus = "ONGOING" | "COMPLETED";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  totalValue: number;
  createdAt: number;
  completedAt?: number; // tanggal serah terima
  clientNotes?: string;
  archived?: boolean; // proyek diarsipkan (tidak dihapus agar jejak keuangan tetap ada)
}

export type RekeningType = "REK1" | "REK2" | "REK3" | "REK4";

export const REKENING_LABEL: Record<RekeningType, string> = {
  REK1: "Rek 1 - Transit / Omset",
  REK2: "Rek 2 - Lock Proyek (HPP)",
  REK3: "Rek 3 - Lock OpEx",
  REK4: "Rek 4 - Lock Profit",
};

// Data lama (sebelum versi 2). Hanya dipakai untuk migrasi.
export interface IncomeSplits {
  rek2: number;
  rek3: number;
  rek4: number;
}

// DP / TERMIN / PELUNASAN = pembayaran klien. DP_60 & PELUNASAN_40 = format lama.
export type IncomeType =
  | "DP"
  | "TERMIN"
  | "PELUNASAN"
  | "LAINNYA"
  | "DP_60"
  | "PELUNASAN_40";

export const INCOME_TYPE_LABEL: Record<IncomeType, string> = {
  DP: "DP",
  TERMIN: "Termin",
  PELUNASAN: "Pelunasan",
  LAINNYA: "Lainnya",
  DP_60: "DP",
  PELUNASAN_40: "Pelunasan",
};

export interface Transaction {
  id: string;
  date: number; // tanggal transaksi sebenarnya (bisa diisi mundur)
  createdAt?: number; // kapan dicatat di aplikasi
  description: string;
  // INCOME   = uang masuk ke salah satu rekening
  // EXPENSE  = uang keluar dari salah satu rekening
  // TRANSFER = pemindahan antar rekening (tidak mengubah total kas)
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  projectId?: string;

  // INCOME
  incomeType?: IncomeType;
  account?: RekeningType; // rekening tujuan uang masuk (default REK1)
  splits?: IncomeSplits; // format lama, dikonversi saat migrasi

  // EXPENSE
  expenseAccount?: RekeningType;
  expenseCategory?: string;

  // TRANSFER
  fromAccount?: RekeningType;
  toAccount?: RekeningType;
  parentId?: string; // transfer alokasi otomatis yang berasal dari satu uang masuk

  supportId?: string; // terkait talangan / subsidi silang
  isAdjustment?: boolean; // penyesuaian saldo (rekonsiliasi), bukan omset/biaya
}

// Inter-Project Support (Subsidi Silang / Talangan Antar Proyek)
export interface ProjectSupport {
  id: string;
  fromProjectId?: string;
  fromProjectName: string;
  toProjectId?: string;
  toProjectName: string;
  amount: number;
  description: string;
  date: number;
  status: "OUTSTANDING" | "RETURNED";
  returnedAt?: number;
  account?: RekeningType; // default REK2
}

// Konfigurasi Target Sesuai SOP Seven Interior
export type FilterPeriod = "7_DAYS" | "THIS_MONTH" | "6_MONTHS" | "THIS_YEAR";
export type TargetScenario = "SKENARIO_A" | "SKENARIO_B";

export const OPEX_TARGET_BULANAN = 73650000;
export const TARGET_SKENARIO_A = 300000000; // Skenario A: All Interior (Rp 300 Juta)
export const TARGET_SKENARIO_B = 270000000; // Skenario B: Reguler 9 Proyek @ Rp 30 Juta (Rp 270 Juta)

// SOP alokasi dari NILAI KONTRAK:
// - 0% s/d 60% pertama yang diterima  -> Rek 2 (53%) & Rek 3 (7%)
// - 60% s/d 100% yang diterima        -> Rek 3 (20%) & Rek 4 (20%)
export const SOP_ALLOCATION = {
  firstStagePct: 0.6,
  firstStage: { REK2: 0.53, REK3: 0.07 },
  secondStage: { REK3: 0.2, REK4: 0.2 },
};
